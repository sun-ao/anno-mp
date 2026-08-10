const { playBoop, playTada } = require('../../../../utils/kids-audio')

const OBJECTS = ['🍎', '🐤', '🐸', '⭐', '🚗', '🐶']
// 每满 MILESTONE 个给一个小惊喜（不重置，继续往上数）
const MILESTONE = 10

Page({
  data: {
    obj: OBJECTS[0],
    count: 0,
    jumping: false,
    milestone: 0
  },

  onLoad() {
    this._pickObject()
  },

  _pickObject() {
    const obj = OBJECTS[Math.floor(Math.random() * OBJECTS.length)]
    this.setData({ obj, count: 0, jumping: false, milestone: 0 })
  },

  onTapObject() {
    const count = this.data.count + 1
    // 音高随数字升高（封顶避免过尖），像爬楼梯一直往上
    playBoop(Math.min(400 + count * 55, 1300))
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    this.setData({ count, jumping: false })
    if (this._jumpTimer) clearTimeout(this._jumpTimer)
    this._jumpTimer = setTimeout(() => this.setData({ jumping: true }), 16)
    // 每满 10 个放个小烟花，但不打断计数
    if (count % MILESTONE === 0) {
      this.setData({ milestone: count })
      playTada()
      if (this._mileTimer) clearTimeout(this._mileTimer)
      this._mileTimer = setTimeout(() => this.setData({ milestone: 0 }), 1200)
    }
  },

  // 手动重来：归零并换个图案
  onRestart() {
    if (this._mileTimer) clearTimeout(this._mileTimer)
    this._pickObject()
  },

  onUnload() {
    if (this._jumpTimer) clearTimeout(this._jumpTimer)
    if (this._mileTimer) clearTimeout(this._mileTimer)
  }
})
