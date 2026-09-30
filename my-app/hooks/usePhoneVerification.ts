import { useState } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/firebaseConfig";
import { getSession, signIn } from "next-auth/react";
import { getCanadianPhoneInputDigits } from "@/lib/utils";

interface UsePhoneVerificationReturn {
  phoneNumber: string;
  verificationCode: string;
  confirmationResult: ConfirmationResult | null;
  formattedPhone: string;
  isLoading: boolean;
  otpSent: boolean;
  setVerificationCode: (code: string) => void;
  sendOTP: () => Promise<void>;
  verifyOTP: () => Promise<void>;
  formatPhoneNumber: (input: string) => void;
}

export const usePhoneVerification = (
  callbackUrl: string = "/"
): UsePhoneVerificationReturn => {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [formattedPhone, setFormattedPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const e164PhoneNumber = phoneNumber.length === 10 ? `+1${phoneNumber}` : "";

  const sendOTP = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    } else if (phoneNumber.length !== 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    try {
      // Initialize reCAPTCHA
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );

      const confirmation = await signInWithPhoneNumber(
        auth,
        e164PhoneNumber,
        window.recaptchaVerifier
      );
      setConfirmationResult(confirmation);
      setOtpSent(true);

      toast({
        title: "OTP Sent",
        description: `Verification code sent to ${formattedPhone}`,
        variant: "default",
      });
    } catch (error) {
      console.error("OTP Error:", error);
      toast({
        title: "Failed to send OTP",
        description: (error as Error).message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!verificationCode) {
      toast({
        title: "OTP required",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!confirmationResult) {
        throw new Error("Confirmation result is null");
      }

      const userCredential = await confirmationResult.confirm(verificationCode);
      const firebaseToken = await userCredential.user.getIdToken();

      let digitsOnly = phoneNumber.replace(/\D/g, "");
      if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
        digitsOnly = digitsOnly.slice(1);
      }
      if (digitsOnly.length !== 10) {
        throw new Error("Invalid phone number format");
      }

      // Single sign-in triggers user creation if needed
      const signInResult = await signIn("credentials", {
        redirect: false,
        phoneNumber: e164PhoneNumber,
        firebaseToken,
      });

      if (signInResult?.error) {
        throw new Error("Failed to sign in user");
      }

      const session = await getSession();
      const destination = session?.user?.isNewUser ? "/profile" : callbackUrl;

      toast({
        title: "Sign In Successful",
        description: "You have been signed in successfully",
        variant: "default",
      });

      setTimeout(() => {
        window.location.href = destination;
      }, 1500);
    } catch (error) {
      console.error("OTP Verification Error:", error);
      toast({
        title: "Verification Failed",
        description:
          (error as Error).message ||
          "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (input: string) => {
    const cleaned = getCanadianPhoneInputDigits(input);
    setPhoneNumber(cleaned);

    if (cleaned.length === 10) {
      setFormattedPhone(
        `+1 ${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      );
    } else {
      setFormattedPhone(cleaned);
    }
  };

  return {
    phoneNumber,
    verificationCode,
    confirmationResult,
    formattedPhone,
    isLoading,
    otpSent,
    setVerificationCode,
    sendOTP,
    verifyOTP,
    formatPhoneNumber,
  };
};
