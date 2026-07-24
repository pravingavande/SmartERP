-- Run on the SAME database used by the live API connection string (SmartERP_TESTING).
-- If any object is NULL below, run: database/scripts/043_Inward_Outward_Register.sql

SET NOCOUNT ON;

SELECT
    OBJECT_ID(N'dbo.YearIOMaster', N'U') AS YearIOMasterTable,
    OBJECT_ID(N'dbo.InwardRegister', N'U') AS InwardRegisterTable,
    OBJECT_ID(N'dbo.OutwardRegister', N'U') AS OutwardRegisterTable,
    OBJECT_ID(N'dbo.sp_IO_GetLookups', N'P') AS SpIoGetLookups,
    OBJECT_ID(N'dbo.sp_Inward_GetList', N'P') AS SpInwardGetList,
    OBJECT_ID(N'dbo.sp_Inward_GetNextRecordNo', N'P') AS SpInwardGetNextRecordNo,
    OBJECT_ID(N'dbo.sp_Inward_Save', N'P') AS SpInwardSave;

GO
