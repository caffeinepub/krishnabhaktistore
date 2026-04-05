import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Phone, ShieldCheck } from "lucide-react";
import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { usePhoneUser } from "../hooks/usePhoneUser";

export function LoginPage() {
  const { login, isLoggingIn } = useInternetIdentity();
  const { loginWithPhone } = usePhoneUser();
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Store OTP temporarily in a ref (not in state to avoid exposing in React DevTools)
  const otpRef = useRef<string>("");
  // Track OTP expiry
  const otpExpiryRef = useRef<number>(0);
  const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

  function generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function handleSendOtp() {
    const digits = phoneNumber.replace(/\D/g, "");
    if (digits.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }

    setIsSending(true);
    const newOtp = generateOtp();

    // Store OTP temporarily with expiry
    otpRef.current = newOtp;
    otpExpiryRef.current = Date.now() + OTP_TTL_MS;

    // Show OTP in console for testing
    console.log(
      `[OTP Debug] Phone: ${digits} | OTP: ${newOtp} | Expires in: 5 minutes`,
    );

    setTimeout(() => {
      setIsSending(false);
      toast.success("OTP sent! Check your phone.", {
        description: "Demo mode: OTP logged to browser console (F12 → Console)",
        duration: 6000,
      });
      setStep("otp");
    }, 800);
  }

  function handleVerifyOtp() {
    // Check if OTP has expired
    if (Date.now() > otpExpiryRef.current) {
      toast.error("OTP has expired. Please request a new one.");
      handleChangeNumber();
      return;
    }

    if (otp.trim() !== otpRef.current) {
      toast.error("Invalid OTP. Please try again.");
      return;
    }

    setIsVerifying(true);

    // Clear OTP from temporary storage after successful verification
    otpRef.current = "";
    otpExpiryRef.current = 0;
    console.log(
      "[OTP Debug] OTP verified successfully. Temporary OTP cleared.",
    );

    setTimeout(() => {
      setIsVerifying(false);

      // Generate session token and log user in
      // Phone + token are persisted to localStorage for auto-login on next visit
      const token = crypto.randomUUID();
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      loginWithPhone(cleanPhone, token);

      toast.success("Welcome to KrishnaBhaktiStore!", {
        description: `Logged in as ${phoneNumber}`,
        duration: 4000,
      });
      navigate({ to: "/" });
    }, 600);
  }

  function handleChangeNumber() {
    setStep("phone");
    setOtp("");
    otpRef.current = "";
    otpExpiryRef.current = 0;
  }

  function handleResendOtp() {
    setOtp("");
    handleSendOtp();
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-display text-2xl font-bold text-primary text-center mb-2">
          KrishnaBhaktiStore
        </h1>
        <p className="text-muted-foreground text-center text-sm mb-8">
          Sign in to continue shopping
        </p>

        {/* Card */}
        <div className="bg-card rounded-xl shadow-md border border-border overflow-hidden">
          <Tabs defaultValue="phone">
            <TabsList className="w-full rounded-none border-b border-border bg-muted h-12">
              <TabsTrigger
                value="phone"
                data-ocid="login.tab"
                className="flex-1 h-full rounded-none text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-none"
              >
                <Phone className="w-4 h-4 mr-2" />
                Phone Login
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                data-ocid="admin.tab"
                className="flex-1 h-full rounded-none text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-none"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Admin Login
              </TabsTrigger>
            </TabsList>

            {/* Phone Login Tab */}
            <TabsContent value="phone" className="p-6 space-y-5">
              {step === "phone" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      data-ocid="phone.input"
                      type="tel"
                      inputMode="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="h-12 text-base"
                      autoComplete="tel"
                    />
                  </div>

                  <Button
                    data-ocid="phone.primary_button"
                    onClick={handleSendOtp}
                    disabled={isSending}
                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </>
              )}

              {step === "otp" && (
                <>
                  <div className="text-center space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit OTP sent to your phone
                    </p>
                    <p className="text-sm font-medium text-primary">
                      {phoneNumber}
                    </p>
                    <p className="text-xs text-amber-600">
                      OTP expires in 5 minutes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-sm font-medium">
                      OTP Code
                    </Label>
                    <Input
                      id="otp"
                      data-ocid="otp.input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      className="h-14 text-2xl text-center tracking-widest font-bold"
                      autoComplete="one-time-code"
                    />
                  </div>

                  <Button
                    data-ocid="otp.primary_button"
                    onClick={handleVerifyOtp}
                    disabled={isVerifying || otp.length < 6}
                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      data-ocid="otp.resend_button"
                      variant="outline"
                      onClick={handleResendOtp}
                      disabled={isSending}
                      className="flex-1 h-10 text-sm"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Resend OTP"
                      )}
                    </Button>
                    <Button
                      data-ocid="otp.secondary_button"
                      variant="ghost"
                      onClick={handleChangeNumber}
                      className="flex-1 h-10 text-sm text-muted-foreground hover:text-primary"
                    >
                      Change Number
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Admin Login Tab */}
            <TabsContent value="admin" className="p-6 space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  For store admins only
                </p>
              </div>

              <Button
                data-ocid="admin.primary_button"
                onClick={login}
                disabled={isLoggingIn}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Login with Internet Identity"
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
