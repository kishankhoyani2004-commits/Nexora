import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { Readable } from "stream";

// Configure Cloudinary if credentials exist
const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.log("⚠️ [CLOUDINARY] Credentials missing. Falling back to local file hosting.");
}

// Upload from a Buffer (memoryStorage) OR a file path (diskStorage).
export const uploadFile = async (filePathOrBuffer, folder = "nexora", originalName = "") => {
  try {
    if (isConfigured) {
      let result;

      if (Buffer.isBuffer(filePathOrBuffer)) {
        // Memory storage — stream the buffer directly to Cloudinary
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "auto", public_id: `${Date.now()}-${originalName.replace(/\s+/g, "_")}` },
            (error, res) => (error ? reject(error) : resolve(res))
          );
          Readable.from(filePathOrBuffer).pipe(uploadStream);
        });
      } else {
        // Disk storage — upload from path then delete temp file
        result = await cloudinary.uploader.upload(filePathOrBuffer, {
          folder,
          resource_type: "auto",
        });
        if (fs.existsSync(filePathOrBuffer)) fs.unlinkSync(filePathOrBuffer);
      }

      return { url: result.secure_url, publicId: result.public_id };
    } else {
      // Local fallback — only works in development (Render wipes disk on redeploy)
      const fileName = Buffer.isBuffer(filePathOrBuffer)
        ? `${Date.now()}-${originalName}`
        : filePathOrBuffer.replace(/\\/g, "/").split("/").pop();
      return { url: `/uploads/${fileName}`, publicId: fileName };
    }
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);
    throw error;
  }
};

export const deleteFile = async (publicId) => {
  try {
    if (isConfigured && publicId && !publicId.startsWith("uploads/")) {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === "ok";
    } else {
      console.log(`[CLOUDINARY SIMULATED] File deletion request for: ${publicId}`);
      return true;
    }
  } catch (error) {
    console.error("Cloudinary deletion error:", error.message);
    return false;
  }
};
