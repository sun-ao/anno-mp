const { getLaunched, addLaunched, resetLaunched } = require('../../model/firework')
const { playWhoosh, playBang } = require('../../../../utils/kids-audio')

const BURST_COLORS = ['#FFD166', '#EF476F', '#06D6A0', '#4CC9F0', '#F78C6B', '#C77DFF']

let uid = 0

Page({
  data: {
    rockets: [],
    bursts: [],
    launched: 0,
    arms: [0, 45, 90, 135, 180, 225, 270, 315]
  },

  onLoad() {
    this._timers = []
    this.setData({ launched: getLaunched() })
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把放出的烟花次数清零吗？',
      confirmText: '清空',
      confirmColor: '#FFD166',
      success: (res) => {
        if (res.confirm) {
          this.setData({ launched: resetLaunched() })
        }
      }
    })
  },

  onSkyTap(e) {
    const x = e.detail.x
    const y = e.detail.y
    const id = ++uid
    const color = BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)]
    playWhoosh()
    const launched = addLaunched()
    this.setData({ launched, rockets: [...this.data.rockets, { id, x, y, color }] })
    // 升到位置后炸开
    this._timers.push(setTimeout(() => {
      this.setData({
        rockets: this.data.rockets.filter((r) => r.id !== id),
        bursts: [...this.data.bursts, { id, x, y, color }]
      })
      playBang()
      if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
    }, 430))
    // 炸开动画结束后移除
    this._timers.push(setTimeout(() => {
      this.setData({ bursts: this.data.bursts.filter((b) => b.id !== id) })
    }, 1500))
  },

  onUnload() {
    this._timers.forEach(clearTimeout)
    this._timers = []
  }
})
