import { ElectronAPI } from '@electron-toolkit/preload'

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

export interface CustomAPI {
  antigravity: {
    checkAndUpdate: () => Promise<{ success: boolean; version?: string; error?: string }>
    getInfo: () => Promise<AntigravityInfo>
    onProgress: (callback: (progress: AntigravityProgress) => void) => () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}
