// 随手连拍：照片记录的本地存储（无后端）
const KEY = 'snap:photos'
const INTERVAL_KEY = 'snap:interval'
const INTERVAL_DEFAULT = 1000

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function getPhotos() {
  return wx.getStorageSync(KEY) || []
}

// photo: { path, ts, w, h }
function addPhoto(photo) {
  const list = getPhotos()
  list.unshift(Object.assign({ id: genId() }, photo))
  wx.setStorageSync(KEY, list)
  return list[0]
}

function deletePhoto(id) {
  const list = getPhotos().filter(p => p.id !== id)
  wx.setStorageSync(KEY, list)
  return list
}

function clearPhotos() {
  wx.setStorageSync(KEY, [])
  return []
}

function getInterval() {
  return wx.getStorageSync(INTERVAL_KEY) || INTERVAL_DEFAULT
}

function saveInterval(ms) {
  wx.setStorageSync(INTERVAL_KEY, ms)
}

module.exports = { KEY, getPhotos, addPhoto, deletePhoto, clearPhotos, getInterval, saveInterval }
