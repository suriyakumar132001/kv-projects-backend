// =========================================
// KV Projects ERP
// Multer Configuration
// =========================================

const multer = require("multer");
const path = require("path");

// Storage Configuration
const storage = multer.diskStorage({

    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 100000);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );

    }

});

// Allowed types — checked on BOTH extension and MIME type.
// Checking extension alone is not safe: a file can be renamed to
// "virus.exe" -> "virus.jpg" and the extension check alone would pass it.
const ALLOWED_EXTENSIONS = /^\.(jpg|jpeg|png|webp)$/;
const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
]);

// File Filter
const fileFilter = (req, file, cb) => {

    const ext = path.extname(file.originalname).toLowerCase();

    const extIsValid = ALLOWED_EXTENSIONS.test(ext);
    const mimeIsValid = ALLOWED_MIME_TYPES.has(file.mimetype);

    if (extIsValid && mimeIsValid) {
        cb(null, true);
    } else {
        // Custom flag so our error handler can recognize this specific
        // rejection and return a clean 400 instead of a generic 500.
        const error = new Error("Only JPG, PNG, or WEBP images are allowed.");
        error.code = "INVALID_FILE_TYPE";
        cb(error);
    }

};

// Upload
const upload = multer({

    storage,

    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10,                 // max number of files per request
    },

    fileFilter

});

// =========================================
// Error Handler
// Wrap any multer.array()/multer.single() route with this so file-type
// and file-size errors come back as clean JSON instead of crashing into
// Express's default HTML error page.
// =========================================
const handleUploadErrors = (err, req, res, next) => {

    if (err instanceof multer.MulterError) {
        // e.g. "File too large", "Too many files"
        return res.status(400).json({
            success: false,
            message:
                err.code === "LIMIT_FILE_SIZE"
                    ? "Each file must be 5MB or smaller."
                    : err.message,
        });
    }

    if (err && err.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({
            success: false,
            message: err.message,
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: "File upload failed.",
        });
    }

    next();

};

module.exports = upload;
module.exports.handleUploadErrors = handleUploadErrors;