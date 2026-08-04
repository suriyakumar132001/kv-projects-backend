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

// File Filter
const fileFilter = (req, file, cb) => {

    const allowedTypes = /jpg|jpeg|png|webp/;

    const isValid = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );

    if (isValid) {
        cb(null, true);
    } else {
        cb(new Error("Only Images Allowed"));
    }

};

// Upload
const upload = multer({

    storage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter

});

module.exports = upload;