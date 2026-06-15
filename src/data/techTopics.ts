import { TechTopic } from "../types";

export const techTopics: TechTopic[] = [
  {
    id: "multiplatform_compile",
    title: "1. Kiến Trúc App ⇆ Web và Ngôn Ngữ Biên Dịch",
    category: "LẬP TRÌNH DI ĐỘNG",
    question: "Làm sao để build một app sang Web và ngược lại? Sử dụng ngôn ngữ gì cho Backend, Frontend, Di động, Database, UI/UX?",
    explanation: `Việc chuyển đổi và chia sẻ mã nguồn giữa Web và Mobile hiện nay được giải quyết qua hai hướng tiếp cận chính:

1. **Từ Web sang Mobile (Web-first)**: 
   - Sử dụng các công cụ bao bọc như **Capacitor** hoặc **Apache Cordova**. 
   - Ứng dụng Web (HTML/CSS/JS viết bằng React, Vue, Angular) sẽ chạy bên trong một lớp WebView tối ưu hóa trên thiết bị Android/iOS.
   - Nhờ có cầu nối Native Bridge của Capacitor, mã JavaScript vẫn gọi được camera, GPS, cảm biến vân tay của thiết bị di động.

2. **Từ Mobile sang Web (Native-first)**:
   - Sử dụng các thư viện như **React Native** (React Native Web) hoặc **Flutter** (Flutter Web).
   - React Native biên dịch mã JavaScript thành các thành phần giao diện gốc (Native UI Widgets) của Android/iOS, đồng thời tạo ra cấu trúc DOM chuẩn khi chạy trên trình duyệt Web.
   - Flutter biên dịch ngôn ngữ **Dart** sang mã máy (Skia/CanvasKit) trên Mobile và render trực tiếp thành WebGL/Canvas trên trình duyệt.

### 🛠️ Phân Phối Công Nghệ Khuyên Dùng:
*   **Frontend Web**: React.js / Vite / Next.js (TypeScript) hoặc Tailwind CSS.
*   **Mobile App**: React Native (nếu giỏi JS/React) hoặc Flutter (nếu muốn hiệu năng dựng hình cao).
*   **Backend**: Node.js (Express/NestJS) dùng TypeScript để đồng bộ kiểu dữ liệu với Frontend.
*   **Database**: PostgreSQL / SQLite (cho chế độ offline di động) kết hợp với ORM Drizzle hoặc Prisma.
*   **UI/UX**: Thiết kế Figma bằng hệ thống Auto-Layout tương thích linh hoạt (Responsive Tokens).`,
    diagramSteps: [
      { title: "Viết Mã Nguồn (TypeScript)", desc: "Xây dựng các Component dùng React/JS chung cho cả giao diện di động lẫn trình duyệt.", icon: "code" },
      { title: "Lớp Native Bridge", desc: "Giúp JS giao tiếp với Mô-đun phần cứng của iOS, Android như Bluetooth, Camera.", icon: "cpu" },
      { title: "Đóng gói & Chạy", desc: "Biên dịch ra file IPA (iOS), APK (Android) và thư mục HTML/CSS tĩnh trên Web.", icon: "package" }
    ],
    visualCode: `// Ví dụ viết giao diện dùng React Native Web để tương thích cả Web/App
import React from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';

export default function MultiverseButton() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        Đang chạy trên: {Platform.OS === 'web' ? 'Trình duyệt Web 🌐' : 'Thiết bị Di động 📱'}
      </Text>
      <TouchableOpacity style={styles.btn}>
        <Text style={styles.btnText}>Bấm để gửi yêu cầu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
  btn: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 12 },
  btnText: { color: 'white', fontWeight: 'bold' }
});`
  },
  {
    id: "qr_scanning",
    title: "2. Quét Mã QR Đồng Bộ Web & Di Động",
    category: "GIAO TIẾP & TRÌNH DUYỆT",
    question: "Làm sao quét QR Code thì có thể mở dùng ngay lập tức cho cả Web và App (Nếu đã tải)?",
    explanation: `Giải pháp tốt nhất là sử dụng **Deep Linking kết hợp Universal Links (iOS) và App Links (Android)**. 

### Quy trình hoạt động:
1. Bạn tạo ra một mã QR chứa một liên kết dạng chuẩn HTTPS (ví dụ: \`https://vietlearn.vn/study/123\`).
2. **Khi quét mã QR trên điện thoại**:
   - Hệ điều hành di động (iOS/Android) sẽ chặn liên kết này lại và kiểm tra xem trên thiết bị đã cài đặt ứng dụng có cấu hình đón đầu tên miền \`vietlearn.vn\` hay chưa.
   - **Đã cài app**: Hệ điều hành tự động kích hoạt mã nguồn di động, trực tiếp mở app kèm tham số định tuyến \`123\`.
   - **Chưa cài app**: Hệ điều hành sẽ chuyển tiếp yêu cầu mở đường dẫn sang trình duyệt di động (Safari/Chrome). Trình duyệt sẽ tải **Web App (SPA / PWA)** hoạt động đầy đủ tính năng ngay tại vị trí đó để người dùng không phải chờ tải app lâu từ chợ ứng dụng.

### Kiến trúc Progressive Web App (PWA):
Nếu bạn hoàn toàn không muốn người dùng qua bước tải App từ CH Play/App Store, bạn có thể biến trang Web thành một ứng dụng PWA. Khi quét QR, Web sẽ hiển thị nút "Thêm vào màn hình chính" (Add to Home Screen). Ứng dụng PWA sẽ tải tài nguyên offline, chạy nhanh như một ứng dụng gốc mà không tốn dung lượng lưu trữ thực tế.`,
    diagramSteps: [
      { title: "Tạo Mã QR chuẩn HTTPS", desc: "Liên kết trỏ về máy chủ web: https://vietlearn.com/room", icon: "qr-code" },
      { title: "Hệ Điều Hành Di Động chặn URL", desc: "OS kiểm tra ứng dụng cài đặt trong máy xem có cấu hình đón đầu tên miền không.", icon: "shield" },
      { title: "Rẽ nhánh Hành Động", desc: "Nếu đã cài: Mở App ngay lập tức. Nếu Chưa cài: Mở Web App di động ngay trên Safari/Chrome.", icon: "git-branch" }
    ],
    visualCode: `// Cấu hình chìa khóa bảo mật trên Server để iOS tự nhận diện thiết bị đón liên kết:
// File: domain.com/.well-known/apple-app-site-association (Bản ghi JSON bảo mật)
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID12345.com.vietlearn.studio",
        "paths": [ "/study/*", "/room/*" ]
      }
    ]
  }
}`
  },
  {
    id: "expo_tunneling",
    title: "3. Khắc Phục Khác Lớp Mạng Khi Chạy Thử Di Động (Expo Go)",
    category: "THỬ NGHIỆM LOCAL",
    question: "Làm sao thiết bị di động khác mạng nội bộ vẫn có thể kết nối test ứng dụng local (không cần chung Wi-Fi)?",
    explanation: `Mặc định, Expo Go yêu cầu thiết bị kiểm thử di động và máy tính của bạn phải chung một mạng cục bộ (LAN) vì máy di động phải kết nối tới IP nội bộ dạng \`192.168.x.x\`. Thật không may nếu bạn đi công tác hoặc máy tính dùng mạng dây, điện thoại dùng 4G thì không kết nối được.

Để giải quyết, chúng ta sử dụng cơ chế **Reverse Tunneling (Đường hầm mạng đảo ngược)**. Nó tạo ra một cổng công khai (Secure Tunnel Gateway) trên Internet chuyển tiếp mọi yêu cầu dữ liệu trực tiếp về cổng local di dộng của bạn trên máy tính.

### Các công cụ hàng đầu:
1. **Expo Tunnel Mode (Tích hợp sẵn ngrok)**:
   - Bạn chỉ cần chạy: \`npx expo start --tunnel\` hoặc gõ \`npm run start -- --tunnel\`.
   - Expo sẽ tự động thiết lập một đường hầm an toàn của ngrok và xuất ra QR code chứa URL công khai có dạng: \`exp://u.expo.dev/...-a1-b2\`. Điện thoại quét mã này qua 4G sẽ lướt mượt mà như chung mạng Wi-Fi.
2. **Cloudflare Tunnels (Cực kỳ khuyên dùng, bảo mật cao)**:
   - Cài đặt Cloudflared \`cloudflared tunnel --url http://localhost:8081\`.
   - Tạo ra một subdomain miễn phí trỏ thẳng về máy của bạn.
3. **LocalTunnel hoặc Ngrok độc lập**:
   - Chạy \`npx localtunnel --port 3000\` để mở rộng máy chủ backend của bạn hướng ra thế giới.`,
    diagramSteps: [
      { title: "Kích hoạt Máy chủ Máy tính", desc: "Khởi động Expo Metro Bundler tại cổng nội bộ 8081.", icon: "server" },
      { title: "Mở Cổng Đường Hầm", desc: "Chạy lệnh với tùy chọn --tunnel để thiết lập định tuyến public bảo mật.", icon: "navigation" },
      { title: "Thiết bị di động truy cập", desc: "Điện thoại đọc URL ngrok/Cloudflare thông qua Internet (mạng 4G/3G/Wi-Fi khác) mượt mà.", icon: "phone" }
    ],
    visualCode: `# 1. Thiết lập Expo chạy ở chế độ đường hầm tunnel
$ npx expo start --tunnel

# 2. Hoặc cấu hình ngrok chia sẻ server API Backend cổng 3000 ra ngoài Internet
$ npx ngrok http 3000

# 3. Để kiểm tra tình trạng kết nối đường hầm đang chạy
http://127.0.0.1:4040 # Trang điều khiển ngrok cục bộ`
  },
  {
    id: "vietnamese_nlp",
    title: "4. Nhận Diện Âm Sắc 3 Miền Tiếng Việt (Bắc - Trung - Nam)",
    category: "XỬ LÝ NGÔN NGỮ (NLP)",
    question: "Làm thế nào để xử lý giọng nói, nhận diện vùng miền Bắc, Trung, Nam của Tiếng Việt để hỗ trợ phiên dịch chính xác?",
    explanation: `Xử lý tiếng Việt (đặc biệt là nhận diện giọng nói - ASR và tổng hợp giọng nói - TTS) gặp thách thức lớn do Tiếng Việt là một ngôn ngữ có thanh điệu vô cùng phức tạp, phụ thuộc mạnh mẽ vào cách phát âm của các vùng miền (Bắc, Trung, Nam).

### 🧩 Sự khác biệt cơ bản về âm ngữ học:
- **Giọng miền Bắc (Crisp & Tonal)**: Phân biệt rõ ràng tất cả 6 thanh điệu (Ngang, Huyền, Sắc, Hỏi, Ngã, Nặng). Đặc biệt phân biệt thanh Hỏi và Thanh Ngã cực kỳ tinh tế. Phụ âm 'd' , 'gi', 'r' thường đồng hóa phát âm thành âm '/z/'.
- **Giọng miền Nam (Smooth & Rounded)**: Thường gộp thanh Hỏi và thanh Ngã thành duy nhất thanh Hỏi (Ví dụ: 'Sữa' phát âm giống 'Sửa'). Các phụ âm 'v', 'd' thường đồng hóa thành '/j/' hoặc '/g/'. Âm đuôi 'n' và 'ng' (ví dụ 'Trăn' và 'Trăng') dễ phát âm giống nhau.
- **Giọng miền Trung (Deep & High Pitch Contrast)**: Có xu hướng biến đổi thanh Hỏi/Ngã thành giọng nặng hơn. Các th đại từ địa phương (Mô, Tê, Răng, Rứa) và các từ vựng đặc hữu làm nhiễu nghiêm trọng các bộ từ điển tiêu chuẩn.

### 🚀 Giải pháp hoàn chỉnh trong thực tế:
1. **End-to-End Deep Learning Speech Models**:
   - Sử dụng mô hình **OpenAI Whisper** hoặc **Gemini Flash Audio Preview** đã được tinh chỉnh (Finetuned) trên các bộ ngữ liệu tiếng Việt đa dạng (như dataset FPT Speech, VIVOS, Common Voice VN). Những dữ liệu học máy này phải được thu âm trực tiếp từ cả 3 vùng địa lý với nhãn dialect rõ ràng.
2. **Hệ thống phân định vùng miền trước khi phân tích (Dialect Classifier)**:
   - Dùng một lớp máy học trích xuất đặc trưng âm thanh như MFCCs (Mel-frequency cepstral coefficients) để dự đoán âm điệu của người dùng thuộc miền nào. Sau đó, chuyển đổi decoder tương ứng với cấu hình phát âm của miền đó để giảm tỷ lệ lỗi chữ (Word Error Rate - WER).`,
    diagramSteps: [
      { title: "Thu Nhận Tần Số Sóng", desc: "Ghi âm file âm thanh từ Micro, thực hiện chuẩn hóa biên độ và loại bỏ tiếng ồn nền.", icon: "mic" },
      { title: "Phân Tích Mel-Spectrogram", desc: "Biến đổi tần số thành phổ Mel để thu nhận các đặc trưng âm sắc vùng miền riêng biệt.", icon: "activity" },
      { title: "Decoders Đa Điều Hệ", desc: "Bộ giải mã ngữ âm sử dụng từ điển phát âm của các miền để viết chữ văn bản chính xác.", icon: "check-circle" }
    ],
    visualCode: `// Mẫu tiền xử lý âm thanh chuyển thành vector đặc trưng trong Python (PyTorch)
import librosa
import numpy as np

def extract_dialect_features(audio_path):
    # Tải tệp âm thanh với tần số lấy mẫu 16kHz tiêu chuẩn
    y, sr = librosa.load(audio_path, sr=16000)
    # Trích xuất 13 dải lọc MFCC thể hiện tốt nhất đặc tính giọng nói vùng miền
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = np.mean(mfcc.T, axis=0) # Thu gọn chiều dữ liệu dạng trung bình
    return mfcc_mean`
  },
  {
    id: "nlp_promptless",
    title: "5. Chatbot Hiểu Tự Do Không Cần Prompt Chuẩn",
    category: "HUẤN LUYỆN CHATBOT",
    question: "Làm thế nào để chatbot tự hiểu ý định khi người dùng chat tự do, không theo cấu trúc prompt?",
    explanation: `Để chatbot luôn hướng câu trả lời về đúng mục tiêu bất kể người dùng chat ngắn gọn, cẩu thả, không viết dấu hoặc gõ tắt, chúng ta áp dụng mô hình **Intent Classification (Phân loại ý định)** và **Semantic Embedding Match (Khớp nối biểu diễn ngữ nghĩa)**.

### Các chiến thuật mấu chốt:
1. **Sử dụng Semantic Embeddings (Chỉ số vector tương đồng)**:
   - Cài đặt một mô hình embeddings như \`gemini-embedding-2-preview\` hoặc mô hình nhỏ chạy local \`sentence-transformers\`.
   - Chuyển mọi câu hỏi chuẩn mẫu (ví dụ: "Làm sao vẽ sơ đồ?", "Tạo mindmap thế nào?", "Vẽ cây ý tưởng") thành các Vector tọa độ trong không gian số n-chiều.
   - Khi người dùng chat tự do: "muốn xem sơ đồ", "lam maps", hệ thống chuyển câu chat đó thành vector và tính toán góc tương đồng **Cosine Similarity**. Câu tương đồng cao nhất sẽ được chọn và kích hoạt tính năng tương ứng.
2. **LLM Hybrid Slot Filling (Điền chỗ trống ngữ nghĩa)**:
   - Nhờ mô hình ngôn ngữ lớn (Gemini 3.5 Flash) đóng vai trò bộ lọc thông tin đầu vào. 
   - LLM sẽ phân tích cú pháp để phát hiện các Entity (Thực thể) và Group Intent như: \`action_type: generate\`, \`target: quiz\`. Dù người dùng viết tắt, AI vẫn trích xuất thành công bộ tham số hành động chính xác.`,
    diagramSteps: [
      { title: "Chuẩn hóa câu chat đầu vào", desc: "Xử lý ký tự đặc biệt, sửa lỗi tả tự động, xử lý văn bản không dấu.", icon: "type" },
      { title: "Tính toán Vector Ngữ Nghĩa", desc: "Chuyển đổi câu sang biểu diễn số lượng đo n-chiều bằng mô hình Embeddings.", icon: "trending-up" },
      { title: "Ánh xạ & Kích hoạt Hành động", desc: "Ghép câu chat với Ý Định (Intent) gần nhất để phục vụ phản hồi chính xác.", icon: " zap" }
    ],
    visualCode: `// Minh họa cách so khớp Cosine Similarity sử dụng Javascript đơn giản
function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
// Nếu điểm so khớp vượt ngưỡng 0.82 => Kích hoạt hành động mà không cần prompt chi tiết!`
  },
  {
    id: "secure_pdf_ocr",
    title: "6. Nhận Dạng File Mặt Kỹ Thuật & Bảo Mật Mã Độc",
    category: "XỬ LÝ FILE",
    question: "Làm sao để nhận dạng file PDF sang Docs khi tệp có thể chứa virus hay mã độc ẩn?",
    explanation: `Việc đọc văn bản từ PDF/DOCS và xử lý thông tin luôn tiềm ẩn nguy cơ dính mã độc thực thi (ví dụ: macro nguy hiểm chứa mã khai thác lỗ hổng tràn bộ đệm của thư viện thư mục hoặc virus thực thi nấp bóng PDF).

### Các nguyên tắc bảo mật và kỹ thuật khắc phục:
1. **Isolated Sandbox Processing (Môi trường cách ly hoàn toàn)**:
   - Các file tải lên tuyệt đối **không** được mở trực tiếp bằng phần mềm Office gốc trên máy chủ chính.
   - Thư viện chuyển dịch văn bản phải chạy trong một môi trường Container bị giới hạn chặt chẽ (Docker Scratch Sandbox, AWS Lambda biệt lập, hoặc Google Cloud Run Sandbox). Container này không có quyền truy cập root, không có kết nối internet tự do hướng ra ngoài và tự động bị hủy (auto-destroyed) ngay sau khi dịch xong.
2. **Extract text only (Chỉ trích xuất text thô)**:
   - Tuyệt đối tách riêng văn bản thô khỏi định dạng nhị phân nguồn. 
   - Sử dụng thư viện bảo mật như \`pdf-parse\` hoặc \`pdfjs-dist\` để quét từng trang vật lý của PDF, chỉ đọc các chuỗi ký tự UTF-8 và trích xuất ảnh nhúng, bỏ qua tất cả khối mã thực thi hoặc thuộc tính Javascript nhúng trong PDF.
3. **Mô-đun OCR Thay Thế Để Chống Mã Độc**:
   - Nếu PDF bị khóa, mã hóa phức tạp hoặc đáng nghi, ta sử dụng cơ chế bảo mật tối ưu: Chuyển toàn bộ các trang PDF thành định dạng ảnh nhẹ (.PNG/.JPG) một cách cô lập.
   - Sử dụng công nghệ trích xuất OCR để đọc văn bản từ ảnh đó. OCR chỉ thu nạp điểm ảnh (pixels) của chữ viết, triệt tiêu 100% mã độc nấp bóng mã nhị phân trong file gốc.`,
    diagramSteps: [
      { title: "Tải file vào Sandbox", desc: "Lưu file vào phân vùng cô lập, từ chối quyền thực thi các kịch bản lệnh nhúng.", icon: "lock" },
      { title: "Đồ họa hóa sang định dạng ảnh", desc: "Chuyển đổi từng trang của file thành ảnh trung gian PNG để triệt tiêu mã thực thi.", icon: "image" },
      { title: "Quét OCR & Đọc Văn bản Thô", desc: "Trích xuất văn bản thuần UTF-8 và bàn giao cho LLM cấu trúc hóa mà không bị mã độc lây lan.", icon: "file-text" }
    ],
    visualCode: `// Quy trình chuyển hóa an toàn sang định dạng Ảnh để phân tích OCR (Cấu trúc NodeJS)
import { pdfToImageConverter } from "secure-pdf-sandbox";
import Tesseract from "tesseract.js";

async function secureTextExtraction(pdfBuffer) {
  // Bước 1: Kết xuất ảnh từ trang 1, bảo đảm triệt hóa các mã độc thực thi
  const imagePageOne = await pdfToImageConverter(pdfBuffer, { pageNum: 1 });
  
  // Bước 2: Thực thi OCR trên dữ liệu ảnh điểm để lấy chữ viết thô cực kỳ an toàn
  const { data: { text } } = await Tesseract.recognize(imagePageOne, 'vie');
  return text; // Chữ viết an toàn 100% được trả về
}`
  },
  {
    id: "formatting_translate",
    title: "7. Dịch Tự Động Giữ Nguyên Định Dạng Formats",
    category: "NHÀ PHÒNG LAB DỊCH THUẬT",
    question: "Làm cách nào để dịch tự động văn bản tài liệu gốc mà không làm hư hỏng, mất đi các cấu trúc gốc (Heading, List...)?",
    explanation: `Dịch văn bản giữ nguyên format là một thử thách khó vì trình dịch tự động hay có xu hướng viết lại câu, thay đổi trật tự dấu, gộp đoạn, hoặc dịch nhầm luôn cả thẻ đánh dấu định dạng (như thẻ thô markdown, HTML tags).

### Giải pháp kỹ thuật 3 bước đỉnh cao:

1. **Phương pháp Tokenize & Tag-Shielding (Bảo vệ Thẻ)**:
   - Trước khi gửi văn bản tới AI dịch thuật, công cụ phân tích sẽ bóc tách các thẻ định dạng và thay bằng các mã bảo vệ ảo dạng chữ số (ví dụ: \`**Học tập**\` chuyển thành \`{TAG_1}Học tập{TAG_2}\`).
   - Yêu cầu AI dịch tuyệt đối bỏ qua và giữ nguyên vị trí của các thẻ bảo hộ ảo có dạng \`{TAG_X}\`.
   - Sau khi nhận bản dịch, ta khôi phục \`{TAG_1}\` thành chữ đậm \`**\` tương ứng.

2. **Dịch Sử Dụng Structured Agent (Nhờ sức mạnh của LLM)**:
   - Với các LLM tiên tiến như Gemini 3.5 Flash, ta cung cấp một tập lệnh System Instruction nghiêm ngặt, hướng dẫn LLM hiểu rằng chúng chỉ được dịch phần nội dung ngôn ngữ hiển thị gốc, đồng thời giữ nguyên cấu trúc Markdown tổng thể.
   - Thêm bộ kiểm tra JSON schema để kiểm tra tính toàn vẹn của số lượng tiêu đề đầu vào trước và sau khi dịch.

3. **Cơ Chế Caching Để Giảm Độ Trễ (Overhead)**:
   - Lưu trữ mã hash của toàn bộ đoạn văn đã được dịch vào LocalStorage hoặc cơ sở dữ liệu Redis. Nếu đoạn văn hoặc dòng đó đã được dịch trước đây, ta lấy ra dùng luôn, cắt giảm tối đa chi phí gọi API và tăng tốc độ trải nghiệm lên gần 0ms!`,
    diagramSteps: [
      { title: "Bản địa hóa cấu trúc tài liệu", desc: "Phân tích tài liệu thành từng phần nhỏ (paragraphs, headings) kèm chỉ mục thẻ.", icon: "database" },
      { title: "Dịch qua Mô hình LLM bảo vệ format", desc: "Mô hình dịch ngôn ngữ và bảo lưu nguyên trạng các thẻ tag mã hóa định dạng.", icon: "globe" },
      { title: "Đồng bộ hóa & Cache", desc: "Ghép các đoạn dịch lại với nhau và lưu cache để tránh tiêu tốn cuộc gọi dịch trùng lặp.", icon: "cpu" }
    ],
    visualCode: `// Mẫu prompt gửi LLM tối ưu bảo vệ kiến trúc văn bản khi dịch:
const translationPrompt = (vietnameseText) => \`
  Hãy dịch văn bản học thuật sau sang Tiếng Anh.
  CHỈ THỊ CỐT LÕI:
  - Giữ lại 100% tất cả thẻ định dạng của Markdown như #, ##, **, _, \` (inline code), danh sách liên kết.
  - Không thay đổi trật tự dòng hay gộp đoạn văn dưới mọi hình thức.
  
  Văn bản cần dịch:
  """
  \${vietnameseText}
  """
\`;`
  },
  {
    id: "image_ocr_flow",
    title: "8. Trích Xuất Sơ Đồ Tư Duy Từ Điểm Ảnh Hình Ảnh (OCR + Mapping)",
    category: "KIÊN TRÚC SƠ ĐỒ",
    question: "Làm sao tự động trích xuất nội dung văn bản từ một hình ảnh rồi đưa trực tiếp chuyển thành Sơ đồ tư duy?",
    explanation: `Đây là tính năng kết hợp hoàn hảo giữa công nghệ **Thị giác máy tính (Computer Vision - OCR)** và **Phân loại Ngữ nghĩa (Natural Language Structuring)**.

### Bộ khung vận hành gồm 4 khối chính:
1. **Khối Thu Nhận & OCR (Optical Character Recognition)**:
   - Người dùng tải lên hình ảnh chụp bài viết hoặc bản thảo dạng sơ đồ.
   - Hệ thống quét hình ảnh bằng **Gemini 3.5 Flash** (sử dụng khả năng Vision nhận diện chất lượng nổi bật). Nó đọc từng khối chữ trên ảnh kèm tọa độ bọc (bounding boxes).
2. **Khối Tạo Cấu Trúc Ngữ Nghĩa (Hierarchy Generator)**:
   - LLM sẽ nhận thông tin thô từ OCR + tọa độ vị trí. Dựa vào cỡ chữ to nhỏ, độ thụt lề thụt dòng, hoặc bố cục tọa độ tương đối, LLM nhận biết khối nào là Tiêu đề chính, khối nào là tiểu mục con.
   - LLM tự động chuyển đổi cấu trúc phẳng thô thành định dạng cây dạng JSON phân tầng chuẩn mực có các nút \`id\`, \`label\`, và danh sách con \`children\`.
3. **Khối Hiển Thị Sơ Đồ Tương Tác**:
   - Máy khách nhận dữ liệu JSON phân tầng. Sử dụng nền tảng dựng hình SVG/Canvas động, vẽ các nút sơ đồ tự động phân tách khoảng cách, tạo hiệu ứng mượt mà (chỉ mục dãn nở, kéo thả chuyển dịch nút, sửa tiêu đề trực tiếp).

Điều này giúp việc chụp ảnh một cuốn sách giáo khoa, vở ghi chép, hay bảng trắng công việc lập tức hóa thân thành sơ đồ tư duy dạng kỹ thuật số sinh động chỉ trong vòng chưa đầy 3 giây!`,
    diagramSteps: [
      { title: "Tải Hình ảnh Điểm ảnh", desc: "Chụp ảnh bảng vẽ tay hoặc tài liệu rồi thực hiện tiền xử lý độ tương phản ảnh.", icon: "camera" },
      { title: "Đồng hợp phân mảnh Vision LLM", desc: "Mô hình Gemini-Flash Vision vừa đọc chữ vừa phân tích tọa độ của các phân đoạn.", icon: "view" },
      { title: "Kết xuất sơ đồ hình cây SVG", desc: "Vẽ cây sơ đồ tư duy động trực quan trên giao diện, hỗ trợ di dời kéo thả và chỉnh sửa.", icon: "share-2" }
    ],
    visualCode: `// Cấu trúc cây sơ đồ tư duy (MindMap Node) chuẩn JSON được xuất ra để giao diện hiển thị:
{
  "id": "root",
  "label": "Mô hình Trí Tuệ Nhân Tạo AI",
  "children": [
    {
      "id": "node_1",
      "label": "Học máy có giám sát (Supervised)",
      "children": [
        { "id": "node_1_1", "label": "Phân loại (Classification)" },
        { "id": "node_1_2", "label": "Hồi quy (Regression)" }
      ]
    },
    {
      "id": "node_2",
      "label": "Học sâu (Deep Learning)",
      "children": [
        { "id": "node_2_1", "label": "Mạng nơ-ron CNN cho xử lý hình ảnh" }
      ]
    }
  ]
}`
  }
];
