// =========================================
// KV Projects ERP
// Granular Permission Check
//
// Use alongside (not instead of) the existing authorize() middleware.
// authorize() answers "is this role allowed on this route at all";
// checkPermission() answers "can this role do THIS action on THIS module".
//
// Usage:
//   router.delete("/:id", protect, checkPermission("invoices", "delete"), deleteInvoice);
// =========================================

const { permissions } = require("../config/permissions");

const checkPermission = (module, action) => {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    // Owner always has full access — never restricted by the matrix.
    if (role === "owner") {
      return next();
    }

    const modulePermissions = permissions[role]?.[module];

    if (!modulePermissions || !modulePermissions[action]) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${action} ${module}.`,
      });
    }

    next();
  };
};

module.exports = checkPermission;
