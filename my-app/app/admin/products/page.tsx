"use client";

import ProductFilter from "./product-filter";
import { Suspense, useEffect, useState } from "react";
import { useOptionTypes, useProducts } from "@/hooks/useProductActions";
import { useCollectionActions } from "@/hooks/useCollectionActions";
import { useSearchParams } from "next/navigation";
import LoadingAnimation from "@/components/LoadingAnimation";
import { ADMIN_SEARCH_EVENT } from "../search";

// Component that uses useSearchParams
function ProductsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const offset = Number(searchParams.get("offset") ?? 0);
  const currentCollection = searchParams.get("collection") || "All";
  const currentOptionType = searchParams.get("option_type") || "All";
  const pageSize = 1000;

  const { useCollections } = useCollectionActions();

  const { data: productsData, isLoading: productsLoading, error: productsError } = useProducts(
    "",
    0,
    pageSize,
    "all",
    "All",
    "All",
    true
  );

  const { data: collections = [], isLoading: collectionsLoading, error: collectionsError } =
    useCollections();
  const { data: optionTypes = [], isLoading: optionTypesLoading, error: optionTypesError } =
    useOptionTypes();

  useEffect(() => {
    const handleSearchChange = (event: Event) => {
      const { pathname, value } = (event as CustomEvent).detail ?? {};
      if (typeof pathname === "string" && pathname.includes("/admin/products")) {
        setSearch(typeof value === "string" ? value : "");
      }
    };

    window.addEventListener(ADMIN_SEARCH_EVENT, handleSearchChange);
    return () =>
      window.removeEventListener(ADMIN_SEARCH_EVENT, handleSearchChange);
  }, []);

  if (productsLoading || collectionsLoading || optionTypesLoading) {
    return <LoadingAnimation className="h-screen" />;
  }

  if (productsError || collectionsError || optionTypesError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">
          Error: {productsError?.message || collectionsError?.message || optionTypesError?.message}
        </div>
      </div>
    );
  }

  const { products = [] } = productsData || {};

  return (
    <ProductFilter
      products={products}
      offset={offset}
      search={search}
      collections={collections.map((c) => c.name)}
      currentCollection={currentCollection}
      optionTypes={optionTypes.map((optionType) => ({
        id: optionType.id,
        name: optionType.name,
      }))}
      currentOptionType={currentOptionType}
    />
  );
}

// Main page component with Suspense boundary
export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingAnimation className="h-screen" />}>
      <ProductsContent />
    </Suspense>
  );
}
