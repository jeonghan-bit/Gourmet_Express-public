import React from "react";
import type { SelectOrderWithUser } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";
import { STORE_CONFIG } from "@/lib/storeConfig";
import {
  formatCanadianPhoneNumber,
  normalizeProductDisplayName,
} from "@/lib/utils";
import {
  isAdminCustomOption,
  isAdminRemoveOption,
} from "@/lib/adminCustomOption";

interface PrintReceiptProps {
  order: SelectOrderWithUser;
  applyCashDiscount?: boolean;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({
  order,
  applyCashDiscount = false,
}) => {
  const orderDetails =
    typeof order.orderDetails === "string"
      ? JSON.parse(order.orderDetails)
      : order.orderDetails;

  const itemsList = Array.isArray(orderDetails?.items)
    ? orderDetails.items
    : [];
  const additionalNote = orderDetails?.additionalNote || null;
  const allergyInfo = orderDetails?.allergyInfo || order.user?.allergyInfo || null;
  const deliveryAddressDetails =
    orderDetails?.deliveryAddressDetails ||
    order.user?.deliveryAddressDetails ||
    null;
  const deliveryAddress =
    deliveryAddressDetails?.formattedAddress ||
    orderDetails?.deliveryAddress ||
    order.user?.address ||
    null;
  const buildingAccess =
    deliveryAddressDetails?.accessMethod === "buzzer"
      ? `Buzzer ${deliveryAddressDetails.buzzerCode || ""}`.trim()
      : deliveryAddressDetails?.accessMethod === "call_on_arrival"
        ? "Call on arrival"
        : "No buzzer required";
  const deliveryCharge =
    order.fulfillmentType === "delivery"
      ? Number(orderDetails?.deliveryCharge || 0)
      : 0;

  const formatMoney = (value: number) => `$${value.toFixed(2)}`;

  const getOptionUnitPrice = (item: any) => {
    if (!Array.isArray(item.selectedOptions)) {
      return Number(item.additionalPrice || 0);
    }

    return item.selectedOptions.reduce(
      (sum: number, option: any) =>
        sum +
        (option.selectedItemPrices || []).reduce(
          (optionSum: number, price: string | number) =>
            optionSum + Number(price || 0),
          0
        ),
      0
    );
  };

  const rawSubtotal = itemsList.reduce(
    (sum: number, item: any) =>
      sum + (Number(item.price || 0) + getOptionUnitPrice(item)) * item.quantity,
    0
  );

  const subtotal = Math.round(rawSubtotal * 100) / 100; // Round subtotal to 2 decimals
  const taxableSubtotal = subtotal + deliveryCharge;
  const tax = Math.round(taxableSubtotal * 0.13 * 100) / 100;
  const totalBeforeDiscount = taxableSubtotal + tax;

  // Calculate cash discount if applicable
  const cashDiscount = applyCashDiscount
    ? Math.round(totalBeforeDiscount * 0.1 * 100) / 100
    : 0;
  const total = totalBeforeDiscount - cashDiscount;
  const removeReceiptEmojis = (value: string) =>
    value
      .replace(/(?:[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\uFE0F)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const rowStyle = { display: "flex", alignItems: "flex-start" };
  const qtyColumnStyle = { flex: "1" };
  const productColumnStyle = { flex: "3" };
  const priceColumnStyle = { flex: "2", textAlign: "right" as const };

  return (
    <div
      className="print-receipt"
      style={{
        fontFamily: "monospace",
        fontSize: "16px",
        lineHeight: "1.2",
        maxWidth: "300px",
        margin: "0 auto",
        padding: "20px",
        backgroundColor: "white",
        color: "black",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div
          style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "5px" }}
        >
          {STORE_CONFIG.name}
        </div>
        <div>{STORE_CONFIG.address.street}</div>
        <div>
          {STORE_CONFIG.address.city}, {STORE_CONFIG.address.province},{" "}
          {STORE_CONFIG.address.postalCode}
        </div>
        <div>Tel: {STORE_CONFIG.phone.display}</div>
      </div>

      {/* Separator */}
      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "10px 0",
          width: "100%",
        }}
      ></div>

      {/* Order Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          marginBottom: "10px",
        }}
      >
        <span>ORDER TIME:</span>
        <span style={{ textAlign: "center" }}>
          {formatDate(new Date(order.createdAt))}
        </span>
        {order.fulfillmentTimingType === "SCHEDULED" && order.scheduledTime && (
          <>
            <span>SCHEDULED TIME:</span>
            <span style={{ fontWeight: "bold", textAlign: "center" }}>
              {formatDate(new Date(order.scheduledTime))}
            </span>
          </>
        )}
        <span>ORDER TYPE:</span>
        <span style={{ fontWeight: "bold", textAlign: "center" }}>
          {order.fulfillmentType}
        </span>
        <span>ORDER NO:</span>
        <span style={{ fontWeight: "bold", textAlign: "center" }}>
          #{order.id}
        </span>
      </div>

      {/* Separator */}
      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "10px 0",
          width: "100%",
        }}
      ></div>

