# ComplytEX Application Flow - Complete Workflow Documentation

## 🔐 AUTHENTICATION FLOW

### 1. Initial Access
```
User → Login Page (login.html)
  ↓
Enter Email & Password
  ↓
Click "Login" Button
  ↓
POST /api/auth/login
  ↓
[2FA Check]
```

### 2. Two-Factor Authentication
```
IF 2FA Enabled:
  ↓
  Response: { twoFactorRequired: true, email: "user@example.com" }
  ↓
  Show OTP Input Screen
  ↓
  User Opens Google Authenticator
  ↓
  Enter 6-Digit Code
  ↓
  POST /api/auth/verify-2fa
  ↓
  Verify TOTP Code
  ↓
  IF Valid → Generate JWT Token
  ↓
  Set HTTP-Only Cookie: 'auth'
  ↓
  Response: { success: true, token, user: {uid, tid, email} }

ELSE (No 2FA):
  ↓
  Generate JWT Token Immediately
  ↓
  Set Auth Cookie
  ↓
  Response: { success: true, token, user }
```

### 3. Session Management
```
Every API Request:
  ↓
Client Sends Cookie: 'auth'
  ↓
Server Middleware: requireAuth()
  ↓
Verify JWT Token
  ↓
Extract: { uid: UserId, tid: TenantId, email }
  ↓
Attach to req.auth
  ↓
Check Permissions: requirePerm('MODULE_VIEW_XXX')
  ↓
Query: fn_HasPermission(tid, uid, permissionCode)
  ↓
Allow/Deny Access
```

### 4. Role-Based Redirect
```
After Login → Determine User Role:
  ↓
Query UserRoles → Get Role Names
  ↓
IF 'Safety Officer' → /masters/safety-office.html
IF 'Safety Auditor' → /masters/safety-auditor.html
IF 'Inspector' → /masters/inspection.html
IF 'Buyer' → /masters/buyer.html
IF 'Supplier' → /masters/supplier.html
IF 'Designer' → /masters/designer.html
ELSE → /dashboard.html (Default)
```

---

## 🏠 DASHBOARD FLOW

### Main Dashboard (dashboard.html)
```
Load Dashboard
  ↓
GET /api/auth/session → Verify User
  ↓
Display User Info: Name, Email, Role
  ↓
Load Module Cards:
  - CRM Module
  - HR Module
  - Accounting Module
  - Safety Module
  - Tasks Module
  - Calendar Module
  - Reports Module
  ↓
Check Permissions for Each Module
  ↓
Show/Hide Modules Based on User Role
  ↓
Display Quick Stats:
  - Total Contacts
  - Active Employees
  - Pending Audits
  - Financial Summary
```

---

## 📊 CRM MODULE FLOW

### Entry Point: crm.html
```
Navigate to CRM
  ↓
GET /api/crm/contacts → Load Contact List
  ↓
Display Contacts in Table/Grid
  ↓
Show Actions:
  - Add New Contact
  - Edit Contact
  - Delete Contact
  - View Contact Details
```

### Add Contact Workflow
```
Click "Add Contact" Button
  ↓
Show Contact Form Modal:
  - Name (required)
  - Email (required)
  - Phone
  - Company
  - Position
  - Address
  - Notes
  ↓
User Fills Form
  ↓
Click "Save" Button
  ↓
POST /api/crm/contacts
  Body: { name, email, phone, company, position, address, notes }
  ↓
Server Validates:
  - Email format
  - Required fields
  - Duplicate check
  ↓
INSERT INTO Customers (TenantId, Name, Email, Phone, ...)
  ↓
Response: { success: true, contactId }
  ↓
Refresh Contact List
  ↓
Show Success Message: "Contact Added Successfully"
```

### Edit Contact Workflow
```
Click "Edit" on Contact Row
  ↓
GET /api/crm/contacts/:id → Fetch Contact Data
  ↓
Populate Form with Existing Data
  ↓
User Modifies Fields
  ↓
Click "Update" Button
  ↓
PUT /api/crm/contacts/:id
  ↓
UPDATE Customers SET ... WHERE CustomerId = :id
  ↓
Response: { success: true }
  ↓
Refresh Contact List
  ↓
Show Success Message: "Contact Updated"
```

