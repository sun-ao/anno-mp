const { getHistory, getLatest, removeHistory, clearHistory, formatDate } = require('../../model/mbti')

const POSTER_W = 375
const POSTER_H = 667

Page({
  data: {
    result: null,
    isHistory: false,
    showHistory: false,
    history: [],
    // 海报
    showPoster: false,
    posterReady: false,
    posterPath: '',
    posterCanvasHidden: true
  },

  onLoad() {
    const latest = getLatest()
    if (!latest) {
      wx.showToast({ title: '还没有测试结果', icon: 'none' })
      this._backTimer = setTimeout(() => {
        wx.redirectTo({ url: '/packages/mbti/pages/test/test' })
      }, 800)
      return
    }
    this._render(latest, false)
  },

  onUnload() {
    if (this._backTimer) {
      clearTimeout(this._backTimer)
      this._backTimer = null
    }
    if (this._posterRetry) {
      clearTimeout(this._posterRetry)
      this._posterRetry = null
    }
  },

  _render(result, isHistory) {
    this.setData({
      result: {
        type: result.type,
        name: result.name,
        desc: result.desc,
        traits: result.traits,
        percents: result.percents
      },
      isHistory
    })
  },

  onRetest() {
    wx.redirectTo({ url: '/packages/mbti/pages/test/test' })
  },

  onOpenHistory() {
    const history = getHistory().map((h) => ({ ...h, dateText: formatDate(h.ts) }))
    this.setData({ history, showHistory: true })
  },

  onCloseHistory() {
    this.setData({ showHistory: false })
  },

  onViewHistory(e) {
    const idx = e.currentTarget.dataset.idx
    const h = this.data.history[idx]
    if (!h) return
    this.setData({ showHistory: false })
    this._render(h, true)
  },

  onDeleteHistory(e) {
    const ts = e.currentTarget.dataset.ts
    const list = removeHistory(ts).map((h) => ({ ...h, dateText: formatDate(h.ts) }))
    this.setData({ history: list })
  },

  onClearHistory() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空全部测试记录吗？',
      confirmColor: '#C41E3A',
      success: (r) => {
        if (!r.confirm) return
        clearHistory()
        this.setData({ history: [] })
      }
    })
  },

  // ===== 海报 =====

  onMakePoster() {
    const { result, showPoster } = this.data
    if (!result) return
    if (showPoster && this.data.posterReady) return // 已有海报直接看
    wx.showLoading({ title: '生成中...', mask: true })
    this.setData({
      showPoster: true,
      posterReady: false,
      posterCanvasHidden: false
    }, () => {
      wx.nextTick(() => this._initPosterCanvas(0))
    })
  },

  _initPosterCanvas(retry) {
    const query = wx.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res && res[0] && res[0].node
      if (!canvas) {
        if (retry < 10) {
          if (this._posterRetry) clearTimeout(this._posterRetry)
          this._posterRetry = setTimeout(() => this._initPosterCanvas(retry + 1), 100)
        } else {
          wx.hideLoading()
          wx.showToast({ title: '海报生成失败，请重试', icon: 'none' })
        }
        return
      }
      const dpr = (wx.getSystemInfoSync().pixelRatio) || 2
      canvas.width = POSTER_W * dpr
      canvas.height = POSTER_H * dpr
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      this._paintPoster(ctx, this.data.result)
      wx.canvasToTempFilePath({
        canvas,
        fileType: 'png',
        success: (r) => {
          wx.hideLoading()
          this.setData({
            posterPath: r.tempFilePath,
            posterReady: true,
            posterCanvasHidden: true
          })
        },
        fail: () => {
          wx.hideLoading()
          wx.showToast({ title: '海报生成失败，请重试', icon: 'none' })
        }
      })
    })
  },

  _paintPoster(ctx, result) {
    const W = POSTER_W
    const H = POSTER_H
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    // 背景渐变
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#6C6AF2')
    bg.addColorStop(1, '#4A48C4')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // 品牌行
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
    ctx.font = '14px sans-serif'
    ctx.fillText('MBTI 人格测试 · 推开数智的门', W / 2, 74)
    // 类型大字
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 64px sans-serif'
    ctx.fillText(result.type, W / 2, 168)
    // 人格名
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 30px sans-serif'
    ctx.fillText(result.name, W / 2, 224)
    // 特质标签
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)'
    ctx.font = '15px sans-serif'
    ctx.fillText(result.traits, W / 2, 258)
    // 白色卡片
    const cardX = 28
    const cardY = 296
    const cardW = W - 56
    const cardH = 269
    ctx.fillStyle = '#FFFFFF'
    this._roundRect(ctx, cardX, cardY, cardW, cardH, 18)
    ctx.fill()
    // 卡片标题
    ctx.fillStyle = '#5E5CE6'
    ctx.font = 'bold 15px sans-serif'
    ctx.fillText('四维倾向', W / 2, cardY + 46)
    // 四维行：标签与进度条同行，垂直居中对齐
    const barX = 110
    const barW = 150
    const barH = 16
    result.percents.forEach((item, i) => {
      const y = cardY + 90 + i * 52 // 文字基线
      const barTop = y - 13 // 条顶 = 基线-13，使条中心对齐文字视觉中心
      // 左标签：右对齐到条左端 -8
      ctx.textAlign = 'right'
      ctx.fillStyle = '#5E5CE6'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText(`${item.leftKey} ${item.leftPct}%`, barX - 8, y)
      // 右标签：左对齐到条右端 +8
      ctx.textAlign = 'left'
      ctx.fillStyle = '#A9A6C9'
      ctx.font = '14px sans-serif'
      ctx.fillText(`${item.rightPct}% ${item.rightKey}`, barX + barW + 8, y)
      // 条底色
      ctx.fillStyle = '#ECEBF8'
      this._roundRect(ctx, barX, barTop, barW, barH, barH / 2)
      ctx.fill()
      // 填充
      if (item.leftPct > 0) {
        const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0)
        grad.addColorStop(0, '#8B86F2')
        grad.addColorStop(1, '#5E5CE6')
        ctx.fillStyle = grad
        this._roundRect(ctx, barX, barTop, (barW * item.leftPct) / 100, barH, barH / 2)
        ctx.fill()
      }
    })
    // 底部
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)'
    ctx.font = '12px sans-serif'
    ctx.fillText('来自小程序「推开数智的门」', W / 2, H - 40)
  },

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  },

  onClosePoster() {
    this.setData({ showPoster: false })
  },

  onSavePoster() {
    const filePath = this.data.posterPath
    if (!filePath) {
      wx.showToast({ title: '海报还没生成好', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail: (err) => {
        const msg = (err && err.errMsg) || ''
        if (msg.indexOf('auth') !== -1 || msg.indexOf('deny') !== -1 || msg.indexOf('authorize') !== -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存海报需要访问你的相册，请在设置中开启权限',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败，请重试', icon: 'none' })
        }
      }
    })
  },

  noop() {}
})
