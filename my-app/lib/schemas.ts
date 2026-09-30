import { z } from "zod";
import { normalizeProductDisplayName } from "@/lib/utils";

export const deliveryAddressSchema = z
  .object({
    formattedAddress: z.string().trim().min(1).max(500),
    placeId: z.string().trim().min(1).max(500),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    postalCode: z.string().trim().min(1).max(20),
    verificationToken: z.string().min(20).max(500),
    addressType: z.enum(["house", "building"]),
    unitNumber: z.string().trim().max(50).optional(),
    accessMethod: z
      .enum(["buzzer", "call_on_arrival", "none"])
      .optional(),
    buzzerCode: z.string().trim().max(50).optional(),
    deliveryInstructions: z.string().trim().max(500).optional(),
  })
  .superRefine((address, context) => {
    if (address.addressType !== "building") return;

    if (!address.unitNumber) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitNumber"],
        message: "Apartment or unit number is required",
      });
    }

    if (!address.accessMethod) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accessMethod"],
        message: "Please select a building access method",
      });
    }

    if (address.accessMethod === "buzzer" && !address.buzzerCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["buzzerCode"],
        message: "Buzzer code is required",
      });
    }
  });

export type DeliveryAddressInput = z.infer<typeof deliveryAddressSchema>;

export const insertProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200)
    .transform(normalizeProductDisplayName),
  price: z.coerce.number().min(1, "Price is required"),
  collection_id: z.number().int().positive("Collection is required"),
  description: z.string().max(2000).optional(),
  image_url: z.string().max(2048).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const insertStoreHoursSchema = z.object({
  dayOfWeek: z.string().trim().min(1, "Day of week is required").max(20),
  openTime: z.string().trim().min(1, "Open time is required").max(20),
  closeTime: z.string().trim().min(1, "Close time is required").max(20),
  isOpen: z.boolean().optional(),
});

export const updateStoreHoursSchema = z.object({
  dayOfWeek: z.string().trim().min(1).max(20).optional(),
  openTime: z.string().trim().min(1).max(20).optional(),
  closeTime: z.string().trim().min(1).max(20).optional(),
  isOpen: z.boolean().optional(),
});

export const updateTemporaryClosureSchema = z
  .object({
    isClosed: z.boolean(),
    closureMessage: z.string().trim().max(1000).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.isClosed && !value.closureMessage) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["closureMessage"],
        message: "Closure message is required when the store is closed",
      });
    }
  });

export const insertUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phoneNumber: z.string().trim().min(1, "Phone number is required").max(20),
  createdAt: z.string().min(1, "CreatedAt required"),
  updatedAt: z.string().min(1, "UpdatedAt required"),
  email: z.string().max(320).optional(),
  role: z.enum(["customer", "admin"]).optional(),
  isVerified: z.boolean().optional(),
  smsAgreement: z.boolean().optional(),
  allergyInfo: z.string().max(500).optional(),
  deliveryAddressDetails: deliveryAddressSchema.nullable().optional(),
  notes: z.string().max(2000).optional(),
});
export const insertCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  order: z.number().int().min(0),
  status: z.enum(["active", "inactive"]).default("active"),
});
// Product schemas
export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200)
    .transform(normalizeProductDisplayName),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  description: z.string().max(2000).optional(),
  image_url: z.string().max(2048).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  collection_id: z.number().int().positive("Collection is required"),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200)
    .transform(normalizeProductDisplayName)
    .optional(),
  price: z.string().min(1, "Price is required").max(30).optional(),
  description: z.string().max(2000).optional(),
  image_url: z.string().max(2048).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  collection_id: z.number().int().positive("Collection is required").optional(),
});

// User schemas
export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  email: z.string().max(320).nullable().optional(),
  phoneNumber: z.string().trim().max(20).optional(),
  allergyInfo: z.string().max(500).nullable().optional(),
  deliveryAddressDetails: deliveryAddressSchema.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  role: z.enum(["customer", "admin"]).optional(),
  isVerified: z.boolean().optional(),
  smsAgreement: z.boolean().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const updatePersonalUserSchema = updateUserSchema.pick({
  name: true,
  email: true,
  allergyInfo: true,
  deliveryAddressDetails: true,
  smsAgreement: true,
});

// Collection schemas
export const updateCollectionSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200).optional(),
  order: z.number().int().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// Order schemas
export const updateOrderSchema = z.object({
  userId: z.number().int().positive("User ID is required").optional(),
  totalAmount: z.string().min(1, "Total amount is required").optional(),
  fulfillmentType: z.enum(["pickup", "delivery", "dineIn"]).optional(),
  fulfillmentTimingType: z.enum(["ASAP", "SCHEDULED"]).optional(),
  status: z
    .enum(["pending", "confirmed", "ready", "completed", "canceled"])
    .optional(),
  scheduledTime: z.string().optional(),
  orderDetails: z.any().optional(),
  reasonForCancel: z.string().optional(),
});
