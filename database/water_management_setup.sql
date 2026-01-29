-- Water Management Tables for Production Module
-- ================================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS waste_management;
DROP TABLE IF EXISTS water_waste;
DROP TABLE IF EXISTS water_recycling;
DROP TABLE IF EXISTS water_discharge_quality;
DROP TABLE IF EXISTS water_usage;
DROP TABLE IF EXISTS water_rain_collection;
DROP TABLE IF EXISTS water_buying;
GO

-- Drop existing stored procedures if they exist
DROP PROCEDURE IF EXISTS sp_water_buying_create;
DROP PROCEDURE IF EXISTS sp_water_buying_read;
DROP PROCEDURE IF EXISTS sp_water_buying_update;
DROP PROCEDURE IF EXISTS sp_water_buying_delete;
DROP PROCEDURE IF EXISTS sp_water_rain_create;
DROP PROCEDURE IF EXISTS sp_water_rain_read;
DROP PROCEDURE IF EXISTS sp_water_rain_update;
DROP PROCEDURE IF EXISTS sp_water_rain_delete;
DROP PROCEDURE IF EXISTS sp_water_usage_create;
DROP PROCEDURE IF EXISTS sp_water_usage_read;
DROP PROCEDURE IF EXISTS sp_water_usage_update;
DROP PROCEDURE IF EXISTS sp_water_usage_delete;
DROP PROCEDURE IF EXISTS sp_water_discharge_create;
DROP PROCEDURE IF EXISTS sp_water_discharge_read;
DROP PROCEDURE IF EXISTS sp_water_discharge_update;
DROP PROCEDURE IF EXISTS sp_water_discharge_delete;
DROP PROCEDURE IF EXISTS sp_water_recycling_create;
DROP PROCEDURE IF EXISTS sp_water_recycling_read;
DROP PROCEDURE IF EXISTS sp_water_recycling_update;
DROP PROCEDURE IF EXISTS sp_water_recycling_delete;
DROP PROCEDURE IF EXISTS sp_water_waste_create;
DROP PROCEDURE IF EXISTS sp_water_waste_read;
DROP PROCEDURE IF EXISTS sp_water_waste_update;
DROP PROCEDURE IF EXISTS sp_water_waste_delete;
DROP PROCEDURE IF EXISTS sp_waste_management_create;
DROP PROCEDURE IF EXISTS sp_waste_management_read;
DROP PROCEDURE IF EXISTS sp_waste_management_update;
DROP PROCEDURE IF EXISTS sp_waste_management_delete;
GO

-- Table for Water Buying/Purchasing
CREATE TABLE water_buying (
    id INT IDENTITY(1,1) PRIMARY KEY,
    supplier_name NVARCHAR(255) NOT NULL,
    supplier_contact NVARCHAR(255) NOT NULL,
    date_of_purchase DATE NOT NULL,
    quantity_purchased DECIMAL(10, 2) NOT NULL,
    unit NVARCHAR(50) NOT NULL,
    cost_per_unit DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    payment_method NVARCHAR(100) NOT NULL,
    invoice_number NVARCHAR(100) NOT NULL UNIQUE,
    water_tank NVARCHAR(100) NOT NULL,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100),
    updated_by NVARCHAR(100)
);
GO

-- Table for Water from Rain Collection
CREATE TABLE water_rain_collection (
    id INT IDENTITY(1,1) PRIMARY KEY,
    collection_date DATE NOT NULL,
    collection_location NVARCHAR(255) NOT NULL,
    quantity_collected DECIMAL(10, 2) NOT NULL,
    collection_unit NVARCHAR(50) NOT NULL,
    rain_tank NVARCHAR(100) NOT NULL,
    water_quality NVARCHAR(50) NOT NULL,
    treatment_required NVARCHAR(10) NOT NULL,
    treatment_type NVARCHAR(255),
    collected_by NVARCHAR(100) NOT NULL,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100),
    updated_by NVARCHAR(100)
);
GO