      <div
        style={{
          margin: "10px 0",
          overflowWrap: "anywhere",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            marginBottom: "4px",
            textAlign: "center",
          }}
        >
          CUSTOMER INFOMATION
        </div>
        <div>
          <span style={{ fontWeight: "bold" }}>Name:</span>{" "}
          {removeReceiptEmojis(order.user?.name || "Name unavailable")}
        </div>
        <div>
          <span style={{ fontWeight: "bold" }}>Phone:</span>{" "}
          {removeReceiptEmojis(
            formatCanadianPhoneNumber(order.user?.phoneNumber) ||
              "Phone unavailable"
          )}
        </div>
      </div>

      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "10px 0",
          width: "100%",
        }}
      ></div>

      {order.fulfillmentType === "delivery" && (
        <>
          <div
            style={{
              margin: "10px 0",
              overflowWrap: "anywhere",
              textAlign: "left",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "4px",
                textAlign: "center",
              }}
            >
              DELIVERY ADDRESS
            </div>
            <div>
              <span style={{ fontWeight: "bold" }}>Street:</span>{" "}
              {removeReceiptEmojis(deliveryAddress || "Address unavailable")}
            </div>
            {deliveryAddressDetails?.addressType === "building" &&
              deliveryAddressDetails.unitNumber && (
                <div style={{ marginTop: "4px" }}>
                  <span style={{ fontWeight: "bold" }}>Unit#:</span>{" "}
                  {removeReceiptEmojis(deliveryAddressDetails.unitNumber)}
                </div>
              )}
            {deliveryAddressDetails?.addressType === "building" && (
              <div>
                <span style={{ fontWeight: "bold" }}>Buzzer#:</span>{" "}
                {removeReceiptEmojis(buildingAccess)}
              </div>
            )}
            {deliveryAddressDetails?.deliveryInstructions && (
              <div>
                <span style={{ fontWeight: "bold" }}>
                  Delivery Instructions:
                </span>{" "}
                {removeReceiptEmojis(
                  deliveryAddressDetails.deliveryInstructions
                )}
              </div>
            )}
          </div>
          <div
            style={{
              borderTop: "1px dashed #000",
              margin: "10px 0",
              width: "100%",
            }}
          ></div>
        </>
      )}

      {(allergyInfo || additionalNote) && (
        <>
          <div style={{ margin: "10px 0" }}>
            <div
              style={{
                fontWeight: "bold",
                marginBottom: "4px",
                textAlign: "center",
              }}
            >
              NOTE
            </div>
            {allergyInfo && (
              <div style={{ marginBottom: additionalNote ? "6px" : "0" }}>
                <span style={{ fontWeight: "bold" }}>Allergy:</span>{" "}
                {removeReceiptEmojis(allergyInfo)}
              </div>
            )}
            {additionalNote && (
              <div>
                <span style={{ fontWeight: "bold" }}>Request:</span>{" "}
                {removeReceiptEmojis(additionalNote)}
              </div>
            )}
          </div>
          <div
            style={{
              borderTop: "1px dashed #000",
              margin: "10px 0",
              width: "100%",
            }}
          ></div>
        </>
      )}

      {/* Table Header */}
      <div style={{ ...rowStyle, marginBottom: "5px" }}>
        <span style={qtyColumnStyle}>Qty</span>
        <span style={productColumnStyle}>Product</span>
        <span style={priceColumnStyle}>Price</span>
      </div>

      {/* Separator */}
      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "5px 0",
          width: "100%",
        }}
      ></div>

      {/* Items */}
      {itemsList.map((item: any, index: number) => {
        const quantity = Number(item.quantity || 0);
        const productTotal = Number(item.price || 0) * quantity;
        const selectedOptions = Array.isArray(item.selectedOptions)
          ? [...item.selectedOptions]
              .filter((option) => !isAdminRemoveOption(option))
              .sort(
                (a, b) =>
                  Number(isAdminCustomOption(a)) -
                  Number(isAdminCustomOption(b))
              )
          : [];
        return (
          <div key={index} style={{ marginBottom: "10px" }}>
            <div style={rowStyle}>
              <span style={qtyColumnStyle}>{item.quantity}</span>
              <span style={productColumnStyle}>
                {removeReceiptEmojis(
                  normalizeProductDisplayName(item.name || "")
                )}
              </span>
              <span style={priceColumnStyle}>
                {formatMoney(productTotal)}
              </span>
            </div>
            {/* Options */}
            {selectedOptions.length > 0 && (
              <>
                {selectedOptions.map(
                  (option: any, optionIndex: number) => {
                    const labels = option.selectedItemLabels || [];
                    const prices = option.selectedItemPrices || [];

                    return (
                      <React.Fragment key={optionIndex}>
                        {labels.map((label: string, labelIndex: number) => {
                          const optionTotal =
                            Number(prices[labelIndex] || 0) * quantity;

                          return (
                            <div
                              key={`${optionIndex}-${labelIndex}`}
                              style={{
                                ...rowStyle,
                                fontSize: "14px",
                                color: "#666",
                              }}
                            >
                              <span style={qtyColumnStyle}></span>
                              <span
                                style={{
                                  ...productColumnStyle,
                                  paddingLeft: "10px",
                                }}
                              >
                                {isAdminCustomOption(option)
                                  ? `Custom Option: ${removeReceiptEmojis(
                                      label
                                    )}`
                                  : removeReceiptEmojis(label)}
                              </span>
                              <span style={priceColumnStyle}>
                                {formatMoney(optionTotal)}
                              </span>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  }
                )}
              </>
            )}
            {/* Special Request */}
            {item.specialRequest && (
              <div
                style={{
                  ...rowStyle,
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                <span style={qtyColumnStyle}></span>
                <span style={productColumnStyle}>
                  &gt;&gt;request:{removeReceiptEmojis(item.specialRequest)}
                </span>
                <span style={priceColumnStyle}></span>
              </div>
            )}
          </div>
        );
      })}

      {/* Separator */}
      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "10px 0",
          width: "100%",
        }}
      ></div>

      {/* Totals */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>SubTotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        {deliveryCharge > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Delivery Charge</span>
            <span>{formatMoney(deliveryCharge)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>HST</span>
          <span>{formatMoney(tax)}</span>
        </div>
        {applyCashDiscount && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cash Discount(-10%)</span>
            <span>-{formatMoney(cashDiscount)}</span>
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "16px",
            fontWeight: "bold",
            marginTop: "5px",
          }}
        >
          <span>TOTAL</span>
          <span>{formatMoney(total)}</span>
        </div>
      </div>

      {/* Payment Info */}
      {/* <div style={{ marginTop: "20px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Received Cash</span>
          <span>$0.00</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Change</span>
          <span>$0.00</span>
        </div>
      </div> */}

      {/* HST Number */}
      <div style={{ textAlign: "center", fontSize: "10px", margin: "10px 0" }}>
        HST#745133025RT0001
      </div>

      {/* Thank You */}
      <div
        style={{ textAlign: "center", fontWeight: "bold", margin: "10px 0" }}
      >
        Thank You!
      </div>

      {/* Separator */}
      <div
        style={{
          borderTop: "1px dashed #000",
          margin: "10px 0",
          width: "100%",
        }}
      ></div>

    </div>
  );
};

export default PrintReceipt;
