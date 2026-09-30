"use client";

// NavBar.tsx
import { User } from "./admin/user";
import { StoreStatus } from "./store-status";
import { useRouter, usePathname } from "next/navigation";

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background shadow-md" id="main-navbar">
      <header className="bg-background px-3 py-2 sm:px-6 sm:py-2">
        <div
          className={
            isAdminPage
              ? "flex items-center justify-between gap-2 sm:flex-wrap sm:gap-x-0 sm:gap-y-2"
              : "flex flex-wrap items-center justify-between gap-y-2"
          }
        >
          <div
            className={
              isAdminPage
                ? "flex min-w-0 flex-1 items-center justify-between sm:w-auto sm:flex-none"
                : "flex items-center justify-between w-full sm:w-auto"
            }
          >
            {/* <h1 className="text-xl font-bold sm:text-2xl">Gourmet Express</h1> */}
            <button
              className={
                isAdminPage
                  ? "truncate text-lg font-bold sm:text-2xl"
                  : "text-xl font-bold sm:text-2xl"
              }
              onClick={() => router.push("/")}
            >
              Gourmet Express
            </button>
            <div className="block sm:hidden ml-auto">
              <User />
            </div>
          </div>
          <div
            className={
              isAdminPage
                ? "flex min-w-0 shrink items-center gap-1 overflow-hidden sm:ml-auto sm:w-auto sm:justify-between sm:gap-4 sm:overflow-visible"
                : "flex items-center justify-between w-full sm:w-auto sm:ml-auto gap-4"
            }
          >
            <StoreStatus />
            <div className="hidden sm:block">
              <User />
            </div>
          </div>
        </div>
      </header>
      {/* Only show announcement on non-admin pages */}
      {!isAdminPage && (
        <div className="bg-primary text-primary-foreground py-2">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm font-medium">
              🎉 10% off Dine-in & Pickup orders over $40 (before-tax) — Cash
              Only
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavBar;
