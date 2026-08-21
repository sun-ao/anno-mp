// 模块字典（key -> 信息）
const MODULES = {
  cube: { key: 'cube', title: '魔方求解', desc: '拍照识别 · 3D 还原步骤', iconText: '魔', color: '#185FA5', ready: true, url: '/packages/cube/pages/fill/fill' },
  ledger: { key: 'ledger', title: '日常记账', desc: '随手记一笔 · 收支明细', iconText: '记', color: '#BA7517', ready: true, url: '/packages/ledger/pages/list/list' },
  countdown: { key: 'countdown', title: '倒计时', desc: '精确到秒 · 实时刷新', iconText: '倒', color: '#0F6E56', ready: true, url: '/packages/countdown/pages/list/list' },
  checkin: { key: 'checkin', title: '打卡', desc: '每日打卡 · 连续统计', iconText: '打', color: '#7F77DD', ready: true, url: '/packages/checkin/pages/list/list' },
  idphoto: { key: 'idphoto', title: '证件照', desc: '尺寸 换底 排版', iconText: '证', color: '#E24B4A', ready: true, url: '/packages/idphoto/pages/idphoto/idphoto' },
  muyu: { key: 'muyu', title: '敲木鱼', desc: '静心减压 · 功德 +1', iconText: '木', color: '#B5713F', ready: true, url: '/packages/muyu/pages/muyu/muyu' },
  rps: { key: 'rps', title: '猜拳淘汰', desc: '点屏出手 · 手心手背', iconText: '拳', color: '#2E6BE6', ready: true, url: '/packages/rps/pages/rps/rps' },
  mbti: { key: 'mbti', title: 'MBTI 人格测试', desc: '28 题 · 四维人格解析', iconText: '测', color: '#5E5CE6', ready: true, url: '/packages/mbti/pages/test/test' },
  lots: { key: 'lots', title: '抽签', desc: '自定选项 · 随机抽取', iconText: '签', color: '#0FA39B', ready: true, url: '/packages/lots/pages/lots/lots' },
  tomato: { key: 'tomato', title: '番茄钟', desc: '专注计时 · 劳逸结合', iconText: '番', color: '#D9534F', ready: true, url: '/packages/tomato/pages/timer/timer' },
  xylo: { key: 'xylo', title: '彩色木琴', desc: '点出彩色的声音', iconText: '琴', color: '#FF7043', ready: true, url: '/packages/xylo/pages/xylo/xylo' },
  cars: { key: 'cars', title: '工程车按钮台', desc: '按一按车车会响', iconText: '车', color: '#FFB300', ready: true, url: '/packages/cars/pages/cars/cars' },
  animals: { key: 'animals', title: '动物叫声', desc: '点动物听叫声', iconText: '兽', color: '#43A047', ready: true, url: '/packages/animals/pages/animals/animals' },
  bubble: { key: 'bubble', title: '泡泡飞飞', desc: '点破飞舞的泡泡', iconText: '泡', color: '#4FA3E3', ready: true, url: '/packages/bubble/pages/bubble/bubble' },
  popwrap: { key: 'popwrap', title: '捏泡泡纸', desc: '捏泡泡停不下来', iconText: '捏', color: '#26A69A', ready: true, url: '/packages/popwrap/pages/popwrap/popwrap' },
  peekaboo: { key: 'peekaboo', title: '躲猫猫', desc: '找找藏着的小动物', iconText: '猫', color: '#C9A227', ready: true, url: '/packages/peekaboo/pages/peekaboo/peekaboo' },
  firework: { key: 'firework', title: '点烟花', desc: '点亮夜空放烟花', iconText: '烟', color: '#5C6BC0', ready: true, url: '/packages/firework/pages/firework/firework' },
  balloon: { key: 'balloon', title: '吹气球', desc: '按住吹气别吹爆', iconText: '球', color: '#EC407A', ready: true, url: '/packages/balloon/pages/balloon/balloon' },
  gopher: { key: 'gopher', title: '打地鼠', desc: '冒头就打它一下', iconText: '鼠', color: '#A0672B', ready: true, url: '/packages/gopher/pages/gopher/gopher' },
  count: { key: 'count', title: '数一数', desc: '点一下数一个数', iconText: '数', color: '#3B6BE0', ready: true, url: '/packages/count/pages/count/count' },
  memory: { key: 'memory', title: '翻翻乐', desc: '翻开卡片找一对', iconText: '翻', color: '#7F77DD', ready: true, url: '/packages/memory/pages/memory/memory' },
  odd: { key: 'odd', title: '找不同', desc: '找出不一样的那个', iconText: '找', color: '#FB8C00', ready: true, url: '/packages/odd/pages/odd/odd' },
  sort: { key: 'sort', title: '颜色分分类', desc: '小球送回同色篮子', iconText: '色', color: '#EC6A9C', ready: true, url: '/packages/sort/pages/sort/sort' },
  shape: { key: 'shape', title: '形状配对', desc: '找出相同的形状', iconText: '形', color: '#2E6BE6', ready: true, url: '/packages/shape/pages/shape/shape' },
  shadow: { key: 'shadow', title: '影子配对', desc: '给影子找到主人', iconText: '影', color: '#607D8B', ready: true, url: '/packages/shadow/pages/shadow/shadow' },
  pattern: { key: 'pattern', title: '找规律', desc: '猜出下一个是什么', iconText: '规', color: '#43A047', ready: true, url: '/packages/pattern/pages/pattern/pattern' },
  nummatch: { key: 'nummatch', title: '数物配对', desc: '数一数选对数字', iconText: '配', color: '#5E5CE6', ready: true, url: '/packages/nummatch/pages/nummatch/nummatch' },
  listen: { key: 'listen', title: '找相同', desc: '找出一样的那个', iconText: '找', color: '#E24B4A', ready: true, url: '/packages/listen/pages/listen/listen' },
  puzzle: { key: 'puzzle', title: '拼拼图', desc: '把碎片拼回原位', iconText: '拼', color: '#0FA39B', ready: true, url: '/packages/puzzle/pages/puzzle/puzzle' },
  size: { key: 'size', title: '比大小', desc: '从小到大排排队', iconText: '大', color: '#BA7517', ready: true, url: '/packages/size/pages/size/size' },
  maze: { key: 'maze', title: '小迷宫', desc: '带小老鼠走出迷宫', iconText: '迷', color: '#8D6E63', ready: true, url: '/packages/maze/pages/maze/maze' },
  rocket: { key: 'rocket', title: '太空接星', desc: '只接星星 躲开其他', iconText: '星', color: '#3F51B5', ready: true, url: '/packages/rocket/pages/rocket/rocket' },
  cook: { key: 'cook', title: '汉堡大厨', desc: '照着菜谱做汉堡', iconText: '堡', color: '#FF7043', ready: true, url: '/packages/cook/pages/cook/cook' },
  colormatch: { key: 'colormatch', title: '认颜色', desc: '点出指定的颜色', iconText: '色', color: '#FB8C00', ready: true, url: '/packages/colormatch/pages/colormatch/colormatch' },
  coloring: { key: 'coloring', title: '涂色书', desc: '选颜色涂一涂', iconText: '涂', color: '#EC407A', ready: true, url: '/packages/coloring/pages/coloring/coloring' },
  numberfind: { key: 'numberfind', title: '找数字', desc: '在格子里找数字', iconText: '数', color: '#3F51B5', ready: true, url: '/packages/numberfind/pages/numberfind/numberfind' },
  trash: { key: 'trash', title: '垃圾分类', desc: '把垃圾送回对的桶', iconText: '圾', color: '#00897B', ready: true, url: '/packages/trash/pages/trash/trash' },
  link: { key: 'link', title: '消消乐', desc: '找出相同消掉它', iconText: '消', color: '#8E24AA', ready: true, url: '/packages/link/pages/link/link' },
  hoop: { key: 'hoop', title: '投篮', desc: '看准时机投进筐', iconText: '篮', color: '#F4511E', ready: true, url: '/packages/hoop/pages/hoop/hoop' },
  simon: { key: 'simon', title: '记顺序', desc: '跟着亮灯点一遍', iconText: '顺', color: '#6D4C41', ready: true, url: '/packages/simon/pages/simon/simon' },
  sliding: { key: 'sliding', title: '数字滑块', desc: '把数字排回顺序', iconText: '滑', color: '#2E5BBF', ready: true, url: '/packages/sliding/pages/sliding/sliding' },
  merge: { key: 'merge', title: '数字合并', desc: '滑动合并出大数字', iconText: '合', color: '#1E88E5', ready: true, url: '/packages/merge/pages/merge/merge' },
  beat: { key: 'beat', title: '节奏点点', desc: '跟着节拍点一点', iconText: '拍', color: '#C67113', ready: true, url: '/packages/beat/pages/beat/beat' },
  scratch: { key: 'scratch', title: '刮刮乐', desc: '刮开看看好运气', iconText: '刮', color: '#00897B', ready: true, url: '/packages/scratch/pages/scratch/scratch' },
  snap: { key: 'snap', title: '随手连拍', desc: '摄像头每秒自动抽帧·本地留存', iconText: '拍', color: '#3949AB', ready: true, url: '/packages/snap/pages/capture/capture' },
  stopwatch: { key: 'stopwatch', title: '计时器', desc: '毫秒级 · 多组短跑成绩', iconText: '时', color: '#0E8AC8', ready: true, url: '/packages/stopwatch/pages/timer/timer' },
  morse: { key: 'morse', title: '摩斯密码', desc: '手指敲击解码 · 长按短按识别', iconText: '摩', color: '#00695C', ready: true, url: '/packages/morse/pages/tap/tap' },
  snake: { key: 'snake', title: '蛇形魔方', desc: '3D 造型浏览 · 逐步折叠回放', iconText: '蛇', color: '#2f6fb0', ready: true, url: '/packages/snake/pages/snake/snake' }
}

