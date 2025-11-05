/* Stored procedures for Complytex */
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* sp_RegisterOwner: creates tenant + owner user + owner role with full access */
IF OBJECT_ID('dbo.sp_RegisterOwner','P') IS NULL
  EXEC('CREATE PROCEDURE dbo.sp_RegisterOwner AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE dbo.sp_RegisterOwner
  @Email NVARCHAR(256),
  @FullName NVARCHAR(256),
  @PasswordHash VARBINARY(64),
  @PasswordSalt VARBINARY(16),
  @BusinessTypeCode NVARCHAR(64),
  @TenantName NVARCHAR(256)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @tranStarted BIT = 0;

  IF @@TRANCOUNT = 0 BEGIN TRAN; SET @tranStarted = 1;
  BEGIN TRY
    DECLARE @btId INT;
    SELECT @btId = BusinessTypeId FROM dbo.BusinessTypes WHERE Code = @BusinessTypeCode;
    IF @btId IS NULL THROW 50001, 'Invalid BusinessTypeCode', 1;

    -- Create tenant
    DECLARE @tenantId INT;
    INSERT INTO dbo.Tenants(Name, BusinessTypeId) VALUES(@TenantName, @btId);
    SET @tenantId = SCOPE_IDENTITY();

    -- Upsert user by email (allows reusing same global identity across tenants)
    DECLARE @userId INT;
    SELECT @userId = UserId FROM dbo.Users WHERE Email = @Email;
    IF @userId IS NULL
    BEGIN
      INSERT INTO dbo.Users(Email, FullName, PasswordHash, PasswordSalt)
      VALUES(@Email, @FullName, @PasswordHash, @PasswordSalt);
      SET @userId = SCOPE_IDENTITY();
    END

    -- Link to tenant as owner
    INSERT INTO dbo.CompanyUsers(TenantId, UserId, Title, IsOwner)
    VALUES(@tenantId, @userId, N'Owner', 1);

    -- Create Owner role in tenant
    DECLARE @roleId INT;
    INSERT INTO dbo.Roles(TenantId, Name, IsSystem) VALUES(@tenantId, N'Owner', 0);
    SET @roleId = SCOPE_IDENTITY();

    -- Grant all permissions to Owner (assign every permission)
    INSERT INTO dbo.RolePermissions(RoleId, PermissionId)
    SELECT @roleId, p.PermissionId FROM dbo.Permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = @roleId AND rp.PermissionId = p.PermissionId
    );

    -- Assign Owner role to user
    INSERT INTO dbo.UserRoles(TenantId, UserId, RoleId) VALUES(@tenantId, @userId, @roleId);

    -- Audit
    INSERT INTO dbo.AuditLogs(TenantId, UserId, Action, Entity, Details)
    VALUES(@tenantId, @userId, N'RegisterOwner', N'Tenant', @TenantName);

    IF @tranStarted = 1 COMMIT TRAN;

    SELECT @tenantId AS TenantId, @userId AS UserId, @roleId AS RoleId;
  END TRY
  BEGIN CATCH
    IF @tranStarted = 1 AND @@TRANCOUNT > 0 ROLLBACK TRAN;
    DECLARE @err NVARCHAR(4000) = ERROR_MESSAGE();
    THROW 50000, @err, 1;
  END CATCH
END
GO

