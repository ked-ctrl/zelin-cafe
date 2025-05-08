"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Coffee, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Navbar from "../components/navbar"
import Footer from "../components/footer"
import { supabase } from "@/lib/supabase"
import bcrypt from 'bcryptjs'
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setPasswordMismatch(password !== confirmPassword && password !== "" && confirmPassword !== "");
  }, [password, confirmPassword]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordMismatch) {
      toast.error("Passwords do not match");
      return;
    }
    
    try {
      const hashedPassword = await bcrypt.hash(password, 10)
      
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            email,
            password: hashedPassword,
            full_name: name
          }
        ])
        .select()
        .single()

      if (error) throw error

      toast.success("You have successfully signed up! Please enter your credentials to log in.")

      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: any) {
      console.error("Signup error:", error)
      toast.error(`Signup failed: ${error?.message || 'Unknown error occurred'}`)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 bg-gray-50">
        <div className="container px-4 md:px-6">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="max-w-md mx-auto">
            <Card>
              <CardHeader className="space-y-1">
                <div className="flex justify-center mb-2">
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="bg-brown-600 p-2 rounded-full"
                  >
                    <Coffee className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
                <CardTitle className="text-2xl text-center">Create an account</CardTitle>
                <CardDescription className="text-center">Sign up for your Zelin Café account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Juan Dela Cruz"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Password must be at least 8 characters long</p>
                      {passwordMismatch && <p className="text-xs text-red-500">Passwords do not match</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {passwordMismatch && <p className="text-xs text-red-500">Passwords do not match</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terms"
                        checked={agreeTerms}
                        onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                        required
                      />
                      <Label htmlFor="terms" className="text-sm">
                        I agree to the{" "}
                        <Link href="/terms" className="text-brown-600 hover:underline">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-brown-600 hover:underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>
                    <Button type="submit" className="w-full bg-amber-700 text-white" disabled={!agreeTerms}>
                      Create Account
                    </Button>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex flex-col">
                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/login" className="text-brown-600 hover:underline">
                    Sign in
                  </Link>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}