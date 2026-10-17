"use client"

import { API_ROUTES } from "@/lib/api"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Loader2, Clock } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface Office {
  _id: string
  name: string
  description?: string
  location?: string
}

interface Item {
  _id: string
  name: string
  category_id: string
  category_name?: string
}

interface ItemStats {
  stock_in: number
  stock_out: number
  dead_stock: number
  current_stock: number
}

interface OfficeWithItems extends Office {
  items: (Item & ItemStats)[]
}

export default function OfficeReport() {
  const [searchInput, setSearchInput] = useState("")
  const [allOffices, setAllOffices] = useState<Office[]>([])
  const [suggestions, setSuggestions] = useState<Office[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedOffice, setSelectedOffice] = useState<OfficeWithItems | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>("")

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

  useEffect(() => {
    if (!mounted) return
    const fetchAllOffices = async () => {
      try {
        const res = await fetch(API_ROUTES.offices.list)
        if (res.ok) {
          const data = await res.json()
          setAllOffices(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error("[v0] Failed to fetch offices:", error)
      }
    }
    fetchAllOffices()
  }, [mounted])

  useEffect(() => {
    if (searchInput.trim().length > 0) {
      const filtered = allOffices.filter((office) => office.name.toLowerCase().includes(searchInput.toLowerCase()))
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchInput, allOffices])

  const filterZeroStockItems = (items: (Item & ItemStats)[]) => {
    return items.filter((item) => !(item.stock_in === 0 && item.stock_out === 0 && item.dead_stock === 0))
  }

  const handleSelectOffice = async (office: Office) => {
    setLoading(true)
    setSearchInput("")
    setSuggestions([])
    setShowSuggestions(false)

    try {
      const itemsRes = await fetch(API_ROUTES.items.list)
      if (!itemsRes.ok) throw new Error("Failed to fetch items")
      const allItems = await itemsRes.json()

      const stockInRes = await fetch(API_ROUTES.stockins.office(office._id))
      const stockOutRes = await fetch(API_ROUTES.stockouts.office(office._id))
      const deadStocksRes = await fetch(API_ROUTES.deadstocks.office(office._id))

      let stockInData: Record<string, number> = {}
      let stockOutData: Record<string, number> = {}
      let deadStockData: Record<string, number> = {}

      if (stockInRes.ok) {
        const data = await stockInRes.json()
        stockInData = Array.isArray(data)
          ? data.reduce((acc: Record<string, number>, item: any) => {
              acc[item.item_id] = (acc[item.item_id] || 0) + (item.quantity || 0)
              return acc
            }, {})
          : {}
      }

      if (stockOutRes.ok) {
        const data = await stockOutRes.json()
        stockOutData = Array.isArray(data)
          ? data.reduce((acc: Record<string, number>, item: any) => {
              acc[item.item_id] = (acc[item.item_id] || 0) + (item.quantity || 0)
              return acc
            }, {})
          : {}
      }

      if (deadStocksRes.ok) {
        const data = await deadStocksRes.json()
        deadStockData = Array.isArray(data)
          ? data.reduce((acc: Record<string, number>, item: any) => {
              acc[item.item_id] = (acc[item.item_id] || 0) + (item.quantity || 0)
              return acc
            }, {})
          : {}
      }

      const officeItemsWithStats = allItems.map((item: Item) => {
        const stock_in = stockInData[item._id] || 0
        const stock_out = stockOutData[item._id] || 0
        const dead_stock = deadStockData[item._id] || 0
        const current_stock = stock_in - stock_out

        return {
          ...item,
          stock_in,
          stock_out,
          dead_stock,
          current_stock,
        }
      })

      const filteredItems = filterZeroStockItems(officeItemsWithStats)

      setSelectedOffice({
        ...office,
        items: filteredItems,
      })
    } catch (error) {
      console.error("[v0] Failed to load office data:", error)
      alert("Failed to load office data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const loadImageAsBase64 = async (imagePath: string): Promise<string> => {
    try {
      const response = await fetch(imagePath, {
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "image/*",
        },
      })

      if (!response.ok) {
        return ""
      }

      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result)
        }
        reader.onerror = () => {
          resolve("")
        }
        reader.readAsDataURL(blob)
      })
    } catch (err) {
      return ""
    }
  }

  const generatePDFReport = async () => {
    if (!selectedOffice) return

    setGenerating(true)
    try {
      const logoUrl = "/pstu_logo.jpeg"
      let logoBase64 = ""
      try {
        logoBase64 = await loadImageAsBase64(logoUrl)
      } catch (err) {
        console.warn("[v0] Logo loading failed, continuing without logo")
      }

      const reportDiv = document.createElement("div")
      reportDiv.style.position = "absolute"
      reportDiv.style.left = "-9999px"
      reportDiv.style.width = "900px"
      reportDiv.style.backgroundColor = "white"

      const filteredPDFItems = filterZeroStockItems(selectedOffice.items)

      const tableRows = filteredPDFItems
        .map(
          (item, idx) => `
        <tr>
          <td style="border:1px solid #ddd; padding:6px; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #ddd; padding:6px;">${item.name || "N/A"}</td>
          <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#e8f5e9; font-weight:bold;">${Number(item.stock_in) || 0}</td>
          <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#fce4ec; font-weight:bold;">${Number(item.stock_out) || 0}</td>
          <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#fff3e0; font-weight:bold;">${Number(item.dead_stock) || 0}</td>
          <td style="border:1px solid #ddd; padding:6px; text-align:center; background-color:#e3f2fd; font-weight:bold;">${Number(item.current_stock) || 0}</td>
        </tr>
      `,
        )
        .join("")

      reportDiv.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: white;">
          <div style="text-align:center; margin-bottom: 15px;">
            ${
              logoBase64
                ? `<img src="${logoBase64}" alt="PSTU Logo" style="width:90px; height:90px; border-radius:50%; margin:0 auto 10px; object-fit: cover; display:block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />`
                : `<div style="width:90px; height:90px; margin:0 auto 10px; background-color:#f0f0f0; border: 1px solid #ddd; display:flex; align-items:center; justify-content:center; font-size:10px; color:#999; border-radius:50%;">Logo</div>`
            }
          </div>

          <div style="text-align:center; margin-bottom: 20px;">
            <h2 style="color:#51247a; margin:5px 0; font-size: 18px;">পটুয়াখালী বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়</h2>
            <h4 style="color:#666; margin:3px 0; font-size: 14px;">Patuakhali Science and Technology University</h4>
            <h3 style="margin:10px 0; color:#51247a; font-size: 16px;">অফিস আইটেম রিপোর্ট</h3>
            <hr style="border:1px solid #51247a; margin-top:10px;" />
          </div>

          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-radius: 5px;">
            <p style="margin: 5px 0;"><strong>অফিসের নাম:</strong> ${selectedOffice.name}</p>
            ${selectedOffice.description ? `<p style="margin: 5px 0;"><strong>বর্ণনা:</strong> ${selectedOffice.description}</p>` : ""}
            ${selectedOffice.location ? `<p style="margin: 5px 0;"><strong>অবস্থান:</strong> ${selectedOffice.location}</p>` : ""}
            <p style="margin: 5px 0;"><strong>রিপোর্ট তারিখ:</strong> ${new Date().toLocaleString("bn-BD")}</p>
          </div>

          <table style="width:100%; border-collapse:collapse; font-size:10px;">
            <thead>
              <tr style="background-color:#51247a; color:white;">
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">ক্রমিক<br/>(Number)</th>
                <th style="border:1px solid #ddd; padding:6px;">পণ্যের নাম<br/>(Item Name)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">স্টক ইন<br/>(Stock IN)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">স্টক আউট<br/>(Stock OUT)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">ডেড স্টক<br/>(Dead Stock)</th>
                <th style="border:1px solid #ddd; padding:6px; text-align:center;">বর্তমান স্টক<br/>(Current Stock)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <p style="text-align:center; margin-top:20px; font-size:10px;">
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
        logging: false,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
        let heightLeft = pdfHeight - pdf.internal.pageSize.getHeight()
        let position = 0
        while (heightLeft > 0) {
          position = heightLeft - pdfHeight
          pdf.addPage()
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
          heightLeft -= pdf.internal.pageSize.getHeight()
        }
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      }

      pdf.save(`office-report-${selectedOffice.name}-${new Date().toISOString().split("T")[0]}.pdf`)
      document.body.removeChild(reportDiv)
    } catch (error) {
      console.error("[v0] Failed to generate PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setGenerating(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {!selectedOffice ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2" style={{ color: "#51247a" }}>
                অফিস রিপোর্ট
              </h1>
              <p className="text-gray-600">Office Report - Search and generate reports by office</p>
            </div>

            {/* Search Card */}
            <Card>
              <CardContent className="p-6">
                <div className="relative space-y-4">
                  <label className="block text-sm font-medium text-gray-700">অফিস খুঁজুন</label>
                  <Input
                    type="text"
                    placeholder="অফিসের নাম লিখুন... (Search office name)"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => searchInput.trim().length > 0 && setShowSuggestions(true)}
                    className="w-full"
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                      {suggestions.map((office) => (
                        <button
                          key={office._id}
                          onClick={() => handleSelectOffice(office)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                        >
                          <p className="font-medium text-gray-900">{office.name}</p>
                          {office.description && <p className="text-xs text-gray-500">{office.description}</p>}
                        </button>
                      ))}
                    </div>
                  )}

                  {showSuggestions && suggestions.length === 0 && searchInput.trim().length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4 text-center text-gray-500 text-sm">
                      কোনো অফিস পাওয়া যায়নি
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Current Time Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-center justify-center">
                  <Clock className="w-5 h-5" style={{ color: "#51247a" }} />
                  <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">{currentTime}</div>
                </div>
              </CardContent>
            </Card>

            {/* Office Info Card */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4" style={{ color: "#51247a" }}>
                  {selectedOffice.name}
                </h2>
                <div className="space-y-2 text-sm">
                  {selectedOffice.description && (
                    <p>
                      <span className="font-medium">বর্ণনা:</span> {selectedOffice.description}
                    </p>
                  )}
                  {selectedOffice.location && (
                    <p>
                      <span className="font-medium">অবস্থান:</span> {selectedOffice.location}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">মোট আইটেম:</span> {selectedOffice.items.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            {selectedOffice.items.length > 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "#51247a" }} className="text-white">
                          <th className="px-4 py-3 text-center">ক্রমিক</th>
                          <th className="px-4 py-3 text-left">পণ্যের নাম</th>
                          <th className="px-4 py-3 text-center">স্টক ইন</th>
                          <th className="px-4 py-3 text-center">স্টক আউট</th>
                          <th className="px-4 py-3 text-center">ডেড স্টক</th>
                          <th className="px-4 py-3 text-center">বর্তমান স্টক</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOffice.items.map((item, idx) => (
                          <tr key={item._id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-center">{idx + 1}</td>
                            <td className="px-4 py-3">{item.name || "N/A"}</td>
                            <td className="px-4 py-3 text-center">{Number(item.stock_in) || 0}</td>
                            <td className="px-4 py-3 text-center">{Number(item.stock_out) || 0}</td>
                            <td className="px-4 py-3 text-center">{Number(item.dead_stock) || 0}</td>
                            <td className="px-4 py-3 text-center font-medium">{Number(item.current_stock) || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">এই অফিসের কোনো আইটেম নেই</CardContent>
              </Card>
            )}

            {/* PDF Button */}
            <div className="flex gap-3">
              <Button
                onClick={generatePDFReport}
                disabled={generating}
                className="flex-1 text-white gap-2"
                style={{ backgroundColor: "#51247a" }}
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    তৈরি হচ্ছে...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    PDF ডাউনলোড করুন
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setSelectedOffice(null)
                  setSearchInput("")
                }}
                variant="outline"
              >
                নতুন অনুসন্ধান
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
