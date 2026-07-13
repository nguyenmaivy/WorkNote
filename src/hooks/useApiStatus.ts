import { useState, useEffect } from "react";
import { apiClient } from "../services/api";

/**
 * Hook kiểm tra trạng thái API key lúc app khởi tạo.
 * Returns hasApiKey (boolean) để quyết định hiển thị demo banner.
 */
export function useApiStatus() {
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(true);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await apiClient.checkApiStatus();
        setHasApiKey(!data.isDemo);
      } catch {
        setHasApiKey(false);
      } finally {
        setIsChecking(false);
      }
    };
    check();
  }, []);

  return { hasApiKey, isChecking };
}
