const { getWishes, addWish, deleteWish, clearWishes, drawFortune, formatDate } = require('../../model/wish')

Page({
  data: {
    wishText: '',
    throwing: false,
    showCoin: false,
    showRipple: false,
    showFortune: false,
    fortune: null,
    showList: false,
    wishes: []
  },

  onWishInput(e) {
    this.setData({ wishText: e.detail.value })
  },

  onThrow() {
    if (this.data.throwing) return
    const text = this.data.wishText.trim()
    if (!text) {
      wx.showToast({ title: '先写下你的愿望吧', icon: 'none' })
      return
    }
    this.setData({
      throwing: true,
      showCoin: false,
      showRipple: false,
      showFortune: false,
      fortune: null
    })
    // 金币下落
    this._coinTimer = setTimeout(() => {
      this.setData({ showCoin: true })
    }, 30)
    // 涟漪扩散
    this._rippleTimer = setTimeout(() => {
      this.setData({ showRipple: true })
    }, 900)
    // 浮签 + 写入许愿记录
    this._fortuneTimer = setTimeout(() => {
      const fortune = drawFortune()
      addWish(text, fortune)
      this.setData({
        throwing: false,
        showFortune: true,
        fortune,
        wishText: ''
      })
    }, 1800)
  },

  onAgain() {
    this.setData({ showFortune: false, fortune: null })
  },

  onOpenList() {
    const wishes = getWishes().map((w) => ({ ...w, dateText: formatDate(w.ts) }))
    this.setData({ wishes, showList: true })
  },

  onCloseList() {
    this.setData({ showList: false })
  },

  onDeleteWish(e) {
    const id = e.currentTarget.dataset.id
    const wishes = deleteWish(id).map((w) => ({ ...w, dateText: formatDate(w.ts) }))
    this.setData({ wishes })
    wx.showToast({ title: '已删除', icon: 'none' })
  },

  onClearWishes() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空全部许愿记录吗？',
      confirmColor: '#C41E3A',
      success: (r) => {
        if (!r.confirm) return
        clearWishes()
        this.setData({ wishes: [] })
      }
    })
  },

  onUnload() {
    if (this._coinTimer) clearTimeout(this._coinTimer)
    if (this._rippleTimer) clearTimeout(this._rippleTimer)
    if (this._fortuneTimer) clearTimeout(this._fortuneTimer)
  }
})
