"use client";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "../products-table";
import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusFilter } from "@/components/ui/status-filter";
import {
  ProductStatus,
  SelectOptionType,
  SelectProductWithCollection,
} from "@/lib/types";
import { AddProductButton } from "@/components/add-product-dialog";
import { matchesProductSearch } from "@/lib/utils";

const PRODUCTS_PER_PAGE = 15;

type ProductWithOptionTypes = SelectProductWithCollection & {
  optionTypes?: Pick<SelectOptionType, "id" | "name">[];
};

const filterProductsBySearch = (
  products: ProductWithOptionTypes[],
  searchValue: string
) => {
  const query = searchValue.trim().toLowerCase();
  if (!query) return products;

  return products.filter((product) => {
    const description = product.description?.toLowerCase() ?? "";
    const price = product.price;
    const collectionName = product.collection?.name.toLowerCase() ?? "";

    return (
      matchesProductSearch(product.name, query) ||
      description.includes(query) ||
      price.includes(query) ||
      collectionName.includes(query)
    );
  });
};

type ProductFilterProps = {
  products: ProductWithOptionTypes[];
  offset: number;
  search: string;
  collections: string[];
  currentCollection?: string;
  optionTypes: Pick<SelectOptionType, "id" | "name">[];
  currentOptionType?: string;
};

export default function ProductFilter({
  products,
  offset,
  search,
  collections,
  currentCollection = "All",
  optionTypes,
  currentOptionType = "All",
}: ProductFilterProps) {
  const [collection, setCollection] = useState(currentCollection);
  const [optionType, setOptionType] = useState(currentOptionType);
  const [status, setStatus] = useState<ProductStatus>("all");

  // Sync collection state with URL changes
  useEffect(() => {
    setCollection(currentCollection);
  }, [currentCollection]);

  useEffect(() => {
    setOptionType(currentOptionType);
  }, [currentOptionType]);

  const pushFilters = ({
    nextCollection = collection,
    nextOptionType = optionType,
  }: {
    nextCollection?: string;
    nextOptionType?: string;
  }) => {
    const params = new URLSearchParams({
      offset: "0",
    });

    if (nextCollection !== "All") {
      params.set("collection", nextCollection);
    }

    if (nextOptionType !== "All") {
      params.set("option_type", nextOptionType);
    }

    window.history.pushState(null, "", `/admin/products?${params.toString()}`);
  };

  const updateCollection = (value: string) => {
    setCollection(value);
    pushFilters({ nextCollection: value });
  };

  const updateOptionType = (value: string) => {
    setOptionType(value);
    pushFilters({ nextOptionType: value });
  };

  const clearSearch = () => {
    setCollection("All");
    setOptionType("All");
    const params = new URLSearchParams({
      offset: "0",
    });
    setStatus("all");
    window.history.pushState(null, "", `/admin/products?${params.toString()}`);
  };

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ];
  const activeFilterCount =
    (collection !== "All" ? 1 : 0) + (optionType !== "All" ? 1 : 0);
  const filteredProducts = filterProductsBySearch(products, search).filter(
    (product) => {
      const matchesStatus = status === "all" || product.status === status;
      const matchesCollection =
        collection === "All" || product.collection?.name === collection;
      const matchesOptionType =
        optionType === "All" ||
        product.optionTypes?.some((type) => type.id === optionType);

      return matchesStatus && matchesCollection && matchesOptionType;
    }
  );
  const visibleProducts = filteredProducts.slice(
    offset,
    offset + PRODUCTS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center w-full gap-2 sm:gap-4">
        {/* Status Filter */}
        <div className="flex-1">
          <StatusFilter
            currentStatus={status}
            statusOptions={statusOptions}
            onStatusChange={(nextStatus) =>
              setStatus(nextStatus as ProductStatus)
            }
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="min-h-12 w-full sm:w-auto"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[280px] space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Collection</div>
                <Select value={collection} onValueChange={updateCollection}>
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Collections</SelectItem>

                    {collections.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Option Type</div>
                <Select value={optionType} onValueChange={updateOptionType}>
                  <SelectTrigger className="h-12 w-full">
                    <SelectValue placeholder="Select option type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Option Types</SelectItem>

                    {optionTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            onClick={clearSearch}
            variant="ghost"
            size="sm"
            className="min-h-12"
          >
            Clear
          </Button>
          <div className="[&_button]:min-h-12">
            <AddProductButton />
          </div>
        </div>
      </div>

      <ProductsTable
        products={visibleProducts}
        offset={offset}
        totalProducts={filteredProducts.length}
      />
    </div>
  );
}
