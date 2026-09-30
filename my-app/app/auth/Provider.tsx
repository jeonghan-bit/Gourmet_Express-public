"use client";

import { type ReactNode, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";

const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <SessionProvider>
      <VerifyPhoneRedirect>{children}</VerifyPhoneRedirect>
    </SessionProvider>
  );
};

const VerifyPhoneRedirect = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleRedirect = async () => {
      // Handle unauthenticated users
      if (status === "unauthenticated") {
        const isOnSignInPage = pathname === "/signin";
        const isOnVerifyPage = pathname === "/verify-phone";
        const isOnPublicPage =
          pathname === "/" ||
          pathname.startsWith("/menu") ||
          pathname === "/terms-of-service" ||
          pathname === "/privacy-policy" ||
          pathname === "/about-us" ||
          pathname === "/contact" ||
          pathname === "/accessibility";

        // Redirect to signin if on a protected page, preserving the original URL
        if (!isOnSignInPage && !isOnVerifyPage && !isOnPublicPage) {
          const callbackUrl = encodeURIComponent(pathname);
          router.push(`/signin?callbackUrl=${callbackUrl}`);
        }
        return;
      }
    };

    handleRedirect();
  }, [session, status, router, pathname]);

  return <>{children}</>;
};

export default AuthProvider;
