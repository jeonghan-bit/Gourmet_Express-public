"use client";

import type React from "react";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  UserPlus,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProducts } from "@/hooks/useProductActions";
import { useCustomerSearch, useUserActions } from "@/hooks/useUserActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  OptionSelection,
  DeliveryAddressDetails,
} from "@/lib/types";
import cuisine1_photo from "@/public/cuisine1_photo.webp";
import { useCollectionActions } from "@/hooks/useCollectionActions";
import { useStoreStatus } from "@/hooks/useStoreHours";
import { DateTime } from "luxon";
import {
  formatCanadianPhoneInputValue,
  formatCanadianPhoneNumber,
  matchesProductSearch,
} from "@/lib/utils";
import { usePendingOrders } from "../components/pending-orders-context";
import { DeliveryAddressForm } from "@/components/DeliveryAddressForm";
import { deliveryAddressSchema } from "@/lib/schemas";
import { STORE_CONFIG } from "@/lib/storeConfig";
import {
  calculateOrderItemsTotal,
  EditableOrderItemsTable,
  findMissingRequiredOptions,
  OrderMenuSearch,
  type EditableOrderItem as OrderItem,
} from "../components/order-item-options";

interface AddOrderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSave: (order: any) => void | Promise<void>;
}

interface Customer {
  id: number;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  allergyInfo: string | null;
  notes: string | null;
  deliveryAddressDetails: DeliveryAddressDetails | null;
}

interface CustomerFormData {
  name: string;
  phoneNumber: string;
  email: string;
  deliveryAddressDetails: DeliveryAddressDetails | null;
  allergyInfo: string;
  notes: string;
}

const DELIVERY_MINIMUM_SUBTOTAL = 30;

const releaseBodyPointerLock = () => {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    const activeDialog = document.querySelector(
      '[role="dialog"], [role="alertdialog"]'
    );

    if (!activeDialog) {
      document.body.style.pointerEvents = "";
    }
  }, 250);
};

