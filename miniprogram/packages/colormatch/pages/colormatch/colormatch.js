const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

const KEY = 'colormatch:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

const COLORS = [
  { name: '红色', val: '#E53935' },
  { name: '黄色', val: '#FDD835' },
  { name: '蓝色', val: '#1E88E5' },
  { name: '绿色', val: '#43A047' },
  { name: '橙色', val: '#FB8C00' },
  { name: '紫色', val: '#8E24AA' }
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

Page({
  data: {
    target: COLORS[0],
    options: [],
    count: 0,
    shakeIndex: -1,
    busy: false
  },

  onLoad() {
    this.setData({ count: getCount() })
    this._newRound()
  },

  _newRound() {
    const pool = COLORS.slice()
    const ti = Math.floor(Math.random() * pool.length)
    const target = pool[ti]
    const others = shuffle(pool.filter(c => c.val !== target.val)).slice(0, 2)
    const options = shuffle([target].concat(others))
    this.setData({ target, options, shakeIndex: -1, busy: false })
  },

  onTapOpt(e) {
    if (this.data.busy) return
    const idx = Number(e.currentTarget.dataset.idx)
    const opt = this.data.options[idx]
    if (opt.val === this.data.target.val) {
      playCorrect()
      const count = addCount()
      this.setData({ count, busy: true })
      this._t = setTimeout(() => this._newRound(), 600)
    } else {
      playWrong()
      this.setData({ shakeIndex: -1 })
      this._s = setTimeout(() => this.setData({ shakeIndex: idx }), 16)
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
