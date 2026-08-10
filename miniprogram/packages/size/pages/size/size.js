const { getCount, addCount, resetCount } = require('../../model/size')
const { playCorrect, playWrong, playTada, playBoop } = require('../../../../utils/kids-audio')

const OBJECTS = ['🐘', '🚗', '🍎', '⭐', '🐟']
const LEVELS = [
  { size: 1, fs: '70rpx' },
  { size: 2, fs: '110rpx' },
  { size: 3, fs: '160rpx' }
]

// 放置顺序：随机在「从小到大」和「从大到小」之间切换
const ORDERS = [
  [1, 2, 3],
  [3, 2, 1]
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
    items: [],
    stands: [],
    nextSize: 1,
    shakeId: -1,
    done: false,
    total: 0
  },

  onLoad() {
    this.setData({ total: getCount() })
    this._newRound()
  },

  _newRound() {
    const obj = pick(OBJECTS)

    // 上方待放置的物体：顺序随机
    const items = shuffle(
      LEVELS.map((lv, i) => ({
        id: i,
        emoji: obj,
        size: lv.size,
        fs: lv.fs,
        placed: false
      }))
    )

    // 下方底座：左右排布顺序随机（不再固定小→大）
    const stands = shuffle(
      LEVELS.map((lv) => ({ size: lv.size, emoji: '', fs: lv.fs, filled: false }))
    )

    // 放置顺序：随机从小到大 / 从大到小（顺序由下方台子的高亮提示，不再用文字说明）
    const order = pick(ORDERS)
    this._order = order

    this.setData({
      items,
      stands,
      nextSize: this._order[0],
      shakeId: -1,
      done: false
    })
  },

  onTapItem(e) {
    if (this.data.done) return
    const id = e.currentTarget.dataset.id
    const item = this.data.items.find((it) => it.id === id)
    if (!item) return
    if (item.placed) {
      playBoop()
      return
    }

    if (item.size === this.data.nextSize) {
      playCorrect()
      const items = this.data.items.map((it) => (it.id === id ? { ...it, placed: true } : it))
      const stands = this.data.stands.map((st) =>
        st.size === item.size ? { ...st, emoji: item.emoji, filled: true } : st
      )
      const placedCount = items.filter((it) => it.placed).length
      const finished = placedCount >= this._order.length
      this.setData({
        items,
        stands,
        nextSize: finished ? 0 : this._order[placedCount],
        shakeId: -1
      })
      if (finished) {
        this.setData({ done: true, total: addCount() })
        playTada()
        this._nextTimer = setTimeout(() => this._newRound(), 1200)
      }
    } else {
      playWrong()
      if (this._shakeTimer) clearTimeout(this._shakeTimer)
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
