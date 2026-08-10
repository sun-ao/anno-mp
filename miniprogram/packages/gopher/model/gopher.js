const STORAGE_KEY = 'gopher:whacked'

function getWhacked() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addWhacked() {
  const total = getWhacked() + 1
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

function resetWhacked() {
  wx.setStorageSync(STORAGE_KEY, 0)
  return 0
}

module.exports = { getWhacked, addWhacked, resetWhacked }
