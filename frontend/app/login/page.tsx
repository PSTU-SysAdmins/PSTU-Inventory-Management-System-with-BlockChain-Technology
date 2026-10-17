"use client"

import { SITE_LOGO } from "@/lib/site"

import { API_ROUTES } from "@/lib/api"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useRouter } from "next/navigation"
import { ForgotPasswordModal } from "@/components/forgot-password-modal"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Make the POST request to your backend API
      const response = await fetch(API_ROUTES.users.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("Login successful:", data)
        console.log("[v0] Full login response:", data)
        console.log("[v0] data.user:", data.user)
        console.log("[v0] data.user.id:", data.user.id)
        console.log("[v0] data._id:", data._id)
        console.log("[v0] data.id:", data.id)

        // Try different paths to get the userId
        const userId = data.user?._id || data.user?.id || data._id || data.id
        console.log("[v0] Final userId stored:", userId)

        if (!userId) {
          console.error("[v0] ERROR: No userId found in response:", data)
          setError("Login failed: User ID not found in response")
          return
        }

        localStorage.setItem("userId", userId)
        localStorage.setItem("userRole", data.user.role)
        localStorage.setItem("userName", data.user.name)
        localStorage.setItem("userEmail", email)

        if (data.user.role === "admin") {
          router.push("/admin/dashboard")
        } else if (data.user.role === "teacher" || data.user.role === "staff") {
          router.push("/user/dashboard")
        }
      } else {
        setError(data.message || "Invalid email or password")
      }
    } catch (error) {
      setError("An error occurred. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f7f7" }}>
      <Header />

      <div className="flex items-center justify-center py-16">
        <div className="w-full max-w-md">
          <Card className="shadow-xl" style={{ borderColor: "#e7e7e7", backgroundColor: "#ffffff" }}>
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center items-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-solid border-[#51247a]">
                  <img
                    src={SITE_LOGO}
                    alt="PSTU Logo"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
              </div>

              <CardTitle className="text-3xl font-bold mb-2" style={{ color: "#51247a" }}>
                System Login
              </CardTitle>
              <CardDescription className="text-base" style={{ color: "#666" }}>
                Enter your credentials to access the inventory management system
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium" style={{ color: "#51247a" }}>
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base focus:border-purple-500 focus:ring-purple-500"
                    style={{ borderColor: "#e7e7e7" }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium" style={{ color: "#51247a" }}>
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-sm hover:underline"
                      style={{ color: "#51247a" }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 text-base focus:border-purple-500 focus:ring-purple-500"
                    style={{ borderColor: "#e7e7e7" }}
                  />
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-white text-base font-semibold hover:bg-purple-700 transition-colors"
                  style={{ backgroundColor: "#51247a" }}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} />
    </div>
  )
}
