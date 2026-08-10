const STORAGE_KEY = 'dino:count'

function getCount() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addCount() {
  const total = getCount() + 1
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

module.exports = { getCount, addCount }
