const { playPop, playWrong, playTada } = require('../../../../utils/kids-audio')

const KEY = 'slice:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

const FRUITS = ['🍉', '🍎', '🍊', '🍋', '🍇', '🍓', '🥝', '🍑']
const BOMB = '💣'

Page({
  data: {
    items: [],
    count: 0,
    over: false
  },

  onLoad() {
    this._id = 0
    this._rm = {}
    this.setData({ count: getCount() })
    this._start()
  },

  onShow() {
    if (this.data.over) this._start()
  },

  _start() {
    this.setData({ over: false })
    this._timer = setInterval(() => this._spawn(), 950)
  },

  _spawn() {
    if (this.data.over) return
    if (this.data.items.length >= 6) return
    const isBomb = Math.random() < 0.18
    const id = ++this._id
    const item = {
      id,
      emoji: isBomb ? BOMB : FRUITS[Math.floor(Math.random() * FRUITS.length)],
      bomb: isBomb,
      left: 8 + Math.floor(Math.random() * 78),
      dur: (1.6 + Math.random() * 0.8).toFixed(2),
      sliced: false
    }
    this.setData({ items: this.data.items.concat(item) })
    this._rm[id] = setTimeout(() => this._remove(id), item.dur * 1000)
  },

  _remove(id) {
    if (this.data.over) return
    this.setData({ items: this.data.items.filter(i => i.id !== id) })
  },

  onTapItem(e) {
    if (this.data.over) return
    const id = Number(e.currentTarget.dataset.id)
    const item = this.data.items.find(i => i.id === id)
    if (!item) return
    if (item.bomb) {
      playWrong()
      this._gameOver()
      return
    }
    const count = addCount()
    this.setData({
      items: this.data.items.map(i => i.id === id ? Object.assign({}, i, { sliced: true }) : i),
      count
    })
    playPop()
    this._rm[id] = setTimeout(() => this._remove(id), 560)
  },

  _gameOver() {
    this.setData({ over: true })
    clearInterval(this._timer)
    Object.keys(this._rm).forEach(k => clearTimeout(this._rm[k]))
    this._rm = {}
    this._t = setTimeout(() => {
      this.setData({ items: [] })
      this._start()
    }, 1200)
  },

  onUnload() {
    clearInterval(this._timer)
    Object.keys(this._rm || {}).forEach(k => clearTimeout(this._rm[k]))
    if (this._t) clearTimeout(this._t)
  }
})