### Delete Contact Workflow
```
Click "Delete" on Contact Row
  ↓
Show Confirmation Dialog: "Are you sure?"
  ↓
User Confirms
  ↓
DELETE /api/crm/contacts/:id
  ↓
DELETE FROM Customers WHERE CustomerId = :id
  ↓
Response: { success: true }
  ↓
Remove Row from Table
  ↓
Show Success Message: "Contact Deleted"
```

---

## 👥 HR MODULE FLOW

### Entry Point: employees.html
```
Navigate to HR/Employees
  ↓
GET /api/hr/employees → Load Employee List
  ↓
Display Employees in Table:
  - Employee ID
  - Name
  - Email
  - Position/Title
  - Department
  - Hire Date
  - Status (Active/Inactive)
  ↓
Show Actions:
  - Add Employee
  - Edit Employee
  - View Profile
  - Manage Attendance
  - Assign Training
```

### Add Employee Workflow
```
Click "Add Employee" Button
  ↓
Show Employee Form:
  - Full Name (required)
  - Email (required)
  - Phone
  - Position/Title (required)
  - Department
  - Hire Date
  - Salary (optional, encrypted)
  - Emergency Contact
  - Address
  ↓
User Fills Form
  ↓
Click "Save Employee" Button
  ↓
POST /api/hr/employees
  Body: { name, email, phone, position, department, hireDate, ... }
  ↓
Server Processing:
  1. Validate email format
  2. Check for duplicate email
  3. Create user account (optional)
  4. INSERT INTO CompanyUsers
  ↓
Response: { success: true, employeeId }
  ↓
Refresh Employee List
  ↓
Optionally: Send Welcome Email
  ↓
Show Success: "Employee Added Successfully"
```

### Attendance Tracking Flow
```
Navigate to Attendance (attendance/index.html)
  ↓
GET /api/hr/attendance → Load Attendance Records
  ↓
Display Calendar View or List View
  ↓
Show Employee Attendance:
  - Present
  - Absent
  - Late
  - On Leave
  ↓
Mark Attendance:
  ↓
Select Employee + Date + Status
  ↓
POST /api/hr/attendance
  Body: { employeeId, date, status, checkIn, checkOut, notes }
  ↓
INSERT INTO Attendance (...)
  ↓
Update Calendar View
  ↓
Calculate:
  - Total Present Days
  - Total Absent Days
  - Attendance Percentage
```

### Training Assignment Flow
```
Navigate to Training (training.html)
  ↓
GET /api/hr/training → Load Training Programs
  ↓
Display Available Trainings
  ↓
Click "Assign Training"
  ↓
Select:
  - Employees (multiple select)
  - Training Program
  - Start Date
  - Duration
  - Trainer
  ↓
POST /api/hr/training/assign
  Body: { employeeIds[], trainingId, startDate, duration }
  ↓
INSERT INTO EmployeeTraining (...)
  ↓
Send Notification to Employees
  ↓
Update Training Status: "Assigned"
  ↓
Show Success: "Training Assigned to X Employees"
```

---

## 💰 ACCOUNTING MODULE FLOW

### Entry Point: accounting/dashboard.html
```
Navigate to Accounting Dashboard
  ↓
GET /api/accounting/summary → Load Financial Data
  ↓
Display Key Metrics:
  - Total Revenue
  - Total Expenses
  - Net Profit/Loss
  - Cash Flow
  - Accounts Receivable
  - Accounts Payable
  ↓
Show Charts:
  - Revenue Trend (Line Chart)
  - Expense Breakdown (Pie Chart)
  - Monthly Comparison (Bar Chart)
  ↓
Quick Links:
  - Chart of Accounts
  - Invoices
  - Bills/Payables
  - Bank Reconciliation
  - Reports
```

### Chart of Accounts Flow
```
Navigate to Chart of Accounts (accounting/chart-of-accounts.html)
  ↓
GET /api/accounting/accounts → Load Account List
  ↓
Display Accounts by Category:
  - Assets
  - Liabilities
  - Equity
  - Revenue
  - Expenses
  ↓
Show Account Details:
  - Account Code
  - Account Name
  - Account Type
  - Current Balance
  - Parent Account
  ↓
Add New Account:
  ↓
Click "Add Account"
  ↓
Fill Form:
  - Account Code (e.g., 1000)
  - Account Name (e.g., "Cash")
  - Account Type (Asset/Liability/etc.)
  - Parent Account (optional)
  ↓
POST /api/accounting/accounts
  ↓
INSERT INTO ChartOfAccounts (...)
  ↓
Refresh Account List
  ↓
Success: "Account Created"
```

