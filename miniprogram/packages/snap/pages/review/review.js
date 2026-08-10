const { getPhotos, deletePhoto, clearPhotos } = require('../../model/snap')

function pad(n) { return n < 10 ? '0' + n : '' + n }
function fmtDate(ts) {
  const d = new Date(ts)
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

Page({
  data: {
    photos: [],
    urls: []
  },

  onShow() { this.refresh() },

  refresh() {
    const photos = getPhotos().map(p => Object.assign({}, p, { displayTime: fmtDate(p.ts) }))
    this.setData({ photos, urls: photos.map(p => p.path) })
  },

  onPreview(e) {
    const idx = e.currentTarget.dataset.idx
    wx.previewImage({ current: this.data.urls[idx], urls: this.data.urls })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const path = e.currentTarget.dataset.path
    wx.showModal({
      title: '删除这张',
      content: '将同时从本地存储中移除该照片。',
      success: (r) => {
        if (!r.confirm) return
        deletePhoto(id)
        if (path) {
          wx.getFileSystemManager().removeSavedFile({ filePath: path, fail: () => {} })
        }
        this.refresh()
      }
    })
  },

  onClear() {
    if (this.data.photos.length === 0) return
    wx.showModal({
      title: '清空全部',
      content: '将删除所有已采集的照片，且不可恢复。',
      success: (r) => {
        if (!r.confirm) return
        this.data.photos.forEach(p => {
          if (p.path) wx.getFileSystemManager().removeSavedFile({ filePath: p.path, fail: () => {} })
        })
        clearPhotos()
        this.refresh()
      }
    })
  },

  goCapture() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/packages/snap/pages/capture/capture' }) })
  },

  fmt(ts) { return fmtDate(ts) }
})
