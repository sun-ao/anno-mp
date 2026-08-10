const { getCount, addCount, resetCount } = require('../../model/sort')
const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

const COLORS = ['#E53935', '#1E88E5', '#43A047', '#FDD835']

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function newRound() {
  return {
    ballColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    baskets: shuffle(COLORS.slice())
  }
}

Page({
  data: {
    ballColor: COLORS[0],
    baskets: COLORS.slice(),
    count: 0,
    dropping: false,
    dropLeft: 50,
    ballNoanim: false,
    shakingIndex: -1,
    busy: false
  },

  onLoad() {
    this.setData({ ...newRound(), count: getCount() })
  },

  onTapBasket(e) {
    if (this.data.busy) return
    const idx = Number(e.currentTarget.dataset.idx)
    const color = this.data.baskets[idx]
    if (color === this.data.ballColor) {
      playCorrect()
      const count = addCount()
      // 篮子等宽居中排列，第 idx 个篮子中心在 12.5% + 25% * idx 处
      this.setData({ busy: true, count, dropping: true, dropLeft: 12.5 + idx * 25 })
      this._nextTimer = setTimeout(() => {
        this.nextRound()
      }, 600)
    } else {
      playWrong()
      // 两帧规则：先移除抖动 class，再加回，保证连点也能重新触发
      this.setData({ shakingIndex: -1 })
      this._shakeTimer = setTimeout(() => {
        this.setData({ shakingIndex: idx })
      }, 16)
    }
  },

  nextRound() {
    // 先关掉过渡并复位到中间，避免小球从篮子处"滑回"中央
    this.setData({ ...newRound(), dropping: false, shakingIndex: -1, ballNoanim: true })
    this._resetTimer = setTimeout(() => {
      this.setData({ ballNoanim: false, busy: false })
    }, 16)
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
    if (this._nextTimer) clearTimeout(this._nextTimer)
    if (this._shakeTimer) clearTimeout(this._shakeTimer)
    if (this._resetTimer) clearTimeout(this._resetTimer)
  }
})
