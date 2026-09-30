"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useStoreStatus } from "@/hooks/useStoreHours";
import { STORE_CONFIG, STORE_MAP_SEARCH_QUERY } from "@/lib/storeConfig";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const { isOpen } = useStoreStatus();

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

  const sendEmail = () => {
    window.location.href = `mailto:${STORE_CONFIG.email}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[425px] [&>button]:h-12 [&>button]:w-12">
        <DialogHeader>
          <DialogTitle className="text-xl">Customer Support</DialogTitle>
          <DialogDescription>
            We&apos;re here to help! Contact us using one of the methods below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Call Us</h3>
              <p className="text-sm text-muted-foreground">
                For immediate assistance
              </p>
              <p className="text-lg font-semibold">
                {STORE_CONFIG.phone.display}
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Email Us</h3>
              <p className="text-sm text-muted-foreground">
                For general inquiries and feedback
              </p>
              <p className="text-sm font-semibold">{STORE_CONFIG.email}</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Visit Us</h3>
              <p className="text-sm text-muted-foreground">
                {STORE_CONFIG.name}
              </p>
              <p className="text-sm">{STORE_CONFIG.address.formatted}</p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="bg-primary/10 p-2 rounded-full">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium">Store status</h3>
              <p
                className={`text-sm font-semibold ${
                  isOpen ? "text-green-600" : "text-red-600"
                }`}
              >
                {isOpen ? "Open" : "Closed"}
              </p>
            </div>
          </div>

        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="min-h-12"
          >
            Close
          </Button>
          <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:shrink-0">
            <Button variant="outline" size="sm" onClick={openInMaps} className="min-h-12">
              <MapPin className="h-4 w-4" />
              Directions
            </Button>
            <Button variant="outline" size="sm" onClick={sendEmail} className="min-h-12">
              <Mail className="h-4 w-4" />
              Email
            </Button>
            <Button size="sm" onClick={makePhoneCall} className="min-h-12">
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
