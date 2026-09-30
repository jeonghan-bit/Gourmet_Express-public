"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SelectCollection } from "@/lib/types";

interface CollectionsResponse {
  collections: SelectCollection[];
  totalCollections: number;
  offset: number;
  limit: number;
}

export function useCollectionActions() {
  const queryClient = useQueryClient();
  const invalidatePublicMenuQuery = () =>
    queryClient.invalidateQueries({ queryKey: ["public-menu"] });

  const fetchCollections = async (): Promise<SelectCollection[]> => {
    const response = await fetch("/api/collections");
    if (!response.ok) throw new Error("Failed to fetch collections");
    const data = await response.json();
    return data;
  };

  const useCollections = (initialData?: SelectCollection[]) => {
    return useQuery<SelectCollection[]>({
      queryKey: ["collections"],
      queryFn: fetchCollections,
      initialData,
      staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
      gcTime: 1000 * 60 * 30, // Keep data in cache for 30 minutes
    });
  };

  const createCollection = useMutation({
    mutationFn: async (data: { name: string; status: string }) => {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to create collection");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      void invalidatePublicMenuQuery();
    },
  });

  const editCollection = useMutation({
    mutationFn: async ({
      collectionId,
      data,
    }: {
      collectionId: number;
      data: { name?: string; status?: string; order?: number };
    }) => {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update collection");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      void invalidatePublicMenuQuery();
    },
  });

  const reorderCollections = useMutation({
    mutationFn: async (payload: { id: number; order: number }[]) => {
      const response = await fetch("/api/collections/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        if (response.status === 400) {
          console.warn("Reorder returned 400, ignoring");
          return null;
        }
        throw new Error("Failed to reorder collections");
      }
      return response.json();
    },
    onMutate: async (payload: { id: number; order: number }[]) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ["collections"] });

      // Snapshot the previous value
      const previousCollections = queryClient.getQueryData<SelectCollection[]>([
        "collections",
      ]);

      // Optimistically update to the new value
      if (previousCollections) {
        const updatedCollections = previousCollections
          .map((collection) => {
            const payloadItem = payload.find(
              (item) => item.id === collection.id
            );
            return payloadItem
              ? { ...collection, order: payloadItem.order }
              : collection;
          })
          .sort((a, b) => a.order - b.order);

        queryClient.setQueryData<SelectCollection[]>(
          ["collections"],
          updatedCollections
        );
      }

      // Return a context object with the snapshotted value
      return { previousCollections };
    },
    onError: (err, payload, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousCollections) {
        queryClient.setQueryData(["collections"], context.previousCollections);
      }
    },
    onSuccess: () => {
      // Only refetch on success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      void invalidatePublicMenuQuery();
    },
  });

  return {
    useCollections,
    fetchCollections,
    createCollection,
    editCollection,
    reorderCollections,
  };
}
