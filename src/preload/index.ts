import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'
import type {
  ApiResponse,
  Category,
  ChangePasswordInput,
  CheckoutInput,
  CreateCustomerInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateSupplierInput,
  Customer,
  CustomerFilters,
  CustomerSaleSummary,
  DeleteCategoryInput,
  LoginInput,
  PosProduct,
  Product,
  ProductFilters,
  SaleTicket,
  SessionUser,
  SetProductActiveInput,
  SetSupplierActiveInput,
  Supplier,
  UpdateCustomerInput,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateSupplierInput,
} from '../shared/types'

const api = {
  auth: {
    login: (input: LoginInput) => ipcRenderer.invoke(IPC.auth.login, input) as Promise<ApiResponse<SessionUser>>,
    logout: () => ipcRenderer.invoke(IPC.auth.logout) as Promise<ApiResponse<null>>,
    currentUser: () => ipcRenderer.invoke(IPC.auth.currentUser) as Promise<ApiResponse<SessionUser | null>>,
    changePassword: (input: ChangePasswordInput) =>
      ipcRenderer.invoke(IPC.auth.changePassword, input) as Promise<ApiResponse<SessionUser>>,
  },
  catalog: {
    listCategories: () => ipcRenderer.invoke(IPC.catalog.listCategories) as Promise<ApiResponse<Category[]>>,
    createCategory: (input: CreateCategoryInput) =>
      ipcRenderer.invoke(IPC.catalog.createCategory, input) as Promise<ApiResponse<Category>>,
    updateCategory: (input: UpdateCategoryInput) =>
      ipcRenderer.invoke(IPC.catalog.updateCategory, input) as Promise<ApiResponse<Category>>,
    deleteCategory: (input: DeleteCategoryInput) =>
      ipcRenderer.invoke(IPC.catalog.deleteCategory, input) as Promise<ApiResponse<{ id: number }>>,
    listSuppliers: () => ipcRenderer.invoke(IPC.catalog.listSuppliers) as Promise<ApiResponse<Supplier[]>>,
    createSupplier: (input: CreateSupplierInput) =>
      ipcRenderer.invoke(IPC.catalog.createSupplier, input) as Promise<ApiResponse<Supplier>>,
    updateSupplier: (input: UpdateSupplierInput) =>
      ipcRenderer.invoke(IPC.catalog.updateSupplier, input) as Promise<ApiResponse<Supplier>>,
    setSupplierActive: (input: SetSupplierActiveInput) =>
      ipcRenderer.invoke(IPC.catalog.setSupplierActive, input) as Promise<ApiResponse<Supplier>>,
    listProducts: (filters: ProductFilters) =>
      ipcRenderer.invoke(IPC.catalog.listProducts, filters) as Promise<ApiResponse<Product[]>>,
    createProduct: (input: CreateProductInput) =>
      ipcRenderer.invoke(IPC.catalog.createProduct, input) as Promise<ApiResponse<Product>>,
    updateProduct: (input: UpdateProductInput) =>
      ipcRenderer.invoke(IPC.catalog.updateProduct, input) as Promise<ApiResponse<Product>>,
    setProductActive: (input: SetProductActiveInput) =>
      ipcRenderer.invoke(IPC.catalog.setProductActive, input) as Promise<ApiResponse<Product>>,
  },
  customers: {
    list: (filters: CustomerFilters) => ipcRenderer.invoke(IPC.customers.list, filters) as Promise<ApiResponse<Customer[]>>,
    create: (input: CreateCustomerInput) =>
      ipcRenderer.invoke(IPC.customers.create, input) as Promise<ApiResponse<Customer>>,
    update: (input: UpdateCustomerInput) =>
      ipcRenderer.invoke(IPC.customers.update, input) as Promise<ApiResponse<Customer>>,
    history: (customerId: number) =>
      ipcRenderer.invoke(IPC.customers.history, { customerId }) as Promise<ApiResponse<CustomerSaleSummary[]>>,
  },
  sales: {
    searchProducts: (search?: string) =>
      ipcRenderer.invoke(IPC.sales.searchProducts, { search }) as Promise<ApiResponse<PosProduct[]>>,
    checkout: (input: CheckoutInput) => ipcRenderer.invoke(IPC.sales.checkout, input) as Promise<ApiResponse<SaleTicket>>,
  },
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
