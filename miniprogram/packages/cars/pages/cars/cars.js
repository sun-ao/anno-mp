// 工程车音效：使用本地预合成音频文件（ffmpeg 生成，更真实的引擎/喇叭/警笛/呼啸声）
// 资源放在分包内 packages/cars/resources/，运行时用 InnerAudioContext 播放
const AUDIO_BASE = '/packages/cars/resources/'

const VEHICLES = [
  { emoji: '🚜', name: '挖掘机', sound: 'engine' },
  { emoji: '🚒', name: '消防车', sound: 'siren' },
  { emoji: '🚓', name: '警车', sound: 'horn' },
  { emoji: '🚑', name: '救护车', sound: 'siren' },
  { emoji: '🚛', name: '大卡车', sound: 'horn' },
  { emoji: '🚂', name: '小火车', sound: 'engine' },
  { emoji: '🚌', name: '公交车', sound: 'engine' },
  { emoji: '🚕', name: '出租车', sound: 'horn' },
  { emoji: '🚚', name: '货车', sound: 'horn' },
  { emoji: '🚙', name: '小汽车', sound: 'horn' },
  { emoji: '🚎', name: '电车', sound: 'engine' },
  { emoji: '🚐', name: '面包车', sound: 'horn' },
  { emoji: '✈️', name: '飞机', sound: 'whoosh' },
  { emoji: '🚁', name: '直升机', sound: 'engine' },
  { emoji: '🚀', name: '火箭', sound: 'whoosh' },
  { emoji: '🚤', name: '快艇', sound: 'whoosh' },
  { emoji: '🚢', name: '轮船', sound: 'horn' },
  { emoji: '🏍️', name: '摩托车', sound: 'engine' }
]

Page({
  data: {
    vehicles: VEHICLES,
    activeIndex: -1
  },

  onLoad() {
    this._audios = {
      engine: this._mkAudio('engine.mp3'),
      siren: this._mkAudio('siren.mp3'),
      horn: this._mkAudio('horn.mp3'),
      whoosh: this._mkAudio('whoosh.mp3')
    }
  },

  _mkAudio(file) {
    const ctx = wx.createInnerAudioContext()
    ctx.src = AUDIO_BASE + file
    return ctx
  },

  onTapVehicle(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const v = VEHICLES[idx]
    const ctx = this._audios[v.sound]
    if (ctx) {
      try { ctx.stop() } catch (_) {}
      ctx.play()
    }
    if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
    // 先复位再触发，保证连击也重新播放动画
    this.setData({ activeIndex: -1 })
    if (this._activeTimer) clearTimeout(this._activeTimer)
    this._activeTimer = setTimeout(() => this.setData({ activeIndex: idx }), 16)
  },

  onUnload() {
    if (this._activeTimer) clearTimeout(this._activeTimer)
    this._activeTimer = null
    if (this._audios) {
      Object.keys(this._audios).forEach((k) => {
        try { this._audios[k].destroy() } catch (_) {}
      })
      this._audios = null
    }
  }
})
