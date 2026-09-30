"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/icons";
import { Search } from "lucide-react";
import { Suspense } from "react";

const SEARCH_DEBOUNCE_MS = 300;
export const ADMIN_SEARCH_EVENT = "admin-search-change";

function SearchInputContent() {
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);

  const getSearchParamName = () => {
    if (
      pathname.includes("/admin/orders") ||
      pathname.includes("/admin/customers")
    ) {
      return "customer";
    }
    return "q";
  };

  const searchKey = getSearchParamName();
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
    window.dispatchEvent(
      new CustomEvent(ADMIN_SEARCH_EVENT, {
        detail: { pathname, searchKey, value: "" },
      })
    );
  }, [pathname, searchKey]);

  useEffect(() => {
    setIsPending(true);

    const timeoutId = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const nextValue = query.trim();
      params.delete(searchKey);

      // Reset pagination when searching.
      if (pathname.includes("/admin/products")) {
        params.set("offset", "0");
        params.delete("status");
        params.delete("collection");
      } else if (
        pathname.includes("/admin/orders") ||
        pathname.includes("/admin/customers")
      ) {
        params.set("offset", "0");
        params.set("page", "1");
        if (pathname.includes("/admin/customers")) {
          params.delete("status");
        }
      } else {
        params.set("page", "1");
      }

      const queryString = params.toString();
      window.history.replaceState(
        null,
        "",
        queryString ? `${pathname}?${queryString}` : pathname
      );
      window.dispatchEvent(
        new CustomEvent(ADMIN_SEARCH_EVENT, {
          detail: { pathname, searchKey, value: nextValue },
        })
      );
      setIsPending(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, query, searchKey]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const getPlaceholder = () => {
    if (pathname.includes("/admin/orders")) {
      return "Search by name, phone, email, or order #...";
    } else if (pathname.includes("/admin/customers")) {
      return "Search by name, phone, or email...";
    }
    return "Search...";
  };

  return (
    <div className="relative ml-auto flex-1 md:grow-0">
      <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        name="search"
        value={query}
        placeholder={getPlaceholder()}
        onChange={handleSearch}
        className="h-12 w-full rounded-lg bg-background pl-10 md:w-[240px] lg:w-[360px]"
      />
      {isPending && (
        <div className="absolute right-2 top-2.5">
          <Spinner />
        </div>
      )}
    </div>
  );
}

export function SearchInput() {
  return (
    <Suspense
      fallback={
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Loading..."
            className="h-12 w-full rounded-lg bg-background pl-10"
            disabled
          />
        </div>
      }
    >
      <SearchInputContent />
    </Suspense>
  );
}
