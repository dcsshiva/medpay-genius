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
import { Mail, Download, RefreshCw, Check, Smartphone, BookOpen, ShieldAlert } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import westmedBanner from "@/assets/westmed-banner.png";
import westmedLogo from "@/assets/westmed-logo.png";
import Footer from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatMobileNumber, validateMobileNumber } from "@/lib/validators";

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithOTP, verifyOTP, sendMobileOTP, verifyMobileOTP, user } = useAuth();
  const { isInstallable, isInstalled, installApp, checkForUpdates, isCheckingForUpdates, isUpdateAvailable, applyUpdate } = usePWA();
  const versionInfo = useVersionInfo();
  const isMobile = useIsMobile();

  const { loading: authLoading } = useAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile'>('email');

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

  // Redirect already-authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard');
    }
  }, [authLoading, user, navigate]);

  // Auto-verify Email OTP when all 6 digits are entered
  useEffect(() => {
    if (otpCode.length === 6 && otpSent && !formLoading) {
      handleVerifyOTP().catch((e) => {
        console.error("Auto verify OTP failed", e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  // Auto-verify Mobile OTP when all 6 digits are entered
  useEffect(() => {
    if (mobileOtpCode.length === 6 && mobileOtpSent && !formLoading) {
      handleVerifyMobileOTP().catch((e) => {
        console.error("Auto verify mobile OTP failed", e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOtpCode]);

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
    if (userType === 'doctor') {
      navigate("/dashboard?view=doctor-hub");
    } else if (role && ['admin', 'manager', 'super_admin'].includes(role)) {
      navigate("/dashboard?view=doctor-hub");
    } else if (role && ['staff', 'nurse'].includes(role)) {
      navigate(isMobile ? "/dashboard?view=staff" : "/dashboard");
    } else {
      navigate("/dashboard");
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

    const { error } = await signInWithOTP(email);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message,
      });
    } else {
      setOtpSent(true);
      setResendCooldown(60);
      toast({
        title: "6-Digit Code Sent!",
        description: `We've sent a 6-digit code to ${email}. Check your inbox.`,
      });
    }

    setFormLoading(false);
  };

  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setFormLoading(true);

    try {
      if (otpCode.length !== 6) {
        toast({
          variant: "destructive",
          title: "Invalid OTP",
          description: "Please enter the complete 6-digit code.",
        });
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
      const result = await supabase.auth.getUser();
      const authUser = result?.data?.user;
      
      if (authUser) {
        // Check designation for routing
        const { data: designation } = await supabase
          .from("user_designations")
          .select("designation")
          .eq("user_id", authUser.id)
          .maybeSingle();
        
        // Check if doctor
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", authUser.id)
          .maybeSingle();
        
        const userType = doctorData ? 'doctor' : 'staff';
        const role = designation?.designation || 'staff';
        navigateByRole(userType, role);
        return;
      }
      
      navigate("/dashboard");
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

    const { error } = await sendMobileOTP(mobileNumber);

    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message,
      });
    } else {
      setMobileOtpSent(true);
      setMobileResendCooldown(60);
      toast({
        title: "OTP Sent!",
        description: `We've sent a 6-digit OTP to ${mobileNumber}.`,
      });
    }

    setFormLoading(false);
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
        const { data: sessionData } = await supabase
          .rpc('get_session_by_token', { _token: sessionToken });
        
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Sign in with OTP</CardTitle>
              <CardDescription>Choose your preferred login method</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'email' | 'mobile')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="email" className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    Email OTP
                  </TabsTrigger>
                  <TabsTrigger value="mobile" className="flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4" />
                    Mobile OTP
                  </TabsTrigger>
                </TabsList>

                {/* Email OTP Tab */}
                <TabsContent value="email">
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
                      <Button type="button" onClick={handleSendOTP} className="w-full" disabled={formLoading || !email}>
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
                          <p className="text-xs text-muted-foreground">OTP sent to {email}</p>
                          <div className="flex justify-center mt-2">
                            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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
                          onClick={() => handleVerifyOTP()}
                          className="w-full"
                          disabled={formLoading || otpCode.length !== 6}
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
                  const hasUpdate = await checkForUpdates();
                  if (hasUpdate) {
                    toast({
                      title: "Update Available!",
                      description: "Click 'Apply Update' to get the latest version.",
                    });
                  } else {
                    toast({
                      title: "You're up to date!",
                      description: "Running the latest version. Refreshing...",
                    });
                    setTimeout(() => {
                      window.location.reload();
                    }, 1500);
                  }
                }}
                disabled={isCheckingForUpdates}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isCheckingForUpdates ? 'animate-spin' : ''}`} />
                {isCheckingForUpdates ? 'Checking...' : 'Check Updates'}
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
              <p>Version {versionInfo.version}</p>
              <p className="text-white/40">Build: {versionInfo.gitCommit.slice(0, 7)}</p>
            </div>

            {/* Help Guide Link */}
            <Button
              variant="link"
              className="text-white/80 hover:text-white text-xs p-0 h-auto"
              onClick={() => navigate('/help-guide')}
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
