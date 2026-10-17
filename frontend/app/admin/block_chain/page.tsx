"use client"

import { API_ROUTES } from "@/lib/api"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle, Lock } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Block {
  _id: string
  index: number
  timestamp: string
  event_type: string
  event_id: string
  collection_name: string
  user_id?: string
  payload: any
  is_verified: boolean
  hash: string
  previous_hash: string
}

interface StockInRequest {
  _id: string
  [key: string]: any
}

interface NameCache {
  users: { [key: string]: string }
  departments: { [key: string]: string }
  items: { [key: string]: string }
  suppliers: { [key: string]: string }
  offices: { [key: string]: string }
}

function verifyChainLocally(blocks: Block[]): { isValid: boolean; tamperedBlocks: any[] } {
  const tamperedBlocks = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (!block.is_verified) {
      tamperedBlocks.push({
        index: block.index,
        reason: "Block marked as unverified",
        block_id: block._id,
      })
    }

    if (i > 0 && block.previous_hash !== blocks[i - 1].hash) {
      tamperedBlocks.push({
        index: block.index,
        reason: "Previous hash mismatch - chain broken",
        block_id: block._id,
      })
    }
  }

  return { isValid: tamperedBlocks.length === 0, tamperedBlocks }
}

export default function BlockchainVerification() {
  const [stockInId, setStockInId] = useState("")
  const [auditTrail, setAuditTrail] = useState<Block[]>([])
  const [stockInData, setStockInData] = useState<StockInRequest | null>(null)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [nameCache, setNameCache] = useState<NameCache>({
    users: {},
    departments: {},
    items: {},
    suppliers: {},
    offices: {},
  })

  const fetchName = async (type: string, id: string, cache: NameCache): Promise<string> => {
    if (!id) return "Unknown"

    const cacheMap: { [key: string]: { [key: string]: string } } = {
      user: cache.users,
      department: cache.departments,
      item: cache.items,
      supplier: cache.suppliers,
      office: cache.offices,
    }

    // Check cache first
    if (cacheMap[type]?.[id]) {
      return cacheMap[type][id]
    }

    try {
      const endpoint = API_ROUTES.records.getByType(type, id)
      const response = await fetch(endpoint)

      if (response.ok) {
        const data = await response.json()
        let name = "Unknown"

        if (type === "user" && data.name) name = data.name
        else if (type === "department" && data.name) name = data.name
        else if (type === "item" && data.name) name = data.name
        else if (type === "supplier" && data.name) name = data.name
        else if (type === "office" && data.name) name = data.name

        // Update cache
        setNameCache((prev) => ({
          ...prev,
          [type + "s"]: { ...prev[(type + "s") as keyof NameCache], [id]: name },
        }))

        return name
      }
    } catch (err) {
      console.log(`[v0] Failed to fetch ${type} name for ${id}`)
    }

    return id.substring(0, 8) + "..."
  }

  const enhancedStockInData = async (stockIn: StockInRequest) => {
    const enhanced = { ...stockIn }
    const cache = nameCache

    // Resolve common ID fields
    if (stockIn.user_id) {
      enhanced.user_name = await fetchName("user", stockIn.user_id, cache)
    }
    if (stockIn.department_id) {
      enhanced.department_name = await fetchName("department", stockIn.department_id, cache)
    }
    if (stockIn.item_id) {
      enhanced.item_name = await fetchName("item", stockIn.item_id, cache)
    }
    if (stockIn.supplier_id) {
      enhanced.supplier_name = await fetchName("supplier", stockIn.supplier_id, cache)
    }
    if (stockIn.office_id) {
      enhanced.office_name = await fetchName("office", stockIn.office_id, cache)
    }

    return enhanced
  }

  const fetchAuditTrail = async () => {
    if (!stockInId.trim()) {
      setError("Please enter a StockIn ID")
      return
    }

    setLoading(true)
    setError("")
    setAuditTrail([])
    setStockInData(null)
    setVerificationResult(null)

    try {
      const stockInResponse = await fetch(API_ROUTES.stockins.getById(stockInId))
      if (!stockInResponse.ok) {
        throw new Error("StockIn request not found")
      }
      const stockIn = await stockInResponse.json()

      const enhancedData = await enhancedStockInData(stockIn)
      setStockInData(enhancedData)

      const blockchainResponse = await fetch(API_ROUTES.blockchain.audit(stockInId))
      if (!blockchainResponse.ok) {
        throw new Error("No blockchain audit trail found for this StockIn ID")
      }
      const blockchainData = await blockchainResponse.json()

      const trail = blockchainData.auditTrail || blockchainData.events || []

      if (!Array.isArray(trail) || trail.length === 0) {
        throw new Error("No audit trail records found")
      }

      const sortedTrail = trail.sort((a: Block, b: Block) => a.index - b.index)
      setAuditTrail(sortedTrail)

      const verification = verifyChainLocally(sortedTrail)
      setVerificationResult(verification)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setAuditTrail([])
      setStockInData(null)
      setVerificationResult(null)
    } finally {
      setLoading(false)
    }
  }

  const updateCount = auditTrail.filter((b) => b.event_type === "UPDATE").length
  const isTampered = auditTrail.some((b) => !b.is_verified)
  const chainStatus = isTampered ? "Chain Broken" : "Chain Intact"
  const chainStatusColor = isTampered ? "text-red-600" : "text-green-600"
  const currentQuantity = auditTrail.length > 0 ? auditTrail[auditTrail.length - 1].payload?.quantity || 0 : 0

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Blockchain Verification</h1>
          <p className="text-muted-foreground">Audit trail and tamper detection for StockIn items</p>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Audit Trail</CardTitle>
            <CardDescription>
              Enter a StockIn ID to view its blockchain history and verify data integrity
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="Enter StockIn ID..."
              value={stockInId}
              onChange={(e) => setStockInId(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && fetchAuditTrail()}
            />
            <Button onClick={fetchAuditTrail} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {auditTrail.length > 0 && (
          <>
            {stockInData && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">StockIn Request Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    {Object.entries(stockInData).map(([key, value]) => {
                      if (key === "_id" || key.endsWith("_id")) return null
                      if (key.endsWith("_name")) {
                        return (
                          <div key={key}>
                            <span className="text-muted-foreground capitalize">
                              {key.replace(/_/g, " ").replace(" name", "")}:
                            </span>
                            <div className="font-semibold">{String(value)}</div>
                          </div>
                        )
                      }
                      return (
                        <div key={key}>
                          <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                          <div className="font-semibold">
                            {typeof value === "object" ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Current Quantity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentQuantity}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{updateCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{auditTrail.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Chain Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${chainStatusColor}`}>{chainStatus}</div>
                </CardContent>
              </Card>
            </div>

            {/* Chain Integrity Alert */}
            {isTampered && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>⚠️ Chain Broken - Tampering Detected</AlertTitle>
                <AlertDescription>
                  {auditTrail.filter((b) => !b.is_verified).length} blocks have been marked as unverified. Please review
                  the tampered blocks below.
                </AlertDescription>
              </Alert>
            )}

            {!isTampered && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">✓ Chain Intact - All Blocks Verified</AlertTitle>
                <AlertDescription className="text-green-700">
                  All {auditTrail.length} blocks in the chain have been verified and are intact.
                </AlertDescription>
              </Alert>
            )}

            {/* Timeline View */}
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail Timeline</CardTitle>
                <CardDescription>Complete history of events for this StockIn ID</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {auditTrail.map((block, idx) => (
                    <div key={block._id} className="relative">
                      {idx < auditTrail.length - 1 && <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />}

                      <div className="flex gap-4">
                        {/* Timeline marker */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-sm ${
                              block.is_verified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {idx + 1}
                          </div>
                        </div>

                        {/* Event details */}
                        <div
                          className={`flex-1 p-4 rounded-lg border-2 ${
                            block.is_verified ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-sm">{block.event_type}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {new Date(block.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {block.is_verified ? (
                                <div className="flex items-center gap-1 text-green-700">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-semibold">Verified</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-700">
                                  <AlertCircle className="w-4 h-4" />
                                  <span className="text-xs font-semibold">Tampered</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Block Index:</span>
                              <div className="font-mono font-semibold">{block.index}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">User:</span>
                              <div className="font-semibold">{block.user_id || "System"}</div>
                            </div>
                            {block.payload?.quantity !== undefined && (
                              <div>
                                <span className="text-muted-foreground">Quantity:</span>
                                <div className="font-semibold">{block.payload.quantity}</div>
                              </div>
                            )}
                            {block.payload?.notes && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">Notes:</span>
                                <div className="font-semibold">{block.payload.notes}</div>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 pt-3 border-t border-current border-opacity-10">
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>
                                <span className="font-mono break-all">Hash: {block.hash.substring(0, 32)}...</span>
                              </div>
                              <div>
                                <span className="font-mono break-all">
                                  Prev:{" "}
                                  {block.previous_hash === "GENESIS" ? "GENESIS" : block.previous_hash.substring(0, 32)}
                                  ...
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Verification Details */}
            {verificationResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Chain Verification Report</CardTitle>
                  <CardDescription>Results from the blockchain integrity check</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Overall Status</div>
                      <div
                        className={`text-lg font-bold ${verificationResult.isValid ? "text-green-600" : "text-red-600"}`}
                      >
                        {verificationResult.isValid ? "Valid Chain" : "Invalid Chain"}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tampered Blocks</div>
                      <div
                        className={`text-lg font-bold ${verificationResult.tamperedBlocks.length === 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {verificationResult.tamperedBlocks.length}
                      </div>
                    </div>
                  </div>

                  {verificationResult.tamperedBlocks.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold text-sm">Tampered Blocks Details:</div>
                      <div className="space-y-2">
                        {verificationResult.tamperedBlocks.map((tamperedBlock: any, idx: number) => (
                          <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded">
                            <div className="font-mono text-xs">
                              <div>
                                <strong>Block Index:</strong> {tamperedBlock.index}
                              </div>
                              <div>
                                <strong>Reason:</strong> {tamperedBlock.reason}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && auditTrail.length === 0 && !error && (
          <Card className="text-center py-12">
            <CardContent>
              <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Audit Trail Found</h3>
              <p className="text-sm text-muted-foreground">
                Enter a StockIn ID above to view its blockchain audit trail and verify chain integrity.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
