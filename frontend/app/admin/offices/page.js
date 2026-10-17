"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Edit2 } from "lucide-react"
import Link from "next/link"

export default function OfficesPage() {
  const [selectedSection, setSelectedSection] = useState("All Sections")
  const [offices, setOffices] = useState([])
  const [filteredOffices, setFilteredOffices] = useState([])
  const [editingOffice, setEditingOffice] = useState(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({ name: "", description: "", section: "" })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetch(API_ROUTES.offices.list)
      .then((response) => response.json())
      .then((data) => {
        setOffices(data)
        setFilteredOffices(data)
      })
      .catch((error) => console.error("Error fetching offices:", error))
  }, [])

  const handleSectionFilter = (section) => {
    setSelectedSection(section)
    filterOffices(section)
  }

  const filterOffices = (section) => {
    let filtered = offices

    if (section !== "All Sections") {
      filtered = filtered.filter((office) => office.section === section)
    }

    setFilteredOffices(filtered)
  }

  const handleEdit = (office) => {
    setEditingOffice(office)
    setEditFormData({
      name: office.name,
      description: office.description,
      section: office.section,
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingOffice) return

    setIsUpdating(true)
    try {
      const response = await fetch(API_ROUTES.offices.update(editingOffice._id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      })

      const data = await response.json()

      if (response.ok) {
        // Update the office in both lists
        setOffices((prevOffices) =>
          prevOffices.map((office) => (office._id === editingOffice._id ? { ...office, ...editFormData } : office)),
        )
        setFilteredOffices((prevOffices) =>
          prevOffices.map((office) => (office._id === editingOffice._id ? { ...office, ...editFormData } : office)),
        )

        setIsEditDialogOpen(false)
        setEditingOffice(null)
        alert("Office updated successfully")
      } else {
        alert(data.message || "Failed to update office")
      }
    } catch (error) {
      console.error("Error updating office:", error)
      alert("Error updating office")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = (id) => {
    if (!confirm("Are you sure you want to delete this office?")) return

    fetch(API_ROUTES.offices.delete(id), {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Office deleted successfully") {
          setOffices((prevOffices) => prevOffices.filter((office) => office._id !== id))
          setFilteredOffices((prevOffices) => prevOffices.filter((office) => office._id !== id))
        } else {
          console.error("Failed to delete office")
        }
      })
      .catch((error) => console.error("Error deleting office:", error))
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const sections = [
    "All Sections",
    "Administration",
    "Academic Affairs",
    "Student Services",
    "Finance",
    "Human Resources",
    "IT Department",
    "Library",
    "Research",
    "International Relations",
    "Maintenance",
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
            Office Management
          </h2>
          <p className="text-gray-600">Manage university offices and their information</p>
        </div>
        <Link href="/admin/offices/create">
          <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Office
          </Button>
        </Link>
      </div>

      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>All Offices</CardTitle>
          <CardDescription>View and manage all university offices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Select value={selectedSection} onValueChange={handleSectionFilter}>
              <SelectTrigger className="w-48 focus:border-purple-500" style={{ borderColor: "#e7e7e7" }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border" style={{ borderColor: "#e7e7e7" }}>
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#f8fafc" }}>
                  <TableHead style={{ color: "#51247a" }}>Office Name</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Description</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Section</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Created</TableHead>
                  <TableHead style={{ color: "#51247a" }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOffices.map((office) => (
                  <TableRow key={office._id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{office.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate" title={office.description}>
                          {office.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {office.section}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-900">{formatDate(office.created_at || office.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 bg-transparent"
                          onClick={() => handleEdit(office)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                          onClick={() => handleDelete(office._id)}
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

          {filteredOffices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No offices found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Office</DialogTitle>
            <DialogDescription>Update the office information</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Office Name</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter office name"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Enter office description"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Section</label>
              <Select
                value={editFormData.section}
                onValueChange={(value) => setEditFormData({ ...editFormData, section: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sections.slice(1).map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isUpdating}
              style={{ backgroundColor: "#51247a" }}
              className="text-white"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
