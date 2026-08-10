const { getCount, addCount, resetCount } = require('../../model/pattern')
const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

const PAIRS = [
  ['🍎', '🍌'],
  ['🐱', '🐶'],
  ['🔴', '🔵'],
  ['⭐', '🌙'],
  ['🐸', '🐢'],
  ['🌸', '🌻']
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

// AB 型规律：序列 = [a, b, a, b, a]，随机空出其中一个位置（可能是最后一个，也可能是中间某个）
function makeRound() {
  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)]
  const a = pair[0]
  const b = pair[1]
  const sequence = [a, b, a, b, a]
  const blankIndex = Math.floor(Math.random() * sequence.length)
  return {
    sequence,
    blankIndex,
    answer: sequence[blankIndex],
    options: shuffle([a, b]),
    solved: false
  }
}

Page({
  data: {
    count: 0,
    sequence: [],
    blankIndex: -1,
    answer: '',
    options: [],
    solved: false,
    shakeIndex: -1
  },

  onLoad() {
    this._busy = false
    this._timers = []
    this.setData(Object.assign({ count: getCount() }, makeRound()))
  },

  _after(ms, fn) {
    const t = setTimeout(fn, ms)
    this._timers.push(t)
    return t
  },

  onTapOption(e) {
    if (this._busy) return
    const idx = Number(e.currentTarget.dataset.idx)
    const picked = this.data.options[idx]
    if (picked === this.data.answer) {
      this._busy = true
      playCorrect()
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      const count = addCount()
      // 把答案填进 "?" 位置展示一下，再进入下一轮
      this.setData({ count, solved: true, shakeIndex: -1 })
      this._after(1000, () => {
        this._busy = false
        this.setData(Object.assign({ shakeIndex: -1 }, makeRound()))
      })
    } else {
      playWrong()
      // 两帧动画：先移除 class 再 setTimeout(16) 加回
      this.setData({ shakeIndex: -1 })
      this._after(16, () => this.setData({ shakeIndex: idx }))
      this._after(600, () => {
        if (this.data.shakeIndex === idx) this.setData({ shakeIndex: -1 })
      })
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
    this._timers.forEach((t) => clearTimeout(t))
    this._timers = []
  }
})
