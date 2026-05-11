import { registerAuthHandlers } from './auth'
import { registerCatalogHandlers } from './catalog'
import { registerCustomerHandlers } from './customers'

export function registerIpcHandlers() {
  registerAuthHandlers()
  registerCatalogHandlers()
  registerCustomerHandlers()
}
