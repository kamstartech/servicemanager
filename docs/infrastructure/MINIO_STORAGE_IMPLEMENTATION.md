# MinIO Storage Implementation

## Overview

MinIO is a high-performance, S3-compatible object storage system integrated into the Service Manager admin panel for handling file uploads (profile images, documents, KYC documents, receipts, etc.).

---

## 🏗️ Architecture

### Components

1. **MinIO Server** - Dockerized object storage service
2. **MinIO Client Library** - Node.js client (`lib/storage/minio.ts`)
3. **Upload API** - Next.js API route (`app/api/upload/route.ts`)
4. **Buckets** - Organized storage containers

---

## 📦 Installation

### 1. Install Dependencies

```bash
cd admin
npm install minio
```

### 2. Configure Environment Variables

Create or update `.env.local`:

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### 3. Start MinIO with Docker Compose

```bash
# From project root
docker-compose up -d minio
```

**MinIO Services:**
- **API**: http://localhost:9000
- **Console**: http://localhost:9001

**Default Credentials:**
- Username: `minioadmin`
- Password: `minioadmin`

### 4. Initialize Buckets

```bash
cd admin
npx ts-node scripts/init-minio.ts
```

This creates the following buckets:
- `profile-images` (public read)
- `documents`
- `kyc-documents`
- `receipts`
- `attachments`

---

## 🗂️ Bucket Organization

### Available Buckets

| Bucket | Purpose | Public Access | Max Size |
|--------|---------|---------------|----------|
| `profile-images` | User profile photos | ✅ Yes | 5MB |
| `documents` | General documents | ❌ No | 10MB |
| `kyc-documents` | KYC/ID verification | ❌ No | 10MB |
| `receipts` | Transaction receipts | ❌ No | 10MB |
| `attachments` | General attachments | ❌ No | 10MB |

### File Organization

Files are automatically organized by user ID:

```
bucket-name/
  ├── {userId}/
  │   ├── 1734012345678-a1b2c3d4e5f6g7h8.jpg
  │   ├── 1734012456789-h8g7f6e5d4c3b2a1.pdf
  │   └── ...
  └── 1734012567890-x1y2z3w4v5u6t7s8.png  # No userId specified
```

---

## 🚀 Usage

### Upload API Endpoint

**Endpoint:** `POST /api/upload`

**Request:**
```typescript
const formData = new FormData();
formData.append("file", fileBlob);
formData.append("bucket", "profile-images");  // Optional
formData.append("category", "image");          // Optional
formData.append("userId", "123");              // Optional

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});

const result = await response.json();
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:9000/profile-images/123/1734012345678-a1b2c3d4.jpg",
    "fileName": "123/1734012345678-a1b2c3d4.jpg",
    "originalName": "avatar.jpg",
    "size": 245678,
    "type": "image/jpeg",
    "bucket": "profile-images",
    "etag": "d41d8cd98f00b204e9800998ecf8427e"
  }
}
```

**Response (Error):**
```json
{
  "error": "File size exceeds maximum of 5MB"
}
```

### File Categories

| Category | Allowed Types | Max Size |
|----------|---------------|----------|
| `image` | JPEG, PNG, GIF, WebP | 5MB |
| `document` | PDF, DOC, DOCX, XLS, XLSX | 10MB |
| `any` | All types | 10MB |

---

## 💻 Code Examples

### React/Next.js Upload Component

```typescript
"use client";

import { useState } from "react";

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "profile-images");
    formData.append("category", "image");
    formData.append("userId", "123");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setFileUrl(result.data.url);
        console.log("File uploaded:", result.data);
      } else {
        console.error("Upload failed:", result.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
        accept="image/*"
      />
      {uploading && <p>Uploading...</p>}
      {fileUrl && (
        <div>
          <p>Upload successful!</p>
          <img src={fileUrl} alt="Uploaded" style={{ maxWidth: "200px" }} />
        </div>
      )}
    </div>
  );
}
```

### Direct MinIO Client Usage

```typescript
import { uploadFile, downloadFile, deleteFile, BUCKETS } from "@/lib/storage/minio";

// Upload a file
const buffer = Buffer.from(await file.arrayBuffer());
const result = await uploadFile(
  BUCKETS.PROFILE_IMAGES,
  "user123/avatar.jpg",
  buffer,
  { "Content-Type": "image/jpeg" }
);
console.log("Uploaded:", result.url);

// Download a file
const fileBuffer = await downloadFile(BUCKETS.PROFILE_IMAGES, "user123/avatar.jpg");

// Delete a file
await deleteFile(BUCKETS.PROFILE_IMAGES, "user123/avatar.jpg");
```

---

## 🔒 Security Features

### 1. File Type Validation

Only allowed file types can be uploaded based on category.

### 2. File Size Limits

- Images: 5MB max
- Documents: 10MB max

