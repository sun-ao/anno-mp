const { REVERSE, playMorse } = require('../../model/morse')

// 识别阈值（毫秒）
const DOT_MAX = 300 // 按压 < 300ms 记「点(·)」，否则「划(−)」
const LETTER_GAP = 1000 // 松手后停顿 1s → 结束当前字母
const WORD_GAP = 2500 // 松手后停顿 2.5s → 加一个空格

Page({
  data: {
    symbols: '', // 正在拼的字母（如 ".-"）
    current: '', // 当前字母预览（符号 + 可能的解码）
    decodedText: '', // 已解码文本
    pressing: false,
    pressKind: '' // 'dot' | 'dash' 上次按键类型，用于高亮反馈
  },

  onLoad() {
    this.letterTimer = null
    this.wordTimer = null
    this.pressStart = 0
    this._chars = [] // 已解码字符（仅逻辑用，不进 data，减小 setData 负载）
  },

  // 按下：记录起始时间，清掉待定定时器
  onTouchStart() {
    if (this.data.pressing) return // 忽略多点触控
    this.pressStart = Date.now()
    if (this.letterTimer) clearTimeout(this.letterTimer)
    if (this.wordTimer) clearTimeout(this.wordTimer)
    this.setData({ pressing: true, pressKind: '' })
  },

  // 松手：根据按压时长判定点/划，更新拼字，并排定字母/单词间隔定时器
  onTouchEnd() {
    if (!this.data.pressing) return
    const dur = Date.now() - this.pressStart
    const isDot = dur < DOT_MAX
    const sym = isDot ? '.' : '-'
    const symbols = this.data.symbols + sym

    if (wx.vibrateShort) {
      try { wx.vibrateShort({ type: 'light' }) } catch (e) {}
    }

    if (this.letterTimer) clearTimeout(this.letterTimer)
    const that = this
    this.letterTimer = setTimeout(function () { that.commitLetter() }, LETTER_GAP)
    this.wordTimer = setTimeout(function () { that.maybeWord() }, WORD_GAP)

    this.setData({
      pressing: false,
      pressKind: isDot ? 'dot' : 'dash',
      symbols: symbols,
      current: this.preview(symbols)
    })
  },

  // 提交当前字母
  commitLetter() {
    if (!this.data.symbols) return
    const ch = REVERSE[this.data.symbols] || '?'
    this._chars = this._chars.concat(ch)
    this.setData({ symbols: '', current: '', decodedText: this._chars.join('') })
  },

  // 长时间停顿 → 补一个空格（仅在没有空格结尾时）
  maybeWord() {
    if (this.data.pressing) return
    this.commitLetter()
    if (this._chars.length && this._chars[this._chars.length - 1] !== ' ') {
      this._chars = this._chars.concat(' ')
      this.setData({ decodedText: this._chars.join('') })
    }
  },

  // 撤销：先撤销正在拼的符号，否则撤销最后一个解码字符
  onUndo() {
    if (this.letterTimer) clearTimeout(this.letterTimer)
    if (this.wordTimer) clearTimeout(this.wordTimer)
    let symbols = this.data.symbols
    let chars = this._chars
    if (symbols.length > 0) {
      symbols = symbols.slice(0, -1)
    } else if (chars.length > 0) {
      chars = chars.slice(0, -1)
    }
    this._chars = chars
    this.setData({
      symbols: symbols,
      current: this.preview(symbols),
      decodedText: chars.join('')
    })
  },

  onClear() {
    if (this.letterTimer) clearTimeout(this.letterTimer)
    if (this.wordTimer) clearTimeout(this.wordTimer)
    this._chars = []
    this.setData({ symbols: '', current: '', decodedText: '' })
  },

  onPlay() {
    const text = this.data.decodedText
    if (!text) {
      wx.showToast({ title: '还没有内容', icon: 'none' })
      return
    }
    playMorse(text)
  },

  onCopy() {
    const text = this.data.decodedText
    if (!text) {
      wx.showToast({ title: '还没有内容', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: text })
  },

  // 跳到码表教学页
  onGoRef() {
    wx.navigateTo({ url: '/packages/morse/pages/ref/ref' })
  },

  // 当前拼字预览：符号 + 可能的解码
  preview(symbols) {
    if (!symbols) return ''
    const ch = REVERSE[symbols]
    return symbols + (ch ? ' → ' + ch : '')
  },

  onHide() {
    if (this.letterTimer) clearTimeout(this.letterTimer)
    if (this.wordTimer) clearTimeout(this.wordTimer)
  },

  onUnload() {
    if (this.letterTimer) clearTimeout(this.letterTimer)
    if (this.wordTimer) clearTimeout(this.wordTimer)
  }
})
