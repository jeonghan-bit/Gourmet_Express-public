"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Search, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Mock store data - replace with your actual store data
const stores = [
  {
    id: "1",
    name: "Downtown Gourmet",
    address: "123 Main St, Downtown",
    distance: "0.8 miles away",
    isOpen: true,
    hours: "9:00 AM - 10:00 PM",
    image: "/placeholder.svg?height=120&width=120",
  },
  {
    id: "2",
    name: "Westside Kitchen",
    address: "456 West Ave, Westside",
    distance: "1.2 miles away",
    isOpen: true,
    hours: "10:00 AM - 9:00 PM",
    image: "/placeholder.svg?height=120&width=120",
  }
]

export default function StoreSelectionPage() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  // Check if a store is already selected in localStorage
  useEffect(() => {
    const savedStore = localStorage.getItem("selectedStore")
    if (savedStore) {
      const parsedStore = JSON.parse(savedStore)
      setSelectedStore(parsedStore.id)
    }
  }, [])

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleContinue = () => {
    if (selectedStore) {
      const store = stores.find((s) => s.id === selectedStore)
      if (store) {
        localStorage.setItem("selectedStore", JSON.stringify(store))
        router.push("/order") // Redirect to menu page or wherever appropriate
      }
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Select a Gourmet Express Location</h1>
        <p className="text-muted-foreground">Choose a store to browse menu and place your order</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by store name, address, or zip code..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="mb-6">
        <RadioGroup value={selectedStore || ""} onValueChange={setSelectedStore}>
          <div className="grid gap-4">
            {filteredStores.length > 0 ? (
              filteredStores.map((store) => (
                <Card
                  key={store.id}
                  className={`cursor-pointer transition-all ${
                    selectedStore === store.id ? "border-primary ring-1 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedStore(store.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start">
                      <RadioGroupItem value={store.id} id={`store-${store.id}`} className="mt-1" />
                      <div className="ml-3 flex-1">
                        <div className="flex justify-between">
                          <div>
                            <Label htmlFor={`store-${store.id}`} className="text-lg font-medium cursor-pointer">
                              {store.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">{store.address}</p>
                            <p className="text-sm text-muted-foreground mt-1">{store.distance}</p>
                          </div>
                          <div className={`text-sm font-medium ${store.isOpen ? "text-green-600" : "text-red-600"}`}>
                            {store.isOpen ? "Open" : "Closed"}
                            <p className="text-xs text-muted-foreground">{store.hours}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No stores found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your search or zoom out to see more options
                </p>
              </div>
            )}
          </div>
        </RadioGroup>
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={handleContinue} disabled={!selectedStore} className="px-8">
          Continue to Menu
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
