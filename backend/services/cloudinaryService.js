import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

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

export const uploadFile = async (filePath, folder = "nexora") => {
  try {
    if (isConfigured) {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: "auto",
      });
      // Delete temporary file local path
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } else {
      // Local fallback url path
      const fileName = filePath.replace(/\\/g, "/").split("/").pop();
      const localUrl = `/uploads/${fileName}`;
      return {
        url: localUrl,
        publicId: fileName,
      };
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
