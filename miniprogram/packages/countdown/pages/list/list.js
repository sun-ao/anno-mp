import {
  getEvents, getRemainingMs, formatRemaining, tsToDate, tsToTime, deleteEvent
} from '../../model/countdown'
import { confirm as modalConfirm } from '../../../../utils/modal'

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
    // 列表结构（增删/顺序）变化 → 全量 setData；
    // 否则按路径只更新每秒真正变化的字段，避免整组数组每秒 diff 全量重设
    const prev = this.data.events
    const sameStructure = prev.length === events.length &&
      events.every((e, i) => prev[i] && prev[i].id === e.id)
    if (!sameStructure) {
      this.setData({ events })
      return
    }
    const patch = {}
    for (let i = 0; i < events.length; i++) {
      if (prev[i].remainingText !== events[i].remainingText) {
        patch['events[' + i + '].remainingText'] = events[i].remainingText
      }
      if (prev[i].expired !== events[i].expired) {
        patch['events[' + i + '].expired'] = events[i].expired
      }
    }
    if (Object.keys(patch).length) this.setData(patch)
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
    modalConfirm({
      title: '删除倒计时',
      content: `确定删除「${ev.name}」吗？`
    }).then((ok) => {
      if (!ok) return
      deleteEvent(id)
      wx.showToast({ title: '已删除', icon: 'success' })
      this.loadEvents()
    })
  }
})
