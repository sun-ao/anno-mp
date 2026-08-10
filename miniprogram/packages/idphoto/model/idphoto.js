/**
 * 证件照工具数据模型
 * 纯本地处理：canvas 裁切 + 像素级换底色（近似色替换）+ 排版打印
 */

/** 证件照规格（像素按 300dpi 标准） */
export const PHOTO_SPECS = [
  { key: '1inch',  name: '一寸',   mm: '25×35mm', width: 295, height: 413 },
  { key: '2small', name: '小二寸', mm: '35×45mm', width: 413, height: 531 },
  { key: '2inch',  name: '二寸',   mm: '35×49mm', width: 413, height: 579 }
]

/** 背景色选项（'origin' = 不换底色） */
export const BG_COLORS = [
  { key: 'origin', name: '原图', hex: '' },
  { key: 'white',  name: '白色', hex: '#FFFFFF' },
  { key: 'blue',   name: '蓝色', hex: '#438EDB' },
  { key: 'red',    name: '红色', hex: '#D9001B' }
]

/** '#RRGGBB' → [r, g, b] */
export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ]
}

/**
 * 换底色：把接近照片背景色的像素替换为目标色
 * @param {ImageData} imageData 源图像数据
 * @param {string} targetHex 目标底色 '#RRGGBB'
 * @param {number} tolerance 颜色距离阈值（0~1，默认 0.22）
 * @returns {ImageData} 处理后的图像数据
 */
export function replaceBackground(imageData, targetHex, tolerance) {
  const data = imageData.data
  const w = imageData.width
  const h = imageData.height
  if (w < 6 || h < 6) return imageData

  // 从四角采样背景色（各取 3×3 平均）
  const corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]]
  let sr = 0, sg = 0, sb = 0, n = 0
  for (const [cx, cy] of corners) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const i = ((cy + dy) * w + (cx + dx)) * 4
        sr += data[i]
        sg += data[i + 1]
        sb += data[i + 2]
        n++
      }
    }
  }
  const br = sr / n
  const bg = sg / n
  const bb = sb / n

  const [tr, tg, tb] = hexToRgb(targetHex)
  const T = tolerance || 0.22
  const FADE = 0.15 // 过渡带宽度

  for (let i = 0; i < data.length; i += 4) {
    const dr = (data[i] - br) / 255
    const dg = (data[i + 1] - bg) / 255
    const db = (data[i + 2] - bb) / 255
    const dist = Math.sqrt(dr * dr + dg * dg + db * db)
    if (dist <= T) {
      data[i] = tr
      data[i + 1] = tg
      data[i + 2] = tb
    } else if (dist < T + FADE) {
      const k = (dist - T) / FADE
      data[i] = Math.round(tr + (data[i] - tr) * k)
      data[i + 1] = Math.round(tg + (data[i + 1] - tg) * k)
      data[i + 2] = Math.round(tb + (data[i + 2] - tb) * k)
    }
  }
  return imageData
}

/**
 * 打印排版布局
 * 一寸排 8 张（4×2），其余排 4 张（2×2）
 */
export function getPrintLayout(spec) {
  const cols = spec.key === '1inch' ? 4 : 2
  const rows = spec.key === '1inch' ? 2 : 2
  const margin = 48
  const gap = 24
  return {
    cols,
    rows,
    margin,
    gap,
    canvasW: margin * 2 + cols * spec.width + (cols - 1) * gap,
    canvasH: margin * 2 + rows * spec.height + (rows - 1) * gap
  }
}
