"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Edit } from "lucide-react"
import Link from "next/link"

export default function DepartmentsPage() {
  const [selectedFaculty, setSelectedFaculty] = useState("All Faculties")
  const [departments, setDepartments] = useState([])
  const [filteredDepartments, setFilteredDepartments] = useState([])
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    code: "",
    shortName: "",
    faculty: "",
    establishedYear: "",
  })
  const [isLoadingUpdate, setIsLoadingUpdate] = useState(false)

  useEffect(() => {
    fetch(API_ROUTES.departments.list)
      .then((response) => response.json())
      .then((data) => {
        setDepartments(data)
        setFilteredDepartments(data)
      })
      .catch((error) => console.error("Error fetching departments:", error))
  }, [])

  const handleFacultyFilter = (faculty) => {
    setSelectedFaculty(faculty)
    filterDepartments(faculty)
  }

  const filterDepartments = (faculty) => {
    let filtered = departments

    if (faculty !== "All Faculties") {
      filtered = filtered.filter((dept) => dept.faculty === faculty)
    }

    setFilteredDepartments(filtered)
  }

  const handleEdit = (department) => {
    setSelectedDepartment(department)
    setEditFormData({
      name: department.name,
      code: department.code,
      shortName: department.shortName,
      faculty: department.faculty,
      establishedYear: department.establishedYear,
    })
    setIsEditModalOpen(true)
  }

  const handleFormChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleUpdateSubmit = async () => {
    if (!selectedDepartment) return

    setIsLoadingUpdate(true)
    try {
      const response = await fetch(API_ROUTES.departments.update(selectedDepartment._id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      })

      const data = await response.json()

      if (response.ok) {
        alert("Department updated successfully")

        // Update departments list
        setDepartments((prevDepartments) =>
          prevDepartments.map((dept) => (dept._id === selectedDepartment._id ? data : dept)),
        )

        // Re-filter the list
        filterDepartments(selectedFaculty)

        // Close modal
        setIsEditModalOpen(false)
        setSelectedDepartment(null)
      } else {
        alert(`Error: ${data.message}`)
      }
    } catch (error) {
      console.error("Error updating department:", error)
      alert("Error updating department")
    } finally {
      setIsLoadingUpdate(false)
    }
  }

  const handleDelete = (id) => {
    fetch(API_ROUTES.departments.delete(id), {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Department deleted successfully") {
          setDepartments((prevDepartments) => prevDepartments.filter((dept) => dept._id !== id))
          setFilteredDepartments((prevDepartments) => prevDepartments.filter((dept) => dept._id !== id))
        } else {
          console.error("Failed to delete department")
        }
      })
      .catch((error) => console.error("Error deleting department:", error))
  }

  const faculties = [
    "All Faculties",
    "Faculty of Engineering",
    "Faculty of Science",
    "Faculty of Business Administration",
    "Faculty of Social Sciences",
    "Faculty of Arts and Humanities",
    "Faculty of Agriculture",
    "Faculty of Computer Science & Engineering",
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
            Department Management
          </h2>
          <p className="text-gray-600">Manage university departments and their information</p>
        </div>
        <Link href="/admin/departments/create">
          <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Department
          </Button>
        </Link>
      </div>

      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>All Departments</CardTitle>
          <CardDescription>View and manage all university departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Select value={selectedFaculty} onValueChange={handleFacultyFilter}>
              <SelectTrigger className="w-48 focus:border-purple-500" style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {faculties.map((faculty) => (
                  <SelectItem key={faculty} value={faculty}>
                    {faculty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border" style={{ borderColor: "#e7e7e7" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#f8fafc" }}>
                  <TableHead style={{ color: "#51247a" }}>Department</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Code</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Faculty</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map((department) => (
                  <TableRow key={department._id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{department.name}</p>
                        <p className="text-sm text-gray-500">{department.shortName}</p>
                        <p className="text-xs text-gray-400">Est. {department.establishedYear}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-900">{department.code}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-900">{department.faculty}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                          onClick={() => handleEdit(department)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => handleDelete(department._id)}
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

          {filteredDepartments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No departments found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: "#51247a" }}>Edit Department</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Department Name
              </Label>
              <Input
                id="name"
                value={editFormData.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="mt-1"
                placeholder="Enter department name"
              />
            </div>

            <div>
              <Label htmlFor="code" className="text-sm font-medium">
                Department Code
              </Label>
              <Input
                id="code"
                value={editFormData.code}
                onChange={(e) => handleFormChange("code", e.target.value)}
                className="mt-1"
                placeholder="Enter department code"
              />
            </div>

            <div>
              <Label htmlFor="shortName" className="text-sm font-medium">
                Short Name
              </Label>
              <Input
                id="shortName"
                value={editFormData.shortName}
                onChange={(e) => handleFormChange("shortName", e.target.value)}
                className="mt-1"
                placeholder="Enter short name"
              />
            </div>

            <div>
              <Label htmlFor="faculty" className="text-sm font-medium">
                Faculty
              </Label>
              <Select value={editFormData.faculty} onValueChange={(value) => handleFormChange("faculty", value)}>
                <SelectTrigger className="mt-1" style={{ borderColor: "#e7e7e7" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {faculties.slice(1).map((faculty) => (
                    <SelectItem key={faculty} value={faculty}>
                      {faculty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="year" className="text-sm font-medium">
                Established Year
              </Label>
              <Input
                id="year"
                type="number"
                value={editFormData.establishedYear}
                onChange={(e) => handleFormChange("establishedYear", e.target.value)}
                className="mt-1"
                placeholder="Enter year"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: "#51247a" }}
              className="text-white"
              onClick={handleUpdateSubmit}
              disabled={isLoadingUpdate}
            >
              {isLoadingUpdate ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
