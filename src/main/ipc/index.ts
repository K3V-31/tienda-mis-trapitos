import { registerAuthHandlers } from './auth'
import { registerCatalogHandlers } from './catalog'
import { registerCustomerHandlers } from './customers'
import { registerInventoryHandlers } from './inventory'
import { registerOffersHandlers } from './offers'
import { registerSalesHandlers } from './sales'

export function registerIpcHandlers() {
  registerAuthHandlers()
  registerCatalogHandlers()
  registerCustomerHandlers()
  registerInventoryHandlers()
  registerOffersHandlers()
  registerSalesHandlers()
}
