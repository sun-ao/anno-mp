// WebAudio 合成番茄钟提示音（无需音频文件，基础库 2.19.0+）
let ctx = null

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

// 单个钟声音符
function chime(c, t, freq, dur) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, t)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.02)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

// 专注完成：上扬的两声"叮—咚"
function playFocusDone() {
  const c = ensureCtx()
  if (!c) return
  try {
    if (c.state === 'suspended' && typeof c.resume === 'function') c.resume()
    const t = c.currentTime
    chime(c, t, 660, 0.5)
    chime(c, t + 0.22, 880, 0.7)
  } catch (e) {
    // 静默降级
  }
}

// 休息结束：轻快的三声
function playRestDone() {
  const c = ensureCtx()
  if (!c) return
  try {
    if (c.state === 'suspended' && typeof c.resume === 'function') c.resume()
    const t = c.currentTime
    chime(c, t, 523, 0.35)
    chime(c, t + 0.18, 659, 0.35)
    chime(c, t + 0.36, 784, 0.55)
  } catch (e) {
    // 静默降级
  }
}

module.exports = { playFocusDone, playRestDone }
