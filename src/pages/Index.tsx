import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import DoctorManagement from '@/components/DoctorManagement';
import VisitManagement from '@/components/VisitManagement';
import PaymentManagement from '@/components/PaymentManagement';

const Index = () => {
  // Simplified version first
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-xl p-8 text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">WestMed Hospital</h1>
          <p className="text-gray-600 mb-6">Doctor Payment Management System</p>
          
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/auth'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In / Sign Up
            </button>
            
            <div className="text-sm text-gray-500">
              <p>✓ Secure doctor authentication</p>
              <p>✓ Visit management</p>
              <p>✓ Payment tracking in INR</p>
              <p>✓ Multi-level approval workflow</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Original complex version (commented out for now)
  /*
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Debug logging
  console.log('Index component - user:', user);
  console.log('Index component - loading:', loading);

  useEffect(() => {
    console.log('Index useEffect - loading:', loading, 'user:', user);
    if (!loading && !user) {
      console.log('Navigating to /auth');
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    console.log('Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
          <p className="mt-2 text-sm text-muted-foreground">Debug: Loading state active</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user, returning null');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">No user found, should redirect to auth...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'doctors':
        return <DoctorManagement />;
      case 'visits':
        return <VisitManagement />;
      case 'payments':
        return <PaymentManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
  */
};

export default Index;
