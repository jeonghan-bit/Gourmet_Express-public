"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SelectOrderWithUser } from "@/lib/types";
import { usePendingOrders } from "./pending-orders-context";
import { useStoreStatus } from "@/hooks/useStoreHours";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { toast } from "sonner";

const STORE_CLOSED_POLL_GRACE_MS = 60 * 1000;
const PENDING_ORDER_LIMIT = 30;
const PENDING_ORDER_WARNING_ID = "pending-orders-over-limit";

export function PendingOrdersMonitor() {
  const [processedOrderIds, setProcessedOrderIds] = useState<Set<number>>(
    new Set()
  );
  const [storeClosedPollGraceEndsAt, setStoreClosedPollGraceEndsAt] = useState<
    number | null
  >(null);
  const previousStoreOpen = useRef<boolean | null>(null);
  const { addPendingOrder, isPendingOrdersPaused } = usePendingOrders();
  const queryClient = useQueryClient();
  const { isOpen: isStoreOpen, isLoading: isStoreStatusLoading } =
    useStoreStatus();
  const { isMaintenanceMode, isLoading: isMaintenanceModeLoading } =
    useMaintenanceMode();
  const isWithinStoreClosedPollGrace =
    storeClosedPollGraceEndsAt !== null &&
    Date.now() < storeClosedPollGraceEndsAt;
  const shouldPollPendingOrders =
    !isStoreStatusLoading &&
    !isMaintenanceModeLoading &&
    (isMaintenanceMode || isStoreOpen || isWithinStoreClosedPollGrace);
  const notificationSound = useRef<HTMLAudioElement | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const isIOS =
    typeof navigator !== "undefined" &&
    /iP(ad|hone|od)/.test(navigator.userAgent);

  useEffect(() => {
    if (isStoreStatusLoading) return;

    const wasStoreOpen = previousStoreOpen.current;
    previousStoreOpen.current = isStoreOpen;

    if (isStoreOpen) {
      setStoreClosedPollGraceEndsAt(null);
      return;
    }

    if (wasStoreOpen !== true) {
      setStoreClosedPollGraceEndsAt(null);
      return;
    }

    setStoreClosedPollGraceEndsAt((currentGraceEndsAt) => {
      if (currentGraceEndsAt !== null && Date.now() < currentGraceEndsAt) {
        return currentGraceEndsAt;
      }

      return Date.now() + STORE_CLOSED_POLL_GRACE_MS;
    });
  }, [isStoreOpen, isStoreStatusLoading]);

  useEffect(() => {
    if (storeClosedPollGraceEndsAt === null) return;

    const remainingGraceMs = storeClosedPollGraceEndsAt - Date.now();
    if (remainingGraceMs <= 0) {
      setStoreClosedPollGraceEndsAt(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStoreClosedPollGraceEndsAt(null);
    }, remainingGraceMs);

    return () => window.clearTimeout(timeoutId);
  }, [storeClosedPollGraceEndsAt]);

  // Fetch pending orders every 12 seconds while the store can accept orders
  const { data: ordersData } = useQuery<{
    orders: SelectOrderWithUser[];
    totalOrders: number;
  }>({
    queryKey: ["pendingOrdersMonitor"],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: "pending",
        page: "1",
        limit: String(PENDING_ORDER_LIMIT),
        sortBy: "createdAt",
        sortOrder: "asc",
        view: "monitor",
      });
      const res = await fetch(`/api/orders?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: shouldPollPendingOrders,
    refetchInterval: shouldPollPendingOrders ? 12000 : false,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const totalPendingOrders = ordersData?.totalOrders ?? 0;

  useEffect(() => {
    if (totalPendingOrders > PENDING_ORDER_LIMIT) {
      toast.warning(
        `There are ${totalPendingOrders} pending orders. The monitor is showing the oldest ${PENDING_ORDER_LIMIT}.`,
        {
          id: PENDING_ORDER_WARNING_ID,
          duration: Infinity,
          closeButton: true,
        }
      );
      return;
    }

    toast.dismiss(PENDING_ORDER_WARNING_ID);
  }, [totalPendingOrders]);

  useEffect(() => {
    return () => {
      toast.dismiss(PENDING_ORDER_WARNING_ID);
    };
  }, []);

  const orders = useMemo(
    () => (isPendingOrdersPaused ? [] : ordersData?.orders ?? []),
    [isPendingOrdersPaused, ordersData?.orders]
  );

  // Initialize audio on mount and enable user interaction
  useEffect(() => {
    if (!notificationSound.current) {
      const audio = document.createElement("audio");
      audio.src = "/notification_new.mp3";
      audio.preload = "auto";
      audio.volume = 1.0;
      audio.loop = true;
      notificationSound.current = audio;

      // Enable audio context on any user interaction
      const enableAudio = () => {
        if (!audioReady && notificationSound.current) {
          // Try to prime the audio
          const playPromise = notificationSound.current.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              // Immediately pause - we just needed to prime it
              notificationSound.current?.pause();
              notificationSound.current!.currentTime = 0;
              setAudioReady(true);
            }).catch(() => {
              // Still mark as ready, will retry on actual play attempt
              setAudioReady(true);
            });
          }
        }
      };

      // Add listeners for user interaction
      const events = ['click', 'touchstart', 'keydown', 'mousedown'];
      events.forEach(event => {
        document.addEventListener(event, enableAudio, { once: true });
      });

      // Cleanup
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, enableAudio);
        });
      };
    }
  }, [audioReady]);

  // Manage alarm playback based on pending orders
  useEffect(() => {
    if (!notificationSound.current || isIOS) return;

    const hasPendingOrders = orders.length > 0;

    if (hasPendingOrders) {
      // Try to play if there are pending orders
      if (notificationSound.current.paused) {
        const playPromise = notificationSound.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Could not play notification sound - user interaction may be required:", error);
            // If play fails, try to enable audio on next interaction
            if (!audioReady) {
              setAudioReady(false);
            }
          });
        }
      }
    } else {
      // Stop playing if no pending orders
      if (!notificationSound.current.paused) {
        notificationSound.current.pause();
        notificationSound.current.currentTime = 0;
      }
    }
  }, [orders.length, isIOS, audioReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (notificationSound.current) {
        notificationSound.current.pause();
        notificationSound.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    // Get new pending orders that haven't been processed yet
    const newPendingOrders = orders.filter((order) => {
      if (order.status !== "pending") return false;
      if (processedOrderIds.has(order.id)) return false; // Skip if already processed

      const orderTime = new Date(order.createdAt).getTime();
      const currentTime = new Date().getTime();
      const oneMinuteAgo = currentTime - 60 * 1000; // 60 seconds in milliseconds

      return orderTime >= oneMinuteAgo;
    });

    // If we have new pending orders that are less than 1 minute old
    if (newPendingOrders.length > 0) {
      // Mark these orders as processed
      setProcessedOrderIds((prev) => {
        const newSet = new Set(prev);
        newPendingOrders.forEach((order) => newSet.add(order.id));
        return newSet;
      });

      // Show dialog for each new pending order
      newPendingOrders.forEach((order) => {
        addPendingOrder(order);
      });

      queryClient.invalidateQueries({ queryKey: ["dashboardSummary"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    }
  }, [orders, addPendingOrder, processedOrderIds, queryClient]);

  // This component doesn't render anything
  return null;
}