// 分类（其余模块按使用场景分组）
const SECTIONS = [
  { title: '实用工具', keys: ['cube', 'ledger', 'countdown', 'checkin', 'idphoto', 'mbti', 'lots', 'tomato', 'snap', 'stopwatch', 'morse', 'snake'] },
  { title: '启蒙益智', keys: ['count', 'nummatch', 'size', 'sort', 'shape', 'shadow', 'odd', 'pattern', 'listen', 'memory', 'puzzle', 'maze', 'numberfind', 'colormatch', 'coloring', 'trash', 'peekaboo', 'sliding'] },
  { title: '互动游戏', keys: ['rps', 'gopher', 'rocket', 'cook', 'link', 'hoop', 'simon', 'merge'] },
  { title: '声音玩具', keys: ['xylo', 'cars', 'animals', 'beat'] },
  { title: '解压放松', keys: ['muyu', 'bubble', 'popwrap', 'firework', 'balloon', 'scratch'] }
]

Page({
  data: {
    sections: SECTIONS.map(s => ({
      title: s.title,
      modules: s.keys.map(k => MODULES[k])
    }))
  },

  onTapModule(e) {
    const item = e.currentTarget.dataset.item
    if (!item.ready) {
      wx.showToast({ title: '敬请期待', icon: 'none' })
      return
    }
    if (item.url) {
      wx.navigateTo({ url: item.url })
    }
  }
})
