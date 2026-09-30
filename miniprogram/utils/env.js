// 设备/窗口信息统一封装：wx.getSystemInfoSync 已废弃（官方计划下线），
// 全项目取 pixelRatio / 窗口尺寸一律走这里 —— 新 API 优先，旧基础库兜底，异常再兜底。
// ESM 文件用默认导入（本项目已验证 CJS 默认导入可用）：import env from 'xxx/utils/env'

function getWindowInfo() {
  try {
    if (typeof wx !== 'undefined' && wx.getWindowInfo) return wx.getWindowInfo()
  } catch (e) { /* 落到旧 API */ }
  try {
    if (typeof wx !== 'undefined' && wx.getSystemInfoSync) return wx.getSystemInfoSync()
  } catch (e) { /* 落到默认值 */ }
  return { pixelRatio: 2, windowWidth: 375, windowHeight: 667, screenWidth: 375, screenHeight: 667 }
}

// 设备像素比（canvas 高清渲染用），异常时兜底 2
function getPixelRatio() {
  const dpr = getWindowInfo().pixelRatio
  return (dpr && dpr > 0) ? dpr : 2
}

module.exports = {
  getWindowInfo: getWindowInfo,
  getPixelRatio: getPixelRatio
}
