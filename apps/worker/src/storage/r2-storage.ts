import type { R2Bucket } from "@cloudflare/workers-types";

export interface UploadedFile {
  key: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: number;
}

export class R2Storage {
  constructor(
    private uploads: R2Bucket,
    private avatars?: R2Bucket
  ) {}

  // Avatar operations
  async uploadAvatar(userId: number, file: File): Promise<UploadedFile> {
    const bucket = this.avatars || this.uploads;
    const key = `avatars/${userId}-${Date.now()}.${this.getFileExtension(file.name)}`;
    
    // Validate file
    if (!this.isValidImageType(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.");
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error("File too large. Maximum size is 5MB.");
    }

    // Upload to R2
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        userId: userId.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    return {
      key,
      url: `/r2/avatar/${userId}`,
      size: file.size,
      contentType: file.type,
      uploadedAt: Date.now(),
    };
  }

  async getAvatar(userId: number): Promise<R2Object | null> {
    const bucket = this.avatars || this.uploads;
    
    // List all avatars for this user
    const list = await bucket.list({
      prefix: `avatars/${userId}-`,
    });

    if (list.objects.length === 0) {
      return null;
    }

    // Get the most recent avatar
    const mostRecent = list.objects.sort((a, b) => 
      b.uploaded.getTime() - a.uploaded.getTime()
    )[0];

    return bucket.get(mostRecent.key);
  }

  async deleteAvatar(userId: number): Promise<void> {
    const bucket = this.avatars || this.uploads;
    
    // List all avatars for this user
    const list = await bucket.list({
      prefix: `avatars/${userId}-`,
    });

    // Delete all avatars
    for (const object of list.objects) {
      await bucket.delete(object.key);
    }
  }

  // File upload operations (for future features)
  async uploadFile(
    category: string,
    fileName: string,
    file: File | ReadableStream,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<UploadedFile> {
    const key = `${category}/${Date.now()}-${fileName}`;
    
    await this.uploads.put(key, file, {
      httpMetadata: {
        contentType,
      },
      customMetadata: metadata,
    });

    return {
      key,
      url: `/r2/file/${encodeURIComponent(key)}`,
      size: 0, // Size would need to be tracked separately
      contentType,
      uploadedAt: Date.now(),
    };
  }

  async getFile(key: string): Promise<R2Object | null> {
    return this.uploads.get(key);
  }

  async deleteFile(key: string): Promise<void> {
    await this.uploads.delete(key);
  }

  async listFiles(prefix: string, limit: number = 100): Promise<R2Objects> {
    return this.uploads.list({
      prefix,
      limit,
    });
  }

  // Helper methods
  private isValidImageType(mimeType: string): boolean {
    const validTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/gif",
      "image/webp",
    ];
    return validTypes.includes(mimeType.toLowerCase());
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
  }

  // Cleanup old uploads
  async cleanupOldUploads(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedCount = 0;
    let cursor: string | undefined;

    do {
      const list = await this.uploads.list({
        cursor,
        limit: 1000,
      });

      for (const object of list.objects) {
        if (object.uploaded < cutoffDate) {
          await this.uploads.delete(object.key);
          deletedCount++;
        }
      }

      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);

    return deletedCount;
  }

  // Get storage usage statistics
  async getStorageStats(): Promise<{
    totalObjects: number;
    totalSize: number;
    byCategory: Record<string, { count: number; size: number }>;
  }> {
    const stats: Record<string, { count: number; size: number }> = {};
    let totalObjects = 0;
    let totalSize = 0;
    let cursor: string | undefined;

    do {
      const list = await this.uploads.list({
        cursor,
        limit: 1000,
        include: ["httpMetadata", "customMetadata"],
      });

      for (const object of list.objects) {
        const category = object.key.split("/")[0] || "uncategorized";
        
        if (!stats[category]) {
          stats[category] = { count: 0, size: 0 };
        }
        
        stats[category].count++;
        stats[category].size += object.size;
        totalObjects++;
        totalSize += object.size;
      }

      cursor = list.truncated ? list.cursor : undefined;
    } while (cursor);

    return {
      totalObjects,
      totalSize,
      byCategory: stats,
    };
  }
}