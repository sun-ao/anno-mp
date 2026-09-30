// WebAudio 合成番茄钟提示音（无需音频文件，基础库 2.19.0+）
// ctx 管理与单音符包络复用主包共享音效库 kids-audio 的原语（原先 ensureCtx/chime 各写一份）。
const { ensureCtx, resume, tone } = require('../../../utils/kids-audio')

// 专注完成：上扬的两声"叮—咚"
function playFocusDone() {
  const c = ensureCtx()
  if (!c) return
  try {
    resume(c)
    const t = c.currentTime
    tone(c, 660, t, 0.5)
    tone(c, 880, t + 0.22, 0.7)
  } catch (e) {
    // 静默降级
  }
}

// 休息结束：轻快的三声
function playRestDone() {
  const c = ensureCtx()
  if (!c) return
  try {
    resume(c)
    const t = c.currentTime
    tone(c, 523, t, 0.35)
    tone(c, 659, t + 0.18, 0.35)
    tone(c, 784, t + 0.36, 0.55)
  } catch (e) {
    // 静默降级
  }
}

module.exports = { playFocusDone, playRestDone }
