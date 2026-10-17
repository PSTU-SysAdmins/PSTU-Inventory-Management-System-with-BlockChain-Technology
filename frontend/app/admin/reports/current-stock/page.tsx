"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, AlertTriangle, Loader2, Clock } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface Category {
  _id: string
  name: string
}

interface InventoryItem {
  _id: string
  name: string
  category_id?: string
  category_name?: string
  brand?: string
  unit?: string
  stock_in?: number
  stock_out?: number
  dead_stock?: number
  current_stock?: number
}

export default function InventoryTotalReport() {
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>([])
  const [currentTime, setCurrentTime] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [mounted, setMounted] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [mounted])

  const fetchCategoryName = async (categoryId: string): Promise<string> => {
    try {
      if (!categoryId || !/^[0-9a-fA-F]{24}$/.test(categoryId)) return "N/A"
      const res = await fetch(API_ROUTES.categories.getById(categoryId))
      if (!res.ok) return "N/A"
      const category: Category = await res.json()
      return category.name || "N/A"
    } catch {
      return "N/A"
    }
  }

  const fetchStockStats = async (productId: string) => {
    try {
      const stockInRes = await fetch(API_ROUTES.stockins.item(productId))
      const stockInData = stockInRes.ok ? await stockInRes.json() : null

      const stockOutRes = await fetch(API_ROUTES.stockouts.item(productId))
      const stockOutData = stockOutRes.ok ? await stockOutRes.json() : null

      const deadStockRes = await fetch(API_ROUTES.deadstocks.item(productId))
      const deadStockData = deadStockRes.ok ? await deadStockRes.json() : null

      const stockIn = getQuantitySum(stockInData)
      const stockOut = getQuantitySum(stockOutData)
      const deadStock = getQuantitySum(deadStockData)

      const currentStock = Math.max(0, stockIn - stockOut - deadStock)

      return {
        stock_in: stockIn,
        stock_out: stockOut,
        dead_stock: deadStock,
        current_stock: currentStock,
      }
    } catch (err) {
      console.error(`Error fetching stock stats for item ${productId}:`, err)
      return { stock_in: 0, stock_out: 0, dead_stock: 0, current_stock: 0 }
    }
  }

  const getQuantitySum = (data: any): number => {
    if (!data) return 0

    // If it's an array, sum the quantities
    if (Array.isArray(data)) {
      return data.reduce((sum: number, entry: any) => sum + (Number(entry.quantity) || 0), 0)
    }

    // If it's a single object with quantity
    if (data.quantity) {
      return Number(data.quantity) || 0
    }

    // If it has a data array inside (pagination format)
    if (data.data && Array.isArray(data.data)) {
      return data.data.reduce((sum: number, entry: any) => sum + (Number(entry.quantity) || 0), 0)
    }

    return 0
  }

  const filterZeroStockItems = (items: InventoryItem[]): InventoryItem[] => {
    return items.filter((item) => {
      const stockIn = Number(item.stock_in) || 0
      const stockOut = Number(item.stock_out) || 0
      const deadStock = Number(item.dead_stock) || 0
      return !(stockIn === 0 && stockOut === 0 && deadStock === 0)
    })
  }

  const fetchInventoryData = async (signal?: AbortSignal): Promise<InventoryItem[]> => {
    const res = await fetch(API_ROUTES.items.list, { signal })
    if (!res.ok) throw new Error(await res.text())
    const items = await res.json()

    const enrichedItems = await Promise.all(
      items.map(async (item: InventoryItem) => {
        if (signal?.aborted) return { ...item, stock_in: 0, stock_out: 0, dead_stock: 0, current_stock: 0 }
        const stats = await fetchStockStats(item._id)
        const stockIn = Number(stats.stock_in) || Number(item.stock_in) || 0
        const stockOut = Number(stats.stock_out) || Number(item.stock_out) || 0
        const deadStock = Number(stats.dead_stock) || Number(item.dead_stock) || 0
        const currentStock = Number(stats.current_stock) || Math.max(0, stockIn - stockOut - deadStock)

        return {
          ...item,
          stock_in: stockIn,
          stock_out: stockOut,
          dead_stock: deadStock,
          current_stock: currentStock,
        }
      }),
    )

    return filterZeroStockItems(enrichedItems)
  }

  const loadImageAsBase64 = async (imagePath: string): Promise<string> => {
    try {
      const response = await fetch(imagePath, { mode: "cors", credentials: "omit" })
      if (!response.ok) return ""
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch {
      return ""
    }
  }

  const generatePDFReport = async () => {
    try {
      setLoading(true)
      let data = inventoryData.length > 0 ? inventoryData : await fetchInventoryData()

      data = filterZeroStockItems(data)

      const logoUrl = "/pstu_logo.jpeg"
      const logoBase64 = await loadImageAsBase64(logoUrl)

      const reportDiv = document.createElement("div")
      reportDiv.style.position = "absolute"
      reportDiv.style.left = "-9999px"
      reportDiv.style.width = "900px"
      reportDiv.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: white;">
          <!-- Logo in round shape -->
          <div style="text-align:center; margin-bottom: 15px;">
            ${
              logoBase64
                ? `<img src="${logoBase64}" alt="PSTU Logo" style="width:90px; height:90px; border-radius:50%; object-fit:cover; display:block; margin:0 auto 10px;" />`
                : ""
            }
          </div>

          <div style="text-align:center; margin-bottom: 20px;">
            <h2 style="color:#51247a; margin:5px 0; font-size: 18px;">পটুয়াখালী বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়</h2>
            <h4 style="color:#666; margin:3px 0; font-size: 14px;">Patuakhali Science and Technology University</h4>
            <h3 style="margin:10px 0; color:#51247a; font-size: 16px;">ইনভেন্টরি মোট রিপোর্ট (Total Inventory Report)</h3>
            <hr style="border:1px solid #51247a; margin-top:10px;" />
          </div>

          <div style="font-size:12px; margin-bottom:15px;">
            <strong>রিপোর্ট তারিখ:</strong> ${new Date().toLocaleString("bn-BD")}
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:10px;">
            <thead>
              <tr style="background-color:#51247a; color:white;">
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">ক্রমিক<br/>(Number)</th>
                <th style="border:1px solid #ddd; padding:6px;">আইটেম<br/>(Item)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">স্টক ইন<br/>(Stock IN)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">স্টক আউট<br/>(Stock OUT)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">ডেড স্টক<br/>(Dead Stock)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">বর্তমান স্টক<br/>(Current Stock)</th>
              </tr>
            </thead>
            <tbody>
              ${data
                .map((item: any, i: number) => {
                  const stockIn = Number(item.stock_in) || 0
                  const stockOut = Number(item.stock_out) || 0
                  const deadStock = Number(item.dead_stock) || 0
                  const currentStock = Number(item.current_stock) || Math.max(0, stockIn - stockOut - deadStock)

                  return `
                    <tr>
                      <td style="border:1px solid #ddd; padding:6px; text-align:center;">${i + 1}</td>
                      <td style="border:1px solid #ddd; padding:6px;">${item.name ?? ""}</td>
                      <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#e8f5e9; font-weight:bold;">${stockIn}</td>
                      <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#fce4ec; font-weight:bold;">${stockOut}</td>
                      <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#fff3e0; font-weight:bold;">${deadStock}</td>
                      <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#e3f2fd; font-weight:bold;">${currentStock}</td>
                    </tr>
                  `
                })
                .join("")}
            </tbody>
          </table>

          <p style="text-align:center; margin-top:20px; font-size:10px;">
            এই রিপোর্টটি ইনভেন্টরি ম্যানেজমেন্ট সিস্টেম দ্বারা স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে।<br/>
            © ${new Date().getFullYear()} Patuakhali Science and Technology University.
          </p>
        </div>
      `
      document.body.appendChild(reportDiv)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      const canvas = await html2canvas(reportDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        backgroundColor: "#ffffff",
      })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`inventory-total-report-${new Date().toISOString().split("T")[0]}.pdf`)
      document.body.removeChild(reportDiv)
      setLoading(false)
    } catch (err) {
      console.error("Error generating PDF:", err)
      alert("PDF generation failed. Please try again.")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted) return
    const controller = new AbortController()
    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchInventoryData(controller.signal)
        setInventoryData(data)
        setDataLoaded(true)
      } catch {
        setError("Failed to load inventory data. Please check the API server.")
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [mounted])

  if (!mounted)
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  if (loading && !dataLoaded)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "#51247a" }} />
          <p className="text-gray-600">Loading inventory report...</p>
        </div>
      </div>
    )
  if (error && !dataLoaded)
    return (
      <div className="p-6 text-center text-red-600">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-3" variant="outline">
          Retry
        </Button>
      </div>
    )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-6">
          <div>
            <div className="flex justify-center items-center space-x-2 mb-2">
              <Clock className="w-5 h-5" style={{ color: "#51247a" }} />
              <h2 className="text-lg font-semibold" style={{ color: "#51247a" }}>
                বর্তমান সময় (Current Time)
              </h2>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{currentTime}</p>
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: "#51247a" }}>
              ইনভেন্টরি মোট রিপোর্ট
            </h3>
            <p className="text-sm text-gray-600">Total Inventory Report Generator (PDF)</p>
            <p className="text-xs text-gray-500 mt-2">Items loaded: {inventoryData.length}</p>
          </div>
          <div className="space-y-3">
            <Button
              onClick={generatePDFReport}
              disabled={loading || inventoryData.length === 0}
              className="w-full text-white flex justify-center space-x-2"
              style={{ backgroundColor: "#51247a" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              <span>{loading ? "তৈরি হচ্ছে..." : "PDF রিপোর্ট তৈরি করুন (Generate PDF)"}</span>
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full flex justify-center space-x-2"
              style={{ borderColor: "#e7e7e7", color: "#51247a" }}
            >
              <Download className="w-4 h-4" />
              <span>Refresh Data</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
