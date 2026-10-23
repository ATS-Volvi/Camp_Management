import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  onParsedFields?: (fields: { category?: string; priority?: string; description?: string }) => void;
  disabled?: boolean;
}

const CATEGORIES = ["electrical", "plumbing", "hvac", "furniture", "cleaning", "security"];
const PRIORITIES = ["low", "medium", "high", "emergency"];

function parseFieldsFromTranscript(text: string) {
  const lower = text.toLowerCase();
  const fields: { category?: string; priority?: string; description?: string } = {};

  // Detect category
  for (const cat of CATEGORIES) {
    if (lower.includes(cat)) {
      fields.category = cat.charAt(0).toUpperCase() + cat.slice(1);
      if (cat === "hvac") fields.category = "HVAC";
      break;
    }
  }

  // Detect priority
  for (const p of PRIORITIES) {
    if (lower.includes(p + " priority") || lower.includes("priority " + p) || lower.includes("priority is " + p)) {
      fields.priority = p;
      break;
    }
  }
  // Also check standalone "urgent" or "emergency"
  if (!fields.priority) {
    if (lower.includes("urgent") || lower.includes("emergency")) fields.priority = "emergency";
    else if (lower.includes("critical") || lower.includes("high priority")) fields.priority = "high";
  }

  fields.description = text;
  return fields;
}

export default function VoiceDictationButton({ onTranscript, onParsedFields, disabled }: VoiceDictationButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      onTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else if (event.error !== "aborted") {
        toast.error("Speech recognition error: " + event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsProcessing(true);
      if (finalTranscript.trim() && onParsedFields) {
        const parsed = parseFieldsFromTranscript(finalTranscript.trim());
        onParsedFields(parsed);
      }
      setIsProcessing(false);
    };

    recognition.start();
    setIsListening(true);
    toast.info("Listening... Speak your maintenance issue.");
  }, [onTranscript, onParsedFields]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "outline"}
      size="sm"
      onClick={toggleListening}
      disabled={disabled || isProcessing}
      className="gap-1.5"
    >
      {isProcessing ? (
        <>
          <Loader2 size={14} className="animate-spin" /> Processing...
        </>
      ) : isListening ? (
        <>
          <MicOff size={14} /> Stop
        </>
      ) : (
        <>
          <Mic size={14} /> Voice
        </>
      )}
    </Button>
  );
}
