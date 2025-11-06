import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import MasterDataManagement from '@/components/MasterDataManagement';
import DoctorManagement from '@/components/DoctorManagement';
import VisitManagement from '@/components/VisitManagement';
import CashPaymentManagement from '@/components/CashPaymentManagement';
import InsurancePaymentManagement from '@/components/InsurancePaymentManagement';
import CashPaymentLite from '@/components/CashPaymentLite';
import InsurancePaymentLite from '@/components/InsurancePaymentLite';
import PaymentManagement from '@/components/PaymentManagement';
import StaffManagement from '@/components/StaffManagement';
import TaskManagement from '@/components/TaskManagement';
import StaffAppraisalManagement from '@/components/StaffAppraisalManagement';
import TeamChat from '@/components/TeamChat';
import ComplaintManagement from '@/components/ComplaintManagement';
import UserLoginReports from '@/components/UserLoginReports';
import Settings from '@/components/Settings';
import VersionManager from '@/components/VersionManager';
import { WebsiteSettings } from '@/components/WebsiteSettings';
import UserGuide from '@/pages/UserGuide';
import { TDSCertificateGenerator } from '@/components/TDSCertificateGenerator';
import { TDSReportsManagement } from '@/components/TDSReportsManagement';
import BankAdvicePaymentReport from '@/components/BankAdvicePaymentReport';
import LeavePermissionManagement from '@/components/leave-permission/LeavePermissionManagement';
import ApprovalManagement from '@/components/leave-permission/ApprovalManagement';
import QuickPaymentManagement from '@/components/QuickPaymentManagement';
import QuickPaymentBankAdviceReport from '@/components/QuickPaymentBankAdviceReport';
import BankAdviceGeneration from '@/components/BankAdviceGeneration';
import BankAdviceGenerationBeta from '@/components/BankAdviceGenerationBeta';
import BankAdviceReport from '@/components/BankAdviceReport';
import BankAdviceReports from '@/components/BankAdviceReports';
import DoctorHub from '@/components/DoctorHub';

// Bank Advice Payment Report Component
const Index = () => {
  const { user, loading, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(undefined);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'cash' | 'insurance' | 'mixed'>('all');

  // Handle navigation from location state and URL parameters
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state after navigation
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    // Check for view parameter in URL
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    
    if (view === 'doctor') {
      setActiveTab('doctor-hub');
    } else if (view === 'admin' || view === 'manager' || view === 'staff') {
      setActiveTab('dashboard');
    }
  }, [location.state, location.search, navigate, location.pathname]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && user) {
      // Ensure we're on /dashboard when authenticated
      if (window.location.pathname === '/') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  // Automatically redirect doctors to their Doctor Hub
  useEffect(() => {
    if (!loading && userProfile?.user_type === 'doctor' && activeTab === 'dashboard') {
      setActiveTab('doctor-hub');
    }
  }, [userProfile, loading, activeTab]);

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
        return <StaffAppraisalManagement />;
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
      case 'doctor-hub':
        // Check if user is a doctor
        const isDoctorUser = userProfile?.user_type === 'doctor';
        return <DoctorHub filterDoctorId={isDoctorUser ? userProfile?.id : undefined} />;
      case 'leave-permission':
        return <LeavePermissionManagement />;
      case 'leave-approvals':
        return <ApprovalManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onTabChange={handleTabChange} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
