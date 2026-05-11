import { registerAuthHandlers } from './auth'
import { registerCatalogHandlers } from './catalog'

export function registerIpcHandlers() {
  registerAuthHandlers()
  registerCatalogHandlers()
}
