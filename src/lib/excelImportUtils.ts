import { utils, write, read, writeFile } from 'xlsx';

// ==================== Template Generation ====================

export const generateStaffTemplate = () => {
  const workbook = utils.book_new();
  
  // Sample data with headers and examples
  const sampleData = [
    {
      staff_code: 'ADM001',
      username: 'john.smith',
      full_name: 'John Smith',
      email: 'john.smith@hospital.com',
      phone: '+1234567890',
      role: 'admin',
      department: 'Administration',
      password: 'SecurePass123'
    },
    {
      staff_code: '',
      username: 'jane.doe',
      full_name: 'Jane Doe',
      email: 'jane.doe@hospital.com',
      phone: '+1234567891',
      role: 'nurse',
      department: 'Emergency',
      password: 'SecurePass456'
    },
    {
      staff_code: '',
      username: 'bob.wilson',
      full_name: 'Bob Wilson',
      email: '',
      phone: '',
      role: 'receptionist',
      department: 'Front Desk',
      password: 'SecurePass789'
    }
  ];
  
  const worksheet = utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // staff_code
    { wch: 15 }, // username
    { wch: 20 }, // full_name
    { wch: 25 }, // email
    { wch: 15 }, // phone
    { wch: 15 }, // role
    { wch: 20 }, // department
    { wch: 15 }  // password
  ];
  
  utils.book_append_sheet(workbook, worksheet, 'Staff Template');
  writeFile(workbook, 'staff_import_template.xlsx');
};

export const generateDoctorTemplate = () => {
  const workbook = utils.book_new();
  
  const sampleData = [
    {
      doctor_code: 'DOC001',
      full_name: 'Dr. Sarah Wilson',
      email: 'sarah.wilson@hospital.com',
      specialization: 'Cardiology',
      password: 'SecurePass789',
      bank_account_number: '1234567890',
      account_holder_name: 'Dr. Sarah Wilson',
      bank_name: 'National Bank',
      branch_name: 'Main Branch',
      ifsc_code: 'NBNK0001234'
    },
    {
      doctor_code: 'DOC002',
      full_name: 'Dr. Michael Chen',
      email: 'michael.chen@hospital.com',
      specialization: 'Neurology',
      password: 'SecurePass321',
      bank_account_number: '9876543210',
      account_holder_name: 'Dr. Michael Chen',
      bank_name: 'City Bank',
      branch_name: 'Downtown Branch',
      ifsc_code: 'CBNK0005678'
    }
  ];
  
  const worksheet = utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // doctor_code
    { wch: 20 }, // full_name
    { wch: 25 }, // email
    { wch: 20 }, // specialization
    { wch: 15 }, // password
    { wch: 20 }, // bank_account_number
    { wch: 20 }, // account_holder_name
    { wch: 20 }, // bank_name
    { wch: 20 }, // branch_name
    { wch: 15 }  // ifsc_code
  ];
  
  utils.book_append_sheet(workbook, worksheet, 'Doctor Template');
  writeFile(workbook, 'doctor_import_template.xlsx');
};

// ==================== Excel Parsing ====================

export const parseExcelFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

// ==================== Code Generation ====================

