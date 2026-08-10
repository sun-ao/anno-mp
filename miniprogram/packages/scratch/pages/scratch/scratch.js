const { playPop } = require('../../../../utils/kids-audio')

const PRIZES = [
  { emoji: '🎁', text: '小惊喜' },
  { emoji: '🌟', text: '幸运星' },
  { emoji: '🍬', text: '甜甜的' },
  { emoji: '💎', text: '闪亮亮' },
  { emoji: '🎈', text: '开心' },
  { emoji: '🌈', text: '好运气' },
  { emoji: '🍀', text: '幸运草' },
  { emoji: '❤️', text: '满满爱' }
]

const ERASER_R = 26      // 擦除半径（逻辑 px）
const REVEAL_RATIO = 0.45 // 刮开面积比例阈值

Page({
  data: {
    prize: {},
    cleared: false
  },

  onLoad() {
    this._init()
  },

  _init() {
    this.setData({
      prize: PRIZES[Math.floor(Math.random() * PRIZES.length)],
      cleared: false
    })
    this._erased = 0
    wx.nextTick(() => this._setupCanvas())
  },

  _setupCanvas() {
    const q = wx.createSelectorQuery()
    q.select('#scratch').fields({ node: true, size: true }).exec((res) => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = (wx.getWindowInfo && wx.getWindowInfo().pixelRatio) || 2
      const w = res[0].width
      const h = res[0].height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      // 灰色涂层
      ctx.fillStyle = '#C9CCD1'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = '#8A8F99'
      ctx.font = '34px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('刮一刮', w / 2, h / 2)
      this._canvas = canvas
      this._ctx = ctx
      this._cw = w
      this._ch = h
    })
  },

  onTouch(e) {
    if (this.data.cleared || !this._ctx) return
    const t = e.touches[0] || e.changedTouches[0]
    if (!t) return
    this._erase(t.x, t.y)
  },

  _erase(x, y) {
    const ctx = this._ctx
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(x, y, ERASER_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = 'source-over'
    // 累计刮开面积，超过阈值自动揭晓
    this._erased += Math.PI * ERASER_R * ERASER_R
    if (this._erased > REVEAL_RATIO * this._cw * this._ch) {
      this._reveal()
    }
  },

  _reveal() {
    if (this.data.cleared) return
    const ctx = this._ctx
    if (ctx) ctx.clearRect(0, 0, this._cw, this._ch)
    this.setData({ cleared: true })
    playPop()
  },

  onAgain() {
    this._init()
  }
})
