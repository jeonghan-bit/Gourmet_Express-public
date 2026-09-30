import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { toast } from "sonner";
import { PrintReceipt } from "./PrintReceipt";
import type { SelectOrderWithUser } from "@/lib/types";

interface PrintPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  order: SelectOrderWithUser;
  applyCashDiscount?: boolean;
}

export const PrintPreviewDialog: React.FC<PrintPreviewDialogProps> = ({
  open,
  onClose,
  order,
  applyCashDiscount: externalApplyCashDiscount = false,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const receiptDocument = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Receipt</title>
          <style>
            @page {
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 72mm;
              margin: 0;
              padding: 0;
              background: #fff;
            }

            body {
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .print-receipt {
              width: 72mm !important;
              max-width: 72mm !important;
              margin: 0 !important;
              padding: 3mm !important;
              overflow-wrap: anywhere;
            }

            @media print {
              html,
              body {
                width: 72mm;
              }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `;

    // Print from an off-screen frame so Chrome opens its normal print preview
    // directly instead of showing a separate about:blank window.
    const printFrame = document.createElement("iframe");
    printFrame.title = "Receipt";
    printFrame.style.position = "fixed";
    printFrame.style.left = "-10000px";
    printFrame.style.top = "0";
    printFrame.style.width = "72mm";
    printFrame.style.height = "1px";
    printFrame.style.border = "0";
    printFrame.style.pointerEvents = "none";

    const removePrintFrame = () => {
      printFrame.remove();
    };

    printFrame.onload = () => {
      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        removePrintFrame();
        toast.error("Unable to open the print preview. Please try again.");
        return;
      }

      frameWindow.addEventListener(
        "afterprint",
        () => {
          removePrintFrame();
          onClose();
        },
        { once: true }
      );

      frameWindow.setTimeout(() => {
        try {
          frameWindow.focus();
          frameWindow.print();
        } catch {
          removePrintFrame();
          toast.error("Unable to open the print preview. Please try again.");
        }
      }, 100);
    };

    printFrame.srcdoc = receiptDocument;
    document.body.appendChild(printFrame);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print Preview - Order #{order.id}
              </DialogTitle>
              <DialogDescription className="mt-1.5">
                Review the receipt before printing this order.
              </DialogDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button onClick={handlePrint} className="h-12 gap-2 px-4">
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>

        <div className="border rounded-lg p-4 bg-white">
          <div ref={printRef}>
            <PrintReceipt
              order={order}
              applyCashDiscount={externalApplyCashDiscount}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintPreviewDialog;
