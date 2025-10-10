import React from 'react';
import PaymentManagement from './PaymentManagement';

/**
 * Insurance Payment Management Component
 * Manages insurance payments only - filters visits and payments to show only insurance type
 */
const InsurancePaymentManagement = () => {
  return (
    <PaymentManagement 
      initialPaymentTypeFilter="insurance"
      paymentTypeOnly="insurance"
    />
  );
};

export default InsurancePaymentManagement;
