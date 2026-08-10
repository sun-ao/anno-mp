const { getCount, addCount, resetCount } = require('../../model/nummatch')
const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

const OBJECTS = ['🍎', '⭐', '🐤', '🌸', '🚗', '🐱', '🍇', '🌈']
// 数量越少物体越大，方便点数；支持 1-9
const SIZE_CLASS = {
  1: 'obj-xl', 2: 'obj-lg', 3: 'obj-md',
  4: 'obj-sm', 5: 'obj-sm',
  6: 'obj-xs', 7: 'obj-s2', 8: 'obj-s3', 9: 'obj-s4'
}
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9]

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
    count: 3,
    obj: '🍎',
    sizeClass: 'obj-md',
    options: [1, 2, 3],
    correctIdx: -1,
    shakeIdx: -1,
    celebrate: false
  },

  onLoad() {
    this.setData({ total: getCount() })
    this._newRound()
  },

  _newRound() {
    this._locked = false
    const count = 1 + Math.floor(Math.random() * 9)
    const obj = OBJECTS[Math.floor(Math.random() * OBJECTS.length)]
    const others = shuffle(ALL.filter(n => n !== count)).slice(0, 2)
    const options = shuffle([count].concat(others))
    this.setData({
      count,
      obj,
      options,
      sizeClass: SIZE_CLASS[count],
      correctIdx: -1,
      shakeIdx: -1,
      celebrate: false
    })
  },

  onTapOption(e) {
    if (this._locked) return
    const idx = Number(e.currentTarget.dataset.idx)
    const val = this.data.options[idx]
    if (val === this.data.count) {
      this._locked = true
      playCorrect()
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      const total = addCount()
      this.setData({ total, correctIdx: idx, celebrate: true })
      this._nextTimer = setTimeout(() => this._newRound(), 1000)
    } else {
      playWrong()
      // 先移除再加回，保证连点同一项也能重新播放抖动
      this.setData({ shakeIdx: -1 })
      this._shakeTimer = setTimeout(() => this.setData({ shakeIdx: idx }), 16)
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
