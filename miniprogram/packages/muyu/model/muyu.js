// 计数逻辑公共实现在 utils/count-store，本文件只保留领域命名（页面调用方式不变）
const { createCountStore } = require('../../../utils/count-store')

const store = createCountStore('muyu:merit')

function getMerit() { return store.get() }
function addMerit(n) { return store.add(n) } // n 为本次敲击功德步长（缺省 1）
function resetMerit() { return store.reset() }

module.exports = { getMerit, addMerit, resetMerit }
