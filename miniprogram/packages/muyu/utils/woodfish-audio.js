// WebAudio 合成木鱼敲击声（无需音频文件，基础库 2.19.0+）
// ctx/噪声缓冲管理复用主包共享音效库 kids-audio 的原语，此处只保留木鱼音色本身。
const { ensureCtx, resume, noiseBurst } = require('../../../utils/kids-audio')

function playKnock() {
  const c = ensureCtx()
  if (!c) return
  try {
    resume(c)
    const t = c.currentTime

    // 主音：木鱼腔体共振，短促圆润的"笃"
    const osc = c.createOscillator()
    const g1 = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(620, t)
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.06)
    g1.gain.setValueAtTime(0.85, t)
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    osc.connect(g1)
    g1.connect(c.destination)
    osc.start(t)
    osc.stop(t + 0.15)

    // 敲击噪声：高频冲击成分，比主音更短
    noiseBurst(c, t, 0.05, 2200, 0.3, 0.8)
  } catch (e) {
    // 音频不可用时静默降级，不影响敲击交互
  }
}

module.exports = { playKnock }
