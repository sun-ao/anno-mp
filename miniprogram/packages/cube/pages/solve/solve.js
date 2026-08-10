import { parseSolution, applyMove, SOLVE_PAYLOAD_KEY } from '../../model/cube-state'

Page({
  data: {
    solution: '',
    formulaMoves: [],
    steps: [],
    current: 0,
    viewState: [],
    hintText: '',
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
    this._moves = parseSolution(payload.solution)
    this._history = [payload.state]
    this._autoPlaying = false
    this._autoTimer = null
    this.setData({
      solution: payload.solution,
      viewState: payload.state,
      current: 0
    })
    this.refreshSteps()
  },

  onUnload() {
    this.stopAutoPlay()
    if (this._backTimer) {
      clearTimeout(this._backTimer)
      this._backTimer = null
    }
  },

  refreshSteps() {
    const current = this.data.current
    const moves = this._moves
    const steps = moves.map((m, i) => ({
      ...m,
      status: i < current ? 'done' : i === current ? 'next' : 'todo'
    }))
    let hintText
    if (moves.length === 0) {
      hintText = '已是还原状态，无需转动'
    } else if (current === 0) {
      hintText = `共 ${moves.length} 步，对照真实魔方，点"下一步"开始`
    } else if (current >= moves.length) {
      hintText = '全部完成，魔方已还原'
    } else {
      hintText = `第 ${current + 1} 步：${moves[current].text}`
    }
    const formulaMoves = moves.map((m, i) => ({
      move: m.move,
      highlight: i === current && current < moves.length,
      done: i < current
    }))
    this.setData({
      steps,
      formulaMoves,
      hintText,
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
      this.refreshSteps()
      this.scheduleAutoNext()
    })
  },

  /** 主按钮：播放时暂停，否则执行下一步 */
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
      this.refreshSteps()
    })
  },

  /** 自动播放：动画完成后倒计时，到时自动执行下一步 */
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

  onBackFill() {
    this.stopAutoPlay()
    wx.navigateBack()
  }
})
