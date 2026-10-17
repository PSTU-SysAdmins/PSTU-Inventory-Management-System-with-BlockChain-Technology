"use client"

import { API_ROUTES } from "@/lib/api"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Edit, Trash2, Filter, Search, Package } from "lucide-react"
import Link from "next/link"

const categories = [
  "All Categories",
  "Electronics",
  "Office Supplies",
  "Furniture",
  "Computer Hardware",
  "Laboratory Equipment",
]

export default function ItemsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category_id: "",
    unit: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(API_ROUTES.items.list)
        if (response.ok) {
          const data = await response.json()
          setItems(data)
          setFilteredItems(data)
        } else {
          console.error("Failed to fetch items:", response.status)
        }
      } catch (error) {
        console.error("Error fetching items:", error)
      }
    }
    fetchItems()
  }, [])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    filterItems(value, selectedCategory)
  }

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category)
    filterItems(searchTerm, category)
  }

  const filterItems = (search: string, category: string) => {
    let filtered = items

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.description.toLowerCase().includes(search.toLowerCase()) ||
          item.category_id.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (category !== "All Categories") {
      filtered = filtered.filter((item) => item.category_id === category)
    }

    setFilteredItems(filtered)
  }

  const handleEditClick = (item: any) => {
    setSelectedItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      category_id: item.category_id,
      unit: item.unit,
    })
    setIsEditModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setSelectedItem(null)
    setFormData({
      name: "",
      description: "",
      category_id: "",
      unit: "",
    })
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSaveItem = async () => {
    if (!selectedItem) return

    setIsSaving(true)
    try {
      const response = await fetch(API_ROUTES.items.update(selectedItem.id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedItem = await response.json()

        // Update items list
        const updatedItems = items.map((item) => (item.id === selectedItem.id ? updatedItem : item))
        setItems(updatedItems)

        // Update filtered items
        filterItems(searchTerm, selectedCategory)

        alert("Item updated successfully")
        handleCloseModal()
      } else {
        const error = await response.json()
        alert(`Failed to update item: ${error.message}`)
      }
    } catch (error) {
      console.error("Error updating item:", error)
      alert("Error updating item")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return
    }

    setDeletingId(id)
    try {
      const response = await fetch(API_ROUTES.items.delete(id), {
        method: "DELETE",
      })

      if (response.ok) {
        const updatedItems = items.filter((item) => item.id !== id)
        setItems(updatedItems)
        setFilteredItems(
          updatedItems.filter((item) => {
            let matches = true

            if (searchTerm) {
              matches =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.category_id.toLowerCase().includes(searchTerm.toLowerCase())
            }

            if (selectedCategory !== "All Categories") {
              matches = matches && item.category_id === selectedCategory
            }

            return matches
          }),
        )
        alert("Item deleted successfully")
      } else {
        const error = await response.json()
        alert(`Failed to delete item: ${error.message}`)
      }
    } catch (error) {
      console.error("Error deleting item:", error)
      alert("Error deleting item")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#51247a" }}>
            Item Management
          </h2>
          <p className="text-gray-600">Manage all inventory items and their information</p>
        </div>
        <Link href="/admin/items/create">
          <Button className="text-white hover:bg-purple-700 flex items-center" style={{ backgroundColor: "#51247a" }}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Item
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-navy-800" style={{ color: "#1e3a8a" }}>
                  {items.length}
                </p>
              </div>
              <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                <Package className="w-4 h-4 text-navy-600" style={{ color: "#1e3a8a" }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-100">
        <CardHeader>
          <CardTitle className="text-navy-700" style={{ color: "#51247a" }}>
            All Items
          </CardTitle>
          <CardDescription>Search and manage inventory items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 border-blue-200 focus:border-navy-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={selectedCategory} onValueChange={handleCategoryFilter}>
                <SelectTrigger className="w-48 border-blue-200 focus:border-navy-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border border-blue-100">
            <Table>
              <TableHeader>
                <TableRow className="bg-navy-50" style={{ backgroundColor: "#f8fafc" }}>
                  <TableHead className="text-navy-800" style={{ color: "#51247a" }}>
                    No
                  </TableHead>
                  <TableHead className="text-navy-800" style={{ color: "#51247a" }}>
                    Item Name
                  </TableHead>
                  <TableHead className="text-navy-800" style={{ color: "#51247a" }}>
                    Description
                  </TableHead>
                  <TableHead className="text-navy-800" style={{ color: "#51247a" }}>
                    Category
                  </TableHead>
                  <TableHead className="text-navy-800" style={{ color: "#51247a" }}>
                    Unit
                  </TableHead>
                  <TableHead className="text-navy-800" style={{ color: "#51247a" }}>
                    Created
                  </TableHead>
                  <TableHead className="text-navy-800" style={{ color: "#51247a" }}>
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={item.id} className="hover:bg-gray-50">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{item.category_id}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>{item.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-navy-200 text-navy-600 hover:bg-navy-50 bg-transparent"
                          onClick={() => handleEditClick(item)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
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

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No items found matching your search criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <Input name="name" value={formData.name} onChange={handleFormChange} placeholder="Enter item name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Input
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Enter item description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.slice(1).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <Input
                name="unit"
                value={formData.unit}
                onChange={handleFormChange}
                placeholder="Enter unit (e.g., pcs, box)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              style={{ backgroundColor: "#51247a" }}
              className="text-white"
              onClick={handleSaveItem}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
