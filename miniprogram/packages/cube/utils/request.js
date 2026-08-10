import { API_BASE } from '../config/index'

/**
 * 后端返回结构：
 * - solve_cube 成功: { solution: "R U R'..." }
 * - solve_cube 失败: HTTP 500, { error: "原因" }
 */

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + options.url,
      method: options.method,
      data: options.data || {},
      timeout: 20000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const msg = res.data && res.data.error
            ? res.data.error
            : `服务异常（HTTP ${res.statusCode}）`
          reject(new Error(msg))
        }
      },
      fail() {
        reject(new Error('网络异常，请检查网络后重试'))
      }
    })
  })
}

export function post(url, data) {
  return request({ url, method: 'POST', data })
}

export function get(url, data) {
  return request({ url, method: 'GET', data })
}

/**
 * 文件上传（wx.uploadFile，用于拍照识别等 multipart 场景）
 * @param {string} url  接口路径（不含域名）
 * @param {string} filePath  本地临时文件路径
 * @param {string} name  文件对应的 key，默认 'file'
 */
export function upload(url, filePath, name = 'file') {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: API_BASE + url,
      filePath,
      name,
      timeout: 30000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(res.data))
          } catch (_) {
            reject(new Error('响应解析失败'))
          }
        } else {
          let msg = `服务异常（HTTP ${res.statusCode}）`
          try {
            const data = JSON.parse(res.data)
            if (data.error) msg = data.error
          } catch (_) {}
          reject(new Error(msg))
        }
      },
      fail() {
        reject(new Error('网络异常，请检查网络后重试'))
      }
    })
  })
}
