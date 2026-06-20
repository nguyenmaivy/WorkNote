import { useState, useEffect } from "react";
import { apiClient } from "../services/api";
import type { UploadedFile, TranslateSourceField } from "../types";

/**
 * Hook quản lý translation state & handler.
 * Tách toàn bộ translation logic ra khỏi App.tsx.
 */
export function useTranslation(activeFile: UploadedFile | null) {
  const [translatedText, setTranslatedText] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translateTargetLang, setTranslateTargetLang] = useState<string>("en");
  const [translateSourceField, setTranslateSourceField] = useState<TranslateSourceField>("extractedText");
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Reset khi đổi file
  useEffect(() => {
    setTranslatedText("");
    setTranslationError(null);
    setTranslateTargetLang("en");
  }, [activeFile?.id]);

  const handleTranslate = async () => {
    if (!activeFile) return;

    const textToTranslate =
      translateSourceField === "summary" ? activeFile.summary : activeFile.extractedText;

    if (!textToTranslate) {
      setTranslationError("Nội dung học tập nguồn đang trống hoặc dọn dẹp.");
      return;
    }

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const data = await apiClient.translate(textToTranslate, translateTargetLang);
      setTranslatedText(data.translatedText);
    } catch (err: any) {
      console.error(err);
      setTranslationError(err.message || "Không thể thực hiện dịch đa ngôn ngữ.");
    } finally {
      setIsTranslating(false);
    }
  };

  const changeSourceField = (field: TranslateSourceField) => {
    setTranslateSourceField(field);
    setTranslatedText("");
  };

  const changeTargetLang = (lang: string) => {
    setTranslateTargetLang(lang);
    setTranslatedText("");
  };

  return {
    translatedText,
    isTranslating,
    translateTargetLang,
    translateSourceField,
    translationError,
    handleTranslate,
    changeSourceField,
    changeTargetLang,
  };
}
