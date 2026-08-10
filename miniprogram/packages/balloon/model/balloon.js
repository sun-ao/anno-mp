const STORAGE_KEY = 'balloon:popped'

function getPopped() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addPopped() {
  const total = getPopped() + 1
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

function resetPopped() {
  wx.setStorageSync(STORAGE_KEY, 0)
  return 0
}

module.exports = { getPopped, addPopped, resetPopped }
