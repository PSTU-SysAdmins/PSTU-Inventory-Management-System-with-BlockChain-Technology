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
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, RotateCcw, Plus, Minus, ArrowDown, User, Loader2 } from "lucide-react"
import Link from "next/link"

// Types for API data
interface StockInRecord {
  _id: string
  user_id: string
  item_id: string
  supplier_id: string
  quantity: number
  unit_price: number
  total_price?: string
  purchase_date?: string
  invoice_no?: string
  item_name?: string
  supplier_name?: string
  unit?: string
  category?: string
  available_quantity?: number
}

interface UserInfo {
  _id: string
  name: string
  email: string
  role?: string
  roll?: string
  department?: string
  department_id?: string
  office?: string
  office_id?: string
  phone?: string
  employee_id?: string
}

interface IssueItem {
  quantity: number
  usedLocation: string
  maxQuantity?: number
  availableQuantity?: number
  itemId: string
}

// New component for dropdown search
interface UserDropdownProps {
  value: string
  onChange: (userId: string) => void
  onUserSelect?: (user: UserInfo) => void
  placeholder?: string
  error?: string
}

function UserDropdown({ value, onChange, onUserSelect, placeholder = "Search by name", error }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [users, setUsers] = useState<UserInfo[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [displayName, setDisplayName] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch(API_ROUTES.users.list)
        if (response.ok) {
          const data = await response.json()
          setUsers(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  useEffect(() => {
    if (value) {
      const user = users.find((u: UserInfo) => u._id === value)
      if (user) {
        setDisplayName(user.name)
      }
    } else {
      setDisplayName("")
    }
  }, [value, users])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredUsers(users.filter((user) => user.name.toLowerCase().includes(term)))
    }
  }, [searchTerm, users])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setSearchTerm(inputValue)
  }

  const handleSelectUser = (user: UserInfo) => {
    onChange(user._id)
    setDisplayName(user.name)
    if (onUserSelect) {
      onUserSelect(user)
    }
    setIsOpen(false)
    setSearchTerm("")
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full">
      <Input
        value={displayName}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={`w-full border-2 rounded-lg px-3 py-2 ${error ? "border-red-500" : ""}`}
      />
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-gray-500">Loading users...</div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user._id}
                onClick={() => handleSelectUser(user)}
                className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                {user.name}
              </div>
            ))
          ) : (
            <div className="p-2 text-gray-500 text-sm">No users found</div>
          )}
        </div>
      )}
    </div>
  )
}

// Item Dropdown (select item from /api/items/get)
interface ItemDropdownProps {
  value: string
  onChange: (itemId: string, itemName: string) => void
  placeholder?: string
  error?: string
}

interface ItemData {
  _id: string
  name: string
  item_id?: string
  item_name?: string
}

function ItemDropdown({ value, onChange, placeholder = "Search by item name", error }: ItemDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<ItemData[]>([])
  const [filteredItems, setFilteredItems] = useState<ItemData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [displayName, setDisplayName] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch all items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true)
        const response = await fetch(API_ROUTES.items.list)
        if (response.ok) {
          const data = await response.json()
          setItems(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error("Error fetching items:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  useEffect(() => {
    if (value) {
      const it = items.find((i: ItemData) => i._id === value || i.item_id === value)
      if (it) {
        setDisplayName(it.name || it.item_name || "")
      }
    } else {
      setDisplayName("")
    }
  }, [value, items])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredItems(items)
    } else {
      const term = searchTerm.toLowerCase()
      setFilteredItems(
        items.filter((item) => {
          const itemName = item.name || item.item_name || ""
          return itemName.toLowerCase().includes(term)
        }),
      )
    }
  }, [searchTerm, items])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setSearchTerm(inputValue)
  }

  const handleSelectItem = (item: ItemData) => {
    const itemName = item.name || item.item_name || ""
    onChange(item._id, itemName)
    setDisplayName(itemName)
    setIsOpen(false)
    setSearchTerm("")
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchTerm("")
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          type="text"
          value={searchTerm || displayName}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`pr-8 ${error ? "border-red-500" : ""}`}
        />
        <button
          type="button"
          onClick={() => {
            if (isOpen) {
              setIsOpen(false)
            } else {
              handleInputFocus()
            }
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {isOpen ? "✕" : "▼"}
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-center text-sm text-gray-500">Loading items...</div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => handleSelectItem(item)}
                className="w-full text-left px-3 py-2 hover:bg-purple-100 text-sm transition-colors"
              >
                {item.name || item.item_name}
              </button>
            ))
          ) : (
            <div className="p-2 text-center text-sm text-gray-500">No items found</div>
          )}
        </div>
      )}
    </div>
  )
}

