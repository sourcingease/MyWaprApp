# Quick Setup Guide

Get your SaaS Agent connected to Azure SQL Database in 5 minutes.

## Prerequisites

1. **Node.js** (version 18 or higher)
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

2. **Your Azure SQL Database password** for user `turtle`

## Setup Steps

### 1. Install Dependencies
```powershell
npm install
```

### 2. Configure Database Connection
```powershell
# Copy the template and edit it
Copy-Item .env.template .env
# Open .env in your editor and set your password
notepad .env
```

In the `.env` file, set:
```
AZURE_SQL_PASSWORD=your_actual_password_here
```

### 3. Test Connection
```powershell
npm run health-check
```

This will test your connection and show you:
- ✅ Connection status
- 📋 Available tables in your database  
- 🔍 Monitoring capabilities

### 4. Start the Agent
```powershell
npm start
```

## What the Agent Does

- **Monitors** your database tables for new records every 5 minutes
- **Reports** on new activity and changes
- **Performs** maintenance tasks daily
- **Processes** records based on your custom logic

## Customization

Edit `src/index.js` to customize:
- Which tables to monitor
- What actions to take on new records
- Maintenance tasks to perform
- Monitoring intervals

## Database Details

Your agent is configured for:
- **Server**: `zlnsw9feuf.database.windows.net`
- **Database**: `SeApp2` 
- **Username**: `turtle`
- **Connection**: Encrypted (SSL)

## Troubleshooting

**Connection failed?**
- Check your password in `.env`
- Ensure your IP is allowed in Azure SQL firewall
- Verify the user `turtle` has database access

**No tables showing?**
- User might need `db_datareader` permissions
- Check if database contains tables

**Monitoring not working?**
- Tables need date columns (`CreatedDate`, `Created`, etc.)
- Agent will adapt to your table structure automatically

## Next Steps

1. Customize the `processRecords()` function in `src/index.js`
2. Add specific monitoring logic for your business needs
3. Integrate with external APIs or notification systems
4. Deploy to Azure App Service or Container Instances for production