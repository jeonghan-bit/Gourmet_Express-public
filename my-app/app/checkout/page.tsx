"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useStoreStatus } from "@/hooks/useStoreHours";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { DateTime } from "luxon";
import { useOrderActions } from "@/hooks/useOrderActions";
import { usePersonalInfo } from "@/hooks/useUserActions";
import LoadingAnimation from "@/components/LoadingAnimation";
import {
  formatCanadianPhoneNumber,
  normalizeProductDisplayName,
} from "@/lib/utils";
import { DeliveryAddressForm } from "@/components/DeliveryAddressForm";
import type { DeliveryAddressDetails } from "@/lib/types";
import { deliveryAddressSchema } from "@/lib/schemas";
import { consumeCheckoutReorderPrefill } from "@/lib/checkoutStorage";
import { STORE_CONFIG } from "@/lib/storeConfig";
import { getStorefrontNotice } from "@/lib/storefrontState";

interface CheckoutFormData {
  name: string;
  phone: string;
  orderType: "delivery" | "pickup" | "";

  pickupTime: "asap" | "scheduled";
  scheduledTime?: string;
  scheduledOption?: "oneHour" | "thirtyMinutes" | "custom" | "";
  customScheduledHour?: string;
  customScheduledMinute?: string;

  allergyInfo?: string;
  additionalNote?: string;
  deliveryAddressDetails: DeliveryAddressDetails | null;
}

type FulfillmentType = "delivery" | "pickup";

const HST_RATE = 0.13;
const DELIVERY_MINIMUM_SUBTOTAL = 30;
const STORE_TIME_ZONE = STORE_CONFIG.timeZone;
const DELIVERY_SCHEDULE_LEAD_MINUTES = 60;
const PICKUP_SCHEDULE_LEAD_MINUTES = 30;
const SCHEDULE_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0")
);
const SCHEDULE_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0")
);
const SCHEDULE_UNAVAILABLE_MESSAGE =
  "Sorry, scheduled order is not currently availalbe.";
const CUSTOM_TIME_UNAVAILABLE_MESSAGE =
  "Selected time is unavailable. Please choose different time slot.";

const getProductNameParts = (productName: string) => {
  const displayName = normalizeProductDisplayName(productName);
  const match = displayName.match(/^([A-Za-z]*\d+[A-Za-z]*[.)])\s*(.+)$/);

  return match
    ? { productCode: match[1], productName: match[2] }
    : { productCode: "", productName: displayName };
};

const getCurrentStoreTime = () => DateTime.now().setZone(STORE_TIME_ZONE);

const getLeadTimeDateTime = (leadMinutes: number) =>
  getCurrentStoreTime().plus({ minutes: leadMinutes });

const getScheduleLeadMinutes = (orderType: FulfillmentType) =>
  orderType === "delivery"
    ? DELIVERY_SCHEDULE_LEAD_MINUTES
    : PICKUP_SCHEDULE_LEAD_MINUTES;

const getEarliestScheduledTime = (orderType: FulfillmentType) =>
  getLeadTimeDateTime(getScheduleLeadMinutes(orderType));

const isScheduledTimeWithinTodayHours = (
  scheduledTime: DateTime,
  todayHours?: { open: string; close: string } | null
) => {
  if (!scheduledTime.isValid || !todayHours) {
    return false;
  }

  const scheduledStoreTime = scheduledTime.setZone(STORE_TIME_ZONE);
  const [openHour, openMinute] = todayHours.open.split(":").map(Number);
  const [closeHour, closeMinute] = todayHours.close.split(":").map(Number);

  const openDateTime = scheduledStoreTime.set({
    hour: openHour,
    minute: openMinute,
    second: 0,
    millisecond: 0,
  });
  const closeDateTime = scheduledStoreTime.set({
    hour: closeHour,
    minute: closeMinute,
    second: 0,
    millisecond: 0,
  });

  return scheduledStoreTime >= openDateTime && scheduledStoreTime < closeDateTime;
};

const isQuickScheduledOrderAvailable = (
  orderType: FulfillmentType,
  todayHours?: { open: string; close: string } | null
) => isScheduledTimeWithinTodayHours(getEarliestScheduledTime(orderType), todayHours);

