"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Building2,
  Trash2,
  MapPin,
  Truck,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface StockActivity {
  _id: string
  purchase_date?: string
  issue_date?: string
  reported_at?: string
  item_id: string
  supplier_id?: string
  quantity: number
  unit_price?: number
  total_price?: number
  invoice_no?: string
  issue_type?: string
  issue_by?: string
  user_id?: string
  reason?: string
  department_id?: string
  office_id?: string
  remarks?: string
}

interface Item {
  _id: string
  name: string
}

interface Supplier {
  _id: string
  name: string
}

interface User {
  _id: string
  name: string
}

interface Department {
  _id: string
  name: string
}

interface Office {
  _id: string
  name: string
}

const API_ENDPOINTS = {
  departments: API_ROUTES.departments.list,
  offices: API_ROUTES.offices.list,
  suppliers: API_ROUTES.suppliers.list,
  items: API_ROUTES.items.list,
  stockIns: API_ROUTES.stockins.list,
  stockOuts: API_ROUTES.stockouts.list,
  deadStocks: API_ROUTES.deadstocks.list,
  users: API_ROUTES.users.list,
  categories: API_ROUTES.categories.list,
} as const

async function fetchFromAPI(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error)
    return []
  }
}

export default function AdminDashboard() {
  const [expandedSections, setExpandedSections] = useState({
    stockIn: true,
    stockOut: true,
    deadStock: true,
  })

  const [currentPages, setCurrentPages] = useState({
    stockIn: 1,
    stockOut: 1,
    deadStock: 1,
  })

  const [data, setData] = useState({
    totalItems: 0,
    totalStockIn: 0,
    totalStockOut: 0,
    totalDeadStock: 0,
    totalUsers: 0,
    totalDepartments: 0,
    totalOffices: 0,
    totalSuppliers: 0,
    recentStockIn: [] as StockActivity[],
    recentStockOut: [] as StockActivity[],
    recentDeadStock: [] as StockActivity[],
  })

  const [idToName, setIdToName] = useState({
    items: {} as Record<string, string>,
    suppliers: {} as Record<string, string>,
    users: {} as Record<string, string>,
    departments: {} as Record<string, string>,
    offices: {} as Record<string, string>,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setError(null)

        const [items, stockIns, stockOuts, deadStocks, users, departments, offices, suppliers] = await Promise.all([
          fetchFromAPI(API_ENDPOINTS.items),
          fetchFromAPI(API_ENDPOINTS.stockIns),
          fetchFromAPI(API_ENDPOINTS.stockOuts),
          fetchFromAPI(API_ENDPOINTS.deadStocks),
          fetchFromAPI(API_ENDPOINTS.users),
          fetchFromAPI(API_ENDPOINTS.departments),
          fetchFromAPI(API_ENDPOINTS.offices),
          fetchFromAPI(API_ENDPOINTS.suppliers),
        ])

        const itemsMap: Record<string, string> = {}
        const suppliersMap: Record<string, string> = {}
        const usersMap: Record<string, string> = {}
        const departmentsMap: Record<string, string> = {}
        const officesMap: Record<string, string> = {}

        items.forEach((item: Item) => (itemsMap[item._id] = item.name))
        suppliers.forEach((supplier: Supplier) => (suppliersMap[supplier._id] = supplier.name))
        users.forEach((user: User) => (usersMap[user._id] = user.name))
        departments.forEach((dept: Department) => (departmentsMap[dept._id] = dept.name))
        offices.forEach((office: Office) => (officesMap[office._id] = office.name))

        setIdToName({
          items: itemsMap,
          suppliers: suppliersMap,
          users: usersMap,
          departments: departmentsMap,
          offices: officesMap,
        })

        const sortedStockIn = (stockIns || []).sort(
          (a: any, b: any) =>
            new Date(b.purchase_date || b.createdAt).getTime() - new Date(a.purchase_date || a.createdAt).getTime(),
        )

        const sortedStockOut = (stockOuts || []).sort(
          (a: any, b: any) =>
            new Date(b.issue_date || b.createdAt).getTime() - new Date(a.issue_date || a.createdAt).getTime(),
        )

        const sortedDeadStock = (deadStocks || []).sort(
          (a: any, b: any) =>
            new Date(b.reported_at || b.createdAt).getTime() - new Date(a.reported_at || a.createdAt).getTime(),
        )

        setData({
          totalItems: items?.length || 0,
          totalStockIn: stockIns?.length || 0,
          totalStockOut: stockOuts?.length || 0,
          totalDeadStock: deadStocks?.length || 0,
          totalUsers: users?.length || 0,
          totalDepartments: departments?.length || 0,
          totalOffices: offices?.length || 0,
          totalSuppliers: suppliers?.length || 0,
          recentStockIn: sortedStockIn,
          recentStockOut: sortedStockOut,
          recentDeadStock: sortedDeadStock,
        })
      } catch (err) {
        setError("Failed to load dashboard data. Please try again.")
        console.error("Dashboard error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const ITEMS_PER_PAGE = 5

  const getPaginatedData = (data: StockActivity[], pageKey: keyof typeof currentPages) => {
    const startIdx = (currentPages[pageKey] - 1) * ITEMS_PER_PAGE
    return data.slice(startIdx, startIdx + ITEMS_PER_PAGE)
  }

  const getTotalPages = (dataLength: number) => {
    return Math.ceil(dataLength / ITEMS_PER_PAGE)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Manage inventory, stock, and operations</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        {/* Stats Grid - Main Inventory Metrics */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Inventory Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Items */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Items</CardTitle>
                <Package className="w-5 h-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalItems.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">In inventory</p>
              </CardContent>
            </Card>

            {/* Stock In */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Stock In</CardTitle>
                <ArrowUpRight className="w-5 h-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalStockIn.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Total entries</p>
              </CardContent>
            </Card>

            {/* Stock Out */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Stock Out</CardTitle>
                <ArrowDownRight className="w-5 h-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalStockOut.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Total entries</p>
              </CardContent>
            </Card>

            {/* Dead Stock */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Dead Stock</CardTitle>
                <Trash2 className="w-5 h-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalDeadStock.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Inactive items</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Organization Stats */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Organization</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Users */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
                <Users className="w-5 h-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Total accounts</p>
              </CardContent>
            </Card>

            {/* Departments */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Departments</CardTitle>
                <Building2 className="w-5 h-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalDepartments.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Active departments</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Offices</CardTitle>
                <MapPin className="w-5 h-5 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalOffices.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Locations</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Suppliers</CardTitle>
                <Truck className="w-5 h-5 text-rose-600" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{data.totalSuppliers.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-2">Active suppliers</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Inventory Records */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Detailed Inventory Records</h2>
            <p className="text-sm text-slate-500">All records sorted by most recent date first</p>
          </div>

          {/* Stock In Table */}
          <Card className="border-slate-200">
            <div
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleSection("stockIn")}
            >
              <div className="flex items-center gap-3">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Stock In Records</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{data.recentStockIn.length} total entries</p>
                </div>
              </div>
              {expandedSections.stockIn ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </div>

            {expandedSections.stockIn && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Date</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Item Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Quantity</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Unit Price</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Total Price</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Invoice No</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Supplier Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(data.recentStockIn, "stockIn").length > 0 ? (
                        getPaginatedData(data.recentStockIn, "stockIn").map((item) => (
                          <tr key={item._id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-6 py-4 text-slate-700">{formatDate(item.purchase_date)}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium">
                              {idToName.items[item.item_id] || item.item_id}
                            </td>
                            <td className="px-6 py-4 text-slate-700">{item.quantity}</td>
                            <td className="px-6 py-4 text-slate-700">৳ {item.unit_price?.toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-700 font-semibold text-green-600">
                              ৳ {item.total_price?.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-slate-700">{item.invoice_no}</td>
                            <td className="px-6 py-4 text-slate-700">
                              {idToName.suppliers[item.supplier_id || ""] || item.supplier_id || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.remarks || "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                            No stock in records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {getTotalPages(data.recentStockIn.length) > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setCurrentPages((p) => ({ ...p, stockIn: Math.max(1, p.stockIn - 1) }))}
                      disabled={currentPages.stockIn === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {currentPages.stockIn} of {getTotalPages(data.recentStockIn.length)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPages((p) => ({
                          ...p,
                          stockIn: Math.min(getTotalPages(data.recentStockIn.length), p.stockIn + 1),
                        }))
                      }
                      disabled={currentPages.stockIn === getTotalPages(data.recentStockIn.length)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Stock Out Table */}
          <Card className="border-slate-200">
            <div
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleSection("stockOut")}
            >
              <div className="flex items-center gap-3">
                <ArrowDownRight className="w-5 h-5 text-red-600" />
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Stock Out Records</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{data.recentStockOut.length} total entries</p>
                </div>
              </div>
              {expandedSections.stockOut ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </div>

            {expandedSections.stockOut && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Date</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Item Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Quantity</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Issue Type</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Issued By Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">User Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(data.recentStockOut, "stockOut").length > 0 ? (
                        getPaginatedData(data.recentStockOut, "stockOut").map((item) => (
                          <tr key={item._id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-6 py-4 text-slate-700">{formatDate(item.issue_date)}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium">
                              {idToName.items[item.item_id] || item.item_id}
                            </td>
                            <td className="px-6 py-4 text-slate-700">{item.quantity}</td>
                            <td className="px-6 py-4 text-slate-700">{item.issue_type}</td>
                            <td className="px-6 py-4 text-slate-700">
                              {idToName.users[item.issue_by || ""] || item.issue_by || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-700">
                              {idToName.users[item.user_id || ""] || item.user_id || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.remarks || "—"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                            No stock out records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {getTotalPages(data.recentStockOut.length) > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setCurrentPages((p) => ({ ...p, stockOut: Math.max(1, p.stockOut - 1) }))}
                      disabled={currentPages.stockOut === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {currentPages.stockOut} of {getTotalPages(data.recentStockOut.length)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPages((p) => ({
                          ...p,
                          stockOut: Math.min(getTotalPages(data.recentStockOut.length), p.stockOut + 1),
                        }))
                      }
                      disabled={currentPages.stockOut === getTotalPages(data.recentStockOut.length)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Dead Stock Table */}
          <Card className="border-slate-200">
            <div
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50"
              onClick={() => toggleSection("deadStock")}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Dead Stock Records</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{data.recentDeadStock.length} total entries</p>
                </div>
              </div>
              {expandedSections.deadStock ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </div>

            {expandedSections.deadStock && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-t border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Date Reported</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Item Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Quantity</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Reason</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">User Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Department Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Office Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(data.recentDeadStock, "deadStock").length > 0 ? (
                        getPaginatedData(data.recentDeadStock, "deadStock").map((item) => (
                          <tr key={item._id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-6 py-4 text-slate-700">{formatDate(item.reported_at)}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium">
                              {idToName.items[item.item_id] || item.item_id}
                            </td>
                            <td className="px-6 py-4 text-slate-700">{item.quantity}</td>
                            <td className="px-6 py-4 text-slate-700">{item.reason}</td>
                            <td className="px-6 py-4 text-slate-700">
                              {idToName.users[item.user_id || ""] || item.user_id || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {idToName.departments[item.department_id || ""] || item.department_id || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {idToName.offices[item.office_id || ""] || item.office_id || "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                            No dead stock records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {getTotalPages(data.recentDeadStock.length) > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setCurrentPages((p) => ({ ...p, deadStock: Math.max(1, p.deadStock - 1) }))}
                      disabled={currentPages.deadStock === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {currentPages.deadStock} of {getTotalPages(data.recentDeadStock.length)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPages((p) => ({
                          ...p,
                          deadStock: Math.min(getTotalPages(data.recentDeadStock.length), p.deadStock + 1),
                        }))
                      }
                      disabled={currentPages.deadStock === getTotalPages(data.recentDeadStock.length)}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
