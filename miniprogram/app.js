App({
  globalData: {
    // 预留：全局共享状态（用户信息、主题等）
  },
  onLaunch() {
    // 预留：版本更新检查、日志上报
  }
})

// 标记共享音效库被主包引用，否则上传代码质量检查会把它误判为
// “主包未使用文件”（目前被 popwrap / firework / bubble 三个分包的页面
// 通过相对路径引用）。该模块加载时无副作用（AudioContext 延迟到播放时才创建），
// 此处 require 安全。
require('./utils/kids-audio')