export function AddOrderDialog({ open, setOpen, onSave }: AddOrderDialogProps) {
  // State for order form
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState("pickup");
  const [fulfillmentTiming, setFulfillmentTiming] = useState("asap");
  const [scheduledTime, setScheduledTime] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("3");
  const [additionalNote, setAdditionalNote] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [debouncedCustomerSearchTerm, setDebouncedCustomerSearchTerm] =
    useState("");
  const [customerSearchArmed, setCustomerSearchArmed] = useState(false);
  const [menuSearchOpen, setMenuSearchOpen] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [waitingTimePromptOpen, setWaitingTimePromptOpen] = useState(false);
  const [newCustomerPromptOpen, setNewCustomerPromptOpen] = useState(false);
  const [customerPromptMode, setCustomerPromptMode] = useState<"add" | "edit">(
    "add"
  );
  const [waitingTimeMinutes, setWaitingTimeMinutes] = useState("");
  const [pendingOrderDraft, setPendingOrderDraft] = useState<any | null>(null);
  const isResolvingWaitingTimePrompt = useRef(false);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {}
  );
  const [orderItemRequirements, setOrderItemRequirements] = useState<
    Record<string, string[]>
  >({});
  const { setPendingOrdersPaused } = usePendingOrders();

  useEffect(() => {
    if (!open) return;

    setPendingOrdersPaused(true);
    return () => setPendingOrdersPaused(false);
  }, [open, setPendingOrdersPaused]);

  // Store status hook
  const { isOpen, todayHours } = useStoreStatus();

  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    name: "",
    phoneNumber: "",
    email: "",
    deliveryAddressDetails: null,
    allergyInfo: "",
    notes: "",
  });
  const [newCustomerForm, setNewCustomerForm] = useState<CustomerFormData>({
    name: "",
    phoneNumber: "",
    email: "",
    deliveryAddressDetails: null,
    allergyInfo: "",
    notes: "",
  });
  const isCustomerFormValid =
    newCustomerForm.phoneNumber.replace(/\D/g, "").length === 10 &&
    newCustomerForm.name.trim().length > 0 &&
    (!newCustomerForm.deliveryAddressDetails ||
      deliveryAddressSchema.safeParse(newCustomerForm.deliveryAddressDetails)
        .success);

  // Hooks
  const { createNewUser, updateUserInfo } = useUserActions();
  const { useCollections } = useCollectionActions();
  const { data: productsData, isLoading: isLoadingProducts } = useProducts(
    "", // fetch active products once; search is filtered locally below
    0, // offset
    1000, // large limit to get all products
    "active", // only active products
    undefined,
    undefined,
    true // include option types/items once for inline order options
  );
  const { data: collections = [], isLoading: isLoadingCollections } =
    useCollections();
  const {
    data: customerSearchResults = [],
    isFetching: isSearchingCustomers,
  } = useCustomerSearch(
    debouncedCustomerSearchTerm,
    customerSearchOpen
  );
  const isCustomerSearchPending =
    customerSearchTerm.trim() !== debouncedCustomerSearchTerm ||
    isSearchingCustomers;

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedCustomerSearchTerm(customerSearchTerm.trim()),
      250
    );
    return () => window.clearTimeout(timeout);
  }, [customerSearchTerm]);

  // Transform collections and products into menu categories
  const menuCategories = useMemo(
    () => {
      const products = productsData?.products || [];

      return (
      collections
        .map((collection: any) => {
          const collectionProducts = products
            .filter(
              (product: any) =>
                product.collection?.id === collection.id &&
                product.status === "active"
            )
            .map((product: any) => ({
              id: product.id.toString(),
              name: product.name,
              price: parseFloat(product.price),
              description: product.description || "",
              image: product.image_url || cuisine1_photo,
              optionTypes: product.optionTypes || [],
            }));

          return {
            ...collection,
            items: collectionProducts,
          };
        })
        .filter((category: any) => category.items.length > 0)
      );
    },
    [collections, productsData?.products]
  );

  const menuSearchResults = useMemo(() => {
    if (!menuSearchOpen) return [];

    return menuCategories
      .flatMap((category: any) => category.items)
      .filter((item: any) => {
        const searchLower = searchTerm.trim().toLowerCase();
        if (!searchLower) return true;

        return matchesProductSearch(item.name, searchLower);
      });
  }, [menuCategories, menuSearchOpen, searchTerm]);
  const customerSearchDigits = customerSearchTerm.replace(/\D/g, "");
  const canQuickCreateCustomer =
    customerSearchTerm.trim().length > 0 &&
    /^[\d\s()+-]+$/.test(customerSearchTerm.trim()) &&
    customerSearchDigits.length === 10;

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Update phone number when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setPhoneNumber(selectedCustomer.phoneNumber || "");
      setCustomerForm({
        name: selectedCustomer.name || "",
        phoneNumber: selectedCustomer.phoneNumber || "",
        email: selectedCustomer.email || "",
        deliveryAddressDetails: selectedCustomer.deliveryAddressDetails || null,
        allergyInfo: selectedCustomer.allergyInfo || "",
        notes: selectedCustomer.notes || "",
      });
    }
  }, [selectedCustomer]);

  const resetForm = () => {
    setOrderItems([]);
    setSelectedCustomer(null);
    setSearchTerm("");
    setFulfillmentType("pickup");
    setFulfillmentTiming("asap");
    setScheduledTime("");
    setDeliveryCharge("3");
    setAdditionalNote("");
    setPhoneNumber("");
    setCustomerSearchTerm("");
    setCustomerSearchArmed(false);
    setCustomerForm({
      name: "",
      phoneNumber: "",
      email: "",
      deliveryAddressDetails: null,
      allergyInfo: "",
      notes: "",
    });
    setNewCustomerForm({
      name: "",
      phoneNumber: "",
      email: "",
      deliveryAddressDetails: null,
      allergyInfo: "",
      notes: "",
    });
    setMenuSearchOpen(false);
    setCustomerSearchOpen(false);
    setNewCustomerPromptOpen(false);
    setCustomerPromptMode("add");
    setOrderError("");
    setDiscardConfirmOpen(false);
    setWaitingTimePromptOpen(false);
    setWaitingTimeMinutes("");
    setPendingOrderDraft(null);
    setQuantityDrafts({});
    setOrderItemRequirements({});
  };

  // Add item to order
  const addItemToOrder = (product: any) => {
    // Convert image to string URL if it's a static import
    let imageUrl: string;
    if (product.image && typeof product.image === "string") {
      imageUrl = product.image;
    } else if (
      product.image &&
      typeof product.image === "object" &&
      "src" in product.image
    ) {
      imageUrl = product.image.src;
    } else {
      // Use default image when no image_url is provided
      imageUrl = cuisine1_photo.src;
    }

    const newOrderItem: OrderItem = {
      lineId: `${product.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      id: parseInt(product.id),
      name: product.name,
      price: parseFloat(product.price),
      quantity: 1,
      selectedOptions: [],
      optionTypes: product.optionTypes || [],
      description: product.description || "",
      image: imageUrl,
    };

    setOrderItems((current) => [...current, newOrderItem]);
    setQuantityDrafts((current) => ({
      ...current,
      [newOrderItem.lineId]: String(newOrderItem.quantity),
    }));
  };

  const updateOrderItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      const itemToRemove = orderItems[index];
      setOrderItems(orderItems.filter((_, itemIndex) => itemIndex !== index));
      if (itemToRemove) {
        setQuantityDrafts((current) => {
          const next = { ...current };
          delete next[itemToRemove.lineId];
          return next;
        });
      }
      return;
    }

    setOrderItems(
      orderItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity } : item
      )
    );
    const updatedItem = orderItems[index];
    if (updatedItem) {
      setQuantityDrafts((current) => ({
        ...current,
        [updatedItem.lineId]: String(quantity),
      }));
    }
  };

  const handleQuantityDraftChange = (
    item: OrderItem,
    index: number,
    value: string
  ) => {
    const digitsOnly = value.replace(/\D/g, "");
    setQuantityDrafts((current) => ({
      ...current,
      [item.lineId]: digitsOnly,
    }));

    const nextQuantity = parseInt(digitsOnly, 10);
    if (Number.isFinite(nextQuantity) && nextQuantity > 0) {
      updateOrderItemQuantity(index, nextQuantity);
    }
  };

  const handleQuantityDraftBlur = (item: OrderItem) => {
    const draftQuantity = parseInt(quantityDrafts[item.lineId] || "", 10);
    setQuantityDrafts((current) => ({
      ...current,
      [item.lineId]:
        Number.isFinite(draftQuantity) && draftQuantity > 0
          ? String(draftQuantity)
          : String(item.quantity),
    }));
  };

  const removeOrderItem = (index: number) => {
    const itemToRemove = orderItems[index];
    setOrderItems(orderItems.filter((_, itemIndex) => itemIndex !== index));
    if (itemToRemove) {
      setQuantityDrafts((current) => {
        const next = { ...current };
        delete next[itemToRemove.lineId];
        return next;
      });
      setOrderItemRequirements((current) => {
        const next = { ...current };
        delete next[itemToRemove.lineId];
        return next;
      });
    }
  };

  const updateOrderItemOptions = (
    lineId: string,
    selectedOptions: OptionSelection[]
  ) => {
    setOrderItems((current) =>
      current.map((item) =>
        item.lineId === lineId ? { ...item, selectedOptions } : item
      )
    );
  };

  const updateOrderItemSpecialRequest = (lineId: string, specialRequest: string) => {
    setOrderItems((current) =>
      current.map((item) =>
        item.lineId === lineId ? { ...item, specialRequest } : item
      )
    );
  };

  const updateOrderItemRequirements = (
    lineId: string,
    requiredOptionIds: string[]
  ) => {
    setOrderItemRequirements((current) => ({
      ...current,
      [lineId]: requiredOptionIds,
    }));
  };

  const getMissingRequiredOptions = () =>
    findMissingRequiredOptions(orderItems, orderItemRequirements);
  const calculateTotal = () => calculateOrderItemsTotal(orderItems);

  const getDeliveryCharge = () => {
    if (fulfillmentType !== "delivery") return 0;

    const parsedCharge = parseFloat(deliveryCharge);
    return Number.isFinite(parsedCharge) ? parsedCharge : 0;
  };

  const handleCustomerSearchFocus = () => {
    if (customerSearchTerm.trim()) {
      setCustomerSearchOpen(true);
    }
  };

  const handleCustomerSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setCustomerSearchTerm(value);
    setCustomerSearchArmed(true);
    setCustomerSearchOpen(value.length > 0);
  };

  const handleNewCustomerFormChange = (
    field: keyof CustomerFormData,
    value: string
  ) => {
    setNewCustomerForm((current) => ({
      ...current,
      [field]:
        field === "phoneNumber" ? formatCanadianPhoneInputValue(value) : value,
    }));
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm("");
    setCustomerSearchOpen(false);
  };

  const handleOpenNewCustomerPrompt = () => {
    if (!canQuickCreateCustomer) {
      setOrderError("Please check phone number. Enter a valid 10-digit number.");
      return;
    }

    setOrderError("");
    setNewCustomerForm({
      name: `Phone number ${customerSearchDigits.slice(-4)}`,
      phoneNumber: customerSearchDigits,
      email: "",
      deliveryAddressDetails: null,
      allergyInfo: "",
      notes: "",
    });
    setCustomerPromptMode("add");
    setCustomerSearchOpen(false);
    setNewCustomerPromptOpen(true);
  };

  const handleOpenEditCustomerPrompt = () => {
    setOrderError("");
    setNewCustomerForm(customerForm);
    setCustomerPromptMode("edit");
    setNewCustomerPromptOpen(true);
  };

  const handleCancelCustomerPrompt = () => {
    setNewCustomerPromptOpen(false);
    setOrderError("");
  };

  const handleSaveCustomerPrompt = async () => {
    const digitsOnly = newCustomerForm.phoneNumber.replace(/\D/g, "");
    if (digitsOnly.length !== 10) {
      setOrderError("Please check phone number. Enter a valid 10-digit number.");
      return;
    }

    if (!newCustomerForm.name.trim()) {
      setOrderError("Customer name is required.");
      return;
    }

    if (
      newCustomerForm.deliveryAddressDetails &&
      !deliveryAddressSchema.safeParse(newCustomerForm.deliveryAddressDetails)
        .success
    ) {
      setOrderError("Please complete all required delivery address fields.");
      return;
    }

    if (customerPromptMode === "edit") {
      if (!selectedCustomer) {
        setOrderError("Please select a customer before editing.");
        return;
      }

      setOrderError("");
      try {
        const updatedCustomer = await updateUserInfo.mutateAsync({
          id: selectedCustomer.id,
          name: newCustomerForm.name.trim(),
          phoneNumber: digitsOnly,
          email: newCustomerForm.email,
          deliveryAddressDetails: newCustomerForm.deliveryAddressDetails,
          allergyInfo: newCustomerForm.allergyInfo,
          notes: newCustomerForm.notes,
        });
        const nextCustomer = { ...selectedCustomer, ...updatedCustomer };
        setSelectedCustomer(nextCustomer);
        setCustomerForm({
          name: nextCustomer.name || "",
          phoneNumber: nextCustomer.phoneNumber || "",
          email: nextCustomer.email || "",
          deliveryAddressDetails: nextCustomer.deliveryAddressDetails || null,
          allergyInfo: nextCustomer.allergyInfo || "",
          notes: nextCustomer.notes || "",
        });
        setPhoneNumber(nextCustomer.phoneNumber || "");
        setNewCustomerPromptOpen(false);
      } catch (error) {
        setOrderError("Failed to update customer information.");
      }
      return;
    }

    setOrderError("");
    try {
      const result = await createNewUser.mutateAsync({
        name: newCustomerForm.name.trim(),
        phoneNumber: digitsOnly,
        email: "",
        deliveryAddressDetails: newCustomerForm.deliveryAddressDetails,
        allergyInfo: newCustomerForm.allergyInfo,
        notes: newCustomerForm.notes,
        is_verified: false,
      });

      if (result?.user) {
        setSelectedCustomer(result.user);
        setCustomerSearchTerm("");
        setCustomerSearchOpen(false);
        setNewCustomerPromptOpen(false);
      }
    } catch (error) {
      setOrderError("Failed to create customer with this phone number.");
    }
  };

  const getDefaultScheduledTime = (orderType: string) =>
    DateTime.now()
      .setZone(STORE_CONFIG.timeZone)
      .plus({ minutes: orderType === "delivery" ? 60 : 30 })
      .toFormat("HH:mm");

  const handleFulfillmentTypeChange = (value: string) => {
    setFulfillmentType(value);
    if (fulfillmentTiming === "scheduled") {
      setScheduledTime(getDefaultScheduledTime(value));
    }
  };

  const handleFulfillmentTimingChange = (value: string) => {
    setFulfillmentTiming(value);
    if (value === "scheduled") {
      setScheduledTime(getDefaultScheduledTime(fulfillmentType));
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && (waitingTimePromptOpen || newCustomerPromptOpen)) {
      return;
    }

    if (!nextOpen && selectedCustomer) {
      setDiscardConfirmOpen(true);
      return;
    }

    setOpen(nextOpen);
  };

  const handleDiscardOrder = () => {
    setDiscardConfirmOpen(false);
    window.setTimeout(() => {
      setOpen(false);
      releaseBodyPointerLock();
    }, 0);
  };

  const submitAddOrderDraft = async (
    status: "pending" | "confirmed",
    estimatedTime?: number
  ) => {
    if (!pendingOrderDraft) return;
    if (isResolvingWaitingTimePrompt.current) return;
    isResolvingWaitingTimePrompt.current = true;

    const orderToSave = {
      ...pendingOrderDraft,
      status,
      estimatedTime,
      source: "add_order",
    };

    try {
      await Promise.resolve(onSave(orderToSave));
      setPendingOrderDraft(null);
      setWaitingTimePromptOpen(false);
      setWaitingTimeMinutes("");
      setDiscardConfirmOpen(false);
      window.setTimeout(() => {
        setOpen(false);
        releaseBodyPointerLock();
      }, 0);
    } catch (error) {
      setOrderError("Failed to create order.");
    } finally {
      isResolvingWaitingTimePrompt.current = false;
    }
  };

  const handleWaitingTimeSubmit = async () => {
    const minutes = Number(waitingTimeMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return;

    await submitAddOrderDraft("confirmed", minutes);
  };

  const handleWaitingTimeDiscard = async () => {
    await submitAddOrderDraft("pending");
  };

  const handleCancelOrder = () => {
    if (selectedCustomer) {
      setDiscardConfirmOpen(true);
      return;
    }

    setOpen(false);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError("");

    // Store open/closed check
    if (!isOpen) {
      return;
    }

    if (orderItems.length === 0) {
      setOrderError("Please add at least one order item.");
      return;
    }

    if (!selectedCustomer || !phoneNumber) {
      setOrderError("Please select a customer before creating order.");
      return;
    }

    // Scheduled time validation
    if (fulfillmentTiming === "scheduled" && scheduledTime) {
      const nowToronto = DateTime.now().setZone(STORE_CONFIG.timeZone);

      const selectedDateTime = DateTime.fromISO(
        `${nowToronto.toFormat("yyyy-MM-dd")}T${scheduledTime}`,
        { zone: STORE_CONFIG.timeZone }
      );

      const isToday =
        selectedDateTime.toFormat("yyyy-MM-dd") ===
        nowToronto.toFormat("yyyy-MM-dd");

      if (isToday && todayHours) {
        const [openHour, openMinute] = todayHours.open.split(":").map(Number);
        const [closeHour, closeMinute] = todayHours.close
          .split(":")
          .map(Number);

        const openDateTime = nowToronto.set({
          hour: openHour,
          minute: openMinute,
          second: 0,
          millisecond: 0,
        });
        const closeDateTime = nowToronto.set({
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
            "The store is closed at your chosen time. Please select a different time."
          );
          return;
        }
      }
    }

    // Calculate total with proper rounding logic
    const subtotal = Math.round(calculateTotal() * 100) / 100; // Round subtotal to 2 decimals
    const deliveryFee = getDeliveryCharge();
    const tax = Math.round((subtotal + deliveryFee) * 0.13 * 100) / 100;
    const total = subtotal + deliveryFee + tax;
    const orderType = fulfillmentType === "delivery" ? "delivery" : "pickup";
    const missingRequiredOptions = getMissingRequiredOptions();

    if (missingRequiredOptions.length > 0) {
      setOrderError("Please choose all required options before creating order.");
      return;
    }

    if (!customerForm.name.trim()) {
      setOrderError("Customer name is required.");
      return;
    }

    if (
      orderType === "delivery" &&
      !deliveryAddressSchema.safeParse(customerForm.deliveryAddressDetails).success
    ) {
      setOrderError("Please select and complete a verified delivery address.");
      return;
    }

    if (orderType === "delivery" && subtotal < DELIVERY_MINIMUM_SUBTOTAL) {
      setOrderError(
        `Delivery orders must be at least $${DELIVERY_MINIMUM_SUBTOTAL.toFixed(
          2
        )} before tax.`
      );
      return;
    }

    const newOrder = {
      userId: selectedCustomer?.id || 0,
      customerName: customerForm.name,
      customerPhone: customerForm.phoneNumber,
      total: total, // Use properly calculated total
      status: "pending",
      orderType,
      address:
        orderType === "delivery"
          ? customerForm.deliveryAddressDetails?.formattedAddress
          : null,
      deliveryAddressDetails:
        orderType === "delivery" ? customerForm.deliveryAddressDetails : null,
      allergyInfo: customerForm.allergyInfo,
      additionalNote,
      deliveryCharge: deliveryFee,
      pickupTime: fulfillmentTiming,
      scheduledTime: fulfillmentTiming === "scheduled" ? scheduledTime : null,
      cart: orderItems.map(({ lineId, optionTypes, ...item }) => item),
    };

    setPendingOrderDraft(newOrder);
    setWaitingTimePromptOpen(true);
  };

  return (
    <>
      <Dialog
        open={open}
        modal={!discardConfirmOpen}
        onOpenChange={handleDialogOpenChange}
      >
        <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1280px] flex-col overflow-hidden p-4 sm:p-6 [&>button]:flex [&>button]:h-12 [&>button]:w-12 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="shrink-0">
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Add items to the order and select a customer.
          </DialogDescription>
        </DialogHeader>

        {!isOpen && (
          <Alert className="border-red-200 bg-red-50 text-red-700">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              The store is currently closed, Unable to create new order.
            </AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ScrollArea className="min-h-0 flex-1 rounded-md border">
            <div className="space-y-4 p-4">
              <div>
                <Label>Find Customer</Label>
                <div
                  className="relative mt-1"
                  onBlur={() => {
                    window.setTimeout(
                      () => setCustomerSearchOpen(false),
                      150
                    );
                  }}
                >
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by phone, name, address, or email..."
                    className="pl-8"
                    value={customerSearchTerm}
                    onFocus={handleCustomerSearchFocus}
                    onClick={() => {
                      if (!customerSearchTerm.trim() && customerSearchArmed) {
                        setCustomerSearchOpen(true);
                      }
                      setCustomerSearchArmed(true);
                    }}
                    onChange={handleCustomerSearchChange}
                  />
                  {customerSearchOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
                      <div className="max-h-[260px] overflow-y-auto py-1">
                        {isCustomerSearchPending ? (
                          <div className="flex items-center px-3 py-3 text-sm text-muted-foreground">
                            Searching customers...
                          </div>
                        ) : customerSearchResults.length > 0 ? (
                          customerSearchResults.map((customer) => (
                            <button
                              type="button"
                              key={customer.id}
                              className={`grid w-full gap-1 px-3 py-2 text-left text-sm hover:bg-accent sm:grid-cols-[1fr_150px_1fr] sm:gap-3 ${
                                selectedCustomer?.id === customer.id
                                  ? "bg-accent"
                                  : ""
                              }`}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium">
                                  {customer.name}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {customer.email || "-"}
                                </span>
                              </span>
                              <span className="text-muted-foreground sm:pt-0.5">
                                {formatCanadianPhoneNumber(
                                  customer.phoneNumber
                                )}
                              </span>
                              <span className="truncate text-muted-foreground sm:pt-0.5">
                                {customer.deliveryAddressDetails?.formattedAddress ||
                                  "-"}
                              </span>
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center px-3 py-3 text-left text-sm hover:bg-accent"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={handleOpenNewCustomerPrompt}
                            disabled={createNewUser.isPending}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            {canQuickCreateCustomer
                              ? `Add new customer with ${formatCanadianPhoneNumber(
                                  customerSearchDigits
                                )}`
                              : "Add new customer with this detail"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedCustomer && (
                <Card className="rounded-lg border-[1.5px] border-gray-300 bg-card shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg">
                        Customer Information
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenEditCustomerPrompt}
                      >
                        Edit customer
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">
                          Phone Number
                        </span>
                        <div className="font-medium">
                          {formatCanadianPhoneNumber(customerForm.phoneNumber)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Name</span>
                        <div className="font-medium">{customerForm.name}</div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span className="text-muted-foreground">Address</span>
                      <div className="font-medium">
                        {customerForm.deliveryAddressDetails?.formattedAddress || "No verified address"}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <span className="text-muted-foreground">
                          Allergy Info
                        </span>
                        <div className="font-medium">
                          {customerForm.allergyInfo || "-"}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <span className="text-muted-foreground">
                          Admin Notes
                        </span>
                        <div className="font-medium">
                          {customerForm.notes || "-"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4 rounded-lg border-[1.5px] border-gray-300 bg-muted/20 p-4 shadow-sm sm:p-6">
                <div className="flex items-center gap-2 font-medium">
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </div>

                <Card className="rounded-md border-[1.5px] border-gray-300 bg-card shadow-sm">
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="font-semibold">
                          Fulfillment Type
                        </Label>
                        <RadioGroup
                          value={fulfillmentType}
                          onValueChange={handleFulfillmentTypeChange}
                          className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                        >
                          <div className="relative">
                            <RadioGroupItem
                              value="pickup"
                              id="admin-order-pickup"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="admin-order-pickup"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Pickup
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem
                              value="delivery"
                              id="admin-order-delivery"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="admin-order-delivery"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Delivery
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label className="font-semibold">Timing</Label>
                        <RadioGroup
                          value={fulfillmentTiming}
                          onValueChange={handleFulfillmentTimingChange}
                          className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                        >
                          <div className="relative">
                            <RadioGroupItem
                              value="asap"
                              id="admin-order-asap"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="admin-order-asap"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Now
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem
                              value="scheduled"
                              id="admin-order-scheduled"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="admin-order-scheduled"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Scheduled
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>

                    {(fulfillmentType === "delivery" ||
                      fulfillmentTiming === "scheduled") && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          {fulfillmentType === "delivery" && (
                            <div className="space-y-2">
                              <Label htmlFor="deliveryCharge">
                                Delivery Fee
                              </Label>
                              <Input
                                id="deliveryCharge"
                                type="number"
                                min="0"
                                step="0.5"
                                value={deliveryCharge}
                                onChange={(e) =>
                                  setDeliveryCharge(e.target.value)
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          {fulfillmentTiming === "scheduled" && (
                            <div className="space-y-2">
                              <Label htmlFor="scheduledTime">
                                Scheduled Time (Today Only)
                              </Label>
                              <Input
                                id="scheduledTime"
                                type="time"
                                value={scheduledTime}
                                onChange={(e) =>
                                  setScheduledTime(e.target.value)
                                }
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <OrderMenuSearch
                  value={searchTerm}
                  open={menuSearchOpen}
                  loading={isLoadingProducts || isLoadingCollections}
                  results={menuSearchResults}
                  onValueChange={setSearchTerm}
                  onOpenChange={setMenuSearchOpen}
                  onAdd={addItemToOrder}
                />

                <EditableOrderItemsTable
                  items={orderItems}
                  newestFirst
                  allowCustomOptions
                  quantityDrafts={quantityDrafts}
                  onQuantityChange={updateOrderItemQuantity}
                  onQuantityDraftChange={handleQuantityDraftChange}
                  onQuantityDraftBlur={handleQuantityDraftBlur}
                  onOptionsChange={updateOrderItemOptions}
                  onRequirementsChange={updateOrderItemRequirements}
                  onSpecialRequestChange={updateOrderItemSpecialRequest}
                  onRemove={removeOrderItem}
                />

                <div className="flex flex-col gap-3 rounded-md border border-gray-300 bg-card p-3 shadow-sm sm:p-4 lg:flex-row lg:items-start lg:justify-end">
                  <div className="w-full flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="addOrderAdditionalNote">
                        Additional Note
                      </Label>
                      <Textarea
                        id="addOrderAdditionalNote"
                        value={additionalNote}
                        onChange={(event) =>
                          setAdditionalNote(event.target.value)
                        }
                        maxLength={500}
                        rows={2}
                        placeholder="Enter a customer or order-specific note..."
                      />
                    </div>
                    {orderError && (
                      <Alert className="border-red-200 bg-red-50 text-red-700 lg:max-w-[420px]">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                          {orderError}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="ml-auto w-full space-y-2 sm:max-w-[320px]">
                    {(() => {
                      const subtotal =
                        Math.round(calculateTotal() * 100) / 100;
                      const deliveryFee = getDeliveryCharge();
                      const tax = Math.round((subtotal + deliveryFee) * 0.13 * 100) / 100;
                      const total = subtotal + deliveryFee + tax;

                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                          </div>
                          {fulfillmentType === "delivery" && (
                            <div className="flex justify-between text-sm">
                              <span>Delivery Charge</span>
                              <span>${deliveryFee.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Tax (13%)</span>
                            <span>${tax.toFixed(2)}</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelOrder}
              className="min-h-12"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isOpen} className="min-h-12">
              Create Order
            </Button>
          </DialogFooter>
        </form>

        <Dialog
          open={newCustomerPromptOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) handleCancelCustomerPrompt();
          }}
        >
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl [&>button]:h-12 [&>button]:w-12">
            <DialogHeader>
              <DialogTitle>
                {customerPromptMode === "add"
                  ? "Add New Customer"
                  : "Edit Customer"}
              </DialogTitle>
            </DialogHeader>

            {orderError && (
              <Alert className="border-red-200 bg-red-50 text-red-700">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  {orderError}
                </AlertDescription>
              </Alert>
            )}

              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="newCustomerPhone">Phone Number</Label>
                    <Input
                      id="newCustomerPhone"
                      value={formatCanadianPhoneNumber(
                        newCustomerForm.phoneNumber
                      )}
                      onChange={(event) =>
                        handleNewCustomerFormChange(
                          "phoneNumber",
                          event.target.value
                        )
                      }
                      disabled={customerPromptMode === "edit"}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="newCustomerName">Name</Label>
                    <Input
                      id="newCustomerName"
                      value={newCustomerForm.name}
                      onChange={(event) =>
                        handleNewCustomerFormChange("name", event.target.value)
                      }
                    />
                  </div>
                </div>

                <DeliveryAddressForm
                  value={newCustomerForm.deliveryAddressDetails}
                  onChange={(deliveryAddressDetails) =>
                    setNewCustomerForm((current) => ({
                      ...current,
                      deliveryAddressDetails,
                    }))
                  }
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="newCustomerAllergy">Allergy Info</Label>
                    <Textarea
                      id="newCustomerAllergy"
                      value={newCustomerForm.allergyInfo}
                      onChange={(event) =>
                        handleNewCustomerFormChange(
                          "allergyInfo",
                          event.target.value
                        )
                      }
                      maxLength={100}
                      rows={2}
                      placeholder="Enter allergy information..."
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="newCustomerNotes">Admin Notes</Label>
                    <Textarea
                      id="newCustomerNotes"
                      value={newCustomerForm.notes}
                      onChange={(event) =>
                        handleNewCustomerFormChange("notes", event.target.value)
                      }
                      maxLength={100}
                      rows={2}
                      placeholder="Enter admin-only notes..."
                    />
                  </div>
                </div>
              </div>

            <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelCustomerPrompt}
                  className="min-h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveCustomerPrompt}
                  disabled={
                    !isCustomerFormValid ||
                    createNewUser.isPending ||
                    updateUserInfo.isPending
                  }
                  className="min-h-12"
                >
                  {customerPromptMode === "add"
                    ? "Add Customer"
                    : "Save Customer"}
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={waitingTimePromptOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) void handleWaitingTimeDiscard();
          }}
        >
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg [&>button]:h-12 [&>button]:w-12">
            <DialogHeader>
              <DialogTitle>Set waiting time</DialogTitle>
              <DialogDescription>
                Enter how long this phone order will take. If this is
                discarded, the order will stay pending.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="addOrderWaitingTime">
                  Waiting time (minutes)
                </Label>
                <Input
                  id="addOrderWaitingTime"
                  type="number"
                  min="1"
                  max="180"
                  value={waitingTimeMinutes}
                  onChange={(event) =>
                    setWaitingTimeMinutes(event.target.value)
                  }
                  placeholder="Enter minutes"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">
                  Quick select
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(fulfillmentType === "delivery"
                    ? [45, 50, 55, 60, 75]
                    : [15, 20, 25, 30, 45]
                  ).map((minutes) => (
                    <Button
                      key={minutes}
                      type="button"
                      variant={
                        waitingTimeMinutes === String(minutes)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setWaitingTimeMinutes(String(minutes))}
                      className="min-h-12"
                    >
                      {minutes}m
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleWaitingTimeDiscard}
                className="min-h-12"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleWaitingTimeSubmit}
                disabled={
                  !Number.isFinite(Number(waitingTimeMinutes)) ||
                  Number(waitingTimeMinutes) <= 0
                }
                className="min-h-12"
              >
                Confirm order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        </DialogContent>
      </Dialog>

      <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Do you wish to discard?</AlertDialogTitle>
            <AlertDialogDescription>
              The selected customer and current order details will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-12">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscardOrder}
              className="min-h-12"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </>
  );
}
