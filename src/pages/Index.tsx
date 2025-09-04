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
import ComplaintManagement from '@/components/ComplaintManagement';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
        return <Dashboard />;
      case 'staff':
        return <StaffManagement />;
      case 'doctors':
        return <DoctorManagement />;
      case 'visits':
        return <VisitManagement />;
      case 'payments':
        return <PaymentManagement />;
      case 'tasks':
        return <TaskManagement />;
      case 'complaints':
        return <ComplaintManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
