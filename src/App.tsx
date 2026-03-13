import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Upload, FileAudio, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200 max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-stone-900">Something went wrong</h2>
            <p className="text-sm text-stone-500">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <TranscriberApp />
    </ErrorBoundary>
  );
}

function TranscriberApp() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  const clearAudio = () => {
    setAudioFile(null);
    setAudioDataUrl(null);
    setTranscript('');
    setError(null);
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
            contents: {
              parts: [
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
            }
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
            Transcribe audio containing English, Cantonese, and Mandarin. Upload an audio file to begin.
          </p>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-6">
          {!audioFile && (
            <div className="grid grid-cols-1 gap-4">
              <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-stone-300 rounded-xl hover:bg-stone-50 hover:border-stone-400 transition-colors cursor-pointer group">
                <Upload className="w-10 h-10 text-stone-400 group-hover:text-stone-600 mb-4" />
                <span className="text-base font-medium text-stone-700">Upload Audio File</span>
                <span className="text-sm text-stone-500 mt-2">MP3, WAV, M4A, WEBM</span>
                <input 
                  type="file" 
                  accept="audio/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          )}

          {audioFile && (
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
