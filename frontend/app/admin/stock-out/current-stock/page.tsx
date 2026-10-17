"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

interface StockRecord {
  _id: string
  user_id: string
  department_id?: string
  office_id?: string
  item_id: string
  quantity: number
  createdAt: string
}

interface User {
  _id: string
  name: string
  email: string
  role?: string
  roll?: string
  department?: string
  office?: string | { name: string }
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

interface EnrichedStockRecord extends StockRecord {
  receiverName: string
  departmentName: string
  productName: string
}

export default function CurrentStockInPage() {
  const [stockRecords, setStockRecords] = useState<EnrichedStockRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments")
  const [filteredRecords, setFilteredRecords] = useState<EnrichedStockRecord[]>([])
  const [departments, setDepartments] = useState<string[]>(["All Departments"])
  const [error, setError] = useState<string>("")
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const RECORDS_PER_PAGE = 10

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")

        // Fetch stock records
        const stockResponse = await fetch(API_ROUTES.currentstockouts.list)
        if (!stockResponse.ok) {
          throw new Error("Failed to fetch stock records")
        }
        const stockData: StockRecord[] = await stockResponse.json()

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

        // Create lookup maps
        const userMap = new Map(usersData.map((u) => [u._id, u]))
        const productMap = new Map(productsData.map((p) => [p._id, p]))

        // Fetch unique departments
        const uniqueDepartmentIds = Array.from(
          new Set(
            stockData.map((r) => r.department_id).filter((id): id is string => typeof id === "string" && id.trim() !== ""),
          ),
        )

        const departmentMap = new Map<string, Department>()

        if (uniqueDepartmentIds.length > 0) {
          try {
            const departmentResponses = await Promise.all(
              uniqueDepartmentIds.map((deptId) =>
                fetch(API_ROUTES.departments.getById(deptId))
                  .then((res) => ({ deptId, res }))
                  .catch((err) => ({ deptId, error: err })),
              ),
            )

            for (const response of departmentResponses) {
              if ("res" in response && response.res?.ok) {
                try {
                  const department = await response.res.json()
                  if (response.deptId) {
                    departmentMap.set(response.deptId, department)
                  }
                } catch (parseErr) {
                  console.error("Error parsing department response:", parseErr)
                }
              }
            }
          } catch (err) {
            console.error("Error fetching departments:", err)
          }
        }

        // Enrich records
        const enrichedRecords: EnrichedStockRecord[] = stockData.map((record) => {
          const user = userMap.get(record.user_id)
          const product = productMap.get(record.item_id)

          let displayLocation = "N/A"
          if (record.department_id && record.department_id.trim() !== "") {
            const department = departmentMap.get(record.department_id)
            if (department) {
              displayLocation = department.name
            }
          } else if (user?.office) {
            displayLocation = typeof user.office === "string" ? user.office : user.office.name || "Unknown Office"
          }

          return {
            ...record,
            receiverName: user?.name || "Unknown User",
            departmentName: displayLocation,
            productName: product?.name || "Unknown Product",
          }
        })

        enrichedRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Set up department filter options
        const uniqueDepartments = [
          "All Departments",
          ...Array.from(new Set(enrichedRecords.map((r) => r.departmentName))),
        ]

        setStockRecords(enrichedRecords)
        setFilteredRecords(enrichedRecords)
        setDepartments(uniqueDepartments)
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
    filterRecords(value, selectedDepartment)
  }

  const handleDepartmentFilter = (department: string) => {
    setSelectedDepartment(department)
    filterRecords(searchTerm, department)
  }

  const filterRecords = (search: string, department: string) => {
    let filtered = stockRecords

    if (search) {
      filtered = filtered.filter(
        (record) =>
          record.receiverName.toLowerCase().includes(search.toLowerCase()) ||
          record.departmentName.toLowerCase().includes(search.toLowerCase()) ||
          record.productName.toLowerCase().includes(search.toLowerCase()) ||
          record.quantity.toString().includes(search),
      )
    }

    if (department !== "All Departments") {
      filtered = filtered.filter((record) => record.departmentName === department)
    }

    setFilteredRecords(filtered)
    setCurrentPage(1)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) {
      return
    }

    try {
      setDeleteLoading(id)
      const response = await fetch(API_ROUTES.stockins.delete(id), {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete record")
      }

      const updatedRecords = stockRecords.filter((record) => record._id !== id)
      setStockRecords(updatedRecords)
      setFilteredRecords(updatedRecords)
      alert("Record deleted successfully")
    } catch (error) {
      console.error("Error deleting record:", error)
      alert("Failed to delete record")
    } finally {
      setDeleteLoading(null)
    }
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
              Current Stock In
            </h2>
            <p className="text-gray-600">View current inventory levels</p>
          </div>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#51247a" }} />
            <p className="text-gray-600">Loading records...</p>
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
              Current Stock In
            </h2>
            <p className="text-gray-600">View current inventory levels</p>
          </div>
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
            Current Stock In
          </h2>
          <p className="text-gray-600">View current inventory levels</p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>Stock Records</CardTitle>
          <CardDescription>Browse all current stock records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by buyer, product, department..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 focus:border-purple-500"
                style={{ borderColor: "#e7e7e7" }}
              />
            </div>
            <Select value={selectedDepartment} onValueChange={handleDepartmentFilter}>
              <SelectTrigger className="w-48 focus:border-purple-500" style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
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
                  <TableHead style={{ color: "#51247a" }}>Quantity</TableHead>
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
                      <Badge variant="outline" className="text-xs">
                        {record.quantity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * RECORDS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * RECORDS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length} records
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
