# ComplytEX End-to-End Testing Guide
## Comprehensive Manual Testing Protocol

---

## 🎯 Testing Overview

This document provides a complete end-to-end testing protocol for the ComplytEX ERP system, covering all modules, workflows, and integrations.

**Test Environment:**
- URL: http://localhost:3000
- Default Login: safety@demo.example / Welcome123!
- Database: Azure SQL (zlnsw9feuf.database.windows.net/SeApp2)

**Testing Tools:**
1. **Automated Test Dashboard**: Open `tests/test-dashboard.html` in your browser
2. **Manual Testing**: Follow the step-by-step procedures below
3. **Node.js Test Script**: Run `node tests/end-to-end-test.js`

---

## 📋 Pre-Testing Checklist

- [ ] Server is running (`npm run web`)
- [ ] Database is accessible
- [ ] Browser has cookies enabled
- [ ] Console/DevTools open for debugging
- [ ] Test data backup completed (if needed)

---

## 1️⃣ Authentication & User Management Testing

### Test 1.1: User Login
**Steps:**
1. Navigate to http://localhost:3000/login.html
2. Enter credentials: safety@demo.example / Welcome123!
3. Click "Login" button

**Expected Result:**
- ✅ Redirect to appropriate dashboard based on role
- ✅ Auth cookie set in browser
- ✅ No console errors

**Test Cases:**
- [ ] Valid credentials login
- [ ] Invalid password rejection
- [ ] Non-existent user rejection
- [ ] SQL injection prevention (try: ' OR '1'='1)

---

### Test 1.2: Session Management
**Steps:**
1. After login, navigate to different pages
2. Check session persistence
3. Open DevTools → Application → Cookies
4. Verify 'auth' cookie exists

**Expected Result:**
- ✅ Session persists across page navigation
- ✅ Auth cookie has secure attributes
- ✅ Session expires after 7 days (or configured time)

---

### Test 1.3: Role-Based Access Control
**Steps:**
1. Login as different users (Owner, Safety Officer, HR Manager)
2. Attempt to access restricted pages
3. Verify menu items match role permissions

**Test Matrix:**
| Role | Dashboard | HR | Accounting | Safety | CRM |
|------|-----------|----|-----------| -------|-----|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| Safety Officer | ✅ | ❌ | ❌ | ✅ | ❌ |
| HR Manager | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 2️⃣ CRM Module Testing

### Test 2.1: Contact Management
**Navigate to:** http://localhost:3000/crm/index.html

**Test Cases:**
1. **Create Contact**
   - Click "Add Contact"
   - Fill form: Name, Email, Phone, Company
   - Click "Save"
   - Expected: Success message, contact appears in list

2. **List/View Contacts**
   - Verify all contacts display
   - Check pagination (if >10 contacts)
   - Test search functionality

3. **Update Contact**
   - Click "Edit" on a contact
   - Modify details (name, notes)
   - Click "Save"
   - Expected: Changes persist, updated timestamp

4. **Delete Contact**
   - Click "Delete" on test contact
   - Confirm deletion
   - Expected: Contact removed from list

**Verification:**
```sql
-- Check contacts in database
SELECT * FROM Contacts ORDER BY CreatedAt DESC;
```

---

### Test 2.2: Customer Interaction History
**Steps:**
1. Select a contact
2. Add interaction note
3. Set follow-up date
4. Check interaction appears in history

**Expected Result:**
- ✅ Interaction saved with timestamp
- ✅ Follow-up reminder created
- ✅ History displays in chronological order

---

## 3️⃣ HR Module Testing

### Test 3.1: Employee Management
**Navigate to:** http://localhost:3000/hr/index.html

**Test Case 3.1.1: Create Employee**

**Steps:**
1. Click "Add Employee" button
2. Fill **Employee Profile** tab:
   - Full Name: John Test Employee
   - Email: john.test@example.com
   - Phone: 555-1234
   - Department: Testing
   - Employee Type: Salary
   - ☑ Active checkbox (checked)

3. Click **Totals** tab:
   - MTD Gross: 5000
   - YTD Gross: 60000
   - MTD Deductions: 500
   - YTD Deductions: 6000

