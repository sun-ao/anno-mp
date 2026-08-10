const { getPopped, addPopped, resetPopped } = require('../../model/balloon')
const { playBang, playDeflate, playInflate } = require('../../../../utils/kids-audio')

const MIN = 1
const MAX = 3.2
const STEP = 0.05
const WARN = 0.8 // 危险阈值（占 MAX 的比例）

Page({
  data: {
    size: MIN,
    holding: false,
    popped: false,
    flying: false,
    poppedCount: 0,
    risk: 0, // 0~1 充气进度，给压力表用
    danger: false, // 临近爆炸
    flyStyle: '' // 放飞时的内联动画（方向 + 时长）
  },

  onLoad() {
    this._canStart = true // 同一次按住只充一次气，防止节点重建后重复触发
    this._destroyed = false
    this.setData({ poppedCount: getPopped() })
  },

  onShow() {
    this._destroyed = false
  },

  onHide() {
    this._cleanup()
  },

  onUnload() {
    this._cleanup()
  },

  // 离开页面（含返回上一级）彻底清掉所有定时器，杜绝“还在炸”
  _cleanup() {
    this._destroyed = true
    this._stopInflate()
    if (this._resetTimer) {
      clearTimeout(this._resetTimer)
      this._resetTimer = null
    }
  },

  onClear() {
    if (this.data.holding || this.data.popped || this.data.flying) return
    wx.showModal({
      title: '清空记录',
      content: '确定要把吹爆的气球次数清零吗？',
      confirmText: '清空',
      confirmColor: '#D9455F',
      success: (res) => {
        if (res.confirm) {
          this.setData({ poppedCount: resetPopped() })
        }
      }
    })
  },

  onInflateStart() {
    if (!this._canStart) return // 已按住 / 刚爆过，本次手指不再重复启动
    if (this.data.popped || this.data.flying) return
    this._canStart = false
    this.setData({ holding: true })
    playInflate()
    this._inflateTimer = setInterval(() => {
      if (this._destroyed) {
        this._stopInflate()
        return
      }
      const size = this.data.size + STEP
      if (size >= MAX) {
        this._pop()
        return
      }
      const risk = (size - MIN) / (MAX - MIN)
      this.setData({ size, risk, danger: risk >= WARN })
    }, 50)
  },

  onInflateEnd() {
    this._canStart = true // 手指抬起，恢复可再次充气
    this._stopInflate()
    if (!this.data.holding) return
    this.setData({ holding: false })
    if (this.data.popped || this.data.flying) return
    this._flyAway()
  },

  _stopInflate() {
    if (this._inflateTimer) {
      clearInterval(this._inflateTimer)
      this._inflateTimer = null
    }
  },

  _pop() {
    this._stopInflate()
    this._canStart = false
    playBang()
    if (wx.vibrateShort) wx.vibrateShort({ type: 'heavy' })
    const poppedCount = addPopped()
    this.setData({ popped: true, holding: false, danger: false, risk: 1, poppedCount })
    if (this._resetTimer) clearTimeout(this._resetTimer)
    this._resetTimer = setTimeout(() => {
      if (this._destroyed) return
      this.setData({ popped: false, size: MIN, risk: 0, danger: false })
    }, 700)
  },

  _flyAway() {
    playDeflate()
    // 越大飞越久、越小飞越短
    const ratio = (this.data.size - MIN) / (MAX - MIN)
    const dur = 0.6 + ratio * 2.0
    // 随机方向：水平任意、竖直主要向上但可偏，真正“到处飞”
    const dx = (Math.random() * 2 - 1) * 70 // -70vw ~ 70vw
    const dy = -30 - Math.random() * 60 // -30vh ~ -90vh
    const rot = (Math.random() * 2 - 1) * 60 // -60° ~ 60°
    const flyStyle =
      `--dx:${dx.toFixed(1)}vw; --dy:${dy.toFixed(1)}vh; --rot:${rot.toFixed(0)}deg; ` +
      `--s:${this.data.size.toFixed(2)}; animation: balloonFly ${dur.toFixed(2)}s ease-in forwards;`
    this.setData({ flying: true, flyStyle, holding: false, danger: false, risk: 0 })
    if (this._resetTimer) clearTimeout(this._resetTimer)
    this._resetTimer = setTimeout(() => {
      if (this._destroyed) return
      this.setData({ flying: false, size: MIN, flyStyle: '' })
    }, dur * 1000 + 120)
  }
})
