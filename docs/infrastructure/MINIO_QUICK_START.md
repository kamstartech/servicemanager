# MinIO Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Start MinIO with Docker

```bash
# From project root directory
cd /home/jimmykamanga/Documents/Play/service_manager

# Start only MinIO (if not already running)
docker-compose up -d minio

# Or start all services
docker-compose up -d
```

**Verify MinIO is running:**
```bash
docker ps | grep minio
```

You should see:
```
service_manager_minio   minio/minio:latest   Up   0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp
```

---

### Step 2: Configure Environment Variables

```bash
cd admin

# Copy example environment file (if needed)
cp .env.minio.example .env.local

# Or add to existing .env.local:
cat >> .env.local << EOF
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
EOF
```

---

### Step 3: Initialize Buckets

```bash
npm run init-minio
```

**Expected output:**
```
🚀 Initializing MinIO buckets...
✅ Created bucket: profile-images
✅ Set public read policy for: profile-images
✅ Created bucket: documents
✅ Created bucket: kyc-documents
✅ Created bucket: receipts
✅ Created bucket: attachments
✅ MinIO buckets initialized successfully
✅ MinIO initialization complete!
```

---

### Step 4: Test Upload

Create a test file `test-upload.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>MinIO Upload Test</title>
</head>
<body>
    <h1>Upload Test</h1>
    <input type="file" id="fileInput" accept="image/*">
    <button onclick="upload()">Upload</button>
    <div id="result"></div>

    <script>
        async function upload() {
            const file = document.getElementById('fileInput').files[0];
            if (!file) {
                alert('Please select a file');
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'profile-images');
            formData.append('category', 'image');
            formData.append('userId', '123');

            try {
                const response = await fetch('http://localhost:3000/api/upload', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('result').innerHTML = `
                        <h3>Success!</h3>
                        <p>URL: ${result.data.url}</p>
                        <img src="${result.data.url}" style="max-width: 300px">
                    `;
                } else {
                    document.getElementById('result').innerHTML = `
                        <h3>Error</h3>
                        <p>${result.error}</p>
                    `;
                }
            } catch (error) {
                document.getElementById('result').innerHTML = `
                    <h3>Error</h3>
                    <p>${error.message}</p>
                `;
            }
        }
    </script>
</body>
</html>
```

**Test it:**
1. Start Next.js dev server: `npm run dev`
2. Open `test-upload.html` in browser
3. Select an image and click "Upload"
4. You should see the uploaded image displayed

---

### Step 5: Access MinIO Console

Open browser: http://localhost:9001

**Login:**
- Username: `minioadmin`
- Password: `minioadmin`

**What you can do:**
- Browse uploaded files
- Download files
- Delete files
- View storage usage
- Manage bucket policies

---

## 📊 Verify Installation

### Check Services

```bash
# Check MinIO is running
curl http://localhost:9000/minio/health/live

# Should return: OK
```

### Check Buckets

```bash
# List buckets (from inside container)
docker exec service_manager_minio mc ls local

# Should show:
# [2024-12-12 10:00:00 UTC]     0B attachments/
# [2024-12-12 10:00:00 UTC]     0B documents/
# [2024-12-12 10:00:00 UTC]     0B kyc-documents/
# [2024-12-12 10:00:00 UTC]     0B profile-images/
# [2024-12-12 10:00:00 UTC]     0B receipts/
```

---

## 🔧 Troubleshooting

### MinIO Won't Start

```bash
# Check logs
docker logs service_manager_minio

# Common issues:
# 1. Port 9000 or 9001 already in use
# 2. Permission issues with minio_data directory

# Fix permissions:
sudo chmod -R 777 minio_data/
```

### Cannot Upload Files

**Check:**
1. Is Next.js server running? `npm run dev`
2. Are buckets initialized? `npm run init-minio`
3. Check browser console for errors
4. Check MinIO logs: `docker logs service_manager_minio`

### Bucket Not Found

```bash
# Re-initialize buckets
npm run init-minio
```

---

## 📝 Usage Examples

### Upload from React Component

```tsx
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("bucket", "profile-images");
  formData.append("userId", userId);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  console.log("Uploaded:", data.data.url);
};
```

### Upload from GraphQL Mutation (Coming Soon)

```graphql
mutation UploadFile($file: Upload!) {
  uploadFile(file: $file, bucket: "profile-images") {
    url
    fileName
  }
}
```

---

## 🎯 Next Steps

1. ✅ Start MinIO
2. ✅ Initialize buckets
3. ✅ Test upload via API
4. 🔲 Integrate with user profile uploads
5. 🔲 Add KYC document uploads
6. 🔲 Implement receipt generation with storage

---

## 📞 Support

**Documentation:** See `MINIO_STORAGE_IMPLEMENTATION.md` for complete details

**Common Commands:**
```bash
# Restart MinIO
docker-compose restart minio

# View logs
docker logs -f service_manager_minio

# Initialize buckets
npm run init-minio

# Check storage usage
docker exec service_manager_minio mc du local/profile-images
```

---

**MinIO is ready! Start uploading files! 🎉**
