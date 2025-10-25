import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Shield, UserCheck, ArrowLeft, Mail, KeyRound } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from '@/integrations/supabase/client';
import westmedBanner from '@/assets/westmed-banner.png';
import westmedLogo from '@/assets/westmed-logo.png';
import Footer from '@/components/Footer';

const Auth = () => {
  const [staffLoading, setStaffLoading] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [staffData, setStaffData] = useState({ username: '', password: '' });
  const [doctorData, setDoctorData] = useState({ doctorCode: '', password: '' });
  const [adminData, setAdminData] = useState({ email: '', password: '' });
  
  // OTP states for Staff
  const [staffUseOTP, setStaffUseOTP] = useState(false);
  const [staffOTPSent, setStaffOTPSent] = useState(false);
  const [staffOTPCode, setStaffOTPCode] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffResendCooldown, setStaffResendCooldown] = useState(0);

  // OTP states for Doctor
  const [doctorUseOTP, setDoctorUseOTP] = useState(false);
  const [doctorOTPSent, setDoctorOTPSent] = useState(false);
  const [doctorOTPCode, setDoctorOTPCode] = useState('');
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorResendCooldown, setDoctorResendCooldown] = useState(0);

  // OTP states for Admin
  const [adminUseOTP, setAdminUseOTP] = useState(false);
  const [adminOTPSent, setAdminOTPSent] = useState(false);
  const [adminOTPCode, setAdminOTPCode] = useState('');
  const [adminResendCooldown, setAdminResendCooldown] = useState(0);
  
  const { signInWithUsername, signInWithEmail, signInWithOTP, verifyOTP, getUserEmail, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    
    if (staffResendCooldown > 0) {
      intervals.push(setInterval(() => {
        setStaffResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000));
    }
    
    if (doctorResendCooldown > 0) {
      intervals.push(setInterval(() => {
        setDoctorResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000));
    }
    
    if (adminResendCooldown > 0) {
      intervals.push(setInterval(() => {
        setAdminResendCooldown(prev => Math.max(0, prev - 1));
      }, 1000));
    }
    
    return () => intervals.forEach(clearInterval);
  }, [staffResendCooldown, doctorResendCooldown, adminResendCooldown]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoading(true);

    const { error } = await signInWithUsername(staffData.username, staffData.password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Staff Login Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in as staff.",
      });
    }
    
    setStaffLoading(false);
  };

  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorLoading(true);

    const { error } = await signInWithUsername(doctorData.doctorCode, doctorData.password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Doctor Login Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome Doctor!",
        description: "Successfully signed in.",
      });
    }
    
    setDoctorLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);

    const { error } = await signInWithEmail(adminData.email, adminData.password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Admin Login Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome back Admin!",
        description: "Successfully signed in as administrator.",
      });
    }
    
    setAdminLoading(false);
  };

  const handleAdminResetPassword = async () => {
    if (!adminData.email) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Enter your admin email first.' });
      return;
    }
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(adminData.email, {
        redirectTo: redirectUrl,
      });
      if (error) throw error;
      toast({ title: 'Reset link sent', description: 'Check your inbox to reset your password.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Reset failed', description: err?.message || 'Could not send reset email.' });
    }
  };

  // Staff OTP Handlers
  const handleStaffSendOTP = async () => {
    setStaffLoading(true);
    
    const { email, error: emailError } = await getUserEmail(staffData.username, 'staff');
    
    if (emailError || !email) {
      toast({
        variant: "destructive",
        title: "Email Not Found",
        description: "No email registered for this username. Please contact admin.",
      });
      setStaffLoading(false);
      return;
    }
    
    setStaffEmail(email);
    
    const { error } = await signInWithOTP(email);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message,
      });
    } else {
      setStaffOTPSent(true);
      setStaffResendCooldown(60);
      toast({
        title: "6-Digit Code Sent!",
        description: `We've sent a 6-digit code (not a link) to ${email.substring(0, 3)}***@${email.split('@')[1]}. Check your inbox.`,
      });
    }
    
    setStaffLoading(false);
  };

  const handleStaffVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffLoading(true);
    
    if (staffOTPCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code.",
      });
      setStaffLoading(false);
      return;
    }
    
    const { error } = await verifyOTP(staffEmail, staffOTPCode);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "OTP Verification Failed",
        description: error.message || "Invalid or expired OTP code.",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in as staff.",
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    }
    
    setStaffLoading(false);
  };

  const handleStaffResendOTP = async () => {
    await handleStaffSendOTP();
  };

  // Doctor OTP Handlers
  const handleDoctorSendOTP = async () => {
    setDoctorLoading(true);
    
    const { email, error: emailError } = await getUserEmail(doctorData.doctorCode, 'doctor');
    
    if (emailError || !email) {
      toast({
        variant: "destructive",
        title: "Email Not Found",
        description: "No email registered for this doctor code. Please contact admin.",
      });
      setDoctorLoading(false);
      return;
    }
    
    setDoctorEmail(email);
    
    const { error } = await signInWithOTP(email);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message,
      });
    } else {
      setDoctorOTPSent(true);
      setDoctorResendCooldown(60);
      toast({
        title: "6-Digit Code Sent!",
        description: `We've sent a 6-digit code (not a link) to ${email.substring(0, 3)}***@${email.split('@')[1]}. Check your inbox.`,
      });
    }
    
    setDoctorLoading(false);
  };

  const handleDoctorVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setDoctorLoading(true);
    
    if (doctorOTPCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code.",
      });
      setDoctorLoading(false);
      return;
    }
    
    const { error } = await verifyOTP(doctorEmail, doctorOTPCode);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "OTP Verification Failed",
        description: error.message || "Invalid or expired OTP code.",
      });
    } else {
      toast({
        title: "Welcome Doctor!",
        description: "Successfully signed in.",
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    }
    
    setDoctorLoading(false);
  };

  const handleDoctorResendOTP = async () => {
    await handleDoctorSendOTP();
  };

  // Admin OTP Handlers
  const handleAdminSendOTP = async () => {
    if (!adminData.email) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your admin email first.",
      });
      return;
    }
    
    setAdminLoading(true);
    
    const { error } = await signInWithOTP(adminData.email);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Failed to Send OTP",
        description: error.message,
      });
    } else {
      setAdminOTPSent(true);
      setAdminResendCooldown(60);
      toast({
        title: "6-Digit Code Sent!",
        description: `We've sent a 6-digit code (not a link) to ${adminData.email}. Check your inbox.`,
      });
    }
    
    setAdminLoading(false);
  };

  const handleAdminVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    
    if (adminOTPCode.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter the complete 6-digit code.",
      });
      setAdminLoading(false);
      return;
    }
    
    const { error } = await verifyOTP(adminData.email, adminOTPCode);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "OTP Verification Failed",
        description: error.message || "Invalid or expired OTP code.",
      });
    } else {
      toast({
        title: "Welcome back Admin!",
        description: "Successfully signed in as administrator.",
      });
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    }
    
    setAdminLoading(false);
  };

  const handleAdminResendOTP = async () => {
    await handleAdminSendOTP();
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
          <CardContent className="pt-6">
            <Tabs defaultValue="doctor" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Hospital Staff
                </TabsTrigger>
                <TabsTrigger value="doctor" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Doctor
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="staff" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Hospital Staff Login</h2>
                  <p className="text-sm text-muted-foreground">
                    {staffUseOTP ? 'Sign in with one-time password' : 'Use your username and password'}
                  </p>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <Button 
                    type="button"
                    variant={!staffUseOTP ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      setStaffUseOTP(false);
                      setStaffOTPSent(false);
                      setStaffOTPCode('');
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Password
                  </Button>
                  <Button 
                    type="button"
                    variant={staffUseOTP ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setStaffUseOTP(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    OTP
                  </Button>
                </div>
                
                {!staffUseOTP ? (
                  <form onSubmit={handleStaffLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="staff-username">Username</Label>
                      <Input
                        id="staff-username"
                        type="text"
                        placeholder="Enter your username"
                        value={staffData.username}
                        onChange={(e) => setStaffData({ ...staffData, username: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staff-password">Password</Label>
                      <Input
                        id="staff-password"
                        type="password"
                        value={staffData.password}
                        onChange={(e) => setStaffData({ ...staffData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={staffLoading}>
                      {staffLoading ? 'Signing In...' : 'Sign In as Staff'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="staff-username-otp">Username</Label>
                      <Input
                        id="staff-username-otp"
                        type="text"
                        placeholder="Enter your username"
                        value={staffData.username}
                        onChange={(e) => setStaffData({ ...staffData, username: e.target.value })}
                        disabled={staffOTPSent}
                        required
                      />
                    </div>
                    
                    {!staffOTPSent ? (
                      <Button 
                        type="button"
                        onClick={handleStaffSendOTP} 
                        className="w-full" 
                        disabled={staffLoading || !staffData.username}
                      >
                        {staffLoading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                      </Button>
                    ) : (
                      <form onSubmit={handleStaffVerifyOTP} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Enter 6-Digit OTP</Label>
                          <p className="text-xs text-muted-foreground text-center">
                            Enter the 6-digit code emailed to you
                          </p>
                          <div className="flex justify-center">
                            <InputOTP 
                              maxLength={6} 
                              value={staffOTPCode} 
                              onChange={setStaffOTPCode}
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
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Code sent to {staffEmail.substring(0, 3)}***@{staffEmail.split('@')[1]}
                          </p>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={staffLoading || staffOTPCode.length !== 6}
                        >
                          {staffLoading ? 'Verifying...' : 'Verify & Sign In'}
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="ghost" 
                          className="w-full" 
                          onClick={handleStaffResendOTP}
                          disabled={staffResendCooldown > 0 || staffLoading}
                        >
                          {staffResendCooldown > 0 
                            ? `Resend OTP (${staffResendCooldown}s)` 
                            : 'Resend OTP'}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="doctor" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Doctor Login</h2>
                  <p className="text-sm text-muted-foreground">
                    {doctorUseOTP ? 'Sign in with one-time password' : 'Sign in with your doctor code and password'}
                  </p>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <Button 
                    type="button"
                    variant={!doctorUseOTP ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      setDoctorUseOTP(false);
                      setDoctorOTPSent(false);
                      setDoctorOTPCode('');
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Password
                  </Button>
                  <Button 
                    type="button"
                    variant={doctorUseOTP ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setDoctorUseOTP(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    OTP
                  </Button>
                </div>
                
                {!doctorUseOTP ? (
                  <form onSubmit={handleDoctorLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctor-code">Doctor Code</Label>
                      <Input
                        id="doctor-code"
                        type="text"
                        placeholder="Enter your doctor code (e.g., DOC001)"
                        value={doctorData.doctorCode}
                        onChange={(e) => setDoctorData({ ...doctorData, doctorCode: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doctor-password">Password</Label>
                      <Input
                        id="doctor-password"
                        type="password"
                        placeholder="Enter your password"
                        value={doctorData.password}
                        onChange={(e) => setDoctorData({ ...doctorData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={doctorLoading}>
                      {doctorLoading ? 'Signing In...' : 'Sign In as Doctor'}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctor-code-otp">Doctor Code</Label>
                      <Input
                        id="doctor-code-otp"
                        type="text"
                        placeholder="Enter your doctor code"
                        value={doctorData.doctorCode}
                        onChange={(e) => setDoctorData({ ...doctorData, doctorCode: e.target.value })}
                        disabled={doctorOTPSent}
                        required
                      />
                    </div>
                    
                    {!doctorOTPSent ? (
                      <Button 
                        type="button"
                        onClick={handleDoctorSendOTP} 
                        className="w-full" 
                        disabled={doctorLoading || !doctorData.doctorCode}
                      >
                        {doctorLoading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                      </Button>
                    ) : (
                      <form onSubmit={handleDoctorVerifyOTP} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Enter 6-Digit OTP</Label>
                          <p className="text-xs text-muted-foreground text-center">
                            Enter the 6-digit code emailed to you
                          </p>
                          <div className="flex justify-center">
                            <InputOTP 
                              maxLength={6} 
                              value={doctorOTPCode} 
                              onChange={setDoctorOTPCode}
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
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Code sent to {doctorEmail.substring(0, 3)}***@{doctorEmail.split('@')[1]}
                          </p>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={doctorLoading || doctorOTPCode.length !== 6}
                        >
                          {doctorLoading ? 'Verifying...' : 'Verify & Sign In'}
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="ghost" 
                          className="w-full" 
                          onClick={handleDoctorResendOTP}
                          disabled={doctorResendCooldown > 0 || doctorLoading}
                        >
                          {doctorResendCooldown > 0 
                            ? `Resend OTP (${doctorResendCooldown}s)` 
                            : 'Resend OTP'}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="admin" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Administrator Login</h2>
                  <p className="text-sm text-muted-foreground">
                    {adminUseOTP ? 'Sign in with one-time password' : 'Sign in with email and password'}
                  </p>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <Button 
                    type="button"
                    variant={!adminUseOTP ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => {
                      setAdminUseOTP(false);
                      setAdminOTPSent(false);
                      setAdminOTPCode('');
                    }}
                  >
                    <KeyRound className="mr-2 h-4 w-4" />
                    Password
                  </Button>
                  <Button 
                    type="button"
                    variant={adminUseOTP ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setAdminUseOTP(true)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    OTP
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="Enter your admin email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    disabled={adminOTPSent}
                    required
                  />
                </div>
                
                {!adminUseOTP ? (
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={adminData.password}
                        onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={adminLoading}>
                      {adminLoading ? 'Signing In...' : 'Sign In as Admin'}
                    </Button>
                    <div className="flex items-center justify-center text-xs text-muted-foreground mt-2">
                      <button type="button" onClick={handleAdminResetPassword} className="underline hover:opacity-80">
                        Forgot password?
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {!adminOTPSent ? (
                      <Button 
                        type="button"
                        onClick={handleAdminSendOTP} 
                        className="w-full" 
                        disabled={adminLoading || !adminData.email}
                      >
                        {adminLoading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                      </Button>
                    ) : (
                      <form onSubmit={handleAdminVerifyOTP} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Enter 6-Digit OTP</Label>
                          <p className="text-xs text-muted-foreground text-center">
                            Enter the 6-digit code emailed to you
                          </p>
                          <div className="flex justify-center">
                            <InputOTP 
                              maxLength={6} 
                              value={adminOTPCode} 
                              onChange={setAdminOTPCode}
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
                          <p className="text-xs text-muted-foreground text-center mt-2">
                            Code sent to {adminData.email}
                          </p>
                        </div>
                        
                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={adminLoading || adminOTPCode.length !== 6}
                        >
                          {adminLoading ? 'Verifying...' : 'Verify & Sign In'}
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="ghost" 
                          className="w-full" 
                          onClick={handleAdminResendOTP}
                          disabled={adminResendCooldown > 0 || adminLoading}
                        >
                          {adminResendCooldown > 0 
                            ? `Resend OTP (${adminResendCooldown}s)` 
                            : 'Resend OTP'}
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <Footer variant="light" className="mt-8" />
      </div>
    </div>
  );
};

export default Auth;