// New StockInDropdown - user chooses a specific stock-in batch for the selected item
// THIS COMPONENT WAS REMOVED ENTIRELY

export default function CreateStockOut() {
  const [stockInRecords, setStockInRecords] = useState<StockInRecord[]>([])
  const [loadingStockIn, setLoadingStockIn] = useState(true)
  const [apiError, setApiError] = useState<string>("")

  const [formData, setFormData] = useState({
    user_id: "",
    issueDate: "",
    issue_by: "",
    remarks: "",
  })
  const [issueItems, setIssueItems] = useState<IssueItem[]>([
    { quantity: 0, usedLocation: "", itemId: "", availableQuantity: 0 },
  ])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)
  const [userNotFound, setUserNotFound] = useState(false)

  // Fetch stock in records with available quantities
  useEffect(() => {
    const fetchStockInRecords = async () => {
      try {
        setLoadingStockIn(true)

        // Fetch stock in records from the stockins API
        const stockInResponse = await fetch(API_ROUTES.stockins.list)
        if (!stockInResponse.ok) {
          throw new Error(`HTTP error! status: ${stockInResponse.status}`)
        }
        const stockInData = await stockInResponse.json()

        // Filter records that have available quantity > 0
        const availableRecords = Array.isArray(stockInData)
          ? stockInData.filter((record: any) => record.quantity > 0)
          : []

        setStockInRecords(availableRecords)
        setApiError("")
      } catch (error) {
        console.error("Error fetching stock in records:", error)
        setApiError("Failed to load stock records. Please check your connection.")
      } finally {
        setLoadingStockIn(false)
      }
    }

    fetchStockInRecords()
  }, [])

  // Fetch user information by ID
  const fetchUserInfo = async (userId: string) => {
    if (!userId.trim()) {
      setUserInfo(null)
      setUserNotFound(false)
      return
    }

    try {
      setLoadingUser(true)
      setUserNotFound(false)
      const response = await fetch(API_ROUTES.users.getById(userId))

      if (!response.ok) {
        if (response.status === 404) {
          setUserNotFound(true)
          setUserInfo(null)
        } else {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return
      }

      const data = await response.json()
      setUserInfo(data)
      setUserNotFound(false)

      // Clear any previous userId errors
      setErrors((prev) => ({ ...prev, user_id: "" }))
    } catch (error) {
      console.error("Error fetching user info:", error)
      setUserNotFound(true)
      setUserInfo(null)
    } finally {
      setLoadingUser(false)
    }
  }

  useEffect(() => {
    // whenever formData.user_id changes, fetch user data
    if (formData.user_id) fetchUserInfo(formData.user_id)
  }, [formData.user_id])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.user_id) {
      newErrors.user_id = "Issue To user is required"
    }

    if (!formData.issue_by) {
      newErrors.issue_by = "Issued By user is required"
    }

    if (!formData.issueDate) {
      newErrors.issueDate = "Issue date is required"
    }

    issueItems.forEach((item, index) => {
      if (!item.itemId) {
        newErrors[`itemId_${index}`] = "Item is required"
      }

      if (!item.quantity || item.quantity <= 0) {
        newErrors[`quantity_${index}`] = "Quantity must be greater than 0"
      }

      // Validate quantity does not exceed available quantity
      if (item.quantity > (item.availableQuantity || 0)) {
        newErrors[`quantity_${index}`] = `Quantity cannot exceed available stock (${item.availableQuantity} units)`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const checkServerConnection = async () => {
    try {
      const response = await fetch(API_ROUTES.stockins.list, {
        method: "HEAD",
      })
      return response.ok
    } catch (error) {
      console.error("Server connection check failed:", error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    // Check server connection first
    const serverOnline = await checkServerConnection()
    if (!serverOnline) {
      setErrors({
        submit: "Cannot connect to the server. Please try again shortly.",
      })
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      // Create stock-out entries for each item
      const stockOutPromises = issueItems.map(async (item) => {
        const userRole = userInfo?.role || userInfo?.roll

        const stockOutData: any = {
          user_id: formData.user_id,
          item_id: item.itemId,
          issue_type: "manual",
          issue_by: formData.issue_by,
          issue_date: formData.issueDate,
          quantity: item.quantity,
          remarks: formData.remarks,
        }

        // Only add the relevant ID based on user role
        if ((userInfo?.role || userInfo?.roll) === "teacher" && userInfo?.department_id) {
          stockOutData.department_id = userInfo.department_id
          stockOutData.office_id = "674b8c4b4f4b8c4b4f4b8c4b"
        } else if ((userInfo?.role || userInfo?.roll) === "staff" && userInfo?.office_id) {
          stockOutData.office_id = userInfo.office_id
          stockOutData.department_id = "674b8c4b4f4b8c4b4f4b8c4c"
        } else {
          stockOutData.department_id = "674b8c4b4f4b8c4b4f4b8c4c"
          stockOutData.office_id = "674b8c4b4f4b8c4b4f4b8c4b"
        }

        console.log("Sending stock out data:", stockOutData)

        const response = await fetch(API_ROUTES.stockouts.create, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stockOutData),
        })

        let responseData
        try {
          responseData = await response.json()
          console.log("Response data:", responseData)
        } catch (jsonError) {
          console.error("Failed to parse JSON response:", jsonError)
          const textResponse = await response.text()
          console.log("Raw response text:", textResponse)
          throw new Error(`Server returned invalid JSON. Status: ${response.status}, Response: ${textResponse}`)
        }

        if (!response.ok) {
          console.error("API Error Details:", {
            status: response.status,
            statusText: response.statusText,
            data: responseData,
          })

          const errorMessage =
            responseData?.message || responseData?.error || `HTTP ${response.status}: ${response.statusText}`

          throw new Error(errorMessage)
        }

        return responseData
      })

      // Wait for all stock-out entries to be created
      await Promise.all(stockOutPromises)


      const currentStockOutPromises = issueItems.map(async (item) => {
  const bodyData = {
    user_id: formData.user_id,
    department_id: userInfo?.department_id || null,
    office_id: userInfo?.office_id || null,
    item_id: item.itemId,
    issue_type: "manual",
    issue_by: formData.issue_by,
    issue_date: formData.issueDate,
    quantity: item.quantity,
    remarks: formData.remarks,
  }

  console.log("Sending current stock-out:", bodyData)

  try {
    const response = await fetch(API_ROUTES.currentstockouts.create, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("Current stock-out failed:", responseData)
      throw new Error(responseData?.message || "Failed to create current stock-out record")
    }

    console.log("Current stock-out created:", responseData)
    return responseData
  } catch (error) {
    console.error("Error creating current stock-out:", error)
    throw error
  }
})
      await Promise.all(currentStockOutPromises)
      // Update available quantity after successful stock out
      const updateQuantityPromises = issueItems.map((item) =>
        fetch(API_ROUTES.currentstockins.updateQuantity, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: formData.issue_by, // Use issued_by user for quantity tracking
            item_id: item.itemId,
            quantity: -item.quantity, // negative to decrease quantity
          }),
        }),
      )

      await Promise.all(updateQuantityPromises)

      setSuccess(true)
      resetForm()
    } catch (error) {
      console.error("Error creating stock-out entries:", error)
      setErrors({
        submit: error instanceof Error ? error.message : "Failed to create stock-out entries. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setSuccess(false)
  }

  const handleUserSelected = (user: UserInfo) => {
    setUserInfo(user)
  }

  const handleIssueItemChange = (index: number, field: keyof IssueItem, value: string | number) => {
    const updatedItems = [...issueItems]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    setIssueItems(updatedItems)

    // Clear related errors
    if (errors[`${field}_${index}`]) {
      setErrors((prev) => ({ ...prev, [`${field}_${index}`]: "" }))
    }
    setSuccess(false)
  }

  const addIssueItem = () => {
    setIssueItems([...issueItems, { quantity: 0, usedLocation: "", itemId: "", availableQuantity: 0 }])
    setSuccess(false)
  }

  const removeIssueItem = (index: number) => {
    if (issueItems.length > 1) {
      const updatedItems = issueItems.filter((_, i) => i !== index)
      setIssueItems(updatedItems)
    }
    setSuccess(false)
  }

  const resetForm = () => {
    setFormData({
      user_id: "",
      issueDate: "",
      issue_by: "",
      remarks: "",
    })
    setIssueItems([{ quantity: 0, usedLocation: "", itemId: "", availableQuantity: 0 }])
    setUserInfo(null)
    setUserNotFound(false)
    setErrors({})
    setSuccess(false)
  }

  const getTotalQuantity = () => {
    return issueItems.reduce((total, item) => total + item.quantity, 0)
  }

  const getUserRole = () => {
    return userInfo?.role || userInfo?.roll || ""
  }

  // Fetch available quantity for an item
  const fetchAvailableQuantity = async (itemId: string, issuedByUserId: string) => {
    try {
      const response = await fetch(
        API_ROUTES.currentstockins.quantity(issuedByUserId, itemId),
      )

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] API Response:", data)
        return (Array.isArray(data) ? data[0]?.quantity : data.quantity) || 0
      }
      return 0
    } catch (error) {
      console.error("Error fetching available quantity:", error)
      return 0
    }
  }

  // Show loading state while data is being fetched
  if (loadingStockIn) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "#51247a" }} />
            <p className="text-gray-600">Loading stock records...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Link href="/admin/stock-out">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              style={{ borderColor: "#e7e7e7", color: "#51247a" }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stock Out History
            </Button>
          </Link>
        </div>
        <div className="flex items-center space-x-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#fef2f2" }}
          >
            <ArrowDown className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold" style={{ color: "#51247a" }}>
              Stock Out / Issue
            </h2>
            <p className="text-gray-600">Issue inventory items to users</p>
          </div>
        </div>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">{apiError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Information */}
          <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{ color: "#51247a" }}>
                <User className="w-5 h-5" />
                <span>Issue Information</span>
              </CardTitle>
              <CardDescription>Enter details about the stock issue request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user_id" style={{ color: "#51247a" }}>
                    Issue To *
                  </Label>
                  <UserDropdown
                    value={formData.user_id}
                    onChange={(value) => handleChange("user_id", value)}
                    onUserSelect={handleUserSelected}
                    placeholder="Search by name"
                    error={errors.user_id}
                  />
                  {errors.user_id && <p className="text-sm text-red-600">{errors.user_id}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issue_by" style={{ color: "#51247a" }}>
                    Issued By *
                  </Label>
                  <UserDropdown
                    value={formData.issue_by}
                    onChange={(value) => handleChange("issue_by", value)}
                    placeholder="Search by name"
                    error={errors.issue_by}
                  />
                  {errors.issue_by && <p className="text-sm text-red-600">{errors.issue_by}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issueDate" style={{ color: "#51247a" }}>
                    Issue Date *
                  </Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => handleChange("issueDate", e.target.value)}
                    className="focus:border-purple-500"
                    style={{ borderColor: "#e7e7e7" }}
                  />
                  {errors.issueDate && <p className="text-sm text-red-600">{errors.issueDate}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" style={{ color: "#51247a" }}>
                  Remarks
                </Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => handleChange("remarks", e.target.value)}
                  placeholder="Enter any additional remarks or conditions"
                  rows={3}
                  className="focus:border-purple-500"
                  style={{ borderColor: "#e7e7e7" }}
                />
              </div>

              {/* User Information Display */}
              {loadingUser && (
                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Looking up user...</span>
                </div>
              )}

              {userInfo && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium mb-3 text-green-800">User Information:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-green-700">Name:</span>
                      <p className="text-green-600">{userInfo.name}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Email:</span>
                      <p className="text-green-600">{userInfo.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-green-700">Role:</span>
                      <p className="text-green-600 capitalize">{getUserRole()}</p>
                    </div>
                    {getUserRole() === "teacher" && userInfo.department && (
                      <div>
                        <span className="font-medium text-green-700">Department:</span>
                        <p className="text-green-600">{userInfo.department}</p>
                      </div>
                    )}
                    {getUserRole() === "staff" && userInfo.office && (
                      <div>
                        <span className="font-medium text-green-700">Office:</span>
                        <p className="text-green-600">{userInfo.office}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Issue Items */}
          <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2" style={{ color: "#51247a" }}>
                    <ArrowDown className="w-5 h-5" />
                    <span>Items to Issue</span>
                  </CardTitle>
                  <CardDescription>Select items from stock and quantities to be issued</CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addIssueItem}
                  className="text-white hover:bg-purple-700"
                  style={{ backgroundColor: "#51247a" }}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {issueItems.map((issueItem, index) => (
                <div
                  key={index}
                  className="p-4 border rounded-lg space-y-4"
                  style={{ borderColor: "#e7e7e7", backgroundColor: "#fef2f2" }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium" style={{ color: "#51247a" }}>
                      Item #{index + 1}
                    </h4>
                    {issueItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeIssueItem(index)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label style={{ color: "#51247a" }}>Item *</Label>
                      <ItemDropdown
                        value={issueItem.itemId || ""}
                        onChange={async (itemId, itemName) => {
                          let availableQty = 0
                          if (formData.issue_by && itemId) {
                            availableQty = await fetchAvailableQuantity(itemId, formData.issue_by)
                          }

                          const updatedItems = [...issueItems]
                          updatedItems[index] = {
                            ...updatedItems[index],
                            itemId,
                            availableQuantity: availableQty,
                          }
                          setIssueItems(updatedItems)

                          // Clear error if any
                          if (errors[`itemId_${index}`]) {
                            setErrors((prev) => ({ ...prev, [`itemId_${index}`]: "" }))
                          }
                          setSuccess(false)
                        }}
                        placeholder="Search by item name"
                        error={errors[`itemId_${index}`]}
                      />
                      {errors[`itemId_${index}`] && <p className="text-sm text-red-600">{errors[`itemId_${index}`]}</p>}
                      {issueItem.availableQuantity !== undefined && issueItem.availableQuantity > 0 && (
                        <p className="text-sm text-green-600">Available: {issueItem.availableQuantity} units</p>
                      )}
                      {issueItem.availableQuantity !== undefined &&
                        issueItem.availableQuantity === 0 &&
                        issueItem.itemId && <p className="text-sm text-red-600">No stock available for this item</p>}
                    </div>

                    <div className="space-y-2">
                      <Label style={{ color: "#51247a" }}>Used Location (Optional)</Label>
                      <Input
                        value={issueItem.usedLocation}
                        onChange={(e) => handleIssueItemChange(index, "usedLocation", e.target.value)}
                        placeholder="Enter location where item will be used"
                        className="focus:border-purple-500"
                        style={{ borderColor: "#e7e7e7" }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label style={{ color: "#51247a" }}>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={issueItem.quantity || ""}
                        onChange={(e) => handleIssueItemChange(index, "quantity", Number.parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className={`focus:border-purple-500 ${errors[`quantity_${index}`] ? "border-red-300" : ""}`}
                        style={{ borderColor: errors[`quantity_${index}`] ? "#ef4444" : "#e7e7e7" }}
                      />
                      {errors[`quantity_${index}`] && (
                        <p className="text-sm text-red-600">{errors[`quantity_${index}`]}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{ color: "#51247a" }}>
                <User className="w-5 h-5" />
                <span>Issue Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Items:</span>
                  <Badge variant="outline">{issueItems.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Quantity:</span>
                  <Badge variant="outline">{getTotalQuantity()}</Badge>
                </div>
                <div className="border-t pt-3" style={{ borderColor: "#e7e7e7" }}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium" style={{ color: "#51247a" }}>
                      Issue To:
                    </span>
                    <Badge variant="secondary">{userInfo ? userInfo.name : "Not Selected"}</Badge>
                  </div>
                </div>
              </div>

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-700">Submitted successfully</AlertDescription>
                </Alert>
              )}

              {errors.submit && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{errors.submit}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  className="w-full text-white hover:bg-purple-700 flex items-center justify-center"
                  style={{ backgroundColor: "#51247a" }}
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Processing..." : "Issue Stock"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-transparent hover:bg-purple-50 flex items-center justify-center"
                  style={{ borderColor: "#e7e7e7", color: "#51247a" }}
                  onClick={resetForm}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
