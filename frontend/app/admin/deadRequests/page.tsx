"use client"

import { API_ROUTES } from "@/lib/api"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle, Clock, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"

// ---------- Types ----------

interface DeadStockRequestRaw {
  _id: string
  user_id?: string
  item_id?: string
  quantity?: number
  reason?: string
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
}

type DeadStockRequest = DeadStockRequestRaw & {
  _id: string
  productName: string
  quantity: number
  reason: string
  description: string
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

async function fetchUserData(userId: string): Promise<{ name: string; email: string }> {
  try {
    const cleanId = extractId(userId)
    if (!cleanId) return { name: userId, email: "No email" }

    const response = await fetch(API_ROUTES.users.getById(cleanId))
    if (!response.ok) return { name: cleanId, email: "No email" }

    const data = await response.json()
    const name = data.name || data.fullName || cleanId
    const email = data.email || "No email"
    return { name, email }
  } catch (err) {
    return { name: userId, email: "No email" }
  }
}

function normalizeRequest(raw: DeadStockRequestRaw): DeadStockRequest {
  const img = raw.image_url || ""
  const q = typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity || 0)

  const productName = (raw as any).productName || (raw as any).itemName || `Item ${raw.item_id || "(unknown)"}`
  const requestedByName = raw.requestedById?.name || raw.requestedByName || "Unknown User"
  const requestedByEmail = raw.requestedById?.email || undefined
  const requestedByUserId = extractId((raw as any).requestedByUserId || raw.requestedById?._id || (raw as any).user_id)

  return {
    ...(raw as any),
    _id: safeString(raw._id),
    productName,
    quantity: q,
    reason: safeString(raw.reason),
    description: safeString(raw.description),
    imageUrl: img,
    status:
      (raw.status as any) === "approved" ? "approved" : (raw.status as any) === "rejected" ? "rejected" : "pending",
    requestedByName,
    requestedByEmail,
    requestedByUserId,
    requestedAt: raw.requested_at || raw.createdAt || new Date().toISOString(),
  }
}

function getImageUrl(imageUrl: string) {
  if (!imageUrl) return "/placeholder.svg"
  if (imageUrl.startsWith("http")) return imageUrl
  const filename = imageUrl.split("/").pop() || imageUrl
  return API_ROUTES.files.upload(filename)
}

async function createDeadStockEntry(request: DeadStockRequest) {
  let userId = extractId(request.requestedByUserId || request.requestedById?._id || (request as any).user_id)
  if (!userId) userId = "system"

  const itemId = request.item_id || `ITEM-${request._id}`
  const qty = typeof request.quantity === "number" ? request.quantity : Number((request as any).quantity || 0)

  if (!qty || qty <= 0) throw new Error("Quantity must be greater than 0")

  let departmentId: string | null = null
  let officeId: string | null = null

  if (request.requestedById) {
    const rb = request.requestedById as any
    if (rb.department_id || rb.department) departmentId = rb.department_id || rb.department
    if (rb.office_id || rb.office) officeId = rb.office_id || rb.office
  }

  if (userId && userId !== "system" && (!departmentId || !officeId)) {
    try {
      const userRes = await fetch(API_ROUTES.users.getById(userId))
      if (userRes.ok) {
        const userData = await userRes.json()
        const user = userData.data || userData.user || userData
        departmentId = user.department_id || user.department || null
        officeId = user.office_id || user.office || null
      }
    } catch (e) {
      console.error("[v0] Error fetching user info:", e)
    }
  }

  if (!departmentId && !officeId) {
    throw new Error(`Cannot create deadstock: requester has no department_id or office_id.\nUserId: ${userId}`)
  }

  const payload: any = {
    user_id: userId,
    item_id: itemId,
    quantity: qty,
    reason: request.reason,
    department_id: departmentId || "ok",
    office_id: officeId || "ok",
    remarks:
      `Dead stock entry\n` +
      `Requested by: ${request.requestedByName || request.requestedById?.name || "N/A"}\n` +
      `Product: ${request.productName}\n` +
      `Reason: ${request.reason}\n` +
      `Description: ${request.description}`,
  }

  console.log("[v0] createDeadStockEntry payload:", payload)

  const res = await fetch(API_ROUTES.deadstocks.create, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    let errMsg = `Failed to create deadstock: ${res.status}`
    try {
      const errData = await res.json()
      errMsg = errData.message || JSON.stringify(errData)
    } catch (e) {}
    throw new Error(errMsg)
  }

  const data = await res.json()
  return data
}

// ---------- Request Card Component ----------

interface RequestCardProps {
  request: DeadStockRequest
  userData: { [key: string]: { name: string; email: string } }
  itemNames: { [key: string]: string }
  onClick: () => void
}

