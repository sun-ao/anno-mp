// WebAudio 合成木鱼敲击声（无需音频文件，基础库 2.19.0+）
let ctx = null
let noiseBuffer = null

function ensureCtx() {
  if (ctx) return ctx
  try {
    if (wx.createWebAudioContext) {
      ctx = wx.createWebAudioContext()
    }
  } catch (e) {
    ctx = null
  }
  return ctx
}

// 敲击噪声缓冲（木质冲击感）
function getNoiseBuffer(c) {
  if (noiseBuffer) return noiseBuffer
  const len = Math.floor(c.sampleRate * 0.06)
  noiseBuffer = c.createBuffer(1, len, c.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

function playKnock() {
  const c = ensureCtx()
  if (!c) return
  try {
    if (c.state === 'suspended' && typeof c.resume === 'function') {
      c.resume()
    }
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
    const src = c.createBufferSource()
    src.buffer = getNoiseBuffer(c)
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2200
    bp.Q.value = 0.8
    const g2 = c.createGain()
    g2.gain.setValueAtTime(0.3, t)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    src.connect(bp)
    bp.connect(g2)
    g2.connect(c.destination)
    src.start(t, 0, 0.06)
  } catch (e) {
    // 音频不可用时静默降级，不影响敲击交互
  }
}

module.exports = { playKnock }
