import { useState, useEffect, useMemo } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Trash2 } from "lucide-react";
import type { DeliveryAddressDetails, SelectOrderWithUser } from "@/lib/types";
import { useOrderActions } from "@/hooks/useOrderActions";
import { useUserActions } from "@/hooks/useUserActions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProducts } from "@/hooks/useProductActions";
import { useCollectionActions } from "@/hooks/useCollectionActions";
import {
  OptionSelection,
} from "@/lib/types";
import cuisine1_photo from "@/public/cuisine1_photo.webp";
import {
  formatCanadianPhoneNumber,
  matchesProductSearch,
} from "@/lib/utils";
import { usePendingOrders } from "./pending-orders-context";
import { DateTime } from "luxon";
import { toast } from "sonner";
import { DeliveryAddressForm } from "@/components/DeliveryAddressForm";
import { deliveryAddressSchema } from "@/lib/schemas";
import { STORE_CONFIG } from "@/lib/storeConfig";
import { getAdminCustomOptionValidationError } from "@/lib/adminCustomOption";
import {
  calculateOrderItemsTotal,
  EditableOrderItemsTable,
  findMissingRequiredOptions,
  OrderMenuSearch,
  type EditableOrderItem as OrderItem,
} from "./order-item-options";

interface EditOrderDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  order: SelectOrderWithUser | null;
}

interface CustomerFormData {
  name: string;
  email: string;
  phoneNumber: string;
  deliveryAddressDetails: DeliveryAddressDetails | null;
  allergyInfo: string;
  notes: string;
}

const DELIVERY_MINIMUM_SUBTOTAL = 30;

const roundMoney = (value: number) => Math.round(value * 100) / 100;

const getPersistedItems = (
  items: Array<Partial<OrderItem> & Record<string, any>>
) =>
  items.map((item) => {
    const selectedOptions = item.selectedOptions || item.optionType || [];
    const additionalPrice = selectedOptions.reduce(
      (optionTotal: number, option: OptionSelection) =>
        optionTotal +
        (option.selectedItemPrices || []).reduce((priceTotal, price) => {
          const parsedPrice = Number(price);
          return priceTotal + (Number.isFinite(parsedPrice) ? parsedPrice : 0);
        }, 0),
      0
    );

    return {
      id: Number(item.id),
      name: item.name || "",
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      specialRequest: item.specialRequest || "",
      selectedOptions,
      additionalPrice,
      ...(item.image ? { image: item.image } : {}),
      ...(item.description ? { description: item.description } : {}),
    };
  });

const getComparableItems = (
  items: Array<Partial<OrderItem> & Record<string, any>>,
  includeSpecialRequests: boolean
) =>
  getPersistedItems(items).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    selectedOptions: item.selectedOptions,
    ...(includeSpecialRequests
      ? { specialRequest: item.specialRequest.trim() }
      : {}),
  }));

const getTorontoTimeValue = (value: Date | string | null | undefined) =>
  value
    ? DateTime.fromJSDate(new Date(value))
        .setZone(STORE_CONFIG.timeZone)
        .toFormat("HH:mm")
    : "";

