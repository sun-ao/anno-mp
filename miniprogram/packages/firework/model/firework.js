const STORAGE_KEY = 'firework:launched'

function getLaunched() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addLaunched() {
  const total = getLaunched() + 1
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

function resetLaunched() {
  wx.setStorageSync(STORAGE_KEY, 0)
  return 0
}

module.exports = { getLaunched, addLaunched, resetLaunched }
