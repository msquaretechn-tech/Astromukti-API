import multer from "multer";
import fs from "fs";
import path from "path";

const createFolder = (folderPath) => {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }
};

const imagePath = "./public/images";
const iconPath = "./public/icons";

createFolder(imagePath);
createFolder(iconPath);


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, imagePath);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);

        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});


export const upload = multer({
    storage
});


const iconStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, iconPath);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);

        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});


export const uploadIcon = multer({
    storage: iconStorage
});