4. Click **Payroll Details** tab:
   - Salary: 60000
   - Pay Frequency: Monthly
   - Pay Type: Salary
   - Bank Account: 1234567890

5. Click "Save All"

**Expected Result:**
- ✅ Success message: "Employee saved successfully"
- ✅ Employee appears in employee list
- ✅ Default password "Welcome123!" created
- ✅ No console errors

**Verification SQL:**
```sql
-- Check employee was created
SELECT 
    cu.CompanyUserId, cu.FullName, cu.Email, cu.Active,
    pd.Salary, pd.PayFrequency, pd.PayType
FROM CompanyUsers cu
LEFT JOIN HrEmployeePayDetails pd ON cu.CompanyUserId = pd.CompanyUserId
WHERE cu.Email = 'john.test@example.com';
```

---

### Test 3.2: Payroll Processing Workflow

**Test Case 3.2.1: Payroll Preview**

**Steps:**
1. Navigate to HR → Payroll tab
2. Select Period: 2026-01
3. Click "Preview Payroll"

**Expected Result:**
- ✅ Table displays all active employees
- ✅ Salary amounts calculated correctly:
  - Monthly: Full salary amount
  - Semi-Monthly: Salary / 2
  - Bi-Weekly: (Salary / 52) * 2
  - Weekly: Salary / 52
- ✅ FICA deduction: 7.65% of gross
- ✅ Net Pay = Gross - Deductions
- ✅ Only ACTIVE employees shown

**Sample Calculation:**
```
Employee: John Test Employee
Salary: $60,000 (Monthly)
Gross Pay: $60,000
FICA (7.65%): $4,590
Net Pay: $55,410
```

---

**Test Case 3.2.2: Generate Payroll**

**Steps:**
1. Review preview data
2. Click "Generate Payroll" button
3. Confirm generation

**Expected Result:**
- ✅ Success message with count
- ✅ AP Invoices created for each employee
- ✅ Order ID format: PAY-2026-01-{EmployeeId}
- ✅ Supplier Name = Employee Name
- ✅ Amount = Net Pay

**Verification SQL:**
```sql
-- Check AP invoices were created
SELECT 
    InvoiceId, SupplierName, Amount, Status, OrderId, CreatedAt
FROM APInvoices
WHERE OrderId LIKE 'PAY-2026-01-%'
ORDER BY CreatedAt DESC;
```

---

### Test 3.3: Job Posting & Applicant Management

**Test Case 3.3.1: Create Job Posting**

**Steps:**
1. Navigate to HR → Job Postings
2. Click "Create Job Posting"
3. Fill form:
   - Title: Quality Control Inspector
   - Department: Production
   - Employment Type: Full-Time
   - Openings: 2
   - Location: Main Factory
   - Description: Detailed job description...
4. Click "Publish"

**Expected Result:**
- ✅ Job posting saved
- ✅ Status: Open
- ✅ Appears in public job board (if enabled)

---

**Test Case 3.3.2: Manage Applicants**

**Steps:**
1. Navigate to HR → Applicants
2. Review applicant list
3. Click on an applicant
4. Change status: Screening → Interview → Offer → Hired
5. Schedule interview (if applicable)

**Expected Result:**
- ✅ Status changes persist
- ✅ Interview scheduled in calendar
- ✅ Email notification sent (if configured)

---

## 4️⃣ Accounting Module Testing

### Test 4.1: Bank Management

**Navigate to:** http://localhost:3000/accounting/banks.html

**Test Case 4.1.1: Create Bank Account**

**Steps:**
1. Click "Add Bank"
2. Fill form:
   - Bank Name: Test Bank
   - Account Number: TEST12345
   - Branch: Main Branch
   - Balance: 100000
3. Click "Save"

**Expected Result:**
- ✅ Bank saved successfully
- ✅ Appears in bank list
- ✅ Balance displays correctly

**Verification SQL:**
```sql
SELECT * FROM Banks ORDER BY CreatedAt DESC;
```

---

### Test 4.2: Accounts Payable (AP) Workflow

