import React, { useState } from "react";
import { UploadedFile } from "../types";
import { useDocumentUpload } from "../hooks/useDocumentUpload";
import { FileUploadDropzone } from "./doc-upload/FileUploadDropzone";
import { FileCardList } from "./doc-upload/FileCardList";

interface DocUploadSectionProps {
  files: UploadedFile[];
  onAddFile: (file: UploadedFile) => void;
  onUpdateFile: (id: string, updated: Partial<UploadedFile>) => void;
  onDeleteFile: (id: string) => void;
  activeFileId: string | null;
  onSelectActiveFile: (id: string) => void;
}

export default function DocUploadSection({
  files,
  onAddFile,
  onUpdateFile,
  onDeleteFile,
  activeFileId,
  onSelectActiveFile,
}: DocUploadSectionProps) {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // URL Input State
  const [fileUrl, setFileUrl] = useState<string>("");
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  const {
    fileProgress,
    addFileToWorkspace,
    handleImportFromLink,
    retryFile
  } = useDocumentUpload(onAddFile, onUpdateFile, onSelectActiveFile);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(addFileToWorkspace);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      Array.from(selectedFiles).forEach(addFileToWorkspace);
    }
    e.target.value = "";
  };

  const onFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl || !fileUrl.trim().startsWith("http")) {
      setUrlError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setUrlError(null);
    setIsFetchingUrl(true);
    
    try {
      await handleImportFromLink(fileUrl.trim());
      setFileUrl("");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <div className="space-y-8" id="upload-workspace-section">
      <FileUploadDropzone
        isDragging={isDragging}
        setIsDragging={setIsDragging}
        onFileDrop={handleFileDrop}
        onFileSelect={handleFileSelect}
        fileUrl={fileUrl}
        setFileUrl={setFileUrl}
        urlError={urlError}
        setUrlError={setUrlError}
        isFetchingUrl={isFetchingUrl}
        onImportFromLink={onFormSubmit}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <FileCardList
          files={files}
          activeFileId={activeFileId}
          onSelectActiveFile={onSelectActiveFile}
          onDeleteFile={onDeleteFile}
          onRetryFile={retryFile}
          fileProgress={fileProgress}
        />
        {/* Placeholder for 1/3 column if needed, but it currently takes col-span-2 and doesn't define the 3rd column in the original besides keeping the space open */}
      </div>
    </div>
  );
}
