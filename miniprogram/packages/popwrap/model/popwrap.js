const STORAGE_KEY = 'popwrap:total'

function getTotal() {
  const v = wx.getStorageSync(STORAGE_KEY)
  return typeof v === 'number' && v >= 0 ? v : 0
}

function addTotal() {
  const total = getTotal() + 1
  wx.setStorageSync(STORAGE_KEY, total)
  return total
}

function resetTotal() {
  wx.setStorageSync(STORAGE_KEY, 0)
  return 0
}

module.exports = { getTotal, addTotal, resetTotal }
