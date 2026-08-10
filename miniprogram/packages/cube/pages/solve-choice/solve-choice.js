import { SOLVE_PAYLOAD_KEY, parseSolution } from '../../model/cube-state'

Page({
  data: {
    hasSolution: false,
    totalMoves: 0,
    phaseCount: 7
  },

  onLoad() {
    const payload = wx.getStorageSync(SOLVE_PAYLOAD_KEY)
    if (!payload || !payload.solution) {
      wx.showToast({ title: '请先求解', icon: 'none' })
      this._backTimer = setTimeout(() => wx.navigateBack(), 800)
      return
    }
    let totalMoves = 0
    try {
      totalMoves = parseSolution(payload.solution).length
    } catch (e) {
      totalMoves = 0
    }
    this.setData({
      hasSolution: true,
      totalMoves,
      phaseCount: 7
    })
  },

  onUnload() {
    if (this._backTimer) {
      clearTimeout(this._backTimer)
      this._backTimer = null
    }
  },

  /** 智能求解：最短解法，一步到位 */
  onChooseSmart() {
    wx.navigateTo({ url: '/packages/cube/pages/solve/solve' })
  },

  /** 课堂还原：按魔方课堂七步法，边看边学 */
  onChooseClassroom() {
    wx.navigateTo({ url: '/packages/cube/pages/restore/restore' })
  },

  onBack() {
    wx.navigateBack()
  }
})
