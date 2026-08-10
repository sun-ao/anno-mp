const { getCount, addCount } = require('../../model/dino')
const { playRoar } = require('../../../../utils/kids-audio')

// 真恐龙 emoji 系统只有 🦖🦕 两种，故用史前/龙相关 emoji 让每个品种外观都不同，避免同图重复
const DINOS = [
  { emoji: '🦖', name: '霸王龙', tint: '#FFE0E0' },
  { emoji: '🦕', name: '长颈龙', tint: '#E0FBE6' },
  { emoji: '🐉', name: '飞龙', tint: '#FFE6F2' },
  { emoji: '🐲', name: '火龙', tint: '#FFE9D6' },
  { emoji: '🐊', name: '鳄龙', tint: '#E0F0FF' },
  { emoji: '🦎', name: '小恐龙', tint: '#E6E9FF' },
  { emoji: '🐢', name: '甲龙', tint: '#F0FBE0' },
  { emoji: '🦅', name: '风神翼龙', tint: '#F3E0FF' },
  { emoji: '🐍', name: '蛇颈龙', tint: '#E8F4FF' }
]

Page({
  data: {
    dinos: DINOS,
    count: 0,
    roaringIndex: -1,
    showBurst: false,
    shake: false
  },

  onLoad() {
    this.setData({ count: getCount() })
  },

  onTapDino(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    playRoar()
    if (wx.vibrateShort) wx.vibrateShort({ type: 'heavy' })
    const count = addCount()
    // 先复位再触发，保证连击同一只也重新播放动画
    this.setData({ roaringIndex: -1, showBurst: false, shake: false, count })
    if (this._roarTimer) clearTimeout(this._roarTimer)
    this._roarTimer = setTimeout(() => {
      this.setData({ roaringIndex: idx, showBurst: true, shake: true })
    }, 16)
    if (this._shakeTimer) clearTimeout(this._shakeTimer)
    this._shakeTimer = setTimeout(() => this.setData({ shake: false }), 600)
  },

  onUnload() {
    if (this._roarTimer) clearTimeout(this._roarTimer)
    if (this._shakeTimer) clearTimeout(this._shakeTimer)
    this._roarTimer = null
    this._shakeTimer = null
  }
})
