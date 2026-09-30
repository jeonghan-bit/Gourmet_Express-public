"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { SelectUser } from "@/lib/types";
import type { DeliveryAddressDetails } from "@/lib/types";

export type CustomerListParams = {
  q?: string;
  offset: number;
  limit: number;
  status?: string;
  sort?: string;
  repeated?: boolean;
  repeatedOrdersAbove?: number;
  newCustomers?: boolean;
  hasEmail?: boolean;
  noShow?: boolean;
};

export type CustomerListResponse = {
  users: SelectUser[];
  totalUsers: number;
  limit: number;
  offset: number;
};

const fetchCustomers = async (
  params: CustomerListParams
): Promise<CustomerListResponse> => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== false && value !== "") {
      searchParams.set(key, value === true ? "1" : String(value));
    }
  });

  const res = await fetch(`/api/customers?${searchParams.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
};

const searchCustomers = async (query: string): Promise<SelectUser[]> => {
  const params = new URLSearchParams({
    view: "search",
    q: query,
    limit: "20",
  });
  const res = await fetch(`/api/customers?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to search customers");
  const data = await res.json();
  return data.users;
};

const fetchCustomerDetails = async (userId: number): Promise<SelectUser> => {
  const res = await fetch(`/api/customers/${userId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch customer details");
  return res.json();
};

const fetchPersonalInfo = async (): Promise<SelectUser> => {
  const res = await fetch(`/api/user/profile`);

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to fetch user info");
  }
  const data = await res.json();

  return data.user;
};

export function useUserActions() {
  const queryClient = useQueryClient();

  const createNewUser = useMutation({
    mutationFn: async ({
      name,
      email,
      phoneNumber,
      deliveryAddressDetails,
      allergyInfo,
      notes,
      is_verified,
    }: {
      name: string;
      email: string;
      phoneNumber: string;
      deliveryAddressDetails?: DeliveryAddressDetails | null;
      allergyInfo: string;
      notes: string;
      is_verified: boolean;
    }) => {
      const res = await fetch(`/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phoneNumber,
          deliveryAddressDetails,
          allergyInfo,
          notes,
          is_verified,
        }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to create new user");
      }
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error) => {
      console.error("Failed to create new user:", error);
      toast.error("Failed to create new user");
    },
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: "active" | "inactive";
    }) => {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update user status");
      }
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User status updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status");
    },
  });

  const updateUserInfo = useMutation({
    mutationFn: async ({
      id,
      name,
      email,
      phoneNumber,
      allergyInfo,
      deliveryAddressDetails,
      notes,
    }: {
      id: number;
      name?: string;
      email?: string;
      phoneNumber?: string;
      allergyInfo?: string;
      deliveryAddressDetails?: DeliveryAddressDetails | null;
      notes?: string;
    }) => {
      const payload: Record<string, any> = { id };
      if (name !== undefined) payload.name = name;
      if (email !== undefined) payload.email = email;
      if (phoneNumber !== undefined) payload.phoneNumber = phoneNumber;
      if (allergyInfo !== undefined) payload.allergyInfo = allergyInfo;
      if (deliveryAddressDetails !== undefined) {
        payload.deliveryAddressDetails = deliveryAddressDetails;
      }
      if (notes !== undefined) payload.notes = notes;
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update user info");
      }
      const data = await res.json();
      return data.user ?? data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User information updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update user info:", error);
      toast.error("Failed to update user information");
    },
  });
  const updatePersonalInfo = useMutation({
    mutationFn: async ({
      name,
      email,
      allergyInfo,
      deliveryAddressDetails,
      smsAgreement,
    }: {
      name: string;
      email: string;
      allergyInfo: string;
      deliveryAddressDetails: DeliveryAddressDetails | null;
      smsAgreement: boolean;
    }) => {
      const res = await fetch(`/api/user/update-personal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          allergyInfo,
          deliveryAddressDetails,
          smsAgreement,
        }),
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update user info");
      }
      const updated = await res.json();
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User information updated successfully");
    },
    onError: (error) => {
      console.error("Failed to update user info:", error);
      toast.error("Failed to update user information");
    },
  });

  return {
    createNewUser,
    updateUserStatus,
    updateUserInfo,
    updatePersonalInfo,
  };
}

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: ["customers", "list", params],
    queryFn: () => fetchCustomers(params),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30,
  });
}

export function useCustomerSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ["customers", "search", query],
    queryFn: () => searchCustomers(query),
    enabled: enabled && query.trim().length > 0,
    staleTime: 1000 * 30,
  });
}

export function useCustomerDetails(userId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ["user", userId, "details"],
    queryFn: () => fetchCustomerDetails(userId!),
    enabled: enabled && !!userId,
    staleTime: 1000 * 30,
  });
}

export function usePersonalInfo() {
  const { data: session, status } = useSession();

  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: fetchPersonalInfo,
    enabled: status === "authenticated" && !!session?.user?.id,
    refetchOnMount: "always",
  });
}
