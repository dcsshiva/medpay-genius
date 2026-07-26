import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import Layout from '@/components/Layout';
import { LoadingScreen } from '@/components/ui/loading-skeleton';
import ForceUpdateGate from '@/components/ForceUpdateGate';

// Lazy-loaded components
const Dashboard = lazy(() => import('@/components/Dashboard'));
const MasterDataManagement = lazy(() => import('@/components/MasterDataManagement'));
const DoctorManagement = lazy(() => import('@/components/DoctorManagement'));
const VisitManagement = lazy(() => import('@/components/VisitManagement'));
const CashPaymentManagement = lazy(() => import('@/components/CashPaymentManagement'));
const InsurancePaymentManagement = lazy(() => import('@/components/InsurancePaymentManagement'));
const CashPaymentLite = lazy(() => import('@/components/CashPaymentLite'));
const InsurancePaymentLite = lazy(() => import('@/components/InsurancePaymentLite'));
const PaymentManagement = lazy(() => import('@/components/PaymentManagement'));
const StaffManagement = lazy(() => import('@/components/StaffManagement'));
const TaskManagement = lazy(() => import('@/components/TaskManagement'));
const StaffAppraisalManagement = lazy(() => import('@/components/StaffAppraisalManagement'));
const StaffManagementDashboard = lazy(() => import('@/components/StaffManagementDashboard'));
const TeamChat = lazy(() => import('@/components/TeamChat'));
const ComplaintManagement = lazy(() => import('@/components/ComplaintManagement'));
const UserLoginReports = lazy(() => import('@/components/UserLoginReports'));
const Settings = lazy(() => import('@/components/Settings'));
const VersionManager = lazy(() => import('@/components/VersionManager'));
const WebsiteSettings = lazy(() => import('@/components/WebsiteSettings').then(m => ({ default: m.WebsiteSettings })));
const UserGuide = lazy(() => import('@/pages/UserGuide'));
const TDSCertificateGenerator = lazy(() => import('@/components/TDSCertificateGenerator').then(m => ({ default: m.TDSCertificateGenerator })));
const TDSReportsManagement = lazy(() => import('@/components/TDSReportsManagement').then(m => ({ default: m.TDSReportsManagement })));
const BankAdvicePaymentReport = lazy(() => import('@/components/BankAdvicePaymentReport'));
const LeavePermissionManagement = lazy(() => import('@/components/leave-permission/LeavePermissionManagement'));
const ApprovalManagement = lazy(() => import('@/components/leave-permission/ApprovalManagement'));
const QuickPaymentManagement = lazy(() => import('@/components/QuickPaymentManagement'));
const QuickPaymentBankAdviceReport = lazy(() => import('@/components/QuickPaymentBankAdviceReport'));
const BankAdviceGeneration = lazy(() => import('@/components/BankAdviceGeneration'));
const BankAdviceGenerationBeta = lazy(() => import('@/components/BankAdviceGenerationBeta'));
const BankAdviceReport = lazy(() => import('@/components/BankAdviceReport'));
const BankAdviceReports = lazy(() => import('@/components/BankAdviceReports'));
const DoctorHub = lazy(() => import('@/components/DoctorHub'));
const NavigationAnalytics = lazy(() => import('@/components/NavigationAnalytics'));
const StaffMobileDashboard = lazy(() => import('@/components/StaffMobileDashboard'));
const ChatbotKnowledgeBase = lazy(() => import('@/components/ChatbotKnowledgeBase'));
const StaffAttendanceManagement = lazy(() => import('@/components/StaffAttendanceManagement'));
const AuditTrailViewer = lazy(() => import('@/components/AuditTrailViewer'));
const VendorPaymentReports = lazy(() => import('@/components/VendorPaymentReports'));
const QuickPaymentReport = lazy(() => import('@/components/QuickPaymentReport'));
const StaffSalaryStructure = lazy(() => import('@/components/StaffSalaryStructure'));
const StaffPayrollGeneration = lazy(() => import('@/components/StaffPayrollGeneration'));

