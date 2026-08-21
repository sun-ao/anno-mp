// 摩斯密码：码表 + 编解码 + 滴答声（WebAudio 实时合成，无音频文件）
// 约定：点 = .(dit)  划 = -(dah)

const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.',
  H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.',
  O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-',
  V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
}

// 反查表：摩斯码 -> 字符
const REVERSE = {}
Object.keys(MORSE).forEach(function (ch) { REVERSE[MORSE[ch]] = ch })

// 常用码：首屏教学（字母 + 数字 + 常用词）
const TEACH = {
  title: '常用码',
  groups: [
    { name: '字母 A–M', items: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'] },
    { name: '字母 N–Z', items: ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'] },
    { name: '数字 0–9', items: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] },
    { name: '常用词 / 短语', items: ['SOS', 'OK', 'HELP', 'HI', 'YES', 'NO', 'LOVE', 'HELLO'] }
  ]
}

// 文本 -> 摩斯。单词间用 " / " 分隔，字母间用空格分隔
function encode(text) {
  if (!text) return ''
  return String(text)
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(function (word) {
      return word
        .split('')
        .map(function (ch) { return MORSE[ch] || '' })
        .filter(Boolean)
        .join(' ')
    })
    .join(' / ')
}

// 摩斯 -> 文本。" / " 分词，空格分字母
function decode(morse) {
  if (!morse) return ''
  return String(morse)
    .trim()
    .split(/\s*\/\s*/)
    .map(function (word) {
      return word
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(function (code) { return REVERSE[code] || '?' })
        .join('')
    })
    .join(' ')
}

// ---------- 滴答声（WebAudio） ----------
let _ctx = null
function ensureCtx() {
  if (_ctx) return _ctx
  try {
    if (wx.createWebAudioContext) _ctx = wx.createWebAudioContext()
  } catch (e) {
    _ctx = null
  }
  return _ctx
}
function resume(c) {
  if (c && c.state === 'suspended' && typeof c.resume === 'function') c.resume()
}

// 播放单个符号：dot 短、dash 长。返回该符号占用时长(ms)
function beep(c, kind, at, dotMs) {
  const dur = (kind === '-' ? dotMs * 3 : dotMs) / 1000
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(620, at) // 摩斯常用音频 ~620Hz
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(0.5, at + 0.012)
  g.gain.exponentialRampToValueAtTime(0.001, at + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.05)
  return dur * 1000
}

// 播放一段摩斯码字符串（含 . - 和空格 /）。onStep(已播放字符索引) 可选用于高亮
// code 形如 ".- / ..." 或 "SOS"(会自动 encode)
function playMorse(code, opts) {
  opts = opts || {}
  const c = ensureCtx()
  if (!c) return false
  resume(c)
  let raw = code
  // 若传入的是明文（无 . - 空格），尝试 encode
  if (raw && !/[.\-\s]/.test(raw)) raw = encode(raw)
  const dotMs = 110
  const symGap = dotMs // 符号间隔 = 1 点
  const letterGap = dotMs * 3 // 字母间隔 = 3 点
  const wordGap = dotMs * 7 // 单词间隔 = 7 点
  let t = c.currentTime + 0.05
  const chars = String(raw).split('')
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (ch === '.') {
      beep(c, '.', t, dotMs); t += dotMs / 1000 + symGap / 1000
    } else if (ch === '-') {
      beep(c, '-', t, dotMs); t += (dotMs * 3) / 1000 + symGap / 1000
    } else if (ch === ' ') {
      t += (letterGap - symGap) / 1000 // 已有一个 symGap，补到 letterGap
    } else if (ch === '/') {
      t += (wordGap - symGap) / 1000
    }
    if (opts.onStep) {
      const idx = i
      setTimeout(function () { opts.onStep(idx, ch) }, (t - c.currentTime) * 1000)
    }
  }
  return true
}

module.exports = {
  MORSE: MORSE,
  REVERSE: REVERSE,
  TEACH: TEACH,
  encode: encode,
  decode: decode,
  playMorse: playMorse
}
