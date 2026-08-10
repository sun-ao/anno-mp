const { getCount, addCount, resetCount } = require('../../model/puzzle')
const { playCorrect, playWrong, playTada, playBoop } = require('../../../../utils/kids-audio')

// 每组 9 个 emoji，拼成 3×3 的图
const PUZZLES = [
  ['🐶', '🐱', '🐰', '🐻', '🐼', '🐯', '🐸', '🐵', '🐷'],
  ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🍑', '🍒', '🥝'],
  ['🚗', '🚌', '🚒', '🚜', '🚲', '🛵', '🚂', '✈️', '🚀'],
  ['🌞', '🌈', '🌳', '🌸', '🌟', '🌊', '🍀', '🌻', '⭐'],
  ['🍕', '🍔', '🌭', '🍟', '🍩', '🍪', '🧁', '🍰', '🍦'],
  ['🐠', '🐬', '🐢', '🦀', '🐙', '🐡', '🦈', '🐳', '🦞']
]

const IDX = [0, 1, 2, 3, 4, 5, 6, 7, 8]

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
    slots: [],
    pieces: [],
    selectedPiece: null,
    shakeSlotId: -1,
    done: false,
    total: 0
  },

  onLoad() {
    this.setData({ total: getCount() })
    this._newPuzzle()
  },

  _newPuzzle() {
    const emojis = PUZZLES[Math.floor(Math.random() * PUZZLES.length)]
    const slots = emojis.map((emoji, i) => ({ id: i, expect: emoji, placed: false }))
    let order = shuffle(IDX)
    // 避免打乱后和原位置完全一致
    while (order.every((v, i) => v === i)) order = shuffle(IDX)
    const pieces = order.map((i) => ({ id: i, emoji: emojis[i], placed: false }))
    this.setData({ slots, pieces, selectedPiece: null, shakeSlotId: -1, done: false })
  },

  onTapPiece(e) {
    if (this.data.done) return
    const id = e.currentTarget.dataset.id
    const piece = this.data.pieces.find((p) => p.id === id)
    if (!piece || piece.placed) return
    playBoop()
    this.setData({ selectedPiece: id })
  },

  onTapSlot(e) {
    if (this.data.done) return
    const id = e.currentTarget.dataset.id
    const slot = this.data.slots.find((s) => s.id === id)
    if (!slot || slot.placed) return
    const sel = this.data.selectedPiece
    if (sel === null) return
    const piece = this.data.pieces.find((p) => p.id === sel)
    if (!piece || piece.placed) return

    if (piece.emoji === slot.expect) {
      playCorrect()
      const slots = this.data.slots.map((s) => (s.id === id ? { ...s, placed: true } : s))
      const pieces = this.data.pieces.map((p) => (p.id === sel ? { ...p, placed: true } : p))
      this.setData({ slots, pieces, selectedPiece: null })
      if (slots.every((s) => s.placed)) {
        this.setData({ done: true, total: addCount() })
        playTada()
        this._nextTimer = setTimeout(() => this._newPuzzle(), 1200)
      }
    } else {
      playWrong()
      if (this._shakeTimer) clearTimeout(this._shakeTimer)
      this.setData({ shakeSlotId: -1 })
      this._shakeTimer = setTimeout(() => this.setData({ shakeSlotId: id }), 16)
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
