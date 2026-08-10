const { getStats, addFocusSession, getConfig, saveConfig } = require('../../model/tomato')
const { playFocusDone, playRestDone } = require('../../utils/alarm-audio')

Page({
  data: {
    mode: 'focus', // focus | rest
    status: 'idle', // idle | running | paused
    focusMin: 25,
    restMin: 5,
    totalSec: 1500,
    leftSec: 1500,
    timeText: '25:00',
    progress: 0,
    stats: { count: 0, minutes: 0 },
    focusOptions: [15, 25, 30, 45],
    restOptions: [3, 5, 10]
  },

  onLoad() {
    const config = getConfig()
    const stats = getStats()
    const totalSec = config.focusMin * 60
    this.setData({
      focusMin: config.focusMin,
      restMin: config.restMin,
      totalSec,
      leftSec: totalSec,
      timeText: this._format(totalSec),
      stats
    })
  },

  onReady() {
    this._initCanvas(0)
  },

  onUnload() {
    this._stopInterval()
    if (this._canvasRetry) {
      clearTimeout(this._canvasRetry)
      this._canvasRetry = null
    }
  },

  // ===== 计时核心（时间戳驱动，切后台再回来也能校准）=====

  _start() {
    this._endTime = Date.now() + this.data.leftSec * 1000
    this._stopInterval()
    this._interval = setInterval(() => this._tick(), 500)
    this.setData({ status: 'running' })
  },

  _pause() {
    this._stopInterval()
    const leftSec = Math.max(0, Math.ceil((this._endTime - Date.now()) / 1000))
    this.setData({ status: 'paused', leftSec, timeText: this._format(leftSec) })
  },

  _stopInterval() {
    if (this._interval) {
      clearInterval(this._interval)
      this._interval = null
    }
  },

  _tick() {
    const leftMs = this._endTime - Date.now()
    if (leftMs <= 0) {
      this._stopInterval()
      this.setData({ leftSec: 0, timeText: this._format(0), progress: 1 })
      this._drawRing()
      this._complete()
      return
    }
    const leftSec = Math.ceil(leftMs / 1000)
    const progress = Math.min(1, Math.max(0, 1 - leftMs / (this.data.totalSec * 1000)))
    this.setData({ leftSec, timeText: this._format(leftSec), progress })
    this._drawRing()
  },

  _complete() {
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
    if (this.data.mode === 'focus') {
      playFocusDone()
      const stats = addFocusSession(this.data.focusMin)
      this.setData({ stats })
      wx.showToast({ title: '专注完成，休息一下吧', icon: 'none' })
      this._switchMode('rest')
    } else {
      playRestDone()
      wx.showToast({ title: '休息结束，继续加油', icon: 'none' })
      this._switchMode('focus')
    }
  },

  _switchMode(mode) {
    const totalSec = mode === 'focus' ? this.data.focusMin * 60 : this.data.restMin * 60
    this.setData({
      mode,
      status: 'idle',
      totalSec,
      leftSec: totalSec,
      timeText: this._format(totalSec),
      progress: 0
    })
    this._drawRing()
  },

  _format(sec) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`
  },

  // ===== 交互 =====

  onToggle() {
    if (this.data.status === 'running') {
      this._pause()
    } else {
      this._start()
    }
  },

  onReset() {
    this._stopInterval()
    const totalSec = this.data.mode === 'focus' ? this.data.focusMin * 60 : this.data.restMin * 60
    this.setData({ status: 'idle', totalSec, leftSec: totalSec, timeText: this._format(totalSec), progress: 0 })
    this._drawRing()
  },

  onSelectMode(e) {
    if (this.data.status !== 'idle') return
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this._switchMode(mode)
  },

  onSelectFocusMin(e) {
    if (this.data.status !== 'idle' || this.data.mode !== 'focus') return
    const focusMin = Number(e.currentTarget.dataset.min)
    saveConfig({ focusMin, restMin: this.data.restMin })
    this.setData({ focusMin, totalSec: focusMin * 60, leftSec: focusMin * 60, timeText: this._format(focusMin * 60), progress: 0 })
    this._drawRing()
  },

  onSelectRestMin(e) {
    if (this.data.status !== 'idle' || this.data.mode !== 'rest') return
    const restMin = Number(e.currentTarget.dataset.min)
    saveConfig({ focusMin: this.data.focusMin, restMin })
    this.setData({ restMin, totalSec: restMin * 60, leftSec: restMin * 60, timeText: this._format(restMin * 60), progress: 0 })
    this._drawRing()
  },

  // ===== 圆环绘制 =====

  _initCanvas(retry) {
    wx.createSelectorQuery()
      .select('#ringCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          if (retry < 10) {
            if (this._canvasRetry) clearTimeout(this._canvasRetry)
            this._canvasRetry = setTimeout(() => this._initCanvas(retry + 1), 100)
          }
          return
        }
        const canvas = res[0].node
        const dpr = (wx.getSystemInfoSync() && wx.getSystemInfoSync().pixelRatio) || 2
        const w = res[0].width
        const h = res[0].height
        canvas.width = w * dpr
        canvas.height = h * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        this._canvas = canvas
        this._ctx = ctx
        this._cw = w
        this._ch = h
        this._drawRing()
      })
  },

  _drawRing() {
    const ctx = this._ctx
    if (!ctx) return
    const W = this._cw
    const H = this._ch
    const isFocus = this.data.mode === 'focus'
    ctx.clearRect(0, 0, W, H)
    const cx = W / 2
    const cy = H / 2
    const radius = Math.min(W, H) / 2 - 18
    const lineWidth = 16
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    // 轨道
    ctx.strokeStyle = isFocus ? '#F8E7E5' : '#E5ECF9'
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
    // 进度（已过部分）
    const progress = this.data.progress
    if (progress > 0) {
      const start = -Math.PI / 2
      const end = start + Math.PI * 2 * Math.min(1, progress)
      ctx.strokeStyle = isFocus ? '#D9534F' : '#2E6BE6'
      ctx.beginPath()
      ctx.arc(cx, cy, radius, start, end)
      ctx.stroke()
    }
  }
})
