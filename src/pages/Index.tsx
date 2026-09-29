import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useIsMobile } from '@/hooks/use-mobile';
import Layout from '@/components/Layout';
import { LoadingScreen } from '@/components/ui/loading-skeleton';
import ForceUpdateGate from '@/components/ForceUpdateGate';
import { isStaffOnlyScreen, staffOnlyTab } from '@/lib/staffOnlyScreens';

// Lazy-loaded components
const Dashboard = lazy(() => import('@/components/Dashboard'));
const MasterDataManagement = lazy(() => import('@/components/MasterDataManagement'));
const StaffManagement = lazy(() => import('@/components/StaffManagement'));
const TaskManagement = lazy(() => import('@/components/TaskManagement'));
const StaffManagementDashboard = lazy(() => import('@/components/StaffManagementDashboard'));
const TeamChat = lazy(() => import('@/components/TeamChat'));
const ComplaintManagement = lazy(() => import('@/components/ComplaintManagement'));
const UserLoginReports = lazy(() => import('@/components/UserLoginReports'));
const Settings = lazy(() => import('@/components/Settings'));
const VersionManager = lazy(() => import('@/components/VersionManager'));
const WebsiteSettings = lazy(() => import('@/components/WebsiteSettings').then(m => ({ default: m.WebsiteSettings })));
const UserGuide = lazy(() => import('@/pages/UserGuide'));
const LeavePermissionManagement = lazy(() => import('@/components/leave-permission/LeavePermissionManagement'));
const ApprovalManagement = lazy(() => import('@/components/leave-permission/ApprovalManagement'));
const NavigationAnalytics = lazy(() => import('@/components/NavigationAnalytics'));
const StaffMobileDashboard = lazy(() => import('@/components/StaffMobileDashboard'));
const ChatbotKnowledgeBase = lazy(() => import('@/components/ChatbotKnowledgeBase'));
const StaffAttendanceManagement = lazy(() => import('@/components/StaffAttendanceManagement'));
const AuditTrailViewer = lazy(() => import('@/components/AuditTrailViewer'));
const StaffSalaryStructure = lazy(() => import('@/components/StaffSalaryStructure'));
const StaffPayrollGeneration = lazy(() => import('@/components/StaffPayrollGeneration'));

const Index = () => {
  const { user, loading, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Handle navigation from location state and URL parameters
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(staffOnlyTab(location.state.activeTab));
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    
    if (view === 'doctor' || (view && !isStaffOnlyScreen(view))) {
      setActiveTab('dashboard');
    } else if (view === 'staff') {
      setActiveTab('staff-dashboard');
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
    
    if (activeTab !== 'dashboard') return;
    
    // Admin/Manager/Super admin land on the main Dashboard, not Doctor Hub.

    
    if (role && ['staff', 'nurse'].includes(role) && isMobile) {
      setActiveTab('staff-dashboard');
      return;
    }
  }, [userProfile, loading, activeTab, isMobile]);

  const handleTabChange = (params: string | { tab: string; subTab?: string }) => {
    if (typeof params === 'string') {
      setActiveTab(staffOnlyTab(params));
    } else {
      setActiveTab(staffOnlyTab(params.tab));
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
    // Also guard restored navigation state and links that bypass the sidebar.
    if (!isStaffOnlyScreen(activeTab)) return <Dashboard onTabChange={handleTabChange} />;
    const content = (() => {
      switch (activeTab) {
        case 'dashboard':
          return <Dashboard onTabChange={handleTabChange} />;
        case 'staff':
          return <StaffManagement />;
        case 'masters':
          return <MasterDataManagement />;
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
