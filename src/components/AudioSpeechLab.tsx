import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, 
  Square, 
  Play, 
  Sparkles, 
  Volume2, 
  HelpCircle, 
  VolumeX, 
  RefreshCw,
  Languages,
  Tv,
  Activity,
  Download,
  Trash2,
  Info
} from "lucide-react";

export default function AudioSpeechLab() {
  const [activeLabTab, setActiveLabTab] = useState<"dialect" | "live-translate">("dialect");
  
  // Dialect & TTS States
  const [textToSpeak, setTextToSpeak] = useState<string>(
    "Chào mừng các bạn đã ghé thăm phòng thí nghiệm âm thanh VietLearn. Hãy kiểm thử giọng nói của bạn!"
  );
  const [selectedRegion, setSelectedRegion] = useState<"north" | "central" | "south">("north");
  const [ttsSpeed, setTtsSpeed] = useState<number>(1);
  const [ttsPitch, setTtsPitch] = useState<number>(1);
  
  // Recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback states
  const [isPlayingTts, setIsPlayingTts] = useState<boolean>(false);
  const [ttsStatus, setTtsStatus] = useState<string>("");
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- New Live Audio Translator States ---
  const [isLiveTranslating, setIsLiveTranslating] = useState<boolean>(false);
  const [liveInputSource, setLiveInputSource] = useState<"mic" | "display">("mic");
  const [liveSourceLang, setLiveSourceLang] = useState<string>("en");
  const [liveTargetLang, setLiveTargetLang] = useState<string>("vi");
  const [liveStatus, setLiveStatus] = useState<string>("");
  const [liveTranscript, setLiveTranscript] = useState<{
    id: string;
    time: string;
    original: string;
    translated: string;
    isDemo?: boolean;
  }[]>([]);

  const subtitlesEndRef = useRef<HTMLDivElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const liveLoopActiveRef = useRef<boolean>(false);

  // Clean elements on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Ensure we release any active video/audio stream locks on unmount
      liveLoopActiveRef.current = false;
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Soft scroll to bottom of subtitle logs
  useEffect(() => {
    if (subtitlesEndRef.current) {
      subtitlesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveTranscript]);

  // 1. Live Recording via browser Microphone
  const startRecording = async () => {
    try {
      setRecordedBlobUrl(null);
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedBlobUrl(url);
        
        // Stop all track media streams to release browser lock
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (error: any) {
      console.error("Microphone access denied:", error);
      alert("Không tìm thấy micro hoặc micro bị từ chối kết nối. Hãy kiểm tra cài đặt trình duyệt!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Convert seconds to clean format MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  // 2. Playback TTS (Calls server-side API or uses HTML5 SpeechSynthesis client fallback)
  const handleTTSPlay = async () => {
    if (!textToSpeak.trim()) return;

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }
    
    setIsPlayingTts(true);
    setTtsStatus("Đang tổng hợp giọng nói...");

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, region: selectedRegion })
      });

      const data = await response.json();

      if (data.success && data.base64Audio) {
        const audioUrl = `data:audio/wav;base64,${data.base64Audio}`;
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.playbackRate = ttsSpeed;

        audio.onended = () => {
          setIsPlayingTts(false);
          setTtsStatus("");
        };

        await audio.play();
        setTtsStatus(`Playing Gemini Voice (Giọng ${selectedRegion === "north" ? "Bắc" : selectedRegion === "central" ? "Trung" : "Nam"})`);
      } else {
        // Fallback to beautiful HTML5 browser SpeechSynthesis if key is not configured
        setTtsStatus("Chạy thử bằng tiếng máy tính local (Demo)...");
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        
        utterance.lang = "vi-VN";
        utterance.rate = ttsSpeed;
        utterance.pitch = ttsPitch;
        
        utterance.onend = () => {
          setIsPlayingTts(false);
          setTtsStatus("");
        };

        window.speechSynthesis.speak(utterance);
      }
    } catch (e: any) {
      console.warn("TTS fetch failed, falling back to Web Speech API:", e);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "vi-VN";
      utterance.rate = ttsSpeed;
      utterance.pitch = ttsPitch;
      utterance.onend = () => {
        setIsPlayingTts(false);
        setTtsStatus("");
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- 3. Live Audio & Video translation flow engines ---
  const startLiveTranslation = async () => {
    setIsLiveTranslating(true);
    liveLoopActiveRef.current = true;
    setLiveTranscript([]);
    setLiveStatus("Bắt đầu khởi tao dịch... Đang kết nối thiết bị âm thanh.");
    runAudioSlice();
  };

  const stopLiveTranslation = () => {
    setIsLiveTranslating(false);
    liveLoopActiveRef.current = false;
    setLiveStatus("Đã dừng phiên dịch trực tiếp.");
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach((track) => track.stop());
      liveStreamRef.current = null;
    }
  };

  const runAudioSlice = async () => {
    if (!liveLoopActiveRef.current) return;

    try {
      let stream = liveStreamRef.current;
      if (!stream || !stream.active) {
        if (liveInputSource === "mic") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          // Attempt displaying window with audio support (using screen display media API)
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: "browser" },
            audio: true
          });
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            stream.getTracks().forEach((t) => t.stop());
            setLiveStatus("Thất bại: Hãy tích chọn ô 'Chia sẻ âm thanh' (Share audio) ở góc hộp chia sẻ màn hình.");
            setIsLiveTranslating(false);
            liveLoopActiveRef.current = false;
            return;
          }
        }
        liveStreamRef.current = stream;
      }

      let mime = "audio/webm";
      try {
        if (!MediaRecorder.isTypeSupported("audio/webm")) {
          mime = "audio/mp4";
        }
      } catch {}

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: mime });
          await uploadAndTranslateChunk(audioBlob, mime);
        }
        // Restart recording sequential slices
        if (liveLoopActiveRef.current) {
          setTimeout(runAudioSlice, 150);
        }
      };

      recorder.start();
      setLiveStatus("🎙️ Đang lắng nghe giọng nói / bài viết phát ra (chu kỳ 6 giây)...");

      // Stop recorder after 6 seconds
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 6000);

    } catch (error: any) {
      console.error("Live translation error:", error);
      setLiveStatus(`Không nhận được thiết bị âm thanh: ${error.message}.`);
      setIsLiveTranslating(false);
      liveLoopActiveRef.current = false;
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((t) => t.stop());
        liveStreamRef.current = null;
      }
    }
  };

  const uploadAndTranslateChunk = async (blob: Blob, mime: string) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Str = (reader.result as string).split(",")[1];
        setLiveStatus("⚡ Đang bóc tách phân tích biểu ngữ & dịch live...");

        const response = await fetch("/api/translate-live-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Audio: base64Str,
            mimeType: mime,
            sourceLang: liveSourceLang,
            targetLang: liveTargetLang
          })
        });

        const data = await response.json();
        if (data.success && (data.transcription || data.translation)) {
          const timestamp = new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          });
          setLiveTranscript((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              time: timestamp,
              original: data.transcription,
              translated: data.translation,
              isDemo: !!data.isDemo
            }
          ]);
          setLiveStatus("🎙️ Vẫn đang tiếp tục lắng nghe...");
        } else {
          setLiveStatus("🎙️ Thấy yên lặng. Đang chờ âm thanh tiếp theo...");
        }
      };
    } catch (err: any) {
      console.error("Error sending slice audio:", err);
      setLiveStatus("⚠️ Sự nối mạng gián đoạn, lỗi truyền gửi.");
    }
  };

  const exportSubtitlesTxt = () => {
    if (liveTranscript.length === 0) return;
    const content = liveTranscript
      .map(
        (t) =>
          `[${t.time}]\nGốc: ${t.original || "(yên lặng)"}\nDịch: ${t.translated || "(yên lặng)"}\n---------------------------------------\n`
      )
      .join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `VietLearn_PhuDe_SongNgu_${new Date().toISOString().substring(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 w-full" id="audiomodel-section">
      
      {/* Tab select headbar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2.5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => {
              stopLiveTranslation();
              setActiveLabTab("dialect");
            }}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeLabTab === "dialect"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🎙️ Phân Tích Phương Ngữ & TTS
          </button>
          
          <button
            onClick={() => setActiveLabTab("live-translate")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeLabTab === "live-translate"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ⚡ Dịch Live Video & Audio (Bilingual Subtitles)
          </button>
        </div>

        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
          {activeLabTab === "dialect" ? "Acoustic Audio Lab" : "Live Captioner"}
        </span>
      </div>

      {/* RENDER DIALECT TAB CONTENT */}
      {activeLabTab === "dialect" && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Voice Recorder Block */}
          <div className="flex flex-col gap-6 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-8">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Mic className="text-rose-500 animate-pulse" size={18} />
                Hệ Ghi Âm & Kiểm Tra Giọng Đọc
              </h3>
              <p className="text-xs text-slate-500 mt-1">Cấp quyền micro để ghi lại giọng vùng miền của bạn và nghe lại dòng chảy âm học.</p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-100 min-h-[180px]">
              {isRecording ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white cursor-pointer hover:bg-rose-600 transition animate-bounce" onClick={stopRecording}>
                    <Square size={20} fill="white" />
                  </div>
                  <span className="text-red-500 font-mono font-bold text-sm animate-pulse">RECORDING: {formatTime(recordingSeconds)}</span>
                  
                  {/* Dynamic waveform simulation */}
                  <div className="flex gap-1 h-8 items-end mt-1">
                    {[...Array(12)].map((_, i) => {
                      const delay = 0.1 * i;
                      return (
                        <div
                          key={i}
                          className="w-1 bg-rose-400 rounded-full animate-wave"
                          style={{
                            height: "100%",
                            animationDelay: `${delay}s`,
                            animationDuration: "0.6s"
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button onClick={startRecording} className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white cursor-pointer hover:bg-indigo-700 transition shadow-md shadow-indigo-100">
                    <Mic size={24} />
                  </button>
                  <span className="text-slate-600 font-semibold text-xs mt-1">Bấm để bắt đầu thu âm</span>
                  <p className="text-[10px] text-slate-400 text-center max-w-[200px]">Hãy thử đọc cụm từ khó: "Răng rứa chi rứa chi chi á"</p>
                </div>
              )}

              {/* Recorded audio play button */}
              {recordedBlobUrl && (
                <div className="mt-5 w-full bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 animate-fade-in">
                  <span className="text-xs font-semibold text-slate-700">✓ Đã thu âm xong</span>
                  <audio src={recordedBlobUrl} controls className="h-8 max-w-[180px]" />
                </div>
              )}
            </div>

            {/* Phonological Insights */}
            <div className="bg-indigo-50/50 rounded-2xl p-4 text-xs text-indigo-900 border border-indigo-100/40">
              <h4 className="font-bold flex items-center gap-1.5 text-indigo-800 mb-1.5">
                <Sparkles size={13} /> Đặc trưng Phương Ngữ Tiếng Việt:
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-indigo-950 text-[11px] leading-relaxed">
                <li><strong className="text-indigo-800">Bắc (Hà Nội):</strong> Nguyên âm đầy đủ chuẩn mực, 6 thanh điệu dứt khoát. Giữ âm sắc nín họng ở thanh ngã rất tinh chỉnh.</li>
                <li><strong className="text-indigo-800">Trung (Huế/Vinh):</strong> Tông phẳng trầm, độ cao hẹp. Có xu hướng chuyển "hỏi/ngã" sang dấu nặng hơn, dùng nhiều đại từ phương địa chi địa.</li>
                <li><strong className="text-indigo-800">Nam (Sài Gòn):</strong> Gộp thanh hỏi và ngã thành một. Thay đổi âm đầu r, v thành y và g (Cá rô → Cá gô, Đi về → Đi dề).</li>
              </ul>
            </div>
          </div>

          {/* Text To Speech Playground */}
          <div className="flex flex-col gap-5 justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                <Volume2 className="text-indigo-600" size={18} />
                Phòng Dịch Giọng Nói Tiếng Việt
              </h3>
              <p className="text-xs text-slate-500 mt-1">Nhập văn bản tiếng Việt bất kỳ, chọn miền ngữ điệu phát âm để thử thách năng lực dịch giọng nói.</p>
            </div>

            <textarea
              value={textToSpeak}
              onChange={(e) => setTextToSpeak(e.target.value)}
              className="w-full text-xs p-3.5 border border-slate-200 focus:border-indigo-400 focus:outline-none rounded-xl bg-slate-50 min-h-[100px] text-slate-700 leading-normal"
              placeholder="Nhập câu viết bằng tiếng lóng, không dấu hoặc có dấu để nghe thử phát âm..."
            />

            {/* Dialect region selective button */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chọn âm điệu vùng miền:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "north", label: "Hà Nội (Bắc)", icon: "🎤" },
                  { id: "central", label: "Huế (Trung)", icon: "🎙️" },
                  { id: "south", label: "Sài Gòn (Nam)", icon: "📣" }
                ].map((reg) => (
                  <button
                    key={reg.id}
                    onClick={() => setSelectedRegion(reg.id as any)}
                    className={`py-2 px-2 text-xs rounded-lg font-medium transition-all flex flex-col items-center gap-1 border ${
                      selectedRegion === reg.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-base">{reg.icon}</span>
                    <span>{reg.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch / speed configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-medium text-slate-600">
                  <span>Tốc độ đọc:</span>
                  <span>{ttsSpeed}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-medium text-slate-600">
                  <span>Độ Cao (Pitch):</span>
                  <span>{ttsPitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            {/* Action controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTTSPlay}
                disabled={isPlayingTts}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-3 px-4 rounded-xl shadow-sm transition disabled:opacity-75 flex items-center justify-center gap-2"
              >
                <Volume2 size={15} /> Gửi Phát Âm Giọng Nói
              </button>
              
              {isPlayingTts && (
                <button
                  onClick={() => {
                    if (activeAudioRef.current) activeAudioRef.current.pause();
                    window.speechSynthesis.cancel();
                    setIsPlayingTts(false);
                    setTtsStatus("");
                  }}
                  className="p-3 border border-red-200 rounded-xl hover:bg-red-50 text-red-500 transition"
                  title="Dừng phát"
                >
                  <VolumeX size={15} />
                </button>
              )}
            </div>

            {ttsStatus && (
              <p className="text-[10px] text-indigo-600 text-center font-semibold bg-indigo-50 border border-indigo-100/30 rounded-lg py-1 px-2 animate-pulse">
                ⚡ {ttsStatus}
              </p>
            )}
          </div>
        </div>
      )}

      {/* RENDER LIVE AUDIO TRANSLATE TAB CONTENT */}
      {activeLabTab === "live-translate" && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-6">
          
          {/* Header instructions info */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-850 flex items-center gap-2">
                <Languages className="text-indigo-600" size={20} />
                Trung Tâm Thuyết Phụ Đề & Dịch Thuật Video Trực Tiếp
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Tự động bắt âm thanh từ Video bạn phát hoặc Microphone để bóc tách lời thoại và hiển thị dịch song ngữ trực quan thời gian thực.
              </p>
            </div>

            {/* Config Panel inline */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Select Source Input */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Nguồn:</span>
                <button
                  type="button"
                  onClick={() => !isLiveTranslating && setLiveInputSource("mic")}
                  disabled={isLiveTranslating}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                    liveInputSource === "mic" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                  } disabled:opacity-50`}
                >
                  🎤 Mic
                </button>
                <button
                  type="button"
                  onClick={() => !isLiveTranslating && setLiveInputSource("display")}
                  disabled={isLiveTranslating}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                    liveInputSource === "display" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                  } disabled:opacity-50`}
                  title="Chia sẻ tab trình duyệt hoặc màn hình hệ thống kèm tiếng để dịch trực tiếp"
                >
                  <Tv size={10} /> Hệ Thống/Tab
                </button>
              </div>

              {/* Source Lang Selection */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Gốc:</span>
                <select
                  value={liveSourceLang}
                  onChange={(e) => setLiveSourceLang(e.target.value)}
                  disabled={isLiveTranslating}
                  className="bg-transparent border-0 outline-none text-xs text-slate-700 font-bold"
                >
                  <option value="auto">🌐 Tự Nhiên (Auto)</option>
                  <option value="en">🇺🇸 Tiếng Anh (English)</option>
                  <option value="ja">🇯🇵 Tiếng Nhật (Japanese)</option>
                  <option value="zh">🇨🇳 Tiếng Trung (Chinese)</option>
                  <option value="vi">🇻🇳 Tiếng Việt (Vietnamese)</option>
                </select>
              </div>

              {/* Target Lang Selection */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                <span className="text-[10px] uppercase font-black text-slate-400">Đích:</span>
                <select
                  value={liveTargetLang}
                  onChange={(e) => setLiveTargetLang(e.target.value)}
                  disabled={isLiveTranslating}
                  className="bg-transparent border-0 outline-none text-xs text-slate-700 font-bold"
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇺🇸 Tiếng Anh</option>
                </select>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left side controller console */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col items-center justify-center text-center gap-3">
                
                {isLiveTranslating ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative flex justify-center items-center">
                      <div className="absolute w-14 h-14 bg-indigo-500/25 rounded-full animate-ping" />
                      <button
                        onClick={stopLiveTranslation}
                        className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center text-white cursor-pointer hover:bg-red-700 transition relative z-10"
                        title="Dừng phiên dịch"
                      >
                        <Square size={16} fill="white" />
                      </button>
                    </div>
                    
                    <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 font-bold px-2 py-0.5 rounded-full animate-pulse uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                      Live Translating
                    </span>
                    <p className="text-[10px] text-slate-400 max-w-[200px]" style={{ wordBreak: "break-word" }}>
                      Mô hình Gemini 3.5 đang tự động bắt tiếng, chuyển văn bản gốc và hiển thị bản dịch song ngữ ở bảng bên phải.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={startLiveTranslation}
                      className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white cursor-pointer hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
                    >
                      <Play size={20} fill="white" />
                    </button>
                    <span className="text-xs font-black text-slate-700">Bắt đầu dịch âm thanh gốc</span>
                    <p className="text-[10px] text-slate-400 max-w-[180px]">
                      Hệ thống sẽ chạy chu kỳ bắt âm chuẩn hóa 6 giây một lần liên tục để dịch thuật.
                    </p>
                  </div>
                )}

              </div>

              {/* Instructions Guide Alert */}
              <div className="bg-amber-50/50 rounded-2xl p-4 text-amber-900 border border-amber-100/40 flex gap-2.5 items-start">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <h4 className="font-bold text-amber-800">Hướng dẫn bắt tiếng máy tính:</h4>
                  <ol className="list-decimal list-inside text-amber-950 mt-1 space-y-1">
                    <li>Nếu chọn nguồn <strong className="text-amber-800">Hệ thông/Tab</strong>, khi trình duyệt mở hộp thoại chia sẻ màn hình, hãy chọn mục <strong>Tab trình duyệt</strong>.</li>
                    <li>Tìm tab đang chạy YouTube hoặc bài viết video, rồi tích chọn ô <strong>"Chia sẻ âm thanh"</strong> ở góc cùng để bắt được tiếng video!</li>
                    <li>Hoặc đơn giản chọn nguồn <strong>Mic</strong> để điện thoại/máy tính bắt tiếng loa phát ra bên ngoài.</li>
                  </ol>
                </div>
              </div>

            </div>

            {/* Right side live subtitles viewer (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Activity size={10} className="text-indigo-600 animate-pulse" />
                  Bảng phụ đề song ngữ trực tiếp
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setLiveTranscript([])}
                    disabled={liveTranscript.length === 0}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-800 disabled:opacity-30 transition flex items-center gap-1"
                  >
                    <Trash2 size={11} /> Xóa bảng
                  </button>
                  
                  <button
                    type="button"
                    onClick={exportSubtitlesTxt}
                    disabled={liveTranscript.length === 0}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-30 transition flex items-center gap-1"
                    title="Xuất kịch bản phụ đề ra tệp .txt"
                  >
                    <Download size={11} /> Xuất chữ (.txt)
                  </button>
                </div>
              </div>

              {/* Scrolling screen subtitles wrapper */}
              <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 flex-1 min-h-[250px] max-h-[350px] overflow-y-auto flex flex-col gap-4 text-slate-100 font-sans shadow-inner scrollbar-thin">
                
                {liveTranscript.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-550 border border-dashed border-slate-800 rounded-2xl">
                    <span className="text-xl mb-1 flex items-center justify-center animate-pulse">📺</span>
                    <p className="text-xs font-bold text-slate-400">Rạp Phụ Đề Đang Đóng</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 max-w-[280px]">
                      Vui lòng chọn nút kích hoạt phía bên trái và bật phát video bài giảng trên máy tính của bạn để phụ đề đồng hành xuất hiện tại đây!
                    </p>
                  </div>
                ) : (
                  liveTranscript.map((line, idx) => (
                    <div 
                      key={line.id} 
                      className={`flex flex-col gap-1 border-b border-slate-800/60 pb-3 transition-opacity animate-fade-in ${
                        idx === liveTranscript.length - 1 ? "opacity-100 font-medium" : "opacity-75"
                      }`}
                    >
                      <div className="flex justify-between items-center text-[9px] font-mono text-indigo-400">
                        <span>⏱️ Mốc [{line.time}]</span>
                        {line.isDemo && (
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[8px] font-black">
                            Demo Mode
                          </span>
                        )}
                      </div>
                      
                      {line.original && (
                        <p className="text-xs text-slate-350 italic font-medium leading-relaxed">
                          "{line.original}"
                        </p>
                      )}

                      {line.translated ? (
                        <p className="text-xs font-bold text-emerald-400 leading-relaxed mt-0.5">
                          ➟ {line.translated}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-600 italic">
                          (Dịch giả đang tính toán...)
                        </p>
                      )}
                    </div>
                  ))
                )}
                
                {/* Scroll endpoint target */}
                <div ref={subtitlesEndRef} />
              </div>

              {/* Status footer line */}
              {liveStatus && (
                <div className="text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-100/50 py-1.5 px-3 rounded-xl flex items-center justify-between">
                  <span className="truncate">{liveStatus}</span>
                  {isLiveTranslating && (
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
                  )}
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
