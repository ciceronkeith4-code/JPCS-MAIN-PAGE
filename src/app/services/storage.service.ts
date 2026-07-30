import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../../firebase/config";
import type { ApiResponse } from "../config/app.config";
import { APP_CONFIG } from "../config/app.config";

export const StorageService = {
  compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        reject(new Error("Unsupported image format. Allowed formats: JPG, JPEG, PNG, WEBP."));
        return;
      }
      if (file.size > APP_CONFIG.maxAvatarSize) {
        reject(new Error("File size exceeds maximum limit of 2MB."));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = APP_CONFIG.avatarDimension;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not construct 2D context"));
            return;
          }

          // Crop square from center
          const sourceSize = Math.min(img.width, img.height);
          const sourceX = (img.width - sourceSize) / 2;
          const sourceY = (img.height - sourceSize) / 2;

          ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Blob compression failed"));
              }
            },
            "image/webp",
            0.8
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  },

  async uploadAvatar(file: File, userId: string, variant: "profile" | "action" = "profile"): Promise<ApiResponse<string>> {
    try {
      const compressedBlob = await this.compressImage(file);
      const filename = `avatars/${userId}/${variant}.webp`;
      if (import.meta.env.DEV) console.debug("Uploading profile image", { userId, path: filename });

      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, compressedBlob, { contentType: "image/webp" });
      const downloadUrl = await getDownloadURL(storageRef);

      return { success: true, data: `${downloadUrl}?v=${Date.now()}`, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred during upload." };
    }
  },

  async deleteAvatar(pathOrUrl: string): Promise<ApiResponse<void>> {
    try {
      let filePath = pathOrUrl;

      // Handle Firebase Storage download URLs
      if (pathOrUrl.startsWith("https://firebasestorage.googleapis.com")) {
        const pathMatch = pathOrUrl.match(/\/o\/(.+?)(?:\?|$)/);
        if (pathMatch) {
          filePath = decodeURIComponent(pathMatch[1]);
        }
      }

      filePath = filePath.split(/[?#]/, 1)[0];

      if (filePath && !filePath.startsWith("data:") && !filePath.startsWith("http")) {
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
      return { success: true, data: null, error: null };
    } catch (err: any) {
      // Treat "file not found" as success — already deleted
      if (err?.code === "storage/object-not-found") {
        return { success: true, data: null, error: null };
      }
      return { success: false, data: null, error: err?.message || "An unexpected error occurred during storage deletion." };
    }
  }
};
