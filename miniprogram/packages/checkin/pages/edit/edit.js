import {
  getHabitById, addHabit, updateHabit, deleteHabit, getDaysLater
} from '../../model/checkin'
import { tsToDate } from '../../../../utils/date'
import { confirm as modalConfirm } from '../../../../utils/modal'

Page({
  data: {
    isEdit: false,
    habitId: '',
    name: '',
    deadline: ''
  },

  onLoad(query) {
    if (query && query.id) {
      const habit = getHabitById(query.id)
      if (habit) {
        const dateStr = tsToDate(habit.deadlineTs)
        this.setData({
          isEdit: true,
          habitId: habit.id,
          name: habit.name,
          deadline: dateStr
        })
        wx.setNavigationBarTitle({ title: '编辑打卡项' })
        return
      }
    }
    // 新增模式：默认 30 天后截止
    this.setData({
      deadline: getDaysLater(30)
    })
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onDeadlineChange(e) {
    this.setData({ deadline: e.detail.value })
  },

  onSave() {
    const name = this.data.name.trim()
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' })
      return
    }
    const [y, m, d] = this.data.deadline.split('-').map(Number)
    const deadlineTs = new Date(y, m - 1, d).getTime()

    if (this.data.isEdit) {
      updateHabit({
        id: this.data.habitId,
        name,
        deadlineTs
      })
    } else {
      addHabit({ name, deadlineTs })
    }

    wx.showToast({ title: '已保存', icon: 'success' })
    this._backTimer = setTimeout(() => wx.navigateBack(), 600)
  },

  onDelete() {
    modalConfirm({
      title: '删除打卡项',
      content: '确定删除吗？打卡记录将一并删除。'
    }).then((ok) => {
      if (!ok) return
      deleteHabit(this.data.habitId)
      wx.showToast({ title: '已删除', icon: 'success' })
      this._backTimer = setTimeout(() => wx.navigateBack(), 600)
    })
  },

  onUnload() {
    if (this._backTimer) {
      clearTimeout(this._backTimer)
      this._backTimer = null
    }
  }
})
