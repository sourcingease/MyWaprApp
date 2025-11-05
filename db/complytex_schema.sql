/* Complytex core schema (SQL Server / Azure SQL) */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* BUSINESS TYPES */
IF OBJECT_ID('dbo.BusinessTypes','U') IS NULL
BEGIN
  CREATE TABLE dbo.BusinessTypes (
    BusinessTypeId INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(64) NOT NULL UNIQUE,
    Name NVARCHAR(128) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_BusinessTypes_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END
GO

/* TENANTS (companies/factories) */
IF OBJECT_ID('dbo.Tenants','U') IS NULL
BEGIN
  CREATE TABLE dbo.Tenants (
    TenantId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(256) NOT NULL,
    BusinessTypeId INT NOT NULL REFERENCES dbo.BusinessTypes(BusinessTypeId),
    ExternalId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Tenants_ExternalId DEFAULT NEWID(),
    IsActive BIT NOT NULL CONSTRAINT DF_Tenants_IsActive DEFAULT (1),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Tenants_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NULL
  );
  CREATE UNIQUE INDEX UX_Tenants_Name ON dbo.Tenants(Name);
END
GO

/* USERS (global identities) */
IF OBJECT_ID('dbo.Users','U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(256) NOT NULL UNIQUE,
    FullName NVARCHAR(256) NULL,
    PasswordHash VARBINARY(64) NOT NULL,
    PasswordSalt VARBINARY(16) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    EmailVerified BIT NOT NULL CONSTRAINT DF_Users_EmailVerified DEFAULT (0),
    TwoFAEnabled BIT NOT NULL CONSTRAINT DF_Users_TwoFAEnabled DEFAULT (0),
    TwoFASecret VARBINARY(128) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NULL
  );
END
GO

/* EMAIL VERIFICATION TOKENS */
IF OBJECT_ID('dbo.EmailVerifications','U') IS NULL
BEGIN
  CREATE TABLE dbo.EmailVerifications (
    TokenId UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() PRIMARY KEY,
    UserId INT NOT NULL REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    Token NVARCHAR(128) NOT NULL UNIQUE,
    ExpiresAt DATETIME2(3) NOT NULL,
    Used BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

/* VISITOR LOGS */
IF OBJECT_ID('dbo.VisitorLogs','U') IS NULL
BEGIN
  CREATE TABLE dbo.VisitorLogs (
    LogId BIGINT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NULL,
    UserId INT NULL,
    Path NVARCHAR(512) NOT NULL,
    Method NVARCHAR(16) NOT NULL,
    IP NVARCHAR(64) NULL,
    UserAgent NVARCHAR(512) NULL,
    Referrer NVARCHAR(512) NULL,
    Country NVARCHAR(64) NULL,
    Region NVARCHAR(64) NULL,
    City NVARCHAR(64) NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_VisitorLogs_Tenant_Time ON dbo.VisitorLogs(TenantId, CreatedAt DESC);
END
GO

/* BILLING */
IF OBJECT_ID('dbo.Subscriptions','U') IS NULL
BEGIN
  CREATE TABLE dbo.Subscriptions (
    SubscriptionId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL REFERENCES dbo.Tenants(TenantId) ON DELETE CASCADE,
    StripeCustomerId NVARCHAR(128) NULL,
    StripeSubscriptionId NVARCHAR(128) NULL,
    Status NVARCHAR(32) NOT NULL DEFAULT 'inactive',
    CurrentPeriodEnd DATETIME2(3) NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.Invoices','U') IS NULL
BEGIN
  CREATE TABLE dbo.Invoices (
    InvoiceId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL REFERENCES dbo.Tenants(TenantId) ON DELETE CASCADE,
    StripeInvoiceId NVARCHAR(128) NULL,
    AmountCents INT NOT NULL,
    Currency NVARCHAR(16) NOT NULL DEFAULT 'usd',
    Status NVARCHAR(32) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

/* SUPPORT TICKETS */
IF OBJECT_ID('dbo.Tickets','U') IS NULL
BEGIN
  CREATE TABLE dbo.Tickets (
    TicketId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NULL,
    CreatedBy INT NULL REFERENCES dbo.Users(UserId),
    Subject NVARCHAR(256) NOT NULL,
    Status NVARCHAR(32) NOT NULL DEFAULT 'open',
    Priority NVARCHAR(16) NOT NULL DEFAULT 'normal',
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.TicketMessages','U') IS NULL
BEGIN
  CREATE TABLE dbo.TicketMessages (
    MessageId INT IDENTITY(1,1) PRIMARY KEY,
    TicketId INT NOT NULL REFERENCES dbo.Tickets(TicketId) ON DELETE CASCADE,
    UserId INT NULL REFERENCES dbo.Users(UserId),
    Message NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

/* COMPANY USER MEMBERSHIP (multi-tenant) */
IF OBJECT_ID('dbo.CompanyUsers','U') IS NULL
BEGIN
  CREATE TABLE dbo.CompanyUsers (
    CompanyUserId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL REFERENCES dbo.Tenants(TenantId) ON DELETE CASCADE,
    UserId INT NOT NULL REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    Title NVARCHAR(128) NULL,
    IsOwner BIT NOT NULL CONSTRAINT DF_CompanyUsers_IsOwner DEFAULT (0),
    IsActive BIT NOT NULL CONSTRAINT DF_CompanyUsers_IsActive DEFAULT (1),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_CompanyUsers_CreatedAt DEFAULT SYSUTCDATETIME()
  );
  CREATE UNIQUE INDEX UX_CompanyUsers_Tenant_User ON dbo.CompanyUsers(TenantId, UserId);
END
GO

/* MODULES available in app */
IF OBJECT_ID('dbo.Modules','U') IS NULL
BEGIN
  CREATE TABLE dbo.Modules (
    ModuleId INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(64) NOT NULL UNIQUE,
    Name NVARCHAR(128) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Modules_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END
GO

/* PERMISSIONS (granular), optionally linked to Module */
IF OBJECT_ID('dbo.Permissions','U') IS NULL
BEGIN
  CREATE TABLE dbo.Permissions (
    PermissionId INT IDENTITY(1,1) PRIMARY KEY,
    Code NVARCHAR(128) NOT NULL UNIQUE,
    Description NVARCHAR(512) NULL,
    ModuleId INT NULL REFERENCES dbo.Modules(ModuleId)
  );
END
GO

/* ROLES per tenant (system-wide templates use NULL TenantId) */
IF OBJECT_ID('dbo.Roles','U') IS NULL
BEGIN
  CREATE TABLE dbo.Roles (
    RoleId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NULL REFERENCES dbo.Tenants(TenantId) ON DELETE CASCADE,
    Name NVARCHAR(128) NOT NULL,
    IsSystem BIT NOT NULL CONSTRAINT DF_Roles_IsSystem DEFAULT (0),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSUTCDATETIME()
  );
  CREATE UNIQUE INDEX UX_Roles_Tenant_Name ON dbo.Roles(TenantId, Name);
END
GO

/* ROLE-PERMISSIONS */
IF OBJECT_ID('dbo.RolePermissions','U') IS NULL
BEGIN
  CREATE TABLE dbo.RolePermissions (
    RoleId INT NOT NULL REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE,
    PermissionId INT NOT NULL REFERENCES dbo.Permissions(PermissionId) ON DELETE CASCADE,
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleId, PermissionId)
  );
END
GO

/* USER-ROLES within tenant */
IF OBJECT_ID('dbo.UserRoles','U') IS NULL
BEGIN
  CREATE TABLE dbo.UserRoles (
    TenantId INT NOT NULL REFERENCES dbo.Tenants(TenantId), -- no cascade to avoid multiple cascade paths
    UserId INT NOT NULL REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    RoleId INT NOT NULL REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE,
    PRIMARY KEY (TenantId, UserId, RoleId)
  );
END
GO

/* AUDIT LOGS */
IF OBJECT_ID('dbo.AuditLogs','U') IS NULL
BEGIN
  CREATE TABLE dbo.AuditLogs (
    AuditId BIGINT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NULL,
    UserId INT NULL,
    Action NVARCHAR(128) NOT NULL,
    Entity NVARCHAR(128) NULL,
    EntityId NVARCHAR(128) NULL,
    Details NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_AuditLogs_Tenant_Time ON dbo.AuditLogs(TenantId, CreatedAt DESC);
END
GO

/* CUSTOMERS and SUPPLIERS (placeholders) */
IF OBJECT_ID('dbo.Customers','U') IS NULL
BEGIN
  CREATE TABLE dbo.Customers (
    CustomerId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL REFERENCES dbo.Tenants(TenantId) ON DELETE CASCADE,
    Name NVARCHAR(256) NOT NULL,
    Email NVARCHAR(256) NULL,
    Phone NVARCHAR(64) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Customers_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.Suppliers','U') IS NULL
BEGIN
  CREATE TABLE dbo.Suppliers (
    SupplierId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL REFERENCES dbo.Tenants(TenantId) ON DELETE CASCADE,
    Name NVARCHAR(256) NOT NULL,
    Email NVARCHAR(256) NULL,
    Phone NVARCHAR(64) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Suppliers_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END
GO

/* CERTIFICATIONS (placeholder) */
IF OBJECT_ID('dbo.Certifications','U') IS NULL
BEGIN
  CREATE TABLE dbo.Certifications (
    CertificationId INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL REFERENCES dbo.Tenants(TenantId) ON DELETE CASCADE,
    Name NVARCHAR(256) NOT NULL,
    Issuer NVARCHAR(256) NULL,
    IssueDate DATE NULL,
    ExpiryDate DATE NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Certifications_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END
GO

/* SIMPLE permission check function */
IF OBJECT_ID('dbo.fn_HasPermission','FN') IS NULL
BEGIN
  EXEC ('CREATE FUNCTION dbo.fn_HasPermission(@TenantId INT, @UserId INT, @PermissionCode NVARCHAR(128)) RETURNS BIT AS BEGIN RETURN 0 END');
END
GO

ALTER FUNCTION dbo.fn_HasPermission(@TenantId INT, @UserId INT, @PermissionCode NVARCHAR(128))
RETURNS BIT
AS
BEGIN
  DECLARE @permId INT;
  SELECT @permId = PermissionId FROM dbo.Permissions WHERE Code = @PermissionCode;
  IF @permId IS NULL RETURN 0;

  IF EXISTS (
    SELECT 1
    FROM dbo.UserRoles ur
    JOIN dbo.RolePermissions rp ON rp.RoleId = ur.RoleId
    WHERE ur.TenantId = @TenantId AND ur.UserId = @UserId AND rp.PermissionId = @permId
  ) RETURN 1;

  RETURN 0;
END
GO
