const { QUESTIONS, computeResult, addHistory } = require('../../model/mbti')

Page({
  data: {
    questions: QUESTIONS,
    index: 0,
    answers: QUESTIONS.map(() => ''),
    progress: Math.round((1 / QUESTIONS.length) * 100)
  },

  onChoose(e) {
    if (this._switching) return
    const choice = e.currentTarget.dataset.choice
    const { index, answers } = this.data
    answers[index] = choice
    this.setData({ answers })
    if (index === QUESTIONS.length - 1) {
      // 最后一题答完，计算并跳转结果页
      const result = computeResult(answers)
      addHistory(result)
      this._switching = true
      this._switchTimer = setTimeout(() => {
        wx.redirectTo({ url: '/packages/mbti/pages/result/result' })
      }, 200)
      return
    }
    // 高亮停留片刻后自动进入下一题
    this._switching = true
    this._switchTimer = setTimeout(() => {
      this._switching = false
      this.setData({
        index: index + 1,
        progress: Math.round(((index + 2) / QUESTIONS.length) * 100)
      })
    }, 150)
  },

  onUnload() {
    if (this._switchTimer) {
      clearTimeout(this._switchTimer)
      this._switchTimer = null
    }
  },

  onPrev() {
    const { index } = this.data
    if (index > 0) {
      this.setData({
        index: index - 1,
        progress: Math.round((index / QUESTIONS.length) * 100)
      })
    }
  }
})
