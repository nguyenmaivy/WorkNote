import { useState } from "react";
import type { UploadedFile } from "../types";

export function useDocumentUpload(
  onAddFile: (file: UploadedFile) => void,
  onUpdateFile: (id: string, updated: Partial<UploadedFile>) => void,
  onSelectActiveFile: (id: string) => void
) {
  const [fileProgress, setFileProgress] = useState<
    Record<string, { percent: number; stage: string }>
  >({});

  const getStageMessage = (percent: number, mimeType: string, fileName: string) => {
    const isPdf = mimeType.toLowerCase().includes("pdf");
    const isImage =
      mimeType.toLowerCase().includes("image") || !!fileName.match(/\.(png|jpe?g|webp|gif|bmp)$/i);
    const isAudio =
      mimeType.toLowerCase().includes("audio") || !!fileName.match(/\.(mp3|wav|m4a|ogg|flac)$/i);
    const isVideo =
      mimeType.toLowerCase().includes("video") || !!fileName.match(/\.(mp4|mov|avi|mkv|webm)$/i);

    if (percent < 15) return "Initializing file data and starting binary read...";
    if (percent < 45) {
      if (isPdf) return "Extracting PDF structure and parsing text...";
      if (isImage) return "Running Tesseract OCR scan to extract text...";
      if (isAudio || isVideo) return "Decoding audio stream and running Speech-to-Text...";
      return "Reading plain text file format...";
    }
    if (percent < 75) return "Sending structured payload to Gemini-3.5-flash...";
    if (percent < 90) return "Gemini AI is summarizing and analyzing the content...";
    if (percent < 98) return "Generating mind map nodes and review quiz questions...";
    return "Awaiting final response from the AI service...";
  };

  const processFileAI = async (file: UploadedFile, rawFile?: File) => {
    if (!rawFile && !file.base64Data) return;

    onUpdateFile(file.id, { status: "processing", errorMsg: undefined });
    setFileProgress((prev) => ({
      ...prev,
      [file.id]: { percent: 5, stage: "Loading file into buffer..." },
    }));

    let currentPercent = 5;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 8) + 3;
      if (currentPercent > 97) currentPercent = 97;
      setFileProgress((prev) => ({
        ...prev,
        [file.id]: {
          percent: currentPercent,
          stage: getStageMessage(currentPercent, file.mimeType, file.name),
        },
      }));
    }, 600);

    try {
      let res;
      if (rawFile) {
        const formData = new FormData();
        formData.append("file", rawFile);
        formData.append("name", file.name);
        formData.append("mimeType", file.mimeType);
        res = await fetch("/api/process-file", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/process-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            mimeType: file.mimeType,
            base64Data: file.base64Data,
          }),
        });
      }

      const data = await res.json();
      clearInterval(progressInterval);

      if (data.success) {
        setFileProgress((prev) => ({
          ...prev,
          [file.id]: { percent: 100, stage: "Analysis complete!" },
        }));
        onUpdateFile(file.id, {
          status: "success",
          summary: data.summary,
          extractedText: data.extractedText,
          quiz: data.quiz,
          mindmap: data.mindmap,
        });
        onSelectActiveFile(file.id);

        setTimeout(() => {
          setFileProgress((prev) => {
            const next = { ...prev };
            delete next[file.id];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || "File analysis failed");
      }
    } catch (e: any) {
      clearInterval(progressInterval);
      console.error(e);
      setFileProgress((prev) => {
        const next = { ...prev };
        delete next[file.id];
        return next;
      });
      onUpdateFile(file.id, {
        status: "error",
        errorMsg: e.message || "Failed to contact local AI processor",
      });
    }
  };

  const addFileToWorkspace = (rawFile: File) => {
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let mime = rawFile.type;
    const ext = (rawFile.name.split(".").pop() || "").toLowerCase();
    if (!mime || mime === "application/octet-stream") {
      if (ext === "m4a") mime = "audio/mp4";
      else if (ext === "mp3") mime = "audio/mp3";
      else if (ext === "wav") mime = "audio/wav";
      else if (ext === "ogg") mime = "audio/ogg";
      else if (ext === "flac") mime = "audio/flac";
      else if (ext === "aac") mime = "audio/aac";
      else if (ext === "mp4") mime = "video/mp4";
      else if (ext === "webm") mime = "video/webm";
      else mime = "application/octet-stream";
    }
    const newFile: UploadedFile = {
      id,
      name: rawFile.name,
      size: rawFile.size,
      mimeType: mime,
      status: "idle",
      blob: rawFile,
      createdAt: Date.now(),
    };
    onAddFile(newFile);
    processFileAI(newFile, rawFile);
  };

  const runLinkPipeline = async (url: string, fileId: string) => {
    const isYoutube = /youtube\.com|youtu\.be/i.test(url);
    const progressMime = isYoutube ? "video/mp4" : "application/pdf";
    const progressName = isYoutube ? "video_youtube.mp4" : "file_tu_link.pdf";

    onUpdateFile(fileId, {
      status: "processing",
      errorMsg: undefined,
      name: isYoutube ? "Fetching YouTube transcript..." : "Downloading remote file...",
    });

    setFileProgress((prev) => ({
      ...prev,
      [fileId]: {
        percent: 10,
        stage: isYoutube
          ? "Connecting to YouTube and pulling captions/transcript..."
          : "Connecting to the remote source...",
      },
    }));

    let currentPercent = 10;
    const progressInterval = setInterval(() => {
      currentPercent += Math.floor(Math.random() * 6) + 2;
      if (currentPercent > 92) currentPercent = 92;
      setFileProgress((prev) => ({
        ...prev,
        [fileId]: {
          percent: currentPercent,
          stage: getStageMessage(currentPercent, progressMime, progressName),
        },
      }));
    }, 700);

    try {
      const res = await fetch("/api/process-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();
      clearInterval(progressInterval);

      if (data.success) {
        setFileProgress((prev) => ({
          ...prev,
          [fileId]: { percent: 100, stage: "Link processed successfully!" },
        }));
        onUpdateFile(fileId, {
          name: data.name,
          size: data.size || 51200,
          mimeType: data.mimeType || "application/pdf",
          status: "success",
          summary: data.summary,
          extractedText: data.extractedText,
          quiz: data.quiz,
          mindmap: data.mindmap,
        });
        onSelectActiveFile(fileId);

        setTimeout(() => {
          setFileProgress((prev) => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || "Could not download or parse this link.");
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      console.error(err);
      onUpdateFile(fileId, {
        name: isYoutube ? "YouTube link failed" : "URL link failed",
        status: "error",
        errorMsg: err.message || "Download failed. Try a different file or attach it directly.",
      });
      setFileProgress((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
    }
  };

  const handleImportFromLink = async (url: string) => {
    const isYoutube = /youtube\.com|youtu\.be/i.test(url);
    const tempId = `link_${Date.now()}`;
    onAddFile({
      id: tempId,
      name: isYoutube ? "Fetching YouTube transcript..." : "Downloading remote file...",
      size: 0,
      mimeType: isYoutube ? "video/mp4" : "application/pdf",
      status: "processing",
      sourceUrl: url,
    });

    await runLinkPipeline(url, tempId);
  };

  const retryFile = (file: UploadedFile) => {
    if (file.sourceUrl) runLinkPipeline(file.sourceUrl, file.id);
    else processFileAI(file);
  };

  // Helper preset logic
  const loadPreset = (preset: any) => {
    const id = preset.id + "_" + Date.now();
    const newFile: UploadedFile = {
      ...preset,
      id,
      status: "success", // bypass AI since it's hardcoded
      createdAt: Date.now(),
    };
    onAddFile(newFile);
    onSelectActiveFile(id);
  };

  return {
    fileProgress,
    addFileToWorkspace,
    handleImportFromLink,
    retryFile,
    loadPreset,
  };
}
