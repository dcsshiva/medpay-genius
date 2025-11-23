// Auth.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import westmedBanner from "@/assets/westmed-banner.png";
import westmedLogo from "@/assets/westmed-logo.png";
import Footer from "@/components/Footer";

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signInWithOTP, verifyOTP, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [useOTP, setUseOTP] = useState<boolean>(false);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // When user object appears, decide where to navigate
  useEffect(() => {
    const checkUserTypeAndNavigate = async () => {
      if (!user) return;

      try {
        // Check if user is a doctor by querying doctors table directly
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1);

        // doctorData may be an array (when using limit) or object depending on client config;
        const hasDoctor = Array.isArray(doctorData) ? doctorData.length > 0 : !!doctorData;

        if (hasDoctor) {
          navigate("/dashboard?view=doctor");
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        // In case of any error, fallback to dashboard
        navigate("/dashboard");
      }
    };

    checkUserTypeAndNavigate();
  }, [user, navigate]);

  // Auto-verify OTP when all 6 digits are entered
  useEffect(() => {
    // Only attempt auto verify if OTP was sent and not currently loading
    if (otpCode.length === 6 && otpSent && !loading) {
      // call handleVerifyOTP but avoid passing a real event
      // cast to any because original had as any
      handleVerifyOTP(undefined as any).catch((e) => {
        // swallow errors here; handleVerifyOTP shows toasts
        // but log for debugging
        // eslint-disable-next-line no-console
        console.error("Auto verify OTP failed", e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Helper to create session entry in DB and store token client-side
  const createSessionRecord = async (
    userId: string,
    userType: "doctor" | "staff",
    originalId: string | number,
    username: string,
    fullName: string,
    role: string,
    idleTimeoutSeconds = 180,
  ) => {
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await supabase.from("user_sessions").insert([{
      user_id: userId,
      user_type: userType,
      original_id: String(originalId),
      session_token: sessionToken,
      refresh_token: refreshToken,
      username,
      full_name: fullName,
      role,
      expires_at: expiresAt.toISOString(),
      idle_timeout_seconds: idleTimeoutSeconds,
      last_activity_at: new Date().toISOString(),
      is_active: true,
    }]);

    window.sessionStorage.setItem("supabase_session_token", sessionToken);
  };

  // Unified password login
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData?.user) throw new Error("Invalid credentials");

      const userId = authData.user.id;

      // Step 2: Determining user type (doctor -> staff -> designation-only)
      // Check doctor
      const { data: doctorData } = await supabase
        .from("doctors")
        .select("id, doctor_code, full_name")
        .eq("user_id", userId)
        .single();

      if (doctorData) {
        await createSessionRecord(
          userId,
          "doctor",
          doctorData.id,
          doctorData.doctor_code,
          doctorData.full_name,
          "doctor",
          180,
        );

        toast({
          title: "Welcome Doctor!",
          description: "Successfully signed in.",
        });

        // let auth context handle navigation (or app checks sessionStorage)
        return;
      }

      // Check staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, staff_code, full_name, role")
        .eq("user_id", userId)
        .single();

      if (staffData) {
        const { data: designation } = await supabase
          .from("user_designations")
          .select("designation")
          .eq("user_id", userId)
          .single();

        const userDesignation = designation?.designation || "staff";

        const timeoutDuration = ["admin", "manager"].includes(staffData.role) ? 300 : 180;

        await createSessionRecord(
          userId,
          "staff",
          staffData.id,
          staffData.staff_code,
          staffData.full_name,
          staffData.role,
          timeoutDuration,
        );

        // Redirect managers/admins to doctor-hub
        if (
          userDesignation === "manager" ||
          userDesignation === "admin" ||
          staffData.role === "manager" ||
          staffData.role === "admin"
        ) {
          toast({
            title:
              userDesignation === "manager" || staffData.role === "manager" ? "Welcome Manager!" : "Welcome Admin!",
            description: "Successfully signed in.",
          });
          navigate("/dashboard?view=doctor-hub");
          return;
        }

        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });

        return;
      }

      // Check designation-only (admins without staff record)
      const { data: designationOnly } = await supabase
        .from("user_designations")
        .select("designation")
        .eq("user_id", userId)
        .single();

      if (designationOnly) {
        const role =
          designationOnly.designation === "super_admin"
            ? "super_admin"
            : designationOnly.designation === "manager"
              ? "manager"
              : "admin";

        await createSessionRecord(
          userId,
          "staff",
          userId,
          authData.user.email ?? email,
          authData.user.email ?? email,
          role,
          300,
        );

        toast({
          title: "Welcome!",
          description: "Successfully signed in.",
        });

        return;
      }

      // No profile found
      throw new Error("No profile found for this user");
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error?.message || "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  // Send OTP
  const handleSendOTP = async () => {
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address first.",
      });
      return;
    }

    setLoading(true);

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

    setLoading(false);
  };

  // Verify OTP
  // e may be undefined when auto-invoked; make it optional
  const handleVerifyOTP = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setLoading(true);

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

      // After OTP verification, determine user type and create session similar to password flow
      const result = await supabase.auth.getUser();
      const authUser = result?.data?.user;

      if (authUser) {
        const userId = authUser.id;

        // Check doctor
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("id, doctor_code, full_name")
          .eq("user_id", userId)
          .single();

        if (doctorData) {
          await createSessionRecord(
            userId,
            "doctor",
            doctorData.id,
            doctorData.doctor_code,
            doctorData.full_name,
            "doctor",
            180,
          );

          // session created; auth context or app flow handles navigation
          return;
        }

        // Check staff
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, staff_code, full_name, role")
          .eq("user_id", userId)
          .single();

        if (staffData) {
          const { data: designation } = await supabase
            .from("user_designations")
            .select("designation")
            .eq("user_id", userId)
            .single();

          const userDesignation = designation?.designation || "staff";
          const timeoutDuration = ["admin", "manager"].includes(staffData.role) ? 300 : 180;

          await createSessionRecord(
            userId,
            "staff",
            staffData.id,
            staffData.staff_code,
            staffData.full_name,
            staffData.role,
            timeoutDuration,
          );

          if (
            userDesignation === "manager" ||
            userDesignation === "admin" ||
            staffData.role === "manager" ||
            staffData.role === "admin"
          ) {
            toast({
              title:
                userDesignation === "manager" || staffData.role === "manager" ? "Welcome Manager!" : "Welcome Admin!",
              description: "Successfully signed in.",
            });
            navigate("/dashboard?view=doctor-hub");
            return;
          }

          // normal staff
          toast({
            title: "Welcome!",
            description: "Successfully signed in.",
          });
          return;
        }

        // Designation only
        const { data: designationOnly } = await supabase
          .from("user_designations")
          .select("designation")
          .eq("user_id", userId)
          .single();

        if (designationOnly) {
          const role =
            designationOnly.designation === "super_admin"
              ? "super_admin"
              : designationOnly.designation === "manager"
                ? "manager"
                : "admin";

          await createSessionRecord(
            userId,
            "staff",
            userId,
            authUser.email ?? email,
            authUser.email ?? email,
            role,
            300,
          );

          toast({
            title: "Welcome!",
            description: "Successfully signed in.",
          });
          return;
        }
      }

      // If we reach here, fallback navigation
      toast({
        title: "Welcome!",
        description: "Successfully signed in.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Error determining user type:", err);
      toast({
        variant: "destructive",
        title: "Sign-in Error",
        description: err?.message || "Something went wrong while signing in.",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: "destructive", title: "Email required", description: "Enter your email first." });
      return;
    }
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      toast({ title: "Reset link sent", description: "Check your inbox to reset your password." });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: err?.message || "Could not send reset email.",
      });
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
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 text-white hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img src={westmedLogo} alt="WestMed Hospital Logo" className="h-16 w-16" />
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">WestMed Hospital</h1>
            <p className="text-white/90 drop-shadow-md">Hospital Management System</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hospital Login</CardTitle>
              <CardDescription>Sign in to access your dashboard</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleUnifiedLogin}>
                <div className="space-y-4">
                  <Tabs
                    value={useOTP ? "otp" : "password"}
                    onValueChange={(v) => setUseOTP(v === "otp")}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="password" disabled={otpSent}>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Password
                      </TabsTrigger>
                      <TabsTrigger value="otp">
                        <Mail className="mr-2 h-4 w-4" />
                        OTP
                      </TabsTrigger>
                    </TabsList>

                    {/* Password Tab */}
                    <TabsContent value="password" className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          disabled={otpSent}
                          autoComplete="email"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          required={!useOTP}
                          autoComplete="current-password"
                        />
                      </div>

                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Signing in...
                          </>
                        ) : (
                          "Sign In"
                        )}
                      </Button>

                      <div className="text-center">
                        <Button type="button" variant="link" onClick={handleResetPassword} className="text-sm">
                          Forgot password?
                        </Button>
                      </div>
                    </TabsContent>

                    {/* OTP Tab */}
                    <TabsContent value="otp" className="space-y-4 mt-4">
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
                        <Button type="button" onClick={handleSendOTP} className="w-full" disabled={loading || !email}>
                          {loading ? (
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
                            onClick={() => handleVerifyOTP(undefined as any)}
                            className="w-full"
                            disabled={loading || otpCode.length !== 6}
                          >
                            {loading ? (
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
                    </TabsContent>
                  </Tabs>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer variant="light" className="mt-auto" />
    </div>
  );
};

export default Auth;
