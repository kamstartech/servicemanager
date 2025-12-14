import { NextRequest, NextResponse } from "next/server";
import { uploadFile, BUCKETS } from "@/lib/storage/minio";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowed file types by category
const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  any: ["*"],
};

// Max file sizes (in bytes)
const MAX_FILE_SIZE = {
  image: 5 * 1024 * 1024, // 5MB
  document: 10 * 1024 * 1024, // 10MB
  default: 10 * 1024 * 1024, // 10MB
};

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucket = (formData.get("bucket") as string) || BUCKETS.ATTACHMENTS;
    const category = (formData.get("category") as string) || "any";
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ALLOWED_TYPES[category] || ALLOWED_TYPES.any;
    if (
      !allowedTypes.includes("*") &&
      !allowedTypes.includes(file.type)
    ) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed for category ${category}` },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZE[category as keyof typeof MAX_FILE_SIZE] || MAX_FILE_SIZE.default;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop();
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString("hex");
    const fileName = userId
      ? `${userId}/${timestamp}-${randomId}.${ext}`
      : `${timestamp}-${randomId}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to MinIO
    const result = await uploadFile(bucket, fileName, buffer, {
      "Content-Type": file.type,
      "X-Upload-Category": category,
      "X-Original-Filename": file.name,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        fileName: fileName,
        originalName: file.name,
        size: file.size,
        type: file.type,
        bucket: bucket,
        etag: result.etag,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: "Upload API endpoint",
      usage: {
        method: "POST",
        body: "multipart/form-data",
        fields: {
          file: "File (required)",
          bucket: `Bucket name (optional, default: ${BUCKETS.ATTACHMENTS})`,
          category: "File category: image, document, any (optional, default: any)",
          userId: "User ID for organizing files (optional)",
        },
        allowedTypes: ALLOWED_TYPES,
        maxSizes: {
          image: "5MB",
          document: "10MB",
          default: "10MB",
        },
      },
    },
    { status: 200 }
  );
}
