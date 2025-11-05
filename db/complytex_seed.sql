/* Seed data for Complytex (modules, permissions, business types) */
SET NOCOUNT ON;

/* BUSINESS TYPES */
MERGE dbo.BusinessTypes AS t
USING (VALUES
  (N'Buyer', N'Buyer'),
  (N'Manufacturer', N'Manufacturer'),
  (N'Supplier', N'Supplier'),
  (N'Designer', N'Designer'),
  (N'SafetyAuditor', N'Safety Auditor'),
  (N'SafetyOffice', N'Safety Office'),
  (N'Inspection', N'Inspection')
) AS s(Code, Name)
ON t.Code = s.Code
WHEN NOT MATCHED THEN INSERT (Code, Name) VALUES (s.Code, s.Name);

/* MODULES */
MERGE dbo.Modules AS m
USING (VALUES
  (N'MARKETING', N'Marketing'),
  (N'JOB_POSTING', N'Job Posting'),
  (N'HR', N'Human Resources'),
  (N'WHOLESALE', N'Wholesale'),
  (N'RETAIL', N'Retail'),
  (N'CRM', N'CRM'),
  (N'ACCOUNTING', N'Accounting'),
  (N'PROFILE', N'Profile Setup'),
  (N'RBAC', N'Roles & Access'),
  (N'CERTIFICATION', N'Certifications'),
  (N'CUSTOMERS', N'Customers'),
  (N'SUPPLIERS', N'Suppliers'),
  (N'TASKS', N'Task Management'),
  (N'CHAT', N'Chat'),
  (N'EMAIL', N'Email')
) AS s(Code, Name)
ON m.Code = s.Code
WHEN NOT MATCHED THEN INSERT (Code, Name) VALUES (s.Code, s.Name);

/* PERMISSIONS: VIEW/MANAGE per module */
DECLARE @moduleId INT, @code NVARCHAR(64), @view NVARCHAR(128), @manage NVARCHAR(128);
DECLARE cur CURSOR FOR SELECT ModuleId, Code FROM dbo.Modules;
OPEN cur; FETCH NEXT FROM cur INTO @moduleId, @code;
WHILE @@FETCH_STATUS = 0
BEGIN
  SET @view = CONCAT(N'MODULE_VIEW_', @code);
  SET @manage = CONCAT(N'MODULE_MANAGE_', @code);
  IF NOT EXISTS (SELECT 1 FROM dbo.Permissions WHERE Code = @view)
    INSERT INTO dbo.Permissions(Code, Description, ModuleId) VALUES(@view, CONCAT('View access to ', @code), @moduleId);
  IF NOT EXISTS (SELECT 1 FROM dbo.Permissions WHERE Code = @manage)
    INSERT INTO dbo.Permissions(Code, Description, ModuleId) VALUES(@manage, CONCAT('Manage access to ', @code), @moduleId);
  FETCH NEXT FROM cur INTO @moduleId, @code;
END
CLOSE cur; DEALLOCATE cur;

/* SYSTEM PERMISSIONS */
MERGE dbo.Permissions AS p
USING (VALUES
  (N'TENANT_ADMIN', N'Full administrative access for a tenant', NULL),
  (N'USER_MANAGE', N'Create/update users and roles', NULL)
) AS s(Code, Description, ModuleId)
ON p.Code = s.Code
WHEN NOT MATCHED THEN INSERT (Code, Description, ModuleId) VALUES (s.Code, s.Description, s.ModuleId);
