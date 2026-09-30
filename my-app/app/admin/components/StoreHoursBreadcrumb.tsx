"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Clock } from "lucide-react";

export function StoreHoursBreadcrumb() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="/admin">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <BreadcrumbPage>Store Hours</BreadcrumbPage>
          </div>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
} 