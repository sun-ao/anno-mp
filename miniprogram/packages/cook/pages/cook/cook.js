const { getCount, addCount, resetCount } = require('../../model/cook')
const { playCorrect, playWrong, playTada } = require('../../../../utils/kids-audio')

// 每轮从这 4 种配料中随机抽一个顺序（从下到上叠）
const LAYERS = ['🥬', '🍅', '🥩', '🧀']
// 每种配料对应汉堡上的 CSS 层样式
const CLS = { '🥬': 'layer-leaf', '🍅': 'layer-tomato', '🥩': 'layer-meat', '🧀': 'layer-cheese' }

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

Page({
  data: {
    total: 0,
    layers: [],
    buttons: [],
    stack: [],
    next: 0,
    done: false,
    shakeId: -1
  },

  onLoad() {
    this.setData({ total: getCount() })
    this._newOrder()
  },

  _newOrder() {
    this.setData({
      layers: shuffle(LAYERS),
      buttons: shuffle(LAYERS.map((emoji, i) => ({ id: i, emoji }))),
      stack: [],
      next: 0,
      done: false,
      shakeId: -1
    })
  },

  onTapLayer(e) {
    if (this.data.done) return
    const id = Number(e.currentTarget.dataset.id)
    const btn = this.data.buttons.find((b) => b.id === id)
    if (!btn) return

    if (btn.emoji === this.data.layers[this.data.next]) {
      playCorrect()
      const stack = this.data.stack.concat({ emoji: btn.emoji, cls: CLS[btn.emoji] })
      const next = this.data.next + 1
      this.setData({ stack, next, shakeId: -1 })
      if (next >= this.data.layers.length) {
        playTada()
        this.setData({ done: true, total: addCount() })
        this._nextTimer = setTimeout(() => this._newOrder(), 1500)
      }
    } else {
      playWrong()
      // 两帧动画：先移除 class 再 setTimeout(16) 加回，连点可重触发
      this.setData({ shakeId: -1 })
      this._shakeTimer = setTimeout(() => this.setData({ shakeId: id }), 16)
    }
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          resetCount()
          this.setData({ total: 0 })
        }
      }
    })
  },

  onUnload() {
    if (this._nextTimer) clearTimeout(this._nextTimer)
    if (this._shakeTimer) clearTimeout(this._shakeTimer)
  }
})
