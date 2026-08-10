const { getBest, saveBest, initTiles, addRandom, move, canMove, hasWon } = require('../../model/merge')
const { playPop, playTada } = require('../../../../utils/kids-audio')

Page({
  data: {
    tiles: [],
    cells: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    score: 0,
    best: 0,
    won: false,
    over: false
  },

  onLoad() {
    this.tiles = []
    this._sx = 0
    this._sy = 0
    this._newGame()
  },

  onShow() {
    this.setData({ best: getBest() })
  },

  _newGame() {
    this.tiles = initTiles()
    this.setData({ tiles: this.tiles, score: 0, won: false, over: false, best: getBest() })
  },

  onRestart() {
    this._newGame()
  },

  onTouchStart(e) {
    const t = e.touches[0]
    if (!t) return
    this._sx = t.clientX
    this._sy = t.clientY
  },

  onTouchEnd(e) {
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - this._sx
    const dy = t.clientY - this._sy
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    let dir
    if (Math.abs(dx) > Math.abs(dy)) dir = dx > 0 ? 'right' : 'left'
    else dir = dy > 0 ? 'down' : 'up'
    this.doMove(dir)
  },

  doMove(dir) {
    if (this.data.over) return
    const res = move(this.tiles, dir)
    if (!res.moved) return
    addRandom(this.tiles)
    const score = this.data.score + res.gained
    const best = Math.max(this.data.best, score)
    saveBest(best)
    const won = hasWon(this.tiles)
    const over = !canMove(this.tiles)
    if (res.gained > 0) playPop()
    if (won && !this.data.won) playTada()
    this.setData({ tiles: this.tiles, score, best, won, over })
  }
})
