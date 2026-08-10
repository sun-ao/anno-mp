const STORAGE_KEY = 'maze:count'
const BEST_KEY = 'maze:best' // { 关卡: 最短用时毫秒 }

function getCount() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addCount() {
  const total = getCount() + 1
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

// 某关卡的最短用时（0 = 还没玩过这关）
function getLevelBest(level) {
  const map = wx.getStorageSync(BEST_KEY)
  return map && typeof map === 'object' && typeof map[level] === 'number' ? map[level] : 0
}

// 破纪录则保存，返回 { best, isNew }（首通不算破纪录）
function saveLevelBest(level, ms) {
  const raw = wx.getStorageSync(BEST_KEY)
  const map = raw && typeof raw === 'object' ? raw : {}
  const prev = typeof map[level] === 'number' ? map[level] : 0
  if (prev === 0 || ms < prev) {
    map[level] = ms
    wx.setStorageSync(BEST_KEY, map)
    return { best: ms, isNew: prev > 0 && ms < prev }
  }
  return { best: prev, isNew: false }
}

// 清空记录：通关数归零，各关最佳用时清空
function resetMaze() {
  wx.setStorageSync(STORAGE_KEY, 0)
  wx.setStorageSync(BEST_KEY, {})
}

module.exports = { getCount, addCount, getLevelBest, saveLevelBest, resetMaze }
