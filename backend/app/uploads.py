# app/uploads.py
import os
import uuid

import boto3
from botocore.exceptions import NoCredentialsError
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from .auth import current_active_verified_user
from .config import get_settings  # 👈 Import settings
from .logging_config import logger
from .models import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# 👇 1. Load settings (Safe & Typed)
settings = get_settings()

# 2. Initialize R2 Client using settings
try:
    s3_client = boto3.client(
        service_name="s3",
        endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )
except Exception as e:
    logger.error(f"Failed to initialize R2 client: {e}")
    s3_client = None


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: User = Depends(current_active_verified_user),
):
    """
    Upload an image OR video to Cloudflare R2.
    """
    if not s3_client:
        raise HTTPException(status_code=500, detail="Storage service not configured")

    # Validate File Type
    allowed_types = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    # Generate Unique Filename
    # We use "unknown" fallback to prevent NoneType error if filename is missing
    filename = file.filename or "unknown.bin"
    file_extension = os.path.splitext(filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"

    folder = "videos" if file.content_type.startswith("video") else "images"
    s3_key = f"{folder}/{unique_filename}"

    try:
        # 3. Upload to R2 using settings.R2_BUCKET_NAME
        s3_client.upload_fileobj(
            file.file,
            settings.R2_BUCKET_NAME,  # 👈 Guarantees a string, not None
            s3_key,
            ExtraArgs={"ContentType": file.content_type},
        )

        # 4. Construct the Public URL
        base_url = settings.R2_PUBLIC_URL.rstrip("/")
        file_url = f"{base_url}/{s3_key}"

        logger.info(f"✅ File uploaded to R2 by {user.email}: {file_url}")

        return {
            "url": file_url,
            "file_id": unique_filename,
            "name": unique_filename,
        }

    except NoCredentialsError:
        logger.error("❌ R2 Credentials missing")
        raise HTTPException(status_code=500, detail="Server configuration error.")
    except Exception as e:
        logger.error(f"❌ R2 upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed.")
