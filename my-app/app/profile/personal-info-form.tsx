"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { DeliveryAddressForm } from "@/components/DeliveryAddressForm"
import { deliveryAddressSchema } from "@/lib/schemas"
import { Checkbox } from "@/components/ui/checkbox"

const personalInfoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().optional(),
  allergyInfo: z.string().optional(),
  deliveryAddressDetails: deliveryAddressSchema.nullable(),
  smsAgreement: z.boolean(),
})

interface PersonalInfoFormProps {
  userData: any
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>
  onSuccess?: () => void
  onCancel?: () => void
}

export function PersonalInfoForm({ userData, onSubmit, onSuccess, onCancel }: PersonalInfoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      name: userData.name || "",
      email: userData.email || "",
      allergyInfo: userData.allergyInfo || "",
      deliveryAddressDetails: userData.deliveryAddressDetails || null,
      smsAgreement: userData.smsAgreement ?? true,
    },
  })

  const handleSubmit = async (data: z.infer<typeof personalInfoSchema>) => {
    if (!form.formState.isDirty) return

    setIsSubmitting(true)

    try {
      const result = await onSubmit(data)

      if (result.success) {
        toast({
          title: "Personal information updated",
          description: "Your personal information has been updated successfully.",
        })

        if (onSuccess) {
          onSuccess()
        }
      } else {
        toast({
          title: "Update failed",
          description: result.error || "Failed to update personal information.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="allergyInfo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allergy Info</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your allergy info" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="deliveryAddressDetails"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <DeliveryAddressForm
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="smsAgreement"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Text message notifications</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Receive SMS updates about order confirmations, status
                  changes, and cancellations.
                </p>
              </div>
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !form.formState.isDirty}
          >
            {isSubmitting ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
