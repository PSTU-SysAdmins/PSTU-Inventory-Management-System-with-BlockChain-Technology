"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, User, Boxes, MessageSquare, Calendar, AlertCircle } from "lucide-react"

interface StockOut {
  _id: string
  item_id: string
  quantity: number
  issue_by: string
  remarks: string
  createdAt: string
  productName?: string
}

export default function MyStockOutPage() {
  const [stockOuts, setStockOuts] = useState<StockOut[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStockOuts = async () => {
      try {
        setLoading(true)
        const userId = localStorage.getItem("userId")

        if (!userId) {
          setError("User ID not found. Please log in.")
          setLoading(false)
          return
        }

        const response = await fetch(API_ROUTES.stockouts.user(userId))

        if (!response.ok) {
          throw new Error("Failed to fetch stock outs")
        }

          const data = await response.json()
          console.log("Fetched stock outs data:", data)
        const stockOutsArray = Array.isArray(data) ? data : data.data || []

        const enrichedStockOuts = await Promise.all(
          stockOutsArray.map(async (stockOut: any) => {
            try {
              const productResponse = await fetch(API_ROUTES.items.getById(stockOut.item_id))
              if (productResponse.ok) {
                const product = await productResponse.json()
                return {
                  ...stockOut,
                  productName: product.name || "Unknown Product",
                }
              }
            } catch (err) {
              console.error("[v0] Error fetching product:", err)
            }
            return {
              ...stockOut,
              productName: "Unknown Product",
            }
          }),
        )

        const sorted = enrichedStockOuts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        setStockOuts(sorted)
        setError(null)
      } catch (err) {
        console.error("[v0] Error:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchStockOuts()
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-12 pb-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="animate-spin">
                  <Boxes className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-muted-foreground">Loading your stock out records...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">My Stock Out</h1>
          </div>
          <p className="text-slate-600 ml-11">Track all your outgoing inventory records</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-xl">Stock Out Records</CardTitle>
                <CardDescription className="text-blue-100 mt-1">Total records: {stockOuts.length}</CardDescription>
              </div>
              <div className="text-4xl font-bold text-blue-100 opacity-20">
                <Boxes className="w-12 h-12" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {error ? (
              <div className="p-6 bg-red-50 border-l-4 border-red-600 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">Error</p>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            ) : stockOuts.length === 0 ? (
              <div className="p-12 text-center">
                <Boxes className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">No stock out records found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b-2 border-slate-200 hover:bg-slate-50">
                      <TableHead className="text-slate-700 font-semibold">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Product Name
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-700 font-semibold">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Issue By
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-700 font-semibold">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4" />
                          Quantity
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-700 font-semibold">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Remarks
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-700 font-semibold">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Date & Time
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockOuts.map((stockOut, index) => (
                      <TableRow
                        key={stockOut._id}
                        className="border-b border-slate-200 hover:bg-blue-50 transition-colors"
                      >
                        <TableCell className="font-semibold text-slate-900">{stockOut.productName}</TableCell>
                        <TableCell className="text-slate-700">{stockOut.issue_by}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                            {stockOut.quantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {stockOut.remarks ? (
                            <span className="inline-flex max-w-xs truncate">{stockOut.remarks}</span>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">{formatDate(stockOut.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
