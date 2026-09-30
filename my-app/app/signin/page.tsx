"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Phone } from "lucide-react";
import logo from "@/public/logo.webp";
import Image from "next/image";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Get the callback URL from search params
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  // const handleGoogleSignIn = async () => {
  //   setIsLoading(true);
  //   try {
  //     await signIn("google", { callbackUrl: "/" });
  //   } catch (error) {
  //     console.error("Error signing in with Google:", error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handlePhoneSignIn = () => {
    // Pass the callback URL to verify-phone page
    const callbackParam =
      callbackUrl !== "/"
        ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : "";
    router.push(`/verify-phone${callbackParam}`);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center relative">
      <div className="w-full max-w-[400px] px-4 translate-y-[-20%] sm:translate-y-[-30%]">
        <div className="w-full max-w-[400px] px-4">
          <div className="flex flex-col space-y-2 text-center mb-6">
            <div className="mx-auto mb-4">
              {/* Replace with your actual logo */}
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                {/* <span className="text-primary-foreground font-bold text-xl">A</span> */}
                <Image src={logo} alt="logo" width={48} height={48} />
              </div>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to Gourmet Express
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to continue to your account
            </p>
          </div>

          {/* <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="phone">Phone Number</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="mt-4"> */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Sign in with Phone</CardTitle>
              <CardDescription>
                Use your phone number to sign in with SMS verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <Button onClick={handlePhoneSignIn} className="w-full">
                <Phone className="mr-2 h-4 w-4" />
                Continue with Phone
              </Button>
            </CardContent>
          </Card>
          {/* </TabsContent> */}

          {/* <TabsContent value="google" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Sign in with Google</CardTitle>
                  <CardDescription>
                    Use your Google account to sign in quickly and securely.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                    ) : (
                      <FcGoogle className="mr-2 h-5 w-5" />
                    )}
                    Continue with Google
                  </Button>
                </CardContent>
              </Card>
            </TabsContent> */}
          {/* </Tabs> */}

          <p className="px-4 text-center text-sm text-muted-foreground mt-6">
            By clicking continue, you agree to our&nbsp;
            <a
              href="/terms-of-service"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </a>
            &nbsp;and&nbsp;
            <a
              href="/privacy-policy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}
