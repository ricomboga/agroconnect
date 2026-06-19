import multer from 'multer';

// 10 MB hard cap at the multer layer — per-type limits enforced in the controller
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});