### Invoice/Billing Flow
```
Navigate to Invoices (accounting/receivables.html)
  ↓
GET /api/accounting/invoices → Load Invoice List
  ↓
Display Invoices:
  - Invoice Number
  - Customer
  - Date
  - Due Date
  - Amount
  - Status (Draft/Sent/Paid/Overdue)
  ↓
Create New Invoice:
  ↓
Click "New Invoice"
  ↓
Fill Invoice Form:
  - Customer (select from CRM contacts)
  - Invoice Date
  - Due Date
  - Line Items:
    * Product/Service
    * Quantity
    * Rate
    * Amount
  - Subtotal
  - Tax
  - Total
  ↓
POST /api/accounting/invoices
  Body: { customerId, date, dueDate, items[], subtotal, tax, total }
  ↓
Server Processing:
  1. Generate Invoice Number
  2. INSERT INTO Invoices
  3. INSERT INTO InvoiceItems (line items)
  4. Create Journal Entry:
     - DR: Accounts Receivable
     - CR: Revenue
  ↓
Response: { success: true, invoiceId, invoiceNumber }
  ↓
Optionally: Send Invoice Email to Customer
  ↓
Show Success: "Invoice Created: INV-001"
```

### Payment Recording Flow
```
Customer Pays Invoice:
  ↓
Open Invoice → Click "Record Payment"
  ↓
Fill Payment Form:
  - Payment Date
  - Amount Paid
  - Payment Method (Cash/Check/Card/Bank Transfer)
  - Reference Number
  - Bank Account (if applicable)
  ↓
POST /api/accounting/payments
  Body: { invoiceId, amount, date, method, reference, bankAccountId }
  ↓
Server Processing:
  1. INSERT INTO Payments
  2. Update Invoice: PaidAmount += amount
  3. If PaidAmount >= Total → Status = "Paid"
  4. Create Journal Entry:
     - DR: Cash/Bank Account
     - CR: Accounts Receivable
  ↓
Response: { success: true, paymentId }
  ↓
Update Invoice Status
  ↓
Show Success: "Payment Recorded: $X"
```

---

## 🔥 SAFETY MODULE FLOW (Core Feature)

### Entry Point: masters/safety-office.html OR safety-audits.html

### Safety Dashboard Flow
```
Navigate to Safety Dashboard
  ↓
GET /api/safety/dashboard → Load Safety Metrics
  ↓
Display Key Indicators:
  - Total Audits Conducted
  - Pending Audits
  - Compliance Rate
  - Open Issues
  - Certifications Issued
  ↓
Show Recent Audits List
  ↓
Show Upcoming Scheduled Audits
  ↓
Quick Actions:
  - Create New Audit
  - View Audit Calendar
  - Generate Reports
  - Issue Certification
```

