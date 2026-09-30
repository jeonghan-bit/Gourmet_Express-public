"use client";

import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Send, LockKeyhole } from "lucide-react";
import { usePhoneVerification } from "@/hooks/usePhoneVerification";
import { useSearchParams } from "next/navigation";

const PhoneVerificationContent = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const {
    phoneNumber,
    verificationCode,
    formattedPhone,
    isLoading,
    otpSent,
    setVerificationCode,
    sendOTP,
    verifyOTP,
    formatPhoneNumber,
  } = usePhoneVerification(callbackUrl);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            User Verification
          </CardTitle>
          <CardDescription className="text-center">
            Verify your phone number to get started{" "}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!otpSent ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your 10-digit number"
                    value={formattedPhone}
                    onChange={(e) => formatPhoneNumber(e.target.value)}
                    className="pr-10"
                    maxLength={14}
                    disabled={isLoading}
                  />
                  {phoneNumber.length === 10 && (
                    <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  We will send a verification code to this number
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="otp" className="text-sm font-medium">
                  Verification Code
                </label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  disabled={isLoading}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to {formattedPhone}
                </p>
              </div>
            </div>
          )}
          <div id="recaptcha-container"></div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          {!otpSent ? (
            <Button
              className="w-full"
              onClick={sendOTP}
              disabled={phoneNumber.length !== 10 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Verification Code
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                className="w-full"
                onClick={verifyOTP}
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying
                  </>
                ) : (
                  <>
                    <LockKeyhole className="mr-2 h-4 w-4" />
                    Verify Code
                  </>
                )}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Grey dash line separator */}
      <div className="flex items-center justify-center my-6">
        <div className="text-gray-400 text-sm">
          ----- End of Phone Verification -----
        </div>
      </div>
    </div>
  );
};

const PhoneVerification = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PhoneVerificationContent />
    </Suspense>
  );
};

export default PhoneVerification;
