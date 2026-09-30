"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCustomerDetails, useUserActions } from "@/hooks/useUserActions"
import { useToast } from "@/hooks/use-toast"
import { formatCanadianPhoneNumber } from "@/lib/utils"
import { DeliveryAddressForm } from "@/components/DeliveryAddressForm"
import type { DeliveryAddressDetails } from "@/lib/types"

interface EditCustomerDialogProps {
  open: boolean
  setOpen: (open: boolean) => void
  customer: any
}

interface FormData {
  name: string
  email: string
  allergyInfo: string
  notes: string
}

export function EditCustomerDialog({ open, setOpen, customer }: EditCustomerDialogProps) {
  const { toast } = useToast()
  const { updateUserInfo } = useUserActions()
  const { data: customerDetails, isLoading: isLoadingDetails } =
    useCustomerDetails(customer?.id, open)
  const activeCustomer = customerDetails ?? customer
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    allergyInfo: "",
    notes: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deliveryAddressDetails, setDeliveryAddressDetails] = useState<DeliveryAddressDetails | null>(null)

  useEffect(() => {
    if (open && activeCustomer) {
      setFormData({
        name: activeCustomer.name || "",
        email: activeCustomer.email || "",
        allergyInfo: activeCustomer.allergyInfo || "",
        notes: activeCustomer.notes || "",
      })
      setDeliveryAddressDetails(activeCustomer.deliveryAddressDetails || null)
    }
  }, [open, activeCustomer])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev: FormData) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customer?.id) {
      toast({
        title: "Error",
        description: "Customer ID not found",
        variant: "destructive",
      })
      return
    }

    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter the customer's name",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Update user info using the hook
      await updateUserInfo.mutateAsync({
        id: customer.id,
        name: formData.name,
        email: formData.email || "",
        deliveryAddressDetails,
        allergyInfo: formData.allergyInfo || "",
        notes: formData.notes || "",
      })

      setOpen(false)

      toast({
        title: "Customer updated",
        description: "Customer information has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating customer:", error)
      toast({
        title: "Error",
        description: "Failed to update customer information",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-xl sm:p-6 [&>button]:min-h-12 [&>button]:min-w-12">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold">
              Edit Customer
            </DialogTitle>
            <DialogDescription>
              Update customer contact, address, and order preference details.
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={isLoadingDetails} className="grid gap-4 py-4">
            {isLoadingDetails && (
              <div className="text-sm text-muted-foreground">
                Loading customer details...
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input 
                  id="phoneNumber" 
                  value={formatCanadianPhoneNumber(activeCustomer?.phoneNumber)}
                  disabled 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>

            <DeliveryAddressForm
              value={deliveryAddressDetails}
              onChange={setDeliveryAddressDetails}
            />

            <div className="grid gap-2">
              <Label htmlFor="allergyInfo">Allergy Info</Label>
              <Textarea
                id="allergyInfo"
                name="allergyInfo"
                value={formData.allergyInfo}
                onChange={handleChange}
                placeholder="Enter allergy information..."
                maxLength={100}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter admin-only notes..."
                maxLength={100}
                rows={2}
              />
            </div>
          </fieldset>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="min-h-12"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoadingDetails}
              className="min-h-12"
            >
              {isSubmitting ? "Saving..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
