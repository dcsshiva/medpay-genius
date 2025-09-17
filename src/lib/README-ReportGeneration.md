# Report Generation System

## Overview
The Report Generation system provides comprehensive export functionality for Visit Management and Payment Management records with Excel and PDF export options. Users can select specific records to include in their reports.

## Features

### 1. Record Selection
- **Select All/Deselect All**: Quick toggle for all visible records
- **Individual Selection**: Choose specific records using checkboxes
- **Visual Feedback**: Selected records are highlighted with check icons
- **Selection Counter**: Shows how many records are currently selected

### 2. Export Formats

#### Excel Export (.xlsx)
- **Structured Data**: Exports data in a clean spreadsheet format
- **Auto-sized Columns**: Columns automatically adjust for optimal readability
- **Formatted Values**: Currency and date values are properly formatted
- **File Naming**: Includes timestamp for unique file identification

#### PDF Export (.pdf)
- **Professional Layout**: Landscape orientation for better data presentation
- **Report Header**: Includes title, generation date, and record count
- **Formatted Table**: Clean table structure with proper styling
- **Optimized Text Size**: Readable font sizes for printed documents

### 3. Data Filtering
- Reports respect the current search filters
- Only filtered records are available for selection
- Search functionality works seamlessly with report generation

## Available Reports

### Visit Management Report
**Columns Include:**
- Visit Date
- Doctor Name
- Doctor Code
- Patient Name
- Patient ID
- Patient Count
- Visit Payment (formatted as currency)
- Payment Type
- Visit Reason (formatted for readability)
- Notes

**File Name Pattern:** `visit_management_report_YYYY-MM-DD_HH-mm-ss`

### Payment Management Report
**Columns Include:**
- Doctor Name
- Doctor Code
- Period Start Date
- Period End Date
- Total Visits
- Total Amount (formatted as currency)
- Paid Amount (formatted as currency)
- Remaining Amount (formatted as currency)
- Fully Paid Status (Yes/No)
- Status (formatted for readability)
- Payment Notes
- Manager Approved Date & Time
- Admin Approved Date & Time

**File Name Pattern:** `payment_management_report_YYYY-MM-DD_HH-mm-ss`

## How to Use

### 1. Access Report Generation
- Navigate to Visit Management or Payment Management
- Look for the "Generate Report" button (visible when data is available)
- Click the button to open the report dialog

### 2. Select Records
- Review the list of available records
- Use "Select All" for all visible records, or
- Check individual records you want to include
- Selected records show a blue checkmark icon

### 3. Export Data
- Choose your preferred format:
  - **Excel**: Click "Export to Excel" for spreadsheet format
  - **PDF**: Click "Export to PDF" for printable format
- Files are automatically downloaded with timestamped names

### 4. Record Preview
Each record shows a preview with key information:
- **Visit Records**: Date, Doctor, Patient details
- **Payment Records**: Doctor, Period, Amounts, Status

## Technical Implementation

### Dependencies
- **xlsx**: Excel file generation and manipulation
- **jspdf**: PDF document creation
- **jspdf-autotable**: Table formatting for PDFs

### Component Structure
```
src/components/ReportGeneration.tsx - Main report component
├── Record selection interface
├── Export functionality (Excel/PDF)
├── Data formatting utilities
└── User feedback system
```

### Integration Points
- **VisitManagement.tsx**: Integrated with visit records
- **PaymentManagement.tsx**: Integrated with payment records
- **Search Integration**: Respects current filter state

## Error Handling
- **No Records Selected**: Warns user to select at least one record
- **Export Failures**: Shows detailed error messages
- **Data Validation**: Ensures clean data formatting

## User Permissions
- Available to all users who can view the respective management pages
- No special permissions required for export functionality
- Data exported respects existing role-based access controls

## File Formats

### Excel (.xlsx)
- Industry-standard spreadsheet format
- Compatible with Microsoft Excel, Google Sheets, LibreOffice Calc
- Preserves data types and formatting
- Suitable for further data analysis

### PDF (.pdf)
- Universal document format
- Suitable for printing and archiving
- Professional appearance
- Cross-platform compatibility

## Best Practices
1. **Regular Exports**: Export data regularly for backup purposes
2. **Meaningful Selection**: Select relevant records based on reporting needs
3. **File Organization**: Use timestamps in filenames for version control
4. **Data Review**: Review exported data for accuracy before distribution

## Future Enhancements
- Custom date range selection
- Additional export formats (CSV, XML)
- Email delivery of reports
- Scheduled automatic exports
- Custom column selection
- Report templates