const isCustomScheduledOrderAvailable = (
  orderType: FulfillmentType,
  scheduledTime: DateTime | null,
  todayHours?: { open: string; close: string } | null
) => {
  if (!scheduledTime?.isValid) {
    return false;
  }

  return (
    isQuickScheduledOrderAvailable(orderType, todayHours) &&
    scheduledTime >= getEarliestScheduledTime(orderType) &&
    isScheduledTimeWithinTodayHours(scheduledTime, todayHours)
  );
};

export default function CheckoutPage() {
  const {
    isOpen,
    todayHours,
    isClosed,
    closureMessage,
    isLoading: isStoreStatusLoading,
  } = useStoreStatus();
  const { isMaintenanceMode, isLoading: isLoadingMaintenance } = useMaintenanceMode();
  const { data: session, status: sessionStatus } = useSession();
  const isSessionLoading = sessionStatus === "loading";
  const isAdmin = session?.user?.role === "admin";
  const storefrontNotice = !isSessionLoading
    ? getStorefrontNotice(isClosed, closureMessage, isMaintenanceMode)
    : null;
  const storefrontNoticeType = storefrontNotice?.type;
  const { data: personalInfo } = usePersonalInfo();
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [formData, setFormData] = useState<CheckoutFormData>({
    name: "",
    phone: "",
    orderType: "",
    pickupTime: "asap",
    scheduledTime: "",
    scheduledOption: "",
    customScheduledHour: "",
    customScheduledMinute: "",
    allergyInfo: "",
    additionalNote: "",
    deliveryAddressDetails: null,
  });
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderTypeError, setOrderTypeError] = useState(false);
  const [storefrontNoticeOpen, setStorefrontNoticeOpen] = useState(false);
  const router = useRouter();
  const { cart, clearCart, getCartTotal, isInitialized } = useCart();
  const { submitOrder } = useOrderActions();

  useEffect(() => {
    if (storefrontNoticeType) {
      setStorefrontNoticeOpen(true);
    }
  }, [storefrontNoticeType, closureMessage]);

  useEffect(() => {
    const reorderPrefill = consumeCheckoutReorderPrefill();
    if (!reorderPrefill) return;

    setFormData((previous) => ({
      ...previous,
      additionalNote: reorderPrefill.additionalNote,
    }));
  }, []);

  const getCustomScheduledDateTime = (data: CheckoutFormData) => {
    if (
      !data.customScheduledHour ||
      !data.customScheduledMinute
    ) {
      return null;
    }

    const hourValue = Number(data.customScheduledHour);
    const minuteValue = Number(data.customScheduledMinute);

    if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
      return null;
    }

    return getCurrentStoreTime().set({
      hour: hourValue,
      minute: minuteValue,
      second: 0,
      millisecond: 0,
    });
  };

  // Auto-fill customer info when personalInfo is loaded
  useEffect(() => {
    if (personalInfo) {
      setFormData((prev) => ({
        ...prev,
        name: personalInfo.name || "",
        phone: personalInfo.phoneNumber || "",
        allergyInfo: personalInfo.allergyInfo || "",
        deliveryAddressDetails: personalInfo.deliveryAddressDetails || null,
      }));
    }
  }, [personalInfo]);

  useEffect(() => {
    if (orderSubmitted) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      const timer = setTimeout(() => {
        router.push("/orders-history");
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [orderSubmitted, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOrderTypeChange = (
    value: "delivery" | "pickup"
  ) => {
    setFormData((prev) => ({
      ...prev,
      orderType: value,
      pickupTime: "asap",
      scheduledTime: "",
      scheduledOption: "",
      customScheduledHour: "",
      customScheduledMinute: "",
    }));
    setOrderTypeError(false); // Clear error when user selects an option
  };

  const handlePickupTimeChange = (value: "asap" | "scheduled") => {
    setFormData((prev) => ({
      ...prev,
      pickupTime: value,
      scheduledTime: value === "scheduled" ? prev.scheduledTime : "",
      scheduledOption: value === "scheduled" ? prev.scheduledOption : "",
      customScheduledHour: value === "scheduled" ? prev.customScheduledHour : "",
      customScheduledMinute:
        value === "scheduled" ? prev.customScheduledMinute : "",
    }));
  };

  const handleScheduledOptionChange = (
    value: "oneHour" | "thirtyMinutes" | "custom"
  ) => {
    setFormData((prev) => {
      if (value === "oneHour" && prev.orderType === "delivery") {
        return {
          ...prev,
          scheduledOption: value,
          scheduledTime:
            getLeadTimeDateTime(DELIVERY_SCHEDULE_LEAD_MINUTES).toISO() ??
            undefined,
        };
      }

      if (value === "thirtyMinutes" && prev.orderType === "pickup") {
        return {
          ...prev,
          scheduledOption: value,
          scheduledTime:
            getLeadTimeDateTime(PICKUP_SCHEDULE_LEAD_MINUTES).toISO() ??
            undefined,
        };
      }

      return {
        ...prev,
        scheduledOption: value,
        scheduledTime:
          prev.customScheduledHour &&
          prev.customScheduledMinute
            ? getCustomScheduledDateTime(prev)?.toISO() ?? undefined
            : "",
      };
    });
  };

  const handleCustomScheduledTimeChange = (
    field: "customScheduledHour" | "customScheduledMinute",
    value: string
  ) => {
    setFormData((prev) => {
      const nextData = {
        ...prev,
        [field]: value,
      } as CheckoutFormData;

      return {
        ...nextData,
        scheduledTime:
          nextData.scheduledOption === "custom"
            ? getCustomScheduledDateTime(nextData)?.toISO() ?? ""
            : nextData.scheduledTime,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let scheduledOrderTime = "";

    // Validate order type is selected
    if (!formData.orderType) {
      setOrderTypeError(true);
      setOrderError("Please select either Delivery or Pick-up.");
      return;
    }

    if (formData.orderType === "delivery") {
      const addressValidation = deliveryAddressSchema.safeParse(
        formData.deliveryAddressDetails
      );
      if (!addressValidation.success) {
        setOrderError(
          addressValidation.error.issues[0]?.message ||
            "Please select and complete your delivery address."
        );
        return;
      }
    }

    if (
      formData.orderType === "delivery" &&
      cartSubtotal < DELIVERY_MINIMUM_SUBTOTAL
    ) {
      setOrderError(
        `Delivery orders must be at least $${DELIVERY_MINIMUM_SUBTOTAL.toFixed(2)} before tax.`
      );
      return;
    }

    // Store open/closed check
    if (!isOpen) {
      setOrderError(
        isClosed && closureMessage
          ? closureMessage
          : "The store is currently closed. Please place your order during business hours."
      );
      return;
    }

    if (isMaintenanceMode && !isAdmin) {
      setOrderError("Online ordering is currently under maintenance.");
      return;
    }

    // Check if user is active
    if (personalInfo?.status === "inactive") {
      setOrderError(
        "Your account has been deactivated. Please contact support to reactivate your account."
      );
      return;
    }

    // Scheduled time validation
    if (formData.pickupTime === "scheduled") {
      const currentStoreTime = getCurrentStoreTime();
      let selectedDateTime: DateTime | null = null;
      const scheduledOrderType = formData.orderType as FulfillmentType;
      const earliestScheduledTime = getEarliestScheduledTime(scheduledOrderType);
      const isScheduledOrderAvailable = isQuickScheduledOrderAvailable(
        scheduledOrderType,
        todayHours
      );

      if (!isScheduledOrderAvailable) {
        setOrderError(SCHEDULE_UNAVAILABLE_MESSAGE);
        return;
      }

      if (formData.orderType === "delivery") {
        if (!formData.scheduledOption) {
          setOrderError("Please select a delivery scheduling option.");
          return;
        }

        if (formData.scheduledOption === "oneHour") {
          selectedDateTime = formData.scheduledTime
            ? DateTime.fromISO(formData.scheduledTime, {
                zone: STORE_TIME_ZONE,
              })
            : earliestScheduledTime;
        }

        if (formData.scheduledOption === "custom") {
          selectedDateTime = getCustomScheduledDateTime(formData);

          if (!selectedDateTime) {
            setOrderError("Please choose your delivery hour and minute.");
            return;
          }

          if (selectedDateTime < earliestScheduledTime) {
            setOrderError(CUSTOM_TIME_UNAVAILABLE_MESSAGE);
            return;
          }
        }
      } else {
        if (!formData.scheduledOption) {
          setOrderError("Please select a pickup scheduling option.");
          return;
        }

        if (formData.scheduledOption === "thirtyMinutes") {
          selectedDateTime = formData.scheduledTime
            ? DateTime.fromISO(formData.scheduledTime, {
                zone: STORE_TIME_ZONE,
              })
            : earliestScheduledTime;
        }

        if (formData.scheduledOption === "custom") {
          selectedDateTime = getCustomScheduledDateTime(formData);

          if (!selectedDateTime) {
            setOrderError("Please choose your pickup hour and minute.");
            return;
          }

          if (selectedDateTime < earliestScheduledTime) {
            setOrderError(CUSTOM_TIME_UNAVAILABLE_MESSAGE);
            return;
          }
        }
      }

      if (!selectedDateTime || !selectedDateTime.isValid) {
        setOrderError("Please select a valid scheduled time.");
        return;
      }

      scheduledOrderTime = selectedDateTime.toISO() || "";

      const isToday =
        selectedDateTime.toFormat("yyyy-MM-dd") ===
        currentStoreTime.toFormat("yyyy-MM-dd");

      if (isToday && todayHours) {
        const [openHour, openMinute] = todayHours.open.split(":").map(Number);
        const [closeHour, closeMinute] = todayHours.close
          .split(":")
          .map(Number);

        const openDateTime = currentStoreTime.set({
          hour: openHour,
          minute: openMinute,
          second: 0,
          millisecond: 0,
        });
        const closeDateTime = currentStoreTime.set({
          hour: closeHour,
          minute: closeMinute,
          second: 0,
          millisecond: 0,
        });

        if (
          selectedDateTime < openDateTime ||
          selectedDateTime >= closeDateTime
        ) {
          setOrderError(
            formData.scheduledOption === "custom"
              ? CUSTOM_TIME_UNAVAILABLE_MESSAGE
              : SCHEDULE_UNAVAILABLE_MESSAGE
          );
          return;
        }
      }
    }

    const orderData = {
      userId: session?.user?.id,
      name: formData.name,
      phone: formData.phone,
      allergyInfo: formData.allergyInfo,
      additionalNote: formData.additionalNote,
      deliveryAddressDetails: formData.deliveryAddressDetails,
      orderType: formData.orderType,
      pickupTime: formData.pickupTime,
      scheduledTime: scheduledOrderTime || formData.scheduledTime,
      cart,
      total: totalWithTax,
    };
    try {
      const data = await submitOrder.mutateAsync(orderData);
      setOrderNumber(data.orderNumber);
      clearCart();
      setOrderSubmitted(true);
    } catch (error: any) {
      console.error("🔥 Network or server error:", error.message);
    }
  };

  const cartSubtotal = Math.round(getCartTotal() * 100) / 100; // Round subtotal to 2 decimals
  const taxAmount = Math.round(cartSubtotal * HST_RATE * 100) / 100; // Calculate tax on rounded subtotal and round to 2 decimals
  const totalWithTax = cartSubtotal + taxAmount; // Add rounded subtotal + rounded tax (no additional rounding)
  
  const isDeliveryBelowMinimum =
    formData.orderType === "delivery" &&
    cartSubtotal < DELIVERY_MINIMUM_SUBTOTAL;
  const customScheduledDateTime = getCustomScheduledDateTime(formData);
  const earliestDeliveryScheduleTime = getEarliestScheduledTime("delivery");
  const earliestPickupScheduleTime = getEarliestScheduledTime("pickup");
  const isDeliveryQuickTimeAvailable = isQuickScheduledOrderAvailable(
    "delivery",
    todayHours
  );
  const isPickupQuickTimeAvailable = isQuickScheduledOrderAvailable(
    "pickup",
    todayHours
  );
  const isDeliveryCustomTimeAvailable = isCustomScheduledOrderAvailable(
    "delivery",
    customScheduledDateTime,
    todayHours
  );
  const isPickupCustomTimeAvailable = isCustomScheduledOrderAvailable(
    "pickup",
    customScheduledDateTime,
    todayHours
  );
  const deliveryQuickOptionLabel = `${earliestDeliveryScheduleTime.toFormat(
    "h:mm a"
  )} (In 1h)`;
  const pickupQuickOptionLabel = `${earliestPickupScheduleTime.toFormat(
    "h:mm a"
  )} (In 30 min)`;

  // Show loading while checking maintenance mode
  if (isLoadingMaintenance || isStoreStatusLoading || isSessionLoading) {
    return <LoadingAnimation className="h-screen" />;
  }

  if (orderSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-6">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h1 className="text-3xl font-bold text-center mb-2">
                Order Submitted
              </h1>
              <h2 className="text-2xl font-bold text-center mb-2">
                Order#: {orderNumber}
              </h2>
              <p className="text-center text-gray-600">
                Your order has been submitted. Thank you for your order,{" "}
                {formData.name}!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center">
      <Dialog
        open={Boolean(storefrontNotice) && storefrontNoticeOpen}
        onOpenChange={setStorefrontNoticeOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div
              className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                storefrontNotice?.type === "closure"
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>
              {storefrontNotice?.type === "closure"
                ? "Store temporarily closed"
                : "Online ordering is under maintenance"}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">
              {storefrontNotice?.type === "closure"
                ? storefrontNotice.message
                : "New online orders are temporarily unavailable. Please call us to place an order."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-0 py-4 sm:px-4 sm:py-8">
        <Card className="rounded-none border-x-0 sm:rounded-lg sm:border-x">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <form onSubmit={handleSubmit}>
              <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <section
                  className="space-y-5 rounded-lg border-[1.5px] border-gray-300 bg-card p-4 shadow-sm sm:p-6"
                  aria-labelledby="customer-information-heading"
                >
                  <div className="border-b pb-3">
                    <h2
                      id="customer-information-heading"
                      className="text-lg font-semibold"
                    >
                      Customer Information
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Confirm your contact details and choose how to receive your order.
                    </p>
                  </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formatCanadianPhoneNumber(formData.phone)}
                  readOnly
                  disabled
                  placeholder="(xxx)-xxx-xxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allergyInfo">
                  Allergy Information (Optional)
                </Label>
                <Input
                  id="allergyInfo"
                  name="allergyInfo"
                  value={formData.allergyInfo}
                  onChange={handleInputChange}
                  placeholder="Please list any food allergies or dietary restrictions"
                />
              </div>
              <div className="space-y-2">
                <Label
                  className={
                    orderTypeError
                      ? "font-semibold text-red-700"
                      : "font-semibold"
                  }
                >
                  Order Type
                  {orderTypeError && <span className="text-red-600"> *</span>}
                </Label>
                <RadioGroup
                  value={formData.orderType}
                  onValueChange={handleOrderTypeChange}
                  className={`grid grid-cols-2 gap-1 rounded-full bg-muted p-1 transition-shadow ${
                    orderTypeError
                      ? "ring-2 ring-red-500 ring-offset-2"
                      : ""
                  }`}
                >
                  <div className="relative">
                    <RadioGroupItem
                      value="delivery"
                      id="delivery"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="delivery"
                      className="flex h-10 w-full cursor-pointer items-center justify-center rounded-full font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                    >
                      Delivery
                    </Label>
                  </div>
                  <div className="relative">
                    <RadioGroupItem
                      value="pickup"
                      id="pickup"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="pickup"
                      className="flex h-10 w-full cursor-pointer items-center justify-center rounded-full font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                    >
                      Pick-up
                    </Label>
                  </div>
                </RadioGroup>
                {orderTypeError && (
                  <p className="mt-1 text-sm font-medium text-red-600">
                    Please select Delivery or Pick-up to continue
                  </p>
                )}
              </div>
              {formData.orderType === "delivery" && (
                <div className="space-y-4">
                  <DeliveryAddressForm
                    value={formData.deliveryAddressDetails}
                    onChange={(deliveryAddressDetails) =>
                      setFormData((previous) => ({
                        ...previous,
                        deliveryAddressDetails,
                      }))
                    }
                    required
                  />
                  <div className="space-y-2">
                    <Label className="font-semibold">Delivery Time</Label>
                    <RadioGroup
                      value={formData.pickupTime}
                      className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                      onValueChange={(value) =>
                        handlePickupTimeChange(value as "asap" | "scheduled")
                      }
                    >
                      <div className="relative">
                        <RadioGroupItem
                          value="asap"
                          id="delivery-asap"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="delivery-asap"
                          className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                        >
                          Now (40-45min)
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem
                          value="scheduled"
                          id="delivery-scheduled"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="delivery-scheduled"
                          className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                        >
                          Schedule delivery
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {formData.orderType === "pickup" && (
                <div className="space-y-2">
                  <Label className="font-semibold">Pickup Time</Label>
                  <RadioGroup
                    value={formData.pickupTime}
                    className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                    onValueChange={(value) =>
                      handlePickupTimeChange(value as "asap" | "scheduled")
                    }
                  >
                    <div className="relative">
                      <RadioGroupItem
                        value="asap"
                        id="pickup-asap"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="pickup-asap"
                        className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                      >
                        Now (10-20min)
                      </Label>
                    </div>
                    <div className="relative">
                      <RadioGroupItem
                        value="scheduled"
                        id="pickup-scheduled"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="pickup-scheduled"
                        className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                      >
                        Schedule pickup
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {formData.orderType === "delivery" &&
                formData.pickupTime === "scheduled" && (
                  <div
                    className="space-y-3 border-t pt-5"
                    aria-labelledby="scheduled-delivery-heading"
                  >
                    <h2
                      id="scheduled-delivery-heading"
                      className="text-sm font-semibold leading-none"
                    >
                      Scheduled Delivery
                    </h2>
                    <RadioGroup
                      value={formData.scheduledOption}
                      className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                      onValueChange={(value) =>
                        handleScheduledOptionChange(
                          value as "oneHour" | "custom"
                        )
                      }
                    >
                      <div className="relative">
                        <RadioGroupItem
                          value="oneHour"
                          id="delivery-schedule-one-hour"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="delivery-schedule-one-hour"
                          className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                        >
                          {deliveryQuickOptionLabel}
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem
                          value="custom"
                          id="delivery-schedule-custom"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="delivery-schedule-custom"
                          className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                        >
                          Choose your own time
                        </Label>
                      </div>
                    </RadioGroup>

                    {formData.scheduledOption === "oneHour" &&
                      formData.scheduledTime && (
                        <p
                          className={
                            isDeliveryQuickTimeAvailable
                              ? "text-sm text-muted-foreground"
                              : "text-sm text-red-600"
                          }
                        >
                          {isDeliveryQuickTimeAvailable
                            ? `Delivery scheduled for ${DateTime.fromISO(
                                formData.scheduledTime,
                                {
                                  zone: STORE_TIME_ZONE,
                                }
                              ).toFormat("h:mm a")}`
                            : SCHEDULE_UNAVAILABLE_MESSAGE}
                        </p>
                      )}

                    {formData.scheduledOption === "custom" && (
                      <div className="space-y-3">
                        <p
                          className={
                            isDeliveryQuickTimeAvailable
                              ? "text-sm text-muted-foreground"
                              : "text-sm text-red-600"
                          }
                        >
                          {isDeliveryQuickTimeAvailable
                            ? `Choose a delivery time for today. Earliest available time is ${earliestDeliveryScheduleTime.toFormat("h:mm a")}.`
                            : SCHEDULE_UNAVAILABLE_MESSAGE}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="custom-delivery-hour">Hour</Label>
                            <select
                              id="custom-delivery-hour"
                              value={formData.customScheduledHour}
                              onChange={(event) =>
                                handleCustomScheduledTimeChange(
                                  "customScheduledHour",
                                  event.target.value
                                )
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Hour</option>
                              {SCHEDULE_HOUR_OPTIONS.map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="custom-delivery-minute">
                              Minute
                            </Label>
                            <select
                              id="custom-delivery-minute"
                              value={formData.customScheduledMinute}
                              onChange={(event) =>
                                handleCustomScheduledTimeChange(
                                  "customScheduledMinute",
                                  event.target.value
                                )
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Minute</option>
                              {SCHEDULE_MINUTE_OPTIONS.map((minute) => (
                                <option key={minute} value={minute}>
                                  {minute}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {customScheduledDateTime?.isValid && (
                          <p
                            className={
                              !isDeliveryQuickTimeAvailable ||
                              !isDeliveryCustomTimeAvailable
                                ? "text-sm text-red-600"
                                : "text-sm text-muted-foreground"
                            }
                          >
                            {!isDeliveryQuickTimeAvailable
                              ? SCHEDULE_UNAVAILABLE_MESSAGE
                              : isDeliveryCustomTimeAvailable
                              ? `Delivery scheduled for ${customScheduledDateTime.toFormat("h:mm a")}`
                              : CUSTOM_TIME_UNAVAILABLE_MESSAGE}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

              {formData.orderType === "pickup" &&
                formData.pickupTime === "scheduled" && (
                  <div
                    className="space-y-3 border-t pt-5"
                    aria-labelledby="scheduled-pickup-heading"
                  >
                    <h2
                      id="scheduled-pickup-heading"
                      className="text-sm font-semibold leading-none"
                    >
                      Scheduled Pickup
                    </h2>
                    <RadioGroup
                      value={formData.scheduledOption}
                      className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                      onValueChange={(value) =>
                        handleScheduledOptionChange(
                          value as "thirtyMinutes" | "custom"
                        )
                      }
                    >
                      <div className="relative">
                        <RadioGroupItem
                          value="thirtyMinutes"
                          id="pickup-delay-30"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="pickup-delay-30"
                          className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                        >
                          {pickupQuickOptionLabel}
                        </Label>
                      </div>
                      <div className="relative">
                        <RadioGroupItem
                          value="custom"
                          id="pickup-schedule-custom"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="pickup-schedule-custom"
                          className="flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-full px-2 text-center text-xs font-medium leading-none transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm sm:text-sm"
                        >
                          Choose your own time
                        </Label>
                      </div>
                    </RadioGroup>

                    {formData.scheduledOption === "thirtyMinutes" &&
                      formData.scheduledTime && (
                        <p
                          className={
                            isPickupQuickTimeAvailable
                              ? "text-sm text-muted-foreground"
                              : "text-sm text-red-600"
                          }
                        >
                          {isPickupQuickTimeAvailable
                            ? `Pickup scheduled for ${DateTime.fromISO(
                                formData.scheduledTime,
                                {
                                  zone: STORE_TIME_ZONE,
                                }
                              ).toFormat("h:mm a")}`
                            : SCHEDULE_UNAVAILABLE_MESSAGE}
                        </p>
                      )}

                    {formData.scheduledOption === "custom" && (
                      <div className="space-y-3">
                        <p
                          className={
                            isPickupQuickTimeAvailable
                              ? "text-sm text-muted-foreground"
                              : "text-sm text-red-600"
                          }
                        >
                          {isPickupQuickTimeAvailable
                            ? `Choose a pickup time for today. Earliest available time is ${earliestPickupScheduleTime.toFormat("h:mm a")}.`
                            : SCHEDULE_UNAVAILABLE_MESSAGE}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="custom-pickup-hour">Hour</Label>
                            <select
                              id="custom-pickup-hour"
                              value={formData.customScheduledHour}
                              onChange={(event) =>
                                handleCustomScheduledTimeChange(
                                  "customScheduledHour",
                                  event.target.value
                                )
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Hour</option>
                              {SCHEDULE_HOUR_OPTIONS.map((hour) => (
                                <option key={hour} value={hour}>
                                  {hour}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="custom-pickup-minute">Minute</Label>
                            <select
                              id="custom-pickup-minute"
                              value={formData.customScheduledMinute}
                              onChange={(event) =>
                                handleCustomScheduledTimeChange(
                                  "customScheduledMinute",
                                  event.target.value
                                )
                              }
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="">Minute</option>
                              {SCHEDULE_MINUTE_OPTIONS.map((minute) => (
                                <option key={minute} value={minute}>
                                  {minute}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {customScheduledDateTime?.isValid && (
                          <p
                            className={
                              !isPickupQuickTimeAvailable ||
                              !isPickupCustomTimeAvailable
                                ? "text-sm text-red-600"
                                : "text-sm text-muted-foreground"
                            }
                          >
                            {!isPickupQuickTimeAvailable
                              ? SCHEDULE_UNAVAILABLE_MESSAGE
                              : isPickupCustomTimeAvailable
                              ? `Pickup scheduled for ${customScheduledDateTime.toFormat("h:mm a")}`
                              : CUSTOM_TIME_UNAVAILABLE_MESSAGE}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                </section>

                <aside
                  className="rounded-lg border-[1.5px] border-gray-300 bg-muted/20 p-4 shadow-sm sm:p-6"
                  aria-labelledby="order-summary-heading"
                >
                  <div className="mb-4 border-b pb-3">
                    <h2 id="order-summary-heading" className="text-lg font-semibold">
                      Order Summary
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Review your items and total before placing the order.
                    </p>
                  </div>
                {isInitialized ? (
                  <>
                    <div className="rounded-md border-[1.5px] border-gray-300 bg-card p-3 shadow-sm sm:p-4">
                      <div className="mb-3 grid grid-cols-[3rem_minmax(0,1fr)_5rem] gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="text-center">Qty</span>
                        <span>Item</span>
                        <span className="text-right">Price</span>
                      </div>
                      {cart.map((item) => (
                        <div
                          key={`${item.id}-${
                            item.specialRequest
                          }-${JSON.stringify(item.selectedOptions)}`}
                          className="mb-4 grid grid-cols-[3rem_minmax(0,1fr)_5rem] items-start gap-2"
                        >
                          <span className="text-center">{item.quantity}</span>
                          <div className="min-w-0">
                            <div className="break-words">
                              {(() => {
                                const nameParts = getProductNameParts(item.name);
                                return (
                                  <>
                                    {nameParts.productCode && (
                                      <span className="font-bold">
                                        {nameParts.productCode}{" "}
                                      </span>
                                    )}
                                    {nameParts.productName}
                                  </>
                                );
                              })()}
                              {item.specialRequest && (
                                <span className="text-sm text-gray-500">
                                  {" "}
                                  ({item.specialRequest})
                                </span>
                              )}
                            </div>
                            {item.selectedOptions &&
                              item.selectedOptions.length > 0 && (
                                <div className="mt-1 text-sm text-gray-600">
                                  {item.selectedOptions.map((option, index) => (
                                    <div key={index}>
                                      {option.optionType}:{" "}
                                      <span className="font-bold">
                                        {option.selectedItemLabels?.join(", ")}
                                        {option.selectedItemPrices &&
                                          option.selectedItemPrices.length >
                                            0 && (
                                            <span className="ml-1 text-primary">
                                              (+$
                                              {option.selectedItemPrices
                                                .reduce(
                                                  (sum, price) =>
                                                    sum + parseFloat(price),
                                                  0
                                                )
                                                .toFixed(2)}
                                              )
                                            </span>
                                          )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                          <span className="text-right">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="mt-4 border-t pt-3">
                        <div className="space-y-2 text-sm sm:text-base">
                          <div className="flex justify-between gap-4">
                            <span>Subtotal</span>
                            <span>${cartSubtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>GST/HST (13%)</span>
                            <span>${taxAmount.toFixed(2)}</span>
                          </div>
                        </div>
                        {isDeliveryBelowMinimum && (
                          <div className="mt-3 rounded border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-600">
                            Delivery orders must be at least $
                            {DELIVERY_MINIMUM_SUBTOTAL.toFixed(2)} before tax.
                          </div>
                        )}
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <div className="flex justify-between gap-4 font-semibold">
                            <div className="flex flex-col">
                              <span>Total</span>
                              {formData.orderType === "delivery" && (
                                <span className="text-xs font-normal text-red-500">
                                  (Additional fees $3~$4 will be charged for
                                  delivery)
                                </span>
                              )}
                            </div>
                            <span>${totalWithTax.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="mt-3 rounded-md border border-gray-300 bg-card p-3 shadow-sm"
                      aria-labelledby="additional-note-heading"
                    >
                      <h2
                        id="additional-note-heading"
                        className="mb-2 text-sm font-semibold leading-none"
                      >
                        Additional Note <span className="font-normal text-muted-foreground">(Optional)</span>
                      </h2>
                      <Label htmlFor="additionalNote" className="sr-only">
                        Additional Note (Optional)
                      </Label>
                      <Textarea
                        id="additionalNote"
                        name="additionalNote"
                        value={formData.additionalNote}
                        onChange={handleInputChange}
                        placeholder="Extra hot sauce, soya sauce, plum sauce, utensils, etc."
                        className="min-h-16 resize-y bg-background"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Loading cart...
                  </div>
                )}
                </aside>

                {orderError && (
                <div className="rounded border border-red-400 bg-red-100 px-4 py-2 text-center text-red-700">
                  {orderError}
                </div>
              )}
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={
                  isDeliveryBelowMinimum ||
                  !isOpen ||
                  (isMaintenanceMode && !isAdmin)
                }
              >
                Place Order
              </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
