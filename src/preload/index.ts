import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type { ApiResponse, ChangePasswordInput, LoginInput, SessionUser } from '../shared/types'

const api = {
  auth: {
    login: (input: LoginInput) => ipcRenderer.invoke(IPC.auth.login, input) as Promise<ApiResponse<SessionUser>>,
    logout: () => ipcRenderer.invoke(IPC.auth.logout) as Promise<ApiResponse<null>>,
    currentUser: () => ipcRenderer.invoke(IPC.auth.currentUser) as Promise<ApiResponse<SessionUser | null>>,
    changePassword: (input: ChangePasswordInput) =>
      ipcRenderer.invoke(IPC.auth.changePassword, input) as Promise<ApiResponse<SessionUser>>,
  },
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
