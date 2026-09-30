// 随手连拍：照片记录的本地存储（无后端）
// 列表 CRUD 已收敛到 utils/count-store 的 createListStore（与 stopwatch/lots 同构），此处只留领域命名。
const KEY = 'snap:photos'
const INTERVAL_KEY = 'snap:interval'
const INTERVAL_DEFAULT = 1000
const { createListStore } = require('../../../utils/count-store')

const store = createListStore(KEY)

const getPhotos = store.get

// photo: { path, ts, w, h }（add 时自动补 id/createdAt，返回新记录）
const addPhoto = (photo) => store.add(photo)
const deletePhoto = store.remove
const clearPhotos = store.clear

function getInterval() {
  return wx.getStorageSync(INTERVAL_KEY) || INTERVAL_DEFAULT
}

function saveInterval(ms) {
  wx.setStorageSync(INTERVAL_KEY, ms)
}

module.exports = { KEY, getPhotos, addPhoto, deletePhoto, clearPhotos, getInterval, saveInterval }
