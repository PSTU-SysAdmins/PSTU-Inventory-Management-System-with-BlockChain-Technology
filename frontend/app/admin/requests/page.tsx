"use client"

import { API_ROUTES } from "@/lib/api"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Clock, X, User, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

// ---------- Types ----------

interface StockRequestRaw {
  _id: string
  user_id?: string
  item_id?: string
  invoice_no?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  supplier_id?: string
  supplier?: string
  description?: string
  image_url?: string
  status?: string
  requested_at?: string
  createdAt?: string
  updatedAt?: string
  requestedByName?: string
  requestedByUserId?: string
  requestedById?: {
    _id: string
    name: string
    email: string
  }
  adminNote?: string
  reviewedByName?: string
  invoiceNo?: string
}

type StockRequest = StockRequestRaw & {
  // normalized fields used by UI
  _id: string
  productName: string
  productSku?: string
  quantity: number
  unitPrice: number
  description: string
  supplier: string
  supplierName?: string
  imageUrl: string
  status: "pending" | "approved" | "rejected"
  requestedByName: string
  requestedByEmail?: string
  requestedByUserId?: string
  requestedById?: {
    _id: string
    name: string
    email: string
  }
  requestedAt: string
  invoiceNo?: string
}

// ---------- Helpers ----------

function safeString(v: any) {
  if (v === undefined || v === null) return ""
  return String(v)
}

function extractId(value: any): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && "_id" in value) return value._id
  return String(value)
}

interface UserData {
  name?: string
  fullName?: string
  email?: string
  role?: string
  department_id?: string
  department?: string
  office_id?: string
  office?: string
}

async function fetchUserData(userId: string): Promise<{ name: string; email: string }> {
  try {
    const cleanId = extractId(userId)
    if (!cleanId) return { name: userId, email: "No email" }

    const response = await fetch(API_ROUTES.users.getById(cleanId))
    if (!response.ok) return { name: cleanId, email: "No email" }

    const data: UserData = await response.json()
    console.log("[v0] fetchUserData result:", data)

    const name = data.name || data.fullName || cleanId
    const email = data.email || "No email"
    return { name, email }
  } catch (err) {
    console.error("[v0] fetchUserData error:", err)
    return { name: userId, email: "No email" }
  }
}

async function fetchItemName(itemId: string): Promise<string> {
  try {
    const cleanId = extractId(itemId)
    if (!cleanId) return itemId

    const response = await fetch(API_ROUTES.items.getById(cleanId))
    if (!response.ok) return cleanId
    const data = await response.json()
    return data.name || data.itemName || cleanId
  } catch {
    return itemId
  }
}

async function fetchSupplierName(supplierId: string): Promise<string> {
  try {
    const cleanId = extractId(supplierId)
    if (!cleanId) return supplierId

    const response = await fetch(API_ROUTES.suppliers.getById(cleanId))
    if (!response.ok) return cleanId
    const data = await response.json()
    return data.name || data.supplierName || cleanId
  } catch {
    return supplierId
  }
}

function normalizeRequest(raw: StockRequestRaw): StockRequest {
  const img = raw.image_url || (raw as any).imageUrl || ""
  const q = typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity || 0)
  const unit = typeof raw.unit_price === "number" ? raw.unit_price : Number(raw.unit_price || 0)
  const total = typeof raw.total_price === "number" ? raw.total_price : Number(raw.total_price || q * unit)

  const productName = (raw as any).productName || (raw as any).itemName || `Item ${raw.item_id || "(unknown)"}`

  const requestedByName = raw.requestedById?.name || raw.requestedByName || "Unknown User"
  const requestedByEmail = raw.requestedById?.email || undefined

  const requestedByUserId = extractId((raw as any).requestedByUserId || raw.requestedById?._id || (raw as any).user_id)

  return {
    ...(raw as any),
    _id: safeString(raw._id),
    productName,
    productSku: (raw as any).productSku || undefined,
    quantity: q,
    unitPrice: unit,
    description: safeString(raw.description),
    supplier: safeString((raw as any).supplier || raw.supplier_id),
    imageUrl: img,
    status:
      (raw.status as any) === "approved" ? "approved" : (raw.status as any) === "rejected" ? "rejected" : "pending",
    requestedByName,
    requestedByEmail,
    requestedByUserId,
    requestedAt: raw.requested_at || raw.createdAt || new Date().toISOString(),
    invoiceNo: raw.invoice_no || (raw as any).invoiceNo || undefined,
  }
}

