const { playCorrect, playWrong, playTada } = require('../../../../utils/kids-audio')

const KEY = 'link:total'
function getCount() { return wx.getStorageSync(KEY) || 0 }
function addCount() { const v = getCount() + 1; wx.setStorageSync(KEY, v); return v }

const EMOJI = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍋', '🍉', '🥝']

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

function buildTiles() {
  const picks = EMOJI.slice(0, 8)
  let arr = []
  picks.forEach(e => { arr.push(e); arr.push(e) })
  return shuffle(arr).map((emoji, i) => ({ id: i, emoji, cleared: false, sel: false, shake: false }))
}

Page({
  data: {
    tiles: [],
    remaining: 16,
    count: 0
  },

  onLoad() {
    this._first = null
    this._lock = false
    this._t = null
    this._s = null
    this._b = null
    this.setData({ count: getCount() })
    this._newRound()
  },

  _newRound() {
    this._first = null
    this._lock = false
    this.setData({ tiles: buildTiles(), remaining: 16 })
  },

  onTapTile(e) {
    if (this._lock) return
    const idx = Number(e.currentTarget.dataset.idx)
    const tile = this.data.tiles[idx]
    if (!tile || tile.cleared || tile.sel) return

    this.setData({ ['tiles[' + idx + '].sel']: true })

    if (this._first === null) {
      this._first = idx
      return
    }

    const firstIdx = this._first
    this._first = null

    if (this.data.tiles[firstIdx].emoji === tile.emoji) {
      playCorrect()
      const remaining = this.data.remaining - 2
      const count = remaining === 0 ? addCount() : this.data.count
      this.setData({
        ['tiles[' + firstIdx + '].cleared']: true,
        ['tiles[' + idx + '].cleared']: true,
        ['tiles[' + firstIdx + '].sel']: false,
        ['tiles[' + idx + '].sel']: false,
        remaining,
        count
      })
      if (remaining === 0) {
        playTada()
        this._t = setTimeout(() => this._newRound(), 1200)
      }
    } else {
      this._lock = true
      playWrong()
      this.setData({
        ['tiles[' + firstIdx + '].shake']: false,
        ['tiles[' + idx + '].shake']: false
      })
      this._s = setTimeout(() => {
        this.setData({
          ['tiles[' + firstIdx + '].shake']: true,
          ['tiles[' + idx + '].shake']: true
        })
      }, 16)
      this._b = setTimeout(() => {
        this.setData({
          ['tiles[' + firstIdx + '].sel']: false,
          ['tiles[' + firstIdx + '].shake']: false,
          ['tiles[' + idx + '].sel']: false,
          ['tiles[' + idx + '].shake']: false
        })
        this._lock = false
      }, 600)
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
    if (this._b) clearTimeout(this._b)
  }
})
