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
import { Search, Plus, Loader2, GraduationCap, Building, Phone, Trash2, Edit2 } from "lucide-react"
import Link from "next/link"

interface Teacher {
  _id: string
  name: string
  email: string
  phone_number?: string
  employee_id?: string
  department?: string
  department_id?: string
  designation?: string
  qualification?: string
  experience?: string
  joining_date?: string
  status?: string
  role?: string
  roll?: string
  created_at?: string
}

interface Department {
  _id: string
  name: string
  code?: string
  faculty?: string
}

interface EnrichedTeacher extends Teacher {
  departmentName: string
  facultyName: string
  phone_number?: string
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<EnrichedTeacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments")
  const [filteredTeachers, setFilteredTeachers] = useState<EnrichedTeacher[]>([])
  const [departments, setDepartments] = useState<string[]>(["All Departments"])
  const [error, setError] = useState<string>("")
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<EnrichedTeacher | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    qualification: "",
  })
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError("")

        const teachersResponse = await fetch(API_ROUTES.users.getTeachers)
        if (!teachersResponse.ok) {
          throw new Error("Failed to fetch teachers")
        }
        const teachersData: Teacher[] = await teachersResponse.json()

        const departmentsResponse = await fetch(API_ROUTES.departments.list)
        if (!departmentsResponse.ok) {
          throw new Error("Failed to fetch departments")
        }
        const departmentsData: Department[] = await departmentsResponse.json()

        const departmentMap = new Map(departmentsData.map((d) => [d._id, d]))

        const enrichedTeachers: EnrichedTeacher[] = teachersData.map((teacher) => {
          const department = teacher.department_id ? departmentMap.get(teacher.department_id) : null

          return {
            ...teacher,
            phone_number: teacher.phone_number || "",
            departmentName: department?.name || "N/A",
            facultyName: department?.faculty || "N/A",
          }
        })

        const uniqueDepartments = ["All Departments", ...departmentsData.map((dept) => dept.name)]

        setTeachers(enrichedTeachers)
        setFilteredTeachers(enrichedTeachers)
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
    filterTeachers(value, selectedDepartment)
  }

  const handleDepartmentFilter = (department: string) => {
    setSelectedDepartment(department)
    filterTeachers(searchTerm, department)
  }

  const filterTeachers = (search: string, department: string) => {
    let filtered = teachers

    if (search) {
      filtered = filtered.filter(
        (teacher) =>
          teacher.name.toLowerCase().includes(search.toLowerCase()) ||
          teacher.email.toLowerCase().includes(search.toLowerCase()) ||
          teacher._id?.toLowerCase().includes(search.toLowerCase()) ||
          teacher.departmentName.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (department !== "All Departments") {
      filtered = filtered.filter((teacher) => teacher.departmentName === department)
    }

    setFilteredTeachers(filtered)
  }

  const handleEdit = (teacher: EnrichedTeacher) => {
    setSelectedTeacher(teacher)
    setEditFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone_number || "",
      designation: teacher.designation || "",
      qualification: teacher.qualification || "",
    })
    setEditModalOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedTeacher) return

    try {
      setUpdateLoading(true)
      const response = await fetch(API_ROUTES.users.update(selectedTeacher._id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      })

      if (!response.ok) {
        throw new Error("Failed to update teacher")
      }

      const updatedData = await response.json()

      // Update teachers list with new data
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher._id === selectedTeacher._id
            ? {
                ...teacher,
                ...editFormData,
              }
            : teacher,
        ),
      )

      // Update filtered list
      setFilteredTeachers((prev) =>
        prev.map((teacher) =>
          teacher._id === selectedTeacher._id
            ? {
                ...teacher,
                ...editFormData,
              }
            : teacher,
        ),
      )

      alert("Teacher updated successfully!")
      setEditModalOpen(false)
    } catch (error) {
      console.error("Error updating teacher:", error)
      alert("Failed to update teacher")
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
      return
    }

    try {
      setDeleteLoading(id)
      const response = await fetch(API_ROUTES.users.delete(id), {
        method: "DELETE",
      })

      if (response.ok) {
        setTeachers((prev) => prev.filter((teacher) => teacher._id !== id))
        setFilteredTeachers((prev) => prev.filter((teacher) => teacher._id !== id))
        alert("Teacher deleted successfully!")
      } else {
        throw new Error("Failed to delete teacher")
      }
    } catch (error) {
      console.error("Error deleting teacher:", error)
      alert("Failed to delete teacher")
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
              Teachers Management
            </h2>
            <p className="text-gray-600">Manage and view all teaching faculty members</p>
          </div>
          <Link href="/admin/teachers/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Teacher
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#51247a" }} />
            <p className="text-gray-600">Loading teachers...</p>
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
              Teachers Management
            </h2>
            <p className="text-gray-600">Manage and view all teaching faculty members</p>
          </div>
          <Link href="/admin/teachers/create">
            <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Teacher
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
            Teachers Management
          </h2>
          <p className="text-gray-600">Manage and view all teaching faculty members</p>
        </div>
        <Link href="/admin/teachers/create">
          <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Teacher
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Teachers</p>
                <p className="text-2xl font-bold" style={{ color: "#51247a" }}>
                  {teachers.length}
                </p>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#f3e8ff" }}
              >
                <GraduationCap className="w-4 h-4 text-purple-600" />
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
                  {teachers.filter((t) => t.phone_number && t.phone_number.trim() !== "").length}
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
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Set(teachers.map((t) => t.departmentName).filter((d) => d !== "N/A")).size}
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
          <CardTitle style={{ color: "#51247a" }}>All Teachers</CardTitle>
          <CardDescription>View and manage all teaching faculty members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, user ID, or department..."
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
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
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
                  <TableHead style={{ color: "#51247a" }}>Teacher</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Department</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Phone Number</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.map((teacher, index) => (
                  <TableRow key={teacher._id} className="hover:bg-gray-50">
                    <TableCell>
                      <span className="font-medium text-gray-900">{index + 1}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{teacher.name}</p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{teacher.departmentName}</p>
                        {teacher.facultyName !== "N/A" && (
                          <p className="text-sm text-gray-500">Faculty: {teacher.facultyName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {teacher.phone_number && teacher.phone_number.trim() !== "" ? (
                          <p className="text-sm text-gray-900 flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {teacher.phone_number}
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
                          onClick={() => handleEdit(teacher)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => handleDelete(teacher._id, teacher.name)}
                          disabled={deleteLoading === teacher._id}
                        >
                          {deleteLoading === teacher._id ? (
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

          {filteredTeachers.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">No teachers found matching your search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher Information</DialogTitle>
            <DialogDescription>Update the teacher's details below</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Teacher name"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                placeholder="Email address"
                type="email"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="Phone number"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Designation</label>
              <Input
                value={editFormData.designation}
                onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                placeholder="Designation"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Qualification</label>
              <Input
                value={editFormData.qualification}
                onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                placeholder="Qualification"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateLoading}
              style={{ backgroundColor: "#51247a" }}
              className="text-white"
            >
              {updateLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
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
