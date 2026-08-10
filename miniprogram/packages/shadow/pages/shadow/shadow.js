const { getCount, addCount, resetCount } = require('../../model/shadow')
const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

const OBJECTS = ['🐱', '🐶', '🐰', '🐸', '🚗', '🍎', '⭐', '🐘', '🦋', '🐟']

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

function makeRound() {
  const targetIdx = Math.floor(Math.random() * OBJECTS.length)
  const target = OBJECTS[targetIdx]
  const others = OBJECTS.filter((_, i) => i !== targetIdx)
  const distractors = shuffle(others).slice(0, 2)
  return { target, options: shuffle([target].concat(distractors)) }
}

Page({
  data: {
    count: 0,
    target: '',
    options: [],
    foundIndex: -1,
    shakeIndex: -1
  },

  onLoad() {
    this._busy = false
    this._timers = []
    this.setData(Object.assign({ count: getCount() }, makeRound()))
  },

  _after(ms, fn) {
    const t = setTimeout(fn, ms)
    this._timers.push(t)
    return t
  },

  onTapOption(e) {
    if (this._busy) return
    const idx = Number(e.currentTarget.dataset.idx)
    const picked = this.data.options[idx]
    if (picked === this.data.target) {
      this._busy = true
      playCorrect()
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      const count = addCount()
      // 揭晓影子真身（彩色），稍后进入下一轮
      this.setData({ count, foundIndex: idx, shakeIndex: -1 })
      this._after(900, () => {
        this._busy = false
        this.setData(Object.assign({ foundIndex: -1, shakeIndex: -1 }, makeRound()))
      })
    } else {
      playWrong()
      // 两帧动画：先移除 class 再 setTimeout(16) 加回
      this.setData({ shakeIndex: -1 })
      this._after(16, () => this.setData({ shakeIndex: idx }))
      this._after(600, () => {
        if (this.data.shakeIndex === idx) this.setData({ shakeIndex: -1 })
      })
    }
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          resetCount()
          this.setData({ count: 0 })
        }
      }
    })
  },

  onUnload() {
    this._timers.forEach((t) => clearTimeout(t))
    this._timers = []
  }
})
