const { getCount, addCount, resetCount } = require('../../model/shape')
const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

const SHAPES = ['🔴', '🟦', '🔺', '⭐']

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
  const target = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const others = shuffle(SHAPES.filter((s) => s !== target)).slice(0, 2)
  const options = shuffle([target].concat(others))
  return { target, options }
}

Page({
  data: {
    target: SHAPES[0],
    options: SHAPES.slice(0, 3),
    count: 0,
    popIndex: -1,
    shakingIndex: -1,
    busy: false
  },

  onLoad() {
    this.setData({ ...newRound(), count: getCount() })
  },

  onTapOption(e) {
    if (this.data.busy) return
    const idx = Number(e.currentTarget.dataset.idx)
    const emoji = this.data.options[idx]
    if (emoji === this.data.target) {
      playCorrect()
      const count = addCount()
      this.setData({ busy: true, count, popIndex: -1 })
      // 两帧规则：先移除再置位，保证连点也重新播放弹跳动画
      this._popTimer = setTimeout(() => {
        this.setData({ popIndex: idx })
      }, 16)
      this._nextTimer = setTimeout(() => {
        this.setData({ ...newRound(), busy: false, popIndex: -1, shakingIndex: -1 })
      }, 500)
    } else {
      playWrong()
      // 两帧规则：先移除抖动 class，再加回，保证连点也能重新触发
      this.setData({ shakingIndex: -1 })
      this._shakeTimer = setTimeout(() => {
        this.setData({ shakingIndex: idx })
      }, 16)
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
    if (this._popTimer) clearTimeout(this._popTimer)
    if (this._nextTimer) clearTimeout(this._nextTimer)
    if (this._shakeTimer) clearTimeout(this._shakeTimer)
  }
})
