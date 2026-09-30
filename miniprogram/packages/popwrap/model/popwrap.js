// 计数逻辑公共实现在 utils/count-store，本文件只保留领域命名（页面调用方式不变）
const { createCountStore } = require('../../../utils/count-store')

const store = createCountStore('popwrap:total')

function getTotal() { return store.get() }
function addTotal() { return store.add() }
function resetTotal() { return store.reset() }

module.exports = { getTotal, addTotal, resetTotal }
