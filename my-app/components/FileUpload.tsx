import { useState } from "react";
import { useSession } from "next-auth/react";

type FileUploadProps = {
  onUpload: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
};

export default function FileUpload({
  onUpload,
  onUploadingChange,
}: FileUploadProps) {
  const { data: session } = useSession();
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.error("❌ No file selected.");
      return;
    }

    if (!session?.user?.id) {
      console.error("❌ User is not authenticated.");
      return;
    }

    if (session.user.role !== "admin") {
      console.error("❌ User does not have permission to upload files.");
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/products/image", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.publicUrl) {
        throw new Error(result.error || "Failed to upload image.");
      }

      onUpload(result.publicUrl);
    } catch (error) {
      console.error("📛 Upload failed:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload image."
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Converting and uploading image...</p>}
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}
