"use client";

import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  return (
    <main
      className="flex-1"
      style={{
        paddingTop: isAdminPage
          ? "var(--admin-navbar-height, 52px)"
          : "var(--navbar-height, 156px)",
      }}
    >
      {children}
    </main>
  );
}
