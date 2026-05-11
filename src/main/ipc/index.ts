import { registerAuthHandlers } from './auth'

export function registerIpcHandlers() {
  registerAuthHandlers()
}
