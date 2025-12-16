import * as Minio from "minio";

// MinIO client configuration
const minioConfig = {
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
};

// Create MinIO client instance
export const minioClient = new Minio.Client(minioConfig);

// Default bucket names
export const BUCKETS = {
  PROFILE_IMAGES: "profile-images",
  DOCUMENTS: "documents",
  KYC_DOCUMENTS: "kyc-documents",
  RECEIPTS: "receipts",
  ATTACHMENTS: "attachments",
  BACKUPS: "backups",
} as const;

// Initialize buckets
export async function initializeBuckets() {
  try {
    for (const bucket of Object.values(BUCKETS)) {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, "us-east-1");
        console.log(`✅ Created bucket: ${bucket}`);

        // Set public read policy for profile images
        if (bucket === BUCKETS.PROFILE_IMAGES) {
          const policy = {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { AWS: ["*"] },
                Action: ["s3:GetObject"],
                Resource: [`arn:aws:s3:::${bucket}/*`],
              },
            ],
          };
          await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
          console.log(`✅ Set public read policy for: ${bucket}`);
        }
      }
    }
    console.log("✅ MinIO buckets initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize MinIO buckets:", error);
    throw error;
  }
}

// Upload file to MinIO
export async function uploadFile(
  bucket: string,
  fileName: string,
  fileBuffer: Buffer,
  metadata?: Minio.ItemBucketMetadata
): Promise<{ url: string; etag: string }> {
  try {
    const result = await minioClient.putObject(
      bucket,
      fileName,
      fileBuffer,
      fileBuffer.length,
      metadata
    );

    // Generate public URL (works if bucket has public policy)
    const url = `${minioConfig.useSSL ? "https" : "http"}://${minioConfig.endPoint}:${minioConfig.port}/${bucket}/${fileName}`;

    return {
      url,
      etag: result.etag,
    };
  } catch (error) {
    console.error("❌ Failed to upload file:", error);
    throw error;
  }
}

// Generate presigned URL for temporary access
export async function getPresignedUrl(
  bucket: string,
  fileName: string,
  expirySeconds: number = 3600
): Promise<string> {
  try {
    return await minioClient.presignedGetObject(bucket, fileName, expirySeconds);
  } catch (error) {
    console.error("❌ Failed to generate presigned URL:", error);
    throw error;
  }
}

// Delete file from MinIO
export async function deleteFile(bucket: string, fileName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucket, fileName);
    console.log(`✅ Deleted file: ${bucket}/${fileName}`);
  } catch (error) {
    console.error("❌ Failed to delete file:", error);
    throw error;
  }
}

// List files in bucket
export async function listFiles(
  bucket: string,
  prefix?: string
): Promise<Minio.BucketItem[]> {
  try {
    const stream = minioClient.listObjects(bucket, prefix, true);
    const files: Minio.BucketItem[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (obj) => files.push(obj as Minio.BucketItem));
      stream.on("end", () => resolve(files));
      stream.on("error", reject);
    });
  } catch (error) {
    console.error("❌ Failed to list files:", error);
    throw error;
  }
}

// Get file metadata
export async function getFileMetadata(
  bucket: string,
  fileName: string
): Promise<Minio.BucketItemStat> {
  try {
    return await minioClient.statObject(bucket, fileName);
  } catch (error) {
    console.error("❌ Failed to get file metadata:", error);
    throw error;
  }
}

// Download file
export async function downloadFile(
  bucket: string,
  fileName: string
): Promise<Buffer> {
  try {
    const stream = await minioClient.getObject(bucket, fileName);
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  } catch (error) {
    console.error("❌ Failed to download file:", error);
    throw error;
  }
}
