import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

const getSpeechRecognition = (): (new () => SpeechRecognitionInstance) | null => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

interface UseVoiceInputOptions {
  lang?: string;
  onTranscript?: (text: string) => void;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}) => {
  const { lang = 'ta-IN', onTranscript } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  const isSupported = !!getSpeechRecognition();

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const startListening = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      const combined = (finalTranscript + interimTranscript).trim();
      setTranscript(combined);
      onTranscriptRef.current?.(combined);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return; // Ignore no-speech, auto-retries
      if (event.error === 'aborted') return; // User stopped
      setError(`Speech error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch (e) {
      setError('Failed to start speech recognition.');
      setIsListening(false);
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { isListening, transcript, error, isSupported, startListening, stopListening };
};
