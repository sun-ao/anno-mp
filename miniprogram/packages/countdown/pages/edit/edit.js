import {
  getEventById, addEvent, updateEvent, deleteEvent, buildTargetTs, getTomorrow
} from '../../model/countdown'

Page({
  data: {
    isEdit: false,
    eventId: '',
    name: '',
    date: '',
    time: ''
  },

  onLoad(query) {
    if (query && query.id) {
      const ev = getEventById(query.id)
      if (ev) {
        const d = new Date(ev.targetTs)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        this.setData({
          isEdit: true,
          eventId: ev.id,
          name: ev.name,
          date: dateStr,
          time: timeStr
        })
        wx.setNavigationBarTitle({ title: '编辑倒计时' })
        return
      }
    }
    // 新增模式：默认明天 00:00
    this.setData({
      date: getTomorrow(),
      time: '00:00'
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value })
  },

  onSave() {
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    const targetTs = buildTargetTs(this.data.date, this.data.time)
    if (targetTs <= Date.now()) {
      wx.showToast({ title: '目标时间需晚于当前时间', icon: 'none' })
      return
    }

    if (this.data.isEdit) {
      updateEvent({
        id: this.data.eventId,
        name,
        targetTs
      })
    } else {
      addEvent({ name, targetTs })
    }

    wx.showToast({ title: '已保存', icon: 'success' })
    this._backTimer = setTimeout(() => wx.navigateBack(), 600)
  },

  onDelete() {
    wx.showModal({
      title: '删除倒计时',
      content: '确定删除这条倒计时吗？',
      confirmColor: '#C41E3A',
      success: (res) => {
        if (res.confirm) {
          deleteEvent(this.data.eventId)
          wx.showToast({ title: '已删除', icon: 'success' })
          this._backTimer = setTimeout(() => wx.navigateBack(), 600)
        }
      }
    })
  },

  onUnload() {
    if (this._backTimer) {
      clearTimeout(this._backTimer)
      this._backTimer = null
    }
  }
})
