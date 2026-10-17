"use client"

import { API_ROUTES } from "@/lib/api"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronUp, ChevronDown, ArrowUpRight, ArrowDownRight, Trash2, RefreshCw, UserIcon } from "lucide-react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"

interface StockActivity {
  _id: string
  purchase_date?: string
  report_date?: string
  issue_date?: string
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
  department?: string
  office_id?: string
  remarks?: string
}

interface UserData {
  _id: string
  name: string
  email: string
  role: string
}

interface Item {
  _id: string
  name: string
}

interface Supplier {
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
  getUserById: (userId: string) => API_ROUTES.users.getById(userId),
  getUserStockOuts: (userId: string) => API_ROUTES.stockouts.user(userId),
  getUserStockIns: (userId: string) => API_ROUTES.stockins.user(userId),
  getDeadStock: () => API_ROUTES.deadstocks.list,
  getAllItems: () => API_ROUTES.items.list,
  getAllSuppliers: () => API_ROUTES.suppliers.list,
  getAllUsers: () => API_ROUTES.users.list,
  getAllDepartments: () => API_ROUTES.departments.list,
  getAllOffices: () => API_ROUTES.offices.list,
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
    return null
  }
}

export default function UserDashboard() {
  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <UserDashboardContent />
    </Suspense>
  )
}