### Fire Safety Audit Flow (Complete Workflow)
```
1. INITIATE AUDIT
   ↓
Navigate to Fire Safety (test-fire-form.html)
   ↓
Click "New Fire Safety Audit"
   ↓
Fill Basic Information:
  - Factory/Tenant Selection
  - Auditor Assignment
  - Audit Date
  - Factory Name
  - Address
  - Contact Person
  - Phone Number
  - Email
   ↓
   
2. BUILDING INFORMATION
   ↓
Enter Building Details:
  - Number of Floors
  - Total Building Area (sq ft)
  - Total Workers
  - Number of Shifts
  - Building Construction Type
  - Year Built
   ↓
   
3. FIRE SAFETY CHECKLIST
   ↓
Check Each Category (Yes/No/NA):

A. Fire Detection & Alarm Systems:
  □ Smoke detectors installed
  □ Heat detectors present
  □ Manual fire alarm call points
  □ Fire alarm panel functional
  □ Audible alarm system working
  □ Visual alarm indicators
  □ Regular testing conducted
  □ Maintenance records available

B. Fire Fighting Equipment:
  □ Fire extinguishers (ABC type)
  □ Fire extinguisher signage
  □ Hydrant system available
  □ Hose reels accessible
  □ Sprinkler system installed
  □ Water storage adequate
  □ Fire pump operational
  □ Regular servicing done

C. Emergency Exits:
  □ Exit doors clearly marked
  □ Exit signs illuminated
  □ Exit paths unobstructed
  □ Emergency lighting functional
  □ Exit door unlocked during work
  □ Panic bars installed
  □ Assembly points marked
  □ Evacuation maps posted

D. Electrical Safety:
  □ Wiring properly installed
  □ Circuit breakers functional
  □ No overloaded circuits
  □ Emergency power cut-off
  □ Regular electrical inspection
  □ Grounding system proper
  □ Dangerous areas marked

E. Storage & Housekeeping:
  □ Flammable materials stored safely
  □ Chemical storage compliant
  □ Aisles kept clear
  □ Waste disposal regular
  □ No smoking policy enforced
  □ Hot work permit system
   ↓
   
4. ADD OBSERVATIONS
   ↓
For Each Item:
  IF Issue Found:
    ↓
    Add to Non-Compliance List:
      - Item Description
      - Severity (Critical/Major/Minor)
      - Location
      - Photographic Evidence (upload)
      - Recommended Action
      - Target Completion Date
   ↓
   
5. UPLOAD EVIDENCE
   ↓
Attach Documents/Photos:
  - Building layout plans
  - Equipment certificates
  - Previous audit reports
  - Incident reports (if any)
  - Photos of violations
  - Training records
   ↓
   
6. SAVE AUDIT
   ↓
Click "Save Audit" Button
   ↓
POST /api/safety/audits/fire
  Body: {
    tenantId,
    auditorId,
    auditDate,
    factoryInfo: {...},
    buildingInfo: {...},
    checklist: {...},
    nonCompliances: [...],
    attachments: [...],
    overallScore,
    status: 'draft' or 'completed'
  }
   ↓
Server Processing:
  1. Validate all required fields
  2. Upload attachments to storage
  3. Calculate compliance score
  4. INSERT INTO SafetyAudits
  5. INSERT INTO SafetyChecklistItems
  6. INSERT INTO NonCompliances
  7. INSERT INTO AuditAttachments
  8. Generate Audit Reference Number
   ↓
Response: { success: true, auditId, referenceNumber }
   ↓
Show Success: "Audit Saved: AUD-FIRE-2026-001"
```

### Electrical Safety Audit Flow
```
Navigate to Electrical Safety Form
   ↓
Similar Structure to Fire Safety, but with Electrical-Specific Checklist:

A. Electrical Installations:
  □ Main panel properly labeled
  □ Circuit breakers adequate
  □ GFCI protection in wet areas
  □ Proper wire sizing
  □ Cable management adequate
  □ Junction boxes covered

B. Equipment Safety:
  □ Machines properly grounded
  □ Emergency stops functional
  □ Lock-out/tag-out procedures
  □ Equipment maintenance logs
  □ Calibration certificates valid

C. Hazardous Areas:
  □ High voltage areas restricted
  □ Warning signage posted
  □ Personal protective equipment
  □ Arc flash protection
  □ Insulated tools available
   ↓
[Same workflow as Fire Safety for saving]
```

### View Audit List Flow
```
Navigate to Safety Audits (safety-audits.html)
   ↓
GET /api/safety/audits → Load All Audits
   ↓
Display Audits in Table/Cards:
  - Audit Type (Fire/Electrical/Building)
  - Reference Number
  - Factory Name
  - Audit Date
  - Auditor Name
  - Compliance Score
  - Status (Draft/Completed/Certified)
   ↓
Filter Options:
  - By Type
  - By Date Range
  - By Status
  - By Auditor
  - By Factory
   ↓
Click on Audit → View Details:
   ↓
GET /api/safety/audits/:id → Fetch Full Audit
   ↓
Display Complete Audit Report:
  - Basic Info
  - Checklist Results
  - Non-Compliances List
  - Attached Documents
  - Action Items
  - Historical Comments
   ↓
Actions Available:
  - Edit Audit (if draft)
  - Download PDF Report
  - Issue Certification (if compliant)
  - Schedule Follow-up Audit
  - Add Comments
```

