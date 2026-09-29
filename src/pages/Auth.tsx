// Auth.tsx - OTP-only login (Email + Mobile)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, repairAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { usePWA } from "@/hooks/usePWA";
import { useVersionInfo } from "@/hooks/useVersionInfo";
import { Mail, Download, RefreshCw, Check, Smartphone, BookOpen, ShieldAlert, Shield, KeyRound, Eye, EyeOff } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import westmedBanner from "@/assets/westmed-banner.png";
import westmedLogo from "@/assets/westmed-logo.png";
import Footer from "@/components/Footer";
import DNSHelpBanner from "@/components/DNSHelpBanner";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatMobileNumber, validateMobileNumber } from "@/lib/validators";
import { checkSupabaseReachable } from "@/lib/connectivityCheck";
import { useAppUpdate } from "@/hooks/useAppUpdate";

// Length of the emailed auth OTP code (backend currently issues 8 digits)
const EMAIL_OTP_LENGTH = 8;
// Emergency fallback code (6 digits)
const FALLBACK_OTP = "333892";

// Helper: detect if an error is network/connectivity related
const isNetworkError = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || err.toString() || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("connection") ||
    msg.includes("unreachable") ||
    msg.includes("timeout") ||
    msg.includes("fetch") ||
    msg.includes("cors") ||
    msg.includes("net::") ||
    msg.includes("could not connect") ||
    msg.includes("couldn't reach")
  );
};

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    signInWithOTP,
    verifyOTP,
    sendMobileOTP,
    verifyMobileOTP,
    emergencySignIn,
    signInWithUsername,
    signInWithEmail,
    user,
    loading: authLoading,
  } = useAuth();
  const {
    isInstallable,
    isInstalled,
    installApp,
  } = usePWA();
  const {
    checking: isCheckingForUpdates,
    updateAvailable: isUpdateAvailable,
    publishedVersion,
    checkForUpdate,
    applyUpdate,
  } = useAppUpdate();
  const versionInfo = useVersionInfo();
  const isMobile = useIsMobile();
  const [formLoading, setFormLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "mobile" | "password">("email");
  // Username/Password state
  const [pwIdentifier, setPwIdentifier] = useState<string>("");
  const [pwPassword, setPwPassword] = useState<string>("");
  const [pwShow, setPwShow] = useState<boolean>(false);
  const [dnsBlocked, setDnsBlocked] = useState(false);

  // Email OTP state
  const [email, setEmail] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Mobile OTP state
  const [mobileNumber, setMobileNumber] = useState<string>("");
  const [mobileOtpSent, setMobileOtpSent] = useState<boolean>(false);
  const [mobileOtpCode, setMobileOtpCode] = useState<string>("");
  const [mobileResendCooldown, setMobileResendCooldown] = useState<number>(0);

  // Emergency login state
  const [emergencyRole, setEmergencyRole] = useState<"admin" | "manager">("admin");
  const [emergencyOtp, setEmergencyOtp] = useState<string>("");

  // Redirect already-authenticated users to dashboard
  useEffect(() => {
    // Skip while a login handler is running — it performs role-based routing itself.
    if (!authLoading && user && !formLoading) {
      navigate("/dashboard");
    }
  }, [authLoading, user, formLoading, navigate]);

  // DNS connectivity check
  useEffect(() => {
    const check = async () => {
      const ok = await checkSupabaseReachable();
      if (!ok) {
        setDnsBlocked(true);
        // Keep email tab available for emergency login
      } else {
        setDnsBlocked(false);
      }
    };
    check();
  }, []);

  // Auto-verify Email OTP when the full code is entered (8 digits, or the 6-digit fallback code)
  useEffect(() => {
    const complete = otpCode.length === EMAIL_OTP_LENGTH || otpCode === FALLBACK_OTP;
    if (complete && otpSent && !formLoading) {
      setFormLoading(true);
      handleVerifyOTP().catch((e) => {
        console.error("Auto verify OTP failed", e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);


  // Auto-verify Mobile OTP when all 6 digits are entered
  useEffect(() => {
    if (mobileOtpCode.length === 6 && mobileOtpSent && !formLoading) {
      setFormLoading(true);
      handleVerifyMobileOTP().catch((e) => {
        console.error("Auto verify mobile OTP failed", e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOtpCode]);

  // Auto-verify Emergency OTP when all 6 digits are entered
  useEffect(() => {
    if (emergencyOtp.length === 6 && dnsBlocked && !formLoading) {
      setFormLoading(true);
      handleEmergencyLogin().catch((e) => {
        console.error("Auto verify emergency OTP failed", e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emergencyOtp]);

  // Email resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Mobile resend cooldown timer
  useEffect(() => {
    if (mobileResendCooldown <= 0) return;
    const interval = setInterval(() => {
      setMobileResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [mobileResendCooldown]);

  // Helper for role-based navigation after login
  const navigateByRole = (userType?: string, role?: string) => {
    if (userType === "doctor") {
      navigate("/dashboard");
    } else if (role && ["admin", "manager", "super_admin"].includes(role)) {
      navigate("/dashboard");
    } else if (role && ["staff", "nurse"].includes(role)) {
      navigate(isMobile ? "/dashboard?view=staff" : "/dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  // Resolve the signed-in user's type/role and route exactly like the Email OTP flow
  const routeAfterAuth = async () => {
    try {
      const result = await supabase.auth.getUser();
      const authUser = result?.data?.user;
      if (authUser) {
        const { data: designation } = await supabase
          .from("user_designations")
          .select("designation")
          .eq("user_id", authUser.id)
          .maybeSingle();

        const { data: doctorData } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", authUser.id)
          .maybeSingle();

        navigateByRole(doctorData ? "doctor" : "staff", designation?.designation || "staff");
        return;
      }
    } catch (err) {
      console.error("Post-login routing failed", err);
    }
    navigate("/dashboard");
  };

  // ========== EMERGENCY LOGIN HANDLER ==========
  const handleEmergencyLogin = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "Email Required", description: "Please enter your email address." });
      return;
    }
    if (emergencyOtp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter the complete 6-digit emergency code.",
      });
      return;
    }
    setFormLoading(true);
    try {
      const { error } = await emergencySignIn(email, emergencyRole, emergencyOtp);
      if (error) {
        toast({ variant: "destructive", title: "Emergency Login Failed", description: error.message });
        setEmergencyOtp("");
        return;
      }
      toast({ title: "Emergency Login Successful", description: "You are logged in with limited offline access." });
      navigateByRole("staff", emergencyRole);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Emergency login failed." });
    } finally {
      setFormLoading(false);
    }
  };

  // ========== EMAIL OTP HANDLERS ==========

  const handleSendOTP = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address first.",
      });
      return;
    }

    setFormLoading(true);

    try {
      const { error } = await signInWithOTP(email);

      if (error) {
        // ── FALLBACK: show OTP field anyway so fallback code can be entered ──
        setOtpSent(true);
        toast({
          variant: "destructive",
          title: "OTP Service Unavailable",
          description: "Could not send OTP. If you have a fallback access code, enter it below.",
        });
      } else {
        setOtpSent(true);
        setResendCooldown(60);
        toast({
          title: `${EMAIL_OTP_LENGTH}-Digit Code Sent!`,
          description: `We've sent a ${EMAIL_OTP_LENGTH}-digit code to ${email}. Check your inbox.`,

        });
      }
    } catch (err: any) {
      // ── FALLBACK: still show OTP input ──
      setOtpSent(true);
      toast({
        variant: "destructive",
        title: "OTP Service Unavailable",
        description: "Could not send OTP. If you have a fallback access code, enter it below.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setFormLoading(true);

    try {
      if (otpCode.length !== EMAIL_OTP_LENGTH && otpCode !== FALLBACK_OTP) {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: `Please enter the complete ${EMAIL_OTP_LENGTH}-digit code.`,
        });
        return;
      }

      // ── FALLBACK OTP BYPASS ──
      if (otpCode === FALLBACK_OTP) {

        const fallbackEmail = email || "admin@westmed.local";
        const { error: fallbackErr } = await emergencySignIn(fallbackEmail, "admin", "333892");
        if (fallbackErr) {
          toast({ variant: "destructive", title: "Fallback Login Failed", description: fallbackErr.message });
          return;
        }
        toast({ title: "Access Granted", description: "Signed in with fallback code." });
        navigate("/dashboard");
        return;
      }

      const { error } = await verifyOTP(email, otpCode);

      if (error) {
        toast({
          variant: "destructive",
          title: "OTP Verification Failed",
          description: error.message || "Invalid or expired OTP code.",
        });
        return;
      }

      // auth.tsx verifyOTP already handles session creation, profile, role, and designation.
      // Just navigate based on what auth context set.
      toast({
        title: "Welcome!",
        description: "Successfully signed in.",
      });

      // Small delay to let auth state propagate, then navigate
      // We read from auth context indirectly via getUser + our profile
      await routeAfterAuth();
    } catch (err: any) {
      console.error("Error determining user type:", err);
      toast({
        variant: "destructive",
        title: "Sign-in Error",
        description: err?.message || "Something went wrong while signing in.",
      });
      navigate("/dashboard");
    } finally {
      setFormLoading(false);
    }
  };

  // ========== MOBILE OTP HANDLERS ==========

  const handleSendMobileOTP = async () => {
    if (!validateMobileNumber(mobileNumber)) {
      toast({
        variant: "destructive",
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    setFormLoading(true);

    try {
      const { error } = await sendMobileOTP(mobileNumber);

      if (error) {
        // ── FALLBACK: network/connectivity error → guide to Emergency Login ──
        if (isNetworkError(error)) {
          setDnsBlocked(true);
          setLoginMethod("email"); // Switch to the emergency login tab
          toast({
            variant: "destructive",
            title: "Mobile OTP Service Unreachable",
            description:
              "Network issue detected. Switched to Emergency Login. Contact your admin for the emergency access code.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Failed to Send OTP",
            description: error.message,
          });
        }
      } else {
        setMobileOtpSent(true);
        setMobileResendCooldown(60);
        toast({
          title: "OTP Sent!",
          description: `We've sent a 6-digit OTP to ${mobileNumber}.`,
        });
      }
    } catch (err: any) {
      // ── FALLBACK: unexpected/thrown network error ──
      if (isNetworkError(err)) {
        setDnsBlocked(true);
        setLoginMethod("email");
        toast({
          variant: "destructive",
          title: "Network Error",
          description: "Cannot reach the SMS service. Switched to Emergency Login mode.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Send OTP",
          description: err?.message || "Something went wrong.",
        });
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleVerifyMobileOTP = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setFormLoading(true);

    try {
      if (mobileOtpCode.length !== 6) {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: "Please enter the complete 6-digit code.",
        });
        return;
      }

      const { error } = await verifyMobileOTP(mobileNumber, mobileOtpCode);

      if (error) {
        toast({
          variant: "destructive",
          title: "OTP Verification Failed",
          description: error.message || "Invalid or expired OTP code.",
        });
        return;
      }

      // After mobile OTP verify, the auth context handles session.
      // Now do role-based routing same as email OTP.
      // The verifyMobileOTP in auth.tsx already sets user/session/role.
      // We need to check role from the verify-otp response (already set in auth context).
      // Use a small delay to let auth state update, then navigate.

      // We can check the user profile from auth context after verification
      // But since verifyMobileOTP already sets everything, we navigate based on returned data
      // The auth context's verifyMobileOTP already calls createUserSession and sets userProfile

      // auth.tsx verifyMobileOTP already handles session creation, profile, role, and designation.
      // Just navigate based on what was set.
      toast({
        title: "Welcome!",
        description: "Successfully signed in.",
      });

      // Read role info from the session that auth.tsx just created
      const sessionToken = window.localStorage.getItem("supabase_session_token");
      if (sessionToken) {
        const { data: sessionData } = await supabase.rpc("get_session_by_token", { _token: sessionToken });

        const session = Array.isArray(sessionData) ? sessionData[0] : sessionData;
        if (session) {
          navigateByRole(session.user_type, session.role);
          return;
        }
      }

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Error during mobile OTP verification:", err);
      toast({
        variant: "destructive",
        title: "Sign-in Error",
        description: err?.message || "Something went wrong while signing in.",
      });
    } finally {
      setFormLoading(false);
    }
  };

  // ========== USERNAME/PASSWORD HANDLER ==========
  const handlePasswordSignIn = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!pwIdentifier || !pwPassword) {
      toast({ variant: "destructive", title: "Missing Credentials", description: "Enter username/email and password." });
      return;
    }
    setFormLoading(true);
    try {
      const isEmail = pwIdentifier.includes("@");
      const { error } = isEmail
        ? await signInWithEmail(pwIdentifier.trim(), pwPassword)
        : await signInWithUsername(pwIdentifier.trim(), pwPassword);
      if (error) {
        toast({ variant: "destructive", title: "Sign-in Failed", description: error.message || "Invalid credentials" });
        return;
      }
      toast({ title: "Welcome!", description: "Successfully signed in." });
      await routeAfterAuth();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err?.message || "Sign-in failed." });
    } finally {
      setFormLoading(false);
    }
  };

  // While auth is loading, show a loading spinner instead of the login form
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col p-4 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${westmedBanner})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={westmedLogo} alt="WestMed Hospital Logo" className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">WestMed Hospital</h1>
            <p className="text-white/90 drop-shadow-md">Hospital Management System</p>
          </div>

          <DNSHelpBanner />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sign in with OTP</CardTitle>
              <CardDescription>Choose your preferred login method</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs
                value={loginMethod}
                onValueChange={(v) => setLoginMethod(v as "email" | "mobile" | "password")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="email" className="flex items-center gap-1.5">
                    {dnsBlocked ? <Shield className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    {dnsBlocked ? "Emergency" : "Email OTP"}
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" />
                    Mobile OTP
                  </TabsTrigger>
                  <TabsTrigger value="password" className="flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4" />
                    Password
                  </TabsTrigger>
                </TabsList>

                {dnsBlocked && loginMethod === "mobile" && (
                  <div className="mb-3 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-muted-foreground">
                    ⚠️ Mobile OTP may be unavailable due to network issues. Try{" "}
                    <button className="underline font-medium text-primary" onClick={() => setLoginMethod("email")}>
                      Emergency Login
                    </button>{" "}
                    instead.
                  </div>
                )}

                {/* Email OTP / Emergency Login Tab */}
                <TabsContent value="email">
                  {dnsBlocked ? (
                    /* Emergency Login Form */
                    <div className="space-y-4">
                      <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                        🔐 Network issues detected. Using emergency offline login. Contact your administrator for the
                        emergency access code.
                      </div>

                      <div>
                        <Label htmlFor="emergency-email">Email Address</Label>
                        <Input
                          id="emergency-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          autoComplete="email"
                        />
                      </div>

                      <div>
                        <Label htmlFor="emergency-role">Role</Label>
                        <select
                          id="emergency-role"
                          value={emergencyRole}
                          onChange={(e) => setEmergencyRole(e.target.value as "admin" | "manager")}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>Enter 6-Digit Emergency Code</Label>
                        <div className="flex justify-center mt-2">
                          <InputOTP maxLength={6} value={emergencyOtp} onChange={setEmergencyOtp}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <Button
                        type="button"
                        onClick={handleEmergencyLogin}
                        className="w-full"
                        disabled={formLoading || !email || emergencyOtp.length !== 6}
                      >
                        {formLoading ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Emergency Sign In
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    /* Normal Email OTP Form */
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email-otp">Email Address</Label>
                        <Input
                          id="email-otp"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          disabled={otpSent}
                          autoComplete="email"
                        />
                      </div>

                      {!otpSent ? (
                        <Button
                          type="button"
                          onClick={handleSendOTP}
                          className="w-full"
                          disabled={formLoading || !email}
                        >
                          {formLoading ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Sending...
                            </>
                          ) : (
                            `Send ${EMAIL_OTP_LENGTH}-Digit OTP`
                          )}
                        </Button>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <Label>Enter {EMAIL_OTP_LENGTH}-Digit OTP</Label>
                            <p className="text-xs text-muted-foreground">OTP sent to {email}</p>
                            <div className="flex justify-center mt-2">
                              <InputOTP maxLength={EMAIL_OTP_LENGTH} value={otpCode} onChange={setOtpCode}>
                                <InputOTPGroup>
                                  {Array.from({ length: EMAIL_OTP_LENGTH }).map((_, i) => (
                                    <InputOTPSlot key={i} index={i} />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={() => handleVerifyOTP()}
                            className="w-full"
                            disabled={
                              formLoading ||
                              (otpCode.length !== EMAIL_OTP_LENGTH && otpCode !== FALLBACK_OTP)
                            }
                          >

                            {formLoading ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Verifying...
                              </>
                            ) : (
                              "Verify OTP"
                            )}
                          </Button>

                          <div className="text-center space-x-2">
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => {
                                setOtpSent(false);
                                setOtpCode("");
                              }}
                              className="text-sm"
                            >
                              Change Email
                            </Button>

                            <Button
                              type="button"
                              variant="link"
                              onClick={handleSendOTP}
                              disabled={resendCooldown > 0}
                              className="text-sm"
                            >
                              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Mobile OTP Tab */}
                <TabsContent value="mobile">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="mobile-otp">Mobile Number</Label>
                      <Input
                        id="mobile-otp"
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(formatMobileNumber(e.target.value))}
                        placeholder="Enter 10-digit mobile number"
                        required
                        disabled={mobileOtpSent}
                        maxLength={10}
                        autoComplete="tel"
                      />
                    </div>

                    {!mobileOtpSent ? (
                      <Button
                        type="button"
                        onClick={handleSendMobileOTP}
                        className="w-full"
                        disabled={formLoading || !validateMobileNumber(mobileNumber)}
                      >
                        {formLoading ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Sending...
                          </>
                        ) : (
                          "Send 6-Digit OTP"
                        )}
                      </Button>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Enter 6-Digit OTP</Label>
                          <p className="text-xs text-muted-foreground">OTP sent to {mobileNumber}</p>
                          <div className="flex justify-center mt-2">
                            <InputOTP maxLength={6} value={mobileOtpCode} onChange={setMobileOtpCode}>
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleVerifyMobileOTP()}
                          className="w-full"
                          disabled={formLoading || mobileOtpCode.length !== 6}
                        >
                          {formLoading ? (
                            <>
                              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              Verifying...
                            </>
                          ) : (
                            "Verify OTP"
                          )}
                        </Button>

                        <div className="text-center space-x-2">
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => {
                              setMobileOtpSent(false);
                              setMobileOtpCode("");
                            }}
                            className="text-sm"
                          >
                            Change Number
                          </Button>

                          <Button
                            type="button"
                            variant="link"
                            onClick={handleSendMobileOTP}
                            disabled={mobileResendCooldown > 0}
                            className="text-sm"
                          >
                            {mobileResendCooldown > 0 ? `Resend in ${mobileResendCooldown}s` : "Resend OTP"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                {/* Username / Password Tab */}
                <TabsContent value="password">
                  <form className="space-y-4" onSubmit={handlePasswordSignIn}>
                    <div>
                      <Label htmlFor="pw-identifier">Username or Email</Label>
                      <Input
                        id="pw-identifier"
                        type="text"
                        value={pwIdentifier}
                        onChange={(e) => setPwIdentifier(e.target.value)}
                        placeholder="Enter username or email"
                        required
                        autoComplete="username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="pw-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="pw-password"
                          type={pwShow ? "text" : "password"}
                          value={pwPassword}
                          onChange={(e) => setPwPassword(e.target.value)}
                          placeholder="Enter password"
                          required
                          autoComplete="current-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setPwShow((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                          aria-label={pwShow ? "Hide password" : "Show password"}
                        >
                          {pwShow ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={formLoading || !pwIdentifier || !pwPassword}
                    >
                      {formLoading ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Fix Login recovery button */}
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10 text-xs"
              onClick={async () => {
                toast({
                  title: "Resetting login state...",
                  description: "Clearing cached data and reloading.",
                });
                // Small delay so the toast is visible
                setTimeout(() => repairAuthState(), 500);
              }}
            >
              <ShieldAlert className="h-3 w-3 mr-1" />
              Having trouble? Fix Login
            </Button>
          </div>

          {/* PWA Install & Update Section */}
          <div className="mt-4 space-y-2">
            {/* Install App Button */}
            {isInstallable && !isInstalled && (
              <Button
                variant="outline"
                className="w-full bg-white/90 hover:bg-white text-foreground"
                onClick={async () => {
                  const success = await installApp();
                  if (success) {
                    toast({
                      title: "App Installed!",
                      description: "WestMed has been added to your home screen.",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Install WestMed App
              </Button>
            )}

            {/* App Already Installed */}
            {isInstalled && (
              <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                <Check className="h-4 w-4" />
                <span>App Installed</span>
              </div>
            )}

            {/* Check for Updates Button */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-white/80 hover:bg-white text-foreground text-xs"
                onClick={async () => {
                  const result = await checkForUpdate();
                  if (result.error) {
                    toast({
                      title: "Update check unavailable",
                      description: result.error,
                      variant: "destructive",
                    });
                  } else if (result.updateAvailable) {
                    toast({
                      title: "Update Available!",
                      description: `Version ${result.publishedVersion} is ready to apply.`,
                    });
                  } else {
                    toast({
                      title: "You're up to date!",
                      description: `Running latest published version ${versionInfo.version}.`,
                    });
                  }
                }}
                disabled={isCheckingForUpdates}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isCheckingForUpdates ? "animate-spin" : ""}`} />
                {isCheckingForUpdates ? "Checking..." : "Check Updates"}
              </Button>

              {isUpdateAvailable && (
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  onClick={applyUpdate}
                >
                  Apply Update
                </Button>
              )}
            </div>

            {/* Version Display */}
            <div className="text-center text-white/60 text-xs">
              <p>Version {versionInfo.version}{publishedVersion ? ` · Latest ${publishedVersion}` : ""}</p>
              <p className="text-white/40">Build: {versionInfo.gitCommit.slice(0, 7)}</p>
            </div>

            {/* Help Guide Link */}
            <Button
              variant="link"
              className="text-white/80 hover:text-white text-xs p-0 h-auto"
              onClick={() => navigate("/help-guide")}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              Help Guide
            </Button>
          </div>
        </div>
      </div>

      <Footer variant="light" className="mt-auto" />
    </div>
  );
};

export default Auth;
