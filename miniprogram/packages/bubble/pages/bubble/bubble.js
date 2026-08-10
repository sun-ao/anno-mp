const { getPopped, addPopped, resetPopped } = require('../../model/bubble')
const { playPop } = require('../../../../utils/kids-audio')

const COLORS = [
  'rgba(147, 197, 253, 0.75)',
  'rgba(249, 168, 212, 0.75)',
  'rgba(134, 239, 172, 0.75)',
  'rgba(253, 186, 116, 0.75)',
  'rgba(196, 181, 253, 0.75)'
]

let uid = 0

Page({
  data: {
    bubbles: [],
    popped: 0
  },

  onLoad() {
    this._removeTimers = {}
    this.setData({ popped: getPopped() })
    this._spawn()
    this._spawn()
    this._spawn()
    this._spawnTimer = setInterval(() => this._spawn(), 1400)
  },

  _spawn() {
    if (this.data.bubbles.length >= 6) return
    const id = ++uid
    const bubble = {
      id,
      size: 90 + Math.floor(Math.random() * 70),
      left: Math.floor(Math.random() * 84),
      dur: (8 + Math.random() * 5).toFixed(1),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      popping: false
    }
    this.setData({ bubbles: [...this.data.bubbles, bubble] })
    this._removeTimers[id] = setTimeout(() => this._remove(id), bubble.dur * 1000)
  },

  onTapBubble(e) {
    const id = e.currentTarget.dataset.id
    const target = this.data.bubbles.find((b) => b.id === id)
    if (!target || target.popping) return
    playPop()
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    const popped = addPopped()
    this.setData({
      popped,
      bubbles: this.data.bubbles.map((b) => (b.id === id ? { ...b, popping: true } : b))
    })
    setTimeout(() => this._remove(id), 280)
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          resetPopped()
          this.setData({ popped: 0 })
        }
      }
    })
  },

  _remove(id) {
    if (this._removeTimers[id]) {
      clearTimeout(this._removeTimers[id])
      delete this._removeTimers[id]
    }
    this.setData({ bubbles: this.data.bubbles.filter((b) => b.id !== id) })
  },

  onUnload() {
    clearInterval(this._spawnTimer)
    Object.keys(this._removeTimers).forEach((k) => clearTimeout(this._removeTimers[k]))
    this._removeTimers = {}
  }
})
