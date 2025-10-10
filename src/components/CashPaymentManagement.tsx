import React from 'react';
import PaymentManagement from './PaymentManagement';

/**
 * Cash Payment Management Component
 * Manages cash payments only - filters visits and payments to show only cash type
 */
const CashPaymentManagement = () => {
  return (
    <PaymentManagement 
      initialPaymentTypeFilter="cash"
      paymentTypeOnly="cash"
    />
  );
};

export default CashPaymentManagement;
