const STORAGE_KEY = 'muyu:merit'

function getMerit() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addMerit(n) {
  const step = typeof n === 'number' && n > 0 ? n : 1
  const total = getMerit() + step
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

function resetMerit() {
  wx.setStorageSync(STORAGE_KEY, 0)
  return 0
}

module.exports = { getMerit, addMerit, resetMerit }
