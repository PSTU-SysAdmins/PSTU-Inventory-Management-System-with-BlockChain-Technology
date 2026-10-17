"use client"

import { API_ROUTES } from "@/lib/api"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, RotateCcw, Upload } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

/**
 * StockInRequestPage
 *
 * Full-featured React component for submitting stock-in requests.
 * This file is the "no SKU" variant — all SKU references have been removed.
 *
 * The component handles:
 * - loading user info from localStorage
 * - fetching items and suppliers from the API
 * - product and supplier autosuggest
 * - image preview and upload
 * - validation, form submission and error handling
 *
 * API endpoints use the shared backend origin.
 */

export default function StockInRequestPage() {
  /* -------------------------
     State definitions
     ------------------------- */
  const [currentUser, setCurrentUser] = useState({
    id: "",
    name: "",
    email: "",
    department: "",
    office: "",
  })

  const [formData, setFormData] = useState({
    productName: "",
    invoiceNumber: "",
    quantity: "",
    unitPrice: "",
    description: "",
    supplier: "",
    requestedByName: "",
  })

  // products and suppliers without SKU field
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([])
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])

  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState<Array<{ id: string; name: string }>>([])
  const [filteredSuppliers, setFilteredSuppliers] = useState<Array<{ id: string; name: string }>>([])

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string>("")

  const productInputRef = useRef<HTMLInputElement | null>(null)
  const supplierInputRef = useRef<HTMLInputElement | null>(null)

  /* -------------------------
     Effects: load user, products and suppliers
     ------------------------- */
  useEffect(() => {
    // load user info from localStorage
    const userId = localStorage.getItem("userId")
    const userName = localStorage.getItem("userName") || ""
    const userEmail = localStorage.getItem("userEmail") || ""
    const userDepartment = localStorage.getItem("userDepartment") || ""
    const userOffice = localStorage.getItem("userOffice") || ""

    setCurrentUser({
      id: userId || "",
      name: userName,
      email: userEmail,
      department: userDepartment,
      office: userOffice,
    })

    setFormData((prev) => ({
      ...prev,
      requestedByName: userName,
    }))

    // fetch products and suppliers concurrently
    const fetchProductsAndSuppliers = async () => {
      try {
        const [itemsRes, suppliersRes] = await Promise.all([
          fetch(API_ROUTES.items.list),
          fetch(API_ROUTES.suppliers.list),
        ])

        if (itemsRes.ok) {
          const itemsData = await itemsRes.json()
          const itemsList = Array.isArray(itemsData) ? itemsData : itemsData.data || itemsData.items || []

          const formattedItems = itemsList.map((item: any) => ({
            id: item.id || item._id || "",
            name: item.itemName || item.name || "",
          }))

          setProducts(formattedItems)
        } else {
          console.warn("Failed to fetch items", itemsRes.status)
        }

        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json()
          const suppliersList = Array.isArray(suppliersData)
            ? suppliersData
            : suppliersData.data || suppliersData.suppliers || []

          const formattedSuppliers = suppliersList.map((supplier: any) => ({
            id: supplier.id || supplier._id || "",
            name: supplier.supplierName || supplier.name || supplier,
          }))

          setSuppliers(formattedSuppliers)
        } else {
          console.warn("Failed to fetch suppliers", suppliersRes.status)
        }
      } catch (err) {
        console.error("Error fetching products or suppliers:", err)
      }
    }

    fetchProductsAndSuppliers()
  }, [])

  /* -------------------------
     Handlers for autosuggest inputs
     ------------------------- */
  const handleProductNameChange = (value: string) => {
    handleChange("productName", value)

    if (value.trim().length > 0) {
      const filtered = products.filter((p) => p.name.toLowerCase().includes(value.toLowerCase()))
      setFilteredProducts(filtered)
      setShowProductSuggestions(filtered.length > 0)
    } else {
      setShowProductSuggestions(false)
      setFilteredProducts([])
    }
  }

  const handleSupplierChange = (value: string) => {
    handleChange("supplier", value)

    if (value.trim().length > 0) {
      const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(value.toLowerCase()))
      setFilteredSuppliers(filtered)
      setShowSupplierSuggestions(filtered.length > 0)
    } else {
      setShowSupplierSuggestions(false)
      setFilteredSuppliers([])
    }
  }

  const selectProduct = (product: { id: string; name: string }) => {
    setFormData((prev) => ({
      ...prev,
      productName: product.name,
    }))
    setShowProductSuggestions(false)
    setFilteredProducts([])
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.productName
      return newErrors
    })
  }

  const selectSupplier = (supplier: { id: string; name: string }) => {
    setFormData((prev) => ({
      ...prev,
      supplier: supplier.name,
    }))
    setShowSupplierSuggestions(false)
    setFilteredSuppliers([])
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.supplier
      return newErrors
    })
  }

  /* -------------------------
     Validation logic
     ------------------------- */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.productName.trim()) newErrors.productName = "Product name is required"
    if (!formData.invoiceNumber.trim()) newErrors.invoiceNumber = "Invoice number is required"

    const quantityTrimmed = formData.quantity.trim()
    if (!quantityTrimmed) {
      newErrors.quantity = "Quantity is required"
    } else {
      const quantityNum = Number(quantityTrimmed)
      if (isNaN(quantityNum) || quantityNum <= 0) {
        newErrors.quantity = "Quantity must be a positive number"
      }
    }

    const unitPriceTrimmed = formData.unitPrice.trim()
    if (!unitPriceTrimmed) {
      newErrors.unitPrice = "Unit price is required"
    } else {
      const unitPriceNum = Number(unitPriceTrimmed)
      if (isNaN(unitPriceNum) || unitPriceNum <= 0) {
        newErrors.unitPrice = "Unit price must be a positive number"
      }
    }

    if (!formData.supplier.trim()) newErrors.supplier = "Supplier name is required"

    if (!imageFile) newErrors.image = "Product image is required"

    if (!currentUser.id || currentUser.id === "undefined" || currentUser.id.trim() === "") {
      newErrors.user = "User information not found. Please log in again."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  /* -------------------------
     Image handling
     ------------------------- */
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // limit file size client-side (5MB)
      const maxBytes = 5 * 1024 * 1024
      if (file.size > maxBytes) {
        setErrors((prev) => ({ ...prev, image: "Image must be 5MB or smaller" }))
        return
      }

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        if (errors.image) {
          setErrors((prev) => ({ ...prev, image: "" }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  /* -------------------------
     Submit handler
     ------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError("")
    setSuccess(false)

    const isFormValid = validateForm()

    if (!isFormValid) return

    if (!currentUser.id || currentUser.id === "undefined" || currentUser.id.trim() === "") {
      setApiError("Error: User ID not found. Please log in again.")
      return
    }

    if (!imageFile) {
      setApiError("Error: Please select an image file.")
      return
    }

    setLoading(true)

    try {
      // find matching product/supplier objects if the user selected them from suggestions
      const selectedProduct = products.find((p) => p.name === formData.productName)
      const selectedSupplier = suppliers.find((s) => s.name === formData.supplier)

      // Build FormData to send to backend
      const payload = new FormData()

      const user_id = currentUser.id?.toString()
      const item_id = selectedProduct?.id || formData.productName
      const invoice_no = formData.invoiceNumber
      const quantity = Number.parseInt(formData.quantity)
      const unit_price = Number.parseFloat(formData.unitPrice)
      const total_price = quantity * unit_price
      const supplier_id = selectedSupplier?.id || formData.supplier
      const description = formData.description || ""

      payload.append("user_id", user_id)
      payload.append("item_id", item_id)
      payload.append("invoice_no", invoice_no)
      payload.append("quantity", quantity.toString())
      payload.append("unit_price", unit_price.toString())
      payload.append("total_price", total_price.toString())
      payload.append("supplier_id", supplier_id)
      payload.append("description", description)
      payload.append("image", imageFile)

      // Debug logging (useful while developing)
      console.log("[v1] Submitting stock-in request:", {
        user_id,
        item_id,
        invoice_no,
        quantity,
        unit_price,
        total_price,
        supplier_id,
        description,
        imageName: imageFile.name,
      })

      const res = await fetch(API_ROUTES.stockInRequest.create, {
        method: "POST",
        body: payload,
      })

      const text = await res.text()
      console.log("[v1] Raw response text:", text)
      console.log("[v1] Response status:", res.status)

      let data: any
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error("[v1] Failed to parse response as JSON", parseError)
        setApiError(`Server error (${res.status}): ${text || "No response body"}`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        console.error("[v1] Backend returned error:", data)
        const errorMsg = data.message || data.error || "Error submitting form. Please try again."
        if (data.errors) {
          console.error("[v1] Validation errors from server:", data.errors)
        }
        setApiError(errorMsg)
        return
      }

      // success path
      console.log("[v1] Success response:", data)
      setSuccess(true)
      setFormData({
        productName: "",
        invoiceNumber: "",
        quantity: "",
        unitPrice: "",
        description: "",
        supplier: "",
        requestedByName: currentUser.name,
      })
      setImageFile(null)
      setImagePreview("")
      setErrors({})
    } catch (err) {
      console.error("[v1] Error submitting form:", err)
      setApiError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  /* -------------------------
     Generic change handler
     ------------------------- */
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  /* -------------------------
     Reset form
     ------------------------- */
  const resetForm = () => {
    setFormData({
      productName: "",
      invoiceNumber: "",
      quantity: "",
      unitPrice: "",
      description: "",
      supplier: "",
      requestedByName: currentUser.name,
    })
    setImageFile(null)
    setImagePreview("")
    setErrors({})
    setSuccess(false)
    setApiError("")
  }

  /* -------------------------
     Render
     ------------------------- */
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              style={{ borderColor: "#e7e7e7", color: "#51247a" }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#51247a" }}>
          Request Stock In
        </h2>
        <p style={{ color: "#666" }}>Submit a new stock in request for admin approval</p>
      </div>

      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>Stock In Request Details</CardTitle>
          <CardDescription style={{ color: "#666" }}>
            Fill in all required fields. Your request will be reviewed by the admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="requestedByName" style={{ color: "#51247a" }}>
                Your Name *
              </Label>
              <Input
                id="requestedByName"
                value={formData.requestedByName}
                onChange={(e) => handleChange("requestedByName", e.target.value)}
                placeholder="Enter your full name"
                className={errors.requestedByName ? "border-red-300" : ""}
                style={{ borderColor: errors.requestedByName ? "#ef4444" : "#e7e7e7" }}
              />
              {errors.requestedByName && <p className="text-sm text-red-600">{errors.requestedByName}</p>}
            </div>

            {/* Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 relative">
                <Label htmlFor="productName" style={{ color: "#51247a" }}>
                  Product Name *
                </Label>
                <Input
                  id="productName"
                  ref={productInputRef}
                  value={formData.productName}
                  onChange={(e) => handleProductNameChange(e.target.value)}
                  onFocus={() => formData.productName && setShowProductSuggestions(true)}
                  placeholder="Enter or select product name"
                  autoComplete="off"
                  style={{ borderColor: errors.productName ? "#ef4444" : "#e7e7e7" }}
                />
                {showProductSuggestions && filteredProducts.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10"
                    style={{ borderColor: "#e7e7e7" }}
                  >
                    {filteredProducts.slice(0, 8).map((product, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100"
                        onClick={() => selectProduct(product)}
                      >
                        <div style={{ color: "#51247a" }} className="font-medium">
                          {product.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {errors.productName && <p className="text-sm text-red-600">{errors.productName}</p>}
              </div>

              {/* Invoice Number */}
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber" style={{ color: "#51247a" }}>
                  Invoice Number *
                </Label>
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => handleChange("invoiceNumber", e.target.value)}
                  placeholder="e.g., INV-001"
                  style={{ borderColor: errors.invoiceNumber ? "#ef4444" : "#e7e7e7" }}
                />
                {errors.invoiceNumber && <p className="text-sm text-red-600">{errors.invoiceNumber}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity" style={{ color: "#51247a" }}>
                  Quantity *
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                  placeholder="Enter quantity"
                  style={{ borderColor: errors.quantity ? "#ef4444" : "#e7e7e7" }}
                />
                {errors.quantity && <p className="text-sm text-red-600">{errors.quantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice" style={{ color: "#51247a" }}>
                  Unit Price (BDT) *
                </Label>
                <Input
                  id="unitPrice"
                  type="number"
                  value={formData.unitPrice}
                  onChange={(e) => handleChange("unitPrice", e.target.value)}
                  placeholder="Enter unit price"
                  style={{ borderColor: errors.unitPrice ? "#ef4444" : "#e7e7e7" }}
                />
                {errors.unitPrice && <p className="text-sm text-red-600">{errors.unitPrice}</p>}
              </div>
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="supplier" style={{ color: "#51247a" }}>
                Supplier Name *
              </Label>
              <Input
                id="supplier"
                ref={supplierInputRef}
                value={formData.supplier}
                onChange={(e) => handleSupplierChange(e.target.value)}
                onFocus={() => formData.supplier && setShowSupplierSuggestions(true)}
                placeholder="Enter or select supplier name"
                autoComplete="off"
                style={{ borderColor: errors.supplier ? "#ef4444" : "#e7e7e7" }}
              />
              {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-10"
                  style={{ borderColor: "#e7e7e7" }}
                >
                  {filteredSuppliers.slice(0, 8).map((supplier, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-100"
                      onClick={() => selectSupplier(supplier)}
                      style={{ color: "#51247a" }}
                    >
                      {supplier.name}
                    </button>
                  ))}
                </div>
              )}
              {errors.supplier && <p className="text-sm text-red-600">{errors.supplier}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" style={{ color: "#51247a" }}>
                Product Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Enter product description (optional)"
                style={{ borderColor: "#e7e7e7" }}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image" style={{ color: "#51247a" }}>
                Product Image *
              </Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
                style={{ borderColor: errors.image ? "#ef4444" : "#e7e7e7" }}
                onClick={() => document.getElementById("imageInput")?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
                    handleImageChange(fakeEvent)
                  }
                }}
              >
                {imagePreview ? (
                  <div className="relative inline-block">
                    <Image
                      src={imagePreview || "/placeholder.svg"}
                      alt="Preview"
                      width={200}
                      height={200}
                      className="max-w-xs max-h-xs rounded"
                    />
                    <button
                      type="button"
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImageFile(null)
                        setImagePreview("")
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: "#51247a" }} />
                    <p style={{ color: "#51247a" }} className="font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p style={{ color: "#999" }} className="text-sm">
                      PNG, JPG or GIF (max. 5MB)
                    </p>
                  </div>
                )}
              </div>
              <input id="imageInput" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              {errors.image && <p className="text-sm text-red-600">{errors.image}</p>}
            </div>

            {/* Alert Messages */}
            {apiError && (
              <Alert className="border-red-300 bg-red-50">
                <AlertDescription style={{ color: "#dc2626" }}>{apiError}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert
                className="border-green-300 bg-green-50"
                style={{ borderColor: "#22c55e", backgroundColor: "#f0fdf4" }}
              >
                <AlertDescription style={{ color: "#16a34a" }}>
                  Stock in request submitted successfully! Your request is now pending admin approval.
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                style={{
                  backgroundColor: "#51247a",
                  color: "white",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                style={{ borderColor: "#e7e7e7", color: "#51247a" }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Extra footer notes and a debug panel for developers (toggleable) */}
    
      <style jsx>{`
        /* Small styles specifically for suggestion lists and hover states */
        .suggestion-item:hover {
          background: #f7f7fb;
        }
      `}</style>

      {/* Developer debug block - only visible if localStorage.debug == 'true' */}
      {localStorage.getItem("debug") === "true" && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <pre className="text-xs">{JSON.stringify({ currentUser, formData, productsCount: products.length, suppliersCount: suppliers.length }, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}


