-- Migration: Add CRM, HR, Job Posting, Tasks, Email, Chat, and Accounting tables
-- Date: 2025-10-29
-- Target: Azure SQL / SQL Server

SET NOCOUNT ON;

/* =========================
   HR & Employees
   ========================= */
IF OBJECT_ID('dbo.Employees','U') IS NULL
BEGIN
  CREATE TABLE dbo.Employees(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    Email NVARCHAR(320) NOT NULL UNIQUE,
    FullName NVARCHAR(200) NOT NULL,
    Title NVARCHAR(120) NULL,
    IsOwner BIT NOT NULL DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NULL
  );
END
GO

-- Job Postings & Applicants
IF OBJECT_ID('dbo.JobPostings','U') IS NULL
BEGIN
  CREATE TABLE dbo.JobPostings(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Requirements NVARCHAR(MAX) NULL,
    Status NVARCHAR(40) NOT NULL DEFAULT('Open'),
    PostedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.Applicants','U') IS NULL
BEGIN
  CREATE TABLE dbo.Applicants(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    JobPostingId INT NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Email NVARCHAR(320) NULL,
    Status NVARCHAR(40) NOT NULL DEFAULT('Applied'),
    ResumeUrl NVARCHAR(500) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Applicants_JobPostings FOREIGN KEY(JobPostingId) REFERENCES dbo.JobPostings(Id) ON DELETE CASCADE
  );
END
GO

/* =========================
   CRM
   ========================= */
IF OBJECT_ID('dbo.Contacts','U') IS NULL
BEGIN
  CREATE TABLE dbo.Contacts(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    CompanyName NVARCHAR(200) NOT NULL,
    PrimaryName NVARCHAR(200) NULL,
    Email NVARCHAR(320) NULL,
    Phone NVARCHAR(50) NULL,
    Address NVARCHAR(400) NULL,
    Website NVARCHAR(300) NULL,
    Status NVARCHAR(40) NOT NULL DEFAULT('Prospect'),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.ContactPersons','U') IS NULL
BEGIN
  CREATE TABLE dbo.ContactPersons(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    ContactId INT NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Email NVARCHAR(320) NULL,
    Phone NVARCHAR(50) NULL,
    Title NVARCHAR(120) NULL,
    CONSTRAINT FK_ContactPersons_Contacts FOREIGN KEY(ContactId) REFERENCES dbo.Contacts(Id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.Leads','U') IS NULL
BEGIN
  CREATE TABLE dbo.Leads(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    ContactId INT NOT NULL,
    OwnerUserId INT NULL,
    Status NVARCHAR(40) NOT NULL DEFAULT('New'),
    EstimatedValue DECIMAL(18,2) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Leads_Contacts FOREIGN KEY(ContactId) REFERENCES dbo.Contacts(Id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.Accounts','U') IS NULL
BEGIN
  CREATE TABLE dbo.Accounts(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    ContactId INT NOT NULL,
    OwnerUserId INT NULL,
    Stage NVARCHAR(40) NOT NULL DEFAULT('Active'),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Accounts_Contacts FOREIGN KEY(ContactId) REFERENCES dbo.Contacts(Id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.PhoneNotes','U') IS NULL
BEGIN
  CREATE TABLE dbo.PhoneNotes(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    ContactId INT NOT NULL,
    CreatedByUserId INT NULL,
    Note NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PhoneNotes_Contacts FOREIGN KEY(ContactId) REFERENCES dbo.Contacts(Id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.Segments','U') IS NULL
BEGIN
  CREATE TABLE dbo.Segments(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.SegmentMembers','U') IS NULL
BEGIN
  CREATE TABLE dbo.SegmentMembers(
    SegmentId INT NOT NULL,
    ContactId INT NOT NULL,
    TenantId INT NOT NULL,
    PRIMARY KEY(SegmentId, ContactId),
    CONSTRAINT FK_SegmentMembers_Segments FOREIGN KEY(SegmentId) REFERENCES dbo.Segments(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SegmentMembers_Contacts FOREIGN KEY(ContactId) REFERENCES dbo.Contacts(Id) ON DELETE CASCADE
  );
END
GO

/* =========================
   Tasks / Scheduler
   ========================= */
IF OBJECT_ID('dbo.Tasks','U') IS NULL
BEGIN
  CREATE TABLE dbo.Tasks(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    [Date] DATE NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    AssigneeId INT NOT NULL,
    StartHour TINYINT NOT NULL CHECK(StartHour BETWEEN 0 AND 23),
    EndHour TINYINT NOT NULL CHECK(EndHour BETWEEN 1 AND 24),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_Tasks_Tenant_Date_Assignee ON dbo.Tasks(TenantId, [Date], AssigneeId);
END
GO

/* =========================
   Email / Mailbox
   ========================= */
IF OBJECT_ID('dbo.Emails','U') IS NULL
BEGIN
  CREATE TABLE dbo.Emails(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    UserId INT NULL,
    Folder NVARCHAR(20) NOT NULL DEFAULT('Inbox'),
    FromAddress NVARCHAR(320) NULL,
    ToAddresses NVARCHAR(MAX) NULL,
    Subject NVARCHAR(500) NULL,
    Body NVARCHAR(MAX) NULL,
    SentAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

/* =========================
   Chat
   ========================= */
IF OBJECT_ID('dbo.ChatSessions','U') IS NULL
BEGIN
  CREATE TABLE dbo.ChatSessions(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    Topic NVARCHAR(200) NULL,
    CreatedByUserId INT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.ChatParticipants','U') IS NULL
BEGIN
  CREATE TABLE dbo.ChatParticipants(
    SessionId INT NOT NULL,
    UserId INT NOT NULL,
    TenantId INT NOT NULL,
    PRIMARY KEY(SessionId, UserId),
    CONSTRAINT FK_ChatParticipants_Sessions FOREIGN KEY(SessionId) REFERENCES dbo.ChatSessions(Id) ON DELETE CASCADE
  );
END
GO

IF OBJECT_ID('dbo.ChatMessages','U') IS NULL
BEGIN
  CREATE TABLE dbo.ChatMessages(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    SessionId INT NOT NULL,
    SenderUserId INT NULL,
    Message NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_ChatMessages_Sessions FOREIGN KEY(SessionId) REFERENCES dbo.ChatSessions(Id) ON DELETE CASCADE
  );
END
GO

/* =========================
   Accounting (Petty Cash, AP/AR)
   ========================= */
IF OBJECT_ID('dbo.PettyCashTransactions','U') IS NULL
BEGIN
  CREATE TABLE dbo.PettyCashTransactions(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    [Date] DATE NOT NULL,
    Description NVARCHAR(400) NOT NULL,
    [Type] NVARCHAR(10) NOT NULL CHECK([Type] IN('Credit','Debit')),
    Amount DECIMAL(18,2) NOT NULL,
    PaidTo NVARCHAR(200) NULL,
    Category NVARCHAR(120) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.Payables','U') IS NULL
BEGIN
  CREATE TABLE dbo.Payables(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    SupplierName NVARCHAR(200) NOT NULL,
    InvoiceNumber NVARCHAR(80) NOT NULL,
    IssueDate DATE NULL,
    DueDate DATE NULL,
    Amount DECIMAL(18,2) NOT NULL,
    AmountPaid DECIMAL(18,2) NOT NULL DEFAULT(0),
    Status NVARCHAR(20) NOT NULL DEFAULT('Unpaid'),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

IF OBJECT_ID('dbo.Receivables','U') IS NULL
BEGIN
  CREATE TABLE dbo.Receivables(
    Id INT IDENTITY(1,1) PRIMARY KEY,
    TenantId INT NOT NULL,
    CustomerName NVARCHAR(200) NOT NULL,
    InvoiceNumber NVARCHAR(80) NOT NULL,
    IssueDate DATE NULL,
    DueDate DATE NULL,
    Amount DECIMAL(18,2) NOT NULL,
    AmountReceived DECIMAL(18,2) NOT NULL DEFAULT(0),
    Status NVARCHAR(20) NOT NULL DEFAULT('Unpaid'),
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
GO

PRINT 'Migration completed successfully.';
