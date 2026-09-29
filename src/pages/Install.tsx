import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Wifi, Bell, Zap } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'sonner';
import westmedLogo from '@/assets/westmed-logo.png';

const Install = () => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      toast.success('App installed successfully!');
    } else if (!isInstallable) {
      toast.info('Open this page in your browser to install the app');
    }
  };

  const features = [
    { icon: Zap, title: 'Fast & Responsive', description: 'Lightning-fast performance on any device' },
    { icon: Wifi, title: 'Works Offline', description: 'Access key features without internet' },
    { icon: Bell, title: 'Notifications', description: 'Stay updated with important alerts' },
    { icon: Smartphone, title: 'Home Screen', description: 'Launch instantly from your home screen' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Header */}
        <div className="text-center space-y-4">
          <img 
            src={westmedLogo} 
            alt="WestMed Payroll System" 
            className="h-20 mx-auto"
          />
          <div>
            <h1 className="text-2xl font-bold">WestMed Payroll System</h1>
            <p className="text-muted-foreground">Payment Management System</p>
          </div>
        </div>

        {/* Install Card */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {isInstalled ? (
                <>
                  <Check className="h-5 w-5 text-green-500" />
                  App Installed
                </>
              ) : (
                <>
                  <Download className="h-5 w-5" />
                  Install App
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isInstalled 
                ? 'WestMed Payroll is already installed on your device'
                : 'Install WestMed Payroll for the best experience'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isInstalled ? (
              <div className="text-center text-sm text-muted-foreground">
                <p>You can launch the app from your home screen.</p>
                <Button 
                  variant="outline" 
                  className="mt-4 w-full"
                  onClick={() => window.location.href = '/'}
                >
                  Open App
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={handleInstall} 
                  className="w-full"
                  size="lg"
                  disabled={!isInstallable}
                >
                  <Download className="h-5 w-5 mr-2" />
                  {isInstallable ? 'Install Now' : 'Open in Browser to Install'}
                </Button>
                
                {!isInstallable && (
                  <div className="text-xs text-muted-foreground text-center space-y-2">
                    <p className="font-medium">How to install:</p>
                    <div className="text-left space-y-1 bg-muted/50 p-3 rounded-md">
                      <p><strong>Android:</strong> Tap the menu (⋮) → "Add to Home Screen"</p>
                      <p><strong>iPhone:</strong> Tap Share → "Add to Home Screen"</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature) => (
            <Card key={feature.title} className="p-3">
              <div className="flex flex-col items-center text-center gap-2">
                <feature.icon className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Continue to Web */}
        <div className="text-center">
          <Button variant="link" onClick={() => window.location.href = '/'}>
            Continue to web version →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Install;
