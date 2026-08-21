import { createScopedThreejs } from 'threejs-miniprogram'
import snake from '../../model/snake'

// 几何为纯算法结果，组件内直接复用 model 的 calculateTransforms（CJS 默认导入）
const { calculateTransforms } = snake

const PIECE_SIZE = 1
const rootTwo = Math.sqrt(2)

// 经典双色：蓝 / 米白交替，强化「一段一段」的视觉分段
const COLOR_A = '#2f6fb0'
const COLOR_B = '#f3efe6'
// 穿模高亮红
const COLOR_OVERLAP = '#e23b3b'
// 引导高亮金（跟着折时提示该折哪一块）
const COLOR_HIGHLIGHT = '#f4b400'

Component({
  properties: {
    /** 各关节 quarter-turn 数（长度 = pieceCount - 1），组件会平滑形变到该目标 */
    turns: {
      type: Array,
      value: [],
      observer(newVal) {
        if (!this._inited) return
        const pc = this.data.pieceCount || 24
        this._ensurePieces(pc)
        this.setTargetTurns(newVal || [])
      }
    },
    /** 节数：24 / 36 / 48 / 72 */
    pieceCount: {
      type: Number,
      value: 24,
      observer(newVal) {
        if (!this._inited) return
        const pc = newVal || 24
        this._ensurePieces(pc)
        // 节数变化：先把当前姿态归零为直线，再交由 turns 观察器变过去（等于「从零开始折叠」）
        this._targetTurns = this.zeros(pc)
        this._currentTurns = this.zeros(pc)
        this.applyTurns(this._currentTurns)
        this.applyOverlap(this.data.overlap)
        this.applyHighlight(this.data.highlight)
        this.fitCamera(this.computeTransforms(this._currentTurns))
      }
    },
    /** 是否进入手动/引导：轻点 3D 中的段会触发 pick 事件 */
    interactive: {
      type: Boolean,
      value: false
    },
    /** 需要高亮为红色的段索引数组（穿模提示） */
    overlap: {
      type: Array,
      value: [],
      observer(v) {
        if (!this._inited) return
        this.applyOverlap(v)
      }
    },
    /** 需要高亮为金色的段索引数组（跟着折：提示该折哪一块） */
    highlight: {
      type: Array,
      value: [],
      observer(v) {
        if (!this._inited) return
        this.applyHighlight(v)
      }
    },
    /** 展示用：模型原地自转（绕自身竖直轴，不绕圈） */
    spin: {
      type: Boolean,
      value: false
    },
    /** 整体显示缩放：0.5（小）~ 1.6（大）。越小画面留白越多（魔尺看起来更小） */
    scale: {
      type: Number,
      value: 1,
      observer(v) {
        const s = (v && v > 0) ? v : 1
        this._scale = s
        if (this._root) this._root.scale.set(s, s, s)
      }
    },
    /** 折叠聚焦：把某一节平移到画面正中心（值 = 段索引，0 基；-1 = 整条质心居中） */
    focus: {
      type: Number,
      value: -1,
      observer(v) {
        if (!this._inited) return
        this._focus = (v != null && v >= 0) ? v : -1
        this.applyTurns(this._currentTurns) // 立即重居中
      }
    }
  },

  data: {},

  lifetimes: {
    ready() {
      const query = this.createSelectorQuery().in(this)
      query.select('#gl').node()
      query.select('#gl').boundingClientRect()
      query.exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        this._rect = res[1] || { left: 0, top: 0, width: 300, height: 300 }
        this.initThree(res[0].node)
      })
    },
    detached() {
      this._running = false
      if (this._renderer && this._renderer.dispose) this._renderer.dispose()
      if (this._geometries) this._geometries.forEach((g) => g && g.dispose && g.dispose())
    }
  },

  methods: {
    initThree(canvas) {
      const THREE = createScopedThreejs(canvas)
      this._THREE = THREE
      this._canvas = canvas
      this._raycaster = new THREE.Raycaster()

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(canvas.width, canvas.height)
      this._renderer = renderer

      const scene = new THREE.Scene()
      this._scene = scene

      const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 4000)
      this._camera = camera

      // MeshStandardMaterial 需要光照才能显色
      scene.add(new THREE.AmbientLight(0xffffff, 0.78))
      const key = new THREE.DirectionalLight(0xffffff, 0.85)
      key.position.set(6, 9, 7)
      scene.add(key)
      const fill = new THREE.DirectionalLight(0xffffff, 0.32)
      fill.position.set(-7, -3, -5)
      scene.add(fill)

      // 外层 root 负责整体平移 + 缩放（缩放越小留白越多）；本身不旋转
      const root = new THREE.Group()
      this._scale = (this.data.scale && this.data.scale > 0) ? this.data.scale : 1
      root.scale.set(this._scale, this._scale, this._scale)
      scene.add(root)
      this._root = root
      // 内层 pivot 负责朝向倾斜 + 自转，绕自身中心旋转
      const pivot = new THREE.Group()
      pivot.rotation.set(-0.18, 0.18, 0)
      root.add(pivot)
      this._pivot = pivot

      this._orbit = { radius: 24, theta: -Math.PI / 4, phi: 1.12 }
      this._targetRadius = 24
      this._focus = (this.data.focus != null && this.data.focus >= 0) ? this.data.focus : -1
      this.applyCamera()

      // 几何体只需两份（上下两种三角柱），所有节共用
      this._geometries = [this.createPrismGeometry(false), this.createPrismGeometry(true)]

      this._groups = []
      this._materials = []
      this._baseColors = []
      this._pickMeshes = []
      this._pieceCount = 0
      this._overlapSet = {}
      this._highlightSet = {}
      this._ensurePieces(this.data.pieceCount || 24)

      this._inited = true

      // 初始目标：优先用页面已下发的 turns，否则直线
      const initialTurns = (this.data.turns && this.data.turns.length)
        ? this.data.turns.slice()
        : this.zeros(this._pieceCount)
      this._targetTurns = initialTurns.slice()
      this._currentTurns = initialTurns.slice()
      this.applyTurns(this._currentTurns) // 首帧直接到位，不做开场动画
      this.applyOverlap(this.data.overlap)
      this.applyHighlight(this.data.highlight)
      this.fitCamera(this.computeTransforms(this._currentTurns))

      this._lastFrame = 0
      this._lastTouch = null
      this._running = true
      const loop = (ts) => {
        if (!this._running) return
        this.frame(ts)
        canvas.requestAnimationFrame(loop)
      }
      canvas.requestAnimationFrame(loop)
    },

    zeros(n) {
      const a = []
      for (let i = 0; i < n - 1; i++) a.push(0)
      return a
    },

    /** 忠实移植上游 createPrismGeometry：直角三角形截面挤出成三角柱，带微小倒角 */
    createPrismGeometry(upper) {
      const THREE = this._THREE
      const s = PIECE_SIZE
      const width = Math.sqrt(2) * s
      const bevel = 0.024 // 约等于实体魔尺的塑胶圆角
      const shape = new THREE.Shape()
      if (upper) {
        shape.moveTo(0, width / 2)
        shape.lineTo(width / 2, 0)
        shape.lineTo(width, width / 2)
      } else {
        shape.moveTo(0, 0)
        shape.lineTo(width, 0)
        shape.lineTo(width / 2, width / 2)
      }
      shape.closePath()
      const depth = s - bevel * 2
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: bevel,
        bevelThickness: bevel,
        bevelOffset: -bevel, // 倒角内收，避免相邻外壳重叠
        curveSegments: 1
      })
      const shellScale = 0.992
      const centerX = width / 2
      const centerY = upper ? width / 3 : width / 6
      geometry.translate(-centerX, -centerY, -depth / 2)
      geometry.scale(shellScale, shellScale, shellScale)
      geometry.translate(centerX, centerY, 0)
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      return geometry
    },

    /** 按当前 pieceCount 构建/复用各节 group（仅三角柱 Mesh；不再加黑色关节垫片） */
    _ensurePieces(n) {
      if (this._pieceCount === n && this._groups.length === n) return
      if (this._groups && this._groups.length) {
        this._groups.forEach((g) => { if (g) this._pivot.remove(g) })
      }
      this._groups = []
      this._materials = []
      this._baseColors = []
      this._pickMeshes = []
      this._pieceCount = n
      const THREE = this._THREE
      for (let i = 0; i < n; i++) {
        const geo = this._geometries[i % 2]
        const base = (i % 2 === 0) ? COLOR_A : COLOR_B
        const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.85, metalness: 0.05 })
        const mesh = new THREE.Mesh(geo, mat)
        mesh.userData.pieceIndex = i // 供射线拾取定位段
        const group = new THREE.Group()
        group.add(mesh)
        this._pivot.add(group)
        this._groups.push(group)
        this._materials.push(mat)
        this._baseColors.push(base)
        this._pickMeshes.push(mesh)
      }
      this.applyOverlap(this.data.overlap)
      this.applyHighlight(this.data.highlight)
    },

    computeTransforms(turns) {
      return calculateTransforms(this._pieceCount, turns)
    },

    setTargetTurns(turns) {
      if (!turns || !turns.length) turns = this.zeros(this._pieceCount)
      this._targetTurns = turns.slice()
    },

    /** 把一组（分数）turns 落到各节 group 上；
     *  - focus >= 0 → 把该段平移到原点（画面正中心），折叠时那一块始终居中
     *  - 否则以整条质心居正
     *  - 同时按「聚焦中心」的包围半径自适应相机距离（保证整段可见），并叠加 scale 缩放
     */
    applyTurns(turns) {
      const t = this.computeTransforms(turns)
      const f = this._focus
      let cx = 0
      let cy = 0
      let cz = 0
      if (f != null && f >= 0 && f < t.length) {
        cx = t[f].position.x
        cy = t[f].position.y
        cz = t[f].position.z
      } else {
        for (let i = 0; i < t.length; i++) {
          cx += t[i].position.x
          cy += t[i].position.y
          cz += t[i].position.z
        }
        const n = t.length || 1
        cx /= n
        cy /= n
        cz /= n
      }
      // 以聚焦中心为原点，求整段最大半径 → 自适应相机
      let maxR = 0
      for (let i = 0; i < t.length; i++) {
        const dx = t[i].position.x - cx
        const dy = t[i].position.y - cy
        const dz = t[i].position.z - cz
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d > maxR) maxR = d
      }
      const bounding = maxR + 1.0
      const fovRad = (this._camera.fov * Math.PI) / 180
      const fitDist = bounding / Math.tan(fovRad / 2)
      // scale 越小，相机拉得越远 → 魔尺看起来越小（留白越多）
      this._targetRadius = Math.max(6, (fitDist * 1.15) / (this._scale || 1))

      for (let i = 0; i < this._groups.length; i++) {
        const g = this._groups[i]
        const tr = t[i]
        if (!g || !tr) continue
        g.position.set(tr.position.x - cx, tr.position.y - cy, tr.position.z - cz)
        g.quaternion.set(tr.quaternion.x, tr.quaternion.y, tr.quaternion.z, tr.quaternion.w)
      }
    },

    /** 合并穿模(红)与引导(金)两套高亮，统一上色 */
    refreshColors() {
      if (!this._materials) return
      const ov = this._overlapSet || {}
      const hl = this._highlightSet || {}
      for (let i = 0; i < this._materials.length; i++) {
        const base = this._baseColors[i] || '#ffffff'
        let c = base
        if (ov[i]) c = COLOR_OVERLAP
        else if (hl[i]) c = COLOR_HIGHLIGHT
        this._materials[i].color.set(c)
      }
    },

    applyOverlap(list) {
      this._overlapSet = {}
      ;(list || []).forEach((i) => { this._overlapSet[i] = true })
      this.refreshColors()
    },

    applyHighlight(list) {
      this._highlightSet = {}
      ;(list || []).forEach((i) => { this._highlightSet[i] = true })
      this.refreshColors()
    },

    /** 轻点 3D 中的段 → 返回段索引（0 基），未命中返回 -1 */
    pickPiece(x, y) {
      if (!this._raycaster || !this._pickMeshes || !this._pickMeshes.length) return -1
      const rect = this._rect || { width: 1, height: 1 }
      const w = rect.width || 1
      const h = rect.height || 1
      const ndcX = (x / w) * 2 - 1
      const ndcY = -((y / h) * 2 - 1)
      this._raycaster.setFromCamera({ x: ndcX, y: ndcY }, this._camera)
      this._scene.updateMatrixWorld(true)
      const hits = this._raycaster.intersectObjects(this._pickMeshes, false)
      if (hits.length && hits[0].object.userData && hits[0].object.userData.pieceIndex != null) {
        return hits[0].object.userData.pieceIndex
      }
      return -1
    },

    frame(ts) {
      const now = ts || Date.now()
      let dt = this._lastFrame ? (now - this._lastFrame) / 1000 : 1 / 60
      this._lastFrame = now
      if (dt > 1 / 20) dt = 1 / 20 // 切后台回来时单帧间隔可能极大，限幅避免瞬移

      // 自转：绕自身竖直轴原地旋转（turntable），不绕圈
      if (this.data.spin) {
        this._pivot.rotation.y += 0.6 * dt
      }

      // 相机距离平滑收敛到目标（聚焦/缩放变化时不再跳变）
      if (this._targetRadius != null) {
        this._orbit.radius += (this._targetRadius - this._orbit.radius) * (1 - Math.exp(-6 * dt))
        this.applyCamera()
      }

      const cur = this._currentTurns
      const tgt = this._targetTurns
      if (cur && tgt && cur.length === tgt.length && cur.length) {
        const alpha = 1 - Math.exp(-8 * dt) // 约 0.5s 内收敛
        for (let i = 0; i < cur.length; i++) {
          cur[i] += (tgt[i] - cur[i]) * alpha
          if (Math.abs(tgt[i] - cur[i]) < 0.0008) cur[i] = tgt[i]
        }
        this.applyTurns(cur)
      }
      this._renderer.render(this._scene, this._camera)
    },

    /** 依据给定姿态的包围半径立刻拉远/拉近相机（用于段数切换等大幅变化，直接 snap） */
    fitCamera(transforms) {
      let cx = 0
      let cy = 0
      let cz = 0
      transforms.forEach((t) => {
        cx += t.position.x
        cy += t.position.y
        cz += t.position.z
      })
      const n = transforms.length || 1
      cx /= n
      cy /= n
      cz /= n
      let maxR = 0
      transforms.forEach((t) => {
        const dx = t.position.x - cx
        const dy = t.position.y - cy
        const dz = t.position.z - cz
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d > maxR) maxR = d
      })
      // 段数切换按质心居中
      const bounding = maxR + 1.0
      const fovRad = (this._camera.fov * Math.PI) / 180
      const fitDist = bounding / Math.tan(fovRad / 2)
      this._targetRadius = Math.max(6, (fitDist * 1.15) / (this._scale || 1))
      this._orbit.radius = this._targetRadius
      this.applyCamera()
    },

    applyCamera() {
      const { radius, theta, phi } = this._orbit
      const camera = this._camera
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      )
      camera.lookAt(0, 0, 0)
    },

    onTouchStart(e) {
      const t = e.touches[0]
      this._lastTouch = { x: t.x, y: t.y }
      this._touch = { x: t.x, y: t.y, startX: t.x, startY: t.y, moved: false }
    },

    onTouchMove(e) {
      if (!this._touch) return
      const t = e.touches[0]
      const dx = t.x - this._touch.x
      const dy = t.y - this._touch.y
      this._touch.x = t.x
      this._touch.y = t.y
      this._lastTouch = { x: t.x, y: t.y }
      if (Math.abs(t.x - this._touch.startX) > 8 || Math.abs(t.y - this._touch.startY) > 8) {
        this._touch.moved = true
      }
      this._orbit.theta -= dx * 0.012
      this._orbit.phi -= dy * 0.012
      this._orbit.phi = Math.max(0.2, Math.min(2.8, this._orbit.phi))
      this.applyCamera()
    },

    onTouchEnd() {
      // 轻点（未拖动）且在可交互模式下 → 射线拾取段，触发 pick
      if (this._touch && !this._touch.moved && this.data.interactive && this._lastTouch) {
        const piece = this.pickPiece(this._lastTouch.x, this._lastTouch.y)
        if (piece >= 0) this.triggerEvent('pick', { piece })
      }
      this._touch = null
    }
  }
})