-- Table for Water Usage
CREATE TABLE water_usage (
    id INT IDENTITY(1,1) PRIMARY KEY,
    department NVARCHAR(100) NOT NULL,
    date_of_usage DATE NOT NULL,
    quantity_used DECIMAL(10, 2) NOT NULL,
    unit NVARCHAR(50) NOT NULL,
    purpose_of_usage NVARCHAR(255) NOT NULL,
    water_efficient_tech NVARCHAR(255) NOT NULL,
    reduction_percentage DECIMAL(5, 2),
    source_of_water NVARCHAR(100) NOT NULL,
    available_qty DECIMAL(10, 2),
    usage_month DATE,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100),
    updated_by NVARCHAR(100)
);
GO

-- Table for Water Recycling
CREATE TABLE water_recycling (
    id INT IDENTITY(1,1) PRIMARY KEY,
    department NVARCHAR(100) NOT NULL,
    date_of_recycling DATE NOT NULL,
    recycling_method NVARCHAR(255) NOT NULL,
    quantity_recycled DECIMAL(10, 2) NOT NULL,
    unit NVARCHAR(50) NOT NULL,
    water_tank NVARCHAR(100) NOT NULL,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100),
    updated_by NVARCHAR(100)
);
GO

-- Table for Water Waste
CREATE TABLE water_waste (
    id INT IDENTITY(1,1) PRIMARY KEY,
    department NVARCHAR(100) NOT NULL,
    date_of_waste_generation DATE NOT NULL,
    quantity_of_wastewater DECIMAL(10, 2) NOT NULL,
    unit NVARCHAR(50) NOT NULL,
    type_of_wastewater NVARCHAR(255) NOT NULL,
    wastewater_treatment_process NVARCHAR(255) NOT NULL,
    percentage_of_pollutant_removal DECIMAL(5, 2),
    disposal_method NVARCHAR(255) NOT NULL,
    quantity_disposed DECIMAL(10, 2) NOT NULL,
    disposed_unit NVARCHAR(50) NOT NULL,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100),
    updated_by NVARCHAR(100)
);
GO

-- Table for Waste Management
CREATE TABLE waste_management (
    id INT IDENTITY(1,1) PRIMARY KEY,
    date_of_waste_generation DATE NOT NULL,
    waste_category NVARCHAR(100) NOT NULL,
    type_of_waste NVARCHAR(255) NOT NULL,
    quantity_of_waste DECIMAL(10, 2) NOT NULL,
    unit NVARCHAR(50) NOT NULL,
    source_of_waste NVARCHAR(255) NOT NULL,
    collection_method NVARCHAR(100) NOT NULL,
    storage_method NVARCHAR(100) NOT NULL,
    storage_duration_days INT NOT NULL,
    warehouse_name NVARCHAR(100) NOT NULL,
    location NVARCHAR(255) NOT NULL,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100),
    updated_by NVARCHAR(100)
);
GO

-- Table for Water Discharge Quality Monitoring
CREATE TABLE water_discharge_quality (
    id INT IDENTITY(1,1) PRIMARY KEY,
    monitoring_frequency NVARCHAR(50) NOT NULL,
    sampling_points_locations NVARCHAR(255) NOT NULL,
    person_responsible NVARCHAR(255) NOT NULL,
    comments_observations NVARCHAR(MAX),
    laboratory_used NVARCHAR(255),
    parameters_monitored NVARCHAR(100) NOT NULL,
    result_value DECIMAL(10, 4),
    units NVARCHAR(50),
    compliance_standards NVARCHAR(255),
    monitoring_equipment NVARCHAR(255),
    monitoring_date DATE NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    created_by NVARCHAR(100),
    updated_by NVARCHAR(100)
);
GO

-- Create indexes for Water Discharge Quality Monitoring
CREATE INDEX idx_water_discharge_date ON water_discharge_quality(monitoring_date);
GO

CREATE INDEX idx_water_discharge_parameter ON water_discharge_quality(parameters_monitored);
GO

CREATE INDEX idx_water_recycling_date ON water_recycling(date_of_recycling);
GO

CREATE INDEX idx_water_recycling_department ON water_recycling(department);
GO

CREATE INDEX idx_water_waste_date ON water_waste(date_of_waste_generation);
GO

CREATE INDEX idx_water_waste_department ON water_waste(department);
GO

CREATE INDEX idx_waste_management_date ON waste_management(date_of_waste_generation);
GO

CREATE INDEX idx_waste_management_category ON waste_management(waste_category);
GO

CREATE INDEX idx_waste_management_warehouse ON waste_management(warehouse_name);
GO

CREATE INDEX idx_water_buying_date ON water_buying(date_of_purchase);
GO

