// =========================================
// KV Projects ERP
// Permission Matrix
//
// Single source of truth for what each role can do, per module.
// Actions: view, create, edit, delete, approve, export
//
// A role/module combo not listed here defaults to "no access" —
// checkPermission() treats a missing entry as false, never true.
// =========================================

const FULL_ACCESS = {
  view: true,
  create: true,
  edit: true,
  delete: true,
  approve: true,
  export: true,
};

const permissions = {
  owner: {
    // Owner gets full access to every module automatically —
    // see checkPermission.js, which short-circuits for "owner".
  },

  admin: {
    employees: { view: true, create: true, edit: true, delete: true },
    clients: { view: true, create: true, edit: true, delete: true },
    vendors: { view: true, create: true, edit: true, delete: true },
    sites: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    projects: { view: true, create: true, edit: true, delete: false },
    assets: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: true, edit: true, delete: false },
    payments: { view: true, create: true, edit: true, delete: false },
    expenses: { view: true, create: true, edit: true, delete: false },
    quotations: { view: true, create: true, edit: true, delete: false },
    attendance: { view: true, create: true, edit: false, delete: false },
    payroll: { view: true, create: false, edit: false, delete: false },
    leave: { view: true, create: false, edit: false, approve: true },
    analytics: { view: true },
    leads: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      approve: true,
    },
  },

  accountant: {
    invoices: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      export: true,
    },

    payments: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
    },
    expenses: {
      view: true,
      create: true,
      edit: true,
      delete: true,
      export: true,
    },
    quotations: {
      view: true,
      create: true,
      edit: true,
      delete: false,
      export: true,
    },
    clients: { view: true },
    vendors: { view: true },
    analytics: { view: true, export: true },
    leads: { view: true, create: true, edit: true, delete: false },
  },

  hr: {
    employees: { view: true, create: true, edit: true, delete: false },
    attendance: { view: true, create: true, edit: false, delete: false },
    payroll: { view: true, create: true, edit: true, delete: false },
    leave: { view: true, create: false, edit: false, approve: true },
    leads: { view: true, create: true, edit: false, delete: false },
  },

  siteengineer: {
    projects: { view: true },
    sites: { view: true },
    dpr: { view: true, create: true, edit: true, delete: false },
    materials: { view: true, create: true, edit: false, delete: false },
    labour: { view: true, create: true, edit: true, delete: false },
    attendance: { view: true, create: true, edit: false, delete: false },
    inventory: { view: true },
  },
};

module.exports = { permissions, FULL_ACCESS };
