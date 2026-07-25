import multer from "multer";
import path from "path";

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Allowed extensions for project file sharing (images, PDF, Office docs, archives).
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|gif|webp|pdf|docx?|xlsx?|pptx?|zip|rar|7z|csv|txt)$/i;

// Real MIME types for these extensions — the old regex checked the MIME
// string against the same `/jpeg|jpg|png|pdf|doc|docx|zip/` pattern used for
// extensions, but Word/Excel/PowerPoint MIME types (e.g.
// "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
// never contain those substrings, so .doc/.docx/.xlsx uploads always failed.
const ALLOWED_MIMETYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip", "application/x-zip-compressed",
  "application/x-rar-compressed", "application/vnd.rar",
  "application/x-7z-compressed",
  "text/csv", "text/plain",
  // Some browsers/OSes report generic binary MIME types for archives/office
  // files — allow it through when the extension itself is already trusted.
  "application/octet-stream",
]);

// Check file type
function checkFileType(file, cb) {
  const extOk = ALLOWED_EXTENSIONS.test(path.extname(file.originalname));
  const mimeOk = ALLOWED_MIMETYPES.has(file.mimetype);

  if (extOk && mimeOk) {
    return cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: images, PDF, Word, Excel, PowerPoint, ZIP/RAR/7z, CSV, TXT."));
  }
}

// Init upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit — project archives run larger than 10MB
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

export default upload;
