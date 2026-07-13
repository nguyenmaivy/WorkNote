// Khởi tạo Firebase - Auth và Firestore
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Lấy cấu hình từ .env
// Để kết nối Firebase, hãy tạo file .env trong thư mục gốc và điền các giá trị này.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSy_MOCK_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
};

// Chỉ khởi tạo nếu chưa có app nào
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Hiện tại đây chỉ là khung chuẩn bị sẵn (Skeleton).
 * Khi bạn cung cấp API Key thật trong `.env`, chúng ta có thể thiết lập:
 * - Đăng nhập tài khoản.
 * - Lưu toàn bộ `files`, `chatHistory` vào Firestore `db`.
 */
