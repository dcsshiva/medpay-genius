import { supabase } from "@/integrations/supabase/client";
import { formatInputDateIST, getCurrentISTDate, toISOStringIST } from "@/lib/dateUtils";

// South Indian sample names for realistic examples
export const sampleNames = {
  doctors: [
    "Dr. Ravi Kumar", "Dr. Priya Sharma", "Dr. Arun Nair", 
    "Dr. Lakshmi Reddy", "Dr. Vikram Singh", "Dr. Meera Menon"
  ],
  patients: [
    "Ramesh Babu", "Sujatha Devi", "Vijay Kumar", "Padma Lakshmi", 
    "Krishna Murthy", "Radha Krishnan", "Sundar Rajan", "Kamala Suresh"
  ],
  staff: [
    "Anand Kumar", "Priya Menon", "Rajesh Sharma", "Kavitha Reddy",
    "Suresh Naidu", "Deepa Iyer"
  ]
};

export const roleBasedExamples = {
  admin: {
    sampleData: {
      doctor_code: "DOC001",
      full_name: sampleNames.doctors[0],
      specialization: "Cardiology",
      email: "ravi.kumar@hospital.com",
      phone: "+91 98765 43210"
    }
  },
  manager: {
    sampleData: {
      staff_code: "STF001",
      full_name: sampleNames.staff[0],
      role: "nurse",
      department: "Emergency"
    }
  },
  doctor: {
    sampleData: {
      patient_id: "PAT001",
      patient_name: sampleNames.patients[0],
      visit_date: formatInputDateIST(getCurrentISTDate()),
      visit_payment: "500",
      visit_reason: "regular_checkup"
    }
  },
  staff: {
    sampleData: {
      task_title: "Update Patient Records",
      task_description: "Review and update patient medical records for the week",
      priority: "high",
      due_date: toISOStringIST(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    }
  }
};

// Field type mapping with descriptions
export const getFieldType = (columnType: string): string => {
  const typeMap: Record<string, string> = {
    'text': 'Text',
    'character varying': 'Text',
    'uuid': 'UUID (Auto-generated)',
    'timestamp with time zone': 'Date & Time',
    'date': 'Date',
    'integer': 'Number',
    'numeric': 'Decimal Number',
    'boolean': 'Yes/No (Checkbox)',
    'jsonb': 'JSON Data',
    'USER-DEFINED': 'Dropdown/Select'
  };
  return typeMap[columnType] || columnType;
};

// Get field descriptions based on table and column
export const getFieldDescription = (tableName: string, columnName: string): string => {
  const descriptions: Record<string, Record<string, string>> = {
    doctors: {
      doctor_code: "Unique identifier for the doctor (e.g., DOC001)",
      full_name: "Doctor's full name as it appears on credentials",
      specialization: "Medical specialization (e.g., Cardiology, Neurology)",
      email: "Official hospital email address",
      bank_account_number: "Bank account for payment transfers",
      ifsc_code: "Indian Financial System Code for bank transfers"
    },
    staff: {
      staff_code: "Unique identifier for staff member (e.g., STF001)",
      username: "Login username (lowercase, no spaces)",
      full_name: "Staff member's complete name",
      role: "Job role: admin, manager, nurse, receptionist, etc.",
      department: "Working department (e.g., Emergency, Outpatient)"
    },
    visits: {
      patient_id: "Unique patient identifier (optional)",
      patient_name: "Patient's full name",
      visit_date: "Date of visit (format: YYYY-MM-DD)",
      visit_payment: "Payment amount in rupees",
      payment_type: "cash, card, insurance, or upi",
      visit_reason: "Reason for visit: regular_checkup, emergency, follow_up"
    },
    payments: {
      period_start: "Start date of payment period",
      period_end: "End date of payment period",
      total_visits: "Number of visits in this period",
      total_amount: "Total payment amount",
      paid_amount: "Amount already paid",
      status: "pending, manager_approved, admin_approved, or rejected"
    },
    tasks: {
      task_title: "Brief title describing the task",
      task_description: "Detailed description of what needs to be done",
      priority: "low, medium, or high",
      due_date: "Deadline for task completion",
      status: "pending, in_progress, completed, or overdue"
    }
  };

  return descriptions[tableName]?.[columnName] || "No description available";
};

// Workflow diagrams for common processes
export const workflowDiagrams = {
  visitToPayment: `
graph TD
    A[Doctor Records Visit] --> B{Visit Details Valid?}
    B -->|Yes| C[Visit Saved]
    B -->|No| D[Show Error]
    C --> E[Manager Creates Payment Period]
    E --> F[Manager Reviews & Approves]
    F --> G[Admin Final Approval]
    G --> H[Payment Record Created]
    H --> I[Doctor Can View Payment]
  `,
  taskManagement: `
graph LR
    A[Manager Creates Task] --> B[Assign to Staff]
    B --> C[Staff Views Task]
    C --> D{Complete Task?}
    D -->|Yes| E[Mark Complete]
    D -->|No| F[Update Progress]
    F --> C
    E --> G[Manager Reviews]
  `,
  staffCreation: `
graph TD
    A[Admin Opens Staff Mgmt] --> B{Excel Import or Manual?}
    B -->|Excel| C[Download Template]
    C --> D[Fill Template]
    D --> E[Upload File]
    E --> F{Validation}
    F -->|Pass| G[Create Staff Records]
    F -->|Fail| H[Show Errors]
    B -->|Manual| I[Fill Form]
    I --> J[Submit]
    J --> G
    G --> K[Staff Can Login]
  `
};