function getImageUrl(imageUrl: string) {
  if (!imageUrl) return "/placeholder.svg"
  if (imageUrl.startsWith("http")) return imageUrl
  const filename = imageUrl.split("/").pop() || imageUrl
  return API_ROUTES.files.upload(filename)
}

async function createStockInEntry(request: StockRequest, formData?: any) {
  let userId = extractId(request.requestedByUserId || request.requestedById?._id || (request as any).user_id)
  if (!userId) userId = "system"

  const itemId = request.item_id || request.productSku || `ITEM-${request._id}`
  const supplierId = request.supplier || (request as any).supplier_id || "N/A"

  const qty = typeof request.quantity === "number" ? request.quantity : Number((request as any).quantity || 0)
  let unitPrice =
    typeof request.unitPrice === "number"
      ? request.unitPrice
      : typeof (request as any).unit_price === "number"
        ? (request as any).unit_price
        : Number((request as any).unit_price || 0)

  const totalPrice =
    typeof (request as any).total_price === "number"
      ? (request as any).total_price
      : Number((request as any).total_price || 0)

  if ((!unitPrice || unitPrice <= 0) && totalPrice > 0 && qty > 0) {
    unitPrice = totalPrice / qty
  }

  if (!qty || qty <= 0) throw new Error("Quantity must be greater than 0")
  if (!unitPrice || unitPrice <= 0) throw new Error("Valid unit price is required")

  let departmentId: string | null = null
  let officeId: string | null = null
  let userRole: string | null = null

  if (request.requestedById) {
    const rb = request.requestedById as any
    if (rb.department_id || rb.department) departmentId = rb.department_id || rb.department
    if (rb.office_id || rb.office) officeId = rb.office_id || rb.office
    if (rb.role) userRole = rb.role
  }

  if (userId && userId !== "system" && (!departmentId || !officeId)) {
    try {
      const userRes = await fetch(API_ROUTES.users.getById(userId))
      if (userRes.ok) {
        const userData = await userRes.json()
        const user = userData.data || userData.user || userData

        console.log("[v0] User data received:", JSON.stringify(user, null, 2))

        userRole = user.role
        departmentId = user.department_id || user.department || null
        officeId = user.office_id || user.office || null
      }
    } catch (e) {
      console.error("[v0] Error fetching user info:", e)
    }
  }

  if (!departmentId && !officeId) {
    throw new Error(`Cannot create stock-in: requester has no department_id or office_id.\nUserId: ${userId}`)
  }

  const invoiceNo = request.invoiceNo || (request as any).invoice_no || `${itemId}-${Date.now()}`

  const payload: any = {
    user_id: userId,
    item_id: itemId,
    supplier_id: supplierId,
    quantity: qty,
    unit_price: unitPrice,
    total_price: qty * unitPrice,
    purchase_date: new Date(request.requestedAt).toISOString().split("T")[0],
    invoice_no: invoiceNo,
    department_id: departmentId || "ok",
    office_id: officeId || "ok",
    remarks:
      `Stock request approved\n` +
      `Requested by: ${request.requestedByName || request.requestedById?.name || "N/A"}\n` +
      `Product: ${request.productName}\n` +
      `Description: ${request.description}`,
  }

  console.log("createStockInEntry payload:", payload)

  const res = await fetch(API_ROUTES.stockins.create, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let errMsg = `Failed to create stock-in: ${res.status}`
    try {
      const errData = await res.json()
      errMsg = errData.message || JSON.stringify(errData)
    } catch (e) {}
    throw new Error(errMsg)
  }

  const data = await res.json()
  return { invoiceNo: payload.invoice_no, response: data }
}

// ---------- Main Component ----------

