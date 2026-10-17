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

export default function ReportDeadStockPage() {
  const [currentUser, setCurrentUser] = useState({
    id: "",
    name: "",
    email: "",
    department: "",
    office: "",
  })

  const [formData, setFormData] = useState({
    productName: "",
    quantity: "",
    reason: "",
  })

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([])
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState<Array<{ id: string; name: string }>>([])

  const [stockCounts, setStockCounts] = useState<Record<string, number>>({})
  const [loadingStockCount, setLoadingStockCount] = useState(false)

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState<string>("")

  const productInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
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

    const fetchProducts = async () => {
      try {
        const itemsRes = await fetch(API_ROUTES.items.list)

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
      } catch (err) {
        console.error("Error fetching products:", err)
      }
    }

    fetchProducts()
  }, [])

  const fetchStockCount = async (itemId: string) => {
    if (!itemId || !currentUser.id) return

    setLoadingStockCount(true)
    try {
      const res = await fetch(
        API_ROUTES.currentstockouts.quantity(currentUser.id, itemId),
      )

      if (res.ok) {
        const data = await res.json()
        let quantity = 0
        if (Array.isArray(data) && data.length > 0) {
          quantity = data[0].quantity || 0
        } else if (data.totalQuantity !== undefined) {
          quantity = data.totalQuantity
        } else if (data.quantity !== undefined) {
          quantity = data.quantity
        }

        setStockCounts((prev) => ({
          ...prev,
          [itemId]: quantity,
        }))
      }
    } catch (err) {
      console.error("Error fetching stock count:", err)
    } finally {
      setLoadingStockCount(false)
    }
  }

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
      delete newErrors.quantity
      return newErrors
    })
    fetchStockCount(product.id)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      if (errors.image) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.image
          return newErrors
        })
      }
    }
  }

  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview("")
    if (imageInputRef.current) {
      imageInputRef.current.value = ""
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.productName.trim()) newErrors.productName = "Product name is required"

    const quantityTrimmed = formData.quantity.trim()
    if (!quantityTrimmed) {
      newErrors.quantity = "Quantity is required"
    } else {
      const quantityNum = Number(quantityTrimmed)
      if (isNaN(quantityNum) || quantityNum <= 0) {
        newErrors.quantity = "Quantity must be a positive number"
      } else {
        const selectedProduct = products.find((p) => p.name === formData.productName)
        if (selectedProduct) {
          const availableStock = stockCounts[selectedProduct.id] || 0
          if (quantityNum > availableStock) {
            newErrors.quantity = `Quantity cannot exceed available stock (${availableStock} available)`
          }
        }
      }
    }

    if (!formData.reason.trim()) newErrors.reason = "Reason for dead stock is required"

    if (!selectedImage) newErrors.image = "Image is required"

    if (!currentUser.id || currentUser.id === "undefined" || currentUser.id.trim() === "") {
      newErrors.user = "User information not found. Please log in again."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

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

    setLoading(true)

    try {
      const selectedProduct = products.find((p) => p.name === formData.productName)

      if (!selectedProduct) {
        setErrors({ productName: "Please select a product from the dropdown list" })
        setLoading(false)
        return
      }

      const user_id = currentUser.id?.toString()
      const item_id = selectedProduct.id
      const quantity = Number.parseInt(formData.quantity)
      const reason = formData.reason || ""

      const formDataToSubmit = new FormData()
      formDataToSubmit.append("user_id", user_id)
      formDataToSubmit.append("item_id", item_id)
      formDataToSubmit.append("quantity", quantity.toString())
      formDataToSubmit.append("reason", reason)
      if (selectedImage) {
        formDataToSubmit.append("image", selectedImage, selectedImage.name)
      }

      const res = await fetch(API_ROUTES.deadstockrequests.create, {
        method: "POST",
        body: formDataToSubmit,
      })

      const text = await res.text()

      let data: any
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        console.error("Failed to parse response as JSON", parseError)
        setApiError(`Server error (${res.status}): ${text || "No response body"}`)
        setLoading(false)
        return
      }

      if (!res.ok) {
        console.error("Error from backend:", data)
        const errorMsg = data.message || data.error || "Error submitting form. Please try again."
        setApiError(errorMsg)
        return
      }

      setSuccess(true)
      setFormData({
        productName: "",
        quantity: "",
        reason: "",
      })
      setSelectedImage(null)
      setImagePreview("")
      setErrors({})
    } catch (err) {
      console.error("Error submitting form:", err)
      setApiError(err instanceof Error ? err.message : "An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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

  const resetForm = () => {
    setFormData({
      productName: "",
      quantity: "",
      reason: "",
    })
    setSelectedImage(null)
    setImagePreview("")
    setErrors({})
    setSuccess(false)
    setApiError("")
    setStockCounts({})
  }

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
          Report Dead Stock
        </h2>
        <p style={{ color: "#666" }}>Submit a dead stock report for admin review and processing</p>
      </div>

      <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
        <CardHeader>
          <CardTitle style={{ color: "#51247a" }}>Dead Stock Report Details</CardTitle>
          <CardDescription style={{ color: "#666" }}>
            Fill in all required fields. Your report will be reviewed by the admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label style={{ color: "#51247a" }}>Your Name</Label>
              <div className="px-3 py-2 bg-gray-50 rounded-md border" style={{ borderColor: "#e7e7e7", color: "#666" }}>
                {currentUser.name || "Loading..."}
              </div>
            </div>

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
                  onFocus={() => {
                    if (products.length > 0) {
                      setFilteredProducts(
                        formData.productName.trim()
                          ? products.filter((p) => p.name.toLowerCase().includes(formData.productName.toLowerCase()))
                          : products,
                      )
                      setShowProductSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowProductSuggestions(false), 200)
                  }}
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

              <div className="space-y-2">
                <Label htmlFor="quantity" style={{ color: "#51247a" }}>
                  Quantity * {/* Show available stock */}
                  {formData.productName && (
                    <span style={{ color: "#666" }} className="text-sm font-normal">
                      {loadingStockCount ? (
                        " (Loading stock...)"
                      ) : (
                        <>
                          {" "}
                          (Available:{" "}
                          {stockCounts[products.find((p) => p.name === formData.productName)?.id || ""] || 0})
                        </>
                      )}
                    </span>
                  )}
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                  placeholder="Enter quantity of dead stock"
                  style={{ borderColor: errors.quantity ? "#ef4444" : "#e7e7e7" }}
                />
                {errors.quantity && <p className="text-sm text-red-600">{errors.quantity}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" style={{ color: "#51247a" }}>
                Reason for Dead Stock *
              </Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                placeholder="Enter reason for marking this item as dead stock (e.g., expired, damaged, obsolete, etc.)"
                style={{ borderColor: errors.reason ? "#ef4444" : "#e7e7e7" }}
                rows={5}
              />
              {errors.reason && <p className="text-sm text-red-600">{errors.reason}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image" style={{ color: "#51247a" }}>
                Upload Image *
              </Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition"
                style={{
                  borderColor: errors.image ? "#ef4444" : "#e7e7e7",
                  backgroundColor: errors.image ? "#fef2f2" : "transparent",
                }}
                onClick={() => imageInputRef.current?.click()}
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  id="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="space-y-3">
                    <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="max-h-48 mx-auto rounded" />
                    <p style={{ color: "#51247a" }} className="font-medium">
                      {selectedImage?.name}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        clearImage()
                      }}
                      style={{ borderColor: "#e7e7e7", color: "#51247a" }}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto" style={{ color: "#51247a" }} />
                    <p style={{ color: "#51247a" }} className="font-medium">
                      Click to upload image
                    </p>
                    <p style={{ color: "#999" }} className="text-sm">
                      or drag and drop
                    </p>
                  </div>
                )}
              </div>
              {errors.image && <p className="text-sm text-red-600">{errors.image}</p>}
            </div>

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
                  Dead stock report submitted successfully! Your report is now pending admin review.
                </AlertDescription>
              </Alert>
            )}

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
                {loading ? "Submitting..." : "Submit Report"}
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

      {localStorage.getItem("debug") === "true" && (
        <div className="mt-4 p-4 border rounded bg-gray-50">
          <h3 className="font-semibold mb-2">Debug Info</h3>
          <pre className="text-xs">
            {JSON.stringify(
              { currentUser, formData, hasImage: !!selectedImage, productsCount: products.length },
              null,
              2,
            )}
          </pre>
        </div>
      )}
    </div>
  )
}
