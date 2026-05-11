export type UserRole = 'admin' | 'vendor' | 'stock'

export type PaymentMethod = 'cash' | 'card' | 'transfer'

export type SessionUser = {
  id: number
  username: string
  name: string
  role: UserRole
  active: boolean
  mustChangePassword: boolean
}

export type ApiSuccess<T> = {
  ok: true
  data: T
}

export type ApiError = {
  ok: false
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export type LoginInput = {
  username: string
  password: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

export type Category = {
  id: number
  name: string
  productsCount: number
  createdAt: string
  updatedAt: string
}

export type Supplier = {
  id: number
  name: string
  phone: string | null
  email: string | null
  active: boolean
  productsCount: number
  createdAt: string
  updatedAt: string
}

export type Product = {
  id: number
  name: string
  description: string | null
  categoryId: number
  categoryName: string
  supplierId: number | null
  supplierName: string | null
  size: string | null
  color: string | null
  priceInCents: number
  stock: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ProductFilters = {
  search?: string
  categoryId?: number | null
  supplierId?: number | null
  active?: 'all' | 'active' | 'inactive'
}

export type CreateCategoryInput = {
  name: string
}

export type UpdateCategoryInput = {
  id: number
  name: string
}

export type DeleteCategoryInput = {
  id: number
}

export type CreateSupplierInput = {
  name: string
  phone?: string | null
  email?: string | null
}

export type UpdateSupplierInput = {
  id: number
  name: string
  phone?: string | null
  email?: string | null
}

export type SetSupplierActiveInput = {
  id: number
  active: boolean
}

export type CreateProductInput = {
  name: string
  description?: string | null
  categoryId: number
  supplierId?: number | null
  size?: string | null
  color?: string | null
  priceInCents: number
  initialStock: number
}

export type UpdateProductInput = {
  id: number
  name: string
  description?: string | null
  categoryId: number
  supplierId?: number | null
  size?: string | null
  color?: string | null
  priceInCents: number
}

export type SetProductActiveInput = {
  id: number
  active: boolean
}

export type Customer = {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  purchasesCount: number
  lastPurchaseAt: string | null
  createdAt: string
  updatedAt: string
}

export type CustomerFilters = {
  search?: string
}

export type CreateCustomerInput = {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export type UpdateCustomerInput = {
  id: number
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export type CustomerSaleSummary = {
  saleId: number
  totalInCents: number
  paymentMethod: PaymentMethod
  itemCount: number
  createdAt: string
}
