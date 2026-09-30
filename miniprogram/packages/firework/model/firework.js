// 计数逻辑公共实现在 utils/count-store，本文件只保留领域命名（页面调用方式不变）
const { createCountStore } = require('../../../utils/count-store')

const store = createCountStore('firework:launched')

function getLaunched() { return store.get() }
function addLaunched() { return store.add() }
function resetLaunched() { return store.reset() }

module.exports = { getLaunched, addLaunched, resetLaunched }
