const { GESTURES, HANDS, randomGesture, randomHand } = require('../../model/rps')

// 谁打败谁：rock 胜 scissors，scissors 胜 paper，paper 胜 rock
const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' }

const COUNT_KEY = 'rps:count'

Page({
  data: {
    mode: 'rps',
    phase: 'setup', // setup | playing | roundEnd | finished
    playerCount: 4,
    players: [],
    aliveCount: 0,
    round: 1,
    turnIndex: 0,
    lastResult: null,
    roundResult: null, // 本轮结算展示（rps）
    roundSummary: '',
    winner: 0,
    countOptions: [2, 3, 4, 5, 6, 7, 8]
  },

  onLoad() {
    const saved = wx.getStorageSync(COUNT_KEY)
    const n = Number(saved)
    if (n >= 2 && n <= 8) {
      this.setData({ playerCount: n })
    }
  },

  onSelectMode(e) {
    this.setData({ mode: e.currentTarget.dataset.mode })
  },

  onSelectCount(e) {
    const n = Number(e.currentTarget.dataset.n)
    this.setData({ playerCount: n })
    wx.setStorageSync(COUNT_KEY, n)
  },

  onStart() {
    const n = this.data.playerCount
    const players = []
    for (let i = 0; i < n; i++) {
      players.push({ i, alive: true, done: false, gesture: '', hand: '' })
    }
    this.setData({
      players,
      aliveCount: n,
      round: 1,
      turnIndex: 0,
      lastResult: null,
      roundResult: null,
      roundSummary: '',
      winner: 0,
      phase: 'playing'
    })
  },

  // 整页点击
  onTap() {
    const { phase } = this.data
    if (phase === 'setup' || this._lock) return
    if (phase === 'playing') this._stepTurn()
    else if (phase === 'roundEnd') this._nextRound()
    else if (phase === 'finished') this.setData({ phase: 'setup' })
  },

  /** 当前玩家出手并推进 */
  _stepTurn() {
    const { players, mode, turnIndex } = this.data
    const p = players[turnIndex]
    if (!p || !p.alive || p.done) return
    let lastResult
    if (mode === 'rps') {
      // 不再和电脑对战：随机出一个拳，显示在屏幕上
      const gKey = randomGesture()
      p.gesture = gKey
      const g = GESTURES.find((x) => x.key === gKey)
      lastResult = { turn: p.i, kind: 'gesture', gesture: g }
    } else {
      const hand = randomHand()
      p.hand = hand
      lastResult = { turn: p.i, kind: 'hand', hand: HANDS[hand] }
    }
    p.done = true
    this.setData({ players, lastResult })
    // 展示片刻后推进到下一位
    this._lock = true
    this._advanceTimer = setTimeout(() => {
      this._lock = false
      this._advance()
    }, 1300)
  },

  /** 所有人出完 → 结算；否则轮到下一个人 */
  _advance() {
    const { players, mode } = this.data
    const next = players.findIndex((q) => q.alive && !q.done)
    if (next !== -1) {
      this.setData({ turnIndex: next, lastResult: null })
      return
    }
    if (mode === 'rps') this._settleRps()
    else this._settleHand()
  },

  /** 猜拳（多人）：全员出齐后按石头剪刀布规则结算 */
  _settleRps() {
    const players = this.data.players
    const alive = players.filter((q) => q.alive && q.done)
    const counts = { rock: 0, scissors: 0, paper: 0 }
    alive.forEach((q) => { counts[q.gesture]++ })
    const present = Object.keys(counts).filter((k) => counts[k] > 0)

    // 只有一种（全员一样）或三种都出现 → 平局，重新一轮
    if (present.length <= 1 || present.length === 3) {
      const summary = present.length === 3
        ? '石头剪刀布都出了，平局，重新一轮'
        : '全员出的一样，平局，重新一轮'
      this.setData({ phase: 'roundEnd', roundSummary: summary, roundResult: null })
      return
    }

    // 恰好两种：一种胜、一种负
    const [a, b] = present
    let winType, loseType
    if (BEATS[a] === b) { winType = a; loseType = b } else { winType = b; loseType = a }

    players.forEach((q) => {
      if (q.alive && q.gesture === loseType) q.alive = false
    })
    const outNames = players
      .filter((q) => !q.alive && q.done && q.gesture === loseType)
      .map((q) => `玩家 ${q.i + 1}`)
    const aliveCount = players.filter((q) => q.alive).length

    // 本轮每个人出了什么的展示
    const rows = alive.map((q) => ({
      name: `玩家 ${q.i + 1}`,
      emoji: GESTURES.find((x) => x.key === q.gesture).emoji,
      out: q.gesture === loseType
    }))

    if (aliveCount <= 1) {
      this.setData({ phase: 'finished', winner: players.find((q) => q.alive).i, players, roundResult: null })
    } else {
      this.setData({
        phase: 'roundEnd',
        roundSummary: `出局：${outNames.join('、')}`,
        players,
        roundResult: { rows, winType: GESTURES.find((x) => x.key === winType).name }
      })
    }
  },

  /** 手心手背：少数派出局（原逻辑不变） */
  _settleHand() {
    const players = this.data.players
    const palmN = players.filter((q) => q.alive && q.done && q.hand === 'palm').length
    const backN = players.filter((q) => q.alive && q.done && q.hand === 'back').length
    if (palmN === backN || palmN === 0 || backN === 0) {
      const summary = palmN === 0 || backN === 0
        ? '全员同一手势，重新一轮'
        : `平票：手心 ${palmN} vs 手背 ${backN}，重新一轮`
      this.setData({ phase: 'roundEnd', roundSummary: summary })
      return
    }
    const loserHand = palmN < backN ? 'palm' : 'back'
    players.forEach((q) => {
      if (q.alive && q.hand === loserHand) q.alive = false
    })
    const outNames = players.filter((q) => !q.alive && q.done).map((q) => `玩家 ${q.i + 1}`)
    const aliveCount = players.filter((q) => q.alive).length
    if (aliveCount <= 1) {
      this.setData({ phase: 'finished', winner: players.find((q) => q.alive).i, players })
    } else {
      this.setData({
        phase: 'roundEnd',
        roundSummary: `${loserHand === 'palm' ? '手心' : '手背'}少数派出局：${outNames.join('、')}`,
        players
      })
    }
  },

  /** 进入下一轮 */
  _nextRound() {
    const { players, round } = this.data
    players.forEach((q) => {
      q.done = false
      q.gesture = ''
      q.hand = ''
    })
    this.setData({
      players,
      round: round + 1,
      lastResult: null,
      roundSummary: '',
      roundResult: null,
      turnIndex: players.findIndex((q) => q.alive),
      phase: 'playing'
    })
  },

  onUnload() {
    if (this._advanceTimer) {
      clearTimeout(this._advanceTimer)
      this._advanceTimer = null
    }
  }
})
