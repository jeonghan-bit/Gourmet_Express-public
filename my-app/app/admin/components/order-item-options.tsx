"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/icons";
import { Minus, Plus, Search, X } from "lucide-react";
import type {
  OptionSelection,
  SelectOptionItem,
  SelectOptionType,
} from "@/lib/types";
import { normalizeProductDisplayName } from "@/lib/utils";
import {
  ADMIN_REMOVE_OPTION_VALUE,
  createAdminRemoveOption,
  createAdminCustomOption,
  isAdminCustomOption,
  isAdminRemoveOption,
  MAX_ADMIN_CUSTOM_OPTION_LENGTH,
  MAX_ADMIN_CUSTOM_OPTION_PRICE,
} from "@/lib/adminCustomOption";

type OptionTypeWithItems = SelectOptionType & { items: SelectOptionItem[] };

export interface EditableOrderItem {
  lineId: string;
  id: number;
  name: string;
  price: number;
  quantity: number;
  specialRequest?: string | null;
  selectedOptions?: OptionSelection[];
  optionTypes?: OptionTypeWithItems[];
  image?: string;
  description?: string;
}

export function getMenuDetailsFromName(
  item: Pick<EditableOrderItem, "id" | "name">
) {
  const displayName = normalizeProductDisplayName(item.name);
  const match =
    displayName.match(/^([^)]+)\)\s*(.+)$/) ||
    displayName.match(/^([0-9]+[A-Za-z]?)\.\s*(.+)$/);

  return {
    menuNumber: match?.[1] || "",
    menuName: match?.[2] || displayName,
  };
}

export function findMissingRequiredOptions(
  items: EditableOrderItem[],
  requirements: Record<string, string[]>
) {
  return items.filter((item) =>
    (requirements[item.lineId] || []).some((optionTypeId) => {
      const selected = item.selectedOptions?.find(
        (option) => option.optionTypeId === optionTypeId
      );
      return (
        !selected ||
        (selected.selectedItems.length === 0 &&
          !isAdminRemoveOption(selected))
      );
    })
  );
}

export function getOrderItemUnitPrice(item: EditableOrderItem) {
  return (
    item.price +
    (item.selectedOptions?.reduce(
      (sum, option) =>
        sum +
        (option.selectedItemPrices || []).reduce(
          (optionSum, price) => {
            const parsedPrice = Number(price);
            return optionSum + (Number.isFinite(parsedPrice) ? parsedPrice : 0);
          },
          0
        ),
      0
    ) || 0)
  );
}

export function calculateOrderItemsTotal(items: EditableOrderItem[]) {
  return items.reduce((total, item) => {
    let itemTotal = item.price * item.quantity;
    item.selectedOptions?.forEach((option) => {
      option.selectedItemPrices?.forEach((price) => {
        const parsedPrice = Number(price);
        if (Number.isFinite(parsedPrice)) {
          itemTotal += parsedPrice * item.quantity;
        }
      });
    });
    return total + itemTotal;
  }, 0);
}

interface MenuSearchItem {
  id: number | string;
  name: string;
  price: number;
}

