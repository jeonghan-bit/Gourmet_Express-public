"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavItem({
  href,
  label,
  children,
  className,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className={clsx(
            "flex h-12 w-12 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground active:scale-95 active:bg-accent",
            {
              "bg-accent text-black": pathname === href,
            },
            className
          )}
        >
          <span className="flex items-center justify-center w-full h-full">
            {children}
          </span>
          <span className="sr-only">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
