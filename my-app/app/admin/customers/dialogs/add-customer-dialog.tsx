"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { useUserActions } from "@/hooks/useUserActions";
import { useToast } from "@/hooks/use-toast";
import { formatCanadianPhoneNumber } from "@/lib/utils";
import { DeliveryAddressForm } from "@/components/DeliveryAddressForm";
import type { DeliveryAddressDetails } from "@/lib/types";

interface AddCustomerDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialPhoneNumber?: string;
  defaultNameFromPhone?: boolean;
  onCustomerCreated?: (customer: any) => void;
}

interface FormData {
  name: string;
  email: string;
  allergyInfo: string;
  notes: string;
}

export function AddCustomerDialog({
  open,
  setOpen,
  initialPhoneNumber = "",
  defaultNameFromPhone = false,
  onCustomerCreated,
}: AddCustomerDialogProps) {
  const { toast } = useToast();
  const { createNewUser } = useUserActions();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    allergyInfo: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryAddressDetails, setDeliveryAddressDetails] =
    useState<DeliveryAddressDetails | null>(null);

  const {
    phoneNumber,
    // verificationCode,
    // isLoading: isVerifying,
    // otpSent,
    // setVerificationCode,
    // sendOTP,
    // verifyOTP,
    formatPhoneNumber,
  } = usePhoneVerification();

  // Pre-fill phone number when dialog opens
  useEffect(() => {
    if (open && initialPhoneNumber) {
      formatPhoneNumber(initialPhoneNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPhoneNumber]);

  useEffect(() => {
    if (!open || !defaultNameFromPhone) return;

    const digitsOnly = initialPhoneNumber.replace(/\D/g, "");
    const normalizedPhone =
      digitsOnly.length === 11 && digitsOnly.startsWith("1")
        ? digitsOnly.slice(1)
        : digitsOnly;

    if (normalizedPhone.length === 10) {
      setFormData((prev) => ({
        ...prev,
        name: `Phone number ${normalizedPhone.slice(-4)}`,
      }));
    }
  }, [open, defaultNameFromPhone, initialPhoneNumber]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter the customer's name",
        variant: "destructive",
      });
      return;
    }
    if (phoneNumber.length !== 10) {
      toast({
        title: "Phone number required",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createNewUser.mutateAsync({
        name: formData.name,
        phoneNumber,
        email: formData.email,
        deliveryAddressDetails,
        allergyInfo: formData.allergyInfo,
        notes: formData.notes,
        is_verified: false,
      });
      if (onCustomerCreated && result?.user) {
        onCustomerCreated(result.user);
      }
      setOpen(false);
      // Reset form
      setFormData({
        name: "",
        email: "",
        allergyInfo: "",
        notes: "",
      });
      setDeliveryAddressDetails(null);
      formatPhoneNumber("");
    } catch (error) {
      // Error toast is handled by mutation onError
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:max-w-xl sm:p-6 [&>button]:min-h-12 [&>button]:min-w-12">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-semibold">
              Add New Customer
            </DialogTitle>
            <DialogDescription>
              Enter customer contact, address, and order preference details.
            </DialogDescription>
          </DialogHeader>

          {/* reCAPTCHA container for phone verification */}
          <div id="recaptcha-container"></div>

          <div className="grid gap-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your 10-digit number"
                  value={formatCanadianPhoneNumber(phoneNumber)}
                  onChange={(e) => formatPhoneNumber(e.target.value)}
                  maxLength={14}
                />
                {/* <div className="flex items-center justify-between">
                  {!otpSent && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={sendOTP}
                      disabled={!phoneNumber || isVerifying}
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Code"
                      )}
                    </Button>
                  )}
                </div> */}
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
                maxLength={100}
                rows={2}
                placeholder="Enter allergy information..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Admin Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                maxLength={100}
                placeholder="Enter admin-only notes..."
                rows={2}
              />
            </div>
          </div>

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
              disabled={isSubmitting}
              className="min-h-12"
            >
              {isSubmitting ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
