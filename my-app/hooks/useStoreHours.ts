"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { DateTime } from "luxon";
import type { SelectStoreHours } from "@/lib/types";
import { STORE_CONFIG } from "@/lib/storeConfig";
import { getEffectiveStoreOpen } from "@/lib/storefrontState";
import { useTemporaryClosure } from "@/hooks/useTemporaryClosure";
import {
  STOREFRONT_STATUS_QUERY_KEY,
  type StorefrontStatus,
  storefrontStatusQueryOptions,
} from "@/hooks/useStorefrontStatus";

interface StoreHoursData {
  dayOfWeek: string;
  openTime: string;
  closeTime: string;
  isOpen?: boolean;
}

interface StoreStatus {
  isOpen: boolean;
  todayHours: {
    open: string;
    close: string;
  } | null;
}

const STORE_HOURS_UPDATED_EVENT = "store-hours-updated";

const upsertStoreHours = (
  currentHours: SelectStoreHours[] = [],
  updatedHours: SelectStoreHours
) => {
  const existingIndex = currentHours.findIndex(
    (hours) => hours.dayOfWeek === updatedHours.dayOfWeek
  );

  if (existingIndex === -1) {
    return [...currentHours, updatedHours];
  }

  return currentHours.map((hours, index) =>
    index === existingIndex ? updatedHours : hours
  );
};

// Fetch all store hours
export function useStoreHours() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleStoreHoursUpdated = (event: Event) => {
      const updatedHours = (event as CustomEvent<SelectStoreHours>).detail;
      if (!updatedHours) return;

      queryClient.setQueryData<StorefrontStatus>(
        STOREFRONT_STATUS_QUERY_KEY,
        (current) => ({
          storeHours: upsertStoreHours(current?.storeHours, updatedHours),
          maintenanceMode: current?.maintenanceMode ?? { isActive: false },
          temporaryClosure: current?.temporaryClosure ?? {
            isActive: false,
            message: null,
          },
        })
      );
    };

    window.addEventListener(STORE_HOURS_UPDATED_EVENT, handleStoreHoursUpdated);
    return () => {
      window.removeEventListener(
        STORE_HOURS_UPDATED_EVENT,
        handleStoreHoursUpdated
      );
    };
  }, [queryClient]);

  return useQuery({
    ...storefrontStatusQueryOptions,
    select: (status) => status.storeHours,
    refetchOnWindowFocus: false,
  });
}

// Update store hours
export function useUpdateStoreHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StoreHoursData): Promise<SelectStoreHours> => {
      const response = await fetch("/api/store-hours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update store hours");
      }

      return response.json();
    },
    onSuccess: (updatedHours) => {
      queryClient.setQueryData<StorefrontStatus>(
        STOREFRONT_STATUS_QUERY_KEY,
        (current) => ({
          storeHours: upsertStoreHours(current?.storeHours, updatedHours),
          maintenanceMode: current?.maintenanceMode ?? { isActive: false },
          temporaryClosure: current?.temporaryClosure ?? {
            isActive: false,
            message: null,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent<SelectStoreHours>(STORE_HOURS_UPDATED_EVENT, {
          detail: updatedHours,
        })
      );
    },
  });
}

// Combined hook: Get store hours data and calculate real-time store status
export function useStoreStatus(): StoreStatus & {
  storeHours: SelectStoreHours[];
  isClosed: boolean;
  closureMessage: string | null;
  isLoading: boolean;
  error: unknown;
} {
  const { data: storeHours = [], isLoading, error } = useStoreHours();
  const {
    isClosed,
    closureMessage,
    isLoading: isClosureLoading,
    error: closureError,
  } = useTemporaryClosure();

  const [currentTime, setCurrentTime] = useState(
    DateTime.now().setZone(STORE_CONFIG.timeZone)
  );
  // Update current time every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(DateTime.now().setZone(STORE_CONFIG.timeZone));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const { isOpen, todayHours } = useMemo(() => {
    const dayName = currentTime.toFormat("cccc");
    const today = storeHours.find((h) => h.dayOfWeek === dayName);

    if (!today || !today.isOpen) {
      return { isOpen: false, todayHours: null };
    }

    const [oh, om] = today.openTime.split(":").map(Number);
    const [ch, cm] = today.closeTime.split(":").map(Number);

    const nowMin = currentTime.hour * 60 + currentTime.minute;
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    const weeklyHoursOpen = nowMin >= openMin && nowMin < closeMin;
    return {
      isOpen: getEffectiveStoreOpen(weeklyHoursOpen, isClosed),
      todayHours: { open: today.openTime, close: today.closeTime },
    };
  }, [storeHours, currentTime, isClosed]);

  return {
    isOpen,
    todayHours,
    storeHours,
    isClosed,
    closureMessage,
    isLoading: isLoading || isClosureLoading,
    error: error || closureError,
  };
}

// Get store hours as a map for easy lookup (if needed elsewhere)
export function useStoreHoursMap() {
  const { storeHours } = useStoreStatus();

  const storeHoursMap = storeHours.reduce((acc, hours) => {
    acc[hours.dayOfWeek] = {
      open: hours.openTime,
      close: hours.closeTime,
      isOpen: hours.isOpen,
    };
    return acc;
  }, {} as Record<string, { open: string; close: string; isOpen: boolean }>);

  return storeHoursMap;
}
