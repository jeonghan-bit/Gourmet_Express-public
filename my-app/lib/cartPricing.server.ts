import "server-only";

import { pool } from "@/lib/db";
import { UUID_PATTERN } from "@/lib/optionValidation";
import type { OptionSelection } from "@/lib/types";
import {
  isAdminCustomOption,
  isAdminRemoveOption,
  normalizeAdminCustomOptions,
  stripAdminOrderOverrides,
} from "@/lib/adminCustomOption";
import { normalizeProductDisplayName } from "@/lib/utils";

export const MAX_CART_ITEMS = 100;
export const MAX_QUANTITY_PER_ITEM = 99;

const MAX_SELECTED_OPTIONS_PER_ITEM = 100;
const MAX_SELECTED_OPTIONS_PER_CART = 1_000;

export type CartItemInput = {
  id: unknown;
  quantity: unknown;
  specialRequest?: unknown;
  selectedOptions?: unknown;
  optionType?: unknown;
};

type ProductPriceRow = {
  id: number;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
};

type OptionItemPriceRow = {
  id: string;
  optionTypeId: string;
  optionTypeName: string;
  label: string;
  additionalPrice: string;
};

type ProductOptionRelationRow = {
  productId: number;
  optionTypeId: string;
  required: boolean;
};

export type HydratedCartItem = {
  id: number;
  name: string;
  description: string;
  image: string;
  quantity: number;
  price: number;
  specialRequest: unknown;
  selectedOptions: OptionSelection[];
  additionalPrice: number;
};

export class CartValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CartValidationError";
  }
}

function readSelectedItemIds(item: CartItemInput): string[] {
  const selections =
    Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0
    ? item.selectedOptions
    : Array.isArray(item.optionType)
      ? item.optionType
      : [];

  const ids = selections.flatMap((option: any) =>
    Array.isArray(option?.selectedItems)
      ? option.selectedItems.filter(
          (selectedItem: unknown): selectedItem is string =>
            typeof selectedItem === "string"
        )
      : []
  );

  return Array.from(new Set(ids));
}

