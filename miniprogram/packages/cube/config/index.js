/** 后端服务地址 */
export const API_BASE = 'https://api.sunao.cc'

/** 接口路径（直接挂在根路径，无网关前缀） */
export const ENDPOINTS = {
  /** 求解：POST {cube_state: "54串"} → {solution: "R U R'..."} */
  CUBE_SOLVE: '/solve_cube',
  /** 单面拍照识色：POST multipart → {colors: [...]} */
  CUBE_PROCESS_UPLOAD: '/process_upload',
  /** 六面颜色求解：POST {faces:{U:[...],R:[...],...}} → {code, result, state} */
  CUBE_SOLVE_BY_COLORS: '/solve_by_colors'
}

export const APP_INFO = {
  name: '推开数智的门',
  slogan: 'HugTechAI · 小工具集合'
}