**Navigate to:** http://localhost:3000/accounting/payables.html

**Test Case 4.2.1: View AP Invoices**

**Steps:**
1. Click "Pending" filter
2. Review pending payment invoices
3. Verify payroll invoices appear (from Test 3.2.2)

**Expected Result:**
- ✅ Payroll AP invoices listed
- ✅ Supplier Name = Employee names
- ✅ Amount = Net pay amounts
- ✅ Status = Pending
- ✅ Order ID = PAY-{period}-{employeeId}

---

**Test Case 4.2.2: Process Payment**

**Steps:**
1. Click "Pay" button on an invoice
2. Payment modal opens
3. Fill payment form:
   - Select Bank: Choose from dropdown
   - Amount: Auto-filled (verify correct)
   - Reference/Slip Number: PAY2026-001
   - Document URL: (optional)
   - Notes: Payroll payment January 2026
4. Click "Submit Payment"

**Expected Result:**
- ✅ Success message
- ✅ Invoice status changes to "Paid"
- ✅ Bank ledger entry created
- ✅ Bank balance updated (decreased)
- ✅ Invoice moves to "Paid" filter

**Verification SQL:**
```sql
-- Check invoice updated
SELECT * FROM APInvoices WHERE InvoiceId = {invoiceId};

-- Check bank ledger entry
SELECT * FROM BankLedger 
WHERE Description LIKE '%PAY2026-001%'
ORDER BY TransactionDate DESC;

-- Check bank balance
SELECT BankId, BankName, Balance FROM Banks;
```

---

**Test Case 4.2.3: Payment Workflow Integration**

**End-to-End Test:** Employee → Payroll → AP → Payment

**Steps:**
1. Create employee (Test 3.1)
2. Generate payroll (Test 3.2.2)
3. Verify AP invoice created (Test 4.2.1)
4. Process payment (Test 4.2.2)

**Full Verification:**
```sql
-- Employee exists
SELECT * FROM CompanyUsers WHERE Email = 'john.test@example.com';

-- Payroll details configured
SELECT * FROM HrEmployeePayDetails WHERE CompanyUserId = {employeeId};

-- AP invoice created
SELECT * FROM APInvoices WHERE OrderId LIKE 'PAY-%' AND SupplierName LIKE '%John Test%';

-- Payment processed
SELECT * FROM BankLedger WHERE ReferenceNumber = 'PAY2026-001';
```

**Expected Complete Flow:**
```
Employee Created → Has Salary → Payroll Generated → AP Invoice → Payment Processed → Bank Updated
```

---

### Test 4.3: Accounts Receivable (AR)

**Navigate to:** http://localhost:3000/accounting/receivables.html

**Test Case 4.3.1: Create Invoice**

**Steps:**
1. Click "Create Invoice"
2. Fill details:
   - Customer: Select from contacts
   - Amount: 15000
   - Due Date: 30 days from today
   - Description: Textile order #1234
3. Click "Save"

**Expected Result:**
- ✅ AR invoice created
- ✅ Status: Pending
- ✅ Appears in receivables list

---

**Test Case 4.3.2: Record Payment**

**Steps:**
1. Click "Receive Payment" on invoice
2. Enter:
   - Bank: Select bank
   - Amount received: 15000
   - Payment method: Bank Transfer
   - Reference: INV-2026-001
3. Click "Record Payment"

**Expected Result:**
- ✅ Invoice status → Paid
- ✅ Bank balance increased
- ✅ Payment recorded in ledger

---

### Test 4.4: Chart of Accounts

**Navigate to:** http://localhost:3000/accounting/chart-of-accounts.html

**Test Case 4.4.1: View Chart of Accounts**

**Expected Result:**
- ✅ All account categories displayed
- ✅ Account codes follow standard format
- ✅ Balance sheet accounts separated from P&L

**Standard Accounts to Verify:**
- 1000-1999: Assets
- 2000-2999: Liabilities
- 3000-3999: Equity
- 4000-4999: Revenue
- 5000-5999: Expenses

---

## 5️⃣ Safety & Compliance Testing

### Test 5.1: Fire Safety Form

