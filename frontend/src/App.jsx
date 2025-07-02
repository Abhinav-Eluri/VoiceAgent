import { useEffect, useRef, useState } from "react";
import axios from "axios";
import Lottie from "lottie-react";
import voiceAnimationUrl from "./assets/voice.json?url";

const App = () => {
  const chunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const uploadAudioToBackend = async (blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    try {
      const response = await axios.post("http://localhost:8000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
      });

      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onplay = () => {
        setIsAudioPlaying(true);
        setTranscriptionResult("🔊 AI response is playing...");
      };

      audio.onended = () => {
        setIsAudioPlaying(false);
        setTranscriptionResult("✅ AI response completed.");
      };

      audio.onerror = () => {
        setIsAudioPlaying(false);
        setTranscriptionResult("⚠️ Playback failed.");
      };

      audio.play();
    } catch (error) {
      console.error("❌ Upload or processing failed:", error);
      setTranscriptionResult("❌ Error during processing.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => console.log("🎙️ Microphone permission granted"))
      .catch(() => console.log("🚫 Microphone permission denied"));
  }, []);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setTranscriptionResult("");
      setIsRecording(true);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);
        setAudioUrl(localUrl);
        setIsRecording(false);
        uploadAudioToBackend(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      console.log("▶️ Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      console.log("⏹️ Recording stopped");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">🎙️ Voice-to-AI-to-Voice App</h1>

        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <button
            onClick={startRecording}
            disabled={isRecording || isProcessing}
            className={`px-6 py-3 rounded text-white text-lg transition ${
              isRecording || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isRecording ? "🔴 Recording..." : "▶️ Start Recording"}
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording || isProcessing}
            className={`px-6 py-3 rounded text-white text-lg transition ${
              !isRecording || isProcessing ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            ⏹️ Stop Recording
          </button>
        </div>

        {isProcessing && (
          <div className="text-gray-500 text-lg mb-6">
            🔄 Processing audio...
          </div>
        )}

        {isAudioPlaying && (
          <div className="flex flex-col items-center mb-6">
            <div className="w-40 h-40 border border-gray-300 rounded-xl overflow-hidden">
              <Lottie path={voiceAnimationUrl} loop autoplay />
            </div>
            <p className="text-lg text-gray-600 mt-4">🔊 Playing AI response...</p>
          </div>
        )}

        {transcriptionResult && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-6">
            <h3 className="text-blue-700 font-semibold mb-2">🤖 AI Response Status:</h3>
            <p className="text-gray-700">{transcriptionResult}</p>
          </div>
        )}

        {audioUrl && (
          <div className="bg-gray-100 p-4 rounded border border-gray-300">
            <h3 className="text-gray-800 font-semibold mb-2">🎵 Your Recording:</h3>
            <audio src={audioUrl} controls className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