CREATE INDEX idx_water_buying_tank ON water_buying(water_tank);
GO

CREATE INDEX idx_water_rain_date ON water_rain_collection(collection_date);
GO

CREATE INDEX idx_water_usage_date ON water_usage(date_of_usage);
GO

CREATE INDEX idx_water_usage_department ON water_usage(department);
GO

-- Create stored procedures for CRUD operations

-- Water Buying Stored Procedures
CREATE PROCEDURE sp_water_buying_create
    @supplier_name NVARCHAR(255),
    @supplier_contact NVARCHAR(255),
    @date_of_purchase DATE,
    @quantity_purchased DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @cost_per_unit DECIMAL(10, 2),
    @total_cost DECIMAL(10, 2),
    @payment_method NVARCHAR(100),
    @invoice_number NVARCHAR(100),
    @water_tank NVARCHAR(100),
    @notes NVARCHAR(MAX),
    @created_by NVARCHAR(100)
AS
BEGIN
    INSERT INTO water_buying (
        supplier_name, supplier_contact, date_of_purchase, quantity_purchased,
        unit, cost_per_unit, total_cost, payment_method, invoice_number,
        water_tank, notes, created_by, updated_by
    ) VALUES (
        @supplier_name, @supplier_contact, @date_of_purchase, @quantity_purchased,
        @unit, @cost_per_unit, @total_cost, @payment_method, @invoice_number,
        @water_tank, @notes, @created_by, @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE PROCEDURE sp_water_buying_read
    @id INT = NULL
AS
BEGIN
    IF @id IS NULL
        SELECT * FROM water_buying ORDER BY created_at DESC;
    ELSE
        SELECT * FROM water_buying WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_buying_update
    @id INT,
    @supplier_name NVARCHAR(255),
    @supplier_contact NVARCHAR(255),
    @date_of_purchase DATE,
    @quantity_purchased DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @cost_per_unit DECIMAL(10, 2),
    @total_cost DECIMAL(10, 2),
    @payment_method NVARCHAR(100),
    @invoice_number NVARCHAR(100),
    @water_tank NVARCHAR(100),
    @notes NVARCHAR(MAX),
    @updated_by NVARCHAR(100)
AS
BEGIN
    UPDATE water_buying SET
        supplier_name = @supplier_name,
        supplier_contact = @supplier_contact,
        date_of_purchase = @date_of_purchase,
        quantity_purchased = @quantity_purchased,
        unit = @unit,
        cost_per_unit = @cost_per_unit,
        total_cost = @total_cost,
        payment_method = @payment_method,
        invoice_number = @invoice_number,
        water_tank = @water_tank,
        notes = @notes,
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_buying_delete
    @id INT
AS
BEGIN
    DELETE FROM water_buying WHERE id = @id;
END;
GO

-- Water Rain Collection Stored Procedures
CREATE PROCEDURE sp_water_rain_create
    @collection_date DATE,
    @collection_location NVARCHAR(255),
    @quantity_collected DECIMAL(10, 2),
    @collection_unit NVARCHAR(50),
    @rain_tank NVARCHAR(100),
    @water_quality NVARCHAR(50),
    @treatment_required NVARCHAR(10),
    @treatment_type NVARCHAR(255),
    @collected_by NVARCHAR(100),
    @notes NVARCHAR(MAX),
    @created_by NVARCHAR(100)
AS
BEGIN
    INSERT INTO water_rain_collection (
        collection_date, collection_location, quantity_collected, collection_unit,
        rain_tank, water_quality, treatment_required, treatment_type,
        collected_by, notes, created_by, updated_by
    ) VALUES (
        @collection_date, @collection_location, @quantity_collected, @collection_unit,
        @rain_tank, @water_quality, @treatment_required, @treatment_type,
        @collected_by, @notes, @created_by, @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE PROCEDURE sp_water_rain_read
    @id INT = NULL
AS
BEGIN
    IF @id IS NULL
        SELECT * FROM water_rain_collection ORDER BY created_at DESC;
    ELSE
        SELECT * FROM water_rain_collection WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_rain_update
    @id INT,
    @collection_date DATE,
    @collection_location NVARCHAR(255),
    @quantity_collected DECIMAL(10, 2),
    @collection_unit NVARCHAR(50),
    @rain_tank NVARCHAR(100),
    @water_quality NVARCHAR(50),
    @treatment_required NVARCHAR(10),
    @treatment_type NVARCHAR(255),
    @collected_by NVARCHAR(100),
    @notes NVARCHAR(MAX),
    @updated_by NVARCHAR(100)
AS
BEGIN
    UPDATE water_rain_collection SET
        collection_date = @collection_date,
        collection_location = @collection_location,
        quantity_collected = @quantity_collected,
        collection_unit = @collection_unit,
        rain_tank = @rain_tank,
        water_quality = @water_quality,
        treatment_required = @treatment_required,
        treatment_type = @treatment_type,
        collected_by = @collected_by,
        notes = @notes,
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_rain_delete
    @id INT
AS
BEGIN
    DELETE FROM water_rain_collection WHERE id = @id;
END;
GO

-- Water Usage Stored Procedures
CREATE PROCEDURE sp_water_usage_create
    @department NVARCHAR(100),
    @date_of_usage DATE,
    @quantity_used DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @purpose_of_usage NVARCHAR(255),
    @water_efficient_tech NVARCHAR(255),
    @reduction_percentage DECIMAL(5, 2),
    @source_of_water NVARCHAR(100),
    @available_qty DECIMAL(10, 2),
    @usage_month DATE,
    @notes NVARCHAR(MAX),
    @created_by NVARCHAR(100)
AS
BEGIN
    INSERT INTO water_usage (
        department, date_of_usage, quantity_used, unit, purpose_of_usage,
        water_efficient_tech, reduction_percentage, source_of_water,
        available_qty, usage_month, notes, created_by, updated_by
    ) VALUES (
        @department, @date_of_usage, @quantity_used, @unit, @purpose_of_usage,
        @water_efficient_tech, @reduction_percentage, @source_of_water,
        @available_qty, @usage_month, @notes, @created_by, @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE PROCEDURE sp_water_usage_read
    @id INT = NULL
AS
BEGIN
    IF @id IS NULL
        SELECT * FROM water_usage ORDER BY created_at DESC;
    ELSE
        SELECT * FROM water_usage WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_usage_update
    @id INT,
    @department NVARCHAR(100),
    @date_of_usage DATE,
    @quantity_used DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @purpose_of_usage NVARCHAR(255),
    @water_efficient_tech NVARCHAR(255),
    @reduction_percentage DECIMAL(5, 2),
    @source_of_water NVARCHAR(100),
    @available_qty DECIMAL(10, 2),
    @usage_month DATE,
    @notes NVARCHAR(MAX),
    @updated_by NVARCHAR(100)
AS
BEGIN
    UPDATE water_usage SET
        department = @department,
        date_of_usage = @date_of_usage,
        quantity_used = @quantity_used,
        unit = @unit,
        purpose_of_usage = @purpose_of_usage,
        water_efficient_tech = @water_efficient_tech,
        reduction_percentage = @reduction_percentage,
        source_of_water = @source_of_water,
        available_qty = @available_qty,
        usage_month = @usage_month,
        notes = @notes,
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_discharge_create
    @monitoring_frequency NVARCHAR(50),
    @sampling_points_locations NVARCHAR(255),
    @person_responsible NVARCHAR(255),
    @comments_observations NVARCHAR(MAX),
    @laboratory_used NVARCHAR(255),
    @parameters_monitored NVARCHAR(100),
    @result_value DECIMAL(10, 4),
    @units NVARCHAR(50),
    @compliance_standards NVARCHAR(255),
    @monitoring_equipment NVARCHAR(255),
    @monitoring_date DATE,
    @created_by NVARCHAR(100)
AS
BEGIN
    INSERT INTO water_discharge_quality (
        monitoring_frequency, sampling_points_locations, person_responsible,
        comments_observations, laboratory_used, parameters_monitored, result_value,
        units, compliance_standards, monitoring_equipment, monitoring_date,
        created_by, updated_by
    ) VALUES (
        @monitoring_frequency, @sampling_points_locations, @person_responsible,
        @comments_observations, @laboratory_used, @parameters_monitored, @result_value,
        @units, @compliance_standards, @monitoring_equipment, @monitoring_date,
        @created_by, @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE PROCEDURE sp_water_discharge_read
    @id INT = NULL
AS
BEGIN
    IF @id IS NULL
        SELECT * FROM water_discharge_quality ORDER BY created_at DESC;
    ELSE
        SELECT * FROM water_discharge_quality WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_discharge_update
    @id INT,
    @monitoring_frequency NVARCHAR(50),
    @sampling_points_locations NVARCHAR(255),
    @person_responsible NVARCHAR(255),
    @comments_observations NVARCHAR(MAX),
    @laboratory_used NVARCHAR(255),
    @parameters_monitored NVARCHAR(100),
    @result_value DECIMAL(10, 4),
    @units NVARCHAR(50),
    @compliance_standards NVARCHAR(255),
    @monitoring_equipment NVARCHAR(255),
    @monitoring_date DATE,
    @updated_by NVARCHAR(100)
AS
BEGIN
    UPDATE water_discharge_quality SET
        monitoring_frequency = @monitoring_frequency,
        sampling_points_locations = @sampling_points_locations,
        person_responsible = @person_responsible,
        comments_observations = @comments_observations,
        laboratory_used = @laboratory_used,
        parameters_monitored = @parameters_monitored,
        result_value = @result_value,
        units = @units,
        compliance_standards = @compliance_standards,
        monitoring_equipment = @monitoring_equipment,
        monitoring_date = @monitoring_date,
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_discharge_delete
    @id INT
AS
BEGIN
    DELETE FROM water_discharge_quality WHERE id = @id;
END;
GO
-- Water Recycling Stored Procedures
CREATE PROCEDURE sp_water_recycling_create
    @department NVARCHAR(100),
    @date_of_recycling DATE,
    @recycling_method NVARCHAR(255),
    @quantity_recycled DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @water_tank NVARCHAR(100),
    @notes NVARCHAR(MAX),
    @created_by NVARCHAR(100)
AS
BEGIN
    INSERT INTO water_recycling (
        department, date_of_recycling, recycling_method, quantity_recycled,
        unit, water_tank, notes, created_by, updated_by
    ) VALUES (
        @department, @date_of_recycling, @recycling_method, @quantity_recycled,
        @unit, @water_tank, @notes, @created_by, @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE PROCEDURE sp_water_recycling_read
    @id INT = NULL
AS
BEGIN
    IF @id IS NULL
        SELECT * FROM water_recycling ORDER BY created_at DESC;
    ELSE
        SELECT * FROM water_recycling WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_recycling_update
    @id INT,
    @department NVARCHAR(100),
    @date_of_recycling DATE,
    @recycling_method NVARCHAR(255),
    @quantity_recycled DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @water_tank NVARCHAR(100),
    @notes NVARCHAR(MAX),
    @updated_by NVARCHAR(100)
AS
BEGIN
    UPDATE water_recycling SET
        department = @department,
        date_of_recycling = @date_of_recycling,
        recycling_method = @recycling_method,
        quantity_recycled = @quantity_recycled,
        unit = @unit,
        water_tank = @water_tank,
        notes = @notes,
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_recycling_delete
    @id INT
AS
BEGIN
    DELETE FROM water_recycling WHERE id = @id;
END;
GO

-- Water Waste Stored Procedures
CREATE PROCEDURE sp_water_waste_create
    @department NVARCHAR(100),
    @date_of_waste_generation DATE,
    @quantity_of_wastewater DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @type_of_wastewater NVARCHAR(255),
    @wastewater_treatment_process NVARCHAR(255),
    @percentage_of_pollutant_removal DECIMAL(5, 2),
    @disposal_method NVARCHAR(255),
    @quantity_disposed DECIMAL(10, 2),
    @disposed_unit NVARCHAR(50),
    @notes NVARCHAR(MAX),
    @created_by NVARCHAR(100)
AS
BEGIN
    INSERT INTO water_waste (
        department, date_of_waste_generation, quantity_of_wastewater, unit,
        type_of_wastewater, wastewater_treatment_process, percentage_of_pollutant_removal,
        disposal_method, quantity_disposed, disposed_unit, notes, created_by, updated_by
    ) VALUES (
        @department, @date_of_waste_generation, @quantity_of_wastewater, @unit,
        @type_of_wastewater, @wastewater_treatment_process, @percentage_of_pollutant_removal,
        @disposal_method, @quantity_disposed, @disposed_unit, @notes, @created_by, @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE PROCEDURE sp_water_waste_read
    @id INT = NULL
AS
BEGIN
    IF @id IS NULL
        SELECT * FROM water_waste ORDER BY created_at DESC;
    ELSE
        SELECT * FROM water_waste WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_waste_update
    @id INT,
    @department NVARCHAR(100),
    @date_of_waste_generation DATE,
    @quantity_of_wastewater DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @type_of_wastewater NVARCHAR(255),
    @wastewater_treatment_process NVARCHAR(255),
    @percentage_of_pollutant_removal DECIMAL(5, 2),
    @disposal_method NVARCHAR(255),
    @quantity_disposed DECIMAL(10, 2),
    @disposed_unit NVARCHAR(50),
    @notes NVARCHAR(MAX),
    @updated_by NVARCHAR(100)
AS
BEGIN
    UPDATE water_waste SET
        department = @department,
        date_of_waste_generation = @date_of_waste_generation,
        quantity_of_wastewater = @quantity_of_wastewater,
        unit = @unit,
        type_of_wastewater = @type_of_wastewater,
        wastewater_treatment_process = @wastewater_treatment_process,
        percentage_of_pollutant_removal = @percentage_of_pollutant_removal,
        disposal_method = @disposal_method,
        quantity_disposed = @quantity_disposed,
        disposed_unit = @disposed_unit,
        notes = @notes,
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_water_waste_delete
    @id INT
AS
BEGIN
    DELETE FROM water_waste WHERE id = @id;
END;
GO

-- Waste Management Stored Procedures
CREATE PROCEDURE sp_waste_management_create
    @date_of_waste_generation DATE,
    @waste_category NVARCHAR(100),
    @type_of_waste NVARCHAR(255),
    @quantity_of_waste DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @source_of_waste NVARCHAR(255),
    @collection_method NVARCHAR(100),
    @storage_method NVARCHAR(100),
    @storage_duration_days INT,
    @warehouse_name NVARCHAR(100),
    @location NVARCHAR(255),
    @notes NVARCHAR(MAX),
    @created_by NVARCHAR(100)
AS
BEGIN
    INSERT INTO waste_management (
        date_of_waste_generation, waste_category, type_of_waste, quantity_of_waste,
        unit, source_of_waste, collection_method, storage_method,
        storage_duration_days, warehouse_name, location, notes, created_by, updated_by
    ) VALUES (
        @date_of_waste_generation, @waste_category, @type_of_waste, @quantity_of_waste,
        @unit, @source_of_waste, @collection_method, @storage_method,
        @storage_duration_days, @warehouse_name, @location, @notes, @created_by, @created_by
    );
    SELECT SCOPE_IDENTITY() AS id;
END;
GO

CREATE PROCEDURE sp_waste_management_read
    @id INT = NULL
AS
BEGIN
    IF @id IS NULL
        SELECT * FROM waste_management ORDER BY created_at DESC;
    ELSE
        SELECT * FROM waste_management WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_waste_management_update
    @id INT,
    @date_of_waste_generation DATE,
    @waste_category NVARCHAR(100),
    @type_of_waste NVARCHAR(255),
    @quantity_of_waste DECIMAL(10, 2),
    @unit NVARCHAR(50),
    @source_of_waste NVARCHAR(255),
    @collection_method NVARCHAR(100),
    @storage_method NVARCHAR(100),
    @storage_duration_days INT,
    @warehouse_name NVARCHAR(100),
    @location NVARCHAR(255),
    @notes NVARCHAR(MAX),
    @updated_by NVARCHAR(100)
AS
BEGIN
    UPDATE waste_management SET
        date_of_waste_generation = @date_of_waste_generation,
        waste_category = @waste_category,
        type_of_waste = @type_of_waste,
        quantity_of_waste = @quantity_of_waste,
        unit = @unit,
        source_of_waste = @source_of_waste,
        collection_method = @collection_method,
        storage_method = @storage_method,
        storage_duration_days = @storage_duration_days,
        warehouse_name = @warehouse_name,
        location = @location,
        notes = @notes,
        updated_by = @updated_by,
        updated_at = GETDATE()
    WHERE id = @id;
END;
GO

CREATE PROCEDURE sp_waste_management_delete
    @id INT
AS
BEGIN
    DELETE FROM waste_management WHERE id = @id;
END;
GO