export function OrderMenuSearch<T extends MenuSearchItem>({
  value,
  open,
  loading,
  results,
  onValueChange,
  onOpenChange,
  onAdd,
}: {
  value: string;
  open: boolean;
  loading: boolean;
  results: T[];
  onValueChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: T) => void;
}) {
  return (
    <div
      className="relative"
      onBlur={() => window.setTimeout(() => onOpenChange(false), 150)}
    >
      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search menu item to add..."
        className="pl-8"
        value={value}
        onFocus={() => onOpenChange(true)}
        onChange={(event) => {
          onValueChange(event.target.value);
          onOpenChange(true);
        }}
      />
      {loading && (
        <div className="absolute right-2 top-2.5">
          <Spinner />
        </div>
      )}
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="max-h-[205px] overflow-y-auto py-1">
            {results.length > 0 ? (
              results.map((item) => {
                const details = getMenuDetailsFromName({
                  id: parseInt(String(item.id)),
                  name: item.name,
                });

                return (
                  <button
                    type="button"
                    key={item.id}
                    className="grid w-full grid-cols-[80px_minmax(0,1fr)_120px] gap-6 px-4 py-2 text-left text-sm hover:bg-accent sm:px-6"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onAdd(item);
                      onOpenChange(false);
                      onValueChange("");
                    }}
                  >
                    <span className="font-medium">{details.menuNumber}</span>
                    <span className="truncate">{details.menuName}</span>
                    <span className="text-right font-medium">
                      ${item.price.toFixed(2)}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No products found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function EditableOrderItemsTable({
  items,
  quantityDrafts,
  onQuantityChange,
  onQuantityDraftChange,
  onQuantityDraftBlur,
  onOptionsChange,
  onRequirementsChange,
  onSpecialRequestChange,
  onRemove,
  newestFirst = false,
  allowCustomOptions = false,
}: {
  items: EditableOrderItem[];
  quantityDrafts: Record<string, string>;
  onQuantityChange: (index: number, quantity: number) => void;
  onQuantityDraftChange: (
    item: EditableOrderItem,
    index: number,
    value: string
  ) => void;
  onQuantityDraftBlur: (item: EditableOrderItem) => void;
  onOptionsChange: (lineId: string, selected: OptionSelection[]) => void;
  onRequirementsChange: (lineId: string, requiredIds: string[]) => void;
  onSpecialRequestChange: (lineId: string, value: string) => void;
  onRemove: (index: number) => void;
  newestFirst?: boolean;
  allowCustomOptions?: boolean;
}) {
  const indexedItems = items.map((item, index) => ({ item, index }));
  if (newestFirst) indexedItems.reverse();

  return (
    <div className="rounded-md border-[1.5px] border-gray-300 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] text-center">Qty</TableHead>
            <TableHead className="w-[120px]">Menu#</TableHead>
            <TableHead>Name of menu</TableHead>
            <TableHead className="w-[110px] text-right">Price</TableHead>
            <TableHead className="w-[48px]">
              <span className="sr-only">Remove</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                No items added yet
              </TableCell>
            </TableRow>
          ) : (
            indexedItems.map(({ item, index }) => {
              const details = getMenuDetailsFromName(item);
              const itemTotal = getOrderItemUnitPrice(item) * item.quantity;

              return (
                <TableRow key={item.lineId}>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onQuantityChange(index, item.quantity - 1)
                        }
                        className="h-12 w-12 p-0"
                        aria-label={`Decrease quantity for ${details.menuName}`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={
                          quantityDrafts[item.lineId] ?? String(item.quantity)
                        }
                        onChange={(event) =>
                          onQuantityDraftChange(item, index, event.target.value)
                        }
                        onBlur={() => onQuantityDraftBlur(item)}
                        className="h-7 w-12 px-1 text-center text-sm"
                        aria-label={`Quantity for ${details.menuName}`}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onQuantityChange(index, item.quantity + 1)
                        }
                        className="h-12 w-12 p-0"
                        aria-label={`Increase quantity for ${details.menuName}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {details.menuNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{details.menuName}</div>
                    <OrderItemOptions
                      item={item}
                      allowCustomOptions={allowCustomOptions}
                      onOptionsChange={(selected) =>
                        onOptionsChange(item.lineId, selected)
                      }
                      onRequirementsChange={(requiredIds) =>
                        onRequirementsChange(item.lineId, requiredIds)
                      }
                    />
                    <Textarea
                      value={item.specialRequest || ""}
                      onChange={(event) =>
                        onSpecialRequestChange(item.lineId, event.target.value)
                      }
                      placeholder="Special request for this item (optional)"
                      rows={2}
                      className="mt-2 text-xs"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${itemTotal.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onRemove(index)}
                      className="h-12 w-12 p-0 text-destructive"
                      aria-label={`Remove ${details.menuName} from order`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function OrderItemOptions({
  item,
  onOptionsChange,
  onRequirementsChange,
  allowCustomOptions = false,
}: {
  item: EditableOrderItem;
  onOptionsChange: (selectedOptions: OptionSelection[]) => void;
  onRequirementsChange: (requiredOptionIds: string[]) => void;
  allowCustomOptions?: boolean;
}) {
  const optionTypes = item.optionTypes || [];
  const existingOptions = item.selectedOptions || [];
  const customOption = existingOptions.find(isAdminCustomOption);

  useEffect(() => {
    onRequirementsChange(
      optionTypes
        .filter((optionType) => optionType.required)
        .map((optionType) => optionType.id)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.lineId, optionTypes]);

  const handleOptionChange = (
    optionType: OptionTypeWithItems,
    optionItemId: string
  ) => {
    let nextSelection: OptionSelection;
    if (optionItemId === ADMIN_REMOVE_OPTION_VALUE) {
      if (!customOption) return;
      nextSelection = createAdminRemoveOption(optionType.id, optionType.name);
    } else {
      const optionItem = optionType.items.find(
        (candidate) => candidate.id === optionItemId
      );
      if (!optionItem) return;

      nextSelection = {
        optionTypeId: optionType.id,
        optionType: optionType.name,
        selectedItems: [optionItem.id],
        selectedItemLabels: [optionItem.label],
        selectedItemPrices: [optionItem.additionalPrice],
      };
    }
    const standardOptions = existingOptions.filter(
      (option) => !isAdminCustomOption(option)
    );
    const hasExistingOption = standardOptions.some(
      (option) => option.optionTypeId === optionType.id
    );
    const nextStandardOptions = hasExistingOption
      ? standardOptions.map((option) =>
          option.optionTypeId === optionType.id ? nextSelection : option
        )
      : [...standardOptions, nextSelection];

    onOptionsChange(
      customOption
        ? [...nextStandardOptions, customOption]
        : nextStandardOptions
    );
  };

  const updateCustomOption = (
    field: "label" | "price",
    value: string
  ) => {
    const nextCustomOption = customOption || createAdminCustomOption();
    onOptionsChange([
      ...existingOptions.filter((option) => !isAdminCustomOption(option)),
      {
        ...nextCustomOption,
        selectedItemLabels:
          field === "label" ? [value] : nextCustomOption.selectedItemLabels,
        selectedItemPrices:
          field === "price" ? [value] : nextCustomOption.selectedItemPrices,
      },
    ]);
  };

  if (optionTypes.length === 0 && !allowCustomOptions) return null;

  return (
    <div className="mt-2 grid gap-2">
      {optionTypes.map((optionType) => {
        const selectedOption = item.selectedOptions?.find(
          (option) => option.optionTypeId === optionType.id
        );
        const selectedItemId = isAdminRemoveOption(selectedOption)
          ? ADMIN_REMOVE_OPTION_VALUE
          : selectedOption?.selectedItems[0] || "";

        return (
          <div
            key={optionType.id}
            className="grid gap-1 sm:grid-cols-[180px_minmax(180px,1fr)] sm:items-center"
          >
            <Label className="text-xs text-muted-foreground">
              {optionType.name}
              {optionType.required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>
            <Select
              value={selectedItemId || undefined}
              onValueChange={(value) => handleOptionChange(optionType, value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {optionType.items.map((optionItem) => (
                  <SelectItem key={optionItem.id} value={optionItem.id}>
                    {optionItem.label}
                    {parseFloat(optionItem.additionalPrice) > 0
                      ? ` +$${parseFloat(optionItem.additionalPrice).toFixed(2)}`
                      : ""}
                  </SelectItem>
                ))}
                {customOption && (
                  <SelectItem
                    value={ADMIN_REMOVE_OPTION_VALUE}
                    className="text-destructive"
                  >
                    Remove option
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        );
      })}
      {allowCustomOptions &&
        (customOption ? (
          <div className="grid gap-1 rounded-md border p-2 sm:grid-cols-[180px_minmax(180px,1fr)] sm:items-center">
            <Label className="text-xs text-muted-foreground">
              Custom Option
            </Label>
            <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_110px_48px]">
              <Input
                value={customOption.selectedItemLabels?.[0] || ""}
                onChange={(event) =>
                  updateCustomOption("label", event.target.value)
                }
                placeholder="e.g. Replace rice with fried rice"
                maxLength={MAX_ADMIN_CUSTOM_OPTION_LENGTH}
                required
                className="h-12 text-xs"
                aria-label="Custom option description"
              />
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                max={MAX_ADMIN_CUSTOM_OPTION_PRICE}
                step="1"
                value={customOption.selectedItemPrices?.[0] || ""}
                onChange={(event) =>
                  updateCustomOption("price", event.target.value)
                }
                placeholder="Price"
                required
                className="h-12 text-xs"
                aria-label="Custom option price"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  onOptionsChange(
                    existingOptions.filter(
                      (option) =>
                        !isAdminCustomOption(option) &&
                        !isAdminRemoveOption(option)
                    )
                  )
                }
                className="h-12 w-12 p-0 text-destructive"
                aria-label="Remove custom option"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onOptionsChange([...existingOptions, createAdminCustomOption()])
            }
            className="min-h-12 w-fit"
          >
            <Plus className="h-3 w-3" />
            Add custom option
          </Button>
        ))}
    </div>
  );
}
