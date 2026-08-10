const { getTotal, addTotal, resetTotal } = require('../../model/popwrap')
const { playPop, playTada, playWrong } = require('../../../../utils/kids-audio')

const TOTAL = 30

// 5 种高辨识度颜色，供随机上色 + 指定颜色提示
const COLORS = [
  { key: 'red', name: '红色' },
  { key: 'yellow', name: '黄色' },
  { key: 'green', name: '绿色' },
  { key: 'blue', name: '蓝色' },
  { key: 'purple', name: '紫色' }
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function makeSheet() {
  return Array.from({ length: TOTAL }, (_, i) => ({
    id: i,
    color: pick(COLORS).key,
    popped: false
  }))
}

// 从当前盘面里实际存在的颜色里挑一个当目标，保证一定捏得到
function pickTarget(sheet) {
  const present = [...new Set(sheet.map((c) => c.color))]
  return COLORS.find((c) => c.key === pick(present))
}

Page({
  data: {
    sheet: [],
    target: {},
    poppedLeft: TOTAL,
    total: 0
  },

  onLoad() {
    const sheet = makeSheet()
    this.setData({ sheet, target: pickTarget(sheet), total: getTotal() })
  },

  onTapCell(e) {
    const id = e.currentTarget.dataset.id
    const sheet = this.data.sheet
    const cell = sheet[id]
    if (!cell || cell.popped) return
    const target = this.data.target

    // 捏错颜色 -> 全部重置重来
    if (cell.color !== target.key) {
      playWrong()
      if (wx.vibrateShort) wx.vibrateShort({ type: 'heavy' })
      wx.showToast({ title: '捏错啦，重来！', icon: 'none' })
      const fresh = makeSheet()
      this.setData({ sheet: fresh, poppedLeft: TOTAL, target: pickTarget(fresh) })
      return
    }

    // 捏对指定颜色
    playPop()
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    const total = addTotal()
    const newSheet = sheet.map((c) => (c.id === id ? { ...c, popped: true } : c))
    const poppedLeft = newSheet.filter((c) => !c.popped).length

    // 该颜色的泡泡都捏完了，换下一个目标色（盘面还有别的颜色就继续）
    let nextTarget = target
    const targetRemain = newSheet.some((c) => !c.popped && c.color === target.key)
    if (!targetRemain) {
      const remaining = [...new Set(newSheet.filter((c) => !c.popped).map((c) => c.color))]
      if (remaining.length) nextTarget = COLORS.find((c) => c.key === remaining[0])
    }

    this.setData({ sheet: newSheet, total, poppedLeft, target: nextTarget })

    if (poppedLeft === 0) {
      this._refillTimer = setTimeout(() => {
        playTada()
        wx.showToast({ title: '捏完啦，换一张！', icon: 'none' })
        const fresh = makeSheet()
        this.setData({ sheet: fresh, poppedLeft: TOTAL, target: pickTarget(fresh) })
      }, 500)
    }
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          resetTotal()
          this.setData({ total: 0 })
        }
      }
    })
  },

  onUnload() {
    if (this._refillTimer) clearTimeout(this._refillTimer)
  }
})
