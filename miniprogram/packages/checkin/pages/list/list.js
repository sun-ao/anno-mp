import {
  getHabits, deleteHabit, getDaysLeft, isCheckedToday, checkIn,
  getStreak, getTotalDays
} from '../../model/checkin'

Page({
  data: {
    habits: []
  },

  onShow() {
    this.loadHabits()
  },

  loadHabits() {
    const habits = getHabits()
      .map(h => {
        const daysLeft = getDaysLeft(h.deadlineTs)
        const checkedToday = isCheckedToday(h.id)
        let deadlineText
        if (daysLeft > 0) deadlineText = `距截止还有 ${daysLeft} 天`
        else if (daysLeft === 0) deadlineText = '今天截止'
        else deadlineText = `已截止 ${-daysLeft} 天`
        return {
          ...h,
          daysLeft,
          deadlineText,
          checkedToday,
          streak: getStreak(h.id),
          total: getTotalDays(h.id)
        }
      })
      // 未截止的按剩余天数升序，已截止的排最后
      .sort((a, b) => {
        const ae = a.daysLeft < 0 ? 1 : 0
        const be = b.daysLeft < 0 ? 1 : 0
        if (ae !== be) return ae - be
        return a.daysLeft - b.daysLeft
      })
    this.setData({ habits })
  },

  onAddHabit() {
    wx.navigateTo({ url: '/packages/checkin/pages/edit/edit' })
  },

  onTapHabit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/packages/checkin/pages/edit/edit?id=' + id })
  },

  onCheckIn(e) {
    const id = e.currentTarget.dataset.id
    const habit = this.data.habits.find(h => h.id === id)
    if (!habit) return
    if (habit.checkedToday) {
      wx.showToast({ title: '今天已打卡', icon: 'none' })
      return
    }
    if (habit.daysLeft < 0) {
      wx.showToast({ title: '已截止，无法打卡', icon: 'none' })
      return
    }
    if (checkIn(id)) {
      wx.showToast({ title: '打卡成功', icon: 'success' })
      this.loadHabits()
    }
  },

  onLongPressHabit(e) {
    const id = e.currentTarget.dataset.id
    const habit = this.data.habits.find(h => h.id === id)
    if (!habit) return
    wx.showModal({
      title: '删除打卡项',
      content: `确定删除「${habit.name}」吗？打卡记录将一并删除。`,
      confirmColor: '#C41E3A',
      success: (res) => {
        if (res.confirm) {
          deleteHabit(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          this.loadHabits()
        }
      }
    })
  }
})
