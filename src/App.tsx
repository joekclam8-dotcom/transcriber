import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Mic, Square, Upload, FileAudio, Loader2, RefreshCw } from 'lucide-react';

export default function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioDataUrl(url);
      setTranscript('');
      setError(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
        const url = URL.createObjectURL(audioBlob);
        setAudioDataUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('');
      setError(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setAudioFile(null);
    setAudioDataUrl(null);
    setTranscript('');
    setError(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioFile);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1];
          const mimeType = audioFile.type || 'audio/webm';

          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              {
                inlineData: {
                  data: base64String,
                  mimeType: mimeType,
                }
              },
              {
                text: 'Please transcribe the following audio. The audio may contain a mixture of English, Cantonese, and Mandarin. Provide the transcription in the original languages spoken.'
              }
            ]
          });

          setTranscript(response.text || 'No transcription available.');
        } catch (err) {
          console.error('Transcription error:', err);
          setError(err instanceof Error ? err.message : 'An error occurred during transcription.');
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read audio file.');
        setIsTranscribing(false);
      };
    } catch (err) {
      console.error('File reading error:', err);
      setError('An error occurred while reading the file.');
      setIsTranscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Multilingual Audio Transcriber</h1>
          <p className="text-stone-500">
            Transcribe audio containing English, Cantonese, and Mandarin. Upload a file or record directly.
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-6">
          {!audioFile && !isRecording && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-stone-300 rounded-xl hover:bg-stone-50 hover:border-stone-400 transition-colors cursor-pointer group">
                <Upload className="w-8 h-8 text-stone-400 group-hover:text-stone-600 mb-3" />
                <span className="text-sm font-medium text-stone-700">Upload Audio File</span>
                <span className="text-xs text-stone-500 mt-1">MP3, WAV, M4A, WEBM</span>
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>

              <button 
                onClick={startRecording}
                className="flex flex-col items-center justify-center p-8 border-2 border-stone-200 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors group cursor-pointer"
              >
                <Mic className="w-8 h-8 text-stone-600 group-hover:text-stone-800 mb-3" />
                <span className="text-sm font-medium text-stone-700">Record Microphone</span>
                <span className="text-xs text-stone-500 mt-1">Click to start recording</span>
              </button>
            </div>
          )}

          {isRecording && (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-red-100 bg-red-50 rounded-xl space-y-4">
              <div className="flex items-center space-x-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                <span className="text-red-700 font-medium font-mono text-lg">
                  {formatTime(recordingTime)}
                </span>
              </div>
              <button 
                onClick={stopRecording}
                className="flex items-center space-x-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Recording</span>
              </button>
            </div>
          )}

          {audioFile && !isRecording && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-stone-100 rounded-xl border border-stone-200">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <FileAudio className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-stone-800 truncate">{audioFile.name}</p>
                    <p className="text-xs text-stone-500">{(audioFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={clearAudio}
                  className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                  title="Clear audio"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {audioDataUrl && (
                <audio controls src={audioDataUrl} className="w-full h-10" />
              )}

              <button
                onClick={transcribeAudio}
                disabled={isTranscribing}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors shadow-sm cursor-pointer"
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Transcribing...</span>
                  </>
                ) : (
                  <span>Transcribe Audio</span>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {transcript && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
            <h2 className="text-lg font-medium text-stone-800 flex items-center space-x-2">
              <span>Transcription Result</span>
            </h2>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 whitespace-pre-wrap text-stone-700 leading-relaxed">
              {transcript}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
