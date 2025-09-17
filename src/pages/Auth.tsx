import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, LogIn, Shield } from 'lucide-react';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [staffData, setStaffData] = useState({ username: '', password: '' });
  const [adminData, setAdminData] = useState({ email: '', password: '' });
  
  const { signInWithUsername, signInWithEmail, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
    
    setIsLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-full">
              <Stethoscope className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">WestMed Hospital</h1>
          <p className="text-muted-foreground">Hospital Management System</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="staff" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Hospital Staff
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
                    <Label htmlFor="staff-username">Username/Doctor Code</Label>
                    <Input
                      id="staff-username"
                      type="text"
                      placeholder="Enter your username or doctor code"
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In as Staff'}
                  </Button>
                </form>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Demo Credentials:</strong>
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Staff:</strong> nurse1 / password123</p>
                    <p><strong>Doctor:</strong> DOC0001 / password123</p>
                    <p><strong>Manager:</strong> sarah.manager / password123</p>
                  </div>
                </div>
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing In...' : 'Sign In as Admin'}
                  </Button>
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