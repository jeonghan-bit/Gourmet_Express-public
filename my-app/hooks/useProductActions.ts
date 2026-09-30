"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProductStatus, SelectProductWithCollection } from "@/lib/types";
import * as z from "zod";
import { updateProductSchema, createProductSchema } from "@/lib/schemas";

type ProductFormValues = z.infer<typeof updateProductSchema>;
type CreateProductFormValues = z.infer<typeof createProductSchema>;

interface ProductsResponse {
  products: SelectProductWithCollection[];
  totalProducts: number;
  offset: number;
  limit: number;
}

export interface ProductOptionType {
  id: string;
  name: string;
  required: boolean;
  items: {
    id: string;
    label: string;
    additionalPrice: string;
    sortOrder: number;
  }[];
}

const fetchProducts = async (
  searchTerm: string,
  offset = 0,
  limit = 15,
  status: ProductStatus = "all",
  collection?: string,
  optionType?: string,
  includeOptions = false
): Promise<ProductsResponse> => {
  const params = new URLSearchParams({
    offset: offset.toString(),
    limit: limit.toString(),
    status,
  });

  const trimmedSearchTerm = searchTerm.trim();
  if (trimmedSearchTerm) params.append("q", trimmedSearchTerm);
  if (collection && collection !== "All") {
    params.append("collection", collection);
  }
  if (optionType && optionType !== "All") {
    params.append("option_type", optionType);
  }
  if (includeOptions) params.append("include_options", "true");

  const response = await fetch(`/api/products?${params.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch products");
  return response.json();
};

export function useProducts(
  searchTerm: string,
  offset = 0,
  limit = 15,
  status: ProductStatus = "all",
  collection?: string,
  optionType?: string,
  includeOptions = false,
  initialData?: ProductsResponse
) {
  return useQuery<ProductsResponse>({
    queryKey: [
      "products",
      searchTerm,
      offset,
      limit,
      status,
      collection,
      optionType,
      includeOptions,
    ],
    queryFn: () =>
      fetchProducts(
        searchTerm,
        offset,
        limit,
        status,
        collection,
        optionType,
        includeOptions
      ),
    initialData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useProductWithOptions(productId: number, enabled = true) {
  return useQuery({
    queryKey: ["product-with-options", productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch product with options");
      }
      return response.json();
    },
    enabled: enabled && !!productId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useOptionTypes() {
  return useQuery<ProductOptionType[]>({
    queryKey: ["option-types"],
    queryFn: async () => {
      const response = await fetch("/api/options");
      if (!response.ok) throw new Error("Failed to fetch option types");
      const data = await response.json();
      return data.optionTypes;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useProductOptionTypeIds(productId: number) {
  return useQuery<string[]>({
    queryKey: ["product-option-type-ids", productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}/options`);
      if (!response.ok) throw new Error("Failed to fetch product options");
      const data = await response.json();
      return data.optionTypeIds;
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useProductActions() {
  const queryClient = useQueryClient();
  const invalidatePublicMenuQuery = () =>
    queryClient.invalidateQueries({ queryKey: ["public-menu"] });

  const createProduct = useMutation({
    mutationFn: async (data: CreateProductFormValues) => {
      const response = await fetch("/api/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      void invalidatePublicMenuQuery();
    },
  });

  const editProduct = useMutation({
    mutationFn: async ({
      productId,
      data,
    }: {
      productId: number;
      data: ProductFormValues;
    }) => {
      const response = await fetch(`/api/edit-product?id=${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      void invalidatePublicMenuQuery();
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async ({ productId }: { productId: number }) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete product");
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      void invalidatePublicMenuQuery();
      queryClient.invalidateQueries({
        queryKey: ["product-with-options", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["product-option-type-ids", variables.productId],
      });
    },
  });

  const editProductOptions = useMutation({
    mutationFn: async ({
      productId,
      optionTypeIds,
    }: {
      productId: number;
      optionTypeIds: string[];
    }) => {
      const response = await fetch(`/api/products/${productId}/options`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionTypeIds }),
      });
      if (!response.ok) {
        throw new Error("Failed to update product options");
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      void invalidatePublicMenuQuery();
      queryClient.invalidateQueries({
        queryKey: ["product-with-options", variables.productId],
      });
      queryClient.invalidateQueries({
        queryKey: ["product-option-type-ids", variables.productId],
      });
    },
  });

  const createOptionItem = useMutation({
    mutationFn: async ({
      optionTypeId,
      label,
      additionalPrice,
    }: {
      optionTypeId: string;
      label: string;
      additionalPrice: string;
    }) => {
      const response = await fetch(`/api/options/${optionTypeId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, additionalPrice }),
      });
      if (!response.ok) throw new Error("Failed to create option item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["option-types"] });
      void invalidatePublicMenuQuery();
    },
  });

  const createOptionType = useMutation({
    mutationFn: async ({
      name,
      required,
    }: {
      name: string;
      required: boolean;
    }) => {
      const response = await fetch("/api/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, required }),
      });
      if (!response.ok) throw new Error("Failed to create option type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["option-types"] });
      void invalidatePublicMenuQuery();
    },
  });

  const deleteOptionType = useMutation({
    mutationFn: async ({ optionTypeId }: { optionTypeId: string }) => {
      const response = await fetch(`/api/options/${optionTypeId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete option type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["option-types"] });
      void invalidatePublicMenuQuery();
      queryClient.invalidateQueries({ queryKey: ["product-with-options"] });
      queryClient.invalidateQueries({ queryKey: ["product-option-type-ids"] });
    },
  });

  const updateOptionType = useMutation({
    mutationFn: async ({
      optionTypeId,
      name,
      required,
    }: {
      optionTypeId: string;
      name?: string;
      required?: boolean;
    }) => {
      const response = await fetch(`/api/options/${optionTypeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, required }),
      });
      if (!response.ok) throw new Error("Failed to update option type");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["option-types"] });
      void invalidatePublicMenuQuery();
      queryClient.invalidateQueries({ queryKey: ["product-with-options"] });
    },
  });

  const editOptionItems = useMutation({
    mutationFn: async ({
      optionTypeId,
      items,
    }: {
      optionTypeId: string;
      items: {
        itemId: string;
        label: string;
        additionalPrice: string;
      }[];
    }) => {
      const results = await Promise.all(
        items.map((item) =>
          fetch(`/api/options/${optionTypeId}/items/${item.itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: item.label,
              additionalPrice: item.additionalPrice,
            }),
          })
        )
      );

      if (results.some((response) => !response.ok)) {
        throw new Error("Failed to update option items");
      }

      return Promise.all(results.map((response) => response.json()));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["option-types"] });
      void invalidatePublicMenuQuery();
    },
  });

  const deleteOptionItem = useMutation({
    mutationFn: async ({
      optionTypeId,
      itemId,
    }: {
      optionTypeId: string;
      itemId: string;
    }) => {
      const response = await fetch(
        `/api/options/${optionTypeId}/items/${itemId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) throw new Error("Failed to delete option item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["option-types"] });
      void invalidatePublicMenuQuery();
    },
  });

  const reorderOptionItems = useMutation({
    mutationFn: async ({
      optionTypeId,
      items,
    }: {
      optionTypeId: string;
      items: { id: string; order: number }[];
    }) => {
      const response = await fetch(
        `/api/options/${optionTypeId}/items/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        }
      );
      if (!response.ok) throw new Error("Failed to reorder option items");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["option-types"] });
      void invalidatePublicMenuQuery();
    },
  });

  return {
    createProduct,
    editProduct,
    deleteProduct,
    editProductOptions,
    createOptionType,
    deleteOptionType,
    updateOptionType,
    createOptionItem,
    editOptionItems,
    deleteOptionItem,
    reorderOptionItems,
  };
}
