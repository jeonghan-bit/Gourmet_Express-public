"use client";

import { createRef, useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FaCartPlus } from "react-icons/fa";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ShoppingCart,
  Menu,
  ArrowUp,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import cuisine1_photo from "@/public/cuisine1_photo.webp";
import { DishDetailPopup } from "@/components/DishDetailPopup";
import type React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/hooks/useCart";
import { naturalSort, normalizeProductDisplayName } from "@/lib/utils";
import { useStoreStatus } from "@/hooks/useStoreHours";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { usePublicMenu } from "@/hooks/usePublicMenu";
import type {
  SelectCollection,
  SelectProductWithCollection,
  OptionSelection,
} from "@/lib/types";
import { getProductThumbnailUrl } from "@/lib/productImages";
import { getStorefrontNotice } from "@/lib/storefrontState";

interface OrderPageProps {
  initialCollections?: SelectCollection[];
  initialProducts?: SelectProductWithCollection[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string | typeof cuisine1_photo;
  categoryName?: string;
  quantity?: number;
  specialRequest?: string;
  selectedOptions?: OptionSelection[];
  uniqueId?: string;
}

interface MenuCategory {
  id: number;
  name: string;
  status: string;
  order: number;
  items: MenuItem[];
}

// Add function to split title into number and name
function splitTitle(title: string) {
  const displayTitle = normalizeProductDisplayName(title);
  const match = displayTitle.match(/^([A-Za-z]*\d+[A-Za-z]*\))\s*(.*)/);
  if (match) {
    return {
      number: match[1],
      name: match[2],
    };
  }
  return {
    number: "",
    name: displayTitle,
  };
}