### Audit Certification Flow
```
Open Completed Audit
   ↓
Check Eligibility:
  - Status = "Completed"
  - Compliance Score >= Threshold (e.g., 85%)
  - All Critical Issues Resolved
  - Required Documents Attached
   ↓
IF Eligible:
   ↓
   Click "Issue Certification" Button
   ↓
   Navigate to Certification Form (audit-verification.html)
   ↓
   Pre-filled Data:
     - Factory Name
     - Audit Reference
     - Audit Date
     - Compliance Score
     - Auditor Name
   ↓
   Fill Certification Details:
     - Certificate Number (auto-generated)
     - Issue Date
     - Valid Until Date (typically +1 year)
     - Certification Body
     - Signatory Name & Title
     - Special Conditions (if any)
     - QR Code (auto-generated for verification)
   ↓
   Click "Generate Certificate"
   ↓
   POST /api/safety/certifications
     Body: {
       auditId,
       certificateNumber,
       issueDate,
       validUntil,
       signatory,
       conditions,
       qrCode
     }
   ↓
   Server Processing:
     1. Validate audit completion
     2. Generate certificate PDF with:
        - Company letterhead
        - Certificate number
        - Factory details
        - Compliance statement
        - QR code for verification
        - Digital signature
     3. INSERT INTO SafetyCertifications
     4. UPDATE SafetyAudits SET Status = 'Certified'
     5. Store PDF in file storage
   ↓
   Response: {
     success: true,
     certificateId,
     certificateNumber,
     pdfUrl
   }
   ↓
   Show Certificate Preview
   ↓
   Options:
     - Download PDF
     - Email to Factory
     - Print Certificate
     - Verify Certificate (via QR)
   ↓
   Show Success: "Certificate Issued: CERT-2026-001"
```

### Certificate Verification Flow
```
Public Access: /verify-certificate
   ↓
User Enters:
  - Certificate Number OR
  - Scans QR Code
   ↓
GET /api/safety/verify/:certificateNumber
   ↓
Server Checks:
  1. Certificate exists
  2. Certificate is valid (not expired)
  3. Certificate not revoked
   ↓
IF Valid:
   ↓
   Display Verification Page:
     ✅ Certificate is VALID
     - Factory Name
     - Certificate Number
     - Issue Date
     - Valid Until
     - Audit Type
     - Compliance Score
     - Issued By
     ↓
   Show Green Badge: "VERIFIED"
   ↓
   Option to Download Certificate Copy

ELSE:
   ↓
   Display Warning:
     ❌ Certificate is INVALID or EXPIRED
     - Reason for invalidity
     - Contact information
```

---

## 📋 REPORTING FLOW

### Generate Safety Report
```
Navigate to Reports (report.html)
   ↓
Select Report Type:
  - Fire Safety Summary
  - Electrical Safety Summary
  - Building Safety Summary
  - Compliance Dashboard
  - Non-Compliance Report
  - Certification Registry
  - Audit Schedule
   ↓
Set Parameters:
  - Date Range (From/To)
  - Factory/Tenant (All or Specific)
  - Auditor (All or Specific)
  - Status Filter
   ↓
Click "Generate Report"
   ↓
POST /api/reports/generate
  Body: { reportType, dateRange, filters }
   ↓
Server Processing:
  1. Query relevant data from database
  2. Aggregate statistics
  3. Generate charts/graphs
  4. Format as PDF or Excel
  5. Include:
     - Executive Summary
     - Detailed Findings
     - Compliance Trends
     - Action Items
     - Recommendations
   ↓
Response: { success: true, reportUrl }
   ↓
Show Report Preview
   ↓
Options:
  - Download PDF
  - Download Excel
  - Email Report
  - Schedule Recurring Report
```

---

## 🔄 INTER-MODULE WORKFLOWS

### CRM → Accounting Integration
```
CRM Contact Selected
   ↓
Create Invoice for Contact
   ↓
Contact data auto-fills in Accounting:
  - Customer Name
  - Email
  - Address
   ↓
Generate Invoice → Links back to CRM Contact
```

### HR → Safety Integration
```
Employee requires Safety Training
   ↓
From HR Module → Assign Safety Training
   ↓
Records stored in Safety Module
   ↓
Track Training Completion
   ↓
Update Employee Safety Certification Status
```

### Safety → Accounting Integration
```
Audit Completed
   ↓
Generate Invoice for Audit Services
   ↓
Create Invoice in Accounting:
  - Client: Factory/Tenant
  - Service: Safety Audit
  - Amount: Audit Fee
   ↓
Track Payment Status
```

---

## 🔔 NOTIFICATION FLOW

