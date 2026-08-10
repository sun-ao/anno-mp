const { addPhoto, getPhotos, getInterval, saveInterval } = require('../../model/snap')

const MAX_SIDE = 1080       // 保存时长边上限：源帧为高清，回查更清晰
const QUALITY = 0.82
const FLASH_ORDER = ['off', 'on', 'torch']
const FLASH_LABEL = { off: '关', on: '开', torch: '常亮' }

function pad(n) { return n < 10 ? '0' + n : '' + n }
function fmtTime(ts) {
  const d = new Date(ts)
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

Page({
  data: {
    capturing: false,
    count: 0,
    lastTs: '',
    devicePosition: 'back',   // 摄像头：back 后置 / front 前置
    flash: 'off',             // 闪光灯：off / on / torch(常亮)
    flashLabel: '关',
    hidePreview: false,       // 是否隐藏实时预览（仅移出屏幕，相机仍在后台抽帧）
    intervals: [300, 500, 1000, 2000, 3000, 5000], // 拍摄间隔（毫秒）
    intervalIndex: 2                                    // 默认 1 秒
  },

  onLoad() {
    const ms = getInterval()
    const idx = this.data.intervals.indexOf(ms)
    if (idx >= 0) this.setData({ intervalIndex: idx })
    // 计数以本地存储的真实照片数为准，避免与回查页对不上
    this.setData({ count: getPhotos().length })
  },

  onReady() {
    this.cameraCtx = wx.createCameraContext()
    this.fs = wx.getFileSystemManager()
    this._initCanvas()
  },

  _initCanvas() {
    wx.createSelectorQuery()
      .select('#snapCanvas')
      .fields({ node: true })
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          this.canvas = res[0].node
          this.ctx = this.canvas.getContext('2d')
        } else {
          wx.showToast({ title: '画布初始化失败', icon: 'none' })
        }
      })
  },

  _ms() {
    return this.data.intervals[this.data.intervalIndex]
  },

  // 注册/重启实时帧监听（首次就绪、切换摄像头后都会调用）
  _startFrameListener() {
    if (this.listener) { try { this.listener.stop() } catch (e) {} this.listener = null }
    this.listener = this.cameraCtx.onCameraFrame((frame) => {
      this.latestFrame = frame
    })
    this.listener.start()
  },

  // camera 组件初始化或重建完成时触发（切换前后摄会令其重建）
  onCameraReady() {
    if (!this.data.capturing) return
    this._startFrameListener()
    // 切换镜头期间定时器被暂停，重建完成后恢复抽帧
    if (!this.timer) this.timer = setInterval(() => this._snapshot(), this._ms())
  },

  onStart() {
    if (this.data.capturing) return
    if (!this.cameraCtx) {
      wx.showToast({ title: '摄像头未就绪', icon: 'none' })
      return
    }
    this._startFrameListener()
    this.setData({ capturing: true, count: getPhotos().length })
    this.timer = setInterval(() => this._snapshot(), this._ms())
  },

  onSelectInterval(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    this.setData({ intervalIndex: idx })
    saveInterval(this.data.intervals[idx])
    // 采集中切换间隔：立即用新间隔重启定时器
    if (this.data.capturing) {
      clearInterval(this.timer)
      this.timer = setInterval(() => this._snapshot(), this._ms())
    }
  },

  _snapshot() {
    const frame = this.latestFrame
    const ctx = this.ctx
    if (!frame || !ctx) return
    const w = frame.width
    const h = frame.height
    // 让画布像素尺寸匹配帧尺寸
    if (this.canvas.width !== w) {
      this.canvas.width = w
      this.canvas.height = h
    }
    const imgData = ctx.createImageData(w, h)
    imgData.data.set(new Uint8Array(frame.data))
    ctx.putImageData(imgData, 0, 0)

    const scale = Math.min(1, MAX_SIDE / Math.max(w, h))
    const dw = Math.round(w * scale)
    const dh = Math.round(h * scale)

    wx.canvasToTempFilePath({
      canvas: this.canvas,
      x: 0, y: 0, width: w, height: h,
      destWidth: dw, destHeight: dh,
      fileType: 'jpg', quality: QUALITY,
      success: (r) => {
        this.fs.saveFile({
          tempFilePath: r.tempFilePath,
          success: (sr) => {
            addPhoto({ path: sr.savedFilePath, ts: Date.now(), w: dw, h: dh })
            // 计数以真实存储为准，避免异步/切换后自增计数与回查对不上
            this.setData({
              count: getPhotos().length,
              lastTs: fmtTime(Date.now())
            })
          },
          fail: (e) => console.error('[snap] saveFile fail', e)
        })
      },
      fail: (e) => console.error('[snap] canvasToTempFilePath fail', e)
    })
  },

  onStop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    if (this.listener) { this.listener.stop(); this.listener = null }
    if (this.data.capturing) this.setData({ capturing: false })
  },

  // 切换前置 / 后置摄像头（会触发 camera 重建）
  onSwitchCamera() {
    const next = this.data.devicePosition === 'back' ? 'front' : 'back'
    // 先暂停抽帧，避免切换瞬间拍到废帧；相机重建完成后 onCameraReady 会恢复
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    this.setData({ devicePosition: next })
    wx.showToast({ title: next === 'front' ? '已切到前置' : '已切到后置', icon: 'none' })
  },

  // 循环切换闪光灯：关 → 开 → 常亮
  onCycleFlash() {
    const i = FLASH_ORDER.indexOf(this.data.flash)
    const next = FLASH_ORDER[(i + 1) % FLASH_ORDER.length]
    this.setData({ flash: next, flashLabel: FLASH_LABEL[next] })
  },

  // 切换实时预览 显示 / 隐藏（隐藏=把 camera 移出屏幕，但保持挂载以继续抽帧）
  onTogglePreview() {
    this.setData({ hidePreview: !this.data.hidePreview })
  },

  onUnload() { this.onStop() },

  // 切到后台：相机被系统回收、帧回调停止。这里只丢弃旧帧，避免回前台瞬间误存陈帧
  // （不调用 onStop，保留 capturing 标记，回前台 onShow/onCameraReady 自动续拍）
  onHide() {
    this.latestFrame = null
  },

  // 从后台返回前台：若仍在采集中，确保帧监听与定时器已恢复（微信会重新初始化相机）
  onShow() {
    this.setData({ count: getPhotos().length })
    if (this.data.capturing && this.cameraCtx) {
      this._startFrameListener()
      if (!this.timer) this.timer = setInterval(() => this._snapshot(), this._ms())
    }
  },

  goReview() {
    wx.navigateTo({ url: '/packages/snap/pages/review/review' })
  },

  onCameraError() {
    wx.showModal({
      title: '无法打开摄像头',
      content: '请在系统设置中允许本小程序使用摄像头后重试。',
      showCancel: false
    })
  }
})
