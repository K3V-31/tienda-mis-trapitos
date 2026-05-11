export const IPC = {
  auth: {
    login: 'auth:login',
    logout: 'auth:logout',
    currentUser: 'auth:current-user',
    changePassword: 'auth:change-password',
  },
  catalog: {
    listCategories: 'catalog:categories:list',
    createCategory: 'catalog:categories:create',
    updateCategory: 'catalog:categories:update',
    deleteCategory: 'catalog:categories:delete',
    listSuppliers: 'catalog:suppliers:list',
    createSupplier: 'catalog:suppliers:create',
    updateSupplier: 'catalog:suppliers:update',
    setSupplierActive: 'catalog:suppliers:set-active',
    listProducts: 'catalog:products:list',
    createProduct: 'catalog:products:create',
    updateProduct: 'catalog:products:update',
    setProductActive: 'catalog:products:set-active',
  },
  customers: {
    list: 'customers:list',
    create: 'customers:create',
    update: 'customers:update',
    history: 'customers:history',
  },
  sales: {
    searchProducts: 'sales:products:search',
    checkout: 'sales:checkout',
  },
} as const
