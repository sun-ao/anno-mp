const { playCorrect, playWrong } = require('../../../../utils/kids-audio')

// 可选遮挡物样式：每轮随机选一种，同一轮里所有遮挡物外观一致，
// 玩家无法靠外观区分位置，只能靠记忆 —— 比「各不相同」更难
const COVER_STYLES = ['📦', '🌳', '🪨', '🧺', '🪣', '🛖', '🌰', '🪟']
const ANIMALS = ['🐱', '🐶', '🐰', '🐸', '🐥', '🐷', '🐭', '🦊']

const N = 6             // 遮挡物数量（2 行 3 列）
const SHUFFLE_STEPS = 3 // 洗牌次数（比原来 1 次多，变换更明显）
const STEP_MS = 450      // 每步间隔（ms）

function shuffle(a) {
  a = a.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

function randAnimal() {
  return ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
}

function pickCover() {
  return COVER_STYLES[Math.floor(Math.random() * COVER_STYLES.length)]
}

Page({
  data: {
    spots: [],
    phase: 'peek', // peek（偷看）→ shuffle（洗牌）→ guess（猜测）
    found: 0,
    shakeId: -1,
    revealId: -1,
    flipStyles: {} // id -> 内联 transform，用于洗牌时的滑动补间
  },

  onLoad() {
    this._timers = []
    this._newRound()
  },

  onReady() {
    // 网格单元格位置固定，洗牌前量一次即可
    this._measureCells()
  },

  // 量出 6 个网格单元格的屏幕坐标，作为 FLIP 滑动的目标位置
  _measureCells() {
    wx.createSelectorQuery()
      .selectAll('.spot')
      .boundingClientRect()
      .exec((res) => {
        const rects = (res && res[0]) || []
        if (rects.length >= N) {
          this._cellRects = rects.map((r) => ({ left: r.left, top: r.top }))
        }
      })
  },

  // 新一局：随机把动物藏到某个遮挡物后，停在「偷看」阶段让人看位置
  _newRound() {
    const cover = pickCover()
    const animal = randAnimal()
    const hidden = Math.floor(Math.random() * N)
    const spots = Array.from({ length: N }, (_, i) => ({
      id: i,
      cover,
      animal: i === hidden ? animal : '',
      hasAnimal: i === hidden
    }))
    this.setData({ spots, phase: 'peek', shakeId: -1, revealId: -1 })
  },

  // 偷看结束，点「开始」→ 分多步变换位置进入猜测
  onStartShuffle() {
    if (this.data.phase !== 'peek') return
    this.setData({ phase: 'shuffle' })
    this._shuffleStep(SHUFFLE_STEPS)
  },

  // 连续洗 SHUFFLE_STEPS 次，每次间隔 STEP_MS，最后进入猜测
  // 每次重排后用 FLIP 技巧让遮挡物「滑」到新格子，而非瞬间跳位，
  // 这样孩子能看清移动轨迹、记住小动物挪到了哪
  _shuffleStep(remaining) {
    if (remaining <= 0) {
      this.setData({ phase: 'guess', flipStyles: {} })
      return
    }
    const oldSpots = this.data.spots
    const oldIndexById = {}
    oldSpots.forEach((s, i) => { oldIndexById[s.id] = i })
    const shuffled = shuffle(oldSpots)

    // 1) 先重排数据，让 DOM 节点归位到新格子
    this.setData({ spots: shuffled }, () => {
      const cellRects = this._cellRects
      if (!cellRects || cellRects.length < N) {
        // 没量到格子坐标就退化为无动画重排，避免卡住
        this._scheduleNext(remaining)
        return
      }
      // 2) 反算每个遮挡物「本应在旧格子」的位移，先无过渡地把它拉回旧位置
      const flip = {}
      shuffled.forEach((s, newIdx) => {
        const oldIdx = oldIndexById[s.id]
        const dx = cellRects[oldIdx].left - cellRects[newIdx].left
        const dy = cellRects[oldIdx].top - cellRects[newIdx].top
        flip[s.id] = `transform: translate(${dx}px, ${dy}px); transition: none;`
      })
      this.setData({ flipStyles: flip }, () => {
        // 3) 下一帧打开过渡、位移归零 → 看到从旧格滑到新格
        const t0 = setTimeout(() => {
          const flip2 = {}
          shuffled.forEach((s) => {
            flip2[s.id] = 'transform: translate(0,0); transition: transform 380ms cubic-bezier(0.22,0.61,0.36,1);'
          })
          this.setData({ flipStyles: flip2 }, () => this._scheduleNext(remaining))
        }, 30)
        this._timers.push(t0)
      })
    })
  },

  _scheduleNext(remaining) {
    const t = setTimeout(() => {
      // 清掉过渡态再进入下一步，避免累积位移
      this.setData({ flipStyles: {} }, () => this._shuffleStep(remaining - 1))
    }, STEP_MS)
    this._timers.push(t)
  },

  onTapSpot(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    if (this.data.phase !== 'guess') return
    const spot = this.data.spots[idx]
    if (spot.hasAnimal) {
      // 猜对了
      playCorrect()
      if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
      const found = this.data.found + 1
      this.setData({ found, revealId: idx })
      const t = setTimeout(() => this._newRound(), 1300)
      this._timers.push(t)
    } else {
      // 猜错了：抖动 + 揭晓正确位置，帮助记忆
      playWrong()
      this.setData({ shakeId: -1 })
      const t1 = setTimeout(() => this.setData({ shakeId: idx }), 16)
      const t2 = setTimeout(() => {
        const correct = this.data.spots.findIndex((s) => s.hasAnimal)
        this.setData({ shakeId: -1, revealId: correct })
      }, 520)
      const t3 = setTimeout(() => this._newRound(), 1700)
      this._timers.push(t1, t2, t3)
    }
  },

  onUnload() {
    this._timers.forEach((t) => clearTimeout(t))
    this._timers = []
  }
})
