import { useEffect, useRef, useState } from "react";
import axios from "axios";

const App = () => {
  const chunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState("");

  const uploadAudioToBackend = async (blob) => {
    const formData = new FormData();
    formData.append("file", blob, "recording.webm");

    try {
      const response = await axios.post("http://localhost:8000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        responseType: "blob", // 👈 Important to get binary audio response
      });

      const ttsBlob = response.data;
      const ttsAudioUrl = URL.createObjectURL(ttsBlob);
      const ttsAudio = new Audio(ttsAudioUrl);
      ttsAudio.play(); // 🔊 Auto-play the TTS response

      console.log("✅ TTS audio played");
    } catch (error) {
      console.error("❌ Upload or TTS failed:", error);
    }
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => {
        console.log("🎙️ Microphone permission granted");
      })
      .catch(() => {
        console.log("🚫 Microphone permission denied");
      });
  }, []);

  const startRecording = async () => {
    chunksRef.current = [];

    const mediastream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(mediastream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const localUrl = URL.createObjectURL(blob);
      setAudioUrl(localUrl); // ⏯️ Optional: preview user-recorded audio

      uploadAudioToBackend(blob); // 🎯 Send for transcription + LLM + TTS
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    console.log("▶️ Recording started");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      console.log("⏹️ Recording stopped");
    }
  };

  return (
    <div>
      <h1>Voice-to-AI-to-Voice App</h1>
      <button onClick={startRecording}>Start Recording</button>
      <button onClick={stopRecording}>Stop Recording</button>

      {audioUrl && (
        <div>
          <h3>Your Recording:</h3>
          <audio src={audioUrl} controls />
        </div>
      )}
    </div>
  );
};

export default App;