### Real-time Notifications
```
Event Occurs:
  - New Audit Assigned
  - Non-Compliance Found
  - Certificate Expiring Soon
  - Payment Received
  - Employee Added
   ↓
Server Creates Notification:
  INSERT INTO Notifications (userId, type, message, link, read)
   ↓
Push to User:
  - WebSocket (if online)
  - Email (if enabled)
  - SMS (if critical)
   ↓
User Sees Notification in App
   ↓
Click Notification → Navigate to Relevant Page
   ↓
Mark as Read:
  UPDATE Notifications SET read = 1
```

---

## 🚪 LOGOUT FLOW

```
User Clicks "Logout"
   ↓
POST /api/auth/logout
   ↓
Server Processing:
  1. Clear auth cookie
  2. Invalidate token (optional blacklist)
  3. Log logout event
   ↓
Response: { success: true }
   ↓
Client:
  1. Clear local storage
  2. Clear session data
  3. Redirect to /login.html
   ↓
Session Ended
```

---

## 📊 COMPLETE USER JOURNEY EXAMPLE

### Safety Officer Role - Complete Day Workflow

```
1. MORNING - Login & Dashboard
   08:00 → Login with 2FA
   08:01 → View Dashboard
   08:02 → Check Pending Audits (5 pending)
   08:03 → Review Today's Schedule (3 audits)

2. FIRST AUDIT - Fire Safety
   09:00 → Travel to Factory A
   09:30 → Open Mobile App
   09:31 → Start Fire Safety Audit Form
   09:35 → Fill Building Information
   09:45 → Complete Checklist (walk-through)
   10:30 → Upload Photos of Issues (3 non-compliances found)
   10:45 → Add Recommendations
   11:00 → Save Audit (Status: Completed)
   11:01 → System generates AUD-FIRE-2026-123

3. BREAK & REVIEW
   11:30 → Lunch Break
   12:00 → Review Audit from Desktop
   12:10 → Generate Preliminary Report PDF
   12:15 → Email Report to Factory Manager

4. SECOND AUDIT - Electrical Safety
   13:00 → Travel to Factory B
   13:45 → Start Electrical Audit
   14:00 → Complete Inspection
   15:30 → No major issues found (Score: 92%)
   15:45 → Save Audit
   15:46 → Immediately eligible for certification

5. CERTIFICATION ISSUANCE
   16:00 → Back at office
   16:05 → Open Factory B Audit
   16:06 → Click "Issue Certification"
   16:10 → Fill Certificate Details
   16:12 → Generate Certificate PDF
   16:15 → Email Certificate to Factory B
   16:16 → Certificate: CERT-2026-045 issued

6. ACCOUNTING INTEGRATION
   16:30 → Navigate to Accounting
   16:32 → Create Invoice for Factory B:
           - Service: Electrical Safety Audit
           - Amount: $500
   16:35 → Send Invoice via Email

7. REPORTING
   17:00 → Generate Daily Activity Report
   17:05 → View Week's Statistics:
           - Audits Completed: 12
           - Certificates Issued: 8
           - Avg Compliance: 87%
           - Revenue Generated: $6,000

8. END OF DAY
   17:30 → Review Tomorrow's Schedule
   17:35 → Add Notes to Upcoming Audits
   17:40 → Logout
```

---

## 🎯 KEY WORKFLOWS SUMMARY

1. **Authentication**: Email/Password → 2FA → JWT Token → Session
2. **CRM**: Add Contact → Manage → Link to Invoices
3. **HR**: Add Employee → Attendance → Training → Compliance
4. **Accounting**: Chart of Accounts → Invoice → Payment → Reports
5. **Safety**: Audit Creation → Inspection → Non-Compliance → Certification
6. **Reporting**: Select Type → Set Filters → Generate → Download/Email
7. **Notifications**: Event → Create → Push → Read → Action

---

## 📱 MOBILE vs DESKTOP FLOW

### Desktop (Full Features)
- Complete audit forms
- Upload multiple documents
- Generate detailed reports
- Bulk operations
- Advanced filtering
- Multi-tab workflows

### Mobile (On-site Auditing)
- Quick audit checklists
- Photo capture on-site
- Voice notes
- GPS location tagging
- Offline mode support
- Sync when online

---

This represents the complete application flow from user authentication through all major modules to final reporting and certification.
