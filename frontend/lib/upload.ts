// lib/upload.ts

interface UploadResponse {
  url: string;
  file_id?: string | null; // Make optional
  name: string;
}

export async function uploadFile(file: File): Promise<string> {
  try {
    console.log("🖼️ Starting upload via backend...", file.name);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("http://localhost:8000/uploads/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Upload failed");
    }

    const data: UploadResponse = await response.json();
    console.log("✅ Upload successful:", data.url);
    return data.url;
  } catch (error) {
    console.error("❌ Upload error:", error);
    throw error;
  }
}
