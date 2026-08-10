const { playCorrect, playPop } = require('../../../../utils/kids-audio')

const SIZE = 3

// 判断是否已解（1..8 顺序，末位为空）
function isSolved(board) {
  for (let i = 0; i < SIZE * SIZE - 1; i++) {
    if (board[i] !== i + 1) return false
  }
  return board[SIZE * SIZE - 1] === 0
}

// 从有序态随机合法滑动打乱，保证一定可解
function shuffleBoard() {
  const board = []
  for (let i = 1; i <= SIZE * SIZE - 1; i++) board.push(i)
  board.push(0)
  let blank = SIZE * SIZE - 1
  for (let s = 0; s < 80; s++) {
    const r = Math.floor(blank / SIZE)
    const c = blank % SIZE
    const neighbors = []
    if (r > 0) neighbors.push(blank - SIZE)
    if (r < SIZE - 1) neighbors.push(blank + SIZE)
    if (c > 0) neighbors.push(blank - 1)
    if (c < SIZE - 1) neighbors.push(blank + 1)
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)]
    board[blank] = board[pick]
    board[pick] = 0
    blank = pick
  }
  if (isSolved(board)) return shuffleBoard()
  return board
}

Page({
  data: {
    tiles: [],
    steps: 0,
    win: false
  },

  onLoad() {
    this._new()
  },

  _new() {
    const board = shuffleBoard()
    this.setData({
      tiles: board.map((v, i) => ({ n: i, value: v })),
      steps: 0,
      win: false
    })
  },

  onTapTile(e) {
    if (this.data.win) return
    const i = Number(e.currentTarget.dataset.i)
    const board = this.data.tiles.map(t => t.value)
    const blank = board.indexOf(0)
    const r1 = Math.floor(i / SIZE), c1 = i % SIZE
    const r2 = Math.floor(blank / SIZE), c2 = blank % SIZE
    // 只能滑动与空格上下左右相邻的块
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
      board[blank] = board[i]
      board[i] = 0
      const steps = this.data.steps + 1
      const win = isSolved(board)
      this.setData({
        tiles: board.map((v, idx) => ({ n: idx, value: v })),
        steps,
        win
      })
      if (win) {
        playCorrect()
        if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' })
      } else {
        playPop()
      }
    }
  },

  onAgain() {
    this._new()
  }
})
