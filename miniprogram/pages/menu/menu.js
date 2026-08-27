// 模块字典（key -> 信息）
const MODULES = {
  cube: { key: 'cube', title: '魔方求解', desc: '拍照识别 · 3D 还原步骤', iconText: '魔', color: '#185FA5', ready: true, url: '/packages/cube/pages/fill/fill' },
  ledger: { key: 'ledger', title: '日常记账', desc: '随手记一笔 · 收支明细', iconText: '记', color: '#BA7517', ready: true, url: '/packages/ledger/pages/list/list' },
  countdown: { key: 'countdown', title: '倒计时', desc: '精确到秒 · 实时刷新', iconText: '倒', color: '#0F6E56', ready: true, url: '/packages/countdown/pages/list/list' },
  checkin: { key: 'checkin', title: '打卡', desc: '每日打卡 · 连续统计', iconText: '打', color: '#7F77DD', ready: true, url: '/packages/checkin/pages/list/list' },
  idphoto: { key: 'idphoto', title: '证件照', desc: '尺寸 换底 排版', iconText: '证', color: '#E24B4A', ready: true, url: '/packages/idphoto/pages/idphoto/idphoto' },
  muyu: { key: 'muyu', title: '敲木鱼', desc: '静心减压 · 功德 +1', iconText: '木', color: '#B5713F', ready: true, url: '/packages/muyu/pages/muyu/muyu' },
  mbti: { key: 'mbti', title: 'MBTI 人格测试', desc: '28 题 · 四维人格解析', iconText: '测', color: '#5E5CE6', ready: true, url: '/packages/mbti/pages/test/test' },
  lots: { key: 'lots', title: '抽签', desc: '自定选项 · 随机抽取', iconText: '签', color: '#0FA39B', ready: true, url: '/packages/lots/pages/lots/lots' },
  tomato: { key: 'tomato', title: '番茄钟', desc: '专注计时 · 劳逸结合', iconText: '番', color: '#D9534F', ready: true, url: '/packages/tomato/pages/timer/timer' },
  bubble: { key: 'bubble', title: '泡泡飞飞', desc: '点破飞舞的泡泡', iconText: '泡', color: '#4FA3E3', ready: true, url: '/packages/bubble/pages/bubble/bubble' },
  popwrap: { key: 'popwrap', title: '捏泡泡纸', desc: '捏泡泡停不下来', iconText: '捏', color: '#26A69A', ready: true, url: '/packages/popwrap/pages/popwrap/popwrap' },
  firework: { key: 'firework', title: '点烟花', desc: '点亮夜空放烟花', iconText: '烟', color: '#5C6BC0', ready: true, url: '/packages/firework/pages/firework/firework' },
  snap: { key: 'snap', title: '随手连拍', desc: '摄像头每秒自动抽帧·本地留存', iconText: '拍', color: '#3949AB', ready: true, url: '/packages/snap/pages/capture/capture' },
  stopwatch: { key: 'stopwatch', title: '计时器', desc: '毫秒级 · 多组短跑成绩', iconText: '时', color: '#0E8AC8', ready: true, url: '/packages/stopwatch/pages/timer/timer' },
  morse: { key: 'morse', title: '摩斯密码', desc: '手指敲击解码 · 长按短按识别', iconText: '摩', color: '#00695C', ready: true, url: '/packages/morse/pages/tap/tap' },
  snake: { key: 'snake', title: '蛇形魔方', desc: '3D 造型浏览 · 逐步折叠回放', iconText: '蛇', color: '#2f6fb0', ready: true, url: '/packages/snake/pages/snake/snake' }
}

// 分类（其余模块按使用场景分组）
const SECTIONS = [
  { title: '实用工具', keys: ['cube', 'ledger', 'countdown', 'checkin', 'idphoto', 'mbti', 'lots', 'tomato', 'snap', 'stopwatch', 'morse', 'snake'] },
  { title: '解压放松', keys: ['muyu', 'bubble', 'popwrap', 'firework'] }
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