export default function OrderPage({
  initialCollections,
  initialProducts,
}: OrderPageProps) {
  const { isOpen, todayHours, isClosed, closureMessage } = useStoreStatus();
  const { isMaintenanceMode } = useMaintenanceMode();
  const { data: session, status: sessionStatus } = useSession();
  const isSessionLoading = sessionStatus === "loading";
  const isAdmin = session?.user?.role === "admin";
  const storefrontNotice = !isSessionLoading
    ? getStorefrontNotice(isClosed, closureMessage, isMaintenanceMode)
    : null;
  const storefrontNoticeType = storefrontNotice?.type;
  const showCustomerMaintenance = isMaintenanceMode && !isAdmin;
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const sectionRefs = useRef<{
    [key: string]: React.RefObject<HTMLDivElement>;
  }>({});
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isManualSelection = useRef(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(156); // Default height
  const [categoriesHeight, setCategoriesHeight] = useState(48); // Default categories bar height
  const [isMobile, setIsMobile] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [storefrontNoticeOpen, setStorefrontNoticeOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { cart, addToCart, updateQuantity, getCartTotal, isInitialized } =
    useCart();

  const { data: publicMenu, isLoading: isLoadingMenu } = usePublicMenu(
    initialCollections && initialProducts
      ? {
          collections: initialCollections,
          products: initialProducts,
        }
      : undefined
  );
  const collections = publicMenu?.collections ?? [];
  const products = publicMenu?.products ?? [];

  useEffect(() => {
    if (storefrontNoticeType) {
      setStorefrontNoticeOpen(true);
    }
  }, [storefrontNoticeType, closureMessage]);

  // Transform collections and products into menu categories
  const menuCategories = collections
    .map((collection: any) => {
      const collectionProducts = products
        .filter(
          (product: SelectProductWithCollection) =>
            product.collection?.id === collection.id &&
            product.status === "active"
        )
        .map((product: SelectProductWithCollection) => ({
          id: product.id.toString(),
          name: product.name,
          price: parseFloat(product.price),
          description: product.description || "",
          image: product.image_url || cuisine1_photo,
          categoryName: collection.name,
        }))
        .sort((a, b) => naturalSort(a.name, b.name));

      return {
        ...collection,
        items: collectionProducts,
      } as MenuCategory;
    })
    .filter((category) => category.items.length > 0); // Only show categories with active products

  // Set initial selected category when data is loaded
  useEffect(() => {
    if (menuCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(menuCategories[0].id);
    }
  }, [menuCategories, selectedCategory]);

  // Measure navbar and categories height dynamically
  useEffect(() => {
    const updateHeights = () => {
      // Measure navbar height
      const navbarElement = document.getElementById('main-navbar');
      if (navbarElement) {
        const height = navbarElement.offsetHeight;
        setNavbarHeight(height);
        // Update CSS custom property for global use
        document.documentElement.style.setProperty('--navbar-height', `${height}px`);
      }

      // Measure categories bar height
      if (categoryMenuRef.current) {
        setCategoriesHeight(categoryMenuRef.current.offsetHeight);
      }

      // Check if mobile
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    // Update on mount and resize
    updateHeights();
    window.addEventListener('resize', updateHeights);

    // Use ResizeObserver for more accurate navbar height tracking
    const navbarElement = document.getElementById('main-navbar');
    const resizeObserver = new ResizeObserver(() => {
      updateHeights();
    });

    if (navbarElement) {
      resizeObserver.observe(navbarElement);
    }

    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(updateHeights, 100);

    return () => {
      window.removeEventListener('resize', updateHeights);
      resizeObserver.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    menuCategories.forEach((category) => {
      if (!sectionRefs.current[category.id.toString()]) {
        sectionRefs.current[category.id.toString()] =
          createRef<HTMLDivElement>();
      }
    });
  }, [menuCategories]);

  const scrollToSection = (categoryId: string) => {
    isManualSelection.current = true;
    const categoryIdNum = parseInt(categoryId);
    setSelectedCategory(categoryIdNum);
    const sectionElement = sectionRefs.current[categoryId]?.current;
    // Use dynamic heights: navbar + categories bar (mobile only)
    const offset = window.innerWidth < 768 ? navbarHeight + categoriesHeight : navbarHeight;

    if (sectionElement) {
      const elementPosition = sectionElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setTimeout(() => {
        isManualSelection.current = false;
      }, 1000);
    }
  };

  const handleScroll = useCallback(() => {
    if (isManualSelection.current) return;
    const scrollPosition = window.scrollY;
    let currentCategory = selectedCategory;

    // Show/hide back to top button based on scroll position
    setShowBackToTop(scrollPosition > 300);

    if (scrollPosition === 0 && menuCategories.length > 0) {
      currentCategory = menuCategories[0].id;
    } else {
      for (const category of menuCategories) {
        const element = sectionRefs.current[category.id.toString()]?.current;
        // Use dynamic heights with extra buffer for better category detection
        const offset = window.innerWidth < 768
          ? navbarHeight + categoriesHeight + 30
          : navbarHeight + 30;
        if (element && element.offsetTop <= scrollPosition + offset) {
          currentCategory = category.id;
        } else {
          break;
        }
      }
    }

    if (currentCategory !== selectedCategory) {
      setSelectedCategory(currentCategory);
      const sidebarElement = document.querySelector(".md\\:block.sticky");
      const buttonElement = sidebarElement?.querySelector(
        `button:nth-child(${
          menuCategories.findIndex((cat) => cat.id === currentCategory) + 1
        })`
      );
      if (
        buttonElement instanceof HTMLElement &&
        sidebarElement instanceof HTMLElement
      ) {
        sidebarElement.scrollTo({
          top:
            buttonElement.offsetTop -
            sidebarElement.clientHeight / 2 +
            buttonElement.clientHeight / 2,
          behavior: "smooth",
        });
      }
    }
  }, [selectedCategory, menuCategories, navbarHeight, categoriesHeight]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
    } else {
      const buttonElement = document.getElementById(
        `category-btn-${selectedCategory}`
      );
      if (buttonElement && categoryMenuRef.current) {
        buttonElement.scrollIntoView({
          behavior: "smooth",
          inline: "start",
          block: "nearest",
        });
      }
    }
  }, [selectedCategory, isInitialLoad]);


  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openPopup = (item: MenuItem) => {
    setSelectedItem(item);
    setIsPopupOpen(true);
  };

  const handleAddToCartFromPopup = (
    item: MenuItem,
    quantity: number,
    specialRequest: string,
    selectedOptions: OptionSelection[]
  ) => {
    addToCart({
      ...item,
      image: typeof item.image === "string" ? item.image : item.image.src,
      quantity: quantity,
      specialRequest,
      selectedOptions,
    });
  };

  // Helper function to format selected options for display
  const formatSelectedOptions = (selectedOptions: OptionSelection[]) => {
    if (!selectedOptions || selectedOptions.length === 0) return [];

    return selectedOptions.map((option) => {
      // Display option type and selected item labels with prices
      const itemLabels =
        option.selectedItemLabels?.join(", ") || "No selection";
      const itemPrices =
        option.selectedItemPrices
          ?.map((price) => `$${parseFloat(price).toFixed(2)}`)
          .join(", ") || "";
      return {
        optionType: option.optionType,
        itemLabels,
        itemPrices,
      };
    });
  };

  // Helper function to calculate item total with options
  const calculateItemTotal = (item: any) => {
    let basePrice = item.price * item.quantity;
    let optionsPrice = 0;

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach((option: OptionSelection) => {
        option.selectedItemPrices?.forEach((price) => {
          optionsPrice += parseFloat(price) * item.quantity;
        });
      });
    }

    return {
      basePrice,
      optionsPrice,
      total: basePrice + optionsPrice,
    };
  };

  if (
    isLoadingMenu
  ) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-8" aria-busy="true">
        <div className="container mx-auto">
          <h1 className="text-2xl font-semibold">Our Menu</h1>
          <p className="mt-2 text-muted-foreground">Loading menu items…</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 rounded-md border bg-white"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Dialog
        open={Boolean(storefrontNotice) && storefrontNoticeOpen}
        onOpenChange={setStorefrontNoticeOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div
              className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                storefrontNotice?.type === "closure"
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>
              {storefrontNotice?.type === "closure"
                ? "Store temporarily closed"
                : "Online ordering is under maintenance"}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">
              {storefrontNotice?.type === "closure"
                ? storefrontNotice.message
                : "You can still browse the menu, but new online orders are temporarily unavailable. Please call us to place an order."}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-6">
        <div className="md:grid md:grid-cols-[220px_1fr] md:gap-6">
          {/* Categories sidebar */}
          <div className="w-full md:w-auto">
            {/* Horizontal scrollable menu for mobile */}
            <div className="md:hidden">
              <div
                className="fixed left-0 right-0 bg-white shadow-md z-40 overflow-x-auto"
                style={{ top: `${navbarHeight}px` }}
                ref={categoryMenuRef}
              >
                <div className="flex whitespace-nowrap p-2 gap-2 items-center">
                  {menuCategories.map((category) => (
                    <button
                      key={category.id}
                      id={`category-btn-${category.id}`}
                      onClick={() => scrollToSection(category.id.toString())}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-white text-black hover:bg-gray-100 border border-muted"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Vertical sidebar for desktop */}
            <div
              className="hidden md:block sticky bg-gray-50 z-40 overflow-y-auto"
              style={{
                top: `${navbarHeight}px`,
                maxHeight: `calc(100vh - ${navbarHeight}px)`
              }}
            >
              <div className="p-4">
                <h2 className="font-semibold mb-4">Categories</h2>
                <div className="space-y-2">
                  {menuCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => scrollToSection(category.id.toString())}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ marginTop: isMobile ? `${categoriesHeight}px` : '0' }}>
            {menuCategories.map((category) => (
              <div
                key={category.id}
                id={category.id.toString()}
                ref={sectionRefs.current[category.id.toString()]}
                className="mb-2 sm:mb-8 scroll-mt-24"
              >
                <h2 className="text-base sm:text-xl font-semibold mb-2 sm:mb-4">
                  {category.name}
                </h2>
                <div className="grid gap-y-2 gap-x-3 sm:grid-cols-2 lg:grid-cols-3">
                  {category.items.map((item) => (
                    <Card
                      key={item.id}
                       className="p-2 sm:p-4 flex items-center gap-3 sm:gap-4 text-left rounded-md border border-muted cursor-pointer transition-colors hover:bg-gray-100 hover:shadow-sm min-h-[96px]"
                      onClick={() => openPopup(item)}
                    >
                      {/* Image */}
                       <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-md overflow-hidden flex-shrink-0">
                        <Image
                          src={
                            typeof item.image === "string"
                              ? getProductThumbnailUrl(item.image)
                              : item.image || "/cuisine1_photo.webp"
                          }
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 80px, 96px"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.srcset = "";
                            event.currentTarget.src =
                              typeof item.image === "string"
                                ? item.image
                                : "/cuisine1_photo.webp";
                          }}
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 overflow-hidden text-left">
                        <h3 className="font-semibold text-[16px] sm:text-sm lg:text-base overflow:hidden text-overflow:ellipsis white-space:nowrap">
                          {(() => {
                            const { number, name } = splitTitle(item.name);
                            return (
                              <>
                                {number && (
                                  <span className="text-gray-500">
                                    {number}{" "}
                                  </span>
                                )}
                                {name}
                              </>
                            );
                          })()}
                        </h3>
                        <p className="text-right text-[14px] sm:text-sm lg:text-[15px] font-semibold text-gray-600 overflow:hidden text-overflow:ellipsis white-space:nowrap">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>

                      {/* Cart icon */}
                      <div className="text-muted-foreground">
                        <FaCartPlus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Grey dash line separator */}
        <div className="flex items-center justify-center my-6">
          <div className="text-gray-400 text-sm">----- End of Menu -----</div>
        </div>
      </div>

      {/* Back to Top button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-4 left-4 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 bg-primary/70 hover:bg-primary/90 backdrop-blur-sm"
          size="icon"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      )}

      {/* Cart sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-4 right-4 h-10 px-3 sm:h-14 sm:px-4 flex items-center gap-1 sm:gap-2"
            size="default"
          >
            <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm sm:text-lg">
              {isInitialized ? `$${getCartTotal().toFixed(2)}` : "$0.00"}
            </span>
            {isInitialized && cart.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs sm:text-sm">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>Your Order</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 mt-4">
            {!isInitialized ? (
              <p className="text-center text-muted-foreground py-6">
                Loading cart...
              </p>
            ) : cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">
                Your cart is empty
              </p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => {
                  const itemTotal = calculateItemTotal(item);
                  return (
                    <Card
                      key={
                        item.uniqueId ||
                        `${item.id}-${item.specialRequest}-${JSON.stringify(
                          item.selectedOptions
                        )}`
                      }
                      className="p-4"
                    >
                      <div className="flex flex-col">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Product Image */}
                            <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={item.image || "/cuisine1_photo.webp"}
                                alt={item.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                                onError={(event) => {
                                  event.currentTarget.srcset = "";
                                  event.currentTarget.src =
                                    "/cuisine1_photo.webp";
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold">
                                {normalizeProductDisplayName(item.name)}
                              </h3>
                              <div className="text-sm text-muted-foreground mt-1">
                                <p>Base: ${itemTotal.basePrice.toFixed(2)}</p>
                                {itemTotal.optionsPrice > 0 && (
                                  <p>
                                    Options: +$
                                    {itemTotal.optionsPrice.toFixed(2)}
                                  </p>
                                )}
                                <p className="font-semibold text-primary">
                                  Total: ${itemTotal.total.toFixed(2)}
                                </p>
                              </div>
                              {item.specialRequest && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Special Request: {item.specialRequest}
                                </p>
                              )}
                              {item.selectedOptions &&
                                item.selectedOptions.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Options:
                                    </p>
                                    {formatSelectedOptions(
                                      item.selectedOptions
                                    ).map((optionData, index) => (
                                      <p
                                        key={index}
                                        className="text-xs text-muted-foreground ml-2"
                                      >
                                        • {optionData.optionType}:{" "}
                                        <span className="font-bold">
                                          {optionData.itemLabels}{" "}
                                          {optionData.itemPrices
                                            ? `(${optionData.itemPrices})`
                                            : ""}
                                        </span>
                                      </p>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label={
                                item.quantity === 1
                                  ? `Remove ${item.name} from cart`
                                  : `Decrease ${item.name} quantity`
                              }
                              onClick={() =>
                                updateQuantity(
                                  item.uniqueId || item.id,
                                  item.quantity - 1
                                )
                              }
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                "-"
                              )}
                            </Button>
                            <span className="w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateQuantity(
                                  item.uniqueId || item.id,
                                  item.quantity + 1
                                )
                              }
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
          {isInitialized && cart.length > 0 && (
            <div className="mt-4">
              <div
                className="
                  sticky bottom-0 left-0 right-0 
                  bg-white 
                  pt-4 
                  pb-[env(safe-area-inset-bottom)] 
                  z-10
                  border-t
                "
                style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              >
                <div className="flex justify-between mb-4">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">
                    ${getCartTotal().toFixed(2)}
                  </span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    if (pathname !== "/checkout") {
                      router.push("/checkout");
                    }
                  }}
                  disabled={!isOpen || showCustomerMaintenance}
                >
                  Proceed to Checkout
                </Button>
                {!isOpen && (
                  <p className="mt-1 text-xs text-red-600">
                    Cannot proceed because the store is closed
                  </p>
                )}
                {showCustomerMaintenance && (
                  <p className="mt-1 text-xs text-orange-600">
                    Cannot proceed - online ordering is under maintenance
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {selectedItem && (
        <DishDetailPopup
          item={{
            ...selectedItem,
            image:
              typeof selectedItem.image === "string"
                ? selectedItem.image
                : selectedItem.image.src,
          }}
          isOpen={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onAddToCart={handleAddToCartFromPopup}
        />
      )}
    </div>
  );
}
