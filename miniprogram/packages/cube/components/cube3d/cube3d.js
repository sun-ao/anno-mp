import { createScopedThreejs } from 'threejs-miniprogram'
import { FACE_DEFS, stickerIndex } from '../../model/cube-state'

const FACE_ID = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }

/** BoxGeometry 6 个材质槽位：+x -x +y -y +z -z */
const SLOT_FACE = [
  { face: 'R', axis: 'x', sign: 1 },
  { face: 'L', axis: 'x', sign: -1 },
  { face: 'U', axis: 'y', sign: 1 },
  { face: 'D', axis: 'y', sign: -1 },
  { face: 'F', axis: 'z', sign: 1 },
  { face: 'B', axis: 'z', sign: -1 }
]

const INNER_COLOR = '#2c2c2a'
const EMPTY_COLOR = '#d3d1c7'
const CUBIE_SIZE = 0.92
const TAP_THRESHOLD = 10
const ANIM_DURATION = 280

/** 各面顺时针转动的轴、层判定、目标角度 */
const ANIM_DEF = {
  F: { axis: 'z', layerSign: 1,  cwAngle: -Math.PI / 2 },
  B: { axis: 'z', layerSign: -1, cwAngle:  Math.PI / 2 },
  U: { axis: 'y', layerSign: 1,  cwAngle: -Math.PI / 2 },
  D: { axis: 'y', layerSign: -1, cwAngle:  Math.PI / 2 },
  R: { axis: 'x', layerSign: 1,  cwAngle: -Math.PI / 2 },
  L: { axis: 'x', layerSign: -1, cwAngle:  Math.PI / 2 }
}

/** 绕指定轴旋转坐标 */
function rotatePos(x, y, z, axis, angle) {
  const c = Math.cos(angle), s = Math.sin(angle)
  if (axis === 'x') return [x, y * c - z * s, y * s + z * c]
  if (axis === 'y') return [x * c + z * s, y, -x * s + z * c]
  return [x * c - y * s, x * s + y * c, z]
}

