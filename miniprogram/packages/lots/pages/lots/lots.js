const { getOptions, addOption, deleteOption, clearOptions, drawOne, getHistory, clearHistory, formatDate, OPTIONS_LIMIT } = require('../../model/lots')

Page({
  data: {
    options: [],
    inputText: '',
    rolling: false,
    rollText: '',
    showResult: false,
    result: '',
    showHistory: false,
    history: []
  },

  onLoad() {
    this.setData({ options: getOptions() })
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  onAdd() {
    const text = this.data.inputText
    if (!text.trim()) return
    const res = addOption(text)
    if (res === 'duplicate') {
      wx.showToast({ title: '该选项已存在', icon: 'none' })
      return
    }
    if (res === 'full') {
      wx.showToast({ title: `最多 ${OPTIONS_LIMIT} 个选项`, icon: 'none' })
      return
    }
    this.setData({ options: res, inputText: '' })
  },

  onDeleteOption(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ options: deleteOption(id) })
  },

  onClearOptions() {
    wx.showModal({
      title: '清空选项池',
      content: '确定清空全部选项吗？',
      confirmText: '清空',
      confirmColor: '#0FA39B',
      success: (res) => {
        if (res.confirm) {
          this.setData({ options: clearOptions(), showResult: false, result: '', rollText: '' })
        }
      }
    })
  },

  onDraw() {
    if (this.data.rolling) return
    const options = this.data.options
    if (options.length === 0) {
      wx.showToast({ title: '先添加几个选项吧', icon: 'none' })
      return
    }
    this.setData({ rolling: true, showResult: false, result: '', rollText: '' })
    // 滚动快闪：间隔逐渐变慢，最后定格为真实抽取结果
    const ROLL_COUNT = 14
    let i = 0
    const tick = () => {
      const rand = options[Math.floor(Math.random() * options.length)]
      this.setData({ rollText: rand.text })
      i += 1
      if (i < ROLL_COUNT) {
        this._rollTimer = setTimeout(tick, 60 + i * 8)
      } else {
        const picked = drawOne()
        if (!picked) {
          this.setData({ rolling: false })
          wx.showToast({ title: '先添加几个选项吧', icon: 'none' })
          return
        }
        this.setData({
          rolling: false,
          rollText: picked.text,
          result: picked.text,
          showResult: true
        })
      }
    }
    tick()
  },

  onOpenHistory() {
    const history = getHistory().map((h) => ({ ...h, dateText: formatDate(h.ts) }))
    this.setData({ history, showHistory: true })
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  },

  onClearHistory() {
    wx.showModal({
      title: '清空抽取历史',
      content: '确定清空全部抽取记录吗？',
      confirmText: '清空',
      confirmColor: '#0FA39B',
      success: (res) => {
        if (res.confirm) {
          this.setData({ history: clearHistory() })
        }
      }
    })
  },

  onUnload() {
    if (this._rollTimer) clearTimeout(this._rollTimer)
  }
})