**Navigate to:** http://localhost:3000/public/test-fire-form.html

**Test Case 5.1.1: Complete Fire Safety Assessment**

**Steps:**
1. Fill all fields:
   - Smoking Prohibited: Yes
   - No Smoking Signs: Yes
   - Fire Extinguishers: Yes ✅
   - Fire Alarm: Yes ✅
   - Emergency Exit: Yes ✅
   - Exit Signs: Yes
   - Fire Drill Conducted: Yes
   - Notes: All fire safety measures in place
2. Click "Save"

**Expected Result:**
- ✅ Data saved to FireSafety table
- ✅ Success message displayed
- ✅ Form can be reloaded with saved data

**Verification SQL:**
```sql
SELECT * FROM FireSafety ORDER BY CreatedAt DESC;
```

---

### Test 5.2: Electrical Safety

**Navigate to:** Safety module → Electrical Safety tab

**Test Case 5.2.1: Electrical Safety Checklist**

**Steps:**
1. Complete checklist:
   - Proper Wiring: Yes ✅
   - Circuit Breakers: Yes ✅
   - Grounding: Yes ✅
   - GFCI Protection: Yes
   - Cable Management: Yes
   - Equipment Certification: Yes
2. Click "Save"

**Expected Result:**
- ✅ Electrical safety data saved
- ✅ Compliance score calculated
- ✅ Any issues flagged for remediation

---

### Test 5.3: Safety Audits

**Navigate to:** http://localhost:3000/safety-audits.html

**Test Case 5.3.1: List Safety Audits**

**Steps:**
1. Open safety audits page
2. Review audit list

**Expected Result:**
- ✅ All audits displayed with status
- ✅ Filter by type (Fire, Electrical, OSHA, etc.)
- ✅ Filter by status (Pending, In Progress, Completed)

---

**Test Case 5.3.2: Create Safety Audit**

**Steps:**
1. Click "Create Audit"
2. Fill form:
   - Audit Type: OSHA Compliance
   - Scheduled Date: Select date
   - Auditor: Assign auditor
   - Department: Production Floor
   - Scope: Full facility inspection
3. Click "Create"

**Expected Result:**
- ✅ Audit created with status "Scheduled"
- ✅ Notification sent to auditor
- ✅ Appears in audit list

---

**Test Case 5.3.3: Complete Audit**

**Steps:**
1. Open created audit
2. Fill audit checklist (varies by type)
3. Add findings:
   - Issue: "Fire extinguisher expired"
   - Severity: High
   - Corrective Action: "Replace extinguisher"
   - Due Date: 7 days from today
4. Add photos/attachments
5. Click "Complete Audit"

**Expected Result:**
- ✅ Audit status → Completed
- ✅ Findings saved
- ✅ Corrective actions created
- ✅ Compliance score calculated

---

**Test Case 5.3.4: Generate Audit Report**

**Steps:**
1. Select completed audit
2. Click "Generate Report"
3. Review report preview
4. Click "Export PDF"

**Expected Result:**
- ✅ PDF generated with:
  - Audit details
  - Checklist results
  - Findings summary
  - Photos/evidence
  - Auditor signature
- ✅ PDF downloads successfully

---

### Test 5.4: Certification Issuance

**Navigate to:** Safety Audits → Certifications

**Test Case 5.4.1: Issue Compliance Certificate**

**Prerequisites:**
- At least one completed audit with passing score

**Steps:**
1. Select completed audit with passing score
2. Click "Issue Certificate"
3. Review certificate preview:
   - Company name
   - Audit type
   - Compliance date
   - Expiration date
   - Certificate number
4. Click "Generate Certificate"

**Expected Result:**
- ✅ Certificate generated
- ✅ Certificate number assigned (format: CERT-{YEAR}-{NUMBER})
- ✅ PDF certificate created
- ✅ Certificate saved to database
- ✅ Expiration date set (typically 1 year)

**Verification SQL:**
```sql
SELECT * FROM SafetyCertificates 
ORDER BY IssueDate DESC;
```

---

**Test Case 5.4.2: Certificate Renewal Workflow**

