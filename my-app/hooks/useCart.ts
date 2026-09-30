import { useState, useEffect } from "react";
import cuisine1_photo from "@/public/cuisine1_photo.webp";
import { OptionSelection } from "@/lib/types";
import { CART_UPDATED_EVENT } from "@/lib/checkoutStorage";

interface CartItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string | typeof cuisine1_photo;
  quantity: number;
  specialRequest?: string;
  selectedOptions?: OptionSelection[];
  uniqueId?: string;
}

// Helper function to generate unique ID for cart items
const generateUniqueId = (item: CartItem): string => {
  const optionsString = item.selectedOptions
    ? JSON.stringify(
        [...item.selectedOptions].sort((a, b) =>
          a.optionTypeId.localeCompare(b.optionTypeId)
        )
      )
    : "";
  const specialRequest = item.specialRequest || "";
  return `${item.id}-${optionsString}-${specialRequest}`;
};

// Helper function to migrate cart items to include missing properties
const migrateCartItems = (cartItems: CartItem[]): CartItem[] => {
  return cartItems.map((item: CartItem) => {
    let migratedItem = { ...item };

    if (item.selectedOptions) {
      const migratedOptions = item.selectedOptions.map((option: any) => {
        const migratedOption = { ...option };
        if (!option.selectedItemLabels) {
          migratedOption.selectedItemLabels =
            option.selectedItems?.map(() => "Unknown option") || [];
        }
        if (!option.selectedItemPrices) {
          migratedOption.selectedItemPrices =
            option.selectedItems?.map(() => "0") || [];
        }
        return migratedOption;
      });
      migratedItem = { ...migratedItem, selectedOptions: migratedOptions };
    }

    // Add uniqueId if not present
    if (!migratedItem.uniqueId) {
      migratedItem.uniqueId = generateUniqueId(migratedItem);
    }

    return migratedItem;
  });
};

export function useCart() {
  const [isInitialized, setIsInitialized] = useState(false);
  // Keep the server render and the browser's first render identical. Saved
  // cart data is loaded by the mount effect below, after hydration completes.
  const [cart, setCart] = useState<CartItem[]>([]);
  // Load cart from localStorage on mount and when window gains focus
  useEffect(() => {
    const loadCart = () => {
      const savedCart = localStorage.getItem("cart");
      if (savedCart) {
        try {
          const parsedCart = JSON.parse(savedCart);
          // Debug logging to check what's being loaded
          // Migrate existing cart items to include selectedItemLabels if missing
          const migratedCart = migrateCartItems(parsedCart);
          setCart(migratedCart);
        } catch (error) {
          console.error("Error parsing cart from localStorage:", error);
          setCart([]);
        }
      }
      setIsInitialized(true);
    };

    // Load cart on mount
    loadCart();

    // Add event listener for window focus
    window.addEventListener("focus", loadCart);
    window.addEventListener(CART_UPDATED_EVENT, loadCart);

    return () => {
      window.removeEventListener("focus", loadCart);
      window.removeEventListener(CART_UPDATED_EVENT, loadCart);
    };
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;

    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart, isInitialized]);

  const addToCart = (item: CartItem) => {
    // Ensure selectedOptions have the proper structure
    const normalizedItem = {
      ...item,
      selectedOptions: item.selectedOptions?.map((option) => ({
        ...option,
        selectedItemLabels:
          option.selectedItemLabels ||
          option.selectedItems?.map(() => "Unknown option") ||
          [],
        selectedItemPrices:
          option.selectedItemPrices ||
          option.selectedItems?.map(() => "0") ||
          [],
      })),
    };

    // Generate unique ID for the item
    const itemWithUniqueId = {
      ...normalizedItem,
      uniqueId: generateUniqueId(normalizedItem),
    };

    setCart((prevCart) => {
      // Find if there's an identical item already in the cart
      const existingItemIndex = prevCart.findIndex(
        (cartItem) => cartItem.uniqueId === itemWithUniqueId.uniqueId
      );

      if (existingItemIndex !== -1) {
        // Update quantity of existing identical item
        return prevCart.map((cartItem, index) =>
          index === existingItemIndex
            ? {
                ...cartItem,
                quantity: cartItem.quantity + itemWithUniqueId.quantity,
              }
            : cartItem
        );
      } else {
        // Add as new item
        return [...prevCart, itemWithUniqueId];
      }
    });
  };

  const removeFromCart = (uniqueId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.uniqueId !== uniqueId)
    );
  };

  const updateQuantity = (uniqueId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(uniqueId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.uniqueId === uniqueId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("cart");
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      let itemTotal = item.price * item.quantity;

      // Add option prices
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        item.selectedOptions.forEach((option) => {
          option.selectedItemPrices?.forEach((price) => {
            itemTotal += parseFloat(price) * item.quantity;
          });
        });
      }

      return total + itemTotal;
    }, 0);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    isInitialized,
  };
}
