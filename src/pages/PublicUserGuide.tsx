import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  ArrowLeft, 
  FileDown, 
  BookOpen, 
  Users, 
  CreditCard, 
  FileText, 
  Calendar, 
  MessageSquare,
  Shield,
  UserCheck,
  Stethoscope,
  ClipboardList,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Smartphone,
  LogIn
} from "lucide-react";
import { jsPDF } from "jspdf";
import { downloadFile } from "@/lib/fileDownload";
import { formatFileTimestampIST } from "@/lib/dateUtils";
import { useUserGuideSettings } from "@/hooks/useUserGuideSettings";
import westmedLogo from "@/assets/westmed-logo.png";
import westmedBanner from "@/assets/westmed-banner.png";

const PublicUserGuide: React.FC = () => {
  const navigate = useNavigate();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { data: settings } = useUserGuideSettings();

  // Default FAQ items if settings not loaded
  const defaultFAQs = [
    {
      question: "How do I sign in to the system?",
      answer: "Enter your registered email address and click 'Send 6-Digit OTP'. Check your email for the code and enter it to sign in."
    },
    {
      question: "Why do I get logged out automatically?",
      answer: "For security, the system logs you out after 3 minutes (staff) or 5 minutes (managers/admins) of inactivity. This protects patient data."
    },
    {
      question: "How do I install the app on my phone?",
      answer: "On the sign-in page, click 'Install WestMed App'. On Android, you may see 'Add to Home Screen'. On iOS Safari, tap Share > Add to Home Screen."
    },
    {
      question: "Who do I contact for technical support?",
      answer: "Contact the IT Help Desk during office hours (9 AM - 6 PM, Mon-Sat). For urgent issues, contact your department manager."
    },
    {
      question: "How do doctors record patient visits?",
      answer: "Doctors can access the Visit Management screen to record patient visits, including patient name, visit reason, and payment details."
    },
    {
      question: "What is the Bank Advice feature?",
      answer: "Bank Advice generates payment instruction files (GEFU format) for bank transfers. Only admin-approved payments can be included in bank advice."
    }
  ];

  const faqItems = settings?.faq_items?.length ? settings.faq_items : defaultFAQs;
  const helpContact = settings?.help_desk_contact || "+91 XXXXX XXXXX";
  const helpEmail = settings?.help_desk_email || "support@westmedhospital.com";
  const helpHours = settings?.help_desk_hours || "9 AM - 6 PM, Mon-Sat";

  const roleDescriptions = [
    {
      role: "Admin",
      icon: Shield,
      color: "text-red-600",
      bgColor: "bg-red-50",
      description: "Full system access. Manages users, approves payments, generates bank advice, and configures system settings."
    },
    {
      role: "Manager",
      icon: UserCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Manages staff and doctors. Reviews and approves payments. Creates payment periods and generates reports."
    },
    {
      role: "Doctor",
      icon: Stethoscope,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Records patient visits. Views payment history and approved payments. Updates personal profile and bank details."
    },
    {
      role: "Staff",
      icon: ClipboardList,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Performs assigned tasks. Applies for leave/permission. Views announcements and team communications."
    }
  ];

  const keyFeatures = [
    {
      title: "Visit Management",
      icon: Calendar,
      description: "Record and track patient visits with payment details. Supports cash, insurance, and card payments. Auto-generates visit codes per financial year."
    },
    {
      title: "Payment Management",
      icon: CreditCard,
      description: "Create payment periods, track visit-based payments, and manage partial payments. Separate approval workflows for cash and insurance payments."
    },
    {
      title: "Bank Advice Generation",
      icon: FileText,
      description: "Generate GEFU format bank transfer files for approved payments. Supports NEFT, RTGS, and IMPS. Includes TDS calculations and reconciliation tracking."
    },
    {
      title: "Reports & Exports",
      icon: FileDown,
      description: "Generate doctor payment history, TDS reports, and visit summaries. Export to Excel with detailed breakdowns and financial year filtering."
    },
    {
      title: "Task Management",
      icon: ClipboardList,
      description: "Managers can assign tasks to staff with priorities and due dates. Staff can track task progress and mark completion."
    },
    {
      title: "Team Communication",
      icon: MessageSquare,
      description: "Real-time team chat for internal communication. Role-based visibility with message history and notifications."
    }
  ];

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;

      // Helper function for text wrapping
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number => {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * lineHeight);
      };

      // Helper to check page break
      const checkPageBreak = (neededHeight: number): void => {
        if (yPos + neededHeight > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
      };

      // Sanitize text for PDF (replace special characters)
      const sanitize = (text: string): string => {
        return text
          .replace(/₹/g, 'Rs.')
          .replace(/–/g, '-')
          .replace(/'/g, "'")
          .replace(/"/g, '"')
          .replace(/"/g, '"');
      };

      // ========== COVER PAGE ==========
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('WestMed Hospital', pageWidth / 2, 60, { align: 'center' });
      
      doc.setFontSize(20);
      doc.setFont('helvetica', 'normal');
      doc.text('User Guide', pageWidth / 2, 75, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('Hospital Management System', pageWidth / 2, 90, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      })}`, pageWidth / 2, 110, { align: 'center' });

      doc.setTextColor(0);

      // ========== TABLE OF CONTENTS ==========
      doc.addPage();
      yPos = margin;
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Table of Contents', margin, yPos);
      yPos += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const tocItems = [
        '1. Overview',
        '2. Getting Started',
        '3. User Roles & Permissions',
        '4. Key Features',
        '5. Frequently Asked Questions',
        '6. Help & Support'
      ];
      tocItems.forEach(item => {
        doc.text(item, margin, yPos);
        yPos += 8;
      });

      // ========== OVERVIEW ==========
      doc.addPage();
      yPos = margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Overview', margin, yPos);
      yPos += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const overviewText = sanitize(`WestMed Hospital Management System is a comprehensive healthcare administration platform designed for efficient hospital operations. The system manages patient visits, doctor payments, staff activities, and financial workflows including TDS calculations and bank transfers.

Key capabilities include:
- Secure OTP-based authentication
- Role-based access control
- Patient visit recording and tracking
- Multi-stage payment approval workflows
- Bank advice generation (GEFU format)
- Comprehensive reporting and exports
- Leave and permission management
- Team communication tools`);
      
      yPos = addWrappedText(overviewText, margin, yPos, pageWidth - (margin * 2), 5);

      // ========== GETTING STARTED ==========
      yPos += 15;
      checkPageBreak(60);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('2. Getting Started', margin, yPos);
      yPos += 12;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('How to Sign In:', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const signInSteps = [
        '1. Open the WestMed Hospital app or website',
        '2. Enter your registered email address',
        '3. Click "Send 6-Digit OTP"',
        '4. Check your email for the verification code',
        '5. Enter the 6-digit code to complete sign-in'
      ];
      signInSteps.forEach(step => {
        doc.text(step, margin + 5, yPos);
        yPos += 7;
      });

      yPos += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Installing the App:', margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const installSteps = [
        '- On the sign-in page, click "Install WestMed App"',
        '- Android: Follow the prompt or look for "Add to Home Screen"',
        '- iOS: In Safari, tap Share icon > "Add to Home Screen"',
        '- The app works offline for viewing cached data'
      ];
      installSteps.forEach(step => {
        doc.text(step, margin + 5, yPos);
        yPos += 7;
      });

      // ========== USER ROLES ==========
      doc.addPage();
      yPos = margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('3. User Roles & Permissions', margin, yPos);
      yPos += 12;

      roleDescriptions.forEach(role => {
        checkPageBreak(30);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(role.role, margin, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPos = addWrappedText(sanitize(role.description), margin + 5, yPos, pageWidth - (margin * 2) - 5, 5);
        yPos += 8;
      });

      // ========== KEY FEATURES ==========
      doc.addPage();
      yPos = margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('4. Key Features', margin, yPos);
      yPos += 12;

      keyFeatures.forEach(feature => {
        checkPageBreak(35);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(feature.title, margin, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPos = addWrappedText(sanitize(feature.description), margin + 5, yPos, pageWidth - (margin * 2) - 5, 5);
        yPos += 10;
      });

      // ========== FAQ ==========
      doc.addPage();
      yPos = margin;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('5. Frequently Asked Questions', margin, yPos);
      yPos += 12;

      faqItems.forEach((faq, index) => {
        checkPageBreak(40);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Q${index + 1}: ${sanitize(faq.question)}`, margin, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPos = addWrappedText(sanitize(faq.answer), margin + 5, yPos, pageWidth - (margin * 2) - 5, 5);
        yPos += 10;
      });

      // ========== HELP & SUPPORT ==========
      checkPageBreak(50);
      yPos += 10;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('6. Help & Support', margin, yPos);
      yPos += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Phone: ${helpContact}`, margin, yPos);
      yPos += 7;
      doc.text(`Email: ${helpEmail}`, margin, yPos);
      yPos += 7;
      doc.text(`Hours: ${helpHours}`, margin, yPos);
      yPos += 15;

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text('For urgent technical issues, please contact your department manager.', margin, yPos);

      // Generate filename and download
      const filename = `WestMed_User_Guide_${formatFileTimestampIST()}.pdf`;
      const pdfBlob = doc.output('blob');
      
      await downloadFile(pdfBlob, filename, 'application/pdf');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${westmedBanner})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={westmedLogo} alt="WestMed" className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">User Guide</h1>
              <p className="text-xs text-muted-foreground">WestMed Hospital</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generatePDF}
              disabled={isGeneratingPDF}
            >
              <FileDown className={`h-4 w-4 mr-1 ${isGeneratingPDF ? 'animate-pulse' : ''}`} />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Welcome to WestMed Hospital Management System
            </CardTitle>
            <CardDescription>
              A comprehensive healthcare administration platform for efficient hospital operations
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              WestMed Hospital Management System streamlines hospital administration with secure, 
              role-based access for doctors, managers, and staff. The system handles patient visits, 
              payment processing, bank transfers, and team collaboration.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                <CheckCircle className="h-3 w-3" /> Secure OTP Login
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                <CheckCircle className="h-3 w-3" /> Role-Based Access
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                <CheckCircle className="h-3 w-3" /> Mobile Friendly
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" /> How to Sign In
              </h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
                <li>Open the WestMed Hospital app or website</li>
                <li>Enter your registered email address</li>
                <li>Click "Send 6-Digit OTP"</li>
                <li>Check your email for the verification code</li>
                <li>Enter the 6-digit code to complete sign-in</li>
              </ol>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Installing the App
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-2">
                <li>• On the sign-in page, click "Install WestMed App"</li>
                <li>• <strong>Android:</strong> Follow the prompt or look for "Add to Home Screen"</li>
                <li>• <strong>iOS:</strong> In Safari, tap Share → "Add to Home Screen"</li>
                <li>• The app works offline for viewing cached data</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Roles & Permissions
            </CardTitle>
            <CardDescription>
              Each role has specific access levels and capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roleDescriptions.map((role) => (
                <div 
                  key={role.role} 
                  className={`p-3 rounded-lg border ${role.bgColor}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <role.icon className={`h-5 w-5 ${role.color}`} />
                    <h4 className={`font-medium ${role.color}`}>{role.role}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Features Accordion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {keyFeatures.map((feature, index) => (
                <AccordionItem key={index} value={`feature-${index}`}>
                  <AccordionTrigger className="text-sm hover:no-underline">
                    <span className="flex items-center gap-2">
                      <feature.icon className="h-4 w-4 text-primary" />
                      {feature.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {feature.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* FAQ Accordion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-sm text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Help & Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Help & Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{helpContact}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium break-all">{helpEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="text-sm font-medium">{helpHours}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              For urgent technical issues, please contact your department manager.
            </p>
          </CardContent>
        </Card>

        {/* Back to Sign In Button - Mobile */}
        <div className="pb-6">
          <Button 
            className="w-full"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </div>
      </main>
    </div>
  );
};

export default PublicUserGuide;
