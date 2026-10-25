import { UploadCloud } from "@/registry/items/upload-cloud/upload-cloud";

export default function UploadCloudDemo() {
  return (
    <UploadCloud
      description="PDF, PNG or CSV, up to 25 MB each."
      fileName="q3-brief.pdf"
      fileSize="2.4 MB"
      fileType="PDF"
      hue="sky"
      title="Drop files to upload"
    />
  );
}