export default function StockRequestsPage() {
  const [requests, setRequests] = useState<StockRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(null)
  const [itemNames, setItemNames] = useState<{ [key: string]: string }>({})
  const [supplierNames, setSupplierNames] = useState<{ [key: string]: string }>({})
  const [userData, setUserData] = useState<{ [key: string]: { name: string; email: string } }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [lastPendingCount, setLastPendingCount] = useState(0)
  const [hasNewRequests, setHasNewRequests] = useState(false)

  const pollRef = useRef<number | null>(null)
  const fetchedIdsRef = useRef<{ items: Set<string>; suppliers: Set<string>; users: Set<string> }>({
    items: new Set(),
    suppliers: new Set(),
    users: new Set(),
  })

  useEffect(() => {
    fetchRequests().catch((e) => console.error(e))

    pollRef.current = window.setInterval(() => {
      fetchRequests(false).catch((e) => console.error(e))
    }, 30000)

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (requests.length === 0) return

    const fetchAllNames = async () => {
      console.log("[v0] Fetching names for requests:", requests.length)

      const newItemNames = { ...itemNames }
      const newSupplierNames = { ...supplierNames }
      const newUserData = { ...userData }

      for (const request of requests) {
        if (request.item_id && !fetchedIdsRef.current.items.has(request.item_id)) {
          fetchedIdsRef.current.items.add(request.item_id)
          const name = await fetchItemName(request.item_id)
          console.log("[v0] Item fetched:", request.item_id, "->", name)
          newItemNames[request.item_id] = name
        }

        if (request.supplier && !fetchedIdsRef.current.suppliers.has(request.supplier)) {
          fetchedIdsRef.current.suppliers.add(request.supplier)
          const name = await fetchSupplierName(request.supplier)
          console.log("[v0] Supplier fetched:", request.supplier, "->", name)
          newSupplierNames[request.supplier] = name
        }

        if (request.requestedByUserId && !fetchedIdsRef.current.users.has(request.requestedByUserId)) {
          fetchedIdsRef.current.users.add(request.requestedByUserId)
          const userData = await fetchUserData(request.requestedByUserId)
          console.log("[v0] User fetched:", request.requestedByUserId, "->", userData)
          newUserData[request.requestedByUserId] = userData
        }
      }

      console.log(
        "[v0] Setting state - itemNames:",
        newItemNames,
        "supplierNames:",
        newSupplierNames,
        "userData:",
        newUserData,
      )
      setItemNames(newItemNames)
      setSupplierNames(newSupplierNames)
      setUserData(newUserData)
    }

    fetchAllNames()
  }, [requests])

  async function fetchRequests(showLoading = true) {
    try {
      if (showLoading) setLoading(true)
      const res = await fetch(API_ROUTES.stockInRequest.list)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      const data = await res.json()

      const normalized = Array.isArray(data) ? data.map(normalizeRequest) : []

      setRequests((prev) => {
        const prevPending = prev.filter((r) => r.status === "pending").length
        const newPending = normalized.filter((r) => r.status === "pending").length
        if (prevPending > 0 && newPending > prevPending) {
          setHasNewRequests(true)
        }
        setLastPendingCount(newPending)
        return normalized
      })
      setError(null)
    } catch (err) {
      console.error("fetchRequests error", err)
      setError(err instanceof Error ? err.message : "Unknown error fetching requests")
    } finally {
      setLoading(false)
    }
  }

  const pendingRequests = requests.filter((r) => r.status === "pending")
  const approvedRequests = requests.filter((r) => r.status === "approved")
  const rejectedRequests = requests.filter((r) => r.status === "rejected")

  function handleApproveClick(request: StockRequest) {
    onApprove(request)
  }

  async function onApprove(request: StockRequest) {
    setApprovingId(request._id)

    try {
      const { invoiceNo } = await createStockInEntry(request)

      const res = await fetch(API_ROUTES.stockInRequest.update(request._id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          reviewedByName: "Admin",
          adminNote: "Auto-approved with stock entry",
          invoiceNo,
        }),
      })

      if (!res.ok) {
        let msg = `Failed to update request: ${res.status}`
        try {
          const d = await res.json()
          msg = d.message || JSON.stringify(d)
        } catch (e) {}
        throw new Error(msg)
      }

      const updated = await res.json()
      const normalized = normalizeRequest(updated)

      setRequests((prev) => prev.map((r) => (r._id === normalized._id ? normalized : r)))
      if (selectedRequest?._id === normalized._id) setSelectedRequest(normalized)

      setError(null)
    } catch (err) {
      console.error("onApprove error", err)
      setError(err instanceof Error ? err.message : "Failed to approve request")
    } finally {
      setApprovingId(null)
    }
  }

  async function onReject(request: StockRequest) {
    setRejectingId(request._id)
    try {
      const res = await fetch(API_ROUTES.stockInRequest.update(request._id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", reviewedByName: "Admin", adminNote: "Rejected by admin" }),
      })

      if (!res.ok) throw new Error(`Failed to reject: ${res.status}`)
      const updated = await res.json()
      const normalized = normalizeRequest(updated)
      setRequests((prev) => prev.map((r) => (r._id === normalized._id ? normalized : r)))
      if (selectedRequest?._id === normalized._id) setSelectedRequest(normalized)
    } catch (err) {
      console.error("onReject error", err)
      setError(err instanceof Error ? err.message : "Reject failed")
    } finally {
      setRejectingId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-slate-300 border-t-blue-600 rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading stock requests...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Stock Requests</h1>
          <p className="text-slate-600">Manage and review stock request submissions</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Pending Requests <span className="text-amber-600">({pendingRequests.length})</span>
              </h2>
              <p className="text-sm text-slate-600">Awaiting admin review</p>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white">
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No pending requests at this time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingRequests.map((request) => (
                <RequestCard
                  key={request._id}
                  request={request}
                  userData={userData}
                  itemNames={itemNames}
                  supplierNames={supplierNames}
                  onClick={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Approved Requests <span className="text-green-600">({approvedRequests.length})</span>
              </h2>
              <p className="text-sm text-slate-600">Successfully approved and ready</p>
            </div>
          </div>

          {approvedRequests.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No approved requests yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {approvedRequests.map((request) => (
                <RequestCard
                  key={request._id}
                  request={request}
                  userData={userData}
                  itemNames={itemNames}
                  supplierNames={supplierNames}
                  onClick={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-100 rounded-lg">
              <X className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Rejected Requests <span className="text-red-600">({rejectedRequests.length})</span>
              </h2>
              <p className="text-sm text-slate-600">Declined requests</p>
            </div>
          </div>

          {rejectedRequests.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white">
              <CardContent className="py-12 text-center">
                <X className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No rejected requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rejectedRequests.map((request) => (
                <RequestCard
                  key={request._id}
                  request={request}
                  userData={userData}
                  itemNames={itemNames}
                  supplierNames={supplierNames}
                  onClick={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          userData={userData}
          itemNames={itemNames}
          supplierNames={supplierNames}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => handleApproveClick(selectedRequest)}
          onReject={() => onReject(selectedRequest)}
          isApproving={approvingId === selectedRequest._id}
          isRejecting={rejectingId === selectedRequest._id}
        />
      )}
    </main>
  )
}

// ---------- Subcomponents ----------

function RequestDetailModal({
  request,
  userData,
  itemNames,
  supplierNames,
  onClose,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  request: StockRequest
  userData: { [key: string]: { name: string; email: string } }
  itemNames: { [key: string]: string }
  supplierNames: { [key: string]: string }
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
  isApproving?: boolean
  isRejecting?: boolean
}) {
  const isPending = request.status === "pending"
  const userId = request.requestedByUserId
  const cachedUser = userId ? userData[userId] : null

  const requesterName = cachedUser?.name || request.requestedById?.name || request.requestedByName || "Unknown User"
  const requesterEmail =
    cachedUser?.email || request.requestedById?.email || request.requestedByEmail || "No email available"

  const itemName = request.item_id ? itemNames[request.item_id] || request.item_id : "N/A"
  const supplierName = request.supplier ? supplierNames[request.supplier] || request.supplier : "N/A"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-100 border-b border-slate-200 px-6 py-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6" /> {itemName}
          </h2>
          <button onClick={onClose} className="text-slate-600 text-2xl font-bold">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="h-72 bg-slate-100 rounded border border-slate-200 overflow-hidden flex items-center justify-center">
            <img
              src={getImageUrl(request.imageUrl) || "/placeholder.svg"}
              alt={request.productName}
              className="w-full h-full object-cover"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>

          <div className="border-b border-slate-200 pb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-3xl font-bold text-slate-900">{request.productName}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  {request.status === "approved" && request.invoiceNo ? (
                    <>Invoice: {request.invoiceNo}</>
                  ) : (
                    <>{itemName}</>
                  )}
                </p>
              </div>
              <Badge
                className={`font-bold px-4 py-1 text-sm ${request.status === "approved" ? "bg-green-500" : request.status === "rejected" ? "bg-red-500" : "bg-amber-500"}`}
              >
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-200 rounded flex-shrink-0">
                <User className="h-6 w-6 text-slate-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Requested By</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{requesterName}</p>
                <p className="text-sm text-slate-600 mt-1">{requesterEmail}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50 w-1/3">
                    Product Description
                  </td>
                  <td className="px-4 py-3 text-slate-900">{request.description}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50">Supplier</td>
                  <td className="px-4 py-3 text-slate-900">{supplierName}</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50">Quantity</td>
                  <td className="px-4 py-3 text-slate-900 font-bold">{request.quantity} units</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-50">Unit Price</td>
                  <td className="px-4 py-3 text-slate-900">৳ {request.unitPrice.toFixed(2)}</td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-4 py-3 text-sm font-bold text-green-700 bg-green-100">Total Amount</td>
                  <td className="px-4 py-3 text-lg font-bold text-green-700">
                    ৳ {(request.quantity * request.unitPrice).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-sm text-slate-600">
            <p className="font-semibold">Requested at:</p>
            <p>{new Date(request.requestedAt).toLocaleString()}</p>
          </div>

          {isPending && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => onReject && onReject()}
                disabled={isRejecting}
                variant="destructive"
                className="flex-1"
              >
                {isRejecting ? "Rejecting..." : "Reject"}
              </Button>
              <Button
                onClick={() => onApprove && onApprove()}
                disabled={isApproving}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isApproving ? "Approving..." : "Approve"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RequestCard({
  request,
  userData,
  itemNames,
  supplierNames,
  onClick,
}: {
  request: StockRequest
  userData: { [key: string]: { name: string; email: string } }
  itemNames: { [key: string]: string }
  supplierNames: { [key: string]: string }
  onClick: () => void
}) {
  const isApproved = request.status === "approved"
  const isRejected = request.status === "rejected"

  const userId = request.requestedByUserId
  const cachedUser = userId ? userData[userId] : null
  const requesterName = cachedUser?.name || request.requestedById?.name || request.requestedByName || "Unknown"
  const requesterEmail = cachedUser?.email || request.requestedById?.email || request.requestedByEmail || "No email"

  const itemName = request.item_id ? itemNames[request.item_id] || request.item_id : "N/A"
  const supplierName = request.supplier ? supplierNames[request.supplier] || request.supplier : "N/A"

  return (
    <Card onClick={onClick} className="overflow-hidden border border-slate-200 bg-white cursor-pointer">
      <div className="relative h-32 bg-slate-100 overflow-hidden flex items-center justify-center">
        <img
          src={getImageUrl(request.imageUrl) || "/placeholder.svg"}
          alt={request.productName}
          className="w-full h-full object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <div className="absolute top-2 right-2">
          <Badge
            className={`font-semibold text-xs px-2 py-1 ${isApproved ? "bg-green-500" : isRejected ? "bg-red-500" : "bg-amber-500"}`}
          >
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-2 border-b border-slate-100">
        <CardTitle className="text-sm line-clamp-1 text-slate-900 font-bold">{itemName}</CardTitle>
        <CardDescription className="text-xs text-slate-500 line-clamp-1">{request.productName}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2 pt-3 pb-3">
        <div className="bg-white p-2.5 rounded border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 rounded-full flex-shrink-0">
              <User className="h-3 w-3 text-slate-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 line-clamp-1">{requesterName}</p>
              <p className="text-xs text-slate-500 line-clamp-1">{requesterEmail}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600 font-medium">Qty:</span>
            <span className="font-bold text-slate-900">{request.quantity}</span>
          </div>
          <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-1">
            <span className="text-slate-600 font-bold">Total:</span>
            <span className="font-bold text-slate-900">৳ {(request.quantity * request.unitPrice).toFixed(2)}</span>
          </div>
        </div>

        <div className="text-xs">
          <p className="text-slate-500 font-semibold mb-0.5">Supplier</p>
          <p className="text-slate-900 font-medium line-clamp-1">{supplierName}</p>
        </div>
      </CardContent>
    </Card>
  )
}
