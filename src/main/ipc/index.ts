import { registerAuthHandlers } from './auth'
import { registerCatalogHandlers } from './catalog'
import { registerCustomerHandlers } from './customers'
import { registerSalesHandlers } from './sales'

export function registerIpcHandlers() {
  registerAuthHandlers()
  registerCatalogHandlers()
  registerCustomerHandlers()
  registerSalesHandlers()
}
