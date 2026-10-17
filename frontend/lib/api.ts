// Public backend origin only: never put database credentials or secrets here.
// Override at build time with NEXT_PUBLIC_API_URL (without /api).
export const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://pstu-inventory-management-system-with-ywv1.onrender.com"
).replace(/\/+$/, "")

// All backend endpoints live here. Pages import API_ROUTES instead of building URLs.
export const API_ROUTES = {
  blockchain: {
    audit: (id: string | number) => `${API_ORIGIN}/api/blockchain/audit/${encodeURIComponent(id)}`,
  },
  categories: {
    getById: (id: string | number) => `${API_ORIGIN}/api/categories/get/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/categories/get`,
  },
  currentstockins: {
    create: `${API_ORIGIN}/api/currentstockins/create`,
    list: `${API_ORIGIN}/api/currentstockins/get`,
    quantity: (userId: string | number, itemId: string | number) => `${API_ORIGIN}/api/currentstockins/quantity?user_id=${encodeURIComponent(userId)}&item_id=${encodeURIComponent(itemId)}`,
    updateQuantity: `${API_ORIGIN}/api/currentstockins/update-quantity`,
  },
  currentstockouts: {
    create: `${API_ORIGIN}/api/currentstockouts/create`,
    list: `${API_ORIGIN}/api/currentstockouts/get`,
    quantity: (userId: string | number, itemId: string | number) => `${API_ORIGIN}/api/currentstockouts/quantity?user_id=${encodeURIComponent(userId)}&item_id=${encodeURIComponent(itemId)}`,
    updateQuantity: `${API_ORIGIN}/api/currentstockouts/update-quantity`,
  },
  deadstockrequests: {
    approve: (id: string | number) => `${API_ORIGIN}/api/deadstockrequests/approve/${encodeURIComponent(id)}`,
    create: `${API_ORIGIN}/api/deadstockrequests/create`,
    list: `${API_ORIGIN}/api/deadstockrequests/get`,
    reject: (id: string | number) => `${API_ORIGIN}/api/deadstockrequests/reject/${encodeURIComponent(id)}`,
  },
  deadstocks: {
    create: `${API_ORIGIN}/api/deadstocks/create`,
    delete: (id: string | number) => `${API_ORIGIN}/api/deadstocks/delete/${encodeURIComponent(id)}`,
    department: (id: string | number) => `${API_ORIGIN}/api/deadstocks/department/${encodeURIComponent(id)}`,
    item: (id: string | number) => `${API_ORIGIN}/api/deadstocks/item/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/deadstocks/get`,
    office: (id: string | number) => `${API_ORIGIN}/api/deadstocks/office/${encodeURIComponent(id)}`,
    update: (id: string | number) => `${API_ORIGIN}/api/deadstocks/update/${encodeURIComponent(id)}`,
    user: (id: string | number) => `${API_ORIGIN}/api/deadstocks/user/${encodeURIComponent(id)}`,
  },
  departments: {
    create: `${API_ORIGIN}/api/departments/create`,
    delete: (id: string | number) => `${API_ORIGIN}/api/departments/delete/${encodeURIComponent(id)}`,
    getById: (id: string | number) => `${API_ORIGIN}/api/departments/get/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/departments/get`,
    update: (id: string | number) => `${API_ORIGIN}/api/departments/update/${encodeURIComponent(id)}`,
  },
  files: {
    upload: (filename: string | number) => `${API_ORIGIN}/uploads/${encodeURIComponent(filename)}`,
  },
  items: {
    create: `${API_ORIGIN}/api/items/create`,
    delete: (id: string | number) => `${API_ORIGIN}/api/items/delete/${encodeURIComponent(id)}`,
    getById: (id: string | number) => `${API_ORIGIN}/api/items/get/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/items/get`,
    update: (id: string | number) => `${API_ORIGIN}/api/items/update/${encodeURIComponent(id)}`,
  },
  offices: {
    create: `${API_ORIGIN}/api/offices/create`,
    delete: (id: string | number) => `${API_ORIGIN}/api/offices/delete/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/offices/get`,
    update: (id: string | number) => `${API_ORIGIN}/api/offices/update/${encodeURIComponent(id)}`,
  },
  records: {
    getByType: (type: string | number, id: string | number) => `${API_ORIGIN}/api/${encodeURIComponent(type)}s/get/${encodeURIComponent(id)}`,
  },
  stockInRequest: {
    create: `${API_ORIGIN}/api/stockInRequest/create`,
    list: `${API_ORIGIN}/api/stockInRequest/get`,
    update: (id: string | number) => `${API_ORIGIN}/api/stockInRequest/update/${encodeURIComponent(id)}`,
  },
  stockins: {
    create: `${API_ORIGIN}/api/stockins/create`,
    delete: (id: string | number) => `${API_ORIGIN}/api/stockins/delete/${encodeURIComponent(id)}`,
    department: (id: string | number) => `${API_ORIGIN}/api/stockins/department/${encodeURIComponent(id)}`,
    getById: (id: string | number) => `${API_ORIGIN}/api/stockins/get/${encodeURIComponent(id)}`,
    item: (id: string | number) => `${API_ORIGIN}/api/stockins/item/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/stockins/get`,
    office: (id: string | number) => `${API_ORIGIN}/api/stockins/office/${encodeURIComponent(id)}`,
    update: (id: string | number) => `${API_ORIGIN}/api/stockins/update/${encodeURIComponent(id)}`,
    user: (id: string | number) => `${API_ORIGIN}/api/stockins/user/${encodeURIComponent(id)}`,
  },
  stockouts: {
    create: `${API_ORIGIN}/api/stockouts/create`,
    delete: (id: string | number) => `${API_ORIGIN}/api/stockouts/delete/${encodeURIComponent(id)}`,
    department: (id: string | number) => `${API_ORIGIN}/api/stockouts/department/${encodeURIComponent(id)}`,
    item: (id: string | number) => `${API_ORIGIN}/api/stockouts/item/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/stockouts/get`,
    office: (id: string | number) => `${API_ORIGIN}/api/stockouts/office/${encodeURIComponent(id)}`,
    update: (id: string | number) => `${API_ORIGIN}/api/stockouts/update/${encodeURIComponent(id)}`,
    user: (id: string | number) => `${API_ORIGIN}/api/stockouts/user/${encodeURIComponent(id)}`,
  },
  suppliers: {
    create: `${API_ORIGIN}/api/suppliers/create`,
    getById: (id: string | number) => `${API_ORIGIN}/api/suppliers/get/${encodeURIComponent(id)}`,
    list: `${API_ORIGIN}/api/suppliers/get`,
  },
  users: {
    create: `${API_ORIGIN}/api/users/create`,
    delete: (id: string | number) => `${API_ORIGIN}/api/users/delete/${encodeURIComponent(id)}`,
    getById: (id: string | number) => `${API_ORIGIN}/api/users/get/${encodeURIComponent(id)}`,
    getStaff: `${API_ORIGIN}/api/users/get-staff`,
    getTeachers: `${API_ORIGIN}/api/users/get-teachers`,
    list: `${API_ORIGIN}/api/users/get`,
    login: `${API_ORIGIN}/api/users/login`,
    requestPasswordOtp: `${API_ORIGIN}/api/users/request-password-otp`,
    update: (id: string | number) => `${API_ORIGIN}/api/users/update/${encodeURIComponent(id)}`,
    updatePassword: `${API_ORIGIN}/api/users/update-password`,
    verifyPasswordOtp: `${API_ORIGIN}/api/users/verify-password-otp`,
  },
} as const
