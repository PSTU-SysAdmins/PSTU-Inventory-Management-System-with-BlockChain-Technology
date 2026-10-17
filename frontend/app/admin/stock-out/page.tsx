"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Search,
  Plus,
  Loader2,
  ArrowDown,
  TrendingDown,
  Users,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react"
import Link from "next/link"

// Types for API data
interface StockOutRecord {
  _id: string
  user_id: string
  department_id?: string
  office_id?: string
  item_id: string
  issue_type: string
  issue_by: string
  issue_date: string
  quantity: number
  remarks?: string
  createdAt: string
}

interface User {
  _id: string
  name: string
  email: string
  role?: string
  roll?: string
  department?: string
  office?: string
}

interface Item {
  _id: string
  name: string
  unit: string
  category: string
  description?: string
}

interface Department {
  _id: string
  name: string
  description?: string
}

interface Office {
  _id: string
  name: string
  description?: string
}

interface EnrichedStockOutRecord extends StockOutRecord {
  userName: string
  itemName: string
  departmentName: string
  officeName: string
  userRole: string
}

function DeleteConfirmModal({
  isOpen,
  record,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  isOpen: boolean
  record: EnrichedStockOutRecord | null
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  if (!isOpen || !record) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle className="text-red-600">Delete Stock Out Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete this stock out record?</p>
          <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
            <p>
              <strong>Item:</strong> {record.itemName}
            </p>
            <p>
              <strong>Recipient:</strong> {record.userName}
            </p>
            <p>
              <strong>Quantity:</strong> {record.quantity}
            </p>
            <p>
              <strong>Date:</strong> {new Date(record.issue_date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm} disabled={isDeleting} className="flex items-center gap-2">
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UpdateModal({
  isOpen,
  record,
  onConfirm,
  onCancel,
  isUpdating,
  usersMap,
}: {
  isOpen: boolean
  record: EnrichedStockOutRecord | null
  onConfirm: (data: Partial<StockOutRecord>) => Promise<void>
  onCancel: () => void
  isUpdating: boolean
  usersMap?: Record<string, string>
}) {
  const [formData, setFormData] = useState<Partial<StockOutRecord>>({
    quantity: 0,
    issue_type: "",
    issue_by: "",
    remarks: "",
    issue_date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    if (record) {
      setFormData({
        quantity: record.quantity || 0,
        issue_type: record.issue_type || "",
        issue_by: record.issue_by || "",
        remarks: record.remarks || "",
        issue_date: record.issue_date || new Date().toISOString().split("T")[0],
      })
    }
  }, [record])

  if (!isOpen || !record) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-96">
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>Update Stock Out Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item</label>
            <Input value={record.itemName || ""} disabled className="bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <Input
              type="number"
              value={formData.quantity || ""}
              onChange={(e) => setFormData({ ...formData, quantity: Number.parseInt(e.target.value) })}
              style={{ borderColor: "#e7e7e7" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
            <Select
              value={formData.issue_type || ""}
              onValueChange={(value) => setFormData({ ...formData, issue_type: value })}
            >
              <SelectTrigger style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="automatic">Automatic</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issued By</label>
            <select
              value={formData.issue_by || ""}
              onChange={(e) => setFormData({ ...formData, issue_by: e.target.value })}
              style={{ borderColor: "#e7e7e7" }}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Select User</option>
              {usersMap && Object.keys(usersMap).length > 0 ? (
                Object.entries(usersMap).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))
              ) : (
                <option value={record.issue_by}>{record.issue_by}</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <Input
              value={formData.remarks || ""}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              style={{ borderColor: "#e7e7e7" }}
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={() => onConfirm(formData)}
              disabled={isUpdating}
              style={{ backgroundColor: "#51247a" }}
              className="flex-1 text-white"
            >
              {isUpdating ? "Updating..." : "Update"}
            </Button>
            <Button onClick={onCancel} variant="outline" className="flex-1 bg-transparent" disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function StockOutPage() {
  const [stockOutRecords, setStockOutRecords] = useState<EnrichedStockOutRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIssueType, setSelectedIssueType] = useState("All Types")
  const [selectedRole, setSelectedRole] = useState("All Roles")
  const [filteredRecords, setFilteredRecords] = useState<EnrichedStockOutRecord[]>([])
  const [issueTypes, setIssueTypes] = useState<string[]>(["All Types"])
  const [userRoles, setUserRoles] = useState<string[]>(["All Roles"])
  const [error, setError] = useState<string>("")
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})

  // Pagination and modal states
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; record: EnrichedStockOutRecord | null }>({
    isOpen: false,
    record: null,
  })
  const [updateModal, setUpdateModal] = useState<{ isOpen: boolean; record: EnrichedStockOutRecord | null }>({
    isOpen: false,
    record: null,
  })
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const itemsPerPage = 10

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")

        const stockOutResponse = await fetch(API_ROUTES.stockouts.list)
        if (!stockOutResponse.ok) {
          throw new Error("Failed to fetch stock out records")
        }
        const stockOutData: StockOutRecord[] = await stockOutResponse.json()

        const usersResponse = await fetch(API_ROUTES.users.list)
        if (!usersResponse.ok) {
          throw new Error("Failed to fetch users")
        }
        const usersData: User[] = await usersResponse.json()

        const itemsResponse = await fetch(API_ROUTES.items.list)
        if (!itemsResponse.ok) {
          throw new Error("Failed to fetch items")
        }
        const itemsData: Item[] = await itemsResponse.json()

        const departmentsResponse = await fetch(API_ROUTES.departments.list)
        if (!departmentsResponse.ok) {
          throw new Error("Failed to fetch departments")
        }
        const departmentsData: Department[] = await departmentsResponse.json()

        const officesResponse = await fetch(API_ROUTES.offices.list)
        if (!officesResponse.ok) {
          throw new Error("Failed to fetch offices")
        }
        const officesData: Office[] = await officesResponse.json()

        const userMap = new Map(usersData.map((u) => [u._id, u]))
        const itemMap = new Map(itemsData.map((i) => [i._id, i]))
        const departmentMap = new Map(departmentsData.map((d) => [d._id, d]))
        const officeMap = new Map(officesData.map((o) => [o._id, o]))

        const enrichedRecords: EnrichedStockOutRecord[] = stockOutData.map((record) => {
          const user = userMap.get(record.user_id)
          const item = itemMap.get(record.item_id)
          const department = record.department_id ? departmentMap.get(record.department_id) : null
          const office = record.office_id ? officeMap.get(record.office_id) : null

          return {
            ...record,
            userName: user?.name || "Unknown User",
            itemName: item?.name || "Unknown Item",
            departmentName: department?.name || "N/A",
            officeName: office?.name || "N/A",
            userRole: user?.role || user?.roll || "Unknown",
          }
        })

        enrichedRecords.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())

        const uniqueIssueTypes = ["All Types", ...Array.from(new Set(enrichedRecords.map((r) => r.issue_type)))]
        const uniqueRoles = ["All Roles", ...Array.from(new Set(enrichedRecords.map((r) => r.userRole)))]

        setStockOutRecords(enrichedRecords)
        setFilteredRecords(enrichedRecords)
        setIssueTypes(uniqueIssueTypes)
        setUserRoles(uniqueRoles)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(error instanceof Error ? error.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(API_ROUTES.users.list)
        if (response.ok) {
          const data = await response.json()
          const userMap: Record<string, string> = {}
          data.forEach((user: any) => {
            userMap[user._id] = user.name
          })
          setUsersMap(userMap)
        }
      } catch (error) {
        console.error("[v0] Error fetching users:", error)
      }
    }
    fetchUsers()
  }, [])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
    filterRecords(value, selectedIssueType, selectedRole)
  }

  const handleIssueTypeFilter = (issueType: string) => {
    setSelectedIssueType(issueType)
    setCurrentPage(1)
    filterRecords(searchTerm, issueType, selectedRole)
  }

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role)
    setCurrentPage(1)
    filterRecords(searchTerm, selectedIssueType, role)
  }

  const filterRecords = (search: string, issueType: string, role: string) => {
    let filtered = [...stockOutRecords]

    filtered.sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime())

    if (search) {
      filtered = filtered.filter(
        (record) =>
          record.userName.toLowerCase().includes(search.toLowerCase()) ||
          record.itemName.toLowerCase().includes(search.toLowerCase()) ||
          record.issue_by.toLowerCase().includes(search.toLowerCase()) ||
          record.departmentName.toLowerCase().includes(search.toLowerCase()) ||
          record.officeName.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (issueType !== "All Types") {
      filtered = filtered.filter((record) => record.issue_type === issueType)
    }

    if (role !== "All Roles") {
      filtered = filtered.filter((record) => record.userRole === role)
    }

    setFilteredRecords(filtered)
  }

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDelete = async () => {
    const record = deleteModal.record
    if (!record) return

    setIsDeleting(true)
    try {
      const response = await fetch(API_ROUTES.stockouts.delete(record._id), {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete record")

      await fetch(API_ROUTES.currentstockouts.updateQuantity, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: record.user_id,
          item_id: record.item_id,
          quantity: -record.quantity, // Subtract the quantity since we're deleting
        }),
      })

      await fetch(API_ROUTES.currentstockins.updateQuantity, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: record.issue_by,
          item_id: record.item_id,
          quantity: record.quantity, // Add back the quantity
        }),
      })

      setStockOutRecords(stockOutRecords.filter((r) => r._id !== record._id))
      setFilteredRecords(filteredRecords.filter((r) => r._id !== record._id))
      setDeleteModal({ isOpen: false, record: null })
      alert("Record deleted successfully and current stock updated")
    } catch (error) {
      console.error("Error deleting:", error)
      alert("Failed to delete record")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdate = async (data: Partial<StockOutRecord>) => {
    if (!updateModal.record) return

    setIsUpdating(true)
    try {
      const oldQuantity = updateModal.record.quantity
      const newQuantity = data.quantity || oldQuantity
      const quantityDifference = newQuantity - oldQuantity

      const response = await fetch(API_ROUTES.stockouts.update(updateModal.record._id), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update record")

      if (quantityDifference !== 0) {
        await fetch(API_ROUTES.currentstockouts.updateQuantity, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: updateModal.record.user_id,
            item_id: updateModal.record.item_id,
            quantity: -quantityDifference, // Negative because we're reducing from recipient's stockout
          }),
        })

        await fetch(API_ROUTES.currentstockins.updateQuantity, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: updateModal.record.issue_by,
            item_id: updateModal.record.item_id,
            quantity: quantityDifference, // Positive to adjust issued_by's stock
          }),
        })
      }

      const updatedRecord = await response.json()

      const updatedEnriched: EnrichedStockOutRecord = {
        ...updatedRecord,
        userName: updateModal.record.userName,
        itemName: updateModal.record.itemName,
        departmentName: updateModal.record.departmentName,
        officeName: updateModal.record.officeName,
        userRole: updateModal.record.userRole,
      }

      setStockOutRecords(stockOutRecords.map((r) => (r._id === updatedRecord._id ? updatedEnriched : r)))
      setFilteredRecords(filteredRecords.map((r) => (r._id === updatedRecord._id ? updatedEnriched : r)))
      setUpdateModal({ isOpen: false, record: null })
      alert("Record updated successfully and current stock synchronized")
    } catch (error) {
      console.error("Error updating:", error)
      alert("Failed to update record")
    } finally {
      setIsUpdating(false)
    }
  }

  const getIssueTypeBadgeColor = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case "manual":
        return "bg-blue-100 text-blue-800"
      case "automatic":
        return "bg-green-100 text-green-800"
      case "emergency":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "teacher":
        return "bg-purple-100 text-purple-800"
      case "staff":
        return "bg-orange-100 text-orange-800"
      case "admin":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
              Stock Out Management
            </h2>
            <p className="text-gray-600">Track and manage all inventory issues and stock distributions</p>
          </div>
          <Link href="/admin/stock-out/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              New Stock Issue
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#51247a" }} />
            <p className="text-gray-600">Loading stock out records...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
              Stock Out Management
            </h2>
            <p className="text-gray-600">Track and manage all inventory issues and stock distributions</p>
          </div>
          <Link href="/admin/stock-out/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              New Stock Issue
            </Button>
          </Link>
        </div>

        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p className="font-medium">Error loading data</p>
              <p className="text-sm mt-1">{error}</p>
              <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
            Stock Out Management
          </h2>
          <p className="text-gray-600">Track and manage all inventory issues and stock distributions</p>
        </div>
        <Link href="/admin/stock-out/create">
          <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
            <Plus className="w-4 h-4 mr-2" />
            New Stock Issue
          </Button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Issues</p>
                <p className="text-2xl font-bold" style={{ color: "#51247a" }}>
                  {stockOutRecords.length}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#fef2f2" }}
              >
                <ArrowDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Quantity Issued</p>
                <p className="text-2xl font-bold text-red-600">
                  {stockOutRecords.reduce((sum, record) => sum + record.quantity, 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Recipients</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Set(stockOutRecords.map((r) => r.user_id)).size}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Manual Issues</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stockOutRecords.filter((r) => r.issue_type === "manual").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <FileText className="w-3 h-3 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>Stock Out Records</CardTitle>
          <CardDescription>
            View and manage all stock issue records (showing {paginatedRecords.length} of {filteredRecords.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by user, item, issuer, or location..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 focus:border-purple-500"
                style={{ borderColor: "#e7e7e7" }}
              />
            </div>
            <Select value={selectedIssueType} onValueChange={handleIssueTypeFilter}>
              <SelectTrigger className="w-48 focus:border-purple-500" style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={handleRoleFilter}>
              <SelectTrigger className="w-48 focus:border-purple-500" style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {userRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border" style={{ borderColor: "#e7e7e7" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#f8fafc" }}>
                  <TableHead style={{ color: "#51247a" }}>No</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Recipient</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Item</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Quantity</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Issue Type</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Issue By</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Role</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Department/Office</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Date & Time</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.map((record, index) => (
                  <TableRow key={record._id} className="hover:bg-gray-50">
                    <TableCell>
                      <span className="font-medium text-gray-900">{startIndex + index + 1}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{record.userName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{record.itemName}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {record.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getIssueTypeBadgeColor(record.issue_type)}`}>
                        {record.issue_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{usersMap[record.issue_by] || record.issue_by}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getRoleBadgeColor(record.userRole)}`}>{record.userRole}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        {record.userRole === "teacher" && (
                          <p className="text-sm text-gray-900">{record.departmentName}</p>
                        )}
                        {record.userRole === "staff" && <p className="text-sm text-gray-900">{record.officeName}</p>}
                        {record.userRole !== "teacher" && record.userRole !== "staff" && (
                          <p className="text-sm text-gray-500">N/A</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600">{formatDate(record.issue_date)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                          onClick={() => setUpdateModal({ isOpen: true, record })}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => setDeleteModal({ isOpen: true, record })}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No stock out records found matching your search criteria.</p>
            </div>
          )}

          {filteredRecords.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} (Total: {filteredRecords.length} records)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        record={deleteModal.record}
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, record: null })}
        isDeleting={isDeleting}
      />

      <UpdateModal
        isOpen={updateModal.isOpen}
        record={updateModal.record}
        onConfirm={handleUpdate}
        onCancel={() => setUpdateModal({ isOpen: false, record: null })}
        isUpdating={isUpdating}
        usersMap={usersMap}
      />
    </div>
  )
}