### 3. Unique Filenames

Generated using timestamp + random hash to prevent collisions.

### 4. Bucket Policies

- `profile-images`: Public read access
- Other buckets: Private (presigned URLs for access)

### 5. Metadata Storage

Original filename and category stored in file metadata.

---

## 🔐 Access Control

### Public Access (Profile Images)

```typescript
// Direct URL access works
const url = "http://localhost:9000/profile-images/user123/avatar.jpg";
```

### Private Access (Documents, KYC, etc.)

Use presigned URLs for temporary access:

```typescript
import { getPresignedUrl } from "@/lib/storage/minio";

// Generate URL valid for 1 hour (3600 seconds)
const url = await getPresignedUrl("kyc-documents", "user123/id-card.jpg", 3600);

// Share this URL with the user
console.log("Access URL:", url);
```

---

## 🛠️ Management

### MinIO Console

Access the web console at: http://localhost:9001

**Features:**
- Browse buckets and files
- Upload/download files manually
- Manage bucket policies
- View storage metrics
- Create access keys

### CLI Commands

```bash
# List all buckets
docker exec service_manager_minio mc ls local

# List files in a bucket
docker exec service_manager_minio mc ls local/profile-images

# Copy file from bucket
docker exec service_manager_minio mc cp local/profile-images/avatar.jpg ./avatar.jpg

# Remove file
docker exec service_manager_minio mc rm local/profile-images/avatar.jpg
```

---

## 📊 Monitoring

### Check MinIO Status

```bash
docker exec service_manager_minio mc admin info local
```

### View Bucket Usage

```bash
docker exec service_manager_minio mc du local/profile-images
```

---

## 🚨 Troubleshooting

### Connection Refused Error

**Issue:** Cannot connect to MinIO

**Solution:**
```bash
# Check if MinIO container is running
docker ps | grep minio

# Restart MinIO
docker-compose restart minio

# Check logs
docker logs service_manager_minio
```

### Bucket Not Found Error

**Issue:** Bucket doesn't exist

**Solution:**
```bash
# Initialize buckets
cd admin
npx ts-node scripts/init-minio.ts
```

### Permission Denied

**Issue:** Cannot upload/download files

**Solution:**
- Check MINIO_ACCESS_KEY and MINIO_SECRET_KEY in `.env.local`
- Verify bucket policy is set correctly
- Check MinIO console for access keys

---

## 🌐 Production Deployment

### 1. Update Environment Variables

```env
# Use strong credentials
MINIO_ACCESS_KEY=your-secure-access-key-here
MINIO_SECRET_KEY=your-secure-secret-key-here

# Use HTTPS in production
MINIO_USE_SSL=true
MINIO_ENDPOINT=minio.yourdomain.com
MINIO_PORT=443
```

### 2. Configure Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name minio.yourdomain.com;

    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Persistent Storage

Ensure `minio_data` directory is backed up regularly:

```bash
# Backup MinIO data
tar -czf minio-backup-$(date +%Y%m%d).tar.gz minio_data/
```

---

## 📝 API Reference

### MinIO Client Functions

#### `uploadFile(bucket, fileName, buffer, metadata?)`
Upload a file to MinIO.

#### `downloadFile(bucket, fileName)`
Download a file from MinIO.

#### `deleteFile(bucket, fileName)`
Delete a file from MinIO.

#### `listFiles(bucket, prefix?)`
List all files in a bucket.

#### `getPresignedUrl(bucket, fileName, expirySeconds?)`
Generate temporary access URL.

#### `getFileMetadata(bucket, fileName)`
Get file information (size, type, etc.).

#### `initializeBuckets()`
Create all default buckets.

---

## 📋 Checklist

### Development Setup
- [x] Install minio package
- [x] Add MinIO to docker-compose.yml
- [x] Configure environment variables
- [x] Start MinIO container
- [x] Initialize buckets
- [x] Test upload API

### Production Setup
- [ ] Change default credentials
- [ ] Configure SSL/TLS
- [ ] Set up reverse proxy
- [ ] Configure backup strategy
- [ ] Set up monitoring
- [ ] Test failover scenarios

---

## 🔗 Resources

- **MinIO Documentation**: https://min.io/docs/minio/linux/index.html
- **Node.js Client**: https://min.io/docs/minio/linux/developers/javascript/minio-javascript.html
- **S3 API Compatibility**: https://docs.aws.amazon.com/AmazonS3/latest/API/Welcome.html

---

## Summary

✅ **MinIO installed** and configured in Docker
✅ **5 buckets created** (profile-images, documents, kyc-documents, receipts, attachments)
✅ **Upload API** at `/api/upload` with validation
✅ **File organization** by user ID
✅ **Public and private access** patterns
✅ **Production-ready** with security features

**Ready to handle file uploads!** 🎉
