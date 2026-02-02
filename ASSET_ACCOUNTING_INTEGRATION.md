# Asset Management & Accounting Integration

## Overview
The asset management system is now integrated with the accounting module to automatically track purchases through the complete financial workflow.

## Workflow

### 1. Asset Purchase Entry
When a new asset is added via **Setup → Add Assets**:
- Asset details are saved (name, type, quantity, purchase date, supplier, price, etc.)
- If **Purchase Price > 0** AND **Supplier is provided**, an Account Payable entry is automatically created

### 2. Account Payable Creation
The system automatically creates an AP invoice with:
- **Order ID**: `ASSET-{assetId}` (e.g., `ASSET-1234`)
- **Product Name**: Asset name + type (e.g., "Laptop Computer (Equipment)")
- **Due Date**: Purchase date (or current date if not provided)
- **Supplier Name**: From asset supplier field
- **Amount**: Purchase price
- **Status**: `Pending`
- **Notes**: Auto-generated description including asset details

### 3. Approval Process
Navigate to **Accounting Dashboard** or **Accounting → Payable**:
1. View pending invoices (Status: `Pending`)
2. Review invoice details
3. Click **Send for approval** or **Approve** button
4. Invoice status changes to `Approved`

### 4. Payment Processing
After approval, navigate to **Accounting → Payable**:
1. Filter by **Approved** status
2. Select the approved invoice
3. Click **Pay** button
4. Select bank account
5. Enter payment details:
   - Amount (auto-filled from invoice)
   - Reference/Slip Number
   - Document/Receipt URL
   - Notes (optional)
6. Click **Pay Now**

### 5. Payment Completion
When payment is processed:
- AP invoice status changes to `Paid`
- Bank ledger entry is created (Debit)
- Bank balance is automatically reduced
- Payment timestamp and bank information are recorded
- Invoice appears in "Paid" filter with payment date

### 6. Voucher & Records
- Payment vouchers are automatically maintained in the system
- Full audit trail: Created → Approved → Paid (with timestamps and user IDs)
- Bank statement reflects the transaction
- Financial reports include the expense

## Complete Workflow Diagram

```
┌─────────────────────┐
│  Add Asset          │
│  (Setup → Assets)   │
│  - Name, Type       │
│  - Supplier, Price  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Asset Saved        │
│  + AP Invoice       │
│  Created            │
│  Status: Pending    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Review & Approve   │
│  (Accounting)       │
│  Status: Approved   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Process Payment    │
│  - Select Bank      │
│  - Enter Details    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Payment Complete   │
│  Status: Paid       │
│  Bank: Updated      │
│  Voucher: Created   │
└─────────────────────┘
```

## Benefits
✅ **Automatic Entry Creation**: No need to manually create payables for asset purchases  
✅ **Accurate Tracking**: All asset purchases are tracked in accounting  
✅ **Audit Trail**: Complete record from purchase to payment  
✅ **Budget Management**: Real-time visibility of outstanding liabilities  
✅ **Compliance**: Proper financial documentation for all assets  

## User Experience

### Adding an Asset
1. Go to **Profile → Setup → Add Assets**
2. Fill in asset details:
   - Asset Name *(required)*
   - Asset Type
   - Quantity
   - Purchase Date
   - Purchase Price
   - Supplier *(required for AP creation)*
   - Notes
3. Click **Save**
4. Success message shows:
   - Asset saved confirmation
   - AP invoice details (ID, amount, supplier)
   - Link to view in Accounting module

### Tracking Payment
1. Navigate to **Accounting → Payable**
2. Find invoice with Order ID starting with `ASSET-`
3. Review details and click **Pay**
4. Complete payment information
5. Submit payment

## Technical Details

### Frontend: profile.html
- Asset form: Lines 493-517 (modal)
- Save handler: Lines 1558-1596 (with AP creation logic)
- Integration notice: Lines 336-338 (info banner)

### Backend: web-server.js
- `POST /api/company/assets` - Saves asset
- `POST /api/accounting/ap` - Creates AP invoice
- `POST /api/accounting/ap/:id/pay` - Processes payment

### Database Tables
- **Assets**: Company assets
- **APInvoices**: Accounts payable entries
- **BankLedger**: Payment transactions

## API Integration

### Create AP Invoice
```javascript
POST /api/accounting/ap
{
  "orderId": "ASSET-123",
  "productName": "Laptop Computer (Equipment)",
  "dueDate": "2024-01-15",
  "supplierName": "Tech Supplies Inc.",
  "amount": 1500.00,
  "notes": "Asset Purchase: Laptop Computer - For accounting dept"
}
```

### Process Payment
```javascript
POST /api/accounting/ap/{invoiceId}/pay
{
  "bankId": 1,
  "amount": 1500.00,
  "slipNumber": "CHQ-001",
  "docUrl": "https://example.com/receipt.pdf",
  "reference": "ASSET-123"
}
```

## Error Handling
- If AP creation fails, asset is still saved
- User receives clear error message
- Manual AP entry can be created if needed
- No duplicate entries (idempotent operations)

## Future Enhancements
- [ ] Depreciation tracking
- [ ] Asset approval workflow before purchase
- [ ] Multi-currency support
- [ ] Purchase order generation
- [ ] Asset disposal and sale tracking
- [ ] Integration with inventory management

## Testing
To test the integration:
1. Add a new asset with supplier and purchase price
2. Verify AP invoice is created automatically
3. Navigate to Accounting → Payable
4. Confirm invoice appears with correct details
5. Process payment and verify completion

## Support
For issues or questions about this integration, refer to:
- [Accounting Module Documentation](./docs/accounting.md)
- [Asset Management Guide](./docs/assets.md)
- [API Documentation](./src/API_QUICK_REFERENCE.md)
