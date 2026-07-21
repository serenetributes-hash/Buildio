-- =====================================================================
-- CONSTRUCTION PROJECT MANAGEMENT + MINI-ERP
-- PostgreSQL DDL Schema
-- =====================================================================
-- Run order matters because of FK dependencies. Execute top to bottom,
-- or run as a single migration file with a tool like node-pg-migrate /
-- Knex / Prisma `db execute`.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. ROLES & USERS (RBAC foundation)
-- ---------------------------------------------------------------------
CREATE TABLE roles (
    id              SMALLSERIAL PRIMARY KEY,
    name            VARCHAR(30) NOT NULL UNIQUE,  -- 'admin_director','accountant','receptionist','client'
    description     TEXT
);

INSERT INTO roles (name, description) VALUES
    ('admin_director', 'Full system access'),
    ('accountant', 'Full ERP, payroll, procurement, warehouse intake, expenses'),
    ('receptionist', 'Office expenses, visitor logs, office supplies, view timelines'),
    ('client', 'View-only, restricted to own project, high-level metrics only');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role_id         SMALLINT NOT NULL REFERENCES roles(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_email ON users(email);

-- ---------------------------------------------------------------------
-- 2. PROJECTS
-- ---------------------------------------------------------------------
CREATE TABLE projects (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(200) NOT NULL,
    client_user_id          UUID REFERENCES users(id), -- linked client login (nullable)
    location                VARCHAR(255),
    total_project_value     NUMERIC(16,2) NOT NULL CHECK (total_project_value >= 0), -- TPV
    budget_allocation_pct   NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (budget_allocation_pct > 0 AND budget_allocation_pct <= 100),
    -- TBC is derived (TPV * pct/100) — computed in application layer / view, not stored,
    -- to avoid drift if TPV or pct changes. See v_project_metrics below.
    start_date              DATE NOT NULL,
    end_date                DATE NOT NULL CHECK (end_date > start_date),
    status                  VARCHAR(20) NOT NULL DEFAULT 'active'
                                CHECK (status IN ('planning','active','on_hold','completed','cancelled')),
    created_by              UUID REFERENCES users(id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_client ON projects(client_user_id);

-- Optional: task milestones, used for physical completion % in the
-- Probability of On-Time Completion heuristic.
CREATE TABLE project_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    weight_pct      NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (weight_pct >= 0 AND weight_pct <= 100),
    is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at    TIMESTAMPTZ,
    due_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_project ON project_tasks(project_id);

-- ---------------------------------------------------------------------
-- 3. CENTRAL WAREHOUSE / GLOBAL INVENTORY
-- ---------------------------------------------------------------------
CREATE TABLE material_categories (
    id      SMALLSERIAL PRIMARY KEY,
    name    VARCHAR(80) NOT NULL UNIQUE -- Cement, Sand, Ballast, Nails, Timber...
);

CREATE TABLE central_inventory (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id         SMALLINT NOT NULL REFERENCES material_categories(id),
    item_name           VARCHAR(150) NOT NULL,           -- e.g. "Cement 50kg bag - Portland"
    unit_of_measure     VARCHAR(20) NOT NULL,             -- bag, kg, piece, litre...
    quantity_on_hand    NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    average_unit_cost   NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (average_unit_cost >= 0), -- weighted moving average
    reorder_threshold   NUMERIC(14,3) NOT NULL DEFAULT 0, -- low stock alert trigger
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (item_name, unit_of_measure)
);
CREATE INDEX idx_central_inventory_category ON central_inventory(category_id);
CREATE INDEX idx_central_inventory_low_stock ON central_inventory(quantity_on_hand, reorder_threshold);

-- Stock IN: purchases from suppliers into the central warehouse
CREATE TABLE stock_in_transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id   UUID NOT NULL REFERENCES central_inventory(id),
    supplier_name       VARCHAR(150),
    quantity             NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
    unit_cost            NUMERIC(14,4) NOT NULL CHECK (unit_cost >= 0),
    total_cost            NUMERIC(16,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    invoice_reference   VARCHAR(100),
    recorded_by         UUID REFERENCES users(id),
    transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_in_item ON stock_in_transactions(inventory_item_id);

-- Stock OUT: allocation from central warehouse to a specific project
CREATE TABLE project_inventory_allocations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inventory_item_id   UUID NOT NULL REFERENCES central_inventory(id),
    quantity_used       NUMERIC(14,3) NOT NULL CHECK (quantity_used > 0),
    unit_cost_at_time   NUMERIC(14,4) NOT NULL,   -- snapshot of average_unit_cost when allocated
    total_cost          NUMERIC(16,2) GENERATED ALWAYS AS (quantity_used * unit_cost_at_time) STORED,
    waste_factor_pct    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (waste_factor_pct >= 0),
    quantity_estimated_needed NUMERIC(14,3), -- for Material Utilization Rate, optional per-line estimate
    allocated_by        UUID REFERENCES users(id),
    allocation_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_allocations_project ON project_inventory_allocations(project_id);
CREATE INDEX idx_allocations_item ON project_inventory_allocations(inventory_item_id);

-- ---------------------------------------------------------------------
-- 4. LABOR / WAGES
-- ---------------------------------------------------------------------
CREATE TABLE workers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    role_title      VARCHAR(100), -- mason, electrician, laborer...
    daily_rate      NUMERIC(12,2),
    phone           VARCHAR(30),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE labor_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    worker_id       UUID NOT NULL REFERENCES workers(id),
    task_id         UUID REFERENCES project_tasks(id),
    work_date       DATE NOT NULL,
    hours_worked    NUMERIC(5,2),
    wage_amount     NUMERIC(12,2) NOT NULL CHECK (wage_amount >= 0),
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid','pending')),
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_labor_logs_project ON labor_logs(project_id);
CREATE INDEX idx_labor_logs_worker ON labor_logs(worker_id);
CREATE INDEX idx_labor_logs_date ON labor_logs(work_date);

-- ---------------------------------------------------------------------
-- 5. LOGISTICS (transport, machinery hire, fuel)
-- ---------------------------------------------------------------------
CREATE TABLE logistics_costs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    cost_type       VARCHAR(30) NOT NULL CHECK (cost_type IN ('transport','machinery_hire','fuel','other')),
    description     VARCHAR(255),
    amount          NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    cost_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logistics_project ON logistics_costs(project_id);

-- ---------------------------------------------------------------------
-- 6. COMPLIANCE (licensing, permits, insurance, inspections)
-- ---------------------------------------------------------------------
CREATE TABLE compliance_costs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    compliance_type VARCHAR(30) NOT NULL CHECK (compliance_type IN ('license','permit','insurance','inspection','other')),
    description     VARCHAR(255),
    amount          NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    issued_date     DATE,
    expiry_date     DATE,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_compliance_project ON compliance_costs(project_id);

-- ---------------------------------------------------------------------
-- 7. CLIENT INVOICING (Revenue side, for Gross Profit)
-- ---------------------------------------------------------------------
CREATE TABLE client_invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    amount          NUMERIC(16,2) NOT NULL CHECK (amount >= 0),
    tax_rate_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
    tax_amount      NUMERIC(16,2) GENERATED ALWAYS AS (amount * tax_rate_pct / 100) STORED,
    status          VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partially_paid','paid')),
    issued_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_project ON client_invoices(project_id);
CREATE INDEX idx_invoices_status ON client_invoices(status);

-- ---------------------------------------------------------------------
-- 8. MINI-ERP: COMPANY-LEVEL (NON-PROJECT) FINANCES
-- ---------------------------------------------------------------------
CREATE TABLE erp_overheads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category        VARCHAR(40) NOT NULL CHECK (category IN
                        ('payroll','rent','utilities','office_supplies','depreciation','other')),
    description     VARCHAR(255),
    amount          NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_overheads_category ON erp_overheads(category);
CREATE INDEX idx_overheads_date ON erp_overheads(expense_date);

CREATE TABLE tax_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_label        VARCHAR(20) NOT NULL, -- e.g. '2026-Q3'
    tax_rate_pct        NUMERIC(5,2) NOT NULL,
    taxable_amount       NUMERIC(16,2) NOT NULL,
    tax_due              NUMERIC(16,2) GENERATED ALWAYS AS (taxable_amount * tax_rate_pct / 100) STORED,
    status              VARCHAR(20) NOT NULL DEFAULT 'estimated' CHECK (status IN ('estimated','filed','paid')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 9. AUDIT LOG (recommended for financial ERP data integrity)
-- ---------------------------------------------------------------------
CREATE TABLE audit_log (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,     -- 'stock_out', 'invoice_created', ...
    entity_table    VARCHAR(50) NOT NULL,
    entity_id       UUID,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_table, entity_id);

-- =====================================================================
-- VIEWS: convenience aggregates used heavily by the backend services
-- =====================================================================

-- Actual Spend (AS) per project = materials allocated + labor + logistics + compliance
CREATE OR REPLACE VIEW v_project_actual_spend AS
SELECT
    p.id AS project_id,
    COALESCE(mat.material_cost, 0)      AS material_cost,
    COALESCE(lab.labor_cost, 0)         AS labor_cost,
    COALESCE(log.logistics_cost, 0)     AS logistics_cost,
    COALESCE(comp.compliance_cost, 0)   AS compliance_cost,
    COALESCE(mat.material_cost, 0)
      + COALESCE(lab.labor_cost, 0)
      + COALESCE(log.logistics_cost, 0)
      + COALESCE(comp.compliance_cost, 0) AS actual_spend
FROM projects p
LEFT JOIN (
    SELECT project_id, SUM(total_cost) AS material_cost
    FROM project_inventory_allocations GROUP BY project_id
) mat ON mat.project_id = p.id
LEFT JOIN (
    SELECT project_id, SUM(wage_amount) AS labor_cost
    FROM labor_logs GROUP BY project_id
) lab ON lab.project_id = p.id
LEFT JOIN (
    SELECT project_id, SUM(amount) AS logistics_cost
    FROM logistics_costs GROUP BY project_id
) log ON log.project_id = p.id
LEFT JOIN (
    SELECT project_id, SUM(amount) AS compliance_cost
    FROM compliance_costs GROUP BY project_id
) comp ON comp.project_id = p.id;

-- Core project metrics view (TBC, financial/time progress, etc. computed in app layer
-- for the trickier weighted formulas, but the raw aggregates live here)
CREATE OR REPLACE VIEW v_project_metrics AS
SELECT
    p.id,
    p.name,
    p.total_project_value,
    p.budget_allocation_pct,
    ROUND(p.total_project_value * p.budget_allocation_pct / 100, 2) AS total_budgeted_cost,
    p.start_date,
    p.end_date,
    (p.end_date - CURRENT_DATE) AS time_left_days,
    (p.end_date - p.start_date) AS total_duration_days,
    LEAST(GREATEST(CURRENT_DATE - p.start_date, 0), (p.end_date - p.start_date)) AS days_elapsed,
    v.actual_spend
FROM projects p
JOIN v_project_actual_spend v ON v.project_id = p.id;
