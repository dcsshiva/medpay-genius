import { utils, write, read, writeFile } from 'xlsx';

// ==================== Template Generation ====================

export const generateStaffTemplate = () => {
  const workbook = utils.book_new();
  
  // Sample data - first row only (locked/reference)
  const sampleData = [
    {
      staff_code: '⚠️ SAMPLE ROW - DO NOT MODIFY - Add your data in rows below',
      username: 'john.smith',
      full_name: 'John Smith',
      email: 'john.smith@hospital.com',
      phone: '+1234567890',
      role: 'admin',
      department: 'Administration',
      password: 'SecurePass123'
    }
  ];
  
  const worksheet = utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 40 }, // staff_code (wider for warning message)
    { wch: 15 }, // username
    { wch: 20 }, // full_name
    { wch: 25 }, // email
    { wch: 15 }, // phone
    { wch: 15 }, // role
    { wch: 20 }, // department
    { wch: 15 }  // password
  ];
  
  // Add data validation for role column (dropdown)
  const roleOptions = ['admin', 'manager', 'nurse', 'doctor', 'technician', 'receptionist', 'pharmacist', 'cleaner', 'security'];
  worksheet['!dataValidation'] = {
    F2: {
      type: 'list',
      allowBlank: false,
      formulae: [`"${roleOptions.join(',')}"`],
      showDropDown: true,
      error: 'Please select a valid role from the dropdown',
      errorTitle: 'Invalid Role'
    }
  };
  
  // Apply validation to multiple rows (F2:F1000)
  for (let row = 2; row <= 1000; row++) {
    const cellRef = `F${row}`;
    if (!worksheet['!dataValidation']) worksheet['!dataValidation'] = {};
    worksheet['!dataValidation'][cellRef] = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${roleOptions.join(',')}"`],
      showDropDown: true,
      error: 'Please select a valid role from the dropdown',
      errorTitle: 'Invalid Role'
    };
  }
  
  utils.book_append_sheet(workbook, worksheet, 'Staff Template');
  
  // Generate filename with current date (DDMM format)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const filename = `staff_import_${day}${month}_westmed.xlsx`;
  
  writeFile(workbook, filename);
};

export const generateDoctorTemplate = () => {
  const workbook = utils.book_new();
  
  // Sample data - first row only (locked/reference)
  const sampleData = [
    {
      doctor_code: '⚠️ Optional - Auto-generated (DOC001, DOC002...)',
      full_name: 'Dr. Sarah Wilson',
      email: 'Optional - Auto from account_holder_name@gmail.com',
      specialization: 'Optional - Defaults to "others"',
      password: 'Optional - Defaults to "SecurePass789"',
      pan_number: 'Optional - ABCDE1234F',
      bank_account_number: '1234567890',
      account_holder_name: 'Dr. Sarah Wilson',
      bank_name: 'National Bank',
      branch_name: 'Optional - Main Branch',
      ifsc_code: 'NBNK0001234'
    }
  ];
  
  const worksheet = utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 45 }, // doctor_code (wider for instruction)
    { wch: 25 }, // full_name
    { wch: 45 }, // email (wider for instruction)
    { wch: 35 }, // specialization (wider for instruction)
    { wch: 38 }, // password (wider for instruction)
    { wch: 25 }, // pan_number
    { wch: 20 }, // bank_account_number
    { wch: 25 }, // account_holder_name
    { wch: 20 }, // bank_name
    { wch: 25 }, // branch_name
    { wch: 15 }  // ifsc_code
  ];
  
  utils.book_append_sheet(workbook, worksheet, 'Doctor Template');
  
  // Generate filename with current date (DDMM format)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const filename = `doctor_import_${day}${month}_westmed.xlsx`;
  
  writeFile(workbook, filename);
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

export const generateDoctorCode = async (supabaseClient: any): Promise<string> => {
  // Get the highest existing doctor code number
  const { data: doctors } = await supabaseClient
    .from('doctors')
    .select('doctor_code')
    .ilike('doctor_code', 'DOC%')
    .order('doctor_code', { ascending: false })
    .limit(1);
  
  let nextNum = 1;
  
  if (doctors && doctors.length > 0) {
    const lastCode = doctors[0].doctor_code;
    const match = lastCode.match(/DOC(\d+)/i);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  
  return `DOC${nextNum.toString().padStart(3, '0')}`;
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
    existing.pan_number === (importRow.pan_number || null) &&
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
  if (existing.pan_number !== (importRow.pan_number || null)) changedFields.push('pan_number');
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
