import { applyMove, SOLVE_PAYLOAD_KEY } from '../../model/cube-state'
import { splitIntoLBLPhases } from '../../model/lbl-solver'

/** 去掉标题前缀「第x步 · 」，便于紧凑展示 */
function shortTitle(title) {
  return title.replace(/^第.步\s*·\s*/, '')
}

Page({
  data: {
    solution: '',
    moves: [],
    phases: [],
    current: 0,
    currentPhase: 0,
    viewState: [],
    hintText: '',
    phaseTitle: '',
    phaseGoal: '',
    phaseTip: '',
    phaseProgressText: '',
    phaseDots: [],
    phaseFormulaMoves: [],
    steps: [],
    scrollTo: '',
    animating: false,
    autoPlaying: false,
    autoInterval: 3,
    intervalOptions: Array.from({ length: 30 }, (_, i) => (i + 1) + 's'),
    intervalIndex: 2
  },

  onLoad() {
    const payload = wx.getStorageSync(SOLVE_PAYLOAD_KEY)
    if (!payload || !payload.solution) {
      wx.showToast({ title: '请先求解', icon: 'none' })
      this._backTimer = setTimeout(() => wx.navigateBack(), 800)
      return
    }
    const { moves, phases } = splitIntoLBLPhases(payload.state, payload.solution)
    this._moves = moves
    this._history = [payload.state]
    this._autoPlaying = false
    this._autoTimer = null
    this.setData({
      solution: payload.solution,
      phases,
      viewState: payload.state,
      current: 0
    })
    this.refresh()
  },

  onUnload() {
    this.stopAutoPlay()
    if (this._backTimer) {
      clearTimeout(this._backTimer)
      this._backTimer = null
    }
  },

  /** 根据已完成的步数 current，求当前所处阶段索引 */
  _phaseOf(current) {
    const phases = this.data.phases
    let p = 0
    for (let i = 0; i < phases.length; i++) {
      if (current >= phases[i].startIndex) p = i
    }
    return p
  },

  refresh() {
    const current = this.data.current
    const moves = this._moves
    const phases = this.data.phases
    const n = moves.length
    const pIdx = this._phaseOf(current)
    const phase = phases[pIdx]

    // 七阶段进度点
    const phaseDots = phases.map((ph, i) => ({
      index: i + 1,
      shortTitle: shortTitle(ph.title),
      status: i < pIdx ? 'done' : i === pIdx ? 'active' : 'todo'
    }))

    // 当前阶段公式（高亮已做/当前/未做）
    const phaseStart = phase.startIndex
    const phaseEnd = phase.endIndex
    const phaseFormulaMoves = []
    for (let k = phaseStart; k < phaseEnd; k++) {
      phaseFormulaMoves.push({
        move: moves[k].move,
        localIndex: k - phaseStart,
        highlight: k === current && current < n,
        done: k < current
      })
    }

    // 全部分步列表（带阶段分隔）
    const steps = []
    phases.forEach((ph, pi) => {
      for (let k = ph.startIndex; k < ph.endIndex; k++) {
        const m = moves[k]
        const status = k < current ? 'done' : k === current ? 'next' : 'todo'
        steps.push({
          globalIndex: k,
          phaseIndex: pi,
          move: m.move,
          text: m.text,
          status,
          divider: k === ph.startIndex,
          dividerTitle: ph.title
        })
      }
    })

    let hintText
    if (n === 0) hintText = '已是还原状态，无需转动'
    else if (current === 0) hintText = `共 ${n} 步 · 按课堂七步还原，点"下一步"开始`
    else if (current >= n) hintText = '全部完成，魔方已还原！🎉'
    else hintText = `第 ${current + 1} 步：${moves[current].text}`

    const phaseProgressText = `第 ${pIdx + 1} / ${phases.length} 步 · ${shortTitle(phase.title)}`

    this.setData({
      steps,
      phaseDots,
      phaseFormulaMoves,
      phaseTitle: phase.title,
      phaseGoal: phase.goal,
      phaseTip: phase.tip,
      phaseProgressText,
      hintText,
      currentPhase: pIdx,
      scrollTo: `step-${current}`
    })
  },

  onNext() {
    const { current, viewState, animating } = this.data
    const moves = this._moves
    if (current >= moves.length || animating) return

    const cube3d = this.selectComponent('#cube3d')
    if (!cube3d) return

    const move = moves[current]
    const newState = applyMove(viewState, move)
    this.setData({ animating: true })
    cube3d.animateMove(move, newState, () => {
      this._history.push(newState)
      this.setData({ current: current + 1, viewState: newState, animating: false })
      this.refresh()
      this.scheduleAutoNext()
    })
  },

  onMainAction() {
    if (this._autoPlaying) {
      this.stopAutoPlay()
    } else {
      this.onNext()
    }
  },

  onPrev() {
    if (this.data.animating) return
    this.stopAutoPlay()
    const { current } = this.data
    if (current <= 0) return

    const cube3d = this.selectComponent('#cube3d')
    if (!cube3d) return

    const move = this._moves[current - 1]
    const inverseMove = { face: move.face, turn: move.turn === 2 ? 2 : -move.turn }
    const prevState = this._history[current - 1]
    this.setData({ animating: true })
    cube3d.animateMove(inverseMove, prevState, () => {
      this._history.pop()
      this.setData({ current: current - 1, viewState: prevState, animating: false })
      this.refresh()
    })
  },

  scheduleAutoNext() {
    if (!this._autoPlaying) return
    if (this.data.current >= this._moves.length) {
      this.stopAutoPlay()
      return
    }
    this._autoTimer = setTimeout(() => {
      this.onNext()
    }, this.data.autoInterval * 1000)
  },

  onToggleAuto() {
    if (this._autoPlaying) {
      this.stopAutoPlay()
    } else {
      this.startAutoPlay()
    }
  },

  startAutoPlay() {
    if (this.data.current >= this._moves.length) {
      wx.showToast({ title: '已全部完成', icon: 'none' })
      return
    }
    this._autoPlaying = true
    this.setData({ autoPlaying: true })
    if (!this.data.animating) {
      this.onNext()
    }
  },

  stopAutoPlay() {
    this._autoPlaying = false
    this.setData({ autoPlaying: false })
    if (this._autoTimer) {
      clearTimeout(this._autoTimer)
      this._autoTimer = null
    }
  },

  onIntervalChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      intervalIndex: idx,
      autoInterval: idx + 1
    })
  },

  onBack() {
    this.stopAutoPlay()
    wx.navigateBack()
  }
})
