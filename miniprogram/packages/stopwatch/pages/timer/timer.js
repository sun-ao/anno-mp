const { addSession, formatMs } = require('../../model/stopwatch')

const TICK_MS = 30 // 显示刷新间隔，毫秒级观感

function pad2(n) { return n < 10 ? '0' + n : '' + n }

Page({
  data: {
    status: 'idle',          // idle | running | stopped
    timeText: '00:00.000',
    laps: [],                // 最新一组在前 { i, totalMs, splitMs, totalText, splitText, best }
    lapCount: 0,
    primaryLabel: '开始'
  },

  onLoad() {
    this._startMs = 0
    this._elapsed = 0
    this._timer = null
  },

  onShow() {
    // 切回前台：按时间戳校准并重启刷新（后台被节流也能恢复准确）
    if (this.data.status === 'running') {
      this._clearTimer()
      this._tick()
      this._timer = setInterval(() => this._tick(), TICK_MS)
    }
  },

  onUnload() {
    this._clearTimer()
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keep: false })
  },

  _clearTimer() {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
  },

  _tick() {
    const elapsed = Date.now() - this._startMs
    this._elapsed = elapsed
    this.setData({ timeText: formatMs(elapsed) })
  },

  _start() {
    this._startMs = Date.now() - this._elapsed
    this._clearTimer()
    this._timer = setInterval(() => this._tick(), TICK_MS)
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keep: true })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
    this.setData({ status: 'running', primaryLabel: '计次' })
  },

  // 记录当前这一组（累计 + 分段）
  _lap() {
    const totalMs = Date.now() - this._startMs
    const laps = this.data.laps
    const prevTotal = laps.length ? laps[0].totalMs : 0
    const splitMs = totalMs - prevTotal
    const i = this.data.lapCount + 1
    const row = { i, totalMs, splitMs, totalText: formatMs(totalMs), splitText: formatMs(splitMs), best: false }
    const next = [row].concat(laps)
    let bestMs = Infinity
    next.forEach(l => { if (l.totalMs < bestMs) bestMs = l.totalMs })
    next.forEach(l => { l.best = (l.totalMs === bestMs) })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    this.setData({ laps: next, lapCount: i })
  },

  _stop() {
    this._clearTimer()
    this._tick()
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keep: false })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
    this.setData({ status: 'stopped', primaryLabel: '保存成绩' })
  },

  _reset() {
    this._clearTimer()
    this._startMs = 0
    this._elapsed = 0
    if (wx.setKeepScreenOn) wx.setKeepScreenOn({ keep: false })
    this.setData({ status: 'idle', timeText: '00:00.000', laps: [], lapCount: 0, primaryLabel: '开始' })
  },

  _save() {
    if (!this.data.lapCount) {
      wx.showToast({ title: '还没有记录', icon: 'none' })
      return
    }
    const laps = this.data.laps.map(l => ({ i: l.i, totalMs: l.totalMs, splitMs: l.splitMs }))
    let best = Infinity
    laps.forEach(l => { if (l.totalMs < best) best = l.totalMs })
    const d = new Date()
    const date = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
    addSession({ title: '', date, laps, bestMs: isFinite(best) ? best : 0, count: laps.length })
    wx.showToast({ title: '已保存', icon: 'success' })
    this._reset()
  },

  // 主按钮：开始 / 计次 / 保存成绩
  onToggle() {
    if (this.data.status === 'idle') this._start()
    else if (this.data.status === 'running') this._lap()
    else this._save()
  },

  onStop() {
    if (this.data.status === 'running') this._stop()
  },

  onReset() {
    if (this.data.status === 'stopped') this._reset()
  },

  // 撤销最近一次计次（跑错时快速补救）
  onUndo() {
    if (this.data.status !== 'running' || !this.data.lapCount) return
    const next = this.data.laps.slice(1)
    let bestMs = Infinity
    next.forEach(l => { if (l.totalMs < bestMs) bestMs = l.totalMs })
    next.forEach(l => { l.best = (l.totalMs === bestMs) })
    this.setData({ laps: next, lapCount: next.length })
  },

  onGoHistory() {
    wx.navigateTo({ url: '/packages/stopwatch/pages/history/history' })
  }
})