/* sp_CreateEmployee: create or link user to tenant and assign a role */
IF OBJECT_ID('dbo.sp_CreateEmployee','P') IS NULL
  EXEC('CREATE PROCEDURE dbo.sp_CreateEmployee AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE dbo.sp_CreateEmployee
  @TenantId INT,
  @Email NVARCHAR(256),
  @FullName NVARCHAR(256) = NULL,
  @PasswordHash VARBINARY(64) = NULL,
  @PasswordSalt VARBINARY(16) = NULL,
  @RoleName NVARCHAR(128) = NULL,
  @Title NVARCHAR(128) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @tranStarted BIT = 0;
  IF @@TRANCOUNT = 0 BEGIN TRAN; SET @tranStarted = 1;
  BEGIN TRY
    IF NOT EXISTS(SELECT 1 FROM dbo.Tenants WHERE TenantId = @TenantId)
      THROW 50002, 'Invalid TenantId', 1;

    DECLARE @userId INT;
    SELECT @userId = UserId FROM dbo.Users WHERE Email = @Email;

    IF @userId IS NULL
    BEGIN
      IF @PasswordHash IS NULL OR @PasswordSalt IS NULL THROW 50003, 'Password required for new user', 1;
      INSERT INTO dbo.Users(Email, FullName, PasswordHash, PasswordSalt) VALUES(@Email, @FullName, @PasswordHash, @PasswordSalt);
      SET @userId = SCOPE_IDENTITY();
    END

    IF NOT EXISTS(SELECT 1 FROM dbo.CompanyUsers WHERE TenantId=@TenantId AND UserId=@userId)
      INSERT INTO dbo.CompanyUsers(TenantId, UserId, Title, IsOwner) VALUES(@TenantId, @userId, ISNULL(@Title, N''), 0);

    DECLARE @roleId INT = NULL;
    IF @RoleName IS NOT NULL
    BEGIN
      SELECT @roleId = RoleId FROM dbo.Roles WHERE TenantId = @TenantId AND Name = @RoleName;
      IF @roleId IS NULL
      BEGIN
        INSERT INTO dbo.Roles(TenantId, Name, IsSystem) VALUES(@TenantId, @RoleName, 0);
        SET @roleId = SCOPE_IDENTITY();
      END
      IF NOT EXISTS(SELECT 1 FROM dbo.UserRoles WHERE TenantId=@TenantId AND UserId=@userId AND RoleId=@roleId)
        INSERT INTO dbo.UserRoles(TenantId, UserId, RoleId) VALUES(@TenantId, @userId, @roleId);
    END

    INSERT INTO dbo.AuditLogs(TenantId, UserId, Action, Entity, Details)
    VALUES(@TenantId, @userId, N'CreateEmployee', N'User', @Email);

    IF @tranStarted = 1 COMMIT TRAN;
    SELECT @userId AS UserId, @roleId AS RoleId;
  END TRY
  BEGIN CATCH
    IF @tranStarted = 1 AND @@TRANCOUNT > 0 ROLLBACK TRAN;
    DECLARE @err NVARCHAR(4000) = ERROR_MESSAGE();
    THROW 50000, @err, 1;
  END CATCH
END
GO

/* Helper table type for list of strings */
IF TYPE_ID('dbo.StringList') IS NULL
  CREATE TYPE dbo.StringList AS TABLE (Value NVARCHAR(256));
GO

/* sp_GrantRolePermissions: grants a set of permission codes to a role */
IF OBJECT_ID('dbo.sp_GrantRolePermissions','P') IS NULL
  EXEC('CREATE PROCEDURE dbo.sp_GrantRolePermissions AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE dbo.sp_GrantRolePermissions
  @RoleId INT,
  @PermissionCodes dbo.StringList READONLY
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO dbo.RolePermissions(RoleId, PermissionId)
  SELECT DISTINCT @RoleId, p.PermissionId
  FROM @PermissionCodes s
  JOIN dbo.Permissions p ON p.Code = s.Value
  WHERE NOT EXISTS (
    SELECT 1 FROM dbo.RolePermissions rp WHERE rp.RoleId = @RoleId AND rp.PermissionId = p.PermissionId
  );
END
GO

/* sp_CreateRole: creates a role in a tenant and optionally assigns permissions */
IF OBJECT_ID('dbo.sp_CreateRole','P') IS NULL
  EXEC('CREATE PROCEDURE dbo.sp_CreateRole AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE dbo.sp_CreateRole
  @TenantId INT,
  @RoleName NVARCHAR(128),
  @PermissionCodes dbo.StringList READONLY
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @roleId INT;
  IF EXISTS(SELECT 1 FROM dbo.Roles WHERE TenantId=@TenantId AND Name=@RoleName)
  BEGIN
    SELECT @roleId = RoleId FROM dbo.Roles WHERE TenantId=@TenantId AND Name=@RoleName;
  END
  ELSE
  BEGIN
    INSERT INTO dbo.Roles(TenantId, Name, IsSystem) VALUES(@TenantId, @RoleName, 0);
    SET @roleId = SCOPE_IDENTITY();
  END

  EXEC dbo.sp_GrantRolePermissions @RoleId=@roleId, @PermissionCodes=@PermissionCodes;
  SELECT @roleId AS RoleId;
END
GO

/* sp_AssignUserRole: assigns role to user within tenant */
IF OBJECT_ID('dbo.sp_AssignUserRole','P') IS NULL
  EXEC('CREATE PROCEDURE dbo.sp_AssignUserRole AS BEGIN SET NOCOUNT ON; END');
GO

ALTER PROCEDURE dbo.sp_AssignUserRole
  @TenantId INT,
  @UserId INT,
  @RoleId INT
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS(SELECT 1 FROM dbo.UserRoles WHERE TenantId=@TenantId AND UserId=@UserId AND RoleId=@RoleId)
    INSERT INTO dbo.UserRoles(TenantId, UserId, RoleId) VALUES(@TenantId, @UserId, @RoleId);
  SELECT 'OK' AS Status;
END
GO
