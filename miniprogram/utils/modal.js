// 统一确认弹窗：Promise 化 + 全局确认色。
// 危险操作（删除/清空）默认红色确认键，页面无需各自写 confirmColor（原先 8 处手写重复）。
// 模块风格刻意用 CommonJS：ES 页面可 import，CJS 页面可 require（与 utils/id 同策略）。

function confirm(opts) {
  return new Promise((resolve) => {
    wx.showModal({
      title: (opts && opts.title) || '提示',
      content: (opts && opts.content) || '',
      confirmText: (opts && opts.confirmText) || '确定',
      cancelText: (opts && opts.cancelText) || '取消',
      confirmColor: (opts && opts.confirmColor) || '#C41E3A',
      success: (res) => resolve(!!(res && res.confirm)),
      fail: () => resolve(false)
    })
  })
}

module.exports = { confirm }
