const { playPop, playCorrect, playWrong, playTada } = require('../../../../utils/kids-audio')

const KEY = 'hoop:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

const FLY_MS = 500     // 球从地面飞到筐口的时长
// 命中水平容差（百分比点）：球必须真正落进筐圈内才算进。
// 球场宽≈686rpx，筐内径≈118rpx(半径59rpx)→占宽约8.6%，取 8 即球心落在圈内。
const HIT_TOL = 8

Page({
  data: {
    ballX: 50,
    hoopX: 50,
    phase: 'idle',   // idle | fly | score | miss
    score: 0,
    count: 0
  },

  onLoad() {
    this.setData({ count: getCount() })
    this._dir = 1
    this._step = 1.5   // 起始很慢，随得分慢慢加快（封顶见 _speedFor）
    this._ht = setInterval(() => {
      let x = this.data.hoopX + this._dir * this._step
      if (x >= 85) { x = 85; this._dir = -1 }
      if (x <= 15) { x = 15; this._dir = 1 }
      this.setData({ hoopX: x })
    }, 55)
  },

  _speedFor(score) {
    // 每进 1 球加速 0.12，起点 1.5，封顶 3.2（约 1.3s 横穿一遍，仍可玩）
    return Math.min(3.2, 1.5 + score * 0.12)
  },

  onShoot() {
    if (this.data.phase !== 'idle') return
    playPop()
    this.setData({ phase: 'fly' })
    // 球飞到筐口时，用【此时】篮筐的实时位置判定，和眼睛看到的一致
    this._st = setTimeout(() => {
      const dx = Math.abs(this.data.ballX - this.data.hoopX)
      if (dx < HIT_TOL) this._score()
      else this._miss()
    }, FLY_MS)
  },

  _score() {
    playCorrect()
    const score = this.data.score + 1
    const count = addCount()
    this.setData({ phase: 'score', score, count })
    if (score % 5 === 0) playTada()
    this._step = this._speedFor(score)   // 越投越快
    this._rt = setTimeout(() => this.setData({ phase: 'idle' }), 380)
  },

  _miss() {
    playWrong()
    this.setData({ phase: 'miss' })
    this._rt = setTimeout(() => this.setData({ phase: 'idle' }), 520)
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync(KEY, 0)
          this.setData({ score: 0, count: 0 })
        }
      }
    })
  },

  onUnload() {
    clearInterval(this._ht)
    if (this._st) clearTimeout(this._st)
    if (this._rt) clearTimeout(this._rt)
  }
})
