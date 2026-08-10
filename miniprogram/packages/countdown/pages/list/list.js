import {
  getEvents, getRemainingMs, formatRemaining, tsToDate, tsToTime, deleteEvent
} from '../../model/countdown'

Page({
  data: {
    events: [],
    now: ''
  },

  onShow() {
    this.loadEvents()
    // 每秒刷新剩余时间
    if (this._timer) clearInterval(this._timer)
    this._timer = setInterval(() => {
      this.loadEvents()
    }, 1000)
  },

  onHide() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onUnload() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  loadEvents() {
    const now = Date.now()
    const events = getEvents().map(e => {
      const ms = getRemainingMs(e.targetTs)
      const { text, expired } = formatRemaining(ms)
      return {
        ...e,
        remainingText: text,
        expired,
        targetLabel: `${tsToDate(e.targetTs)} ${tsToTime(e.targetTs)}`
      }
    })
    this.setData({ events, now })
  },

  onAddEvent() {
    wx.navigateTo({ url: '/packages/countdown/pages/edit/edit' })
  },

  onTapEvent(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packages/countdown/pages/edit/edit?id=' + id })
  },

  onLongPressEvent(e) {
    const id = e.currentTarget.dataset.id
    const ev = this.data.events.find(x => x.id === id)
    if (!ev) return
    wx.showModal({
      title: '删除倒计时',
      content: `确定删除「${ev.name}」吗？`,
      confirmColor: '#C41E3A',
      success: (res) => {
        if (res.confirm) {
          deleteEvent(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadEvents()
        }
      }
    })
  }
})
