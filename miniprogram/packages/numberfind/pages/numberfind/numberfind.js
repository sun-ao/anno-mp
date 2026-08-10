const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

const KEY = 'numberfind:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

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
    grid: [],
    target: 1,
    count: 0,
    shakeIdx: -1,
    busy: false
  },

  onLoad() {
    this.setData({ count: getCount() })
    this._newRound()
  },

  _newRound() {
    const pool = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).slice(0, 9)
    const target = pool[Math.floor(Math.random() * pool.length)]
    this.setData({ grid: shuffle(pool), target, shakeIdx: -1, busy: false })
  },

  onTapCell(e) {
    if (this.data.busy) return
    const idx = Number(e.currentTarget.dataset.idx)
    if (this.data.grid[idx] === this.data.target) {
      playCorrect()
      const count = addCount()
      this.setData({ count, busy: true })
      this._t = setTimeout(() => this._newRound(), 600)
    } else {
      playWrong()
      this.setData({ shakeIdx: -1 })
      this._s = setTimeout(() => this.setData({ shakeIdx: idx }), 16)
    }
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          wx.setStorageSync(KEY, 0)
          this.setData({ count: 0 })
        }
      }
    })
  },

  onUnload() {
    if (this._t) clearTimeout(this._t)
    if (this._s) clearTimeout(this._s)
  }
})
