const { playCorrect, playWrong, playTada } = require('../../../../utils/kids-audio')

const KEY = 'trash:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

const BINS = [
  { id: 0, emoji: '♻️', name: '可回收', color: '#1E88E5' },
  { id: 1, emoji: '🍂', name: '厨余', color: '#43A047' },
  { id: 2, emoji: '☣️', name: '有害', color: '#E53935' },
  { id: 3, emoji: '🗑️', name: '其他', color: '#78909C' }
]

const ITEMS = [
  { emoji: '📰', name: '旧报纸', cat: 0 },
  { emoji: '📦', name: '纸箱', cat: 0 },
  { emoji: '🍶', name: '玻璃瓶', cat: 0 },
  { emoji: '🥫', name: '易拉罐', cat: 0 },
  { emoji: '📚', name: '旧书', cat: 0 },
  { emoji: '🍎', name: '果核', cat: 1 },
  { emoji: '🍌', name: '香蕉皮', cat: 1 },
  { emoji: '🥚', name: '蛋壳', cat: 1 },
  { emoji: '🍞', name: '剩面包', cat: 1 },
  { emoji: '🐟', name: '鱼骨头', cat: 1 },
  { emoji: '🔋', name: '废电池', cat: 2 },
  { emoji: '💡', name: '灯泡', cat: 2 },
  { emoji: '💊', name: '过期药', cat: 2 },
  { emoji: '🌡️', name: '温度计', cat: 2 },
  { emoji: '🎨', name: '油漆桶', cat: 2 },
  { emoji: '🚬', name: '烟头', cat: 3 },
  { emoji: '🧻', name: '用过的纸', cat: 3 },
  { emoji: '🪥', name: '旧牙刷', cat: 3 },
  { emoji: '🩹', name: '创可贴', cat: 3 },
  { emoji: '🪣', name: '破塑料桶', cat: 3 }
]

Page({
  data: {
    bins: BINS,
    item: null,
    shakeId: -1,
    count: 0,
    solved: false
  },

  onLoad() {
    this._last = -1
    this._t = this._s = null
    this.setData({ count: getCount() })
    this._next()
  },

  _next() {
    let idx
    do { idx = Math.floor(Math.random() * ITEMS.length) } while (idx === this._last && ITEMS.length > 1)
    this._last = idx
    this.setData({ item: ITEMS[idx], shakeId: -1, solved: false })
  },

  onTapBin(e) {
    if (!this.data.item || this.data.solved) return
    const cat = Number(e.currentTarget.dataset.cat)
    if (cat === this.data.item.cat) {
      this.setData({ solved: true })
      playCorrect()
      const count = addCount()
      this.setData({ count })
      this._t = setTimeout(() => this._next(), 650)
    } else {
      playWrong()
      this.setData({ shakeId: cat })
      if (this._s) clearTimeout(this._s)
      this._s = setTimeout(() => this.setData({ shakeId: -1 }), 450)
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
