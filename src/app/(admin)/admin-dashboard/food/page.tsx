"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Search, Plus, MoreHorizontal, Edit, Trash2, Coffee, Grid3X3, List, Loader } from "lucide-react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { uploadImage } from "@/lib/storage"
import { useRouter } from "next/navigation"
import Cookies from "js-cookie"

// Add proper type definitions
interface MenuItem {
  id: string
  menu_name: string
  menu_description: string
  menu_price: number
  menu_category: string
  menu_image: string
  available: boolean
  featured: boolean
  stock: number
}

interface NewItem {
  menu_name: string
  menu_description: string
  menu_price: string
  menu_category: string
  menu_image: string
  available: boolean
  featured: boolean
  stock: number
  new_category: string
}

export default function FoodItemsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [viewMode, setViewMode] = useState("grid")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [foodItems, setFoodItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [newItem, setNewItem] = useState<NewItem>({
    menu_name: "",
    menu_description: "",
    menu_price: "",
    menu_category: "",
    menu_image: "",
    available: true,
    featured: false,
    stock: 100,
    new_category: "",
  })
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const [admin, setAdmin] = useState<any>(null)

  const fetchMenuItems = useCallback(async () => {
    try {
      setLoading(true)
      const { data: menuItems, error } = await supabase
        .from("menu")
        .select("*")
        .order("menu_name")

      if (error) throw error

      setFoodItems(menuItems as MenuItem[])
      const uniqueCategories = [...new Set(menuItems.map((item) => item.menu_category))]
      setCategories(uniqueCategories)
    } catch (error: any) {
      console.error("Error fetching menu items:", error)
      toast.error(`Failed to load menu items: ${error.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenuItems()

    // Real-time subscription
    const channel = supabase
      .channel("menu-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu" }, (payload) => {
        fetchMenuItems()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchMenuItems])

  useEffect(() => {
    const adminSession = Cookies.get("admin-session")
    if (!adminSession) {
      router.push("/admin-login")
      return
    }

    const adminData = JSON.parse(adminSession)
    setAdmin(adminData)
  }, [router])

  if (!admin) {
    return <div>Loading...</div>
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true)
      const file = event.target.files?.[0]

      if (!file) {
        toast.error("No file selected for upload.")
        return
      }

      const imageUrl = await uploadImage(file)

      if (!imageUrl) {
        throw new Error("Failed to upload image. Please try again.")
      }

      if (isEditDialogOpen && selectedItem) {
        setSelectedItem({
          ...selectedItem,
          menu_image: imageUrl,
        })
      } else {
        setNewItem({
          ...newItem,
          menu_image: imageUrl,
        })
      }

      toast.success("Image uploaded successfully!")
    } catch (error: any) {
      console.error("Error uploading image:", error)
      toast.error(error.message || "An unknown error occurred while uploading image")
    } finally {
      setIsUploading(false)
    }
  }

  const handleAddItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)

      if (!newItem.menu_name.trim()) {
        throw new Error("Name is required.")
      }

      let finalCategory = newItem.menu_category.trim()
      if (finalCategory === "new") {
        if (!newItem.new_category.trim()) {
          throw new Error("New category name is required.")
        }
        finalCategory = newItem.new_category.trim()
      }

      if (!finalCategory) {
        throw new Error("Category is required.")
      }

      const price = parseFloat(newItem.menu_price)
      if (isNaN(price) || price <= 0) {
        throw new Error("Please enter a valid price greater than 0.")
      }

      const stock = parseInt(newItem.stock.toString(), 10)
      if (isNaN(stock) || stock < 0) {
        throw new Error("Please enter a valid stock number (0 or greater).")
      }

      const itemToInsert = {
        menu_name: newItem.menu_name.trim(),
        menu_description: newItem.menu_description.trim(),
        menu_price: price,
        menu_category: finalCategory,
        menu_image: newItem.menu_image || null,
        available: newItem.available,
        featured: newItem.featured,
        stock: stock,
      }

      console.log("Data to insert into Supabase:", itemToInsert)

      const { data, error } = await supabase
        .from("menu")
        .insert([itemToInsert])
        .select()

      if (error) {
        console.error("Supabase insert error:", error)
        throw new Error(`Failed to add item: ${error.message || "Unknown error"} (Code: ${error.code || "N/A"})`)
      }

      if (!data || data.length === 0) {
        throw new Error("Failed to retrieve inserted item data.")
      }

      setFoodItems([data[0] as MenuItem, ...foodItems])
      setIsAddDialogOpen(false)
      setNewItem({
        menu_name: "",
        menu_description: "",
        menu_price: "",
        menu_category: "",
        menu_image: "",
        available: true,
        featured: false,
        stock: 100,
        new_category: "",
      })
      fetchMenuItems()
      toast.success("Menu item added successfully to Supabase!")
    } catch (error: any) {
      console.error("Error adding menu item:", error)
      toast.error(error.message || "An unknown error occurred while adding item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedItem) return

    try {
      setIsSubmitting(true)

      if (!selectedItem.menu_name.trim()) {
        throw new Error("Name is required.")
      }

      let finalCategory = selectedItem.menu_category.trim()
      if (finalCategory === "new") {
        const newCategory = (document.getElementById("edit-newCategory") as HTMLInputElement)?.value?.trim() || ""
        if (!newCategory) {
          throw new Error("New category name is required.")
        }
        finalCategory = newCategory
      }

      if (!finalCategory) {
        throw new Error("Category is required.")
      }

      if (isNaN(selectedItem.menu_price) || selectedItem.menu_price <= 0) {
        throw new Error("Please enter a valid price greater than 0.")
      }

      if (isNaN(selectedItem.stock) || selectedItem.stock < 0) {
        throw new Error("Please enter a valid stock number (0 or greater).")
      }

      const itemToUpdate = {
        menu_name: selectedItem.menu_name.trim(),
        menu_description: selectedItem.menu_description.trim(),
        menu_price: selectedItem.menu_price,
        menu_category: finalCategory,
        menu_image: selectedItem.menu_image || null,
        available: selectedItem.available,
        featured: selectedItem.featured,
        stock: selectedItem.stock,
      }

      console.log("Data to update in Supabase:", itemToUpdate)

      const { error } = await supabase
        .from("menu")
        .update(itemToUpdate)
        .eq("id", selectedItem.id)

      if (error) {
        console.error("Supabase update error:", error)
        throw new Error(`Failed to update item: ${error.message || "Unknown error"} (Code: ${error.code || "N/A"})`)
      }

      setFoodItems(
        foodItems.map((item) =>
          item.id === selectedItem.id ? { ...selectedItem, menu_category: finalCategory } : item
        )
      )
      setIsEditDialogOpen(false)
      setSelectedItem(null)
      fetchMenuItems()
      toast.success("Menu item updated successfully!")
    } catch (error: any) {
      console.error("Error updating menu item:", error)
      toast.error(error.message || "An unknown error occurred while updating item")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePriceChange = (value: string, isEdit: boolean) => {
    if (isEdit && selectedItem) {
      const price = parseFloat(value) || 0
      setSelectedItem({
        ...selectedItem,
        menu_price: price,
      })
    } else {
      setNewItem((prev) => ({
        ...prev,
        menu_price: value,
      }))
    }
  }

  const handleStockChange = (value: string, isEdit: boolean) => {
    const stock = parseInt(value, 10) || 0
    if (isEdit && selectedItem) {
      setSelectedItem({
        ...selectedItem,
        stock,
      })
    } else {
      setNewItem((prev) => ({
        ...prev,
        stock,
      }))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("menu").delete().eq("id", id)

      if (error) throw error

      fetchMenuItems()
      toast.success("Menu item deleted successfully!")
    } catch (error: any) {
      console.error("Error deleting menu item:", error)
      toast.error(error.message || "An unknown error occurred while deleting item")
    }
  }

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

  const filteredItems = foodItems.filter((item) => {
    const matchesSearch =
      item.menu_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.menu_description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || item.menu_category === categoryFilter

    return matchesSearch && matchesCategory
  })

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Food Items</CardTitle>
                <CardDescription>Manage your menu items, prices, and availability</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search items..."
                    className="pl-8 w-full sm:w-[200px] lg:w-[300px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1 border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="rounded-none rounded-l-md"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="rounded-none rounded-r-md"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                      <DialogDescription>Create a new food or beverage item for your menu.</DialogDescription>
                    </DialogHeader>
                    <form id="add-item-form" onSubmit={handleAddItem}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Name*
                          </Label>
                          <Input
                            id="name"
                            className="col-span-3"
                            value={newItem.menu_name}
                            onChange={(e) => setNewItem({ ...newItem, menu_name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="description" className="text-right">
                            Description
                          </Label>
                          <Input
                            id="description"
                            className="col-span-3"
                            value={newItem.menu_description}
                            onChange={(e) => setNewItem({ ...newItem, menu_description: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="price" className="text-right">
                            Price*
                          </Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={newItem.menu_price}
                            onChange={(e) => handlePriceChange(e.target.value, false)}
                            className="col-span-3"
                            required
                            aria-invalid={isNaN(parseFloat(newItem.menu_price)) || parseFloat(newItem.menu_price) <= 0}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="category" className="text-right">
                            Category*
                          </Label>
                          <Select
                            value={newItem.menu_category}
                            onValueChange={(value) => setNewItem({ ...newItem, menu_category: value, new_category: "" })}
                          >
                            <SelectTrigger id="category" className="col-span-3">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                              <SelectItem value="new">+ Add New Category</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newItem.menu_category === "new" && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="newCategory" className="text-right">
                              New Category*
                            </Label>
                            <Input
                              id="newCategory"
                              className="col-span-3"
                              value={newItem.new_category}
                              onChange={(e) => setNewItem({ ...newItem, new_category: e.target.value })}
                              required
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="stock" className="text-right">
                            Stock*
                          </Label>
                          <Input
                            id="stock"
                            type="number"
                            min="0"
                            value={newItem.stock.toString()}
                            onChange={(e) => handleStockChange(e.target.value, false)}
                            className="col-span-3"
                            required
                            aria-invalid={isNaN(parseInt(newItem.stock.toString(), 10)) || parseInt(newItem.stock.toString(), 10) < 0}
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="image" className="text-right">
                            Image
                          </Label>
                          <div className="col-span-3 flex gap-2 items-center">
                            <Input
                              id="image"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={isUploading}
                            />
                            {isUploading && <Loader className="animate-spin h-4 w-4" />}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="available" className="text-right">
                            Available
                          </Label>
                          <div className="flex items-center space-x-2 col-span-3">
                            <Switch
                              id="available"
                              checked={newItem.available}
                              onCheckedChange={(checked) => setNewItem({ ...newItem, available: checked })}
                            />
                            <Label htmlFor="available">Item is available for purchase</Label>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="featured" className="text-right">
                            Featured
                          </Label>
                          <div className="flex items-center space-x-2 col-span-3">
                            <Switch
                              id="featured"
                              checked={newItem.featured}
                              onCheckedChange={(checked) => setNewItem({ ...newItem, featured: checked })}
                            />
                            <Label htmlFor="featured">Show as featured item</Label>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" form="add-item-form" disabled={isSubmitting}>
                          {isSubmitting ? <Loader className="animate-spin h-4 w-4" /> : "Save Item"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Loading menu items...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500">No menu items found. Add some items to get started!</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="rounded-lg border border-amber-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={
                          item.menu_image
                            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${item.menu_image}`
                            : "/images/placeholder-food.png"
                        }
                        alt={item.menu_name}
                        fill
                        className="object-cover"
                        unoptimized={true}
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-2">
                        {item.featured && <Badge className="bg-amber-600 hover:bg-amber-700">Featured</Badge>}
                        {!item.available && <Badge className="bg-gray-900 hover:bg-gray-800">Out of Stock</Badge>}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800">{item.menu_name}</h3>
                        <p className="text-lg font-bold text-amber-600">₱{item.menu_price.toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{item.menu_category}</p>
                      <p className="text-sm mt-2 text-gray-600 line-clamp-2">{item.menu_description}</p>
                      <div className="mt-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="w-full bg-amber-600 hover:bg-amber-700">
                              Manage Item
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedItem(item)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedItem(item)
                                setIsViewDialogOpen(true)
                              }}
                            >
                              <Coffee className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-10 px-4 text-left align-middle font-medium">Image</th>
                      <th className="h-10 px-4 text-left align-middle font-medium">Name</th>
                      <th className="h-10 px-4 text-left align-middle font-medium">Category</th>
                      <th className="h-10 px-4 text-left align-middle font-medium">Price</th>
                      <th className="h-10 px-4 text-left align-middle font-medium">Stock</th>
                      <th className="h-10 px-4 text-left align-middle font-medium">Status</th>
                      <th className="h-10 px-4 text-left align-middle font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <motion.tr key={item.id} variants={itemVariants} className="border-b">
                        <td className="p-4">
                          <div className="relative h-10 w-10 overflow-hidden rounded-md">
                            <Image
                              src={
                                item.menu_image
                                  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${item.menu_image}`
                                  : "/images/placeholder-food.png"
                              }
                              alt={item.menu_name}
                              width={200}
                              height={200}
                              className="object-cover"
                              unoptimized={true}
                            />
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div>
                            <p className="font-medium">{item.menu_name}</p>
                            <p className="text-sm text-gray-500 line-clamp-1">{item.menu_description}</p>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{item.menu_category}</td>
                        <td className="p-4 align-middle font-medium">₱{item.menu_price.toFixed(2)}</td>
                        <td className="p-4 align-middle">{item.stock}</td>
                        <td className="p-4 align-middle">
                          <Badge variant={item.available ? "outline" : "destructive"}>
                            {item.available ? "Available" : "Out of Stock"}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedItem(item)
                                  setIsEditDialogOpen(true)
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Item
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedItem(item)
                                  setIsViewDialogOpen(true)
                                }}
                              >
                                <Coffee className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Item
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredItems.length} of {foodItems.length} items
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={filteredItems.length === foodItems.length}>
                Next
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the details of the selected menu item.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <form id="edit-item-form" onSubmit={handleEditItem}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Name*
                  </Label>
                  <Input
                    id="edit-name"
                    className="col-span-3"
                    value={selectedItem.menu_name}
                    onChange={(e) =>
                      setSelectedItem({ ...selectedItem, menu_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="edit-description"
                    className="col-span-3"
                    value={selectedItem.menu_description}
                    onChange={(e) =>
                      setSelectedItem({ ...selectedItem, menu_description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-price" className="text-right">
                    Price*
                  </Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={selectedItem.menu_price.toString()}
                    onChange={(e) => handlePriceChange(e.target.value, true)}
                    className="col-span-3"
                    required
                    aria-invalid={isNaN(selectedItem.menu_price) || selectedItem.menu_price <= 0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-category" className="text-right">
                    Category*
                  </Label>
                  <Select
                    value={selectedItem.menu_category}
                    onValueChange={(value) =>
                      setSelectedItem({ ...selectedItem, menu_category: value })
                    }
                  >
                    <SelectTrigger id="edit-category" className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      <SelectItem value="new">+ Add New Category</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedItem.menu_category === "new" && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-newCategory" className="text-right">
                      New Category*
                    </Label>
                    <Input
                      id="edit-newCategory"
                      className="col-span-3"
                      value={(document.getElementById("edit-newCategory") as HTMLInputElement)?.value || ""}
                      onChange={(e) =>
                        setSelectedItem({ ...selectedItem, menu_category: e.target.value })
                      }
                      required
                    />
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-stock" className="text-right">
                    Stock*
                  </Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={selectedItem.stock.toString()}
                    onChange={(e) => handleStockChange(e.target.value, true)}
                    className="col-span-3"
                    required
                    aria-invalid={isNaN(selectedItem.stock) || selectedItem.stock < 0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-image" className="text-right">
                    Image
                  </Label>
                  <div className="col-span-3 flex gap-2 items-center">
                    <Input
                      id="edit-image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    {isUploading && <Loader className="animate-spin h-4 w-4" />}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-available" className="text-right">
                    Available
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="edit-available"
                      checked={selectedItem.available}
                      onCheckedChange={(checked) =>
                        setSelectedItem({ ...selectedItem, available: checked })
                      }
                    />
                    <Label htmlFor="edit-available">Item is available for purchase</Label>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-featured" className="text-right">
                    Featured
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="edit-featured"
                      checked={selectedItem.featured}
                      onCheckedChange={(checked) =>
                        setSelectedItem({ ...selectedItem, featured: checked })
                      }
                    />
                    <Label htmlFor="edit-featured">Show as featured item</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" form="edit-item-form" disabled={isSubmitting}>
                  {isSubmitting ? <Loader className="animate-spin h-4 w-4" /> : "Update Item"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>
            <DialogDescription>View the details of the selected menu item.</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="relative h-48 w-full">
                <Image
                  src={
                    selectedItem.menu_image
                      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${selectedItem.menu_image}`
                      : "/images/placeholder-food.png"
                  }
                  alt={selectedItem.menu_name}
                  fill
                  className="object-cover rounded-md"
                  unoptimized={true}
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{selectedItem.menu_name}</h3>
                <p className="text-sm text-gray-500">{selectedItem.menu_category}</p>
                <p className="text-sm mt-2">{selectedItem.menu_description}</p>
                <p className="text-lg font-bold text-amber-600 mt-2">₱{selectedItem.menu_price.toFixed(2)}</p>
                <p className="text-sm mt-2">Stock: {selectedItem.stock}</p>
                <p className="text-sm">
                  Status: {selectedItem.available ? "Available" : "Out of Stock"}
                </p>
                <p className="text-sm">
                  Featured: {selectedItem.featured ? "Yes" : "No"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}