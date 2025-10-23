import { utils, write, read, writeFile } from 'xlsx';

// ==================== Template Generation ====================

export const generateStaffTemplate = () => {
  const workbook = utils.book_new();
  
  // Sample data with clear instructions for optional fields
  const sampleData = [
    {
      staff_code: '⚠️ Optional - Auto-generated (NUR001, ADM001...)',
      username: 'john.smith',
      full_name: 'John Smith',
      email: 'Optional - Auto from username@gmail.com',
      phone: 'Optional - +1234567890',
      role: 'nurse',
      department: 'Optional - Administration',
      password: 'Optional - Defaults to "SecurePass789"'
    }
  ];
  
  const worksheet = utils.json_to_sheet(sampleData);
  
  // Set column widths (wider for instruction columns)
  worksheet['!cols'] = [
    { wch: 45 }, // staff_code (wider for instruction)
    { wch: 15 }, // username
    { wch: 20 }, // full_name
    { wch: 40 }, // email (wider for instruction)
    { wch: 25 }, // phone
    { wch: 15 }, // role
    { wch: 30 }, // department
    { wch: 40 }  // password (wider for instruction)
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

export const generatePatientId = async (supabaseClient: any): Promise<string> => {
  // Get the highest existing patient ID number
  const { data: visits } = await supabaseClient
    .from('visits')
    .select('patient_id')
    .not('patient_id', 'is', null)
    .ilike('patient_id', 'PAT%')
    .order('patient_id', { ascending: false })
    .limit(1);
  
  let nextNum = 1;
  
  if (visits && visits.length > 0) {
    const lastId = visits[0].patient_id;
    const match = lastId.match(/PAT(\d+)/i);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  
  return `PAT${nextNum.toString().padStart(5, '0')}`;
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

// ==================== Visit Template Generation ====================

export const generateVisitTemplate = async (
  doctors: Array<{ doctor_code: string; full_name: string; specialization?: string }>,
  insuranceCompanies: Array<{ company_code: string; company_name: string }>,
  visitReasons: Array<{ reason_code: string; reason_name: string }>
) => {
  const workbook = utils.book_new();
  
  // Sample data with clear instructions
  const sampleData = [
    {
      doctor: 'Select from dropdown below ↓',
      visit_date: '📅 Click to select date (Cannot be future date)',
      patient_name: 'John Doe',
      patient_id: 'Optional - Auto-generated (PAT00001)',
      payment_amount: 1500,
      payment_type: 'Select from dropdown ↓',
      visit_reason: 'Select from dropdown ↓',
      insurance_company: 'Required if Payment Type = insurance',
      notes: 'Optional - Any additional notes'
    }
  ];
  
  const worksheet = utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 35 }, // doctor
    { wch: 45 }, // visit_date
    { wch: 20 }, // patient_name
    { wch: 35 }, // patient_id
    { wch: 18 }, // payment_amount
    { wch: 25 }, // payment_type
    { wch: 25 }, // visit_reason
    { wch: 40 }, // insurance_company
    { wch: 30 }  // notes
  ];
  
  // Prepare dropdown options
  const doctorOptions = doctors.map(d => 
    `${d.doctor_code} - ${d.full_name}${d.specialization ? ` (${d.specialization})` : ''}`
  );
  
  const insuranceOptions = insuranceCompanies.map(ic => 
    `${ic.company_code} - ${ic.company_name}`
  );
  
  const visitReasonOptions = visitReasons.map(vr => 
    `${vr.reason_code} - ${vr.reason_name}`
  );
  
  const paymentTypeOptions = ['cash', 'insurance'];
  
  // Initialize data validation object
  if (!worksheet['!dataValidation']) worksheet['!dataValidation'] = {};
  
  // Apply data validation for rows 2-1000
  for (let row = 2; row <= 1000; row++) {
    // Doctor dropdown (Column A)
    worksheet['!dataValidation'][`A${row}`] = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${doctorOptions.join(',')}"`],
      showDropDown: true,
      error: 'Please select a doctor from the dropdown',
      errorTitle: 'Invalid Doctor'
    };
    
    // Visit Date validation (Column B) - Date picker + no future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    worksheet['!dataValidation'][`B${row}`] = {
      type: 'date',
      operator: 'lessThanOrEqual',
      formulae: [today],
      showDropDown: true,
      error: 'Visit date cannot be in the future',
      errorTitle: 'Invalid Date',
      prompt: '📅 Click to select date (Cannot be future date)',
      promptTitle: 'Select Visit Date'
    };
    
    // Payment Amount validation (Column E) - Whole numbers only, no decimals
    worksheet['!dataValidation'][`E${row}`] = {
      type: 'whole',
      operator: 'greaterThan',
      formulae: [0],
      error: 'Payment must be a positive whole number (no decimals)',
      errorTitle: 'Invalid Payment Amount'
    };
    
    // Payment Type dropdown (Column F)
    worksheet['!dataValidation'][`F${row}`] = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${paymentTypeOptions.join(',')}"`],
      showDropDown: true,
      error: 'Please select cash or insurance',
      errorTitle: 'Invalid Payment Type'
    };
    
    // Visit Reason dropdown (Column G)
    worksheet['!dataValidation'][`G${row}`] = {
      type: 'list',
      allowBlank: false,
      formulae: [`"${visitReasonOptions.join(',')}"`],
      showDropDown: true,
      error: 'Please select a visit reason from the dropdown',
      errorTitle: 'Invalid Visit Reason'
    };
    
    // Insurance Company dropdown (Column H)
    worksheet['!dataValidation'][`H${row}`] = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${insuranceOptions.join(',')}"`],
      showDropDown: true,
      error: 'Please select an insurance company from the dropdown',
      errorTitle: 'Invalid Insurance Company'
    };
  }
  
  // Format payment column as whole number (no decimals)
  const paymentRange = utils.decode_range(worksheet['!ref'] || 'A1');
  for (let row = 1; row <= 1000; row++) {
    const cellRef = utils.encode_cell({ r: row, c: 4 }); // Column E (payment_amount)
    if (!worksheet[cellRef]) worksheet[cellRef] = { t: 'n', v: 0 };
    worksheet[cellRef].z = '0'; // Number format: whole numbers only
  }
  
  utils.book_append_sheet(workbook, worksheet, 'Visit Template');
  
  // Generate filename with current date (DDMM format)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const filename = `visit_import_${day}${month}_westmed.xlsx`;
  
  writeFile(workbook, filename);
};

// Visit import analysis - duplicate detection
export const analyzeVisitImport = (
  importRow: any,
  existingVisits: any[]
): ImportDecision => {
  // Find exact match: same doctor + patient + date + amount
  const existing = existingVisits.find(v => 
    v.doctor_id === importRow.doctor_id &&
    v.patient_name.toLowerCase() === importRow.patient_name.toLowerCase() &&
    v.visit_date === importRow.visit_date &&
    Math.abs(v.visit_payment - importRow.visit_payment) < 0.01 // Handle floating point
  );
  
  if (!existing) {
    return { action: 'insert', reason: 'New visit' };
  }
  
  // Exact duplicate found
  return { 
    action: 'skip', 
    reason: 'Exact duplicate found (same doctor, patient, date, and amount)',
    existingRecord: existing
  };
};
