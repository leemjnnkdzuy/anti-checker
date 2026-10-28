import { existsSync, createWriteStream } from 'node:fs'
import { mkdir, unlink, rename, copyFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import https from 'node:https'
import http from 'node:http'
import { BrowserWindow, ipcMain } from 'electron'

const execFileAsync = promisify(execFile)

export interface AntigravityProgress {
  step: 'checking_env' | 'fetching_manifest' | 'downloading' | 'verifying' | 'installing' | 'updating' | 'up_to_date' | 'ready' | 'error'
  message: string
  percent?: number
  currentVersion?: string
  targetVersion?: string
  downloadedBytes?: number
  totalBytes?: number
  speedText?: string
  error?: string
}

export interface AntigravityInfo {
  installed: boolean
  version: string | null
  binaryPath: string
  binDir: string
}

export class AntigravityManager {
  private binDir: string
  private binaryPath: string
  private stagingDir: string
  private manifestBaseUrl = 'https://antigravity-cli-auto-updater-974169037036.us-central1.run.app'

  constructor() {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    this.binDir = path.join(localAppData, 'anti-checker', 'bin')
    this.binaryPath = path.join(this.binDir, 'agy.exe')
    this.stagingDir = path.join(localAppData, 'anti-checker', 'staging')
  }

  public getInfo(): AntigravityInfo {
    const installed = existsSync(this.binaryPath)
    return {
      installed,
      version: null,
      binaryPath: this.binaryPath,
      binDir: this.binDir
    }
  }

  public async getLocalVersion(): Promise<string | null> {
    if (!existsSync(this.binaryPath)) return null
    try {
      const { stdout } = await execFileAsync(this.binaryPath, ['--version'], { timeout: 5000 })
      const match = stdout.trim().match(/(\d+\.\d+\.\d+)/)
      return match ? match[1] : stdout.trim()
    } catch {
      return null
    }
  }

  private async fetchManifest(): Promise<{ version: string; url: string; sha512?: string }> {
    const arch = process.arch === 'arm64' ? 'windows_arm64' : 'windows_amd64'
    const manifestUrl = `${this.manifestBaseUrl}/manifests/${arch}.json`

    return new Promise((resolve, reject) => {
      const req = https.get(manifestUrl, { headers: { 'User-Agent': 'anti-checker' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (redirRes) => {
            let data = ''
            redirRes.on('data', (chunk) => (data += chunk))
            redirRes.on('end', () => {
              try {
                resolve(JSON.parse(data))
              } catch (e) {
                reject(e)
              }
            })
          }).on('error', reject)
          return
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Không thể lấy manifest (HTTP ${res.statusCode})`))
          return
        }

        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (e) {
            reject(e)
          }
        })
      })

      req.on('error', reject)
      req.setTimeout(10000, () => {
        req.destroy()
        reject(new Error('Hết thời gian kết nối tới máy chủ cập nhật Antigravity'))
      })
    })
  }

  private async downloadFile(
    downloadUrl: string,
    destinationPath: string,
    onProgress: (percent: number, downloadedBytes: number, totalBytes: number, speedText: string) => void
  ): Promise<void> {
    await mkdir(path.dirname(destinationPath), { recursive: true })

    return new Promise((resolve, reject) => {
      const downloadWithRedirect = (currentUrl: string, maxRedirects = 5) => {
        if (maxRedirects <= 0) {
          reject(new Error('Quá nhiều chuyển hướng (redirect) khi tải Antigravity'))
          return
        }

        const client = currentUrl.startsWith('https') ? https : http
        const req = client.get(currentUrl, { headers: { 'User-Agent': 'anti-checker' } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            downloadWithRedirect(res.headers.location, maxRedirects - 1)
            return
          }

          if (res.statusCode !== 200) {
            reject(new Error(`Lỗi tải file (HTTP ${res.statusCode})`))
            return
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
          let downloadedBytes = 0
          let lastTime = Date.now()
          let lastBytes = 0
          let speedStr = ''
          const fileStream = createWriteStream(destinationPath)

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length
            const now = Date.now()
            const timeDiff = (now - lastTime) / 1000
            if (timeDiff >= 0.25) {
              const bytesDiff = downloadedBytes - lastBytes
              const bytesPerSec = bytesDiff / timeDiff
              lastTime = now
              lastBytes = downloadedBytes
              if (bytesPerSec >= 1024 * 1024) {
                speedStr = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
              } else {
                speedStr = `${(bytesPerSec / 1024).toFixed(0)} KB/s`
              }
            }

            const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(1)
            const totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?'
            const formattedSpeedText = speedStr ? `${downloadedMB} MB / ${totalMB} MB • ${speedStr}` : `${downloadedMB} MB / ${totalMB} MB`

            if (totalBytes > 0) {
              const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
              onProgress(percent, downloadedBytes, totalBytes, formattedSpeedText)
            } else {
              onProgress(50, downloadedBytes, totalBytes, formattedSpeedText)
            }
          })

          res.pipe(fileStream)

          fileStream.on('finish', () => {
            fileStream.close()
            resolve()
          })

          fileStream.on('error', (err) => {
            unlink(destinationPath).catch(() => {})
            reject(err)
          })
        })

        req.on('error', (err) => {
          unlink(destinationPath).catch(() => {})
          reject(err)
        })

        req.setTimeout(30000, () => {
          req.destroy()
          unlink(destinationPath).catch(() => {})
          reject(new Error('Hết thời gian tải file Antigravity'))
        })
      }

      downloadWithRedirect(downloadUrl)
    })
  }

  private findFallbackLocalBinary(): string | null {
    const candidates = [
      path.join(process.env.APPDATA || '', 'sukong-new', 'bin', 'antigravity', 'agy.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'agy', 'bin', 'agy.exe'),
      path.join(os.homedir(), '.gemini', 'bin', 'agy.exe')
    ]
    for (const c of candidates) {
      if (existsSync(c)) return c
    }
    return null
  }

  public async checkAndUpdate(emitProgress: (progress: AntigravityProgress) => void): Promise<string> {
    await mkdir(this.binDir, { recursive: true })
    await mkdir(this.stagingDir, { recursive: true })

    emitProgress({
      step: 'checking_env',
      message: 'Đang kiểm tra môi trường Antigravity nội bộ (%LOCALAPPDATA%\\anti-checker\\bin)...',
      percent: 10
    })

    const isInstalled = existsSync(this.binaryPath)
    let currentVersion = isInstalled ? await this.getLocalVersion() : null

    // 1. Kiểm tra manifest trực tuyến
    emitProgress({
      step: 'fetching_manifest',
      message: 'Đang kiểm tra phiên bản mới nhất từ Google Antigravity...',
      percent: 25,
      currentVersion: currentVersion || undefined
    })

    let manifest: { version: string; url: string; sha512?: string } | null = null
    try {
      manifest = await this.fetchManifest()
    } catch (err: any) {
      console.warn('Không thể lấy manifest online:', err?.message)
    }

    const targetVersion = manifest?.version || '1.4.9'

    // 2. Nếu chưa cài đặt nội bộ -> Tải và cài đặt
    if (!isInstalled) {
      emitProgress({
        step: 'downloading',
        message: `Đang tải Antigravity nội bộ v${targetVersion}...`,
        percent: 30,
        targetVersion
      })

      const stagingFile = path.join(this.stagingDir, 'agy.tmp.exe')

      let downloaded = false
      if (manifest?.url) {
        try {
          await this.downloadFile(manifest.url, stagingFile, (pct, dlBytes, totBytes, speedText) => {
            const mappedPercent = 30 + Math.round(pct * 0.5) // 30% -> 80%
            emitProgress({
              step: 'downloading',
              message: `Đang tải Antigravity nội bộ (${pct}%)...`,
              percent: mappedPercent,
              targetVersion,
              downloadedBytes: dlBytes,
              totalBytes: totBytes,
              speedText
            })
          })
          downloaded = true
        } catch (downloadErr: any) {
          console.warn('Lỗi download từ Google Storage:', downloadErr?.message)
        }
      }

      // Nếu tải thất bại hoặc không có mạng, tìm bản local có sẵn để sao chép vào nội bộ
      if (!downloaded) {
        const fallback = this.findFallbackLocalBinary()
        if (fallback) {
          emitProgress({
            step: 'installing',
            message: 'Đang đồng bộ Antigravity từ môi trường hệ thống vào thư mục nội bộ...',
            percent: 75
          })
          await copyFile(fallback, stagingFile)
          downloaded = true
        } else {
          throw new Error('Không thể tải Antigravity và không tìm thấy bản cài đặt dự phòng nào trên máy.')
        }
      }

      emitProgress({
        step: 'installing',
        message: 'Đang hoàn thiện cài đặt Antigravity vào thư mục bin nội bộ...',
        percent: 85
      })

      if (existsSync(this.binaryPath)) {
        try {
          await unlink(this.binaryPath)
        } catch {}
      }

      await rename(stagingFile, this.binaryPath)

      // Chạy khởi tạo môi trường
      try {
        await execFileAsync(this.binaryPath, ['install', '--dir', this.binDir], { timeout: 10000 })
      } catch {}

      currentVersion = await this.getLocalVersion()
    } else {
      // 3. Đã cài đặt -> Kiểm tra cập nhật
      const needsUpdate = manifest && currentVersion && manifest.version !== currentVersion

      if (needsUpdate) {
        emitProgress({
          step: 'updating',
          message: `Phát hiện bản cập nhật mới v${targetVersion} (hiện tại v${currentVersion}). Đang tự động cập nhật...`,
          percent: 50,
          currentVersion: currentVersion || undefined,
          targetVersion
        })

        let updated = false
        // Thử chạy trực tiếp lệnh native `agy.exe update`
        try {
          const { stdout } = await execFileAsync(this.binaryPath, ['update'], { timeout: 45000 })
          if (stdout.includes('Update successful') || stdout.includes('Already') || stdout.includes('latest')) {
            updated = true
          }
        } catch (updateErr: any) {
          console.warn('Lệnh agy update thất bại, chuyển sang tải đè trực tiếp:', updateErr?.message)
        }

        // Nếu agy update thất bại, tải trực tiếp file mới từ manifest
        if (!updated && manifest?.url) {
          const stagingFile = path.join(this.stagingDir, 'agy.update.tmp.exe')
          await this.downloadFile(manifest.url, stagingFile, (pct, dlBytes, totBytes, speedText) => {
            const mappedPercent = 50 + Math.round(pct * 0.4) // 50% -> 90%
            emitProgress({
              step: 'updating',
              message: `Đang tải bản cập nhật (${pct}%)...`,
              percent: mappedPercent,
              targetVersion,
              downloadedBytes: dlBytes,
              totalBytes: totBytes,
              speedText
            })
          })

          try {
            await unlink(this.binaryPath)
          } catch {}
          await rename(stagingFile, this.binaryPath)
        }

        currentVersion = await this.getLocalVersion()
      } else {
        emitProgress({
          step: 'up_to_date',
          message: `Môi trường Antigravity đã ở phiên bản mới nhất (v${currentVersion}).`,
          percent: 95,
          currentVersion: currentVersion || undefined
        })
      }
    }

    emitProgress({
      step: 'ready',
      message: `Môi trường nội bộ đã sẵn sàng! (Antigravity v${currentVersion || targetVersion})`,
      percent: 100,
      currentVersion: currentVersion || targetVersion
    })

    return currentVersion || targetVersion
  }
}

let managerInstance: AntigravityManager | null = null

export function setupAntigravityIpc(getMainWindow: () => BrowserWindow | null): AntigravityManager {
  if (!managerInstance) {
    managerInstance = new AntigravityManager()
  }
  const manager = managerInstance

  ipcMain.handle('antigravity:get-info', async () => {
    const info = manager.getInfo()
    const version = await manager.getLocalVersion()
    return { ...info, version }
  })

  ipcMain.handle('antigravity:check-and-update', async () => {
    const win = getMainWindow()
    try {
      const version = await manager.checkAndUpdate((progress) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('antigravity:progress', progress)
        }
      })
      return { success: true, version }
    } catch (err: any) {
      const errorMessage = err?.message || 'Lỗi không xác định khi kiểm tra/cập nhật Antigravity'
      if (win && !win.isDestroyed()) {
        win.webContents.send('antigravity:progress', {
          step: 'error',
          message: errorMessage,
          error: errorMessage
        })
      }
      return { success: false, error: errorMessage }
    }
  })

  return manager
}
