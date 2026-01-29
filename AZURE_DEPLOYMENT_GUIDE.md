# Azure App Service Deployment Guide

This guide will help you deploy your Node.js application to Azure App Service.

## Prerequisites

1. **Azure Account**: Sign up at [https://azure.microsoft.com](https://azure.microsoft.com)
2. **Azure CLI**: Install from [https://aka.ms/installazurecliwindows](https://aka.ms/installazurecliwindows) or run:
   ```powershell
   winget install Microsoft.AzureCLI
   ```

## Deployment Methods

### Method 1: Quick Deploy with PowerShell Script (Recommended)

1. **Update Configuration**:
   Open `deploy-to-azure.ps1` and update:
   - `$RESOURCE_GROUP`: Your resource group name (e.g., "complytex-rg")
   - `$APP_NAME`: Your app name (must be globally unique, e.g., "complytex-app-123")
   - `$LOCATION`: Azure region (e.g., "eastus", "westus2")
   - `$SKU`: Pricing tier ("F1" for Free, "B1" for Basic, "P1V2" for Production)

2. **Add Environment Variables**:
   In the script, update the environment variables section with your actual values:
   ```powershell
   AZURE_SQL_SERVER="your-server.database.windows.net"
   AZURE_SQL_USERNAME="your-username"
   AZURE_SQL_PASSWORD="your-password"
   JWT_SECRET="your-secret-key"
   ```

3. **Run Deployment**:
   ```powershell
   .\deploy-to-azure.ps1
   ```

### Method 2: Manual Deployment via Azure CLI

```powershell
# Login to Azure
az login

# Create Resource Group
az group create --name "complytex-rg" --location "eastus"

# Create App Service Plan
az appservice plan create --name "complytex-plan" --resource-group "complytex-rg" --sku B1 --is-linux

# Create Web App
az webapp create --name "your-unique-app-name" --resource-group "complytex-rg" --plan "complytex-plan" --runtime "NODE:18-lts"

# Configure Environment Variables
az webapp config appsettings set --name "your-unique-app-name" --resource-group "complytex-rg" --settings PORT=80 NODE_ENV=production

# Deploy from local git
az webapp deployment source config-local-git --name "your-unique-app-name" --resource-group "complytex-rg"

# Deploy the code
az webapp up --name "your-unique-app-name" --resource-group "complytex-rg"
```

### Method 3: Deploy via VS Code Extension

1. **Install Extension**:
   - Open VS Code Extensions (Ctrl+Shift+X)
   - Search for "Azure App Service"
   - Install the extension

2. **Sign in to Azure**:
   - Click Azure icon in sidebar
   - Sign in with your Azure account

3. **Create and Deploy**:
   - Right-click in the Azure App Service panel
   - Select "Create New Web App"
   - Follow the prompts
   - Right-click your app → "Deploy to Web App"

### Method 4: Deploy via GitHub Actions (CI/CD)

1. Create `.github/workflows/azure-deploy.yml`:
   ```yaml
   name: Deploy to Azure App Service
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v2
       
       - name: Set up Node.js
         uses: actions/setup-node@v2
         with:
           node-version: '18'
       
       - name: Install dependencies
         run: npm install
       
       - name: Deploy to Azure
         uses: azure/webapps-deploy@v2
         with:
           app-name: 'your-app-name'
           publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
           package: .
   ```

2. Get Publish Profile from Azure Portal → App Service → Download publish profile
3. Add it as a GitHub Secret named `AZURE_WEBAPP_PUBLISH_PROFILE`

## Post-Deployment Configuration

### 1. Configure Environment Variables in Azure Portal

1. Go to Azure Portal → Your App Service
2. Navigate to **Configuration** → **Application Settings**
3. Add all variables from your `.env` file:
   - `AZURE_SQL_SERVER`
   - `AZURE_SQL_DATABASE`
   - `AZURE_SQL_USERNAME`
   - `AZURE_SQL_PASSWORD`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `PORT=80`

### 2. Configure Database Connection

Make sure your Azure SQL Database firewall allows connections from Azure services:
1. Go to Azure Portal → SQL Server
2. Navigate to **Firewalls and virtual networks**
3. Enable "Allow Azure services and resources to access this server"

### 3. Enable Logging

```powershell
az webapp log config --name "your-app-name" --resource-group "complytex-rg" --application-logging filesystem --level information
```

View logs:
```powershell
az webapp log tail --name "your-app-name" --resource-group "complytex-rg"
```

Or in Azure Portal → App Service → Log stream

### 4. Set Custom Domain (Optional)

1. Go to Azure Portal → App Service → Custom domains
2. Add your domain
3. Configure DNS records as shown

### 5. Configure SSL Certificate

Azure provides free SSL for *.azurewebsites.net domains.

For custom domains:
1. Go to Azure Portal → App Service → TLS/SSL settings
2. Add certificate (free managed certificate available)
3. Add TLS/SSL binding

## Troubleshooting

### Check Application Logs
```powershell
az webapp log tail --name "your-app-name" --resource-group "complytex-rg"
```

### Restart the App
```powershell
az webapp restart --name "your-app-name" --resource-group "complytex-rg"
```

### SSH into Container (Linux)
```powershell
az webapp ssh --name "your-app-name" --resource-group "complytex-rg"
```

### Common Issues

1. **App Won't Start**: Check logs and verify environment variables
2. **Database Connection Failed**: Verify SQL firewall rules and connection string
3. **Port Issues**: Azure assigns port automatically, use `process.env.PORT`
4. **Build Failures**: Check package.json scripts and node version

## Pricing Tiers

- **F1 (Free)**: Good for testing, limited resources
- **B1 (Basic)**: ~$13/month, good for small apps
- **S1 (Standard)**: ~$70/month, includes staging slots
- **P1V2 (Premium)**: ~$85/month, better performance and scaling

## Useful Commands

```powershell
# View app details
az webapp show --name "your-app-name" --resource-group "complytex-rg"

# Browse the app
az webapp browse --name "your-app-name" --resource-group "complytex-rg"

# Stop the app
az webapp stop --name "your-app-name" --resource-group "complytex-rg"

# Start the app
az webapp start --name "your-app-name" --resource-group "complytex-rg"

# Delete the app
az webapp delete --name "your-app-name" --resource-group "complytex-rg"
```

## Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Node.js on Azure](https://docs.microsoft.com/azure/app-service/quickstart-nodejs)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/webapp)
