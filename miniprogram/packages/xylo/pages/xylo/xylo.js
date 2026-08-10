const { playNote } = require('../../../../utils/kids-audio')

const NOTES = [
  { key: 'C', freq: 261.63, color: '#E53935', label: '多' },
  { key: 'D', freq: 293.66, color: '#FB8C00', label: '来' },
  { key: 'E', freq: 329.63, color: '#FDD835', label: '米' },
  { key: 'F', freq: 349.23, color: '#43A047', label: '发' },
  { key: 'G', freq: 392.0, color: '#00ACC1', label: '索' },
  { key: 'A', freq: 440.0, color: '#1E88E5', label: '拉' },
  { key: 'B', freq: 493.88, color: '#5E35B1', label: '西' },
  { key: 'C2', freq: 523.25, color: '#8E24AA', label: '多' }
]

// 《小星星》简谱（音阶下标）
const SONG = [0, 0, 4, 4, 5, 5, 4, 3, 3, 2, 2, 1, 1, 0]

Page({
  data: {
    notes: NOTES,
    activeIndex: -1,
    playing: false
  },

  onLoad() {
    this._songTimers = []
  },

  onTapBar(e) {
    if (this.data.playing) return
    this._hit(Number(e.currentTarget.dataset.idx))
  },

  _hit(idx) {
    playNote(NOTES[idx].freq)
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    // 先清除再置位，保证连击同一根也重新触发动画
    this.setData({ activeIndex: -1 })
    if (this._activeTimer) clearTimeout(this._activeTimer)
    this._activeTimer = setTimeout(() => this.setData({ activeIndex: idx }), 16)
  },

  onPlaySong() {
    if (this.data.playing) return
    this.setData({ playing: true })
    const beat = 400
    SONG.forEach((n, i) => {
      this._songTimers.push(setTimeout(() => this._hit(n), i * beat))
    })
    this._songTimers.push(setTimeout(() => this.setData({ playing: false }), SONG.length * beat + 200))
  },

  onUnload() {
    this._songTimers.forEach(clearTimeout)
    this._songTimers = []
    if (this._activeTimer) clearTimeout(this._activeTimer)
    this._activeTimer = null
  }
})
