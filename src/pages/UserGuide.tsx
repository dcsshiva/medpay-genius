import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useUserGuideSettings } from "@/hooks/useUserGuideSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  BookOpen, Search, Home, Users, Stethoscope, Calendar, CreditCard, 
  ClipboardList, MessageSquare, FileText, Settings, Phone, Mail, Clock,
  Info, AlertCircle, CheckCircle, HelpCircle, Printer
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { roleBasedExamples, getFieldDescription, sampleNames } from "@/lib/userGuideUtils";

export default function UserGuide() {
  const { user } = useAuth();
  const { data: guideSettings } = useUserGuideSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRole, setActiveRole] = useState(user?.role || "staff");

  const welcomeMessage = useMemo(() => {
    if (!guideSettings) return "";
    const roleMap = {
      admin: guideSettings.welcome_message_admin,
      manager: guideSettings.welcome_message_manager,
      doctor: guideSettings.welcome_message_doctor,
      staff: guideSettings.welcome_message_staff
    };
    return roleMap[activeRole as keyof typeof roleMap] || "";
  }, [guideSettings, activeRole]);

  // Quick navigation items based on role
  const getQuickNav = () => {
    const common = [
      { id: "overview", label: "Overview", icon: Home },
      { id: "getting-started", label: "Getting Started", icon: BookOpen },
      { id: "faq", label: "FAQ", icon: HelpCircle },
      { id: "support", label: "Help & Support", icon: Phone }
    ];

    const roleSpecific: Record<string, typeof common> = {
      admin: [
        { id: "staff-mgmt", label: "Staff Management", icon: Users },
        { id: "doctor-mgmt", label: "Doctor Management", icon: Stethoscope },
        { id: "payment-mgmt", label: "Payment Management", icon: CreditCard },
        { id: "system-settings", label: "System Settings", icon: Settings }
      ],
      manager: [
        { id: "staff-mgmt", label: "Staff Management", icon: Users },
        { id: "task-mgmt", label: "Task Management", icon: ClipboardList },
        { id: "payment-approval", label: "Payment Approval", icon: CreditCard },
        { id: "reports", label: "Reports", icon: FileText }
      ],
      doctor: [
        { id: "visit-recording", label: "Recording Visits", icon: Calendar },
        { id: "payment-tracking", label: "Payment Tracking", icon: CreditCard },
        { id: "profile", label: "Profile Management", icon: Settings }
      ],
      staff: [
        { id: "tasks", label: "My Tasks", icon: ClipboardList },
        { id: "complaints", label: "Complaints", icon: MessageSquare },
        { id: "chat", label: "Team Chat", icon: MessageSquare }
      ]
    };

    return [...common, ...(roleSpecific[activeRole] || [])];
  };

  const quickNavItems = getQuickNav();

  // Mobile Navigation
  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="lg" className="w-full md:hidden mb-4">
          <BookOpen className="h-5 w-5 mr-2" />
          Navigate Guide
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <div className="space-y-4 py-4">
          <h2 className="text-lg font-semibold">Guide Navigation</h2>
          <div className="space-y-2">
            {quickNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Desktop Sidebar
  const DesktopNav = () => (
    <aside className="hidden md:block w-64 border-r bg-muted/30 p-6 sticky top-0 h-screen overflow-y-auto">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Quick Navigation
      </h2>
      <nav className="space-y-2">
        {quickNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10 no-print">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Hospital Admin User Guide</h1>
                <p className="text-sm text-muted-foreground">Complete documentation and tutorials</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.print()} className="no-print">
              <Printer className="h-4 w-4 mr-2" />
              Print Guide
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <DesktopNav />

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-4 md:px-6 py-6 max-w-5xl">
          <MobileNav />

          {/* Role Selector */}
          <Card className="mb-6 no-print">
            <CardHeader>
              <CardTitle>Select Your Role</CardTitle>
              <CardDescription>View guide content specific to your role</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeRole} onValueChange={setActiveRole}>
                <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                  <TabsTrigger value="manager">Manager</TabsTrigger>
                  <TabsTrigger value="doctor">Doctor</TabsTrigger>
                  <TabsTrigger value="staff">Staff</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>

          {/* Announcement */}
          {guideSettings?.show_announcement && guideSettings.announcement_text && (
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertDescription>{guideSettings.announcement_text}</AlertDescription>
            </Alert>
          )}

          {/* Welcome Message */}
          <Card id="overview" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Welcome, {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{welcomeMessage}</p>
            </CardContent>
          </Card>

          {/* Getting Started */}
          <Card id="getting-started" className="mb-6">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Quick Start Checklist
                </h3>
                <ul className="space-y-2 ml-6 list-disc text-muted-foreground">
                  {activeRole === "admin" && (
                    <>
                      <li>Review system settings and configure hospital information</li>
                      <li>Create staff accounts (use Excel import for bulk creation)</li>
                      <li>Add doctors with their specializations and bank details</li>
                      <li>Configure payment approval workflows</li>
                      <li>Set up user roles and permissions</li>
                    </>
                  )}
                  {activeRole === "manager" && (
                    <>
                      <li>Review your team members and their roles</li>
                      <li>Create and assign tasks to staff</li>
                      <li>Monitor visit records and prepare payment periods</li>
                      <li>Review and approve doctor payments</li>
                      <li>Generate reports for management review</li>
                    </>
                  )}
                  {activeRole === "doctor" && (
                    <>
                      <li>Familiarize yourself with the visit recording interface</li>
                      <li>Learn about payment types (cash, card, insurance, UPI)</li>
                      <li>Record patient visits daily with accurate details</li>
                      <li>Track your payment history and pending amounts</li>
                      <li>Update your profile and bank account information</li>
                    </>
                  )}
                  {activeRole === "staff" && (
                    <>
                      <li>Check your assigned tasks in the Task Management section</li>
                      <li>Update task status as you make progress</li>
                      <li>Use Team Chat for quick communication</li>
                      <li>Report issues through the Complaints system</li>
                      <li>Keep your profile information up to date</li>
                    </>
                  )}
                </ul>
              </div>

              {/* Sample Data Examples */}
              {roleBasedExamples[activeRole as keyof typeof roleBasedExamples] && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Sample Data Format</h3>
                  <Card className="bg-muted">
                    <CardContent className="pt-4">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(roleBasedExamples[activeRole as keyof typeof roleBasedExamples]?.sampleData || {}, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role-Specific Features */}
          {activeRole === "admin" && (
            <Card id="staff-mgmt" className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Staff accounts require unique usernames and staff codes. Use Excel import for bulk operations.
                  </AlertDescription>
                </Alert>

                <Accordion type="single" collapsible>
                  <AccordionItem value="excel-import">
                    <AccordionTrigger>Excel Import - Step by Step</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <ol className="list-decimal ml-6 space-y-2 text-sm">
                        <li>Click "Download Template" to get the Excel file</li>
                        <li>The first row contains sample data (DO NOT MODIFY)</li>
                        <li>Add your staff data starting from row 3</li>
                        <li>Required fields: username, full_name, role</li>
                        <li>Optional: staff_code (auto-generated if blank)</li>
                        <li>Save and upload the file</li>
                        <li>Review any validation errors shown</li>
                      </ol>
                      <div className="bg-muted p-3 rounded-md">
                        <p className="text-xs font-mono">
                          Example staff codes: ADM001, NRS001, REC001
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="roles">
                    <AccordionTrigger>Available Staff Roles</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge>admin</Badge>
                          <span className="text-sm">Full system access, can manage all users</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">manager</Badge>
                          <span className="text-sm">Manage staff, approve payments, assign tasks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">nurse</Badge>
                          <span className="text-sm">Handle patient care tasks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">receptionist</Badge>
                          <span className="text-sm">Front desk operations</span>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}

          {activeRole === "doctor" && (
            <Card id="visit-recording" className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recording Patient Visits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Visit Information Fields</h3>
                  <div className="space-y-3">
                    <div className="border-l-4 border-primary pl-3">
                      <p className="font-medium">Patient Name <Badge variant="destructive">Required</Badge></p>
                      <p className="text-sm text-muted-foreground">Full name of the patient (e.g., {sampleNames.patients[0]})</p>
                    </div>
                    <div className="border-l-4 border-primary pl-3">
                      <p className="font-medium">Visit Payment <Badge variant="destructive">Required</Badge></p>
                      <p className="text-sm text-muted-foreground">Amount in rupees (e.g., 500, 1000)</p>
                    </div>
                    <div className="border-l-4 border-primary pl-3">
                      <p className="font-medium">Payment Type <Badge variant="destructive">Required</Badge></p>
                      <p className="text-sm text-muted-foreground">Options: cash, card, insurance, upi</p>
                    </div>
                    <div className="border-l-4 border-primary pl-3">
                      <p className="font-medium">Visit Reason <Badge variant="destructive">Required</Badge></p>
                      <p className="text-sm text-muted-foreground">Options: regular_checkup, emergency, follow_up, consultation</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Visits are automatically included in payment calculations when managers create payment periods.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* FAQ Section */}
          <Card id="faq" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {guideSettings?.faq_items?.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent>{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
                
                {/* Default FAQs */}
                <AccordionItem value="password-reset">
                  <AccordionTrigger>How do I reset my password?</AccordionTrigger>
                  <AccordionContent>
                    Contact your system administrator to reset your password. For security reasons, only admins can update passwords.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="session-timeout">
                  <AccordionTrigger>Why do I get logged out automatically?</AccordionTrigger>
                  <AccordionContent>
                    For security, sessions expire after 3 minutes of inactivity for staff/doctors and 5 minutes for admin/managers. 
                    You'll receive a warning 30 seconds before timeout.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Help & Support */}
          <Card id="support" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Help & Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <Phone className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Phone Support</h3>
                    <p className="text-sm text-muted-foreground">
                      {guideSettings?.help_desk_contact || "+91 1234567890"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <Mail className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Email Support</h3>
                    <p className="text-sm text-muted-foreground">
                      {guideSettings?.help_desk_email || "support@westmedhospital.com"}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-muted">
                  <CardContent className="pt-6">
                    <Clock className="h-8 w-8 text-primary mb-2" />
                    <h3 className="font-semibold mb-1">Support Hours</h3>
                    <p className="text-sm text-muted-foreground">
                      {guideSettings?.help_desk_hours || "Mon-Sat: 9 AM - 6 PM"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
