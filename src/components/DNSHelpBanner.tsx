import React, { useEffect, useState, useCallback } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { checkSupabaseReachable } from "@/lib/connectivityCheck";

const DNSHelpBanner: React.FC = () => {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = useCallback(async () => {
    setChecking(true);
    const ok = await checkSupabaseReachable();
    setReachable(ok);
    setChecking(false);
  }, []);

  useEffect(() => {
    runCheck();
    // Re-check every 30s while unreachable
    const interval = setInterval(async () => {
      const ok = await checkSupabaseReachable();
      setReachable(ok);
    }, 30000);
    return () => clearInterval(interval);
  }, [runCheck]);

  // Don't show anything while first check is running or if reachable
  if (reachable === null || reachable === true) return null;

  return (
    <Alert className="mb-4 border-destructive/60 bg-destructive/10 text-foreground">
      <WifiOff className="h-5 w-5 text-destructive" />
      <AlertTitle className="text-base font-semibold">
        Connection Issue Detected
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          Unable to reach the server. This is likely caused by your Internet provider's DNS settings.
          Changing your device's DNS to a public DNS (like Google or Cloudflare) usually fixes this.
        </p>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-muted px-2 py-1 font-mono">Google: 8.8.8.8</span>
          <span className="rounded bg-muted px-2 py-1 font-mono">Cloudflare: 1.1.1.1</span>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="android">
            <AccordionTrigger className="text-sm py-2">📱 Android</AccordionTrigger>
            <AccordionContent className="text-xs space-y-1">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open <b>Settings → Network & Internet → Private DNS</b></li>
                <li>Select <b>"Private DNS provider hostname"</b></li>
                <li>Enter <code className="bg-muted px-1 rounded">dns.google</code> (or <code className="bg-muted px-1 rounded">one.one.one.one</code>)</li>
                <li>Tap <b>Save</b> and retry login</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="iphone">
            <AccordionTrigger className="text-sm py-2">📱 iPhone / iPad</AccordionTrigger>
            <AccordionContent className="text-xs space-y-1">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open <b>Settings → Wi-Fi</b> → tap the <b>(i)</b> on your connected network</li>
                <li>Scroll to <b>DNS</b> → tap <b>Configure DNS → Manual</b></li>
                <li>Remove existing servers, add <code className="bg-muted px-1 rounded">8.8.8.8</code> and <code className="bg-muted px-1 rounded">8.8.4.4</code></li>
                <li>Tap <b>Save</b> and retry login</li>
              </ol>
              <p className="mt-1 text-muted-foreground">For mobile data: install the <b>1.1.1.1</b> app from the App Store and enable it.</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="windows">
            <AccordionTrigger className="text-sm py-2">💻 Windows</AccordionTrigger>
            <AccordionContent className="text-xs space-y-1">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Open <b>Settings → Network & Internet → Change adapter options</b></li>
                <li>Right-click your active connection → <b>Properties</b></li>
                <li>Select <b>Internet Protocol Version 4 (TCP/IPv4)</b> → <b>Properties</b></li>
                <li>Choose <b>"Use the following DNS server addresses"</b></li>
                <li>Preferred: <code className="bg-muted px-1 rounded">8.8.8.8</code> — Alternate: <code className="bg-muted px-1 rounded">8.8.4.4</code></li>
                <li>Click <b>OK</b> and retry login</li>
              </ol>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={runCheck}
          disabled={checking}
        >
          {checking ? (
            <>
              <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
              Checking…
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Retry Connection
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default DNSHelpBanner;
