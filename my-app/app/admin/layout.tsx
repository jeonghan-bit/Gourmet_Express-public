"use client";
import Link from "next/link";
import {
  Home,
  LineChart,
  Menu,
  Package2,
  PanelLeft,
  Receipt,
  Settings,
  Utensils,
  Users2,
  Clock,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { User } from "./user";
import Image from "next/image";
import Logo from "@/public/logo.webp";
import Providers from "./providers";
import { NavItem } from "./nav-item";
import { SearchInput } from "./search";
import { CustomersBreadcrumb } from "./components/CustomersBreadcrumb";
import { ProductsBreadcrumb } from "./components/ProductsBreadcrumb";
import { OrdersBreadcrumb } from "./components/OrdersBreadcrumb";
import { CollectionsBreadcrumb } from "./components/CollectionsBreadcrumb";
import { StoreHoursBreadcrumb } from "./components/StoreHoursBreadcrumb";
import { Toaster as SonnerToaster } from "sonner";
import { PendingOrdersProvider } from "./components/pending-orders-context";
import { PendingOrdersMonitor } from "./components/pending-orders-monitor";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isCollectionsPage = pathname.includes("/admin/collections");
  const isDashboardPage = pathname.endsWith("/admin");
  const isStoreHoursPage = pathname.includes("/admin/store-hours");

  return (
    <Providers>
      <PendingOrdersProvider>
        <PendingOrdersMonitor />
        <main className="flex min-h-dvh w-full flex-col bg-muted/40">
          <DesktopNav />
          <div className="flex min-w-0 flex-col sm:gap-4 sm:py-4 sm:pl-16">
            <header className="sticky top-0 z-30 flex min-h-16 items-center gap-4 border-b bg-background px-4 sm:static sm:border-0 sm:bg-transparent sm:px-6">
              <MobileNav />
              {pathname.includes("/admin/customers") ? (
                <CustomersBreadcrumb />
              ) : pathname.includes("/admin/orders") ? (
                <OrdersBreadcrumb />
              ) : pathname.includes("/admin/products") ? (
                <ProductsBreadcrumb />
              ) : pathname.includes("/admin/collections") ? (
                <CollectionsBreadcrumb />
              ) : pathname.includes("/admin/store-hours") ? (
                <StoreHoursBreadcrumb />
              ) : (
                <DashboardBreadcrumb />
              )}
              {!isCollectionsPage && !isStoreHoursPage && !isDashboardPage && (
                <SearchInput />
              )}
            </header>
            <main className="grid min-w-0 flex-1 items-start gap-4 bg-muted/40 p-2 sm:px-4 sm:py-0 lg:px-6">
              {children}
            </main>
          </div>
        </main>
        <SonnerToaster position="top-center" />
      </PendingOrdersProvider>
    </Providers>
  );
}

function DesktopNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-16 flex-col border-r bg-background sm:flex">
      <nav className="flex flex-col items-center gap-2 px-2 py-4">
        <Image
          src={Logo}
          alt="Logo"
          className="mb-2 h-10 w-10"
        />

        <NavItem href="/admin" label="Dashboard">
          <Home className="h-5 w-5" />
        </NavItem>

        <NavItem href="/admin/orders" label="Orders">
          <Receipt className="h-5 w-5" />
        </NavItem>

        <NavItem href="/admin/products" label="Products">
          <Utensils className="h-5 w-5" />
        </NavItem>

        <NavItem href="/admin/collections" label="Collections">
          <Menu className="h-5 w-5" />
        </NavItem>
        <NavItem href="/admin/customers" label="Customers">
          <Users2 className="h-5 w-5" />
        </NavItem>

        <NavItem href="/admin/store-hours" label="Store Hours">
          <Clock className="h-5 w-5" />
        </NavItem>
      </nav>
      {/* <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/admin/profile"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
            >
              <Settings className="h-5 w-5" />
              <span className="sr-only">Profile</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Profile</TooltipContent>
        </Tooltip>
      </nav> */}
    </aside>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const mobileLinks = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/orders", label: "Orders", icon: Receipt },
    { href: "/admin/products", label: "Products", icon: Utensils },
    { href: "/admin/collections", label: "Collections", icon: Menu },
    { href: "/admin/customers", label: "Customers", icon: Users2 },
    { href: "/admin/store-hours", label: "Hours", icon: Clock },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="mt-1 h-12 w-12 sm:hidden"
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[30vw] min-w-[220px] max-w-[260px] p-3 sm:max-w-xs"
      >
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <nav className="mt-10 grid gap-2 text-sm font-medium">
          {mobileLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex min-h-12 items-center gap-3 rounded-md px-3 text-muted-foreground transition-colors active:bg-accent ${
                pathname === href ? "bg-accent text-black" : ""
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function DashboardBreadcrumb() {
  return (
    <Breadcrumb className="hidden md:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/admin">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
