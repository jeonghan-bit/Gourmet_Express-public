"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PersonalInfoForm } from "./personal-info-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePersonalInfo, useUserActions } from "@/hooks/useUserActions";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { formatDate, formatDateOnly } from "@/lib/formatDate";
import type { DeliveryAddressDetails } from "@/lib/types";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    data: personalInfo,
    isLoading: isloading,
    isError: error,
  } = usePersonalInfo();
  const { updatePersonalInfo } = useUserActions();

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin?callbackUrl=/profile");
    }
  }, [status, router]);

  const handlePersonalInfoUpdate = async (data: {
    name: string;
    email: string;
    allergyInfo: string;
    deliveryAddressDetails: DeliveryAddressDetails | null;
    smsAgreement: boolean;
  }) => {
    try {
      await updatePersonalInfo.mutateAsync(data);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Update failed",
      };
    }
  };

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  // Don't render anything if unauthenticated (will redirect)
  if (status === "unauthenticated") {
    return null;
  }

  if (isloading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 text-center text-red-600">
        Failed to load profile.
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="flex items-center mb-6">
        <Link href="/" className="mr-4">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">My Profile</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>
            Update your personal information and preferences.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <h2 className="text-xl font-semibold mb-4">Personal Info</h2>
          <PersonalInfoForm
            userData={personalInfo}
            onSubmit={handlePersonalInfoUpdate}
            onSuccess={() => router.push("/")}
            onCancel={() => router.push("/")}
          />
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-between text-sm text-muted-foreground">
          <div>
            Member since:{" "}
            {formatDateOnly(new Date(personalInfo?.createdAt || Date.now()))}
          </div>
          <div>
            Last updated:{" "}
            {formatDate(new Date(personalInfo?.updatedAt || Date.now()))}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
