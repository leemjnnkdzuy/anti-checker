import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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

// Custom APIs for renderer
const api = {
  antigravity: {
    checkAndUpdate: (): Promise<{ success: boolean; version?: string; error?: string }> =>
      ipcRenderer.invoke('antigravity:check-and-update'),
    getInfo: (): Promise<AntigravityInfo> =>
      ipcRenderer.invoke('antigravity:get-info'),
    onProgress: (callback: (progress: AntigravityProgress) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: AntigravityProgress) => callback(data)
      ipcRenderer.on('antigravity:progress', listener)
      return () => {
        ipcRenderer.removeListener('antigravity:progress', listener)
      }
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
