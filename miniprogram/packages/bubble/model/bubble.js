// 计数逻辑公共实现在 utils/count-store，本文件只保留领域命名（页面调用方式不变）
const { createCountStore } = require('../../../utils/count-store')

const store = createCountStore('bubble:popped')

function getPopped() { return store.get() }
function addPopped() { return store.add() }
function resetPopped() { return store.reset() }

module.exports = { getPopped, addPopped, resetPopped }