export const generateStaffCodeByRole = (role: string): string => {
  const prefixMap: Record<string, string> = {
    'admin': 'ADM',
    'manager': 'MGR',
    'nurse': 'NUR',
    'doctor': 'DOC',
    'technician': 'TEC',
    'receptionist': 'REC',
    'pharmacist': 'PHM',
    'cleaner': 'CLN',
    'security': 'SEC'
  };
  
  const prefix = prefixMap[role.toLowerCase()] || 'STF';
  const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${randomNum}`;
};

export const validateStaffCode = (code: string): boolean => {
  // Format: 3 letters + 3 digits
  return /^[A-Z]{3}\d{3}$/.test(code);
};

export const validateDoctorCode = (code: string): boolean => {
  // Format: DOC + 3 digits or similar pattern
  return /^[A-Z]{3}\d{3,}$/.test(code);
};

// ==================== Duplicate Detection ====================

export interface ImportDecision {
  action: 'skip' | 'update' | 'insert';
  reason: string;
  existingRecord?: any;
  changedFields?: string[];
}

// Rule 1: Skip if ALL fields match exactly
// Rule 2: Update if code exists but fields differ
// Rule 4: Use staff_code as primary key
export const analyzeStaffImport = (
  importRow: any,
  existingStaff: any[]
): ImportDecision => {
  // Find by staff_code (Rule 4)
  const existing = existingStaff.find(s => s.staff_code === importRow.staff_code);
  
  if (!existing) {
    return { action: 'insert', reason: 'New staff member' };
  }
  
  // Check if ALL fields match (Rule 1)
  const fieldsMatch = (
    existing.username === importRow.username &&
    existing.full_name === importRow.full_name &&
    existing.email === (importRow.email || null) &&
    existing.phone === (importRow.phone || null) &&
    existing.role === importRow.role &&
    existing.department === (importRow.department || null)
  );
  
  if (fieldsMatch) {
    return { 
      action: 'skip', 
      reason: 'All fields match existing record',
      existingRecord: existing
    };
  }
  
  // Fields differ - prepare update (Rule 2)
  const changedFields = [];
  if (existing.username !== importRow.username) changedFields.push('username');
  if (existing.full_name !== importRow.full_name) changedFields.push('full_name');
  if (existing.email !== (importRow.email || null)) changedFields.push('email');
  if (existing.phone !== (importRow.phone || null)) changedFields.push('phone');
  if (existing.role !== importRow.role) changedFields.push('role');
  if (existing.department !== (importRow.department || null)) changedFields.push('department');
  
  return {
    action: 'update',
    reason: 'Code exists with different data',
    existingRecord: existing,
    changedFields
  };
};

// Similar analysis for doctors (Rule 1, 2, 4)
export const analyzeDoctorImport = (
  importRow: any,
  existingDoctors: any[]
): ImportDecision => {
  // Find by doctor_code (Rule 4)
  const existing = existingDoctors.find(d => d.doctor_code === importRow.doctor_code);
  
  if (!existing) {
    return { action: 'insert', reason: 'New doctor' };
  }
  
  // Get profile data
  const existingFullName = existing.profiles?.full_name || '';
  
  // Check if ALL fields match (Rule 1)
  const fieldsMatch = (
    existingFullName === importRow.full_name &&
    existing.specialization === importRow.specialization &&
    existing.bank_account_number === (importRow.bank_account_number || null) &&
    existing.account_holder_name === (importRow.account_holder_name || null) &&
    existing.bank_name === (importRow.bank_name || null) &&
    existing.branch_name === (importRow.branch_name || null) &&
    existing.ifsc_code === (importRow.ifsc_code || null)
  );
  
  if (fieldsMatch) {
    return { 
      action: 'skip', 
      reason: 'All fields match existing record',
      existingRecord: existing
    };
  }
  
  // Fields differ - prepare update (Rule 2)
  const changedFields = [];
  if (existingFullName !== importRow.full_name) changedFields.push('full_name');
  if (existing.specialization !== importRow.specialization) changedFields.push('specialization');
  if (existing.bank_account_number !== (importRow.bank_account_number || null)) changedFields.push('bank_account_number');
  if (existing.account_holder_name !== (importRow.account_holder_name || null)) changedFields.push('account_holder_name');
  if (existing.bank_name !== (importRow.bank_name || null)) changedFields.push('bank_name');
  if (existing.branch_name !== (importRow.branch_name || null)) changedFields.push('branch_name');
  if (existing.ifsc_code !== (importRow.ifsc_code || null)) changedFields.push('ifsc_code');
  
  return {
    action: 'update',
    reason: 'Code exists with different data',
    existingRecord: existing,
    changedFields
  };
};

// ==================== Import Results Interface ====================

export interface ImportResults {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
}
