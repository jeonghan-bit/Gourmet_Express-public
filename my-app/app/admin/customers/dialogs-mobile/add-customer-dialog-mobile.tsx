"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"

interface AddCustomerDialogMobileProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSave: (customer: any) => void
  availableTags: string[]
}

interface FormData {
  name: string
  phoneNumber: string
  email: string
  street1: string
  street2: string
  city: string
  postalCode: string
  allergyInfo: string
  memo: string
  tags: string[]
  _newTag?: string
}

export function AddCustomerDialogMobile({
  open,
  setOpen,
  onSave,
  availableTags,
}: AddCustomerDialogMobileProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phoneNumber: "",
    email: "",
    street1: "",
    street2: "",
    city: "",
    postalCode: "",
    allergyInfo: "",
    memo: "",
    tags: [],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { _newTag, ...formDataToSend } = formData
      const newCustomer = {
        phoneNumber: formDataToSend.phoneNumber,
        email: formDataToSend.email,
        user: { id: Math.floor(Math.random() * 1000), name: formDataToSend.name },
        street1: formDataToSend.street1,
        street2: formDataToSend.street2,
        city: formDataToSend.city,
        postalCode: formDataToSend.postalCode,
        allergyInfo: formDataToSend.allergyInfo,
        memo: formDataToSend.memo,
        tags: formDataToSend.tags,
      }

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to add customer")
      }

      onSave(data)
      setOpen(false)

      toast({
        title: "Customer added",
        description: "New customer has been added successfully.",
      })

      setFormData({
        name: "",
        phoneNumber: "",
        email: "",
        street1: "",
        street2: "",
        city: "",
        postalCode: "",
        allergyInfo: "",
        memo: "",
        tags: [],
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add customer",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95%] sm:max-w-[95%] p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Add New Customer</DialogTitle>
            <DialogDescription className="text-sm">
              Fill in customer info below.
            </DialogDescription>
          </DialogHeader>

          {[
            { label: "Full Name", name: "name" },
            { label: "Phone Number", name: "phoneNumber" },
            { label: "Email", name: "email", type: "email" },
            { label: "Address Line 1", name: "street1" },
            { label: "Address Line 2", name: "street2" },
            { label: "City", name: "city" },
            { label: "Postal Code", name: "postalCode" },
            { label: "Allergy Info", name: "allergyInfo" },
          ].map(({ label, name, type }) => (
            <div key={name} className="space-y-1">
              <Label htmlFor={name}>{label}</Label>
              <Input
                id={name}
                name={name}
                value={(formData as any)[name]}
                onChange={handleChange}
                type={type || "text"}
              />
            </div>
          ))}

          <div className="space-y-1">
            <Label htmlFor="memo">Admin Memo</Label>
            <Textarea id="memo" name="memo" value={formData.memo} onChange={handleChange} rows={3} />
          </div>

          {/* Tags Section */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span key={index} className="px-2 py-1 text-sm bg-gray-100 rounded-full">
                  {tag}
                  <button
                    type="button"
                    className="ml-1 text-gray-500"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        tags: prev.tags.filter((t) => t !== tag),
                      }))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-1">
              {availableTags.map((tag, index) => (
                <label key={index} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.tags.includes(tag)}
                    onChange={() => {
                      setFormData((prev) => ({
                        ...prev,
                        tags: prev.tags.includes(tag)
                          ? prev.tags.filter((t) => t !== tag)
                          : [...prev.tags, tag],
                      }))
                    }}
                  />
                  <span className="text-sm">{tag}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <Input
                value={formData._newTag || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, _newTag: e.target.value }))
                }
                placeholder="New tag"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const tag = formData._newTag?.trim()
                  if (tag && !formData.tags.includes(tag)) {
                    setFormData((prev) => ({
                      ...prev,
                      tags: [...prev.tags, tag],
                      _newTag: "",
                    }))
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="w-full"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
