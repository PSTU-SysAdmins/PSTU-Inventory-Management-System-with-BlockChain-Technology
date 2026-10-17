"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Trash2, Edit2, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

// Types for API data
interface StockInRecord {
  _id: string
  user_id: string
  department_id?: string
  office_id?: string
  item_id: string
  supplier_id: string
  quantity: number
  unit_price: number
  total_price: number
  purchase_date: string
  invoice_no: string
  remarks?: string
  createdAt: string
}

interface Supplier {
  _id: string
  name: string
  contactPerson: string
  email?: string
  phone?: string
}

interface User {
  _id: string
  name: string
  email: string
  role?: string
  roll?: string
  department?: string
  office?: string | { name?: string }
}

interface Department {
  _id: string
  name: string
  description?: string
}

interface Product {
  _id: string
  name: string
}

interface EnrichedStockInRecord extends StockInRecord {
  supplierName: string
  receiverName: string
  departmentName: string
  productName: string
}

export default function StockInPage() {
  const [stockInRecords, setStockInRecords] = useState<EnrichedStockInRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSupplier, setSelectedSupplier] = useState("All Suppliers")
  const [filteredRecords, setFilteredRecords] = useState<EnrichedStockInRecord[]>([])
  const [suppliers, setSuppliers] = useState<string[]>(["All Suppliers"])
  const [error, setError] = useState<string>("")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [editingRecord, setEditingRecord] = useState<EnrichedStockInRecord | null>(null)
  const [editFormData, setEditFormData] = useState<{
    quantity: number
    unit_price: number
    total_price: number
    purchase_date: string
    remarks: string
  } | null>(null)
  const [updateLoading, setUpdateLoading] = useState(false)
  const RECORDS_PER_PAGE = 10

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")

        // Fetch stock in records
        const stockInResponse = await fetch(API_ROUTES.stockins.list)
        if (!stockInResponse.ok) {
          throw new Error("Failed to fetch stock in records")
        }
        const stockInData: StockInRecord[] = await stockInResponse.json()

        // Fetch suppliers
        const suppliersResponse = await fetch(API_ROUTES.suppliers.list)
        if (!suppliersResponse.ok) {
          throw new Error("Failed to fetch suppliers")
        }
        const suppliersData: Supplier[] = await suppliersResponse.json()

        // Fetch users
        const usersResponse = await fetch(API_ROUTES.users.list)
        if (!usersResponse.ok) {
          throw new Error("Failed to fetch users")
        }
        const usersData: User[] = await usersResponse.json()

        // Fetch products
        const productsResponse = await fetch(API_ROUTES.items.list)
        if (!productsResponse.ok) {
          throw new Error("Failed to fetch products")
        }
        const productsData: Product[] = await productsResponse.json()

        // Create lookup maps for efficient data enrichment
        const supplierMap = new Map(suppliersData.map((s) => [s._id, s]))
        const userMap = new Map(usersData.map((u) => [u._id, u]))
        const productMap = new Map(productsData.map((p) => [p._id, p]))

        console.log("[v0] Total stock in records:", stockInData.length)
        console.log(
          "[v0] Sample records:",
          stockInData.slice(0, 3).map((r) => ({ _id: r._id, department_id: r.department_id, user_id: r.user_id })),
        )

        // Fetch all unique departments at once instead of per-record
        const uniqueDepartmentIds = Array.from(
          new Set(
            stockInData.map((r) => r.department_id).filter((id): id is string => typeof id === "string" && id.trim() !== ""),
          ),
        )

        const departmentMap = new Map<string, Department>()

        if (uniqueDepartmentIds.length > 0) {
          try {
            console.log("[v0] Fetching", uniqueDepartmentIds.length, "unique departments")

            // Fetch all departments in parallel
            const departmentResponses = await Promise.all(
              uniqueDepartmentIds.map((deptId) =>
                fetch(API_ROUTES.departments.getById(deptId))
                  .then((res) => ({ deptId, res }))
                  .catch((err) => ({ deptId, error: err })),
              ),
            )

            // Process responses
            for (const deptResp of departmentResponses) {
              const deptId = deptResp.deptId
              if (!deptId) continue

              if ("error" in deptResp) {
                console.log("[v0] Error fetching department", deptId, ":", deptResp.error)
              } else if (deptResp.res?.ok) {
                try {
                  const department = await deptResp.res.json()
                  console.log("[v0] Department loaded:", deptId, "->", department.name)
                  departmentMap.set(deptId, department)
                } catch (parseErr) {
                  console.log("[v0] Error parsing department response for", deptId, ":", parseErr)
                }
              } else {
                console.log("[v0] Department not found (status:", deptResp.res?.status, "), ID:", deptId)
              }
            }
          } catch (err) {
            console.log("[v0] Error fetching departments batch:", err)
          }
        }

        // Enrich stock in records with related data
        const enrichedRecords: EnrichedStockInRecord[] = stockInData.map((record) => {
          const supplier = supplierMap.get(record.supplier_id)
          const user = userMap.get(record.user_id)
          const product = productMap.get(record.item_id)

          let displayLocation = "N/A"

          if (record.department_id && record.department_id.trim() !== "") {
            const department = departmentMap.get(record.department_id)
            if (department) {
              displayLocation = department.name
            }
          } else if (user?.office) {
            if (typeof user.office === "string") {
              displayLocation = user.office
            } else {
              displayLocation = user.office.name || "Unknown Office"
            }
          }

          return {
            ...record,
            supplierName: supplier?.name || "Unknown Supplier",
            receiverName: user?.name || "Unknown User",
            departmentName: displayLocation,
            productName: product?.name || "Unknown Product",
          }
        })

        enrichedRecords.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())

        // Set up supplier filter options
        const uniqueSuppliers = ["All Suppliers", ...Array.from(new Set(enrichedRecords.map((r) => r.supplierName)))]

        setStockInRecords(enrichedRecords)
        setFilteredRecords(enrichedRecords)
        setSuppliers(uniqueSuppliers)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(error instanceof Error ? error.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    filterRecords(value, selectedSupplier)
  }

  const handleSupplierFilter = (supplier: string) => {
    setSelectedSupplier(supplier)
    filterRecords(searchTerm, supplier)
  }

  const filterRecords = (search: string, supplier: string) => {
    let filtered = stockInRecords

    if (search) {
      filtered = filtered.filter(
        (record) =>
          record.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
          record.supplierName.toLowerCase().includes(search.toLowerCase()) ||
          record.receiverName.toLowerCase().includes(search.toLowerCase()) ||
          record.departmentName.toLowerCase().includes(search.toLowerCase()) ||
          record.productName.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (supplier !== "All Suppliers") {
      filtered = filtered.filter((record) => record.supplierName === supplier)
    }

    setFilteredRecords(filtered)
    setCurrentPage(1) // Reset pagination when filters change
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this stock entry?")) {
      return
    }

    try {
      setDeleteLoading(id)

      const recordToDelete = stockInRecords.find((record) => record._id === id)
      if (!recordToDelete) {
        throw new Error("Record not found")
      }

      const response = await fetch(API_ROUTES.stockins.delete(id), {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete stock entry")
      }

      try {
        await fetch(API_ROUTES.currentstockins.updateQuantity, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: recordToDelete.user_id,
            item_id: recordToDelete.item_id,
            quantity: recordToDelete.quantity, // Add back the quantity
          }),
        })
      } catch (err) {
        console.error("Error updating current stock in:", err)
      }

      // Update local state
      const updatedRecords = stockInRecords.filter((record) => record._id !== id)
      setStockInRecords(updatedRecords)
      setFilteredRecords(
        updatedRecords.filter((record) => {
          return (
            record.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.productName.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }),
      )

      alert("Stock entry deleted successfully")
    } catch (error) {
      console.error("Error deleting record:", error)
      alert("Failed to delete stock entry")
    } finally {
      setDeleteLoading(null)
    }
  }

  const handleEdit = (record: EnrichedStockInRecord) => {
    setEditingRecord(record)
    setEditFormData({
      quantity: record.quantity,
      unit_price: record.unit_price,
      total_price: record.total_price,
      purchase_date: new Date(record.purchase_date).toISOString().split("T")[0],
      remarks: record.remarks || "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRecord || !editFormData) return

    try {
      setUpdateLoading(true)
      const response = await fetch(API_ROUTES.stockins.update(editingRecord._id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      })

      if (!response.ok) {
        throw new Error("Failed to update stock entry")
      }

      const updatedData = await response.json()

      const quantityDifference = updatedData.quantity - editingRecord.quantity
      if (quantityDifference !== 0) {
        try {
          await fetch(API_ROUTES.currentstockins.updateQuantity, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              user_id: editingRecord.user_id,
              item_id: editingRecord.item_id,
              quantity: quantityDifference,
            }),
          })
        } catch (err) {
          console.error("Error updating current stock in:", err)
        }
      }

      const updatedRecords = stockInRecords.map((record) =>
        record._id === editingRecord._id
          ? {
              ...record,
              quantity: updatedData.quantity,
              unit_price: updatedData.unit_price,
              total_price: updatedData.total_price,
              purchase_date: updatedData.purchase_date,
              remarks: updatedData.remarks,
            }
          : record,
      )

      setStockInRecords(updatedRecords)
      setFilteredRecords(
        updatedRecords.filter((record) => {
          return (
            record.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.receiverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.productName.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }),
      )

      setEditingRecord(null)
      setEditFormData(null)
      alert("Stock entry updated successfully")
    } catch (error) {
      console.error("Error updating record:", error)
      alert("Failed to update stock entry")
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleCloseModal = () => {
    setEditingRecord(null)
    setEditFormData(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE)
  const currentRecords = filteredRecords.slice((currentPage - 1) * RECORDS_PER_PAGE, currentPage * RECORDS_PER_PAGE)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
              Stock In Management
            </h2>
            <p className="text-gray-600">Track and manage all inventory receipts and stock entries</p>
          </div>
          <Link href="/admin/stock-in/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              New Stock Entry
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#51247a" }} />
            <p className="text-gray-600">Loading stock in records...</p>
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
              Stock In Management
            </h2>
            <p className="text-gray-600">Track and manage all inventory receipts and stock entries</p>
          </div>
          <Link href="/admin/stock-in/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              New Stock Entry
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
            Stock In Management
          </h2>
          <p className="text-gray-600">Track and manage all inventory receipts and stock entries</p>
        </div>
        <Link href="/admin/stock-in/create">
          <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
            <Plus className="w-4 h-4 mr-2" />
            New Stock Entry
          </Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>Stock In Records</CardTitle>
          <CardDescription>View and manage all stock receipt records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by invoice, product, supplier, receiver, or department..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 focus:border-purple-500"
                style={{ borderColor: "#e7e7e7" }}
              />
            </div>
            <Select value={selectedSupplier} onValueChange={handleSupplierFilter}>
              <SelectTrigger className="w-48 focus:border-purple-500" style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto" style={{ borderColor: "#e7e7e7" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#f8fafc" }}>
                  <TableHead style={{ color: "#51247a" }}>No</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Buyer Name</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Department/Office</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Product Name</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Supplier</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Invoice</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Quantity</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Unit Price</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Total Price</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Date</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecords.map((record, index) => (
                  <TableRow key={record._id} className="hover:bg-gray-50">
                    <TableCell>
                      <span className="font-medium text-gray-900">
                        {(currentPage - 1) * RECORDS_PER_PAGE + index + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{record.receiverName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{record.departmentName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{record.productName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-700">{record.supplierName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{record.invoice_no}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {record.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{formatCurrency(record.unit_price)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{formatCurrency(record.total_price)}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600">{formatDate(record.purchase_date)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                          onClick={() => handleEdit(record)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => handleDelete(record._id)}
                          disabled={deleteLoading === record._id}
                        >
                          {deleteLoading === record._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
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
              <p className="text-gray-500">No stock in records found matching your search criteria.</p>
            </div>
          )}

          {/* Pagination */}
          {filteredRecords.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Showing {(currentPage - 1) * RECORDS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * RECORDS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length} records
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center space-x-1"
                  style={{ borderColor: "#e7e7e7" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-gray-600">Page</span>
                  <span className="font-semibold" style={{ color: "#51247a" }}>
                    {currentPage}
                  </span>
                  <span className="text-sm text-gray-600">
                    of {Math.ceil(filteredRecords.length / RECORDS_PER_PAGE)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(Math.ceil(filteredRecords.length / RECORDS_PER_PAGE), currentPage + 1))
                  }
                  disabled={currentPage >= Math.ceil(filteredRecords.length / RECORDS_PER_PAGE)}
                  className="flex items-center space-x-1"
                  style={{ borderColor: "#e7e7e7" }}
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editingRecord && editFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md" style={{ borderColor: "#e7e7e7" }}>
            <CardHeader className="flex flex-row items-center justify-between" style={{ backgroundColor: "#f8fafc" }}>
              <CardTitle style={{ color: "#51247a" }}>Edit Stock Entry</CardTitle>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <Input
                  type="number"
                  value={editFormData.quantity}
                  onChange={(e) => setEditFormData({ ...editFormData, quantity: Number.parseInt(e.target.value) || 0 })}
                  style={{ borderColor: "#e7e7e7" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                <Input
                  type="number"
                  value={editFormData.unit_price}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, unit_price: Number.parseFloat(e.target.value) || 0 })
                  }
                  style={{ borderColor: "#e7e7e7" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Price</label>
                <Input
                  type="number"
                  value={editFormData.total_price}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, total_price: Number.parseFloat(e.target.value) || 0 })
                  }
                  style={{ borderColor: "#e7e7e7" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <Input
                  type="date"
                  value={editFormData.purchase_date}
                  onChange={(e) => setEditFormData({ ...editFormData, purchase_date: e.target.value })}
                  style={{ borderColor: "#e7e7e7" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <Input
                  type="text"
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  placeholder="Add any remarks"
                  style={{ borderColor: "#e7e7e7" }}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateLoading}
                  className="flex-1 text-white"
                  style={{ backgroundColor: "#51247a" }}
                >
                  {updateLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  onClick={handleCloseModal}
                  variant="outline"
                  className="flex-1 bg-transparent"
                  style={{ borderColor: "#e7e7e7" }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
