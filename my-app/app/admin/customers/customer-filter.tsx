"use client";

import { useEffect } from "react";

type CustomerFilterProps = {
  //Customers: SelectCustomerInfo[];
  offset: number;
  //totalCustomers: number;
  search: string;
};



export function CustomerFilter({
  //Customers,
  offset,
  //totalCustomers,
  search,
}: CustomerFilterProps) {
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("offset", String(offset));

    window.history.pushState(null, "", `/admin/customers?${params.toString()}`);
  }, [offset, search]);
}
