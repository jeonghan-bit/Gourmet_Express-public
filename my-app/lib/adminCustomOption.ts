import type { OptionSelection } from "@/lib/types";

export const ADMIN_CUSTOM_OPTION_TYPE_ID = "admin-custom-option";
export const ADMIN_CUSTOM_OPTION_LABEL = "Custom Option";
export const ADMIN_REMOVE_OPTION_VALUE = "admin-remove-option";
export const MAX_ADMIN_CUSTOM_OPTION_LENGTH = 200;
export const MAX_ADMIN_CUSTOM_OPTION_PRICE = 9999.99;

export function isAdminCustomOption(option: unknown): boolean {
  return (
    !!option &&
    typeof option === "object" &&
    (option as Partial<OptionSelection>).optionTypeId ===
      ADMIN_CUSTOM_OPTION_TYPE_ID
  );
}

export function createAdminCustomOption(): OptionSelection {
  return {
    optionTypeId: ADMIN_CUSTOM_OPTION_TYPE_ID,
    optionType: ADMIN_CUSTOM_OPTION_LABEL,
    selectedItems: [],
    selectedItemLabels: [""],
    selectedItemPrices: [""],
  };
}

export function isAdminRemoveOption(option: unknown): boolean {
  return (
    !!option &&
    typeof option === "object" &&
    (option as Partial<OptionSelection>).adminRemoveOption === true
  );
}

export function createAdminRemoveOption(
  optionTypeId: string,
  optionType: string
): OptionSelection {
  return {
    optionTypeId,
    optionType,
    selectedItems: [],
    selectedItemLabels: [],
    selectedItemPrices: [],
    adminRemoveOption: true,
  };
}

export function normalizeAdminCustomOptions(
  selections: unknown
): OptionSelection[] {
  if (!Array.isArray(selections)) return [];

  const customOptions = selections.filter(
    isAdminCustomOption
  ) as OptionSelection[];
  const removeOptions = selections.filter(
    isAdminRemoveOption
  ) as OptionSelection[];
  if (customOptions.length > 1) {
    throw new Error("Only one custom option is allowed per order item.");
  }
  if (removeOptions.length > 0 && customOptions.length === 0) {
    throw new Error("Remove option requires a custom option.");
  }
  if (
    new Set(removeOptions.map((option) => option.optionTypeId)).size !==
    removeOptions.length
  ) {
    throw new Error("Only one Remove option is allowed per option type.");
  }
  removeOptions.forEach((option) => {
    if (
      !option.optionTypeId ||
      option.optionTypeId === ADMIN_CUSTOM_OPTION_TYPE_ID ||
      option.selectedItems?.length > 0 ||
      option.selectedItemLabels?.length > 0 ||
      option.selectedItemPrices?.length > 0
    ) {
      throw new Error("Invalid Remove option selection.");
    }
  });
  if (customOptions.length === 0) return selections as OptionSelection[];

  const customOption = customOptions[0];
  const label = customOption.selectedItemLabels?.[0]?.trim() || "";
  const price = Number(customOption.selectedItemPrices?.[0]);

  if (!label || label.length > MAX_ADMIN_CUSTOM_OPTION_LENGTH) {
    throw new Error(
      `Custom option must be between 1 and ${MAX_ADMIN_CUSTOM_OPTION_LENGTH} characters.`
    );
  }
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > MAX_ADMIN_CUSTOM_OPTION_PRICE
  ) {
    throw new Error(
      `Custom option price must be between $0 and $${MAX_ADMIN_CUSTOM_OPTION_PRICE.toFixed(
        2
      )}.`
    );
  }
  if (customOption.selectedItems?.length > 0) {
    throw new Error("Custom option cannot reference a menu option.");
  }

  return [
    ...(selections as OptionSelection[]).filter(
      (option) =>
        !isAdminCustomOption(option) && !isAdminRemoveOption(option)
    ),
    ...removeOptions.map((option) =>
      createAdminRemoveOption(option.optionTypeId, option.optionType)
    ),
    {
      optionTypeId: ADMIN_CUSTOM_OPTION_TYPE_ID,
      optionType: ADMIN_CUSTOM_OPTION_LABEL,
      selectedItems: [],
      selectedItemLabels: [label],
      selectedItemPrices: [price.toFixed(2)],
    },
  ];
}

export function stripAdminOrderOverrides(selections: unknown) {
  return Array.isArray(selections)
    ? (selections as OptionSelection[]).filter(
        (option) =>
          !isAdminCustomOption(option) && !isAdminRemoveOption(option)
      )
    : [];
}

export function getAdminCustomOptionValidationError(selections: unknown) {
  try {
    normalizeAdminCustomOptions(selections);
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid custom option.";
  }
}
