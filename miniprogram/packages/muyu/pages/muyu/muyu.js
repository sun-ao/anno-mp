const { getMerit, addMerit, resetMerit } = require('../../model/muyu')
const { playKnock } = require('../../utils/woodfish-audio')

Page({
  data: {
    merit: 0,
    knocking: false,
    floatText: '',
    showFloat: false
  },

  onLoad() {
    this.setData({ merit: getMerit() })
  },

  onKnock() {
    playKnock()
    const merit = addMerit(1)
    // 先移除动画 class，下一帧再加，保证每次敲击都重新触发动画
    this.setData({ knocking: false })
    if (this._knockTimer) clearTimeout(this._knockTimer)
    this._knockTimer = setTimeout(() => {
      this.setData({ merit, knocking: true })
    }, 16)
    // 功德 +1 飘字
    this.setData({ showFloat: false })
    if (this._floatTimer) clearTimeout(this._floatTimer)
    this._floatTimer = setTimeout(() => {
      this.setData({ floatText: '功德 +1', showFloat: true })
    }, 16)
  },

  onReset() {
    wx.showModal({
      title: '清零功德',
      content: `当前累计 ${this.data.merit} 功德，确定清零吗？`,
      confirmText: '清零',
      confirmColor: '#B5713F',
      success: (res) => {
        if (res.confirm) {
          this.setData({ merit: resetMerit() })
          wx.showToast({ title: '已清零', icon: 'none' })
        }
      }
    })
  },

  onUnload() {
    if (this._knockTimer) clearTimeout(this._knockTimer)
    if (this._floatTimer) clearTimeout(this._floatTimer)
    this._knockTimer = null
    this._floatTimer = null
  }
})
