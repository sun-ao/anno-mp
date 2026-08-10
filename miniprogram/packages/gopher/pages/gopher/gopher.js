const { getWhacked, addWhacked, resetWhacked } = require('../../model/gopher')
const { playBoop, playWrong } = require('../../../../utils/kids-audio')

const ANIMALS = ['🐹', '🐰', '🐭', '🐿️']
// 节奏放慢，给小孩充足反应时间
const VISIBLE_MS = 1800 // 动物停留时长
const GAP_MS = 900 // 两只之间的间隔

Page({
  data: {
    holes: [],
    whacked: 0,
    target: ANIMALS[0],
    wrongId: -1
  },

  onLoad() {
    this._hideTimers = {}
    const holes = Array.from({ length: 9 }, (_, i) => ({ id: i, animal: '', up: false }))
    this.setData({ holes, whacked: getWhacked(), target: this._pickTarget() })
    this._loop()
  },

  _pickTarget() {
    return ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  },

  // 自调度循环：每次只冒一只，停留 VISIBLE_MS，间隔 GAP_MS 再冒下一只
  _loop() {
    this._spawn()
    this._loopTimer = setTimeout(() => this._loop(), VISIBLE_MS + GAP_MS)
  },

  _spawn() {
    // 同一时刻只冒一只，节奏更从容
    if (this.data.holes.some((h) => h.up)) return
    const empty = this.data.holes.filter((h) => !h.up)
    if (empty.length === 0) return
    const hole = empty[Math.floor(Math.random() * empty.length)]
    // 六成概率冒「目标动物」，其余冒干扰动物，引导看提示再出手
    let animal
    if (Math.random() < 0.6) {
      animal = this.data.target
    } else {
      const others = ANIMALS.filter((a) => a !== this.data.target)
      animal = others[Math.floor(Math.random() * others.length)]
    }
    this.setData({
      holes: this.data.holes.map((h) => (h.id === hole.id ? { ...h, up: true, animal } : h))
    })
    this._hideTimers[hole.id] = setTimeout(() => this._hide(hole.id), VISIBLE_MS)
  },

  onWhack(e) {
    const id = Number(e.currentTarget.dataset.id)
    const hole = this.data.holes[id]
    if (!hole || !hole.up) return
    if (hole.animal === this.data.target) {
      // 打中目标动物
      playBoop(600)
      if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
      const whacked = addWhacked()
      this._hide(id)
      this.setData({ whacked, target: this._pickTarget() })
    } else {
      // 打错动物：提示要看清目标再打
      playWrong()
      this.setData({ wrongId: -1 })
      this._wrongTimer = setTimeout(() => this.setData({ wrongId: id }), 16)
      this._wrongClearTimer = setTimeout(() => this.setData({ wrongId: -1 }), 500)
    }
  },

  _hide(id) {
    if (this._hideTimers[id]) {
      clearTimeout(this._hideTimers[id])
      delete this._hideTimers[id]
    }
    this.setData({
      holes: this.data.holes.map((h) => (h.id === id ? { ...h, up: false } : h))
    })
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          resetWhacked()
          this.setData({ whacked: 0 })
        }
      }
    })
  },

  onUnload() {
    clearTimeout(this._loopTimer)
    Object.keys(this._hideTimers).forEach((k) => clearTimeout(this._hideTimers[k]))
    this._hideTimers = {}
    if (this._wrongTimer) clearTimeout(this._wrongTimer)
    if (this._wrongClearTimer) clearTimeout(this._wrongClearTimer)
  }
})
