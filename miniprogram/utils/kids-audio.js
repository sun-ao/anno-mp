// 儿童工具共享音效库：WebAudio 实时合成（免音频文件，基础库 2.19.0+）
let ctx = null
let noiseBuffer = null

function ensureCtx() {
  if (ctx) return ctx
  try {
    if (wx.createWebAudioContext) ctx = wx.createWebAudioContext()
  } catch (e) {
    ctx = null
  }
  return ctx
}

function resume(c) {
  if (c.state === 'suspended' && typeof c.resume === 'function') c.resume()
}

function getNoiseBuffer(c) {
  if (noiseBuffer) return noiseBuffer
  const len = Math.floor(c.sampleRate * 0.2)
  noiseBuffer = c.createBuffer(1, len, c.sampleRate)
  const data = noiseBuffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  return noiseBuffer
}

// 单音符：振荡器 + 音量包络
function tone(c, freq, start, dur, type, peak) {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type || 'sine'
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(peak || 0.5, start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.001, start + dur)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(start)
  osc.stop(start + dur + 0.05)
  return osc
}

// 噪声爆发（爆破/冲击）
function noiseBurst(c, start, dur, freq, gain, q) {
  const src = c.createBufferSource()
  src.buffer = getNoiseBuffer(c)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq
  bp.Q.value = q || 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(gain, start)
  g.gain.exponentialRampToValueAtTime(0.001, start + dur)
  src.connect(bp)
  bp.connect(g)
  g.connect(c.destination)
  src.start(start, 0, dur + 0.05)
}

function guard(fn) {
  const c = ensureCtx()
  if (!c) return
  try {
    resume(c)
    fn(c, c.currentTime)
  } catch (e) {
    // 静默降级
  }
}

// ===== 具体音效 =====

// 木琴音（清脆正弦 + 轻微泛音）
function playNote(freq) {
  guard((c, t) => {
    tone(c, freq, t, 0.7, 'sine', 0.55)
    tone(c, freq * 2, t, 0.3, 'sine', 0.12)
  })
}

// 泡泡/气泡破：短促"啵"
function playPop() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(900, t)
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.08)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.12)
    noiseBurst(c, t, 0.05, 1800, 0.15, 1)
  })
}

// 轻快"咚/啵"（地鼠、躲猫猫、数数）
function playBoop(pitch) {
  guard((c, t) => {
    const f = pitch || 520
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, t)
    osc.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.07)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.2)
  })
}

// 恐龙吼：低频锯齿下滑 + 噪声
function playRoar() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, t)
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.5)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.06)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.65)
    noiseBurst(c, t, 0.4, 300, 0.2, 0.6)
  })
}

// 车喇叭（双音）
function playHorn() {
  guard((c, t) => {
    tone(c, 440, t, 0.22, 'square', 0.28)
    tone(c, 554, t, 0.22, 'square', 0.28)
  })
}

// 引擎轰鸣（低噪声）
function playEngine() {
  guard((c, t) => {
    noiseBurst(c, t, 0.5, 140, 0.35, 0.5)
    tone(c, 90, t, 0.5, 'sawtooth', 0.2)
  })
}

// 警笛（两音交替）
function playSiren() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(700, t)
    osc.frequency.linearRampToValueAtTime(950, t + 0.2)
    osc.frequency.linearRampToValueAtTime(700, t + 0.4)
    g.gain.setValueAtTime(0.3, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.5)
  })
}

// 爆破/爆炸（烟花、气球爆）
function playBang() {
  guard((c, t) => {
    noiseBurst(c, t, 0.25, 900, 0.5, 0.5)
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.3)
  })
}

// 烟花升空"咻"
function playWhoosh() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(300, t)
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.35)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.4)
  })
}

// 欢呼庆祝（上行琶音）
function playTada() {
  guard((c, t) => {
    const notes = [523, 659, 784, 1047]
    notes.forEach((f, i) => tone(c, f, t + i * 0.11, 0.35, 'sine', 0.4))
  })
}

// 气球充气"吱"
function playInflate() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, t)
    osc.frequency.linearRampToValueAtTime(700, t + 0.25)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.35)
  })
}

// 气球飞走"呜~"
function playDeflate() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, t)
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.5)
    g.gain.setValueAtTime(0.3, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.55)
  })
}

// 答对（清脆上行两音）
function playCorrect() {
  guard((c, t) => {
    tone(c, 784, t, 0.25, 'sine', 0.4)
    tone(c, 1047, t + 0.12, 0.35, 'sine', 0.4)
  })
}

// 再试试（温柔低音，不刺耳）
function playWrong() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(260, t)
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.25)
    g.gain.setValueAtTime(0.25, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.35)
  })
}

// ===== 动物叫声（儿童声音玩具） =====

// 猫叫：先上滑后下滑的"喵~"
function playMeow() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(620, t)
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.12)
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.4)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.46)
  })
}

// 狗叫：低沉短促的两声"汪"
function playWoof() {
  guard((c, t) => {
    const bark = (start) => {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(220, start)
      osc.frequency.exponentialRampToValueAtTime(120, start + 0.1)
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.5, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.13)
      osc.connect(g); g.connect(c.destination)
      osc.start(start); osc.stop(start + 0.16)
    }
    bark(t)
    bark(t + 0.18)
  })
}

// 牛叫：低沉绵长的"哞~"
function playMoo() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(220, t)
    osc.frequency.linearRampToValueAtTime(180, t + 0.2)
    osc.frequency.linearRampToValueAtTime(150, t + 0.5)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.05)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.64)
  })
}

// 鸭子叫：两声带颤的"嘎嘎"
function playQuack() {
  guard((c, t) => {
    const quack = (start) => {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(360, start)
      osc.frequency.exponentialRampToValueAtTime(240, start + 0.09)
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.35, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.1)
      osc.connect(g); g.connect(c.destination)
      osc.start(start); osc.stop(start + 0.12)
    }
    quack(t)
    quack(t + 0.14)
  })
}

// 小鸡叫：高频短"叽叽"
function playCluck() {
  guard((c, t) => {
    noiseBurst(c, t, 0.04, 2600, 0.25, 1)
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(900, t)
    osc.frequency.exponentialRampToValueAtTime(1300, t + 0.05)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.08)
  })
}

// 绵羊叫：带颤音的"咩~"
function playBleat() {
  guard((c, t) => {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(450, t)
    // 颤音
    const lfo = c.createOscillator()
    const lfoG = c.createGain()
    lfo.frequency.value = 18
    lfoG.gain.value = 40
    lfo.connect(lfoG); lfoG.connect(osc.frequency)
    osc.frequency.exponentialRampToValueAtTime(380, t + 0.35)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    osc.connect(g); g.connect(c.destination)
    osc.start(t); osc.stop(t + 0.44)
    lfo.start(t); lfo.stop(t + 0.44)
  })
}

module.exports = {
  playNote, playPop, playBoop, playRoar, playHorn, playEngine,
  playSiren, playBang, playWhoosh, playTada, playInflate, playDeflate,
  playCorrect, playWrong,
  // 动物叫声
  playMeow, playWoof, playMoo, playQuack, playCluck, playBleat
}
