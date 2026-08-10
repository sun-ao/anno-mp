const { getCount, addCount, getLevelBest, saveLevelBest, resetMaze } = require('../../model/maze')
const { playPop, playBoop, playTada } = require('../../../../utils/kids-audio')

const MAX_N = 8 // 封顶 8×8
const GRID_W = 638 // 网格可用宽 rpx（页面 750 - 左右边距 64 - 迷宫盒内边距 48）

// 相邻格子的墙 key（统一小坐标在前）
function key(r1, c1, r2, c2) {
  if (r1 > r2 || (r1 === r2 && c1 > c2)) return `${r2},${c2}|${r1},${c1}`
  return `${r1},${c1}|${r2},${c2}`
}

// BFS 检查起点 (0,0) 能否到达终点 (n-1,n-1)
function reachable(walls, n) {
  const seen = new Set(['0,0'])
  const queue = [[0, 0]]
  const target = `${n - 1},${n - 1}`
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  while (queue.length) {
    const [r, c] = queue.shift()
    if (`${r},${c}` === target) return true
    for (let i = 0; i < 4; i++) {
      const nr = r + dirs[i][0]
      const nc = c + dirs[i][1]
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue
      const k = `${nr},${nc}`
      if (seen.has(k)) continue
      if (walls.has(key(r, c, nr, nc))) continue
      seen.add(k)
      queue.push([nr, nc])
    }
  }
  return false
}

// 随机生成迷宫，保证起点到终点可达
function genMaze(n) {
  for (let tries = 0; tries < 300; tries++) {
    const walls = new Set()
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (c + 1 < n && Math.random() < 0.4) walls.add(key(r, c, r, c + 1))
        if (r + 1 < n && Math.random() < 0.4) walls.add(key(r, c, r + 1, c))
      }
    }
    if (reachable(walls, n)) return walls
  }
  return new Set()
}

Page({
  data: {
    total: 0,
    level: 1,
    n: 4,
    cellH: 159,
    cellFont: 87,
    cells: [],
    player: 0,
    goal: 15,
    timerText: '0:00',
    bestText: '--',
    done: false,
    finalText: '',
    newRecord: false
  },

  onLoad() {
    this.setData({ total: getCount() })
    this._startGame(1)
  },

  _fmtMs(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  },

  // 关卡递增：第 1 关 4×4，每关 +1，封顶 8×8；格子随关卡缩小
  _startGame(level) {
    this._stopTimers()
    const n = Math.min(4 + level - 1, MAX_N)
    const cellH = Math.floor(GRID_W / n)
    this._startTime = Date.now()
    this._walls = genMaze(n)
    const cells = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        cells.push({
          id: r * n + c,
          r,
          c,
          walls: {
            top: r === 0 || this._walls.has(key(r, c, r - 1, c)),
            right: c === n - 1 || this._walls.has(key(r, c, r, c + 1)),
            bottom: r === n - 1 || this._walls.has(key(r, c, r + 1, c)),
            left: c === 0 || this._walls.has(key(r, c, r, c - 1))
          }
        })
      }
    }
    const best = getLevelBest(level)
    this.setData({
      level,
      n,
      cellH,
      cellFont: Math.max(40, Math.floor(cellH * 0.55)),
      cells,
      player: 0,
      goal: n * n - 1,
      timerText: '0:00',
      bestText: best ? this._fmtMs(best) : '--',
      done: false,
      finalText: '',
      newRecord: false
    })
    this._tickTimer = setInterval(() => {
      if (this.data.done) return
      const t = this._fmtMs(Date.now() - this._startTime)
      if (t !== this.data.timerText) this.setData({ timerText: t })
    }, 500)
  },

  onTapCell(e) {
    if (this.data.done) return
    const id = Number(e.currentTarget.dataset.id)
    const n = this.data.n
    const p = this.data.player
    const pr = Math.floor(p / n)
    const pc = p % n
    const tr = Math.floor(id / n)
    const tc = id % n
    // 只能点相邻的格子
    if (Math.abs(pr - tr) + Math.abs(pc - tc) !== 1) {
      playBoop()
      return
    }
    // 相邻但有墙
    if (this._walls.has(key(pr, pc, tr, tc))) {
      playBoop()
      return
    }
    playPop()
    this.setData({ player: id })
    if (id === this.data.goal) {
      playTada()
      this._win()
    }
  },

  // 到达终点：停止计时，结算本关用时并写入纪录
  _win() {
    this._stopTimers()
    const ms = Date.now() - this._startTime
    const { best, isNew } = saveLevelBest(this.data.level, ms)
    this.setData({
      done: true,
      total: addCount(),
      finalText: this._fmtMs(ms),
      bestText: this._fmtMs(best),
      newRecord: isNew
    })
    this._nextTimer = setTimeout(() => this._startGame(this.data.level + 1), 1500)
  },

  onClear() {
    wx.showModal({
      title: '清空记录',
      content: '确定要把成绩清零吗？',
      success: (res) => {
        if (res.confirm) {
          resetMaze()
          this.setData({ total: 0, bestText: '--' })
        }
      }
    })
  },

  _stopTimers() {
    if (this._tickTimer) clearInterval(this._tickTimer)
    this._tickTimer = null
  },

  onUnload() {
    this._stopTimers()
    if (this._nextTimer) clearTimeout(this._nextTimer)
  }
})
