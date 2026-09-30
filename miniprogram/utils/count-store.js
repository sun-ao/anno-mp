// 通用计数存储：为「模块名:实体名」键提供 get/add/reset 三件套。
// 原先 bubble/firework/popwrap/muyu 各有一份逐字符相同的计数 model，统一收敛到这里；
// 各分包 model 只做领域命名包装（保持对外函数名不变，页面零改动）。
// 读取带类型兜底（非负数才可信），add 支持自定义步长（默认 1）。

const { genId } = require('./id')

function createCountStore(storageKey) {
  function get() {
    const v = wx.getStorageSync(storageKey)
    return typeof v === 'number' && v >= 0 ? v : 0
  }

  function add(step) {
    const n = typeof step === 'number' && step > 0 ? step : 1
    const total = get() + n
    wx.setStorageSync(storageKey, total)
    return total
  }

  function reset() {
    wx.setStorageSync(storageKey, 0)
    return 0
  }

  return { get: get, add: add, reset: reset }
}

// 通用列表存储：原先 stopwatch/snap 的列表 model 逐字符相同（checkin/countdown/lots
// 亦为同构变体），收敛到这里。读取带 Array.isArray 兜底，写入自动补 id/createdAt。
function createListStore(storageKey) {
  function get() {
    // 类型兜底：key 被污染成非数组时返回空表，避免后续 unshift/filter 抛错
    const v = wx.getStorageSync(storageKey)
    return Array.isArray(v) ? v : []
  }

  function set(list) {
    wx.setStorageSync(storageKey, Array.isArray(list) ? list : [])
    return list || []
  }

  // 新增记录：默认前插（最新在前），opts.prepend === false 时追加到末尾。
  // entity 默认带 id（genId）与 createdAt，item 里的同名字段优先。
  function add(item, opts) {
    const list = get()
    const entity = Object.assign({ id: genId(), createdAt: Date.now() }, item)
    if (opts && opts.prepend === false) list.push(entity)
    else list.unshift(entity)
    set(list)
    return entity
  }

  function remove(id) {
    const list = get().filter((x) => x && x.id !== id)
    set(list)
    return list
  }

  function clear() {
    return set([])
  }

  return { get: get, set: set, add: add, remove: remove, clear: clear }
}

module.exports = { createCountStore, createListStore }
