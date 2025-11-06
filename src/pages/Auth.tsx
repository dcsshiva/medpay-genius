import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from '@/integrations/supabase/client';
import westmedBanner from '@/assets/westmed-banner.png';
import westmedLogo from '@/assets/westmed-logo.png';
import Footer from '@/components/Footer';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useOTP, setUseOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const { signInWithOTP, verifyOTP, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const interval = setInterval(() => {
        setResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendCooldown]);

  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Step 1: Try Supabase auth login
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Invalid credentials');
      }

      const userId = authData.user.id;

      // Step 2: Determine user type and role
      // Check if user is a doctor
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id, doctor_code, full_name')
        .eq('user_id', userId)
        .single();

      if (doctorData) {
        // Create session for doctor
        const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        await supabase.from('user_sessions').insert({
          user_id: userId,
          user_type: 'doctor',
          original_id: doctorData.id,
          session_token: sessionToken,
          refresh_token: refreshToken,
          username: doctorData.doctor_code,
          full_name: doctorData.full_name,
          role: 'doctor',
          expires_at: expiresAt.toISOString(),
          idle_timeout_seconds: 180,
          last_activity_at: new Date().toISOString(),
          is_active: true
        });
        
        window.sessionStorage.setItem('supabase_session_token', sessionToken);
        
        toast({
          title: "Welcome Doctor!",
          description: "Successfully signed in.",
        });
        
        // Redirect to doctor dashboard
        navigate('/dashboard?view=doctor');
        return;
      }

      // Check if user is staff
      const { data: staffData } = await supabase
        .from('staff')
        .select('id, staff_code, full_name, role')
        .eq('user_id', userId)
        .single();

      if (staffData) {
        // Check designation
        const { data: designation } = await supabase
          .from('user_designations')
          .select('designation')
          .eq('user_id', userId)
          .single();

        const userDesignation = designation?.designation || 'staff';

        // Create session for staff
        const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const timeoutDuration = ['admin', 'manager'].includes(staffData.role) ? 300 : 180;
        
        await supabase.from('user_sessions').insert({
          user_id: userId,
          user_type: 'staff',
          original_id: staffData.id,
          session_token: sessionToken,
          refresh_token: refreshToken,
          username: staffData.staff_code,
          full_name: staffData.full_name,
          role: staffData.role,
          expires_at: expiresAt.toISOString(),
          idle_timeout_seconds: timeoutDuration,
          last_activity_at: new Date().toISOString(),
          is_active: true
        });
        
        window.sessionStorage.setItem('supabase_session_token', sessionToken);

        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });

        // Redirect based on designation
        if (userDesignation === 'admin' || userDesignation === 'super_admin') {
          navigate('/dashboard?view=admin');
        } else if (userDesignation === 'manager') {
          navigate('/dashboard?view=manager');
        } else {
          navigate('/dashboard?view=staff');
        }
        return;
      }

      // If no profile found, show error
      throw new Error('No profile found for this user');
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "Invalid credentials"
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (otpCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code.",
      });
      setLoading(false);
      return;
    }
    
    const { error } = await verifyOTP(email, otpCode);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "OTP Verification Failed",
        description: error.message || "Invalid or expired OTP code.",
      });
      setLoading(false);
    } else {
      // After OTP verification, determine user type
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const userId = authUser.id;

          // Check doctor
          const { data: doctorData } = await supabase
            .from('doctors')
            .select('id, doctor_code, full_name')
            .eq('user_id', userId)
            .single();

          if (doctorData) {
            const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            
            await supabase.from('user_sessions').insert({
              user_id: userId,
              user_type: 'doctor',
              original_id: doctorData.id,
              session_token: sessionToken,
              refresh_token: refreshToken,
              username: doctorData.doctor_code,
              full_name: doctorData.full_name,
              role: 'doctor',
              expires_at: expiresAt.toISOString(),
              idle_timeout_seconds: 180,
              last_activity_at: new Date().toISOString(),
              is_active: true
            });
            
            window.sessionStorage.setItem('supabase_session_token', sessionToken);
            navigate('/dashboard?view=doctor');
            return;
          }

          // Check staff
          const { data: staffData } = await supabase
            .from('staff')
            .select('id, staff_code, full_name, role')
            .eq('user_id', userId)
            .single();

          if (staffData) {
            const { data: designation } = await supabase
              .from('user_designations')
              .select('designation')
              .eq('user_id', userId)
              .single();

            const userDesignation = designation?.designation || 'staff';

            const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const refreshToken = `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const timeoutDuration = ['admin', 'manager'].includes(staffData.role) ? 300 : 180;
            
            await supabase.from('user_sessions').insert({
              user_id: userId,
              user_type: 'staff',
              original_id: staffData.id,
              session_token: sessionToken,
              refresh_token: refreshToken,
              username: staffData.staff_code,
              full_name: staffData.full_name,
              role: staffData.role,
              expires_at: expiresAt.toISOString(),
              idle_timeout_seconds: timeoutDuration,
              last_activity_at: new Date().toISOString(),
              is_active: true
            });
            
            window.sessionStorage.setItem('supabase_session_token', sessionToken);

            if (userDesignation === 'admin' || userDesignation === 'super_admin') {
              navigate('/dashboard?view=admin');
            } else if (userDesignation === 'manager') {
              navigate('/dashboard?view=manager');
            } else {
              navigate('/dashboard?view=staff');
            }
          }
        }
      } catch (err) {
        console.error('Error determining user type:', err);
        navigate('/dashboard');
      }
      
      toast({
        title: "Welcome!",
        description: "Successfully signed in.",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Enter your email first.' });
      return;
    }
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      toast({ title: 'Reset link sent', description: 'Check your inbox to reset your password.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Reset failed', description: err?.message || 'Could not send reset email.' });
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${westmedBanner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
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
            <form onSubmit={useOTP ? handleVerifyOTP : handleUnifiedLogin}>
              <div className="space-y-4">
                <div>
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={otpSent}
                  />
                </div>

                <Tabs value={useOTP ? 'otp' : 'password'} onValueChange={(v) => setUseOTP(v === 'otp')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="password">
                      <KeyRound className="mr-2 h-4 w-4" />
                      Password
                    </TabsTrigger>
                    <TabsTrigger value="otp">
                      <Mail className="mr-2 h-4 w-4" />
                      OTP
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="password" className="space-y-4">
                    <div>
                      <Label>Password</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required={!useOTP}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleResetPassword}
                        className="text-sm"
                      >
                        Forgot password?
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="otp" className="space-y-4">
                    {!otpSent ? (
                      <Button 
                        type="button" 
                        onClick={handleSendOTP} 
                        className="w-full"
                        disabled={loading}
                      >
                        {loading ? 'Sending...' : 'Send 6-Digit OTP'}
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label>Enter 6-Digit OTP</Label>
                          <div className="flex justify-center mt-2">
                            <InputOTP
                              maxLength={6}
                              value={otpCode}
                              onChange={setOtpCode}
                            >
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
                        <Button type="submit" className="w-full" disabled={loading || otpCode.length !== 6}>
                          {loading ? 'Verifying...' : 'Verify OTP'}
                        </Button>
                        <div className="text-center">
                          <Button
                            type="button"
                            variant="link"
                            onClick={handleSendOTP}
                            disabled={resendCooldown > 0}
                            className="text-sm"
                          >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default Auth;
