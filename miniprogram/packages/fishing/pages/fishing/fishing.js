const { playPop } = require('../../../../utils/kids-audio')

const KEY = 'fishing:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

const FISH = ['🐠', '🐟', '🐡', '🦑', '🐙', '🦀', '🐚', '🐳']
const LANES = [60, 195, 330, 465, 600] // 池塘 720rpx 高的 5 条泳道
const TARGET = 5 // 池塘里常驻鱼数

function shuffle(a) {
  const x = a.slice()
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = x[i]; x[i] = x[j]; x[j] = t
  }
  return x
}

Page({
  data: {
    fish: [],
    count: 0
  },

  onLoad() {
    this._id = 0
    this._timers = []
    this.setData({ count: getCount() })
    this._fill()
  },

  _makeFish(lane) {
    const dir = Math.random() < 0.5 ? 1 : -1
    return {
      id: ++this._id,
      emoji: FISH[Math.floor(Math.random() * FISH.length)],
      top: lane,
      size: 64 + Math.floor(Math.random() * 40),
      anim: dir === 1 ? 'swim-ltr' : 'swim-rtl',
      dur: (4 + Math.random() * 3).toFixed(2),
      delay: (Math.random() * 2.5).toFixed(2),
      caught: false
    }
  },

  _fill() {
    const active = this.data.fish.filter(f => !f.caught)
    if (active.length >= TARGET) return
    const need = TARGET - active.length
    const lanes = shuffle(LANES).slice(0, need)
    const list = this.data.fish.slice()
    for (let i = 0; i < need; i++) list.push(this._makeFish(lanes[i]))
    this.setData({ fish: list })
  },

  onTapFish(e) {
    const id = Number(e.currentTarget.dataset.id)
    const f = this.data.fish.find(x => x.id === id)
    if (!f || f.caught) return
    const count = addCount()
    this.setData({
      count,
      fish: this.data.fish.map(x => x.id === id ? Object.assign({}, x, { caught: true }) : x)
    })
    playPop()
    const t = setTimeout(() => {
      this.setData({ fish: this.data.fish.filter(x => x.id !== id) })
      this._fill()
    }, 520)
    this._timers.push(t)
  },

  onUnload() {
    this._timers.forEach(clearTimeout)
  }
})
