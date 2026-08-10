const { getCount, addCount, resetCount } = require('../../model/listen')
const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

// 图案池（均不重复，保证“不同的两张”一定不同）
const POOL = [
  '🐶', '🐱', '🐰', '🐻', '🐼', '🐯', '🐸', '🐵', '🐷',
  '🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🍑', '🍒', '🥝',
  '🚗', '🚌', '🚒', '🚜', '🚲', '✈️', '🚀',
  '🌞', '🌈', '🌸', '🌟', '🌊',
  '🍕', '🍔', '🍩', '🧁', '⚽', '🎈'
]

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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

Page({
  data: {
    total: 0,
    target: '',
    options: [],
    winIdx: -1,
    shakeIdx: -1
  },

  onLoad() {
    this.setData({ total: getCount() })
    this._newRound()
  },

  _newRound() {
    this._locked = false
    const target = pick(POOL)
    const others = shuffle(POOL.filter((e) => e !== target)).slice(0, 2)
    const opts = shuffle([
      { emoji: target, isTarget: true },
      { emoji: others[0], isTarget: false },
      { emoji: others[1], isTarget: false }
    ]).map((o, i) => ({ id: i, ...o }))
    this.setData({ target, options: opts, winIdx: -1, shakeIdx: -1 })
  },

  onTapOption(e) {
    if (this._locked) return
    const idx = Number(e.currentTarget.dataset.idx)
    const opt = this.data.options[idx]
    if (!opt) return
    if (opt.isTarget) {
      this._locked = true
      playCorrect()
      const total = addCount()
      this.setData({ total, winIdx: idx })
      this._nextTimer = setTimeout(() => this._newRound(), 1000)
    } else {
      playWrong()
      if (this._shakeTimer) clearTimeout(this._shakeTimer)
      this.setData({ shakeIdx: -1 })
      this._shakeTimer = setTimeout(() => this.setData({ shakeIdx: idx }), 16)
    }
  },

  onTapNew() {
    if (this._locked) return
    this._newRound()
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