export async function hydrateCartWithCurrentPrices(
  cart: CartItemInput[],
  {
    allowInactive = false,
    allowAdminCustomOptions = false,
    omitAdminOrderOverrides = false,
  }: {
    allowInactive?: boolean;
    allowAdminCustomOptions?: boolean;
    omitAdminOrderOverrides?: boolean;
  } = {}
): Promise<HydratedCartItem[]> {
  if (!Array.isArray(cart) || cart.length === 0) {
    throw new CartValidationError("This order does not contain any items.");
  }
  if (cart.length > MAX_CART_ITEMS) {
    throw new CartValidationError("Cart is too large.");
  }

  const normalizedCart = cart.map((item) => {
    const productId = Number(item.id);
    const quantity = Number(item.quantity);
    let normalizedSelections: OptionSelection[] | undefined;
    const rawSelections = Array.isArray(item.selectedOptions)
      ? item.selectedOptions
      : [];
    const hasAdminOrderOverride = rawSelections.some(
      (option) =>
        isAdminCustomOption(option) || isAdminRemoveOption(option)
    );
    if (omitAdminOrderOverrides) {
      normalizedSelections = stripAdminOrderOverrides(rawSelections);
    } else if (allowAdminCustomOptions) {
      try {
        normalizedSelections = normalizeAdminCustomOptions(
          rawSelections
        );
      } catch (error) {
        throw new CartValidationError(
          error instanceof Error ? error.message : "Invalid custom option."
        );
      }
    } else if (hasAdminOrderOverride) {
      throw new CartValidationError("Cart contains an admin-only option.");
    }
    const selectedItemIds = readSelectedItemIds(
      normalizedSelections
        ? { ...item, selectedOptions: normalizedSelections }
        : item
    );
    const customOption = normalizedSelections?.find(isAdminCustomOption);
    const removeOptions =
      normalizedSelections?.filter(isAdminRemoveOption) as
        | OptionSelection[]
        | undefined;

    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_QUANTITY_PER_ITEM ||
      selectedItemIds.length > MAX_SELECTED_OPTIONS_PER_ITEM
    ) {
      throw new CartValidationError("Cart contains an invalid item.");
    }

    return {
      item,
      productId,
      quantity,
      selectedItemIds,
      customOption,
      removeOptions: removeOptions || [],
    };
  });

  const productIds = Array.from(
    new Set(normalizedCart.map((item) => item.productId))
  );
  const selectedItemIds = Array.from(
    new Set(normalizedCart.flatMap((item) => item.selectedItemIds))
  );

  if (selectedItemIds.length > MAX_SELECTED_OPTIONS_PER_CART) {
    throw new CartValidationError("Cart contains too many selected options.");
  }
  if (!selectedItemIds.every((id) => UUID_PATTERN.test(id))) {
    throw new CartValidationError("Cart contains an invalid option.");
  }

  const [productResult, optionResult, productOptionResult] = await Promise.all([
    pool.query<ProductPriceRow>(
      `select
         p.product_id as id,
         p.name,
         p.description,
         p.price::text,
         p.image_url as "imageUrl"
       from product p
       join collection c on c.collection_id = p.collection_id
       where p.product_id = any($1::int[])
         and ($2::boolean or (p.status = 'active' and c.status = 'active'))`,
      [productIds, allowInactive]
    ),
    selectedItemIds.length > 0
      ? pool.query<OptionItemPriceRow>(
          `select
             oi.id::text,
             oi.option_type::text as "optionTypeId",
             ot.name as "optionTypeName",
             oi.label,
             oi.additional_price::text as "additionalPrice"
           from option_items oi
           join option_types ot on ot.id = oi.option_type
           where oi.id = any($1::uuid[])`,
          [selectedItemIds]
        )
      : Promise.resolve({ rows: [] as OptionItemPriceRow[] }),
    pool.query<ProductOptionRelationRow>(
      `select
         po.product_id as "productId",
         po.option_type_id::text as "optionTypeId",
         ot.required
       from product_options po
       join option_types ot on ot.id = po.option_type_id
       where po.product_id = any($1::int[])`,
      [productIds]
    ),
  ]);

  const productsById = new Map(
    productResult.rows.map((product) => [product.id, product])
  );
  if (productsById.size !== productIds.length) {
    throw new CartValidationError(
      "One or more items are no longer available. Please order them from the current menu."
    );
  }

  const optionsById = new Map(
    optionResult.rows.map((option) => [option.id, option])
  );
  if (optionsById.size !== selectedItemIds.length) {
    throw new CartValidationError(
      "One or more selected options are no longer available."
    );
  }

  const optionRulesByProduct = productOptionResult.rows.reduce<
    Map<number, Map<string, boolean>>
  >((rules, row) => {
    const productRules = rules.get(row.productId) ?? new Map<string, boolean>();
    productRules.set(row.optionTypeId, row.required);
    rules.set(row.productId, productRules);
    return rules;
  }, new Map());

  return normalizedCart.map(
    ({
      item,
      productId,
      quantity,
      selectedItemIds,
      customOption,
      removeOptions,
    }) => {
    const product = productsById.get(productId)!;
    const productOptionRules =
      optionRulesByProduct.get(productId) ?? new Map<string, boolean>();
    const selectedOptions = selectedItemIds.map((id) => optionsById.get(id)!);
    const selectedOptionTypeIds = new Set(
      selectedOptions.map((option) => option.optionTypeId)
    );
    removeOptions.forEach((option) =>
      selectedOptionTypeIds.add(option.optionTypeId)
    );

    const hasUnrelatedOption = selectedOptions.some(
      (option) => !productOptionRules.has(option.optionTypeId)
    );
    const hasUnrelatedRemoveOption = removeOptions.some(
      (option) => !productOptionRules.has(option.optionTypeId)
    );
    const isMissingRequiredOption = Array.from(productOptionRules).some(
      ([optionTypeId, required]) =>
        required && !selectedOptionTypeIds.has(optionTypeId)
    );
    if (
      hasUnrelatedOption ||
      hasUnrelatedRemoveOption ||
      isMissingRequiredOption
    ) {
      throw new CartValidationError(
        `${product.name}'s options have changed. Please configure this item again from the current menu.`
      );
    }

    const selectionsByType = selectedOptions.reduce<
      Map<string, OptionSelection>
    >((groups, option) => {
      const selection = groups.get(option.optionTypeId) ?? {
        optionTypeId: option.optionTypeId,
        optionType: option.optionTypeName,
        selectedItems: [],
        selectedItemLabels: [],
        selectedItemPrices: [],
      };
      selection.selectedItems.push(option.id);
      selection.selectedItemLabels.push(option.label);
      selection.selectedItemPrices.push(option.additionalPrice);
      groups.set(option.optionTypeId, selection);
      return groups;
    }, new Map());

    const currentSelections = Array.from(selectionsByType.values());
    const customOptionPrice = customOption
      ? Number(customOption.selectedItemPrices[0])
      : 0;

    return {
      id: productId,
      name: normalizeProductDisplayName(product.name),
      description: product.description ?? "",
      image: product.imageUrl ?? "",
      quantity,
      price: Number(product.price),
      specialRequest:
        typeof item.specialRequest === "string"
          ? item.specialRequest.slice(0, 500)
          : undefined,
      selectedOptions: customOption
        ? [...currentSelections, ...removeOptions, customOption]
        : currentSelections,
      additionalPrice: selectedOptions.reduce(
        (sum, option) => sum + Number(option.additionalPrice),
        customOptionPrice
      ),
    };
  });
}