export function EditOrderDialog({
  open,
  setOpen,
  order,
}: EditOrderDialogProps) {
  const { updateOrderDetails, deleteOrder } = useOrderActions();
  const { updateUserInfo } = useUserActions();
  const { setPendingOrdersPaused } = usePendingOrders();
  const [isLoading, setIsLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [userData, setUserData] = useState<CustomerFormData>({
    name: "",
    email: "",
    phoneNumber: "",
    deliveryAddressDetails: null,
    allergyInfo: "",
    notes: "",
  });
  const [customerPromptOpen, setCustomerPromptOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerFormData>({
    name: "",
    email: "",
    phoneNumber: "",
    deliveryAddressDetails: null,
    allergyInfo: "",
    notes: "",
  });
  const isCustomerFormValid =
    customerForm.name.trim().length > 0 &&
    (!customerForm.deliveryAddressDetails ||
      deliveryAddressSchema.safeParse(customerForm.deliveryAddressDetails)
        .success);
  const [orderError, setOrderError] = useState("");
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [priceConfirmOpen, setPriceConfirmOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<
    "pickup" | "delivery" | "dineIn"
  >("pickup");
  const [fulfillmentTimingType, setFulfillmentTimingType] = useState<
    "ASAP" | "SCHEDULED"
  >("ASAP");
  const [scheduledTime, setScheduledTime] = useState("");
  const [deliveryChargeDraft, setDeliveryChargeDraft] = useState("0");
  const [additionalNote, setAdditionalNote] = useState("");
  const [orderAllergyInfo, setOrderAllergyInfo] = useState("");
  const [deliveryAddressDetails, setDeliveryAddressDetails] =
    useState<DeliveryAddressDetails | null>(null);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {}
  );
  const [orderItemRequirements, setOrderItemRequirements] = useState<
    Record<string, string[]>
  >({});

  const [searchTerm, setSearchTerm] = useState("");
  const [menuSearchOpen, setMenuSearchOpen] = useState(false);

  // Menu data hooks
  const { useCollections } = useCollectionActions();
  const { data: productsData, isLoading: isLoadingProducts } = useProducts(
    "",
    0,
    1000,
    "active",
    undefined,
    undefined,
    true
  );
  const { data: collections = [], isLoading: isLoadingCollections } =
    useCollections();

  const products = useMemo(
    () => (productsData?.products || []) as any[],
    [productsData?.products]
  );

  useEffect(() => {
    if (!open) return;

    setPendingOrdersPaused(true);
    return () => setPendingOrdersPaused(false);
  }, [open, setPendingOrdersPaused]);

  const menuCategories = useMemo(
    () =>
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
        .filter((category: any) => category.items.length > 0),
    [collections, products]
  );

  const menuSearchResults = useMemo(() => {
    const allItems = menuCategories.flatMap((category: any) => category.items);
    const searchLower = searchTerm.trim().toLowerCase();

    if (!searchLower) return allItems;

    return allItems.filter((item: any) => {
      return matchesProductSearch(item.name, searchLower);
    });
  }, [menuCategories, searchTerm]);

  // Initialize form data when order changes
  useEffect(() => {
    if (order) {
      const details =
        typeof order.orderDetails === "string"
          ? JSON.parse(order.orderDetails)
          : order.orderDetails;
      const productsById = new Map(
        products.map((product: any) => [Number(product.id), product])
      );
      const nextItems: OrderItem[] = (details.items || []).map(
        (item: any, index: number) => {
          const productId = Number(item.id);
          const product = productsById.get(productId);

          return {
            lineId: `${order.id}-${productId || item.id}-${index}`,
            id: productId,
            name: item.name,
            price: Number(item.price || product?.price || 0),
            quantity: Number(item.quantity || 1),
            specialRequest: item.specialRequest || "",
            selectedOptions: item.selectedOptions || item.optionType || [],
            optionTypes: product?.optionTypes || item.optionTypes || [],
            image:
              item.image ||
              product?.image_url ||
              (typeof cuisine1_photo === "string"
                ? cuisine1_photo
                : cuisine1_photo.src),
            description: item.description || product?.description || "",
          };
        }
      );

      setOrderItems(nextItems);
      setQuantityDrafts(
        nextItems.reduce<Record<string, string>>((drafts, item) => {
          drafts[item.lineId] = String(item.quantity);
          return drafts;
        }, {})
      );
      const nextUserData = {
        name: order.user?.name || "",
        email: order.user?.email || "",
        phoneNumber: order.user?.phoneNumber || "",
        deliveryAddressDetails: order.user?.deliveryAddressDetails || null,
        allergyInfo: order.user?.allergyInfo || "",
        notes: order.user?.notes || "",
      };
      setUserData(nextUserData);
      setCustomerForm(nextUserData);
      setFulfillmentType(order.fulfillmentType);
      setFulfillmentTimingType(order.fulfillmentTimingType);
      setScheduledTime(getTorontoTimeValue(order.scheduledTime));
      setDeliveryChargeDraft(String(Number(details.deliveryCharge || 0)));
      setAdditionalNote(details.additionalNote || "");
      setOrderAllergyInfo(
        details.allergyInfo || order.user?.allergyInfo || ""
      );
      setDeliveryAddressDetails(details.deliveryAddressDetails || null);
      setPriceConfirmOpen(false);
      setOrderError("");
    }
  }, [order, products]);

  const getValidationError = () => {
    if (!isDirty) return "No changes have been made.";
    if (orderItems.length === 0) return "Please add at least one order item.";
    if (getMissingRequiredOptions().length > 0) {
      return "Please choose all required options before saving.";
    }
    const customOptionError = orderItems
      .map((item) =>
        getAdminCustomOptionValidationError(item.selectedOptions)
      )
      .find(Boolean);
    if (customOptionError) return customOptionError;
    if (fulfillmentTimingType === "SCHEDULED" && !scheduledTime) {
      return "Please choose a scheduled time before saving.";
    }
    if (fulfillmentType === "delivery") {
      if (!deliveryAddressSchema.safeParse(deliveryAddressDetails).success) {
        return "Please select and complete a verified delivery address.";
      }
      if (!deliveryChargeDraft.trim()) {
        return "Please enter a delivery fee.";
      }
      if (!Number.isFinite(Number(deliveryChargeDraft)) || activeDeliveryCharge < 0) {
        return "Delivery fee must be a valid amount of $0 or more.";
      }
      if (itemsSubtotal < DELIVERY_MINIMUM_SUBTOTAL) {
        return `Delivery orders must be at least $${DELIVERY_MINIMUM_SUBTOTAL.toFixed(
          2
        )} before tax.`;
      }
    }
    return "";
  };

  const saveOrder = async () => {
    if (!order) return;

    let nextScheduledTime: string | undefined;
    if (fulfillmentTimingType === "SCHEDULED") {
      const [hour, minute] = scheduledTime.split(":").map(Number);
      const baseDate = order.scheduledTime
        ? DateTime.fromJSDate(new Date(order.scheduledTime)).setZone(
            STORE_CONFIG.timeZone
          )
        : DateTime.now().setZone(STORE_CONFIG.timeZone);
      nextScheduledTime =
        baseDate
          .set({ hour, minute, second: 0, millisecond: 0 })
          .toUTC()
          .toISO() || undefined;
    }

    setOrderError("");
    setIsLoading(true);
    try {
      await updateOrderDetails.mutateAsync({
        orderId: order.id,
        updatedDetails: {
          ...orderDetails,
          items: getPersistedItems(orderItems),
          deliveryAddress:
            fulfillmentType === "delivery"
              ? deliveryAddressDetails?.formattedAddress
              : null,
          deliveryAddressDetails:
            fulfillmentType === "delivery" ? deliveryAddressDetails : null,
          deliveryCharge:
            fulfillmentType === "delivery" ? activeDeliveryCharge : 0,
          additionalNote,
          allergyInfo: orderAllergyInfo,
        },
        order,
        notifyCustomer: priceChanged,
        priceChanged,
        orderUpdates: {
          fulfillmentType,
          fulfillmentTimingType,
          recalculateTotal: true,
          ...(nextScheduledTime ? { scheduledTime: nextScheduledTime } : {}),
        },
      });
      setPriceConfirmOpen(false);
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save the order.";
      console.error("Failed to update order:", error);
      setPriceConfirmOpen(false);
      setOrderError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    const validationError = getValidationError();
    if (validationError) {
      setOrderError(validationError);
      toast.error(validationError);
      return;
    }

    setOrderError("");
    if (priceChanged) {
      setPriceConfirmOpen(true);
      return;
    }

    void saveOrder();
  };

  const handleRemoveOrder = async () => {
    if (!order) return;

    setIsLoading(true);
    try {
      await deleteOrder.mutateAsync(order.id);
      setRemoveConfirmOpen(false);
      setOpen(false);
    } catch (error) {
      console.error("Failed to remove order:", error);
      setOrderError("Failed to remove order.");
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = (index: number) => {
    const itemToRemove = orderItems[index];
    setOrderItems(orderItems.filter((_, i) => i !== index));
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

  // Add item from menu
  const addItemFromMenu = (product: any) => {
    const imageUrl =
      typeof product.image === "string"
        ? product.image
        : product.image && "src" in product.image
        ? product.image.src
        : cuisine1_photo.src;

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

  const updateItemQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(index);
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
      updateItemQuantity(index, nextQuantity);
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

  const updateOrderItemSpecialRequest = (
    lineId: string,
    specialRequest: string
  ) => {
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

  const handleOpenEditCustomerPrompt = () => {
    setOrderError("");
    setCustomerForm(userData);
    setCustomerPromptOpen(true);
  };

  const handleCustomerFormChange = (
    field: keyof CustomerFormData,
    value: string
  ) => {
    setCustomerForm((current) => ({ ...current, [field]: value }));
  };

  const handleSaveCustomerPrompt = async () => {
    if (!order?.user?.id) return;

    if (!customerForm.name.trim()) {
      setOrderError("Customer name is required.");
      return;
    }

    if (
      customerForm.deliveryAddressDetails &&
      !deliveryAddressSchema.safeParse(customerForm.deliveryAddressDetails)
        .success
    ) {
      setOrderError("Please complete all required delivery address fields.");
      return;
    }

    let customerSaved = false;
    try {
      const updatedCustomer = await updateUserInfo.mutateAsync({
        id: order.user.id,
        name: customerForm.name.trim(),
        phoneNumber: customerForm.phoneNumber,
        email: customerForm.email,
        deliveryAddressDetails: customerForm.deliveryAddressDetails,
        allergyInfo: customerForm.allergyInfo,
        notes: customerForm.notes,
      });
      customerSaved = true;

      const updatedDeliveryAddressDetails =
        updatedCustomer.deliveryAddressDetails ??
        customerForm.deliveryAddressDetails;
      const updatedAllergyInfo =
        typeof updatedCustomer.allergyInfo === "string"
          ? updatedCustomer.allergyInfo
          : customerForm.allergyInfo;

      if (updatedAllergyInfo !== orderAllergyInfo) {
        await updateOrderDetails.mutateAsync({
          orderId: order.id,
          updatedDetails: {
            ...orderDetails,
            allergyInfo: updatedAllergyInfo,
          },
          order,
        });
        setOrderAllergyInfo(updatedAllergyInfo);
      }

      setUserData({
        name: updatedCustomer.name || customerForm.name,
        email: updatedCustomer.email || customerForm.email,
        phoneNumber: updatedCustomer.phoneNumber || customerForm.phoneNumber,
        deliveryAddressDetails: updatedDeliveryAddressDetails,
        allergyInfo: updatedAllergyInfo,
        notes: updatedCustomer.notes || customerForm.notes,
      });
      setDeliveryAddressDetails(updatedDeliveryAddressDetails);
      setCustomerPromptOpen(false);
      setOrderError("");
    } catch (error) {
      setOrderError(
        customerSaved
          ? "Customer was updated, but Allergy Info was not applied to this order. Please try again."
          : "Failed to update customer information."
      );
    }
  };

  const calculateTotal = () => calculateOrderItemsTotal(orderItems);

  if (!order) return null;

  const orderDetails =
    typeof order.orderDetails === "string"
      ? JSON.parse(order.orderDetails)
      : order.orderDetails || {};
  const originalItems = Array.isArray(orderDetails.items)
    ? orderDetails.items
    : [];
  const originalDeliveryCharge =
    order.fulfillmentType === "delivery"
      ? Number(orderDetails.deliveryCharge || 0)
      : 0;
  const originalDeliveryAddressDetails =
    order.fulfillmentType === "delivery"
      ? orderDetails.deliveryAddressDetails || null
      : null;
  const originalScheduledTime =
    order.fulfillmentTimingType === "SCHEDULED"
      ? getTorontoTimeValue(order.scheduledTime)
      : "";
  const parsedDeliveryCharge = Number(deliveryChargeDraft);
  const activeDeliveryCharge =
    fulfillmentType === "delivery" && Number.isFinite(parsedDeliveryCharge)
      ? roundMoney(parsedDeliveryCharge)
      : 0;
  const itemsSubtotal = roundMoney(calculateTotal());
  const taxableSubtotal = itemsSubtotal + activeDeliveryCharge;
  const tax = roundMoney(taxableSubtotal * 0.13);
  const calculatedTotal = roundMoney(taxableSubtotal + tax);
  const priceChanged =
    Math.abs(calculatedTotal - Number(order.totalAmount || 0)) >= 0.01;
  const isDirty =
    JSON.stringify({
      items: getComparableItems(orderItems, true),
      fulfillmentType,
      fulfillmentTimingType,
      scheduledTime:
        fulfillmentTimingType === "SCHEDULED" ? scheduledTime : "",
      deliveryAddressDetails:
        fulfillmentType === "delivery" ? deliveryAddressDetails : null,
      deliveryCharge:
        fulfillmentType === "delivery" ? activeDeliveryCharge : 0,
      additionalNote,
    }) !==
    JSON.stringify({
      items: getComparableItems(originalItems, true),
      fulfillmentType: order.fulfillmentType,
      fulfillmentTimingType: order.fulfillmentTimingType,
      scheduledTime: originalScheduledTime,
      deliveryAddressDetails: originalDeliveryAddressDetails,
      deliveryCharge: originalDeliveryCharge,
      additionalNote: orderDetails.additionalNote || "",
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1280px] flex-col overflow-hidden p-4 sm:p-6 [&>button]:flex [&>button]:h-12 [&>button]:w-12 [&>button]:items-center [&>button]:justify-center">
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Order #{order.id}</DialogTitle>
          <DialogDescription>
            Make changes to the order details here. Click save when you&apos;re
            done.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScrollArea className="min-h-0 flex-1 rounded-md border">
            <div className="space-y-4 p-4">
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
                        {formatCanadianPhoneNumber(userData.phoneNumber)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <div className="font-medium">{userData.name}</div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <span className="text-muted-foreground">Address</span>
                    <div className="font-medium">
                      {userData.deliveryAddressDetails?.formattedAddress || "-"}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <span className="text-muted-foreground">Allergy Info</span>
                      <div className="font-medium">
                        {userData.allergyInfo || "-"}
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <span className="text-muted-foreground">Admin Notes</span>
                      <div className="font-medium">{userData.notes || "-"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4 rounded-lg border-[1.5px] border-gray-300 bg-muted/20 p-4 shadow-sm sm:p-6">
                <div className="flex items-center gap-2 font-medium">
                  <ShoppingCart className="h-4 w-4" />
                  Orders
                </div>

                <Card className="rounded-md border-[1.5px] border-gray-300 bg-card shadow-sm">
                  <CardContent className="grid gap-4 p-4 md:grid-cols-2 sm:p-5">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="font-semibold">
                          Fulfillment Type
                        </Label>
                        <RadioGroup
                          value={fulfillmentType}
                          onValueChange={(value) => {
                            const nextType = value as
                              | "pickup"
                              | "delivery"
                              | "dineIn";
                            setFulfillmentType(nextType);
                            if (nextType === "delivery") {
                              if (!deliveryAddressDetails) {
                                setDeliveryAddressDetails(
                                  userData.deliveryAddressDetails
                                );
                              }
                              if (
                                order.fulfillmentType !== "delivery" &&
                                Number(deliveryChargeDraft) === 0
                              ) {
                                setDeliveryChargeDraft("");
                              }
                            }
                          }}
                          className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                        >
                          <div className="relative">
                            <RadioGroupItem
                              value="pickup"
                              id="edit-pickup"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="edit-pickup"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Pickup
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem
                              value="delivery"
                              id="edit-delivery"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="edit-delivery"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Delivery
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {fulfillmentType === "delivery" && (
                        <div className="space-y-2">
                          <Label htmlFor="editDeliveryCharge">
                            Delivery Fee
                          </Label>
                          <Input
                            id="editDeliveryCharge"
                            type="number"
                            min="0"
                            step="0.5"
                            value={deliveryChargeDraft}
                            onChange={(event) =>
                              setDeliveryChargeDraft(event.target.value)
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="font-semibold">Timing</Label>
                        <RadioGroup
                          value={fulfillmentTimingType}
                          onValueChange={(value) =>
                            setFulfillmentTimingType(
                              value as "ASAP" | "SCHEDULED"
                            )
                          }
                          className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
                        >
                          <div className="relative">
                            <RadioGroupItem
                              value="ASAP"
                              id="edit-asap"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="edit-asap"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Now
                            </Label>
                          </div>
                          <div className="relative">
                            <RadioGroupItem
                              value="SCHEDULED"
                              id="edit-scheduled"
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor="edit-scheduled"
                              className="flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full px-2 py-2 text-center font-medium transition-all peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm"
                            >
                              Scheduled
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {fulfillmentTimingType === "SCHEDULED" && (
                        <div className="space-y-2">
                          <Label htmlFor="editScheduledTime">
                            Scheduled Time
                          </Label>
                          <Input
                            id="editScheduledTime"
                            type="time"
                            value={scheduledTime}
                            onChange={(event) =>
                              setScheduledTime(event.target.value)
                            }
                            required
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <OrderMenuSearch
                  value={searchTerm}
                  open={menuSearchOpen}
                  loading={isLoadingProducts || isLoadingCollections}
                  results={menuSearchResults}
                  onValueChange={setSearchTerm}
                  onOpenChange={setMenuSearchOpen}
                  onAdd={addItemFromMenu}
                />

                <EditableOrderItemsTable
                  items={orderItems}
                  allowCustomOptions
                  quantityDrafts={quantityDrafts}
                  onQuantityChange={updateItemQuantity}
                  onQuantityDraftChange={handleQuantityDraftChange}
                  onQuantityDraftBlur={handleQuantityDraftBlur}
                  onOptionsChange={updateOrderItemOptions}
                  onRequirementsChange={updateOrderItemRequirements}
                  onSpecialRequestChange={updateOrderItemSpecialRequest}
                  onRemove={removeItem}
                />

                <div className="flex flex-col gap-3 rounded-md border border-gray-300 bg-card p-3 shadow-sm sm:p-4 lg:flex-row lg:items-start lg:justify-end">
                  <div className="w-full flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="editOrderAdditionalNote">
                        Additional Note
                      </Label>
                      <Textarea
                        id="editOrderAdditionalNote"
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
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 lg:max-w-[420px]">
                        {orderError}
                      </div>
                    )}
                  </div>
                  <div className="ml-auto w-full space-y-2 sm:max-w-[320px]">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>${itemsSubtotal.toFixed(2)}</span>
                    </div>
                    {fulfillmentType === "delivery" && (
                      <div className="flex justify-between text-sm">
                        <span>Delivery Charge</span>
                        <span>${activeDeliveryCharge.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Tax (13%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>${calculatedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4 shrink-0">
          <Button
            variant="destructive"
            onClick={() => setRemoveConfirmOpen(true)}
            disabled={isLoading}
            className="min-h-12 sm:mr-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove order
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} className="min-h-12">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isDirty} className="min-h-12">
            {isLoading ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>

        <Dialog open={customerPromptOpen} onOpenChange={setCustomerPromptOpen}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl [&>button]:h-12 [&>button]:w-12">
            <DialogHeader>
              <DialogTitle>Edit Customer</DialogTitle>
            </DialogHeader>
            {orderError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {orderError}
              </div>
            )}
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="editOrderCustomerPhone">
                      Phone Number
                    </Label>
                    <Input
                      id="editOrderCustomerPhone"
                      value={formatCanadianPhoneNumber(
                        customerForm.phoneNumber
                      )}
                      disabled
                    />
                  </div>
                  <div>
                    <Label htmlFor="editOrderCustomerName">Name</Label>
                    <Input
                      id="editOrderCustomerName"
                      value={customerForm.name}
                      onChange={(event) =>
                        handleCustomerFormChange("name", event.target.value)
                      }
                    />
                  </div>
                </div>

                <DeliveryAddressForm
                  value={customerForm.deliveryAddressDetails}
                  onChange={(deliveryAddressDetails) =>
                    setCustomerForm((current) => ({
                      ...current,
                      deliveryAddressDetails,
                    }))
                  }
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="editOrderCustomerAllergy">
                      Allergy Info
                    </Label>
                    <Textarea
                      id="editOrderCustomerAllergy"
                      value={customerForm.allergyInfo}
                      onChange={(event) =>
                        handleCustomerFormChange("allergyInfo", event.target.value)
                      }
                      placeholder="Enter allergy information..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="editOrderCustomerNotes">Admin Notes</Label>
                    <Textarea
                      id="editOrderCustomerNotes"
                      value={customerForm.notes}
                      onChange={(event) =>
                        handleCustomerFormChange("notes", event.target.value)
                      }
                      placeholder="Enter admin-only notes..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCustomerPromptOpen(false)}
                  className="min-h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveCustomerPrompt}
                  disabled={
                    !isCustomerFormValid || updateUserInfo.isPending
                  }
                  className="min-h-12"
                >
                  Save Customer
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={priceConfirmOpen} onOpenChange={setPriceConfirmOpen}>
          <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm price change</AlertDialogTitle>
              <AlertDialogDescription>
                Review the updated total before saving this order.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span>Previous total</span>
                <span>${Number(order.totalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>New total</span>
                <span>${calculatedTotal.toFixed(2)}</span>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading} className="min-h-12">
                Keep editing
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void saveOrder()}
                disabled={isLoading}
                className="min-h-12"
              >
                {isLoading ? "Saving..." : "Confirm and save"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
          <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Order #{order.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the order and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading} className="min-h-12">
                Keep order
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveOrder}
                disabled={isLoading}
                className="min-h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isLoading ? "Removing..." : "Remove order"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
