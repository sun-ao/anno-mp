const snake = require('../../model/snake')
const { SHAPE_PRESETS, parseFormula, turnsAtStep } = snake

const SPEEDS = [
  { label: '0.5×', ms: 1100 },
  { label: '1×', ms: 650 },
  { label: '2×', ms: 320 }
]

Page({
  data: {
    mode: 'library', // 'library' | 'guide' | 'manual'
    segCount: 24,
    segOptions: [24, 36],
    presets: [],
    myShapes: [],
    selectedId: '',
    shapeName: '',
    pieceCount: 24,
    turns: [],
    totalSteps: 0,
    stepIndex: 0,
    isPlaying: false,
    // 手动 / 引导交互
    interactive: false,
    selectedJoint: -1,
    joints: [],
    overlap: [],
    overlapCount: 0,
    highlight: [],
    poseDigits: '',
    canUndo: false,
    // 引导（跟着折）
    guideStep: 0,
    guideTotal: 0,
    guideDone: false,
    guideHint: '',
    // 展示 / 播放
    spin: false,
    speeds: SPEEDS,
    speedIndex: 1,
    metaText: '拖动旋转视角',
    // 整体显示缩放（越小魔尺看起来越小、留白越多）
    scale: 0.9,
    scalePct: 90,
    // 折叠聚焦：把正在折的那一节放到画面正中（-1 = 整条质心居中）
    focus: -1
  },

  onLoad() {
    this._playTimer = null
    this._steps = []
    this._history = []
    this._turns = []
    this._guideSteps = []
    this._guideFull = []
    this._favorites = wx.getStorageSync('snake:favorites') || []
    this._myShapes = wx.getStorageSync('snake:myshapes') || []
    this._allPresets = this.buildPresetList()
    const list = this.applyPresetFilter()
    this.setData({ presets: list, myShapes: this.visibleMyShapes() }, () => {
      if (list.length) this.selectShape(list[0])
    })
  },

  onUnload() {
    this.stopPlay()
  },

  onHide() {
    this.stopPlay()
  },

  // ---------- 造型列表（含收藏排序）----------
  buildPresetList() {
    const all = SHAPE_PRESETS.map((p) => ({
      id: p.id, name: p.name, pieceCount: p.pieceCount, formula: p.formula
    }))
    const favIds = this._favorites.filter((id) => all.some((p) => p.id === id))
    const rest = all.filter((p) => favIds.indexOf(p.id) < 0)
    return favIds
      .map((id) => all.find((p) => p.id === id))
      .concat(rest)
      .map((p) => ({ ...p, fav: favIds.indexOf(p.id) >= 0 }))
  },

  // 造型库只显示当前段数对应的造型（方便小朋友专注一种长度）
  applyPresetFilter() {
    const list = (this._allPresets || []).filter((p) => p.pieceCount === this.data.segCount)
    this.setData({ presets: list })
    return list
  },

  visibleMyShapes() {
    return (this._myShapes || []).filter((m) => m.pieceCount === this.data.segCount)
  },

  // ---------- 选中一个造型（预设或我的造型通用）----------
  selectShape(item) {
    this.stopPlay()
    const src = item.formula != null ? item.formula : item.digits
    const parsed = parseFormula(src, item.pieceCount)
    if (parsed.errors.length) {
      wx.showToast({ title: '造型数据异常', icon: 'none' })
      return
    }
    this._steps = parsed.steps
    const totalSteps = parsed.steps.length
    const finalTurns = turnsAtStep(parsed.steps, totalSteps, item.pieceCount)
    this._turns = finalTurns.slice()
    this._history = []
    this.setData({
      selectedId: item.id,
      shapeName: item.name,
      pieceCount: item.pieceCount,
      totalSteps,
      stepIndex: totalSteps,
      turns: finalTurns.slice(),
      overlap: [],
      overlapCount: 0,
      highlight: [],
      interactive: false,
      poseDigits: this.turnsToDigits(finalTurns),
      joints: this.buildJoints(finalTurns, -1),
      canUndo: false,
      focus: -1,
      metaText: `第 ${totalSteps}/${totalSteps} 步 · 拖动旋转视角`
    })
  },

  onTapPreset(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.presets.find((p) => p.id === id)
    if (!item) return
    if (this.data.mode === 'guide') {
      this.enterGuideFor(item)
      return
    }
    if (id === this.data.selectedId) return
    this.selectShape(item)
  },

  onTapMyShape(e) {
    const id = e.currentTarget.dataset.id
    const item = this._myShapes.find((p) => p.id === id)
    if (!item) return
    if (this.data.mode === 'guide') {
      this.enterGuideFor(item)
      return
    }
    this.selectShape(item)
  },

  onToggleFav(e) {
    const id = e.currentTarget.dataset.id
    const i = this._favorites.indexOf(id)
    if (i >= 0) this._favorites.splice(i, 1)
    else this._favorites.push(id)
    wx.setStorageSync('snake:favorites', this._favorites)
    this._allPresets = this.buildPresetList()
    this.applyPresetFilter()
  },

  onDeleteMyShape(e) {
    const id = e.currentTarget.dataset.id
    const item = this._myShapes.find((p) => p.id === id)
    if (!item) return
    wx.showModal({
      title: '删除造型',
      content: `确定删除「${item.name}」？`,
      success: (res) => {
        if (!res.confirm) return
        this._myShapes = this._myShapes.filter((p) => p.id !== id)
        wx.setStorageSync('snake:myshapes', this._myShapes)
        this.setData({ myShapes: this.visibleMyShapes() })
      }
    })
  },

  // ---------- 段数切换（24 / 36）----------
  onPickSeg(e) {
    const c = Number(e.currentTarget.dataset.c)
    if (c === this.data.segCount) return
    this.setData({ segCount: c }, () => this.applySegCount(c))
  },

  applySegCount(c) {
    if (this.data.mode === 'manual') {
      const t = this.zeros(c)
      this._turns = t
      this._history = []
      this.setData({
        pieceCount: c,
        turns: t,
        joints: this.buildJoints(t, -1),
        selectedJoint: -1,
        overlap: [],
        overlapCount: 0,
        poseDigits: this.turnsToDigits(t),
        canUndo: false,
        focus: -1,
        metaText: `${c} 段 · 点段扭转 · 拖动转视角`
      })
      return
    }
    // 造型库 / 跟着折：按段数过滤造型并重新选中
    const list = this.applyPresetFilter()
    if (this.data.mode === 'guide') {
      this.setData({ mode: 'library' })
    }
    this.setData({ pieceCount: c, focus: -1, myShapes: this.visibleMyShapes() })
    if (list.length) this.selectShape(list[0])
    else this.setData({ selectedId: '', shapeName: c + ' 段', turns: [] })
  },

  // ---------- 模式切换 ----------
  onSwitchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.stopPlay()
    if (mode === 'library') {
      this.setData({ mode, interactive: false, highlight: [], overlap: [], overlapCount: 0, focus: -1 })
    } else if (mode === 'manual') {
      this.setData({
        mode,
        interactive: true,
        shapeName: '自由折',
        selectedJoint: -1,
        highlight: [],
        overlap: [],
        overlapCount: 0,
        joints: this.buildJoints(this._turns, -1),
        focus: -1,
        metaText: `${this.data.pieceCount} 段 · 点段扭转 · 拖动转视角`
      })
    } else if (mode === 'guide') {
      const item = this.currentShape() || this.data.presets[0]
      if (item) this.enterGuideFor(item)
      else this.setData({ mode })
    }
  },

  // ---------- 预设单步播放 ----------
  onTogglePlay() {
    if (this.data.isPlaying) {
      this.stopPlay()
      return
    }
    let start = this.data.stepIndex
    if (start >= this.data.totalSteps) start = 0 // 已到末尾则从头重播
    this.setData({ isPlaying: true, stepIndex: start })
    this.playStep(start)
  },

  playStep(step) {
    const item = this.currentShape()
    if (!item) return
    const turns = turnsAtStep(this._steps, step, item.pieceCount)
    this.setData({ turns, stepIndex: step })
    if (step >= this.data.totalSteps) {
      this.stopPlay()
      return
    }
    const ms = this.data.speeds[this.data.speedIndex].ms
    this._playTimer = setTimeout(() => {
      this.playStep(step + 1)
    }, ms)
  },

  currentShape() {
    if (this.data.selectedId) {
      const p = this.data.presets.find((x) => x.id === this.data.selectedId)
      if (p) return p
    }
    return this._myShapes.find((x) => x.id === this.data.selectedId) || null
  },

  stopPlay() {
    if (this._playTimer) {
      clearTimeout(this._playTimer)
      this._playTimer = null
    }
    if (this.data.isPlaying) this.setData({ isPlaying: false })
  },

  onPrev() {
    this.stopPlay()
    const s = Math.max(0, this.data.stepIndex - 1)
    this.applyStep(s)
  },

  onNext() {
    this.stopPlay()
    const s = Math.min(this.data.totalSteps, this.data.stepIndex + 1)
    this.applyStep(s)
  },

  applyStep(s) {
    const item = this.currentShape()
    if (!item) return
    const turns = turnsAtStep(this._steps, s, item.pieceCount)
    this.setData({
      turns,
      stepIndex: s,
      metaText: `第 ${s}/${this.data.totalSteps} 步 · 拖动旋转视角`
    })
  },

  onReset() {
    this.stopPlay()
    if (this.data.mode === 'manual') {
      const t = this.zeros(this.data.pieceCount)
      this._history = []
      this.applyTurnsState(t, -1)
      return
    }
    this.setData({ turns: [], stepIndex: 0 })
  },

  onPickSpeed(e) {
    this.setData({ speedIndex: Number(e.currentTarget.dataset.i) })
  },

  onToggleSpin() {
    this.setData({ spin: !this.data.spin })
  },

  // ---------- 跟着折（引导学习）----------
  onEnterGuide() {
    const item = this.currentShape()
    if (!item) {
      wx.showToast({ title: '先选一个造型', icon: 'none' })
      return
    }
    this.enterGuideFor(item)
  },

  enterGuideFor(item) {
    const src = item.formula != null ? item.formula : item.digits
    const parsed = parseFormula(src, item.pieceCount)
    if (parsed.errors.length) {
      wx.showToast({ title: '造型数据异常', icon: 'none' })
      return
    }
    this.stopPlay()
    this._guideSteps = parsed.steps
    this._guideFull = []
    for (let k = 0; k <= parsed.steps.length; k++) {
      this._guideFull.push(turnsAtStep(parsed.steps, k, item.pieceCount))
    }
    const start = this.zeros(item.pieceCount)
    this._turns = start.slice()
    this.setData({
      mode: 'guide',
      interactive: true,
      selectedId: item.id,
      shapeName: item.name,
      pieceCount: item.pieceCount,
      turns: start,
      guideStep: 0,
      guideTotal: parsed.steps.length,
      guideDone: false,
      overlap: [],
      overlapCount: 0,
      highlight: [],
      focus: -1,
      guideHint: '把发光的那块折一下，开始吧！',
      metaText: `跟着折：${item.name}`
    }, () => this.updateGuideTarget())
  },

  updateGuideTarget() {
    if (this.data.guideStep >= this.data.guideTotal) {
      this.setData({ guideDone: true, highlight: [], focus: -1, guideHint: '折好啦！你真棒 🎉' })
      wx.showToast({ title: '完成！', icon: 'success' })
      return
    }
    const step = this._guideSteps[this.data.guideStep]
    const joint = step.joint // 0 基
    const piece = joint + 1
    const dir = step.turn === 1 ? '向右转 ↻' : step.turn === -1 ? '向左转 ↺' : '翻个身 ⟳'
    this.setData({
      guideDone: false,
      highlight: [piece],
      selectedJoint: joint,
      focus: piece, // 把正在折的那一块放到画面正中
      joints: this.buildJoints(this._turns, joint),
      guideHint: `第 ${this.data.guideStep + 1}/${this.data.guideTotal} 步：把发光的那块 ${dir}！`
    })
  },

  // 跟着折：折对当前这一步（点中发光块即自动折到位并进入下一步）
  guideTapJoint(joint) {
    if (this.data.guideDone) return
    const step = this._guideSteps[this.data.guideStep]
    if (joint !== step.joint) {
      wx.showToast({ title: '先折发光的那块哦', icon: 'none' })
      return
    }
    const next = this._guideFull[this.data.guideStep + 1]
    this._turns = next.slice()
    this.setData({
      turns: next.slice(),
      poseDigits: this.turnsToDigits(next),
      guideStep: this.data.guideStep + 1
    }, () => this.updateGuideTarget())
  },

  onGuideAuto() {
    if (this.data.guideDone) return
    const next = this._guideFull[this.data.guideStep + 1]
    this._turns = next.slice()
    this.setData({
      turns: next.slice(),
      poseDigits: this.turnsToDigits(next),
      guideStep: this.data.guideStep + 1
    }, () => this.updateGuideTarget())
  },

  onGuidePrev() {
    if (this.data.guideStep <= 0) {
      wx.showToast({ title: '已经是第一步', icon: 'none' })
      return
    }
    const prev = this._guideFull[this.data.guideStep - 1]
    this._turns = prev.slice()
    this.setData({
      turns: prev.slice(),
      poseDigits: this.turnsToDigits(prev),
      guideStep: this.data.guideStep - 1
    }, () => this.updateGuideTarget())
  },

  onGuideNext() {
    if (this.data.guideDone) return
    this.onGuideAuto()
  },

  onGuideRestart() {
    const start = this.zeros(this.data.pieceCount)
    this._turns = start.slice()
    this.setData({
      turns: start,
      poseDigits: this.turnsToDigits(start),
      guideStep: 0,
      guideDone: false
    }, () => this.updateGuideTarget())
  },

  // ---------- 手动折叠 ----------
  zeros(n) {
    const a = []
    for (let i = 0; i < n - 1; i++) a.push(0)
    return a
  },

  onPickPiece(e) {
    const piece = e.detail.piece
    const joint = piece - 1
    if (joint < 0) return
    if (this.data.mode === 'guide') {
      this.guideTapJoint(joint)
      return
    }
    if (this.data.mode === 'manual') {
      this.twistJoint(joint, 1)
    }
  },

  onTapJoint(e) {
    const j = Number(e.currentTarget.dataset.j)
    this.setData({ selectedJoint: j, focus: j + 1, joints: this.buildJoints(this._turns, j) })
  },

  onSetJoint(e) {
    if (this.data.selectedJoint < 0) {
      wx.showToast({ title: '先选一个关节', icon: 'none' })
      return
    }
    const v = Number(e.currentTarget.dataset.v)
    this.setJointValue(this.data.selectedJoint, v)
  },

  twistJoint(joint, dir) {
    if (joint < 0 || joint >= this._turns.length) return
    this._history.push(this._turns.slice())
    if (this._history.length > 200) this._history.shift()
    const t = this._turns.slice()
    t[joint] = this.cycleTurn(t[joint], dir)
    this.applyTurnsState(t, joint)
  },

  setJointValue(joint, value) {
    if (joint < 0 || joint >= this._turns.length) return
    this._history.push(this._turns.slice())
    if (this._history.length > 200) this._history.shift()
    const t = this._turns.slice()
    t[joint] = value
    this.applyTurnsState(t, joint)
  },

  applyTurnsState(t, sel) {
    this._turns = t
    const overlap = this.computeOverlap(t)
    const selJoint = sel != null ? sel : this.data.selectedJoint
    this.setData({
      turns: t.slice(),
      overlap,
      overlapCount: overlap.length,
      poseDigits: this.turnsToDigits(t),
      joints: this.buildJoints(t, selJoint),
      selectedJoint: selJoint,
      focus: selJoint >= 0 ? selJoint + 1 : -1, // 自由折：选中/操作的关节那节居中
      canUndo: this._history.length > 0,
      metaText: `${this.data.pieceCount} 段 · ${overlap.length ? '⚠ ' + overlap.length + ' 处穿模' : '无穿模'} · 点段扭转`
    })
  },

  computeOverlap(t) {
    const cols = snake.detectCollisions(this.data.pieceCount, t)
    const set = {}
    cols.forEach((c) => {
      if (c.pieces) c.pieces.forEach((p) => { if (p >= 0) set[p] = true })
    })
    return Object.keys(set).map(Number)
  },

  onUndo() {
    if (!this._history.length) {
      wx.showToast({ title: '无可撤销', icon: 'none' })
      return
    }
    const t = this._history.pop()
    this.applyTurnsState(t, -1)
  },

  onRandom() {
    const n = this._turns.length
    const t = []
    for (let i = 0; i < n; i++) t.push(this.digitToTurn(String(Math.floor(Math.random() * 4))))
    this._history.push(this._turns.slice())
    if (this._history.length > 200) this._history.shift()
    this.applyTurnsState(t, -1)
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
  },

  onSave() {
    const digits = this.turnsToDigits(this._turns)
    if (digits.split('').every((c) => c === '0')) {
      wx.showToast({ title: '直线无法保存', icon: 'none' })
      return
    }
    const count = this.data.pieceCount
    wx.showModal({
      title: '保存造型',
      editable: true,
      placeholderText: '给图案起个名字',
      success: (res) => {
        if (!res.confirm) return
        const name = (res.content || '').trim() || ('我的造型 ' + (this._myShapes.length + 1))
        const item = { id: 'mine-' + Date.now().toString(36), name, pieceCount: count, digits }
        this._myShapes.push(item)
        wx.setStorageSync('snake:myshapes', this._myShapes)
        this.setData({ myShapes: this.visibleMyShapes() })
        wx.showToast({ title: '已保存', icon: 'success' })
      }
    })
  },

  onCopyPose() {
    if (!this.data.poseDigits) return
    wx.setClipboardData({
      data: this.data.poseDigits,
      success: () => wx.showToast({ title: '姿态已复制', icon: 'none' })
    })
  },

  // ---------- 整体显示大小 ----------
  onScaleDec() {
    this.changeScale(this.data.scale - 0.1)
  },

  onScaleInc() {
    this.changeScale(this.data.scale + 0.1)
  },

  changeScale(s) {
    s = Math.max(0.5, Math.min(1.6, Math.round(s * 10) / 10))
    if (s === this.data.scale) return
    this.setData({ scale: s, scalePct: Math.round(s * 100) })
  },

  // ---------- 工具方法 ----------
  buildJoints(t, sel) {
    return t.map((v, i) => ({ index: i, state: this.turnToDigit(v), active: i === sel }))
  },

  turnToDigit(t) {
    const v = t || 0
    if (v === 0) return 0
    if (v === 1) return 1
    if (v === 2) return 2
    return 3 // -1
  },

  turnsToDigits(t) {
    return t.map((v) => this.turnToDigit(v)).join('')
  },

  digitToTurn(d) {
    const s = String(d)
    if (s === '0') return 0
    if (s === '1') return 1
    if (s === '2') return 2
    return -1 // '3'
  },

  cycleTurn(t, dir) {
    const order = [0, 1, 2, -1]
    let idx = order.indexOf(t)
    if (idx < 0) idx = 0
    return order[(idx + dir + 4) % 4]
  }
})
