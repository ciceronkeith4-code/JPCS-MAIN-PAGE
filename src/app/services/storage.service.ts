import { supabase } from "../../lib/supabaseClient";
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
      const filename = `${userId}/${variant}.webp`;
      if (import.meta.env.DEV) console.debug("Uploading profile image to Supabase Storage", { userId, path: filename });

      // Convert Blob to File object for Supabase upload
      const fileToUpload = new File([compressedBlob], `${variant}.webp`, { type: "image/webp" });

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filename, fileToUpload, {
          contentType: "image/webp",
          upsert: true,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filename);

      if (!data?.publicUrl) throw new Error("Could not retrieve public URL for uploaded file.");

      return { success: true, data: `${data.publicUrl}?v=${Date.now()}`, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred during upload." };
    }
  },

  async deleteAvatar(pathOrUrl: string): Promise<ApiResponse<void>> {
    try {
      let filePath = pathOrUrl;

      // Handle Supabase Storage public URLs
      if (pathOrUrl.includes("/storage/v1/object/public/avatars/")) {
        filePath = pathOrUrl.split("/storage/v1/object/public/avatars/")[1];
      }

      filePath = filePath.split(/[?#]/, 1)[0];

      if (filePath && !filePath.startsWith("data:") && !filePath.startsWith("http")) {
        const { error } = await supabase.storage
          .from("avatars")
          .remove([filePath]);

        if (error) throw error;
      }
      return { success: true, data: null, error: null };
    } catch (err: any) {
      return { success: false, data: null, error: err?.message || "An unexpected error occurred during storage deletion." };
    }
  }
};
