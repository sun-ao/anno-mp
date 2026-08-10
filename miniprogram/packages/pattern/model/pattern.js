const STORAGE_KEY = 'pattern:count'

function getCount() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addCount() {
  const total = getCount() + 1
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

function resetCount() {
  wx.setStorageSync(STORAGE_KEY, 0)
  return 0
}

module.exports = { getCount, addCount, resetCount }
