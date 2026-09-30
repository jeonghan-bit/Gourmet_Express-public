"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import type { MenuItem } from "@/types/menu";
import { useProductWithOptions } from "@/hooks/useProductActions";
import {
  OptionSelection,
  ProductWithOptions,
  SelectOptionType,
  SelectOptionItem,
} from "@/lib/types";
import LoadingAnimation from "@/components/LoadingAnimation";

type OptionTypeWithItems = SelectOptionType & { items: SelectOptionItem[] };

const COMMA_SPLIT_DESCRIPTION_CATEGORY_KEYWORDS = ["combo", "dinner"];

interface DishDetailPopupProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    specialRequest: string,
    selectedOptions: OptionSelection[]
  ) => void;
}

export function DishDetailPopup({
  item,
  isOpen,
  onClose,
  onAddToCart,
}: DishDetailPopupProps) {
  const [quantity, setQuantity] = useState(1);
  const [specialRequest, setSpecialRequest] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<OptionSelection[]>([]);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  const {
    data: productData,
    isLoading,
    error,
  } = useProductWithOptions(parseInt(item.id), isOpen);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setSpecialRequest("");
      setSelectedOptions([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const keyboardHeight =
          window.innerHeight - window.visualViewport.height;
        setKeyboardOpen(keyboardHeight > 100);
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (dialogContentRef.current) {
      if (keyboardOpen) {
        dialogContentRef.current.style.transform = `translateY(-${
          window.visualViewport?.height! - dialogContentRef.current.offsetHeight
        }px)`;
      } else {
        dialogContentRef.current.style.transform = "";
      }
    }
  }, [keyboardOpen]);

  // Initialize selected options when product data loads
  useEffect(() => {
    if (productData?.optionTypes) {
      const initialOptions = productData.optionTypes.map(
        (optionType: OptionTypeWithItems) => ({
          optionTypeId: optionType.id,
          optionType: optionType.name,
          selectedItems:
            optionType.required && optionType.items.length > 0
              ? [optionType.items[0].id]
              : [],
          selectedItemLabels:
            optionType.required && optionType.items.length > 0
              ? [optionType.items[0].label]
              : [],
          selectedItemPrices:
            optionType.required && optionType.items.length > 0
              ? [optionType.items[0].additionalPrice]
              : [],
        })
      );
      setSelectedOptions(initialOptions);
    }
  }, [productData]);

  const handleOptionChange = (
    optionTypeId: string,
    itemId: string,
    itemLabel: string,
    itemPrice: string,
    isRequired: boolean,
    isChecked?: boolean
  ) => {
    setSelectedOptions((prev) => {
      const existing = prev.find((opt) => opt.optionTypeId === optionTypeId);
      const optionTypeName =
        productData?.optionTypes.find(
          (ot: OptionTypeWithItems) => ot.id === optionTypeId
        )?.name || "";

      if (existing) {
        if (isRequired) {
          // For required options, replace the selection (radio button behavior)
          return prev.map((opt) =>
            opt.optionTypeId === optionTypeId
              ? {
                  ...opt,
                  selectedItems: [itemId],
                  selectedItemLabels: [itemLabel],
                  selectedItemPrices: [itemPrice],
                }
              : opt
          );
        } else {
          // For optional options, toggle single selection
          const currentItems = existing.selectedItems;
          const currentLabels = existing.selectedItemLabels;
          const currentPrices = existing.selectedItemPrices;

          // Check if this item is already selected
          const itemIndex = currentItems.indexOf(itemId);

          if (itemIndex > -1) {
            // Item is already selected, remove it (toggle off)
            const newItems = currentItems.filter(
              (_, index) => index !== itemIndex
            );
            const newLabels = currentLabels.filter(
              (_, index) => index !== itemIndex
            );
            const newPrices = currentPrices.filter(
              (_, index) => index !== itemIndex
            );

            return prev.map((opt) =>
              opt.optionTypeId === optionTypeId
                ? {
                    ...opt,
                    selectedItems: newItems,
                    selectedItemLabels: newLabels,
                    selectedItemPrices: newPrices,
                  }
                : opt
            );
          } else {
            // Item is not selected, replace current selection with this item (single selection)
            return prev.map((opt) =>
              opt.optionTypeId === optionTypeId
                ? {
                    ...opt,
                    selectedItems: [itemId],
                    selectedItemLabels: [itemLabel],
                    selectedItemPrices: [itemPrice],
                  }
                : opt
            );
          }
        }
      } else {
        // Create new option selection
        if (isRequired || isChecked) {
          return [
            ...prev,
            {
              optionTypeId,
              optionType: optionTypeName,
              selectedItems: [itemId],
              selectedItemLabels: [itemLabel],
              selectedItemPrices: [itemPrice],
            },
          ];
        }
      }

      return prev;
    });
  };

  const calculateTotalPrice = () => {
    if (!productData) return item.price * quantity;

    let basePrice = parseFloat(productData.product.price) * quantity;
    let optionsPrice = 0;

    selectedOptions.forEach((selection) => {
      selection.selectedItemPrices.forEach((price) => {
        optionsPrice += parseFloat(price) * quantity;
      });
    });

    return basePrice + optionsPrice;
  };

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Sort option types: required first, then optional
  const sortedOptionTypes = productData?.optionTypes
    ? [...productData.optionTypes]
    : [];

  // Check if all required options are selected
  const areRequiredOptionsSelected = () => {
    if (!productData?.optionTypes) return true;

    return productData.optionTypes.every((optionType: OptionTypeWithItems) => {
      if (!optionType.required) return true; // Optional options don't need validation

      const selectedOption = selectedOptions.find(
        (opt) => opt.optionTypeId === optionType.id
      );
      return selectedOption && selectedOption.selectedItems.length > 0;
    });
  };

  const shouldSplitDescription =
    item.categoryName &&
    COMMA_SPLIT_DESCRIPTION_CATEGORY_KEYWORDS.some((keyword) =>
      item.categoryName?.toLowerCase().includes(keyword)
    );

  const descriptionLines = shouldSplitDescription
    ? item.description
        .split(",")
        .map((line) => line.trim())
        .filter(Boolean)
    : [item.description];

  const handleAddToCart = () => {
    if (!areRequiredOptionsSelected()) {
      return; // Don't add to cart if required options are not selected
    }
    onAddToCart(item, quantity, specialRequest, selectedOptions);
    onClose();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-w-[380px] sm:w-full p-4 rounded-xl mx-auto shadow-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Loading...</DialogTitle>
            <DialogDescription>
              Loading product details and options.
            </DialogDescription>
          </DialogHeader>
          <LoadingAnimation className="h-32" />
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[90vw] max-w-[380px] sm:w-full p-4 rounded-xl mx-auto shadow-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Error</DialogTitle>
            <DialogDescription>
              Product details could not be loaded.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center text-red-500">
            Error loading product details
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`w-[96vw] max-w-[430px] sm:w-full p-4 rounded-xl mx-auto shadow-md transition-transform duration-300 ease-in-out ${
          keyboardOpen ? "translate-y-[-30vh]" : ""
        }`}
        ref={dialogContentRef}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{item.name}</DialogTitle>
          <DialogDescription>
            Customize your order with options and special requests
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {/* Image */}
            <div className="relative w-full h-52 sm:h-56 rounded-md overflow-hidden bg-gray-100">
              <Image
                src={item.image || "/cuisine1_photo.webp"}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 96vw, 430px"
                onError={(event) => {
                  event.currentTarget.srcset = "";
                  event.currentTarget.src = "/cuisine1_photo.webp";
                }}
              />
            </div>

            {/* Price + Description */}
            <div>
              <p className="text-primary font-semibold text-base mb-1">
                ${calculateTotalPrice().toFixed(2)}
              </p>
              {item.description && (
                <p className="text-sm text-muted-foreground">
                  {descriptionLines.map((line, index) => (
                    <span key={`${line}-${index}`} className="block">
                      {line}
                    </span>
                  ))}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-4 items-center gap-3">
              <Label htmlFor="quantity" className="col-span-1 text-sm">
                Quantity
              </Label>
              <div className="col-span-3">
                <Select
                  value={quantity.toString()}
                  onValueChange={(val) => setQuantity(Number(val))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select quantity" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[200px] w-full">
                      {[...Array(20)].map((_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Options */}
            {productData?.optionTypes && productData.optionTypes.length > 0 && (
              <div className="space-y-4">
                {sortedOptionTypes.map((optionType: OptionTypeWithItems) => (
                  <div key={optionType.id} className="space-y-2">
                    <Label className="text-sm font-medium">
                      {capitalizeWords(optionType.name)}
                      {optionType.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </Label>

                    {optionType.items.length > 0 ? (
                      <div className="space-y-2">
                        {optionType.items.map(
                          (optionItem: SelectOptionItem) => {
                            const isSelected =
                              selectedOptions
                                .find(
                                  (opt) => opt.optionTypeId === optionType.id
                                )
                                ?.selectedItems.includes(optionItem.id) ||
                              false;

                            return (
                              <div
                                key={optionItem.id}
                                className="flex items-center space-x-2"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (optionType.required) {
                                      // Required options: always select (no toggle)
                                      handleOptionChange(
                                        optionType.id,
                                        optionItem.id,
                                        optionItem.label,
                                        optionItem.additionalPrice,
                                        true,
                                        true
                                      );
                                    } else {
                                      // Optional options: toggle behavior
                                      if (isSelected) {
                                        // If already selected, deselect it
                                        handleOptionChange(
                                          optionType.id,
                                          optionItem.id,
                                          optionItem.label,
                                          optionItem.additionalPrice,
                                          false,
                                          false
                                        );
                                      } else {
                                        // If not selected, select it
                                        handleOptionChange(
                                          optionType.id,
                                          optionItem.id,
                                          optionItem.label,
                                          optionItem.additionalPrice,
                                          false,
                                          true
                                        );
                                      }
                                    }
                                  }}
                                  className={`flex items-center space-x-2 w-full p-2 rounded-md border transition-colors ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background text-foreground border-muted hover:bg-muted"
                                  }`}
                                >
                                  <div
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      isSelected
                                        ? "border-primary-foreground bg-primary-foreground"
                                        : "border-muted-foreground"
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    )}
                                  </div>
                                  <span className="text-sm flex-1 text-left">
                                    {optionItem.label}
                                    {parseFloat(optionItem.additionalPrice) >
                                      0 && (
                                      <span
                                        className={`ml-2 ${
                                          isSelected
                                            ? "text-primary-foreground"
                                            : "text-primary"
                                        }`}
                                      >
                                        +$
                                        {parseFloat(
                                          optionItem.additionalPrice
                                        ).toFixed(2)}
                                      </span>
                                    )}
                                  </span>
                                </button>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No options available
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Special Request */}
            <div className="grid grid-cols-4 items-start gap-3">
              <Label
                htmlFor="special-request"
                className="col-span-1 text-sm pt-1"
              >
                Special
              </Label>
              <Textarea
                id="special-request"
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                placeholder="Any special requests?"
                className="col-span-3 text-sm h-20 resize-none"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="mt-6">
          <Button
            onClick={handleAddToCart}
            className="w-full h-10 text-sm"
            disabled={!areRequiredOptionsSelected()}
          >
            {areRequiredOptionsSelected()
              ? `Add to Cart - $${calculateTotalPrice().toFixed(2)}`
              : "Please select required options"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