Component({
  properties: {
    /** 6×9 魔方状态（见 model/cube-state） */
    state: {
      type: Array,
      value: [],
      observer(newVal) {
        if (this._inited) this.repaint(newVal)
      }
    },
    /** 画布尺寸（rpx），默认 620 */
    canvasSize: {
      type: Number,
      value: 620
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
        this._rect = res[1] || { width: 310, height: 310, left: 0, top: 0 }
        this.initThree(res[0].node)
      })
    },
    detached() {
      this._running = false
      if (this._renderer) {
        this._renderer.dispose && this._renderer.dispose()
      }
    }
  },

  methods: {
    initThree(canvas) {
      const THREE = createScopedThreejs(canvas)
      this._THREE = THREE
      this._canvas = canvas

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
      renderer.setSize(canvas.width, canvas.height)
      this._renderer = renderer

      const scene = new THREE.Scene()
      this._scene = scene

      const camera = new THREE.PerspectiveCamera(40, canvas.width / canvas.height, 0.1, 100)
      this._camera = camera

      this._orbit = { radius: 8.6, theta: -Math.PI / 4, phi: 1.15 }
      this.applyCamera()

      this._cubies = []
      const geometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            const materials = SLOT_FACE.map(() => new THREE.MeshBasicMaterial({ color: INNER_COLOR }))
            const mesh = new THREE.Mesh(geometry, materials)
            mesh.position.set(x, y, z)
            scene.add(mesh)
            this._cubies.push({ mesh, materials, x, y, z })
          }
        }
      }

      this._inited = true
      this.repaint(this.data.state)

      this._running = true
      const loop = () => {
        if (!this._running) return
        renderer.render(scene, camera)
        canvas.requestAnimationFrame(loop)
      }
      canvas.requestAnimationFrame(loop)
    },

    repaint(state) {
      if (!state || state.length !== 6) return
      const cubies = this._cubies
      for (const cubie of cubies) {
        SLOT_FACE.forEach((slot, i) => {
          const coord = slot.axis === 'x' ? cubie.x : slot.axis === 'y' ? cubie.y : cubie.z
          const mat = cubie.materials[i]
          if (coord !== slot.sign) {
            mat.color.set(INNER_COLOR)
            return
          }
          const faceId = FACE_ID[slot.face]
          const idx = stickerIndex(slot.face, cubie.x, cubie.y, cubie.z)
          const v = state[faceId][idx]
          mat.color.set(v >= 0 && v <= 5 ? FACE_DEFS[v].hex : EMPTY_COLOR)
        })
      }
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
      this._touch = {
        x: t.x, y: t.y,
        startX: t.x, startY: t.y,
        moved: false
      }
    },

    onTouchMove(e) {
      if (!this._touch) return
      const t = e.touches[0]
      const dx = t.x - this._touch.x
      const dy = t.y - this._touch.y
      this._touch.x = t.x
      this._touch.y = t.y
      if (Math.abs(t.x - this._touch.startX) > TAP_THRESHOLD ||
          Math.abs(t.y - this._touch.startY) > TAP_THRESHOLD) {
        this._touch.moved = true
      }
      this._orbit.theta -= dx * 0.012
      this._orbit.phi -= dy * 0.012
      this._orbit.phi = Math.max(0.2, Math.min(2.6, this._orbit.phi))
      this.applyCamera()
    },

    onTouchEnd() {
      if (this._touch && !this._touch.moved) {
        this.handleTap(this._touch.startX, this._touch.startY)
      }
      this._touch = null
    },

    /** 射线拾取：点按位置 → 哪个面的哪个格子 */
    handleTap(touchX, touchY) {
      if (!this._THREE || !this._camera || !this._cubies) return
      const THREE = this._THREE
      const rect = this._rect
      const ndcX = (touchX / rect.width) * 2 - 1
      const ndcY = -(touchY / rect.height) * 2 + 1
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera({ x: ndcX, y: ndcY }, this._camera)
      const meshes = this._cubies.map(c => c.mesh)
      const intersects = raycaster.intersectObjects(meshes)
      if (intersects.length === 0) return

      const hit = intersects[0]
      const cubieEntry = this._cubies.find(c => c.mesh === hit.object)
      if (!cubieEntry) return

      const matIdx = hit.face ? hit.face.materialIndex : -1
      if (matIdx < 0 || matIdx >= SLOT_FACE.length) return

      const slot = SLOT_FACE[matIdx]
      const coord = slot.axis === 'x' ? cubieEntry.x : slot.axis === 'y' ? cubieEntry.y : cubieEntry.z
      if (coord !== slot.sign) return

      const idx = stickerIndex(slot.face, cubieEntry.x, cubieEntry.y, cubieEntry.z)
      this.triggerEvent('stickerTap', {
        face: FACE_ID[slot.face],
        cell: idx
      })
    },

    /**
     * 层转动画：将指定层的 9 个 cubie 绕轴旋转，完成后更新颜色
     * 180° 转动拆成两次 90° + 中间停顿，让用户感知"转了两次"
     * @param {Object} move  { face: 'R'|'L'|'U'|'D'|'F'|'B', turn: 1|-1|2 }
     * @param {Array} newState  动画完成后的新状态（用于 repaint）
     * @param {Function} callback  动画完成回调
     * @param {Number} [duration]  单段动画时长(ms)，默认 ANIM_DURATION；教学慢放时可传更大值
     */
    animateMove(move, newState, callback, duration) {
      if (!this._inited || this._animating) {
        if (callback) callback()
        return
      }
      const def = ANIM_DEF[move.face]
      if (!def) {
        if (callback) callback()
        return
      }

      const cw = def.cwAngle
      const isDouble = move.turn === 2
      const targetAngle = isDouble ? cw * 2 : move.turn === -1 ? -cw : cw
      const D = duration && duration > 0 ? duration : ANIM_DURATION

      const layerCubies = this._cubies.filter(c => {
        const coord = def.axis === 'x' ? c.x : def.axis === 'y' ? c.y : c.z
        return coord === def.layerSign
      })

      const origPos = layerCubies.map(c => [c.x, c.y, c.z])
      this._animating = true

      const applyAngle = (angle) => {
        layerCubies.forEach((cubie, i) => {
          const [ox, oy, oz] = origPos[i]
          const [nx, ny, nz] = rotatePos(ox, oy, oz, def.axis, angle)
          cubie.mesh.position.set(nx, ny, nz)
          if (def.axis === 'x') cubie.mesh.rotation.x = angle
          else if (def.axis === 'y') cubie.mesh.rotation.y = angle
          else cubie.mesh.rotation.z = angle
        })
      }

      const finish = () => {
        layerCubies.forEach((cubie, i) => {
          const [nx, ny, nz] = rotatePos(origPos[i][0], origPos[i][1], origPos[i][2], def.axis, targetAngle)
          cubie.x = Math.round(nx)
          cubie.y = Math.round(ny)
          cubie.z = Math.round(nz)
          cubie.mesh.position.set(cubie.x, cubie.y, cubie.z)
          cubie.mesh.rotation.set(0, 0, 0)
        })
        this.repaint(newState)
        this._animating = false
        if (callback) callback()
      }

      const animateSegment = (startAngle, endAngle, segDur, onDone) => {
        const startTime = Date.now()
        const step = () => {
          const elapsed = Date.now() - startTime
          const t = Math.min(elapsed / segDur, 1)
          const eased = 1 - Math.pow(1 - t, 3)
          applyAngle(startAngle + (endAngle - startAngle) * eased)
          if (t < 1) {
            this._canvas.requestAnimationFrame(step)
          } else {
            onDone()
          }
        }
        this._canvas.requestAnimationFrame(step)
      }

      if (isDouble) {
        const pause = Math.max(60, Math.min(200, D * 0.35))
        animateSegment(0, cw, D, () => {
          setTimeout(() => {
            animateSegment(cw, cw * 2, D, finish)
          }, pause)
        })
      } else {
        animateSegment(0, targetAngle, D, finish)
      }
    }
  }
})
