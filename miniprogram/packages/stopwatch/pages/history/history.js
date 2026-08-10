const { getSessions, deleteSession, clearSessions, formatMs } = require('../../model/stopwatch')

Page({
  data: {
    sessions: [],
    empty: true
  },

  onShow() {
    this._load()
  },

  _load() {
    const raw = getSessions()
    const sessions = raw.map(s => {
      const laps = (s.laps || []).map(l => ({
        i: l.i,
        totalText: formatMs(l.totalMs),
        splitText: formatMs(l.splitMs)
      }))
      return Object.assign({}, s, {
        bestText: formatMs(s.bestMs || 0),
        laps
      })
    })
    this.setData({ sessions, empty: sessions.length === 0 })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条成绩吗？',
      success: (r) => {
        if (r.confirm) { deleteSession(id); this._load() }
      }
    })
  },

  onClear() {
    if (!this.data.sessions.length) return
    wx.showModal({
      title: '清空全部',
      content: '将删除所有保存的成绩，无法恢复',
      success: (r) => {
        if (r.confirm) { clearSessions(); this._load() }
      }
    })
  }
})
