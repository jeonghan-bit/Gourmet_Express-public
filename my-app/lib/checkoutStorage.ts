const CART_STORAGE_KEY = "cart";
const CHECKOUT_PREFILL_STORAGE_KEY = "checkout-reorder-prefill";
export const CART_UPDATED_EVENT = "cart-updated";

type CheckoutReorderPrefill = {
  additionalNote: string;
};

export function saveReorderForCheckout(
  cart: unknown[],
  additionalNote: string
) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  sessionStorage.setItem(
    CHECKOUT_PREFILL_STORAGE_KEY,
    JSON.stringify({ additionalNote } satisfies CheckoutReorderPrefill)
  );
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function consumeCheckoutReorderPrefill(): CheckoutReorderPrefill | null {
  const savedPrefill = sessionStorage.getItem(CHECKOUT_PREFILL_STORAGE_KEY);
  if (!savedPrefill) return null;

  sessionStorage.removeItem(CHECKOUT_PREFILL_STORAGE_KEY);
  try {
    const parsed = JSON.parse(savedPrefill);
    return {
      additionalNote:
        typeof parsed?.additionalNote === "string" ? parsed.additionalNote : "",
    };
  } catch {
    return null;
  }
}
