const BEST_KEY = 'rocket:best' // { 关卡: 最短用时毫秒 }

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

// 清空所有关卡的最佳记录（初始结构为空对象）
function resetBest() {
  wx.setStorageSync(BEST_KEY, {})
  return {}
}

module.exports = { getLevelBest, saveLevelBest, resetBest }
