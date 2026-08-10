import {
  PHOTO_SPECS, BG_COLORS, replaceBackground, getPrintLayout
} from '../../model/idphoto'

Page({
  data: {
    specs: PHOTO_SPECS,
    bgColors: BG_COLORS,
    selectedSpec: '1inch',
    selectedBg: 'origin',
    imageReady: false,
    showPreview: false,
    previewSrc: '',
    canvasVisible: true,
    generating: false
  },

  // ==================== 选图 ====================

  onChooseImage() {
    const apply = (path) => {
      if (path) this._loadImage(path)
    }
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const f = res.tempFiles && res.tempFiles[0]
          apply(f ? f.tempFilePath : '')
        },
        fail: (err) => {
          // 用户主动取消则静默，其余情况回退旧接口
          if (err && err.errMsg && err.errMsg.includes('cancel')) return
          this._chooseFallback(apply)
        }
      })
    } else {
      this._chooseFallback(apply)
    }
  },

  _chooseFallback(apply) {
    if (!wx.chooseImage) return
    wx.chooseImage({
      count: 1,
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFilePaths
        apply(paths && paths[0])
      },
      fail: () => {
        // 取消或失败均静默
      }
    })
  },

  _loadImage(path) {
    this._pendingPath = path
    if (this._canvas) {
      this._applyPendingImage()
      return
    }
    // canvas 尚未初始化：先渲染 canvas 节点，再查询初始化
    this.setData({ imageReady: true })
    wx.nextTick(() => this._initCanvas(0))
  },

  _applyPendingImage() {
    const path = this._pendingPath
    if (!path || !this._canvas) return
    this._pendingPath = null
    const img = this._canvas.createImage()
    img.onload = () => {
      this._image = img
      this._resetTransform()
      this.setData({ imageReady: true })
      this.draw()
    }
    img.onerror = () => {
      wx.showToast({ title: '图片加载失败', icon: 'none' })
    }
    img.src = path
  },

  onChangeImage() {
    this.onChooseImage()
  },

  // ==================== 画布初始化 ====================

  _initCanvas(attempt) {
    wx.createSelectorQuery()
      .in(this)
      .select('#idCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          // canvas 节点尚未渲染完成，重试
          if (attempt < 10) {
            if (this._canvasRetry) clearTimeout(this._canvasRetry)
            this._canvasRetry = setTimeout(() => this._initCanvas(attempt + 1), 100)
          }
          return
        }
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        // 按 CSS 尺寸设置实际像素（适配高清屏）
        const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)
        this._canvas = canvas
        this._ctx = ctx
        this._canvasW = res[0].width
        this._canvasH = res[0].height
        this._specRatio = 413 / 295
        this._computeCrop()
        this._applyPendingImage()
      })
  },

  /** 计算裁剪框（居中，比例跟随规格） */
  _computeCrop() {
    const spec = PHOTO_SPECS.find(s => s.key === this.data.selectedSpec)
    const ratio = spec.height / spec.width
    const w = this._canvasW * 0.72
    const h = w * ratio
    if (h > this._canvasH * 0.86) {
      // 太高则按高度回缩
      const nw = this._canvasH * 0.86 / ratio
      this._crop = {
        x: (this._canvasW - nw) / 2,
        y: (this._canvasH - this._canvasH * 0.86) / 2,
        w: nw,
        h: this._canvasH * 0.86
      }
    } else {
      this._crop = {
        x: (this._canvasW - w) / 2,
        y: (this._canvasH - h) / 2,
        w,
        h
      }
    }
    // 变换后重新约束最小缩放
    this._clampTransform()
  },

  /** 图片初始适配：完整覆盖裁剪框，中心对齐 */
  _resetTransform() {
    const img = this._image
    const crop = this._crop
    this._scale = Math.max(crop.w / img.width, crop.h / img.height)
    this._px = crop.x + crop.w / 2
    this._py = crop.y + crop.h / 2
  },

  _clampTransform() {
    const crop = this._crop
    if (!this._image) return
    const minScale = Math.max(crop.w / this._image.width, crop.h / this._image.height)
    const maxScale = minScale * 5
    if (!this._scale) this._scale = minScale
    this._scale = Math.min(Math.max(this._scale, minScale), maxScale)
    // 限制图片覆盖裁剪框（图片边缘不允许缩到裁剪框内）
    const sw = this._image.width * this._scale
    const sh = this._image.height * this._scale
    const maxDx = sw / 2 - crop.w / 2
    const maxDy = sh / 2 - crop.h / 2
    if (maxDx > 0) {
      this._px = Math.min(Math.max(this._px, crop.x + crop.w / 2 - maxDx), crop.x + crop.w / 2 + maxDx)
    }
    if (maxDy > 0) {
      this._py = Math.min(Math.max(this._py, crop.y + crop.h / 2 - maxDy), crop.y + crop.h / 2 + maxDy)
    }
  },

  // ==================== 手势 ====================

  onTouchStart(e) {
    const touches = e.touches
    this._touches = touches.map(t => ({ x: t.x, y: t.y }))
    if (touches.length === 2) {
      this._pinchDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y)
      this._pinchMid = {
        x: (touches[0].x + touches[1].x) / 2,
        y: (touches[0].y + touches[1].y) / 2
      }
    } else if (touches.length === 1) {
      this._lastX = touches[0].x
      this._lastY = touches[0].y
    }
  },

  onTouchMove(e) {
    const touches = e.touches
    if (touches.length === 2) {
      const dist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y)
      if (this._pinchDist && dist > 0) {
        const mid = {
          x: (touches[0].x + touches[1].x) / 2,
          y: (touches[0].y + touches[1].y) / 2
        }
        const oldScale = this._scale
        let ns = oldScale * (dist / this._pinchDist)
        // 限制缩放范围
        const crop = this._crop
        const minScale = Math.max(crop.w / this._image.width, crop.h / this._image.height)
        ns = Math.min(Math.max(ns, minScale), minScale * 5)
        const k = ns / oldScale
        // 以双指中心为锚点缩放
        this._px = mid.x - (mid.x - this._px) * k
        this._py = mid.y - (mid.y - this._py) * k
        this._scale = ns
        this._pinchDist = dist
        this._clampTransform()
        this.draw()
      }
    } else if (touches.length === 1) {
      const dx = touches[0].x - this._lastX
      const dy = touches[0].y - this._lastY
      this._px += dx
      this._py += dy
      this._lastX = touches[0].x
      this._lastY = touches[0].y
      this._clampTransform()
      this.draw()
    }
  },

  onTouchEnd() {
    this._touches = null
    this._pinchDist = null
  },

  // ==================== 绘制 ====================

  draw() {
    const ctx = this._ctx
    const W = this._canvasW
    const H = this._canvasH
    const crop = this._crop
    if (!ctx || !this._image) return
    ctx.clearRect(0, 0, W, H)

    // 绘制图片（裁剪框内可见）
    ctx.save()
    ctx.beginPath()
    ctx.rect(crop.x, crop.y, crop.w, crop.h)
    ctx.clip()
    const img = this._image
    const s = this._scale
    ctx.drawImage(img, this._px - img.width * s / 2, this._py - img.height * s / 2, img.width * s, img.height * s)
    ctx.restore()

    // 裁剪框外遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, W, crop.y)
    ctx.fillRect(0, crop.y + crop.h, W, H - crop.y - crop.h)
    ctx.fillRect(0, crop.y, crop.x, crop.h)
    ctx.fillRect(crop.x + crop.w, crop.y, W - crop.x - crop.w, crop.h)

    // 边框 + 十字参考线
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.strokeRect(crop.x, crop.y, crop.w, crop.h)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(crop.x + crop.w / 2, crop.y)
    ctx.lineTo(crop.x + crop.w / 2, crop.y + crop.h)
    ctx.moveTo(crop.x, crop.y + crop.h / 2)
    ctx.lineTo(crop.x + crop.w, crop.y + crop.h / 2)
    ctx.stroke()
  },

  // ==================== 规格/底色切换 ====================

  onSelectSpec(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.selectedSpec) return
    this.setData({ selectedSpec: key })
    this._computeCrop()
    if (this._image) this.draw()
  },

  onSelectBg(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ selectedBg: key })
  },

  // ==================== 生成 ====================

  /** 把当前裁剪内容绘制到离屏画布，返回离屏 canvas */
  _renderToOffscreen(spec) {
    const canvas = wx.createOffscreenCanvas({ type: '2d', width: spec.width, height: spec.height })
    const ctx = canvas.getContext('2d')
    const img = this._image
    const s = this._scale
    const crop = this._crop
    // 图片显示矩形
    const srcRect = {
      x: this._px - img.width * s / 2,
      y: this._py - img.height * s / 2,
      w: img.width * s,
      h: img.height * s
    }
    // 与裁剪框求交集
    const ix0 = Math.max(srcRect.x, crop.x)
    const iy0 = Math.max(srcRect.y, crop.y)
    const ix1 = Math.min(srcRect.x + srcRect.w, crop.x + crop.w)
    const iy1 = Math.min(srcRect.y + srcRect.h, crop.y + crop.h)
    if (ix1 <= ix0 || iy1 <= iy0) return null
    const sx = (ix0 - srcRect.x) / s
    const sy = (iy0 - srcRect.y) / s
    const sw = (ix1 - ix0) / s
    const sh = (iy1 - iy0) / s
    const dx = (ix0 - crop.x) / crop.w * spec.width
    const dy = (iy0 - crop.y) / crop.h * spec.height
    const dw = (ix1 - ix0) / crop.w * spec.width
    const dh = (iy1 - iy0) / crop.h * spec.height
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    // 换底色
    if (this.data.selectedBg !== 'origin') {
      const bg = BG_COLORS.find(b => b.key === this.data.selectedBg)
      if (bg && bg.hex) {
        const imageData = ctx.getImageData(0, 0, spec.width, spec.height)
        replaceBackground(imageData, bg.hex, 0.22)
        ctx.putImageData(imageData, 0, 0)
      }
    }
    return canvas
  },

  /** 离屏 canvas → 临时文件 */
  _canvasToTemp(canvas) {
    return new Promise((resolve, reject) => {
      wx.canvasToTempFilePath({
        canvas,
        success: (res) => resolve(res.tempFilePath),
        fail: (err) => reject(err)
      })
    })
  },

  async onGenerate() {
    if (!this._image || this.data.generating) return
    const spec = PHOTO_SPECS.find(s => s.key === this.data.selectedSpec)
    this.setData({ generating: true })
    wx.showLoading({ title: '生成中...' })
    try {
      const off = this._renderToOffscreen(spec)
      if (!off) throw new Error('render failed')
      const path = await this._canvasToTemp(off)
      this.setData({ showPreview: true, previewSrc: path, canvasVisible: false, generating: false })
    } catch (err) {
      this.setData({ generating: false })
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  async onPrintLayout() {
    if (!this._image || this.data.generating) return
    const spec = PHOTO_SPECS.find(s => s.key === this.data.selectedSpec)
    const layout = getPrintLayout(spec)
    this.setData({ generating: true })
    wx.showLoading({ title: '排版中...' })
    try {
      // 先生成单张
      const single = this._renderToOffscreen(spec)
      if (!single) throw new Error('render failed')
      const singlePath = await this._canvasToTemp(single)
      // 加载单张到排版画布
      const canvas = wx.createOffscreenCanvas({ type: '2d', width: layout.canvasW, height: layout.canvasH })
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, layout.canvasW, layout.canvasH)
      const img = canvas.createImage()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = singlePath
      })
      for (let r = 0; r < layout.rows; r++) {
        for (let c = 0; c < layout.cols; c++) {
          const x = layout.margin + c * (spec.width + layout.gap)
          const y = layout.margin + r * (spec.height + layout.gap)
          ctx.drawImage(img, x, y, spec.width, spec.height)
        }
      }
      const layoutPath = await this._canvasToTemp(canvas)
      this.setData({ showPreview: true, previewSrc: layoutPath, canvasVisible: false, generating: false })
    } catch (err) {
      this.setData({ generating: false })
      wx.showToast({ title: '排版失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  // ==================== 预览与保存 ====================

  onClosePreview() {
    this.setData({ showPreview: false, previewSrc: '', canvasVisible: true })
    // canvas 从隐藏恢复后重绘一次，确保内容完整
    if (this._image) {
      if (this._redrawTimer) clearTimeout(this._redrawTimer)
      this._redrawTimer = setTimeout(() => this.draw(), 50)
    }
  },

  onSavePreview() {
    const src = this.data.previewSrc
    if (!src) return
    wx.saveImageToPhotosAlbum({
      filePath: src,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('auth')) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存图片到相册',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  onUnload() {
    if (this._canvasRetry) {
      clearTimeout(this._canvasRetry)
      this._canvasRetry = null
    }
    if (this._redrawTimer) {
      clearTimeout(this._redrawTimer)
      this._redrawTimer = null
    }
  }
})
