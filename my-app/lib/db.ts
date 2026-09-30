import { drizzle } from "drizzle-orm/node-postgres"; // Adapter for PostgreSQL
import { sql } from "drizzle-orm";
import pkg from "pg";
import {
  pgTable,
  text,
  numeric,
  integer,
  pgEnum,
  serial,
  boolean,
  timestamp,
  uuid,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { json, jsonb } from "drizzle-orm/pg-core";
import type { DeliveryAddressDetails } from "@/lib/types";

const { Pool } = pkg;

type PgPool = InstanceType<typeof Pool>;

const globalForPg = globalThis as unknown as {
  gourmetExpressPool?: PgPool;
};

const configuredPoolSize = Number(process.env.DATABASE_POOL_MAX ?? "1");
const poolSize =
  Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
    ? configuredPoolSize
    : 1;

const pool =
  globalForPg.gourmetExpressPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // The database URL uses a session pooler with a small global client limit.
    // Keep each Next.js instance conservative; pg queues concurrent queries.
    max: poolSize,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

// Reuse the pool across module reloads and repeated module evaluation in the
// same runtime. This is important in both development and production.
globalForPg.gourmetExpressPool = pool;

export { pool };

// Define an enum if your status is really an enum; if it's just a string, you could use text instead.
export const statusEnum = pgEnum("status", ["active", "inactive"]);
export const orderStatusEnum = pgEnum("product_status", [
  "pending",
  "confirmed",
  "ready",
  "completed",
  "canceled",
]);
export const roleEnum = pgEnum("role", ["customer", "admin"]);
export const fulfillmentTypeEnum = pgEnum("fulfillment_type", [
  "pickup",
  "delivery",
  "dineIn",
]);
export const fulfillmentTimingTypeEnum = pgEnum("fulfillment_timing_type", [
  "ASAP",
  "SCHEDULED",
]);
// Update the table name to "product" (all lowercase) and use the correct id column name "product_id"
export const collections = pgTable("collection", {
  id: serial("collection_id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  status: statusEnum("status").default("active").notNull(),
});

export const products = pgTable(
  "product",
  {
    id: serial("product_id").primaryKey(),
    collection_id: integer("collection_id")
      .notNull()
      .references(() => collections.id),
    description: text("description"),
    image_url: text("image_url"),
    name: text("name").notNull(),
    status: statusEnum("status").default("active").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("product_status_collection_idx").on(
      table.status,
      table.collection_id
    ),
    index("product_collection_status_idx").on(
      table.collection_id,
      table.status
    ),
  ]
);

export const optionTypes = pgTable("option_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  required: boolean("required").notNull().default(true),
});

export const optionItems = pgTable("option_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull(),
  additionalPrice: numeric("additional_price", {
    precision: 10,
    scale: 2,
  }).notNull().default("0"),
  optionType: uuid("option_type")
    .notNull()
    .references(() => optionTypes.id),
  sortOrder: integer("sort_order").default(0),
});

export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id),
    optionId: uuid("option_type_id")
      .notNull()
      .references(() => optionTypes.id),
    sortOrder: integer("sort_order").default(0),
  },
  (table) => [
    index("product_options_product_option_idx").on(
      table.productId,
      table.optionId
    ),
  ]
);

export const users = pgTable("user", {
  id: serial("user_id").primaryKey(),
  email: text("email"),
  name: text("name").notNull(),
  role: roleEnum("role").default("customer").notNull(),
  isVerified: boolean("is_verified").notNull().default(false),
  phoneNumber: text("phone_number").unique(),
  smsAgreement: boolean("sms_agreement").notNull().default(true),
  allergyInfo: text("allergy_info"),
  address: text("address"),
  deliveryAddressDetails: jsonb("delivery_address_details")
    .$type<DeliveryAddressDetails>(),
  notes: text("notes"),
  status: statusEnum("status").default("active").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const orders = pgTable(
  "order",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    status: orderStatusEnum("status").default("pending").notNull(),
    fulfillmentType: fulfillmentTypeEnum("fulfillment_type")
      .default("pickup")
      .notNull(),
    fulfillmentTimingType: fulfillmentTimingTypeEnum("fulfillment_timing_type")
      .default("ASAP")
      .notNull(),
    scheduledTime: timestamp("scheduled_time", { withTimezone: true }),
    orderDetails: json("order_details").notNull(),
    reasonForCancel: text("reason_for_cancel"),
    idempotencyKey: text("idempotency_key"),
  },
  (table) => [
    index("order_user_id_created_at_idx").on(
      table.userId,
      table.createdAt.desc()
    ),
    index("order_status_created_at_idx").on(
      table.status,
      table.createdAt
    ),
    index("order_created_at_idx").on(table.createdAt.desc()),
    uniqueIndex("order_user_idempotency_key_idx").on(
      table.userId,
      table.idempotencyKey
    ),
  ]
);

export const storeHours = pgTable("store_hours", {
  id: serial("id").primaryKey(),
  dayOfWeek: text("day_of_week").notNull().unique(),
  openTime: text("open_time").notNull(),
  closeTime: text("close_time").notNull(),
  isOpen: boolean("is_open").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storeControls = pgTable(
  "store_controls",
  {
    id: integer("id").primaryKey().default(1),
    isClosed: boolean("is_closed").default(false).notNull(),
    closureMessage: text("closure_message"),
    isMaintenanceActive: boolean("is_maintenance_active")
      .default(false)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("store_controls_singleton_check", sql`${table.id} = 1`),
    check(
      "store_controls_closure_message_check",
      sql`(
        ${table.isClosed}
        AND ${table.closureMessage} IS NOT NULL
        AND length(btrim(${table.closureMessage})) > 0
      ) OR (
        NOT ${table.isClosed}
        AND ${table.closureMessage} IS NULL
      )`
    ),
  ]
);

export const query = async (text: string, params?: any[]) =>
  pool.query(text, params);
// Initialize Drizzle ORM with the pool (this connects to Firebase PostgreSQL)
export const db = drizzle(pool);

export default pool;
