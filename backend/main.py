from fastapi import FastAPI, HTTPException
from fastapi import File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import assemblyai as aai
import os
from langchain_ollama.llms import OllamaLLM
from elevenlabs.client import ElevenLabs
from fastapi.responses import StreamingResponse
import io
load_dotenv()
app=FastAPI()
aai.settings.api_key=os.getenv("ASSEMBLYAI_API_KEY")

elevenlabs = ElevenLabs(
  api_key=os.getenv("ELEVENLABS_API_KEY"),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message":"Hello World"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Debug: Print file info
        print(f"Received file: {file.filename}")
        print(f"Content type: {file.content_type}")
        print(f"File size: {file.size if hasattr(file, 'size') else 'Unknown'}")
        
        # Validate file type (be more lenient for debugging)
        if file.content_type and not (file.content_type.startswith('audio/') or file.content_type in ['application/octet-stream']):
            raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' may not be supported. Try uploading a .wav, .mp3, or .webm file.")
        
        file_bytes = await file.read()
        
        # Check if file is empty
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        print(f"File bytes length: {len(file_bytes)}")
        
        transcriber = aai.Transcriber()
        # Enhanced config for better transcription
        config = aai.TranscriptionConfig(
            speech_model=aai.SpeechModel.best,
            language_code="en",  # Set specific language instead of auto-detection
            punctuate=True,
            format_text=True
        )
        
        print("Starting transcription...")
        transcript = transcriber.transcribe(file_bytes, config)
        
        print(f"Transcription status: {transcript.status}")
        print(f"Transcript ID: {transcript.id}")
        
        if transcript.status == aai.TranscriptStatus.error:
            print(f"Transcription failed: {transcript.error}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {transcript.error}")
        
        # Check if transcript text is empty or None
        transcript_text = transcript.text
        prompt = f"Summarize this in one very short sentence:\n\n{transcript_text}"
        response = llm.invoke(prompt)
        print(response)
        audio_generator = elevenlabs.text_to_speech.convert(
            text=response,
            voice_id="JBFqnCBsd6RMkjVDRZzb",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
            )
        audio = b"".join(audio_generator)    
        return StreamingResponse(io.BytesIO(audio), media_type="audio/mpeg")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")