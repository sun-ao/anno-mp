// 数字合并（2048）核心逻辑：纯函数 + 最高分存储
// 棋盘以 tile 对象数组为核心（含稳定 id，用于滑动动画）
const KEY_BEST = 'merge:best'
const SIZE = 4

function getBest() {
  try { return wx.getStorageSync(KEY_BEST) || 0 } catch (e) { return 0 }
}
function saveBest(score) {
  try { if (score > getBest()) wx.setStorageSync(KEY_BEST, score) } catch (e) {}
}

let _id = 1
function nextId() { return _id++ }

function emptyTiles() { return [] }

function occupied(tiles) {
  const g = {}
  tiles.forEach(t => { g[t.y * SIZE + t.x] = t })
  return g
}

// 在任意空格随机生成一个 2(90%) 或 4(10%)，返回新生成的 tile 或 null
function addRandom(tiles) {
  const occ = occupied(tiles)
  const free = []
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!occ[y * SIZE + x]) free.push({ x, y })
    }
  }
  if (!free.length) return null
  const { x, y } = free[Math.floor(Math.random() * free.length)]
  const value = Math.random() < 0.9 ? 2 : 4
  const t = { id: nextId(), x, y, value, isNew: true, mergedFrom: null }
  tiles.push(t)
  return t
}

// 初始棋盘：两个随机 tile
function initTiles() {
  const tiles = []
  addRandom(tiles)
  addRandom(tiles)
  return tiles
}

const VECTORS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 }
}

function buildTraversals(vector) {
  const x = []
  const y = []
  for (let i = 0; i < SIZE; i++) { x.push(i); y.push(i) }
  if (vector.x === 1) x.reverse()
  if (vector.y === 1) y.reverse()
  return { x, y }
}

// 沿 dir 滑动合并；返回 { tiles, gained, moved }
// 直接 mutate 传入的 tile 对象，并过滤掉被合并掉的 tile
function move(tiles, dir) {
  const vector = VECTORS[dir]
  // 重置每轮动画标志
  tiles.forEach(t => { t.isNew = false; t.mergedFrom = null })
  const traversals = buildTraversals(vector)
  const occ = occupied(tiles)
  let gained = 0
  let moved = false
  const removed = []

  traversals.y.forEach(yy => {
    traversals.x.forEach(xx => {
      const tile = occ[yy * SIZE + xx]
      if (!tile) return
      // 沿方向找最远可达空格，直到遇到第一个 tile
      let cur = { x: xx, y: yy }
      let next = null
      while (true) {
        const nx = cur.x + vector.x
        const ny = cur.y + vector.y
        if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) break
        const there = occ[ny * SIZE + nx]
        if (!there) { cur = { x: nx, y: ny }; continue }
        next = there
        break
      }
      if (next) {
        if (next.value === tile.value && !next.mergedFrom) {
          // 合并：tile 滑到 next 位置后消失，next 翻倍
          tile.x = next.x; tile.y = next.y
          next.value *= 2
          next.mergedFrom = [tile, next]
          occ[yy * SIZE + xx] = null
          removed.push(tile)
          gained += next.value
          moved = true
        } else if (cur.x !== xx || cur.y !== yy) {
          occ[yy * SIZE + xx] = null
          occ[cur.y * SIZE + cur.x] = tile
          tile.x = cur.x; tile.y = cur.y
          moved = true
        }
      } else if (cur.x !== xx || cur.y !== yy) {
        occ[yy * SIZE + xx] = null
        occ[cur.y * SIZE + cur.x] = tile
        tile.x = cur.x; tile.y = cur.y
        moved = true
      }
    })
  })

  const result = tiles.filter(t => removed.indexOf(t) === -1)
  return { tiles: result, gained, moved }
}

// 是否还能移动（还有空格 或 有相邻相等）
function canMove(tiles) {
  if (tiles.length < SIZE * SIZE) return true
  const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  tiles.forEach(t => { g[t.y][t.x] = t.value })
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = g[y][x]
      if (x < SIZE - 1 && g[y][x + 1] === v) return true
      if (y < SIZE - 1 && g[y + 1][x] === v) return true
    }
  }
  return false
}

function hasWon(tiles) {
  return tiles.some(t => t.value >= 2048)
}

module.exports = {
  SIZE,
  getBest,
  saveBest,
  emptyTiles,
  initTiles,
  addRandom,
  move,
  canMove,
  hasWon
}
