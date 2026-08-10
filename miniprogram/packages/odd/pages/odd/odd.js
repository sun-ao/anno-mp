const { getCount, addCount, resetCount } = require('../../model/odd')
const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

// [多数 emoji, 少数 emoji]
const PAIRS = [
  ['🐱', '🐶'],
  ['🍎', '🍐'],
  ['🚗', '🚌'],
  ['⭐', '🌙'],
  ['🐸', '🐢'],
  ['🌸', '🌻'],
  ['🐟', '🐙'],
  ['🍓', '🍉']
]

function buildRound() {
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)]
  const oddIndex = Math.floor(Math.random() * 9)
  return Array.from({ length: 9 }, (_, i) => ({
    id: i,
    emoji: i === oddIndex ? pair[1] : pair[0],
    isOdd: i === oddIndex
  }))
}

Page({
  data: {
    items: [],
    count: 0,
    foundId: -1,
    shakeId: -1
  },

  onLoad() {
    this._lock = false
    this._nextTimer = null
    this._shakeAddTimer = null
    this._shakeClearTimer = null
    this.setData({ items: buildRound(), count: getCount() })
  },

  onTapItem(e) {
    const id = Number(e.currentTarget.dataset.id)
    const item = this.data.items[id]
    if (!item || this._lock) return

    if (item.isOdd) {
      this._lock = true
      clearTimeout(this._shakeAddTimer)
      clearTimeout(this._shakeClearTimer)
      playCorrect()
      const count = addCount()
      this.setData({ foundId: id, shakeId: -1, count })
      this._nextTimer = setTimeout(() => {
        this.setData({ items: buildRound(), foundId: -1 })
        this._lock = false
      }, 900)
    } else {
      playWrong()
      clearTimeout(this._shakeAddTimer)
      clearTimeout(this._shakeClearTimer)
      // 两帧动画：先移除抖动 class，下一帧再加回，保证重复触发也能播放
      this.setData({ shakeId: -1 })
      this._shakeAddTimer = setTimeout(() => this.setData({ shakeId: id }), 16)
      this._shakeClearTimer = setTimeout(() => this.setData({ shakeId: -1 }), 520)
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
    clearTimeout(this._nextTimer)
    clearTimeout(this._shakeAddTimer)
    clearTimeout(this._shakeClearTimer)
    this._nextTimer = null
    this._shakeAddTimer = null
    this._shakeClearTimer = null
  }
})
