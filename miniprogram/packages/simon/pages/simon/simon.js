const { playNote, playCorrect, playWrong, playTada } = require('../../../../utils/kids-audio')

// 16 种高辨识度颜色 + 16 个音阶频率（C4→D6），难度越高取越多
const COLORS = [
  '#E53935', '#43A047', '#FDD835', '#1E88E5',
  '#FB8C00', '#8E24AA', '#00ACC1', '#EC407A',
  '#6D4C41', '#00897B', '#3949AB', '#9E9D24',
  '#C62828', '#D81B60', '#1DE9B6', '#FFB300'
]
const FREQS = [
  261.63, 293.66, 329.63, 349.23,
  392.00, 440.00, 493.88, 523.25,
  587.33, 659.25, 698.46, 783.99,
  880.00, 987.77, 1046.50, 1174.66
]
const PADS = COLORS.map((c, i) => ({ id: i, color: c, freq: FREQS[i] }))

const DIFFS = [
  { key: 'low', name: '低', cols: 2 },
  { key: 'mid', name: '中', cols: 3 },
  { key: 'high', name: '高', cols: 4 }
]

const LIT_MS = 650   // 每个灯亮起时长
const GAP_MS = 450   // 灯与灯之间的间隔

function padsFor(cols) { return PADS.slice(0, cols * cols) }
function countKey(d) { return 'simon:total_' + d }
function getCount(d) { return wx.getStorageSync(countKey(d)) || 0 }
function addCount(d) { const v = getCount(d) + 1; wx.setStorageSync(countKey(d), v); return v }

Page({
  data: {
    diffs: DIFFS,
    difficulty: 'low',
    cols: 2,
    pads: padsFor(2),
    seq: [],
    input: [],
    lit: -1,
    litIndex: -1,    // 当前亮的是第几个（1 起），用于显示序号
    state: 'show',
    round: 0,
    over: false,
    count: 0
  },

  onLoad() {
    this._a = this._b = this._l = this._t = null
    this._init('low')
  },

  _init(diff) {
    const d = DIFFS.find(x => x.key === diff) || DIFFS[0]
    this.setData({
      difficulty: d.key,
      cols: d.cols,
      pads: padsFor(d.cols),
      count: getCount(d.key),
      seq: [], input: [], round: 0, over: false, lit: -1, litIndex: -1, state: 'show'
    })
    this._next()
  },

  _next() {
    const pads = this.data.pads
    // 有几个方块就亮几个：把当前难度的所有方块随机排成一个序列，每个亮一遍
    const ids = pads.map(p => p.id)
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = ids[i]; ids[i] = ids[j]; ids[j] = tmp
    }
    const seq = ids
    this.setData({ seq, input: [], round: seq.length, state: 'show', lit: -1, litIndex: -1, over: false })
    this._showSeq(0, seq)
  },

  // seq 由参数传入，递归过程不读 this.data
  _showSeq(i, seq) {
    if (i >= seq.length) {
      this.setData({ state: 'input', lit: -1, litIndex: -1 })
      return
    }
    const padId = seq[i]
    this.setData({ lit: padId, litIndex: i + 1 })
    this._beep(padId)
    this._a = setTimeout(() => {
      this.setData({ lit: -1, litIndex: -1 })
      this._b = setTimeout(() => this._showSeq(i + 1, seq), GAP_MS)
    }, LIT_MS)
  },

  _beep(id) {
    const p = this.data.pads.find(x => x.id === id)
    if (p) playNote(p.freq)
  },

  // 重看一遍演示（仅可在输入阶段使用）
  onReplay() {
    if (this.data.state !== 'input') return
    this._clearTimers()
    this.setData({ lit: -1, litIndex: -1, state: 'show' })
    this._showSeq(0, this.data.seq)
  },

  onTapPad(e) {
    if (this.data.state !== 'input') return
    const id = Number(e.currentTarget.dataset.id)
    this._beep(id)
    this.setData({ lit: id, litIndex: -1 })
    if (this._l) clearTimeout(this._l)
    this._l = setTimeout(() => this.setData({ lit: -1 }), 200)

    const input = this.data.input.concat(id)
    const idx = input.length - 1
    if (input[idx] !== this.data.seq[idx]) {
      playWrong()
      this.setData({ state: 'over', over: true })
      this._t = setTimeout(() => {
        this.setData({ seq: [], round: 0 })
        this._next()
      }, 1100)
      return
    }
    this.setData({ input })
    if (input.length === this.data.seq.length) {
      playCorrect()
      const count = addCount(this.data.difficulty)
      this.setData({ count })
      this._t = setTimeout(() => this._next(), 700)
    }
  },

  onSwitchDiff(e) {
    const diff = e.currentTarget.dataset.diff
    if (diff === this.data.difficulty) return
    this._clearTimers()
    this._init(diff)
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          DIFFS.forEach(d => wx.setStorageSync(countKey(d.key), 0))
          this.setData({ count: 0 })
        }
      }
    })
  },

  onAgain() {
    if (this._t) clearTimeout(this._t)
    this.setData({ seq: [], round: 0, input: [], over: false })
    this._next()
  },

  _clearTimers() {
    if (this._a) clearTimeout(this._a)
    if (this._b) clearTimeout(this._b)
    if (this._l) clearTimeout(this._l)
    if (this._t) clearTimeout(this._t)
  },

  onUnload() { this._clearTimers() },
  onHide() { this._clearTimers() }
})
