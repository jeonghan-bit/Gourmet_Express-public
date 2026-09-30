"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import logo from "@/public/logo.webp";
import { SupportDialog } from "./support-dialog";
import { usePersonalInfo } from "@/hooks/useUserActions";


export function User() {
  const { data: session, status } = useSession();
  const user = session?.user;
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const { data: personalInfo } = usePersonalInfo();

    return status === "unauthenticated" ? (
      <Button variant="outline" asChild className="rounded-full">
        <Link href="/signin">Sign In</Link>
      </Button>
    ) : (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Image
              src={logo}
              width={36}
              height={36}
              alt="Avatar"
              className="overflow-hidden rounded-full"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Show name at the top if available */}
          {personalInfo?.name && (
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {personalInfo.name}
            </DropdownMenuLabel>
          )}
          <DropdownMenuSeparator />
          {user?.role === "admin" && (
            <>
              <DropdownMenuItem asChild>
                <Link className="w-full text-left " href="/admin">
                  Admin Panel
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link className="w-full text-left" href="/">
                  Menu Page
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <>
            <DropdownMenuSeparator />
            {user?.role === "admin" ? null : (
              <>
                <DropdownMenuItem asChild>
                  <Link className="w-full text-left" href="/profile">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link className="w-full text-left" href="/orders-history">
                    Orders History
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setSupportDialogOpen(true);
                  }}
                >
                  Support
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="w-full text-left"
              >
                Sign Out
              </button>
            </DropdownMenuItem>
          </>
        </DropdownMenuContent>
      </DropdownMenu>

      <SupportDialog
        open={supportDialogOpen}
        onOpenChange={setSupportDialogOpen}
      />
    </>
  );
}