const Index = () => {
  const { user, loading, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(undefined);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'cash' | 'insurance' | 'mixed'>('all');

  // Handle navigation from location state and URL parameters
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    
    if (view === 'doctor' || view === 'doctor-hub') {
      setActiveTab('doctor-hub');
    } else if (view === 'staff') {
      setActiveTab('staff-dashboard');
    } else if (view === 'admin' || view === 'manager' || view === 'staff') {
      setActiveTab('doctor-hub');
    }
  }, [location.state, location.search, navigate, location.pathname]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user) {
      if (window.location.pathname === '/') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  // Automatically redirect users to their role-appropriate dashboard
  useEffect(() => {
    if (loading || !userProfile) return;
    
    const role = userProfile.role || userProfile.designation;
    const userType = userProfile.user_type;
    
    if (activeTab !== 'dashboard') return;
    
    if (userType === 'doctor' || role === 'doctor') {
      setActiveTab('doctor-hub');
      return;
    }
    
    // Admin/Manager/Super admin land on the main Dashboard, not Doctor Hub.

    
    if (role && ['staff', 'nurse'].includes(role) && isMobile) {
      setActiveTab('staff-dashboard');
      return;
    }
  }, [userProfile, loading, activeTab, isMobile]);

  const handleTabChange = (params: string | { tab: string; subTab?: string; paymentTypeFilter?: 'all' | 'cash' | 'insurance' | 'mixed' }) => {
    if (typeof params === 'string') {
      setActiveTab(params);
      setActiveSubTab(undefined);
      setPaymentTypeFilter('all');
    } else {
      setActiveTab(params.tab);
      setActiveSubTab(params.subTab);
      setPaymentTypeFilter(params.paymentTypeFilter || 'all');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard onTabChange={handleTabChange} />;
        case 'staff':
          return <StaffManagement />;
        case 'masters':
          return <MasterDataManagement />;
        case 'doctors':
          return <DoctorManagement />;
        case 'visits':
          return <VisitManagement initialSubTab={activeSubTab} />;
        case 'cash-payments':
          return <CashPaymentManagement />;
        case 'cash-payments-lite':
          return <CashPaymentLite />;
        case 'insurance-payments':
          return <InsurancePaymentManagement />;
        case 'insurance-payments-lite':
          return <InsurancePaymentLite />;
        case 'payments':
          return <PaymentManagement initialSubTab={activeSubTab} initialPaymentTypeFilter={paymentTypeFilter} />;
        case 'tasks':
          return <TaskManagement />;
        case 'appraisals':
          return <StaffManagementDashboard />;
        case 'complaints':
          return <ComplaintManagement />;
        case 'login-reports':
          return <UserLoginReports />;
        case 'chat':
          return <TeamChat />;
        case 'version':
          return <VersionManager />;
        case 'website-settings':
          return <WebsiteSettings />;
        case 'user-guide':
          return <UserGuide />;
        case 'tds-reports':
          return <TDSReportsManagement />;
        case 'bank-advice-payment-report':
          return <BankAdvicePaymentReport />;
        case 'quick-payment':
          return <QuickPaymentManagement />;
        case 'quick-payment-bank-advice-report':
          return <QuickPaymentBankAdviceReport />;
        case 'bank-advice-generation':
          return <BankAdviceGeneration />;
        case 'bank-advice-generation-beta':
          return <BankAdviceGenerationBeta />;
        case 'bank-advice-history':
          return <BankAdviceReports />;
        case 'bank-advice-records':
          return <BankAdviceReport />;
        case 'doctor-hub': {
          const isDoctorUser = userProfile?.user_type === 'doctor' || userProfile?.role === 'doctor';
          return <DoctorHub filterDoctorId={isDoctorUser ? userProfile?.id : undefined} />;
        }
        case 'leave-permission':
          return <LeavePermissionManagement />;
        case 'leave-approvals':
          return <ApprovalManagement />;
        case 'navigation-analytics':
          return <NavigationAnalytics />;
        case 'staff-dashboard':
          return <StaffMobileDashboard onNavigate={handleTabChange} />;
        case 'ai-knowledge-base':
          return <ChatbotKnowledgeBase />;
        case 'attendance':
          return <StaffAttendanceManagement />;
        case 'vendor-reports':
          return <VendorPaymentReports />;
        case 'quick-payment-report':
          return <QuickPaymentReport />;
        case 'audit-trail':
          return <AuditTrailViewer />;
        case 'payroll':
          return (
            <Tabs defaultValue="payroll" className="space-y-4">
              <TabsList>
                <TabsTrigger value="salary">Salary Structure</TabsTrigger>
                <TabsTrigger value="payroll">Payroll</TabsTrigger>
              </TabsList>
              <TabsContent value="salary"><StaffSalaryStructure /></TabsContent>
              <TabsContent value="payroll"><StaffPayrollGeneration /></TabsContent>
            </Tabs>
          );
        case 'settings':
          return <Settings />;
        default:
          return <Dashboard onTabChange={handleTabChange} />;
      }
    })();

    return (
      <Suspense fallback={<LoadingScreen message="Loading module..." />}>
        {content}
      </Suspense>
    );
  };

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      <ForceUpdateGate />
      {renderContent()}
    </Layout>
  );
};

export default Index;
