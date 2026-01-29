# Deploy to Azure App Service Script
# Run this script to deploy your application to Azure

# Configuration - UPDATE THESE VALUES
$RESOURCE_GROUP = "your-resource-group-name"
$APP_NAME = "your-app-name"  # Must be globally unique
$LOCATION = "eastus"  # or your preferred region
$SKU = "B1"  # Basic tier, use "F1" for free tier or "P1V2" for production

Write-Host "🚀 Deploying to Azure App Service" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Step 1: Login to Azure
Write-Host "`n1️⃣ Logging into Azure..." -ForegroundColor Yellow
az login

# Step 2: Create Resource Group (if it doesn't exist)
Write-Host "`n2️⃣ Creating Resource Group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION

# Step 3: Create App Service Plan
Write-Host "`n3️⃣ Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name "$APP_NAME-plan" `
    --resource-group $RESOURCE_GROUP `
    --sku $SKU `
    --is-linux

# Step 4: Create Web App
Write-Host "`n4️⃣ Creating Web App..." -ForegroundColor Yellow
az webapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --plan "$APP_NAME-plan" `
    --runtime "NODE:18-lts"

# Step 5: Configure App Settings (Environment Variables)
Write-Host "`n5️⃣ Configuring Environment Variables..." -ForegroundColor Yellow
# Add your environment variables from .env file
az webapp config appsettings set `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --settings `
        PORT=80 `
        NODE_ENV=production `
        AZURE_SQL_SERVER="zlnsw9feuf.database.windows.net" `
        AZURE_SQL_DATABASE="Complytex" `
        AZURE_SQL_USERNAME="your-username" `
        AZURE_SQL_PASSWORD="your-password" `
        JWT_SECRET="your-jwt-secret"

# Step 6: Deploy the application
Write-Host "`n6️⃣ Deploying Application..." -ForegroundColor Yellow
az webapp up `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --runtime "NODE:18-lts"

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "🌐 Your app is live at: https://$APP_NAME.azurewebsites.net" -ForegroundColor Cyan
Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update environment variables in Azure Portal if needed"
Write-Host "  2. Test your application at the URL above"
Write-Host "  3. Set up custom domain (optional)"
Write-Host "  4. Configure SSL certificate (optional)"