**Steps:**
1. Wait for certificate near expiration (or manually set expiration date)
2. System should send renewal reminder
3. Create renewal audit
4. Complete audit
5. Issue new certificate

**Expected Result:**
- ✅ Renewal reminder sent 30 days before expiration
- ✅ New audit linked to original certificate
- ✅ New certificate issued with updated expiration
- ✅ Old certificate marked as superseded

---

## 6️⃣ Waste Management Testing

### Test 6.1: Waste Tracking

**Navigate to:** http://localhost:3000/waste-management.html

**Test Case 6.1.1: Record Waste Generation**

**Steps:**
1. Click "Add Waste Record"
2. Fill form:
   - Waste Type: Fabric Scraps
   - Quantity: 50 kg
   - Date: Today
   - Department: Cutting
   - Disposal Method: Recycling
3. Click "Save"

**Expected Result:**
- ✅ Waste record saved
- ✅ Running total updated
- ✅ Appears in waste log

---

### Test 6.2: Waste Disposal

**Navigate to:** http://localhost:3000/waste-disposal.html

**Test Case 6.2.1: Schedule Disposal**

**Steps:**
1. Select accumulated waste
2. Click "Schedule Disposal"
3. Fill form:
   - Disposal Company: Green Waste Services
   - Pickup Date: Select date
   - Cost: 500
   - Disposal Method: Recycling
4. Click "Schedule"

**Expected Result:**
- ✅ Disposal scheduled
- ✅ Waste quantity deducted from inventory
- ✅ Cost recorded
- ✅ Disposal company notified (if configured)

---

## 7️⃣ Water Management Testing

**Navigate to:** Water Management module

**Test Case 7.1: Water Usage Tracking**

**Steps:**
1. Record daily water usage
2. Input:
   - Date: Today
   - Meter Reading: 15000 gallons
   - Department: Dyeing
3. Click "Save"

**Expected Result:**
- ✅ Usage recorded
- ✅ Consumption calculated (vs previous reading)
- ✅ Alert if usage exceeds threshold

---

## 8️⃣ Production Module Testing

**Navigate to:** http://localhost:3000/production.html

**Test Case 8.1: Production Order**

**Steps:**
1. Create production order
2. Fill details:
   - Product: T-Shirt Style A
   - Quantity: 1000 units
   - Due Date: 30 days from today
   - Customer: Select from CRM
3. Assign to production line
4. Click "Create Order"

**Expected Result:**
- ✅ Order created
- ✅ Materials allocated
- ✅ Status: Pending
- ✅ Appears in production dashboard

---

## 9️⃣ Dashboard & Reporting

### Test 9.1: Main Dashboard

**Navigate to:** http://localhost:3000/dashboard.html

**Test Case 9.1.1: Dashboard Widgets**

**Expected Display:**
- ✅ Total employees count
- ✅ Pending payroll
- ✅ AP/AR summary
- ✅ Safety compliance score
- ✅ Recent audits
- ✅ Open tasks

---

### Test 9.2: Report Generation

**Test Cases:**
1. **HR Reports**
   - Employee roster
   - Payroll summary
   - Attendance report

2. **Accounting Reports**
   - Balance sheet
   - P&L statement
   - Cash flow
   - AP aging
   - AR aging

3. **Safety Reports**
   - Incident report
   - Audit summary
   - Compliance status
   - Certificate registry

4. **Production Reports**
   - Production summary
   - Work order status
   - Material usage

**For Each Report:**
- ✅ Data displays correctly
- ✅ Export to PDF works
- ✅ Export to Excel works
- ✅ Date filters work
- ✅ Charts/graphs render correctly

---

## 🔟 Integration Testing

### Test 10.1: CRM → Sales → Accounting Integration

**Workflow:**
1. Create contact in CRM
2. Convert to customer
3. Create sales order
4. Generate invoice
5. Record payment

**Verification Points:**
- ✅ Contact data flows to customer
- ✅ Sales order creates AR invoice
- ✅ Payment updates bank balance
- ✅ All transactions linked

---

### Test 10.2: HR → Payroll → Accounting Integration

