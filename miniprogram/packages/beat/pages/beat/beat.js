const { playPop, playCorrect, playWrong } = require('../../../../utils/kids-audio')

// 坐标用 rpx 坐标系
const COURT_W = 700
const COURT_H = 1000
const LINE_Y = 640        // 判定线 y
const NOTE_R = 34
const NOTE_D = NOTE_R * 2
const SPEED = 6           // 每帧下落 rpx
// 节奏间隔（帧）：几种长度交错，制造疏密变化但仍可玩
// 间隔×SPEED = 屏幕上相邻音符的间距：16→96rpx、20→120rpx、26→156rpx、34→204rpx
const INTERVALS = [16, 20, 26, 34]
const START_DELAY = 24    // 开场停顿，给一点准备时间
const HIT_TOL = 90        // 命中容差（距判定线）
const PERFECT_TOL = 36    // 完美命中容差

// 加权随机选间隔：偏中等密度，偶尔更密或更疏，避免“一个频率”
function pickInterval() {
  const r = Math.random()
  if (r < 0.4) return INTERVALS[0]
  if (r < 0.7) return INTERVALS[1]
  if (r < 0.9) return INTERVALS[2]
  return INTERVALS[3]
}

Page({
  data: {
    courtW: COURT_W,
    courtH: COURT_H,
    lineY: LINE_Y,
    noteD: NOTE_D,
    notes: [],
    score: 0,
    combo: 0,
    best: 0,
    running: false
  },

  onLoad() {
    this._timers = []
    this._frame = 0
    this._nid = 0
    this.setData({ best: wx.getStorageSync('beat:best') || 0 })
    this._start()
  },

  _start() {
    this._frame = 0
    this._nid = 0
    this._spawnIn = START_DELAY
    this.setData({ notes: [], score: 0, combo: 0, running: true })
    this._stop()
    this._timer = setInterval(() => this._tick(), 30)
    this._timers.push(this._timer)
  },

  _stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  _tick() {
    if (!this.data.running) return
    this._frame++
    const notes = this.data.notes.slice()
    // 倒计时到 0 才落下一个音符，然后随机选下一个间隔（疏密变化）
    if (this._spawnIn <= 0) {
      notes.push({ id: this._nid++, y: 0, label: '🎵' })
      this._spawnIn = pickInterval()
    } else {
      this._spawnIn--
    }
    const remain = []
    let miss = false
    for (const n of notes) {
      n.y += SPEED
      if (n.y > LINE_Y + 120) miss = true
      else remain.push(n)
    }
    this.setData({ notes: remain })
    if (miss) this._break()
  },

  _break() {
    if (this.data.combo > 0) playWrong()
    this.setData({ combo: 0 })
  },

  onTap() {
    if (!this.data.running) return
    const notes = this.data.notes
    let bestIdx = -1
    let bestD = 1e9
    notes.forEach((n, i) => {
      const d = Math.abs(n.y - LINE_Y)
      if (d < bestD) { bestD = d; bestIdx = i }
    })
    if (bestIdx >= 0 && bestD < HIT_TOL) {
      const perfect = bestD < PERFECT_TOL
      const combo = this.data.combo + 1
      const score = this.data.score + (perfect ? 30 : 15)
      const arr = notes.slice()
      arr.splice(bestIdx, 1)
      this.setData({ notes: arr, score, combo })
      if (perfect) playCorrect()
      else playPop()
      if (combo > this.data.best) {
        wx.setStorageSync('beat:best', combo)
        this.setData({ best: combo })
      }
    } else {
      this._break()
    }
  },

  onAgain() {
    this._start()
  },

  onClear() {
    wx.showModal({
      title: '清空最佳',
      content: '确定要把最佳连击清零吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync('beat:best', 0)
          this.setData({ best: 0 })
        }
      }
    })
  },

  onHide() {
    this._stop()
  },

  onUnload() {
    this._stop()
    this._timers.forEach(t => clearInterval(t))
  }
})
