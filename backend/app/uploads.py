# app/uploads.py

import os
import uuid

import aiofiles
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from .auth import current_active_verified_user
from .logging_config import logger
from .models import User

router = APIRouter(prefix="/uploads", tags=["Uploads"])

# Define our static folders
STATIC_IMG_DIR = "app/static/images"
STATIC_VID_DIR = "app/static/videos"  # 👈 1. Add video dir
BASE_URL = "http://localhost:8000"


@router.post("/upload")
async def upload_file(  # 👈 2. Rename function to be generic
    file: UploadFile = File(...),
    user: User = Depends(current_active_verified_user),
):
    """
    Upload an image OR video to the local static folder.
    """

    # 👈 3. Add video types to the allowed list
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
        logger.warning(f"Upload attempt with invalid file type: {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Only allowed: {', '.join(allowed_types)}",
        )

    # 4. Check file type to determine save location
    if file.content_type.startswith("image"):
        save_dir = STATIC_IMG_DIR
        url_path = "images"
    elif file.content_type.startswith("video"):
        save_dir = STATIC_VID_DIR
        url_path = "videos"
    else:
        # This should be caught by the list above, but as a fallback
        raise HTTPException(status_code=400, detail="Unsupported file category.")

    # Generate a unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(save_dir, unique_filename)

    try:
        # Save the file
        async with aiofiles.open(file_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)

        # 5. Create the correct URL
        file_url = f"{BASE_URL}/static/{url_path}/{unique_filename}"

        logger.info(f"✅ File saved by {user.email}: {file_url}")

        return {
            "url": file_url,
            "file_id": None,
            "name": unique_filename,
        }
    except Exception as e:
        logger.error(f"❌ Local upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="File upload failed.")
