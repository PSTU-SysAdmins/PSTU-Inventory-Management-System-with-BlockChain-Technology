"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Search, Plus, Loader2, Users, Building, Phone, Trash2, Edit2 } from "lucide-react"
import Link from "next/link"

interface Staff {
  _id: string
  name: string
  email: string
  phone?: string
  employee_id?: string
  office?: string
  office_id?: string
  designation?: string
  qualification?: string
  experience?: string
  joining_date?: string
  status?: string
  role?: string
  roll?: string
  created_at?: string
}

interface Office {
  _id: string
  name: string
  description?: string
  section?: string
}

interface EnrichedStaff extends Staff {
  officeName: string
  officeSection: string
  phone?: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<EnrichedStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOffice, setSelectedOffice] = useState("All Offices")
  const [filteredStaff, setFilteredStaff] = useState<EnrichedStaff[]>([])
  const [offices, setOffices] = useState<string[]>(["All Offices"])
  const [error, setError] = useState<string>("")

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<EnrichedStaff | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    qualification: "",
  })
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")

        const staffResponse = await fetch(API_ROUTES.users.getStaff)
        if (!staffResponse.ok) {
          throw new Error("Failed to fetch staff")
        }
        const staffData: Staff[] = await staffResponse.json()

        const officesResponse = await fetch(API_ROUTES.offices.list)
        if (!officesResponse.ok) {
          throw new Error("Failed to fetch offices")
        }
        const officesData: Office[] = await officesResponse.json()

        const officeMap = new Map(officesData.map((o) => [o._id, o]))

        const enrichedStaff: EnrichedStaff[] = staffData.map((staffMember) => {
          const office = staffMember.office_id ? officeMap.get(staffMember.office_id) : null

          return {
            ...staffMember,
            officeName: office?.name || "N/A",
            officeSection: office?.section || "N/A",
          }
        })

        const uniqueOffices = ["All Offices", ...officesData.map((office) => office.name)]

        setStaff(enrichedStaff)
        setFilteredStaff(enrichedStaff)
        setOffices(uniqueOffices)
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
    filterStaff(value, selectedOffice)
  }

  const handleOfficeFilter = (office: string) => {
    setSelectedOffice(office)
    filterStaff(searchTerm, office)
  }

  const filterStaff = (search: string, office: string) => {
    let filtered = staff

    if (search) {
      filtered = filtered.filter(
        (staffMember) =>
          staffMember.name.toLowerCase().includes(search.toLowerCase()) ||
          staffMember.email.toLowerCase().includes(search.toLowerCase()) ||
          staffMember.officeName.toLowerCase().includes(search.toLowerCase()) ||
          staffMember.officeSection.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (office !== "All Offices") {
      filtered = filtered.filter((staffMember) => staffMember.officeName === office)
    }

    setFilteredStaff(filtered)
  }

  const handleEdit = (staffMember: EnrichedStaff) => {
    setEditingStaff(staffMember)
    setEditFormData({
      name: staffMember.name || "",
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      designation: staffMember.designation || "",
      qualification: staffMember.qualification || "",
    })
    setEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingStaff) return

    try {
      setEditLoading(true)
      const response = await fetch(API_ROUTES.users.update(editingStaff._id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      })

      if (!response.ok) {
        throw new Error("Failed to update staff member")
      }

      const updatedStaffData = await response.json()

      setStaff((prev) => prev.map((s) => (s._id === editingStaff._id ? { ...s, ...updatedStaffData } : s)))
      setFilteredStaff((prev) => prev.map((s) => (s._id === editingStaff._id ? { ...s, ...updatedStaffData } : s)))

      setEditModalOpen(false)
      setEditingStaff(null)
      alert("Staff member updated successfully!")
    } catch (error) {
      console.error("Error updating staff member:", error)
      alert(error instanceof Error ? error.message : "Failed to update staff member")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this staff member?")) return

    try {
      setDeleteLoading(id)
      const response = await fetch(API_ROUTES.users.delete(id), {
        method: "DELETE",
      })

      if (response.ok) {
        setStaff((prev) => prev.filter((staffMember) => staffMember._id !== id))
        setFilteredStaff((prev) => prev.filter((staffMember) => staffMember._id !== id))
        alert("Staff member deleted successfully!")
      } else {
        throw new Error("Failed to delete staff member")
      }
    } catch (error) {
      console.error("Error deleting staff member:", error)
      alert(error instanceof Error ? error.message : "Failed to delete staff member")
    } finally {
      setDeleteLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
              Staff Management
            </h2>
            <p className="text-gray-600">Manage and view all staff members</p>
          </div>
          <Link href="/admin/staff/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#51247a" }} />
            <p className="text-gray-600">Loading staff...</p>
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
              Staff Management
            </h2>
            <p className="text-gray-600">Manage and view all staff members</p>
          </div>
          <Link href="/admin/staff/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
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
            Staff Management
          </h2>
          <p className="text-gray-600">Manage and view all staff members</p>
        </div>
        <Link href="/admin/staff/create">
          <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold" style={{ color: "#51247a" }}>
                  {staff.length}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#f3e8ff" }}
              >
                <Users className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">With Phone Numbers</p>
                <p className="text-2xl font-bold text-green-600">
                  {staff.filter((s) => s.phone && s.phone.trim() !== "").length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Offices</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Set(staff.map((s) => s.officeName).filter((o) => o !== "N/A")).size}
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Building className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>All Staff</CardTitle>
          <CardDescription>View and manage all staff members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or office..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 focus:border-purple-500"
                style={{ borderColor: "#e7e7e7" }}
              />
            </div>
            <Select value={selectedOffice} onValueChange={handleOfficeFilter}>
              <SelectTrigger className="w-48 focus:border-purple-500" style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {offices.map((office) => (
                  <SelectItem key={office} value={office}>
                    {office}
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
                  <TableHead style={{ color: "#51247a" }}>Staff Member</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Office</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Phone Number</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((staffMember, index) => (
                  <TableRow key={staffMember._id} className="hover:bg-gray-50">
                    <TableCell>
                      <span className="font-medium text-gray-900">{index + 1}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{staffMember.name}</p>
                        <p className="text-sm text-gray-500">{staffMember.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{staffMember.officeName}</p>
                        {staffMember.officeSection !== "N/A" && (
                          <p className="text-sm text-gray-500">Section: {staffMember.officeSection}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {staffMember.phone && staffMember.phone.trim() !== "" ? (
                          <p className="text-sm text-gray-900 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {staffMember.phone}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">N/A</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                          onClick={() => handleEdit(staffMember)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => handleDelete(staffMember._id)}
                          disabled={deleteLoading === staffMember._id}
                        >
                          {deleteLoading === staffMember._id ? (
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

          {filteredStaff.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No staff members found matching your search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: "#51247a" }}>Edit Staff Member</DialogTitle>
            <DialogDescription>Update the staff member's information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter name"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Enter email"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="Enter phone number"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Designation</label>
              <Input
                value={editFormData.designation}
                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                placeholder="Enter designation"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Qualification</label>
              <Input
                value={editFormData.qualification}
                onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                placeholder="Enter qualification"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: "#51247a" }}
              className="text-white"
              onClick={handleSaveEdit}
              disabled={editLoading}
            >
              {editLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
