// store-status.tsx
"use client";

import { MapPin, Phone, RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreStatus } from "@/hooks/useStoreHours";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { usePathname } from "next/navigation";
import { STORE_CONFIG, STORE_MAP_SEARCH_QUERY } from "@/lib/storeConfig";

export function StoreStatus() {
  const { isOpen, todayHours } = useStoreStatus();
  const { isMaintenanceMode, toggleMaintenanceMode } = useMaintenanceMode();
  const pathname = usePathname();
  const isAdminDashboard = pathname?.startsWith("/admin");

  const openInMaps = () => {
    const encodedAddress = encodeURIComponent(STORE_MAP_SEARCH_QUERY);
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const mapsUrl = isIOS
      ? `maps://maps.apple.com/?q=${encodedAddress}`
      : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapsUrl, "_blank");
  };

  const makePhoneCall = () => {
    window.location.href = `tel:${STORE_CONFIG.phone.href}`;
  };

  return (
    <div
      className={
        isAdminDashboard
          ? "flex min-w-0 items-center gap-1 text-[10px] sm:gap-2"
          : "flex w-full min-w-0 items-center gap-1 text-[10px] sm:w-auto sm:gap-2"
      }
    >
      <Button
        variant="outline"
        size="sm"
        className={
          isAdminDashboard
            ? "hidden h-6 justify-start gap-1 px-2 text-left sm:flex"
            : "h-6 min-w-0 flex-1 justify-start gap-1 px-2 text-left sm:w-auto sm:flex-none"
        }
        onClick={openInMaps}
      >
        <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
        <span className="truncate max-w-[90px]">
          {STORE_CONFIG.address.street}...
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className={
          isAdminDashboard
            ? "hidden h-6 justify-start gap-1 px-2 text-left sm:flex"
            : "h-6 min-w-0 flex-1 justify-start gap-1 px-2 text-left sm:w-auto sm:flex-none"
        }
        onClick={makePhoneCall}
      >
        <Phone className="h-2.5 w-2.5 flex-shrink-0" />
        <span className="truncate">{STORE_CONFIG.phone.display}</span>
      </Button>

      <div
        className={
          isAdminDashboard
            ? "hidden items-center gap-1 sm:flex"
            : "flex shrink-0 items-center gap-1"
        }
      >
        <span className="text-[10px]">
          {todayHours
            ? `${todayHours.open} – ${todayHours.close}`
            : "Closed"}
        </span>
        <Badge
          variant="outline"
          className={`flex items-center gap-1 ml-1 text-[10px] ${
            isOpen
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          <div
            className={`h-1 w-1 rounded-full ${
              isOpen ? "bg-green-500" : "bg-red-500"
            }`}
          />
          {isOpen ? "OPEN" : "CLOSED"}
        </Badge>
      </div>

      {isAdminDashboard && (
        <Button
          variant="outline"
          size="sm"
          className={`h-7 max-w-[132px] justify-start gap-1 px-2 text-left sm:h-6 sm:max-w-none ${
            isMaintenanceMode
              ? "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
              : "hover:bg-gray-100"
          }`}
          onClick={toggleMaintenanceMode}
        >
          <Settings className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate text-[10px]">
            {isMaintenanceMode ? "Maintenance ON" : "Maintenance OFF"}
          </span>
        </Button>
      )}
    </div>
  );
}
