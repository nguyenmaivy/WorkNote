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
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

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
  const wsRef = useRef<WebSocket | null>(null);

  // Clean elements on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Ensure we release any active video/audio stream locks on unmount
      liveLoopActiveRef.current = false;
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
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

  // --- 3. Live Audio & Video translation flow engines (WebSocket Version) ---
  const startLiveTranslation = async () => {
    setIsLiveTranslating(true);
    liveLoopActiveRef.current = true;
    setLiveTranscript([]);
    setLiveStatus("Bắt đầu khởi tao dịch... Đang kết nối WebSocket.");
    
    // Khởi tạo WebSocket Connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws/translate`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setLiveStatus("Đã kết nối WebSocket. Đang kết nối thiết bị âm thanh...");
      ws.send(JSON.stringify({
        type: "config",
        sourceLang: liveSourceLang,
        targetLang: liveTargetLang
      }));
      runAudioSlice();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          setLiveStatus(`⚠️ Lỗi từ server: ${data.error}`);
          return;
        }
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
      } catch (err) {
        console.error("Lỗi parse dữ liệu WS:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WS Error:", err);
      setLiveStatus("⚠️ Mất kết nối WebSocket.");
      stopLiveTranslation();
    };

    ws.onclose = () => {
      console.log("WS Closed");
    };
  };

  const stopLiveTranslation = () => {
    setIsLiveTranslating(false);
    liveLoopActiveRef.current = false;
    setLiveStatus("Đã dừng phiên dịch trực tiếp.");
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

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
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: "browser" },
            audio: true
          });
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            stream.getTracks().forEach((t) => t.stop());
            setLiveStatus("Thất bại: Hãy tích chọn ô 'Chia sẻ âm thanh' (Share audio) ở góc hộp chia sẻ màn hình.");
            stopLiveTranslation();
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
        if (chunks.length > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const audioBlob = new Blob(chunks, { type: mime });
          
          // Chuyển blob thành base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Str = (reader.result as string).split(",")[1];
            setLiveStatus("⚡ Đang phân tích biểu ngữ & gửi qua WS...");
            wsRef.current?.send(JSON.stringify({
              type: "audio",
              mimeType: mime,
              base64Audio: base64Str
            }));
          };
        }
        // Restart recording sequential slices
        if (liveLoopActiveRef.current) {
          setTimeout(runAudioSlice, 50);
        }
      };

      recorder.start();
      setLiveStatus("🎙️ Đang lắng nghe âm thanh (chu kỳ 3 giây)...");

      // Giảm độ trễ: Stop recorder sau 3 giây thay vì 6 giây
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 3000);

    } catch (error: any) {
      console.error("Live translation error:", error);
      setLiveStatus(`Không nhận được thiết bị âm thanh: ${error.message}.`);
      stopLiveTranslation();
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
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3 flex-wrap gap-2.5">
        <div className="flex gap-1 bg-[var(--color-neutral-soft)] p-1 rounded-[var(--radius-card)]">
          <button
            onClick={() => {
              stopLiveTranslation();
              setActiveLabTab("dialect");
            }}
            className={`py-2 px-4 rounded-[var(--radius-card)] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeLabTab === "dialect"
                ? "bg-white text-[var(--color-primary-hover)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            🎙️ Phân Tích Phương Ngữ & TTS
          </button>
          
          <button
            onClick={() => setActiveLabTab("live-translate")}
            className={`py-2 px-4 rounded-[var(--radius-card)] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeLabTab === "live-translate"
                ? "bg-white text-[var(--color-primary-hover)] shadow-sm"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            ⚡ Dịch Live Video & Audio (Bilingual Subtitles)
          </button>
        </div>

        <span className="text-[12px] bg-indigo-100 text-[var(--color-primary-hover)] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border-2 border-indigo-100">
          {activeLabTab === "dialect" ? "Acoustic Audio Lab" : "Live Captioner"}
        </span>
      </div>

      {/* RENDER DIALECT TAB CONTENT — Stitch bento grid layout */}
      {activeLabTab === "dialect" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── LEFT: Source Text + Audio Output (Stitch 8 cols) ── */}
          <div className="lg:col-span-8 space-y-6">
            {/* Source Text Card with glass + ai-glow */}
            <div className="bg-white/85 backdrop-blur-md rounded-[16px] p-6 border border-[var(--color-secondary)]/30 shadow-[0_0_18px_rgba(0,108,73,0.10)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2 font-display">
                  <Volume2 className="text-[var(--color-secondary)]" size={20} />
                  Source Text — Phòng dịch giọng nói
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-[var(--color-primary)]/5 text-[var(--color-primary)] rounded text-[11px] font-medium flex items-center gap-1 border border-[var(--color-primary)]/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
                    Vietnamese auto
                  </span>
                  <button
                    onClick={() => navigator.clipboard.writeText(textToSpeak)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors p-1"
                    title="Copy"
                  >
                    <Sparkles size={16} />
                  </button>
                  <button
                    onClick={() => setTextToSpeak("")}
                    className="text-[var(--color-text-secondary)] hover:text-rose-500 transition-colors p-1"
                    title="Clear"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <textarea
                value={textToSpeak}
                onChange={(e) => setTextToSpeak(e.target.value)}
                className="w-full text-[15px] bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]/60 min-h-[140px] leading-relaxed"
                placeholder="Nhập văn bản tiếng Việt bất kỳ để tổng hợp giọng nói…"
              />

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
                <span className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-1">
                  <Info size={12} /> {textToSpeak.length} / 5,000 characters
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTextToSpeak("")}
                    className="bg-[var(--color-surface-container-low)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-[13px] font-medium px-3 py-2 rounded-lg hover:bg-[var(--color-surface-container)] transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Clear
                  </button>
                  <Button onClick={handleTTSPlay} disabled={isPlayingTts} icon={<Volume2 size={16} />}>
                    {isPlayingTts ? "Synthesizing…" : "Synthesize"}
                  </Button>
                  {isPlayingTts && (
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (activeAudioRef.current) activeAudioRef.current.pause();
                        window.speechSynthesis.cancel();
                        setIsPlayingTts(false);
                        setTtsStatus("");
                      }}
                      title="Dừng phát"
                      icon={<VolumeX size={16} />}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Audio Output + Waveform Card */}
            <div className="bg-white border border-[var(--color-border-subtle)] rounded-[16px] p-6 shadow-[var(--shadow-card)] relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-secondary-container)]/30 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2 font-display">
                  <Activity className="text-[var(--color-primary)]" size={20} />
                  Audio Output
                </h3>

                {/* Simulated waveform */}
                <div className="h-24 bg-[var(--color-surface-container-low)] rounded-lg border border-[var(--color-border-subtle)] flex items-center justify-center gap-1 px-4 mb-5 overflow-hidden">
                  {[8, 16, 12, 20, 10, 14, 24, 18, 12, 8, 20, 14, 22, 10, 16].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full"
                      style={{
                        height: `${h * 3}px`,
                        background: "var(--color-secondary)",
                        opacity: isPlayingTts ? 0.4 + (i % 5) * 0.12 : 0.25,
                        animation: isPlayingTts ? `wave 1.2s ease-in-out infinite alternate ${i * 0.08}s` : "none",
                        transformOrigin: "bottom",
                      }}
                    />
                  ))}
                  <div className="flex-1 h-[2px] bg-[var(--color-border-default)]/40 ml-2" />
                </div>

                {/* Recorder + playback row */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="w-12 h-12 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                        title="Stop recording"
                      >
                        <Square size={18} fill="white" />
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        className="w-12 h-12 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                        title="Start recording"
                      >
                        <Mic size={20} />
                      </button>
                    )}
                    <div className="flex flex-col">
                      <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {isRecording ? `Recording…` : recordedBlobUrl ? "recorded_001.webm" : "Tap mic to record"}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)] font-mono">
                        {isRecording ? formatTime(recordingSeconds) : recordedBlobUrl ? "ready · 00:0?" : "00:00 / 00:00"}
                      </span>
                    </div>
                  </div>

                  {recordedBlobUrl && (
                    <audio src={recordedBlobUrl} controls className="h-9 max-w-[260px]" />
                  )}
                </div>

                {ttsStatus && (
                  <p className="text-[12px] text-[var(--color-primary)] mt-4 font-medium bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/15 rounded-lg py-2 px-3 animate-pulse">
                    ⚡ {ttsStatus}
                  </p>
                )}
              </div>
            </div>

            {/* Phonological Insights */}
            <div className="bg-[var(--color-primary)]/5 rounded-[16px] p-5 border border-[var(--color-primary)]/15">
              <h4 className="text-[14px] font-semibold flex items-center gap-1.5 text-[var(--color-primary-hover)] mb-2 font-display">
                <Sparkles size={16} /> Đặc trưng Phương Ngữ Tiếng Việt
              </h4>
              <ul className="space-y-1.5 list-disc list-inside text-[13px] text-[var(--color-text-primary)] leading-relaxed">
                <li><strong className="text-[var(--color-primary-hover)] font-semibold">Bắc (Hà Nội):</strong> 6 thanh điệu rõ ràng, âm sắc dứt khoát.</li>
                <li><strong className="text-[var(--color-primary-hover)] font-semibold">Trung (Huế/Vinh):</strong> Tông phẳng trầm, ngã/hỏi nhập với nặng.</li>
                <li><strong className="text-[var(--color-primary-hover)] font-semibold">Nam (Sài Gòn):</strong> Gộp hỏi/ngã; r → g, v → d.</li>
              </ul>
            </div>
          </div>

          {/* ── RIGHT: Voice Settings (Stitch 4 cols) ── */}
          <div className="lg:col-span-4 space-y-6 flex flex-col">
            <div className="bg-white border border-[var(--color-border-subtle)] rounded-[16px] p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-4 pb-3 border-b border-[var(--color-border-subtle)] font-display">
                Voice Settings
              </h3>

              {/* Target Dialect */}
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-2">
                  Target Dialect
                </label>
                <div className="relative">
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value as any)}
                    className="w-full bg-[var(--color-surface-container-low)] border border-[var(--color-border-default)] rounded-lg py-2.5 pl-3 pr-10 text-[14px] text-[var(--color-text-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] appearance-none font-medium outline-none"
                  >
                    <option value="north">Northern Vietnamese (Hanoi)</option>
                    <option value="central">Central Vietnamese (Hue)</option>
                    <option value="south">Southern Vietnamese (Saigon)</option>
                  </select>
                </div>
              </div>

              {/* Voice profile chips */}
              <div className="mb-4">
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-2">
                  Voice Profile
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button className="border border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] rounded-lg py-2 px-3 text-[13px] font-medium flex items-center justify-center gap-1.5">
                    🎤 Female 1
                  </button>
                  <button className="border border-[var(--color-border-default)] bg-white text-[var(--color-text-secondary)] rounded-lg py-2 px-3 text-[13px] font-medium hover:bg-[var(--color-neutral-soft)] transition-colors flex items-center justify-center gap-1.5">
                    🎙️ Male 1
                  </button>
                </div>
              </div>

              {/* Delivery style chips */}
              <div className="mb-4 pt-4 border-t border-[var(--color-border-subtle)]">
                <label className="block text-[13px] font-medium text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-secondary)]" /> Delivery Style
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["Neutral", "Academic", "Conversational", "News"].map((s, i) => (
                    <span
                      key={s}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-colors ${
                        i === 0
                          ? "bg-[var(--color-secondary-container)]/60 text-[var(--color-on-secondary-container)] border border-[var(--color-secondary)]/25"
                          : "bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)] hover:bg-[var(--color-neutral-soft)]"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Speed + Pitch sliders */}
              <div className="space-y-3 pt-4 border-t border-[var(--color-border-subtle)]">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[11px] text-[var(--color-text-secondary)] font-medium">Speed</label>
                    <span className="text-[11px] text-[var(--color-text-primary)] font-mono">{ttsSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsSpeed}
                    onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[var(--color-surface-variant)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[11px] text-[var(--color-text-secondary)] font-medium">Pitch</label>
                    <span className="text-[11px] text-[var(--color-text-primary)] font-mono">{ttsPitch.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={ttsPitch}
                    onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[var(--color-surface-variant)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
                  />
                </div>
              </div>
            </div>

            {/* Region quick swap */}
            <div className="bg-white border border-[var(--color-border-subtle)] rounded-[16px] p-5 shadow-[var(--shadow-card)]">
              <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-3 font-display">
                Quick Dialect Switch
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "north", label: "Bắc", icon: "🎤" },
                  { id: "central", label: "Trung", icon: "🎙️" },
                  { id: "south", label: "Nam", icon: "📣" },
                ].map((reg) => (
                  <button
                    key={reg.id}
                    onClick={() => setSelectedRegion(reg.id as any)}
                    className={`py-2 px-2 text-[12px] rounded-lg font-medium transition-all flex flex-col items-center gap-1 border ${
                      selectedRegion === reg.id
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-[var(--shadow-primary-glow)]"
                        : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:bg-[var(--color-neutral-soft)]"
                    }`}
                  >
                    <span className="text-base">{reg.icon}</span>
                    <span>{reg.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* hidden — legacy block placeholder so JSX siblings parse */}
          <div className="hidden">
            <div className="grid grid-cols-3 gap-2">
              {[].map((reg: any) => (
                <button key={reg.id}>{reg.label}</button>
              ))}
            </div>

            {/* Pitch / speed configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-medium text-[var(--color-text-secondary)]">
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
                  className="w-full h-1.5 bg-[var(--color-neutral-soft)] rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[11px] font-medium text-[var(--color-text-secondary)]">
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
                  className="w-full h-1.5 bg-[var(--color-neutral-soft)] rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>
            </div>

            {/* Action controls */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleTTSPlay}
                disabled={isPlayingTts}
                className="flex-1"
                icon={<Volume2 size={18} />}
              >
                Gửi Phát Âm Giọng Nói
              </Button>
              
              {isPlayingTts && (
                <Button
                  variant="danger"
                  onClick={() => {
                    if (activeAudioRef.current) activeAudioRef.current.pause();
                    window.speechSynthesis.cancel();
                    setIsPlayingTts(false);
                    setTtsStatus("");
                  }}
                  title="Dừng phát"
                >
                  <VolumeX size={18} />
                </Button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* RENDER LIVE AUDIO TRANSLATE TAB CONTENT */}
      {activeLabTab === "live-translate" && (
        <Card className="p-6 flex flex-col gap-6">
          
          {/* Header instructions info */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b-2 border-[var(--color-border-subtle)] pb-4">
            <div>
              <h3 className="text-[24px] font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Languages className="text-[var(--color-primary)]" size={24} />
                Trung Tâm Thuyết Phụ Đề & Dịch Thuật Video Trực Tiếp
              </h3>
              <p className="text-[14px] font-bold text-[var(--color-text-secondary)] mt-1">
                Tự động bắt âm thanh từ Video bạn phát hoặc Microphone để bóc tách lời thoại và hiển thị dịch song ngữ trực quan thời gian thực.
              </p>
            </div>

            {/* Config Panel inline */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Select Source Input */}
              <div className="flex items-center gap-1.5 bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] px-2.5 py-1">
                <span className="text-[10px] uppercase font-black text-[var(--color-neutral)]">Nguồn:</span>
                <button
                  type="button"
                  onClick={() => !isLiveTranslating && setLiveInputSource("mic")}
                  disabled={isLiveTranslating}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                    liveInputSource === "mic" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  } disabled:opacity-50`}
                >
                  🎤 Mic
                </button>
                <button
                  type="button"
                  onClick={() => !isLiveTranslating && setLiveInputSource("display")}
                  disabled={isLiveTranslating}
                  className={`px-2 py-1 text-[10px] font-extrabold rounded-lg transition-all flex items-center gap-1 ${
                    liveInputSource === "display" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  } disabled:opacity-50`}
                  title="Chia sẻ tab trình duyệt hoặc màn hình hệ thống kèm tiếng để dịch trực tiếp"
                >
                  <Tv size={10} /> Hệ Thống/Tab
                </button>
              </div>

              {/* Source Lang Selection */}
              <div className="flex items-center gap-1.5 bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] px-2.5 py-1">
                <span className="text-[10px] uppercase font-black text-[var(--color-neutral)]">Gốc:</span>
                <select
                  value={liveSourceLang}
                  onChange={(e) => setLiveSourceLang(e.target.value)}
                  disabled={isLiveTranslating}
                  className="bg-transparent border-0 outline-none text-xs text-[var(--color-text-primary)] font-bold"
                >
                  <option value="auto">🌐 Tự Nhiên (Auto)</option>
                  <option value="en">🇺🇸 Tiếng Anh (English)</option>
                  <option value="ja">🇯🇵 Tiếng Nhật (Japanese)</option>
                  <option value="zh">🇨🇳 Tiếng Trung (Chinese)</option>
                  <option value="vi">🇻🇳 Tiếng Việt (Vietnamese)</option>
                </select>
              </div>

              {/* Target Lang Selection */}
              <div className="flex items-center gap-1.5 bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)] rounded-[var(--radius-card)] px-2.5 py-1">
                <span className="text-[10px] uppercase font-black text-[var(--color-neutral)]">Đích:</span>
                <select
                  value={liveTargetLang}
                  onChange={(e) => setLiveTargetLang(e.target.value)}
                  disabled={isLiveTranslating}
                  className="bg-transparent border-0 outline-none text-xs text-[var(--color-text-primary)] font-bold"
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
              
              <div className="bg-[var(--color-neutral-soft)] rounded-[var(--radius-card)] p-5 border border-[var(--color-border-subtle)] flex flex-col items-center justify-center text-center gap-3">
                
                {isLiveTranslating ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative flex justify-center items-center">
                      <div className="absolute w-14 h-14 bg-[var(--color-primary)]/25 rounded-full animate-ping" />
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
                    <p className="text-[10px] text-[var(--color-neutral)] max-w-[200px]" style={{ wordBreak: "break-word" }}>
                      Mô hình Gemini 3.5 đang tự động bắt tiếng, chuyển văn bản gốc và hiển thị bản dịch song ngữ ở bảng bên phải.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <button
                      onClick={startLiveTranslation}
                      className="w-14 h-14 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white cursor-pointer hover:bg-[var(--color-primary-hover)] transition shadow-md shadow-indigo-100"
                    >
                      <Play size={20} fill="white" />
                    </button>
                    <span className="text-xs font-black text-[var(--color-text-primary)]">Bắt đầu dịch âm thanh gốc</span>
                    <p className="text-[10px] text-[var(--color-neutral)] max-w-[180px]">
                      Hệ thống sẽ chạy chu kỳ bắt âm chuẩn hóa 3 giây một lần liên tục để dịch thuật qua WebSocket.
                    </p>
                  </div>
                )}

              </div>

              {/* Instructions Guide Alert */}
              <div className="bg-amber-50/50 rounded-[var(--radius-card)] p-4 text-amber-900 border border-amber-100/40 flex gap-2.5 items-start">
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
                <span className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest flex items-center gap-1">
                  <Activity size={10} className="text-[var(--color-primary)] animate-pulse" />
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
                    className="text-[10px] font-bold text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] disabled:opacity-30 transition flex items-center gap-1"
                    title="Xuất kịch bản phụ đề ra tệp .txt"
                  >
                    <Download size={11} /> Xuất chữ (.txt)
                  </button>
                </div>
              </div>

              {/* Scrolling screen subtitles wrapper */}
              <div className="bg-slate-900 rounded-[var(--radius-card)] p-5 border border-slate-800 flex-1 min-h-[250px] max-h-[350px] overflow-y-auto flex flex-col gap-4 text-slate-100 font-sans shadow-inner scrollbar-thin">
                
                {liveTranscript.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-[var(--color-text-secondary)] border border-dashed border-slate-800 rounded-[var(--radius-card)]">
                    <span className="text-xl mb-1 flex items-center justify-center animate-pulse">📺</span>
                    <p className="text-xs font-bold text-[var(--color-neutral)]">Rạp Phụ Đề Đang Đóng</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 max-w-[280px]">
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
                      <div className="flex justify-between items-center text-[9px] font-mono text-[var(--color-primary)]">
                        <span>⏱️ Mốc [{line.time}]</span>
                        {line.isDemo && (
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[8px] font-black">
                            Demo Mode
                          </span>
                        )}
                      </div>
                      
                      {line.original && (
                        <p className="text-xs text-[var(--color-neutral)] italic font-medium leading-relaxed">
                          "{line.original}"
                        </p>
                      )}

                      {line.translated ? (
                        <p className="text-xs font-bold text-emerald-400 leading-relaxed mt-0.5">
                          ➟ {line.translated}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[var(--color-text-secondary)] italic">
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
                <div className="text-[9px] font-mono text-[var(--color-text-secondary)] bg-[var(--color-neutral-soft)] border border-[var(--color-border-subtle)]/50 py-1.5 px-3 rounded-[var(--radius-card)] flex items-center justify-between">
                  <span className="truncate">{liveStatus}</span>
                  {isLiveTranslating && (
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping flex-shrink-0" />
                  )}
                </div>
              )}

            </div>

          </div>

        </Card>
      )}

    </div>
  );
}