function RequestCard({ request, userData, itemNames, onClick }: RequestCardProps) {
  const statusColor =
    request.status === "pending" ? "bg-amber-50" : request.status === "approved" ? "bg-green-50" : "bg-red-50"

  const statusBadgeVariant =
    request.status === "pending" ? "default" : request.status === "approved" ? "outline" : "destructive"

  const user = userData[request.requestedByUserId || ""] || { name: request.requestedByName, email: "" }
  const itemName = itemNames[request.item_id || ""] || request.productName

  return (
    <Card className={`cursor-pointer transition-shadow hover:shadow-lg ${statusColor}`} onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{itemName}</CardTitle>
            <CardDescription className="text-xs mt-1">ID: {request._id}</CardDescription>
          </div>
          <Badge variant={statusBadgeVariant}>{request.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {request.imageUrl && (
          <img
            src={getImageUrl(request.imageUrl) || "/placeholder.svg"}
            alt={itemName}
            className="w-full h-32 object-cover rounded-md bg-slate-200"
          />
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-slate-600">Quantity</p>
            <p className="font-semibold">{request.quantity}</p>
          </div>
          <div>
            <p className="text-slate-600">Reason</p>
            <p className="font-semibold text-xs truncate">{request.reason}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <User className="h-3 w-3" />
          {user.name}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------- Detail Modal ----------

interface DetailModalProps {
  request: DeadStockRequest | null
  userData: { [key: string]: { name: string; email: string } }
  itemNames: { [key: string]: string }
  onClose: () => void
  onApprove: (request: DeadStockRequest) => void
  onReject: (request: DeadStockRequest) => void
  isLoading: boolean
}

function DetailModal({ request, userData, itemNames, onClose, onApprove, onReject, isLoading }: DetailModalProps) {
  if (!request) return null

  const user = userData[request.requestedByUserId || ""] || { name: request.requestedByName, email: "" }
  const itemName = itemNames[request.item_id || ""] || request.productName

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>{itemName}</CardTitle>
            <CardDescription>Dead Stock Request Details</CardDescription>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          {request.imageUrl && (
            <img
              src={getImageUrl(request.imageUrl) || "/placeholder.svg"}
              alt={itemName}
              className="w-full h-64 object-cover rounded-lg bg-slate-100"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Request ID</p>
              <p className="font-mono text-sm">{request._id}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Status</p>
              <Badge
                variant={
                  request.status === "pending" ? "default" : request.status === "approved" ? "outline" : "destructive"
                }
              >
                {request.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Quantity</p>
              <p className="font-semibold">{request.quantity}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Reason</p>
              <p className="font-semibold">{request.reason}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-600 mb-2">Description</p>
            <p className="text-sm bg-slate-50 p-3 rounded-md">{request.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Requested By</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Requested At</p>
              <p className="text-sm">{new Date(request.requestedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {request.status === "pending" && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => onApprove(request)}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isLoading}
              >
                {isLoading ? "Approving..." : "Approve"}
              </Button>
              <Button onClick={() => onReject(request)} variant="destructive" className="flex-1" disabled={isLoading}>
                {isLoading ? "Rejecting..." : "Reject"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------- Main Component ----------

export default function DeadStockRequestsPage() {
  const [requests, setRequests] = useState<DeadStockRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<DeadStockRequest | null>(null)
  const [itemNames, setItemNames] = useState<{ [key: string]: string }>({})
  const [userData, setUserData] = useState<{ [key: string]: { name: string; email: string } }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const pollRef = useRef<number | null>(null)
  const fetchedIdsRef = useRef<{ items: Set<string>; users: Set<string> }>({
    items: new Set(),
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
  }, [])

  useEffect(() => {
    if (requests.length === 0) return

    const fetchAllNames = async () => {
      const newItemNames = { ...itemNames }
      const newUserData = { ...userData }

      for (const request of requests) {
        if (request.item_id && !fetchedIdsRef.current.items.has(request.item_id)) {
          fetchedIdsRef.current.items.add(request.item_id)
          const name = await fetchItemName(request.item_id)
          newItemNames[request.item_id] = name
        }

        if (request.requestedByUserId && !fetchedIdsRef.current.users.has(request.requestedByUserId)) {
          fetchedIdsRef.current.users.add(request.requestedByUserId)
          const userDataResult = await fetchUserData(request.requestedByUserId)
          newUserData[request.requestedByUserId] = userDataResult
        }
      }

      setItemNames(newItemNames)
      setUserData(newUserData)
    }

    fetchAllNames()
  }, [requests])

  async function fetchRequests(showLoading = true) {
    try {
      if (showLoading) setLoading(true)
      const res = await fetch(API_ROUTES.deadstockrequests.list)
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
      const data = await res.json()

      const normalized = Array.isArray(data) ? data.map(normalizeRequest) : []
      setRequests(normalized)
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

  const onApprove = async (request: DeadStockRequest) => {
    try {
      setIsLoading(true)
      const approveResponse = await fetch(API_ROUTES.deadstockrequests.approve(request._id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })

      if (!approveResponse.ok) throw new Error("Failed to approve request")

      const deadstockResponse = await fetch(API_ROUTES.deadstocks.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: extractId(request.user_id ?? request.requestedByUserId ?? request.requestedById?._id ?? "system"),
          item_id: extractId(request.item_id ?? (request as any).item_id ?? ""),
          quantity: request.quantity,
          reason: request.reason,
          reported_at: request.requestedAt,
        }),
      })

      if (!deadstockResponse.ok) throw new Error("Failed to create deadstock")

      await fetchRequests(false)
      setSelectedRequest(null)
    } catch (error) {
      console.error("Approve error:", error)
      alert("Failed to approve request")
    } finally {
      setIsLoading(false)
    }
  }

  const onReject = async (request: DeadStockRequest) => {
    try {
      setIsLoading(true)
      const response = await fetch(API_ROUTES.deadstockrequests.reject(request._id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) throw new Error("Failed to reject request")

      fetchRequests()
      setSelectedRequest(null)
    } catch (error) {
      console.error("Reject error:", error)
      alert("Failed to reject request")
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-slate-300 border-t-blue-600 rounded-full mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading dead stock requests...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dead Stock Requests</h1>
          <p className="text-slate-600">Manage and review dead stock disposal requests</p>
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
              <p className="text-sm text-slate-600">Successfully approved and processed</p>
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
                  onClick={() => setSelectedRequest(request)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <DetailModal
        request={selectedRequest}
        userData={userData}
        itemNames={itemNames}
        onClose={() => setSelectedRequest(null)}
        onApprove={onApprove}
        onReject={onReject}
        isLoading={isLoading}
      />
    </main>
  )
}
