const { getLevelBest, saveLevelBest, resetBest } = require('../../model/rocket')
const { playPop, playWrong, playTada } = require('../../../../utils/kids-audio')

const FIELD_W = 750 // rpx 场地宽
const GOOD = ['⭐'] // 星星：只掉这一种，接住 +1
const BAD = ['🌙', '☀️', '☁️', '🪐', '☄️', '⚡'] // 其他天体：接住暂停 3 秒
const PAUSE_MS = 3000 // 接错暂停时长
const CATCHER_TOP = 860 // rpx 手掌顶部位置
const CATCHER_W = 140 // rpx 手掌宽度
const ITEM_W = 96 // rpx 天体尺寸
const ITEM_GAP = 130 // rpx 天体之间最小水平间距（防重叠）
const MAX_ONSCREEN = 4 // 同屏最多 4 个，保证画面稀疏不重叠
const POP_LIFE = 900 // ms "+1" 飘字存活时间

Page({
  data: {
    level: 1,
    target: 5,
    score: 0,
    timerText: '0:00',
    bestText: '--',
    paused: false,
    pausedLeft: 0,
    catcherX: 305,
    items: [],
    pops: [],
    over: false,
    finalText: '',
    newRecord: false
  },

  onLoad() {
    this._startGame(1)
  },

  // 关卡递增：第 1 关接 5 颗，每关 +1，封顶 10 颗；速度与坏天体比例随关卡上升
  _startGame(level) {
    this._locked = false
    this._pausedUntil = 0
    this._startTime = Date.now()
    const target = Math.min(4 + level, 10)
    this._speed = Math.min(1.5, 1 + (level - 1) * 0.06)
    const best = getLevelBest(level)
    this.setData({
      level,
      target,
      score: 0,
      timerText: '0:00',
      bestText: best ? this._fmtMs(best) : '--',
      paused: false,
      pausedLeft: 0,
      items: [],
      pops: [],
      over: false,
      finalText: '',
      newRecord: false
    })
    this._goodStreak = 0
    this._badStreak = 0
    this._spawnTimer = setTimeout(() => this._spawn(), 300)
    this._tickTimer = setInterval(() => this._tick(), 50)
  },

  _fmtMs(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  },

  // 关卡越高，坏天体越多（55% → 70% 封顶）：星星占比低，躲开其他天体才有挑战
  _badRatio() {
    return Math.min(0.7, 0.55 + (this.data.level - 1) * 0.03)
  },

  // 生成间隔随机（400~1000ms），节奏不规律；关卡越高间隔略短
  _randDelay() {
    const base = Math.max(380, 500 - (this.data.level - 1) * 30)
    return base + Math.random() * 500
  },

  // 循环生成：每次生成后随机排下一次；暂停期间推迟，恢复后自动继续
  _spawn() {
    if (this._locked) return
    const now = Date.now()
    if (now < this._pausedUntil) {
      this._spawnTimer = setTimeout(() => this._spawn(), this._pausedUntil - now + 50)
      return
    }
    this._spawnItem()
    this._spawnTimer = setTimeout(() => this._spawn(), this._randDelay())
  },

  // 防连发：连续星最多 2 颗（不爆星），连续坏最多 6 个（不让人干等）
  _nextIsGood() {
    if (this._badStreak >= 6) {
      this._badStreak = 0
      this._goodStreak = 1
      return true
    }
    if (this._goodStreak >= 2) {
      this._goodStreak = 0
      this._badStreak = 1
      return false
    }
    const good = Math.random() >= this._badRatio()
    if (good) { this._goodStreak += 1; this._badStreak = 0 }
    else { this._badStreak += 1; this._goodStreak = 0 }
    return good
  },

  _spawnItem() {
    if (this._locked || Date.now() < this._pausedUntil) return
    // 同屏已满则跳过本次生成，保证画面不拥挤
    if (this.data.items.length >= MAX_ONSCREEN) return
    // 生成位置与在屏天体保持最小水平间距，避免重叠（最多重试 12 次）
    let x = 40 + Math.random() * (FIELD_W - 160)
    for (let i = 0; i < 12; i++) {
      let clash = false
      for (let j = 0; j < this.data.items.length; j++) {
        if (Math.abs(this.data.items[j].x - x) < ITEM_GAP) {
          clash = true
          break
        }
      }
      if (!clash) break
      x = 40 + Math.random() * (FIELD_W - 160)
    }
    const isGood = this._nextIsGood()
    const item = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      emoji: isGood ? GOOD[0] : BAD[Math.floor(Math.random() * BAD.length)],
      good: isGood,
      x,
      y: -60,
      vy: (4 + Math.random() * 2) * this._speed // rpx / 50ms
    }
    this.setData({ items: this.data.items.concat(item) })
  },

  _tick() {
    if (this._locked) return
    const now = Date.now()

    // 正计时：任何时候都在走（暂停 3 秒也算进用时）
    const t = this._fmtMs(now - this._startTime)
    if (t !== this.data.timerText) this.setData({ timerText: t })

    // 暂停中：只刷新"几秒后继续"
    if (now < this._pausedUntil) {
      const left = Math.ceil((this._pausedUntil - now) / 1000)
      if (left !== this.data.pausedLeft) this.setData({ pausedLeft: left })
      return
    }
    if (this.data.paused) this.setData({ paused: false, pausedLeft: 0 })

    const cx = this.data.catcherX
    const center = cx + CATCHER_W / 2
    let score = this.data.score
    const pops = this.data.pops.filter((p) => now - p.born < POP_LIFE)
    const items = []
    for (let i = 0; i < this.data.items.length; i++) {
      const s = this.data.items[i]
      const y = s.y + s.vy
      // 掉出底部
      if (y > 1100) continue
      // 碰到手掌：天体中心点进入手掌高度，且与手掌中心横向接近
      if (y + ITEM_W / 2 > CATCHER_TOP && Math.abs(s.x + ITEM_W / 2 - center) < 95) {
        if (s.good) {
          playPop()
          score += 1
          pops.push({ id: `p${now}-${i}`, x: s.x, y: CATCHER_TOP - 60, born: now })
        } else {
          // 接住坏天体：暂停 3 秒（用时照走）
          playWrong()
          try {
            wx.vibrateShort({ type: 'medium' })
          } catch (e) {
            // 静默
          }
          this._pausedUntil = now + PAUSE_MS
          this.setData({ paused: true, pausedLeft: 3 })
        }
        continue
      }
      items.push({ ...s, y })
    }
    this.setData({ items, pops, score })
    // 接满目标：过关
    if (score >= this.data.target) {
      this._win(now)
      return
    }
  },

  _win(now) {
    this._locked = true
    this._stopTimers()
    playTada()
    const ms = now - this._startTime
    const { best, isNew } = saveLevelBest(this.data.level, ms)
    this.setData({
      over: true,
      finalText: this._fmtMs(ms),
      bestText: this._fmtMs(best),
      newRecord: isNew
    })
    this._nextTimer = setTimeout(() => this._startGame(this.data.level + 1), 2800)
  },

  onTouchMove(e) {
    if (this._locked) return
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const w = wx.getSystemInfoSync().windowWidth || 375
    const x = (touch.clientX / w) * FIELD_W - CATCHER_W / 2
    this.setData({ catcherX: Math.max(0, Math.min(FIELD_W - CATCHER_W, x)) })
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          resetBest()
          this.setData({ bestText: '--' })
        }
      }
    })
  },

  _stopTimers() {
    if (this._spawnTimer) clearTimeout(this._spawnTimer)
    if (this._tickTimer) clearInterval(this._tickTimer)
    this._spawnTimer = null
    this._tickTimer = null
  },

  onUnload() {
    this._stopTimers()
    if (this._nextTimer) clearTimeout(this._nextTimer)
  }
})
