import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Stethoscope, LogIn } from 'lucide-react';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  
  const { signInWithUsername, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signInWithUsername(loginData.username, loginData.password);
    
    if (error) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message,
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
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
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold flex items-center justify-center gap-2 mb-2">
                <LogIn className="h-5 w-5" />
                Hospital Staff Login
              </h2>
              <p className="text-sm text-muted-foreground">
                Use your username and password provided by admin
              </p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username/Doctor Code</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username or doctor code"
                  value={loginData.username}
                  onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Demo Credentials:</strong>
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Staff:</strong> nurse1 / password123</p>
            <p><strong>Doctor:</strong> DOC0001 / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;