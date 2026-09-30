// Type definitions that can be imported by client components

export type DeliveryAddressDetails = {
  formattedAddress: string;
  placeId: string;
  latitude: number;
  longitude: number;
  postalCode: string;
  verificationToken: string;
  addressType: "house" | "building";
  unitNumber?: string;
  accessMethod?: "buzzer" | "call_on_arrival" | "none";
  buzzerCode?: string;
  deliveryInstructions?: string;
};

export interface SelectProduct {
  id: number;
  collection_id: number;
  description: string | null;
  image_url: string | null;
  name: string;
  status: "active" | "inactive";
  price: string;
}

export interface SelectStoreHours {
  id: number;
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isOpen: boolean;
}
export interface SelectOptionType {
  id: string;
  name: string;
  required: boolean;
}

export interface SelectOptionItem {
  id: string;
  label: string;
  additionalPrice: string;
  optionType?: SelectOptionType | string;
  sortOrder?: number;
}

export interface SelectProductOption {
  id: string;
  productId: number;
  optionId: string;
  optionItem: SelectOptionItem | null;
  sortOrder?: number;
}

export interface SelectUser {
  id: number;
  email: string | null;
  name: string;
  role: "customer" | "admin";
  isVerified: boolean;
  phoneNumber: string | null;
  smsAgreement: boolean;
  allergyInfo: string | null;
  address?: string | null;
  notes: string | null;
  status: "active" | "inactive";
  deliveryAddressDetails: DeliveryAddressDetails | null;
  createdAt: string;
  updatedAt: string;
  totalOrders?: number;
  lastOrderAt?: string | null;
  noShowOrders?: number;
}

export interface SelectOrder {
  id: number;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
  totalAmount: string;
  status:
    | "pending"
    | "confirmed"
    | "ready"
    | "completed"
    | "canceled";
  fulfillmentType: "pickup" | "delivery" | "dineIn";
  fulfillmentTimingType: "ASAP" | "SCHEDULED";
  scheduledTime: Date | null;
  orderDetails: any;
  reasonForCancel: string | null;
}

export interface SelectCollection {
  id: number;
  name: string;
  order: number;
  status: "active" | "inactive";
}

export interface SelectProductWithCollection extends SelectProduct {
  collection: SelectCollection | null;
}

export interface SelectOrderWithUser extends SelectOrder {
  user: SelectUser | null;
}

export interface OrderListItem extends SelectOrder {
  // List responses intentionally omit orderDetails and sensitive customer fields.
  orderDetails: null;
  user: Pick<SelectUser, "id" | "name" | "phoneNumber"> | null;
}

export interface OrdersResponse<TOrder = OrderListItem> {
  orders: TOrder[];
  totalOrders: number;
  totalAmount?: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SelectUserWithOrders extends SelectUser {
  orders: SelectOrder[] | null;
}

export interface SelectCollectionWithProducts extends SelectCollection {
  products: SelectProduct[] | null;
}

export interface SelectProductWithOptionsAndItems extends SelectProduct {
  optionitem: SelectProductOption | null;
}

export interface ProductWithOptions {
  product: SelectProduct;
  optionTypes: (SelectOptionType & {
    items: SelectOptionItem[];
  })[];
}

export interface OptionSelection {
  optionTypeId: string;
  optionType: string;
  selectedItems: string[]; // Array of option item IDs
  selectedItemLabels: string[]; // Array of option item labels for display
  selectedItemPrices: string[]; // Array of option item prices for calculation
  adminRemoveOption?: boolean;
}

export interface CartItemWithOptions {
  id: number;
  name: string;
  price: number;
  quantity: number;
  specialRequest?: string;
  selectedOptions: OptionSelection[];
  totalPrice: number; // Base price + option prices
}

export type ProductStatus = "all" | "active" | "inactive";