function UserDashboardContent() {
  const searchParams = useSearchParams()
  const userIdParam = searchParams.get("id")

  const [userId, setUserId] = useState<string>("")

  useEffect(() => {
    setUserId(userIdParam || localStorage.getItem("userId") || "")
  }, [userIdParam])

  const [user, setUser] = useState<UserData | null>(null)
  const [stockIns, setStockIns] = useState<StockActivity[]>([])
  const [stockOuts, setStockOuts] = useState<StockActivity[]>([])
  const [deadStock, setDeadStock] = useState<StockActivity[]>([])

  const [currentPages, setCurrentPages] = useState({
    stockIn: 1,
    stockOut: 1,
    deadStock: 1,
  })

  const [idToName, setIdToName] = useState({
    items: {} as Record<string, string>,
    suppliers: {} as Record<string, string>,
    users: {} as Record<string, string>,
    departments: {} as Record<string, string>,
    offices: {} as Record<string, string>,
  })

  const [stats, setStats] = useState({
    totalStockOut: 0,
    totalStockIn: 0,
    totalDeadStock: 0,
  })

  const [expandedTables, setExpandedTables] = useState({
    stockIn: true,
    stockOut: true,
    deadStock: true,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!userId) {
      setError("User ID not provided. Please pass ?id=USER_ID in URL")
      setLoading(false)
      return
    }

    const loadUserData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [userData, outData, inData, deadData, itemsData, suppliersData, usersData, departmentsData, officesData] =
          await Promise.all([
            fetchFromAPI(API_ENDPOINTS.getUserById(userId)),
            fetchFromAPI(API_ENDPOINTS.getUserStockOuts(userId)),
            fetchFromAPI(API_ENDPOINTS.getUserStockIns(userId)),
            fetchFromAPI(API_ENDPOINTS.getDeadStock()),
            fetchFromAPI(API_ENDPOINTS.getAllItems()),
            fetchFromAPI(API_ENDPOINTS.getAllSuppliers()),
            fetchFromAPI(API_ENDPOINTS.getAllUsers()),
            fetchFromAPI(API_ENDPOINTS.getAllDepartments()),
            fetchFromAPI(API_ENDPOINTS.getAllOffices()),
          ])

        const itemsMap: Record<string, string> = {}
        const suppliersMap: Record<string, string> = {}
        const usersMap: Record<string, string> = {}
        const departmentsMap: Record<string, string> = {}
        const officesMap: Record<string, string> = {}

        itemsData?.forEach((item: Item) => (itemsMap[item._id] = item.name))
        suppliersData?.forEach((supplier: Supplier) => (suppliersMap[supplier._id] = supplier.name))
        usersData?.forEach((u: any) => (usersMap[u._id] = u.name))
        departmentsData?.forEach((dept: Department) => (departmentsMap[dept._id] = dept.name))
        officesData?.forEach((office: Office) => (officesMap[office._id] = office.name))

        setIdToName({
          items: itemsMap,
          suppliers: suppliersMap,
          users: usersMap,
          departments: departmentsMap,
          offices: officesMap,
        })

        if (userData && !Array.isArray(userData)) {
          setUser(userData)
        }

        if (Array.isArray(outData)) {
          setStockOuts(
            outData.sort((a, b) => new Date(b.issue_date || "").getTime() - new Date(a.issue_date || "").getTime()),
          )
        }

        if (Array.isArray(inData)) {
          setStockIns(
            inData.sort(
              (a, b) => new Date(b.purchase_date || "").getTime() - new Date(a.purchase_date || "").getTime(),
            ),
          )
        }

        if (Array.isArray(deadData)) {
          const userDeadStock = deadData
            .filter((item: StockActivity) => item.user_id === userId)
            .sort((a, b) => new Date(b.report_date || "").getTime() - new Date(a.report_date || "").getTime())
          setDeadStock(userDeadStock)
        }

        setStats({
          totalStockOut: Array.isArray(outData) ? outData.length : 0,
          totalStockIn: Array.isArray(inData) ? inData.length : 0,
          totalDeadStock: Array.isArray(deadData)
            ? deadData.filter((item: StockActivity) => item.user_id === userId).length
            : 0,
        })
      } catch (err) {
        setError("Failed to load user dashboard. Check console for details.")
        console.error("Dashboard error:", err)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [userId])

  const handleRefresh = async () => {
    setRefreshing(true)
    if (userId) {
      try {
        const [outData, inData, deadData] = await Promise.all([
          fetchFromAPI(API_ENDPOINTS.getUserStockOuts(userId)),
          fetchFromAPI(API_ENDPOINTS.getUserStockIns(userId)),
          fetchFromAPI(API_ENDPOINTS.getDeadStock()),
        ])

        if (Array.isArray(outData)) {
          setStockOuts(
            outData.sort((a, b) => new Date(b.issue_date || "").getTime() - new Date(a.issue_date || "").getTime()),
          )
        }

        if (Array.isArray(inData)) {
          setStockIns(
            inData.sort(
              (a, b) => new Date(b.purchase_date || "").getTime() - new Date(a.purchase_date || "").getTime(),
            ),
          )
        }

        if (Array.isArray(deadData)) {
          const userDeadStock = deadData
            .filter((item: StockActivity) => item.user_id === userId)
            .sort((a, b) => new Date(b.report_date || "").getTime() - new Date(a.report_date || "").getTime())
          setDeadStock(userDeadStock)
        }
      } catch (err) {
        console.error("Refresh error:", err)
      }
    }
    setRefreshing(false)
  }

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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">User Dashboard</h1>
            {user && (
              <p className="text-slate-600 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Welcome, {user.name}
              </p>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Stock In</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalStockIn}</p>
                </div>
                <ArrowUpRight className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Stock Out</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalStockOut}</p>
                </div>
                <ArrowDownRight className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-2">Dead Stock</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.totalDeadStock}</p>
                </div>
                <Trash2 className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Stock In Table */}
          <Card className="border-slate-200">
            <div
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpandedTables((p) => ({ ...p, stockIn: !p.stockIn }))}
            >
              <div className="flex items-center gap-3">
                <ArrowUpRight className="w-5 h-5 text-green-600" />
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Stock In Records</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{stockIns.length} total entries</p>
                </div>
              </div>
              {expandedTables.stockIn ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </div>

            {expandedTables.stockIn && (
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
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Invoice</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Supplier Name</th>
                        <th className="px-6 py-4 text-left font-semibold text-slate-900">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData(stockIns, "stockIn").length > 0 ? (
                        getPaginatedData(stockIns, "stockIn").map((item) => (
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
                            No stock in records
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {getTotalPages(stockIns.length) > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setCurrentPages((p) => ({ ...p, stockIn: Math.max(1, p.stockIn - 1) }))}
                      disabled={currentPages.stockIn === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {currentPages.stockIn} of {getTotalPages(stockIns.length)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPages((p) => ({
                          ...p,
                          stockIn: Math.min(getTotalPages(stockIns.length), p.stockIn + 1),
                        }))
                      }
                      disabled={currentPages.stockIn === getTotalPages(stockIns.length)}
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
              onClick={() => setExpandedTables((p) => ({ ...p, stockOut: !p.stockOut }))}
            >
              <div className="flex items-center gap-3">
                <ArrowDownRight className="w-5 h-5 text-red-600" />
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Stock Out Records</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{stockOuts.length} total entries</p>
                </div>
              </div>
              {expandedTables.stockOut ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </div>

            {expandedTables.stockOut && (
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
                      {getPaginatedData(stockOuts, "stockOut").length > 0 ? (
                        getPaginatedData(stockOuts, "stockOut").map((item) => (
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
                            No stock out records
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {getTotalPages(stockOuts.length) > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setCurrentPages((p) => ({ ...p, stockOut: Math.max(1, p.stockOut - 1) }))}
                      disabled={currentPages.stockOut === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {currentPages.stockOut} of {getTotalPages(stockOuts.length)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPages((p) => ({
                          ...p,
                          stockOut: Math.min(getTotalPages(stockOuts.length), p.stockOut + 1),
                        }))
                      }
                      disabled={currentPages.stockOut === getTotalPages(stockOuts.length)}
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
              onClick={() => setExpandedTables((p) => ({ ...p, deadStock: !p.deadStock }))}
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">Dead Stock Records</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">{deadStock.length} total entries</p>
                </div>
              </div>
              {expandedTables.deadStock ? (
                <ChevronUp className="w-5 h-5 text-slate-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-600" />
              )}
            </div>

            {expandedTables.deadStock && (
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
                      {getPaginatedData(deadStock, "deadStock").length > 0 ? (
                        getPaginatedData(deadStock, "deadStock").map((item) => (
                          <tr key={item._id} className="border-b border-slate-200 hover:bg-slate-50">
                            <td className="px-6 py-4 text-slate-700">{formatDate(item.report_date)}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium">
                              {idToName.items[item.item_id] || item.item_id}
                            </td>
                            <td className="px-6 py-4 text-slate-700">{item.quantity}</td>
                            <td className="px-6 py-4 text-slate-700">{item.reason}</td>
                            <td className="px-6 py-4 text-slate-700">
                              {idToName.users[item.user_id || ""] || item.user_id || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {idToName.departments[item.department || ""] || item.department || "—"}
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {idToName.offices[item.office_id || ""] || item.office_id || "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                            No dead stock records
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {getTotalPages(deadStock.length) > 1 && (
                  <div className="flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
                    <button
                      onClick={() => setCurrentPages((p) => ({ ...p, deadStock: Math.max(1, p.deadStock - 1) }))}
                      disabled={currentPages.deadStock === 1}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-slate-600">
                      Page {currentPages.deadStock} of {getTotalPages(deadStock.length)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPages((p) => ({
                          ...p,
                          deadStock: Math.min(getTotalPages(deadStock.length), p.deadStock + 1),
                        }))
                      }
                      disabled={currentPages.deadStock === getTotalPages(deadStock.length)}
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
