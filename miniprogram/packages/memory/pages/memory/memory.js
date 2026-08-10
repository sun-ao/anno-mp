const { getCount, addCount, resetCount } = require('../../model/memory')
const { playCorrect, playWrong, playTada } = require('../../../../utils/kids-audio')

const ANIMALS = ['🐱', '🐶', '🐰', '🐸', '🐘', '🦊']
const TOTAL_PAIRS = ANIMALS.length

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

function buildCards() {
  return shuffle(ANIMALS.concat(ANIMALS)).map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
    shake: false
  }))
}

Page({
  data: {
    cards: [],
    pairsFound: 0,
    totalPairs: TOTAL_PAIRS,
    total: 0
  },

  onLoad() {
    this._firstPick = null
    this._lock = false
    this._shakeTimer = null
    this._backTimer = null
    this._roundTimer = null
    this.setData({ cards: buildCards(), total: getCount() })
  },

  onTapCard(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const card = this.data.cards[idx]
    if (!card || this._lock || card.flipped || card.matched) return

    this.setData({ [`cards[${idx}].flipped`]: true })

    if (this._firstPick === null) {
      this._firstPick = idx
      return
    }

    const firstIdx = this._firstPick
    this._firstPick = null

    if (this.data.cards[firstIdx].emoji === card.emoji) {
      playCorrect()
      const total = addCount()
      const pairsFound = this.data.pairsFound + 1
      this.setData({
        [`cards[${firstIdx}].matched`]: true,
        [`cards[${idx}].matched`]: true,
        pairsFound,
        total
      })
      if (pairsFound >= TOTAL_PAIRS) {
        playTada()
        this._roundTimer = setTimeout(() => this._newRound(), 1200)
      }
    } else {
      this._lock = true
      playWrong()
      // 两帧动画：先移除抖动 class，下一帧再加回，保证重复触发也能播放
      this.setData({
        [`cards[${firstIdx}].shake`]: false,
        [`cards[${idx}].shake`]: false
      })
      this._shakeTimer = setTimeout(() => {
        this.setData({
          [`cards[${firstIdx}].shake`]: true,
          [`cards[${idx}].shake`]: true
        })
      }, 16)
      this._backTimer = setTimeout(() => {
        this.setData({
          [`cards[${firstIdx}].flipped`]: false,
          [`cards[${firstIdx}].shake`]: false,
          [`cards[${idx}].flipped`]: false,
          [`cards[${idx}].shake`]: false
        })
        this._lock = false
      }, 700)
    }
  },

  _newRound() {
    this._firstPick = null
    this._lock = false
    this.setData({ cards: buildCards(), pairsFound: 0 })
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
    clearTimeout(this._shakeTimer)
    clearTimeout(this._backTimer)
    clearTimeout(this._roundTimer)
    this._shakeTimer = null
    this._backTimer = null
    this._roundTimer = null
  }
})
