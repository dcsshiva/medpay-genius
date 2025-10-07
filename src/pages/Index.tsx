import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import DoctorManagement from '@/components/DoctorManagement';
import VisitManagement from '@/components/VisitManagement';
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

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(undefined);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'cash' | 'insurance' | 'mixed'>('all');

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
      case 'doctors':
        return <DoctorManagement />;
      case 'visits':
        return <VisitManagement initialSubTab={activeSubTab} />;
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
