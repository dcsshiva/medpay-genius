import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Shield, UserCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import westmedBanner from '@/assets/westmed-banner.png';
import westmedLogo from '@/assets/westmed-logo.png';

const Auth = () => {
  const [staffLoading, setStaffLoading] = useState(false);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [staffData, setStaffData] = useState({ username: '', password: '' });
  const [doctorData, setDoctorData] = useState({ doctorCode: '', password: '' });
  const [adminData, setAdminData] = useState({ email: '', password: '' });
  
  const { signInWithUsername, signInWithEmail, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

  const handleAdminMagicLink = async () => {
    if (!adminData.email) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Enter your admin email first.' });
      return;
    }
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signInWithOtp({
        email: adminData.email,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error) throw error;
      toast({ title: 'Magic link sent', description: 'Check your inbox to sign in.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Magic link failed', description: err?.message || 'Could not send magic link.' });
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
                    Use your username and password provided by admin
                  </p>
                </div>
                
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
              </TabsContent>
              
              <TabsContent value="doctor" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Doctor Login</h2>
                  <p className="text-sm text-muted-foreground">
                    Sign in with your doctor code and password
                  </p>
                </div>
                
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
              </TabsContent>
              
              <TabsContent value="admin" className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold mb-2">Administrator Login</h2>
                  <p className="text-sm text-muted-foreground">
                    Sign in with your admin email and password
                  </p>
                </div>
                
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="Enter your admin email"
                      value={adminData.email}
                      onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                      required
                    />
                  </div>
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
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <button type="button" onClick={handleAdminResetPassword} className="underline hover:opacity-80">
                      Forgot password?
                    </button>
                    <button type="button" onClick={handleAdminMagicLink} className="underline hover:opacity-80">
                      Send magic link
                    </button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;