**Workflow (Already tested above):**
1. Create employee → 2. Configure payroll → 3. Generate payroll → 4. Create AP → 5. Process payment

**Additional Checks:**
- ✅ Employee changes reflect in payroll
- ✅ Salary changes update AP amounts
- ✅ Multiple pay periods tracked separately
- ✅ Bank reconciliation matches

---

### Test 10.3: Safety → Audit → Certification Integration

**Workflow:**
1. Complete safety checklists
2. Schedule audit
3. Conduct audit
4. Generate findings
5. Issue certificate

**Verification:**
- ✅ Checklist data feeds audit
- ✅ Audit findings create corrective actions
- ✅ Certificate links to audit
- ✅ Certificate expiration tracked

---

## 🎯 Performance Testing

### Test 11.1: Load Testing

**Test Scenarios:**
1. **Concurrent Users**
   - 10 users simultaneously
   - 50 users simultaneously
   - 100 users simultaneously

2. **Large Data Sets**
   - 1000+ employees
   - 10,000+ transactions
   - 5000+ contacts

**Metrics to Monitor:**
- Response time < 2 seconds
- No memory leaks
- Database connection pool stable
- CPU usage < 70%

---

### Test 11.2: Data Integrity

**Test Cases:**
1. **Transaction Rollback**
   - Simulate failed payroll generation
   - Verify no partial data saved

2. **Concurrent Updates**
   - Two users update same employee
   - Last write wins (or conflict resolution)

3. **Referential Integrity**
   - Delete employee with payroll
   - Verify cascade or prevention

---

## 📊 Test Results Template

```markdown
## Test Execution Report

**Date:** [Date]
**Tester:** [Name]
**Environment:** [Local/Staging/Production]

### Summary
- Total Tests: [Number]
- Passed: [Number]
- Failed: [Number]
- Blocked: [Number]
- Success Rate: [Percentage]

### Critical Failures
1. [Test Name] - [Issue Description] - [Severity]

### Recommendations
1. [Recommendation]

### Next Steps
1. [Action item]
```

---

## 🐛 Bug Reporting Template

```markdown
## Bug Report

**Title:** [Short description]
**Severity:** Critical / High / Medium / Low
**Module:** [HR / Accounting / Safety / etc.]

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
```
[Paste console errors]
```

**Database State:**
```sql
-- SQL to check related data
```

**Environment:**
- Browser: [Chrome/Firefox/Edge]
- OS: [Windows/Mac/Linux]
- Server: [Version]
```

---

## ✅ Testing Checklist

Use this checklist to track your testing progress:

### Module Testing
- [ ] Authentication & Users
- [ ] CRM
- [ ] HR & Payroll
- [ ] Accounting (AP/AR)
- [ ] Safety & Compliance
- [ ] Waste Management
- [ ] Water Management
- [ ] Production

### Integration Testing
- [ ] CRM → Accounting
- [ ] HR → Payroll → AP
- [ ] Safety → Audit → Certification

### Reports
- [ ] HR Reports
- [ ] Accounting Reports
- [ ] Safety Reports
- [ ] Production Reports

### Performance
- [ ] Load Testing
- [ ] Data Integrity
- [ ] Database Performance

### Security
- [ ] Authentication
- [ ] Authorization
- [ ] SQL Injection
- [ ] XSS Prevention
- [ ] CSRF Protection

---

## 📞 Support

If you encounter issues during testing:

1. **Check Console**: Open browser DevTools (F12) and check Console for errors
2. **Check Server Logs**: Review terminal where server is running
3. **Database Verification**: Run SQL queries to verify data state
4. **Documentation**: Refer to module-specific guides in `/docs` folder

---

## 🎉 Testing Complete!

Once all tests pass, you have verified:
- ✅ All modules functional
- ✅ Data flows correctly between modules
- ✅ Reports generate accurately
- ✅ Audit trail maintained
- ✅ Certifications can be issued
- ✅ System ready for production use

**Next Steps:**
1. Document any customizations needed
2. Set up data backup procedures
3. Configure email notifications
4. Train end users
5. Deploy to production

---

*Document Version: 1.0*
*Last Updated: January 28, 2026*
