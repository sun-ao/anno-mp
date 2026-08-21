const { TEACH, MORSE, encode, playMorse } = require('../../model/morse')

// 把 TEACH 转成带 code 的结构，便于 wxml 渲染
const GROUPS = TEACH.groups.map(function (g) {
  // 含多字母短语（如 HELLO）时改用更宽的 3 列布局，避免文字溢出背景框
  const wide = g.items.some(function (ch) { return ch.length > 1 })
  return {
    name: g.name,
    wide: wide,
    items: g.items.map(function (ch) {
      // 短语按整体编码，字母/数字按单字符编码
      const code = ch.length > 1 ? encode(ch) : MORSE[ch]
      return { ch: ch, code: code }
    })
  }
})

Page({
  data: {
    groups: GROUPS,
    activeChar: '',
    // 转换器（文本 -> 摩斯）
    text: '',
    morseOut: ''
  },

  onTapChar(e) {
    const ch = e.currentTarget.dataset.ch
    if (!ch) return
    this.setData({ activeChar: ch })
    playMorse(ch)
    const that = this
    setTimeout(function () { if (that.data.activeChar === ch) that.setData({ activeChar: '' }) }, 700)
  },

  onTextInput(e) {
    const text = e.detail.value || ''
    this.setData({ text: text, morseOut: encode(text) })
  },

  onPlayMorse() {
    if (!this.data.morseOut) {
      wx.showToast({ title: '先输入文本', icon: 'none' })
      return
    }
    playMorse(this.data.morseOut)
  },

  // 跳到手指敲击解码页（若本页来自该页则返回，避免栈叠加）
  onGoTap() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
    } else {
      wx.navigateTo({ url: '/packages/morse/pages/tap/tap' })
    }
  }
})
