// 项目统一短 ID 生成（约定：时间戳 36 进制 + 4 位随机；实体另带 createdAt）。
// 原先 stopwatch/snap model 与 lots 内联各复制一份，收敛于此。

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

module.exports = { genId }
