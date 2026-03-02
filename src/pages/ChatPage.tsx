import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { 
  User, Plus, AlertCircle, FileText, FlaskConical, Pill, Building2, 
  ChevronDown, ChevronUp, LogOut, Globe, Clock, History,
  Phone, MapPin, AlertTriangle, Heart, Send, Stethoscope, Activity, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DocumentUploadModal from "../components/DocumentUploadModal";
import HospitalLocator from "../components/HospitalLocator";
import RiskAssessmentCard from "../components/RiskAssessmentCard";
import ConfirmationModal from "../components/ConfirmationModal";
import Toast from "../components/Toast";
import PrivacyCenter from "../components/PrivacyCenter";
import { useAuth } from "../context/AuthContext";

// Removed Gemini SDK imports

interface Message {
  role: "user" | "model";
  text: string;
  timestamp: number;
  urgency?: "Low" | "Medium" | "High";
  confidence?: "Low" | "Medium" | "High";
  reasoning?: string;
  disclaimer?: string;
  abnormal_values?: string[];
  safety_advisory?: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt?: number;
}

interface MedicalRecord {
  id: string;
  type: "Symptom" | "Condition" | "Doctor Visit" | "Emergency Alert";
  description: string;
  date: string;
}

interface LabReportItem {
  id: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
}

interface EmergencyHospital {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  isOpen: boolean;
  distanceKm: number;
}

const loadingMessages = [
  "Consulting medical journals...",
  "Analyzing your query...",
  "Cross-referencing symptoms...",
  "Almost there...",
  "Finalizing guidance...",
  "Checking safety protocols...",
];

const LANGUAGES = ["English", "Hindi", "Marathi", "Telugu", "Tamil", "Kannada"];
const ChatPage = () => {
  const { user, logout } = useAuth();
  const isGuestUser = user?.id === "guest" || user?.email === "guest@example.com";

  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState(loadingMessages[0]);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ data: string, mimeType: string, fileName?: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isMedicalHistoryOpen, setIsMedicalHistoryOpen] = useState(false);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [newRecord, setNewRecord] = useState({ type: "Symptom", description: "" });
  
  // New State for Sidebar
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [nearestEmergencyHospital, setNearestEmergencyHospital] = useState<EmergencyHospital | null>(null);
  const [emergencyHospitalLoading, setEmergencyHospitalLoading] = useState(false);
  const [emergencyHospitalError, setEmergencyHospitalError] = useState<string | null>(null);
  const [emergencyUserLocation, setEmergencyUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRecentChatsOpen, setIsRecentChatsOpen] = useState(true);
  const [isLabReportsOpen, setIsLabReportsOpen] = useState(true);
  const [labReports, setLabReports] = useState<LabReportItem[]>([]);
  const [isPrescriptionsOpen, setIsPrescriptionsOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState<LabReportItem[]>([]);
  const [language, setLanguage] = useState("English");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isDocumentUploadOpen, setIsDocumentUploadOpen] = useState(false);
  const [isHospitalLocatorOpen, setIsHospitalLocatorOpen] = useState(false);
  const [isPrivacyCenterOpen, setIsPrivacyCenterOpen] = useState(false);
  
  // Alert State
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const handleConfirmAlert = () => {
    setIsAlertModalOpen(false);
    
    // Simulate sending alert
    setTimeout(() => {
      showToast("Emergency alert sent successfully!", "success");
      
      // Log to medical history
      const newAlertRecord: MedicalRecord = {
        id: Date.now().toString(),
        type: "Emergency Alert",
        description: "SOS sent to Emergency Contact (Mom)",
        date: new Date().toLocaleDateString()
      };
      setMedicalRecords(prev => [newAlertRecord, ...prev]);
    }, 1000);
  };
  
  // Voice Input State
  const [transcriptPreview, setTranscriptPreview] = useState("");
  const [showDistressWarning, setShowDistressWarning] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptBufferRef = useRef("");
  const recordingBaseInputRef = useRef("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const labReportInputRef = useRef<HTMLInputElement>(null);
  const prescriptionInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  const formatDateBadge = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (sameDay) {
      return `Today, ${timePart}`;
    }

    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timePart}`;
  };

  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRadians = (value: number) => value * (Math.PI / 180);
    const earthRadiusKm = 6371;
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  };

  const fetchLabReports = async () => {
    try {
      const response = await fetch('/api/lab-reports');
      if (!response.ok) throw new Error('Failed to fetch lab reports');
      const data = await response.json();
      setLabReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch lab reports', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const response = await fetch('/api/prescriptions');
      if (!response.ok) throw new Error('Failed to fetch prescriptions');
      const data = await response.json();
      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch prescriptions', err);
    }
  };

  useEffect(() => {
    const fetchMedicalHistory = async () => {
      try {
        const response = await fetch('/api/medical-history');
        const data = await response.json();
        setMedicalRecords(data);
      } catch (err) {
        console.error('Failed to fetch medical history', err);
      }
    };
    if (isMedicalHistoryOpen) {
      fetchMedicalHistory();
    }
  }, [isMedicalHistoryOpen]);

  useEffect(() => {
    fetchLabReports();
    fetchPrescriptions();
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch (error) {
        console.error('Failed to stop speech recognition on cleanup', error);
      }
    };
  }, []);

  const fetchNearestEmergencyHospital = () => {
    setEmergencyHospitalLoading(true);
    setEmergencyHospitalError(null);

    if (!navigator.geolocation) {
      setEmergencyHospitalLoading(false);
      setEmergencyHospitalError('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setEmergencyUserLocation({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(`/api/hospitals/nearby?lat=${latitude}&lng=${longitude}&radiusKm=30`);
          if (!response.ok) {
            throw new Error(`Failed to fetch nearby hospitals: ${response.status}`);
          }

          const data = await response.json();
          const hospitals = Array.isArray(data?.hospitals) ? data.hospitals : [];
          const mapped: EmergencyHospital[] = hospitals
            .filter((hospital: any) => Number.isFinite(hospital?.latitude) && Number.isFinite(hospital?.longitude))
            .map((hospital: any) => ({
              id: String(hospital.id),
              name: String(hospital.name || 'Nearest Hospital'),
              latitude: Number(hospital.latitude),
              longitude: Number(hospital.longitude),
              address: String(hospital.address || ''),
              isOpen: Boolean(hospital.isOpen),
              distanceKm: calculateDistanceKm(latitude, longitude, Number(hospital.latitude), Number(hospital.longitude)),
            }))
            .sort((a, b) => a.distanceKm - b.distanceKm);

          if (mapped.length === 0) {
            setNearestEmergencyHospital(null);
            setEmergencyHospitalError('No nearby hospitals found for your location.');
          } else {
            setNearestEmergencyHospital(mapped[0]);
          }
        } catch (error) {
          console.error('Emergency nearest hospital lookup failed:', error);
          setNearestEmergencyHospital(null);
          setEmergencyHospitalError('Unable to load nearest hospital right now.');
        } finally {
          setEmergencyHospitalLoading(false);
        }
      },
      () => {
        setEmergencyHospitalLoading(false);
        setEmergencyHospitalError('Location access is required to find nearest hospital.');
      }
    );
  };

  useEffect(() => {
    if (isEmergencyMode) {
      fetchNearestEmergencyHospital();
    }
  }, [isEmergencyMode]);

  const openEmergencyNavigation = () => {
    if (!nearestEmergencyHospital) return;

    const destination = `${nearestEmergencyHospital.latitude},${nearestEmergencyHospital.longitude}`;
    const mapsUrl = emergencyUserLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${emergencyUserLocation.lat},${emergencyUserLocation.lng}&destination=${destination}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nearestEmergencyHospital.name + ' ' + nearestEmergencyHospital.address)}`;

    window.open(mapsUrl, '_blank');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistories, activeChatId]);

  useEffect(() => {
    if (loading) {
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setCurrentLoadingMessage(loadingMessages[i]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = String(file.type || '').toLowerCase();
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      showToast("Unsupported file type. Please upload a medical report as PDF or image.", "error");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      setSelectedFile({ data: base64Data, mimeType: file.type, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadLabReport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = String(file.type || '').toLowerCase();
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      showToast('Only PDF and image files are supported for lab reports.', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      try {
        const response = await fetch('/api/lab-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            data: base64Data,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload lab report');
        }

        showToast('Lab report uploaded successfully.', 'success');
        fetchLabReports();
      } catch (err: any) {
        showToast(err?.message || 'Failed to upload lab report.', 'error');
      }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAttachSavedLabReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/lab-reports/${reportId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load lab report');
      }

      setSelectedFile({
        data: data.data,
        mimeType: data.mimeType,
        fileName: data.fileName,
      });
      showToast('Lab report attached. Click Send to analyze.', 'info');
      setIsSidebarOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to attach lab report.', 'error');
    }
  };

  const handleDeleteLabReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/lab-reports/${reportId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete lab report');
      }

      setLabReports(prev => prev.filter(item => item.id !== reportId));
      showToast('Lab report deleted.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete lab report.', 'error');
    }
  };

  const handleUploadPrescription = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = String(file.type || '').toLowerCase();
    if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) {
      showToast('Only PDF and image files are supported for prescriptions.', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      try {
        const response = await fetch('/api/prescriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type,
            data: base64Data,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to upload prescription');
        }

        showToast('Prescription uploaded successfully.', 'success');
        fetchPrescriptions();
      } catch (err: any) {
        showToast(err?.message || 'Failed to upload prescription.', 'error');
      }
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAttachSavedPrescription = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load prescription');
      }

      setSelectedFile({
        data: data.data,
        mimeType: data.mimeType,
        fileName: data.fileName,
      });
      showToast('Prescription attached. Click Send to analyze.', 'info');
      setIsSidebarOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to attach prescription.', 'error');
    }
  };

  const handleDeletePrescription = async (prescriptionId: string) => {
    try {
      const response = await fetch(`/api/prescriptions/${prescriptionId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete prescription');
      }

      setPrescriptions(prev => prev.filter(item => item.id !== prescriptionId));
      showToast('Prescription deleted.', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete prescription.', 'error');
    }
  };

  const handleVoiceInput = () => {
    const composeInputWithSpeech = (baseText: string, speechText: string) => {
      const normalizedSpeech = speechText.trim();
      if (!normalizedSpeech) return baseText;
      if (!baseText.trim()) return normalizedSpeech;
      return `${baseText}${baseText.endsWith(' ') ? '' : ' '}${normalizedSpeech}`;
    };

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      showToast("Speech recognition is not supported in this browser.", "error");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    const languageCodes: Record<string, string> = {
      English: "en-US",
      Hindi: "hi-IN",
      Marathi: "mr-IN",
      Telugu: "te-IN",
      Tamil: "ta-IN",
      Kannada: "kn-IN",
    };
    recognition.lang = languageCodes[language] || "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      recordingBaseInputRef.current = input;
      transcriptBufferRef.current = "";
      setTranscriptPreview("");
      setShowDistressWarning(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      const finalText = transcriptBufferRef.current.trim();
      setInput(composeInputWithSpeech(recordingBaseInputRef.current, finalText));
      recordingBaseInputRef.current = "";
      transcriptBufferRef.current = "";
      setTranscriptPreview("");
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);

      const error = String(event?.error || 'unknown');
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        showToast('Microphone permission denied. Please allow mic access in browser settings.', 'error');
      } else if (error === 'no-speech') {
        showToast('No speech detected. Please try again.', 'warning');
      } else if (error === 'audio-capture') {
        showToast('No microphone was found. Check your device audio input.', 'error');
      } else {
        showToast('Voice input failed. Please try again.', 'error');
      }

      recordingBaseInputRef.current = "";
      transcriptBufferRef.current = "";
      setTranscriptPreview("");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        transcriptBufferRef.current = `${transcriptBufferRef.current} ${finalTranscript}`.trim();
      }

      const currentText = `${transcriptBufferRef.current} ${interimTranscript}`.trim();
      setTranscriptPreview(currentText);
      setInput(composeInputWithSpeech(recordingBaseInputRef.current, currentText));

      // Distress Detection Logic
      const distressKeywords = ["help", "emergency", "pain", "suicide", "die", "kill", "hurt", "bleeding", "collapse", "heart attack", "stroke", "can't breathe", "cant breathe"];
      if (distressKeywords.some(keyword => currentText.toLowerCase().includes(keyword))) {
        setShowDistressWarning(true);
      }
    };

    try {
      recognition.start();
    } catch (error) {
      setIsRecording(false);
      showToast('Unable to start microphone input. Please retry.', 'error');
    }
  };

  const handleAddMedicalRecord = async () => {
    if (!newRecord.description.trim()) return;
    try {
      const response = await fetch('/api/medical-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecord),
      });
      const data = await response.json();
      if (data.success) {
        setMedicalRecords(prev => [...prev, data.entry]);
        setNewRecord({ type: "Symptom", description: "" });
      }
    } catch (err) {
      console.error('Failed to add medical record', err);
    }
  };

  const handleDeleteMedicalRecord = async (id: string) => {
    try {
      const response = await fetch(`/api/medical-history/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setMedicalRecords(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete medical record', err);
    }
  };

  const handleNewChat = () => {
    const newChatId = `chat_${Date.now()}`;
    setChatHistories(prev => [...prev, { id: newChatId, title: "New Chat", messages: [], createdAt: Date.now() }]);
    setActiveChatId(newChatId);
    setIsSidebarOpen(false);
    setInput("");
    setSelectedFile(null);
  };

  const handleSelectChat = (id: string) => {
    setActiveChatId(id);
  };

  const handleDeleteChat = async (id: string) => {
    try {
      const response = await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setChatHistories(prev => prev.filter(h => h.id !== id));
        if (activeChatId === id) {
          setActiveChatId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete chat', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setIsUserTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsUserTyping(false), 2000);
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedFile) || loading) return;

    let currentChatId = activeChatId;
    if (!currentChatId) {
      currentChatId = `chat_${Date.now()}`;
      setActiveChatId(currentChatId);
    }

    const originalInput = input;
    const userMessage: Message = { role: "user", text: originalInput + (selectedFile ? " [Attachment]" : ""), timestamp: Date.now() };
    const currentFile = selectedFile;
    
    setInput("");
    setSelectedFile(null);

    setChatHistories(prev =>
      prev.map(h =>
        h.id === currentChatId
          ? { ...h, messages: [...h.messages, userMessage] }
          : h
      )
    );

    if (!chatHistories.some(h => h.id === currentChatId)) {
      setChatHistories(prev => [...prev, { id: currentChatId!, title: originalInput.substring(0, 30) + "...", messages: [userMessage], createdAt: Date.now() }])
    }

    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: originalInput,
          fileData: currentFile,
          history: chatHistories.find(h => h.id === currentChatId)?.messages || []
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const backendMessage = data?.response || data?.details || data?.error || response.statusText;
        throw new Error(`API Error: ${backendMessage}`);
      }

      const isDocumentAnalysisResponse = Boolean(currentFile) || Boolean(data.document_type);

      const modelMessage: Message = { 
        role: "model", 
        text: data.response || "I couldn't process that. Please try again.", 
        timestamp: Date.now(),
        urgency: isDocumentAnalysisResponse ? data.urgency_level : undefined,
        confidence: isDocumentAnalysisResponse ? data.confidence_score : undefined,
        reasoning: isDocumentAnalysisResponse ? data.reasoning : undefined,
        disclaimer: isDocumentAnalysisResponse ? data.disclaimer : undefined,
        abnormal_values: isDocumentAnalysisResponse ? data.abnormal_values : undefined,
        safety_advisory: isDocumentAnalysisResponse ? data.safety_advisory : undefined
      };

      setChatHistories(prev =>
        prev.map(h =>
          h.id === currentChatId
            ? { ...h, messages: [...h.messages, modelMessage] }
            : h
        )
      );
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorText = error?.message || "I'm having trouble connecting to the health service. Please check your connection.";
      
      const errorMessage: Message = { 
        role: "model", 
        text: errorText, 
        timestamp: Date.now() 
      };
      setChatHistories(prev =>
        prev.map(h =>
          h.id === currentChatId
            ? { ...h, messages: [...h.messages, errorMessage] }
            : h
        )
      );
    } finally {
      setLoading(false);
    }
  };
  
  const activeChat = chatHistories.find(h => h.id === activeChatId);

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden font-sans">
      <DocumentUploadModal 
        isOpen={isDocumentUploadOpen} 
        onClose={() => setIsDocumentUploadOpen(false)} 
      />
      <HospitalLocator 
        isOpen={isHospitalLocatorOpen} 
        onClose={() => setIsHospitalLocatorOpen(false)} 
      />

      <PrivacyCenter 
        isOpen={isPrivacyCenterOpen}
        onClose={() => setIsPrivacyCenterOpen(false)}
      />
      
      <ConfirmationModal 
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onConfirm={handleConfirmAlert}
        contactName="Mom"
        contactNumber="+91 98765 43210"
        location="12.9716° N, 77.5946° E (Bangalore)"
      />

      <Toast 
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* MEDICAL HISTORY MODAL */}
      {isMedicalHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <History className="w-6 h-6" />
                Medical History
              </h2>
              <button onClick={() => setIsMedicalHistoryOpen(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Add New Record Form */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h3 className="font-semibold text-gray-700">Add New Entry</h3>
                <div className="flex flex-col md:flex-row gap-3">
                  <select 
                    value={newRecord.type}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, type: e.target.value as any }))}
                    className="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                  >
                    <option value="Symptom">Symptom</option>
                    <option value="Condition">Condition</option>
                    <option value="Doctor Visit">Doctor Visit</option>
                  </select>
                  <input 
                    type="text"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the condition, symptom or visit..."
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                  />
                  <button 
                    onClick={handleAddMedicalRecord}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-all text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Records List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700">Past Records</h3>
                {medicalRecords.length === 0 ? (
                  <p className="text-center text-gray-500 py-10 italic">No medical records found. Add your first entry above.</p>
                ) : (
                  <div className="space-y-3">
                    {medicalRecords.map(record => (
                      <div key={record.id} className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                        <div className="flex gap-4">
                          <div className={`p-2 rounded-lg ${
                            record.type === 'Symptom' ? 'bg-orange-100 text-orange-600' :
                            record.type === 'Condition' ? 'bg-red-100 text-red-600' :
                            record.type === 'Emergency Alert' ? 'bg-rose-100 text-rose-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {record.type === 'Symptom' && <AlertCircle className="w-5 h-5" />}
                            {record.type === 'Condition' && <Activity className="w-5 h-5" />}
                            {record.type === 'Doctor Visit' && <Stethoscope className="w-5 h-5" />}
                            {record.type === 'Emergency Alert' && <AlertTriangle className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{record.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold uppercase px-2 py-0.5 bg-gray-100 rounded text-gray-500">{record.type}</span>
                              <span className="text-xs text-gray-400">{new Date(record.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteMedicalRecord(record.id)}
                          className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t text-center">
              <p className="text-xs text-gray-500 italic">This information is stored securely and used to provide better health guidance.</p>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-gray-200 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-lg md:shadow-none`}>
        
        {/* Sidebar Header */}
        <div className="p-4 space-y-3 border-b border-gray-100">
          <button 
            onClick={handleNewChat} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
          
          <button 
            onClick={() => setIsEmergencyMode(!isEmergencyMode)}
            className={`w-full py-2.5 rounded-xl font-medium border transition-all flex items-center justify-center gap-2 ${
              isEmergencyMode 
                ? 'bg-red-50 border-red-200 text-red-600 shadow-inner' 
                : 'bg-white border-red-100 text-red-500 hover:bg-red-50'
            }`}
          >
            <AlertCircle className={`w-5 h-5 ${isEmergencyMode ? 'animate-pulse' : ''}`} />
            {isEmergencyMode ? 'Emergency Mode ON' : 'Emergency Mode'}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          
          {/* Main Menu */}
          <div className="space-y-1">
            <button 
              onClick={() => { setIsMedicalHistoryOpen(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
            >
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <History className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Medical History</span>
            </button>
            
            <button 
              onClick={() => setIsLabReportsOpen(!isLabReportsOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
            >
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <FlaskConical className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Lab Reports</span>
              <span className="ml-auto text-gray-400">
                {isLabReportsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence>
              {isLabReportsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-3 mt-1 overflow-hidden"
                >
                  <div className="space-y-2 border-l border-gray-200 pl-3">
                    <button
                      onClick={() => labReportInputRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Upload Lab Report
                    </button>

                    {labReports.length === 0 ? (
                      <p className="px-3 text-xs text-gray-400 italic">No lab reports uploaded</p>
                    ) : (
                      <div className="space-y-1">
                        {[...labReports]
                          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                          .map(report => (
                          <div key={report.id} className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50">
                            <button
                              onClick={() => handleAttachSavedLabReport(report.id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="text-xs font-medium text-gray-700 truncate">{report.fileName}</p>
                              <p className="text-[10px] text-gray-400">{formatDateBadge(report.uploadedAt)}</p>
                            </button>
                            <button
                              onClick={() => handleDeleteLabReport(report.id)}
                              className="p-1 text-gray-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete report"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => setIsPrescriptionsOpen(!isPrescriptionsOpen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
            >
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-100 transition-colors">
                <Pill className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Prescriptions</span>
              <span className="ml-auto text-gray-400">
                {isPrescriptionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            <AnimatePresence>
              {isPrescriptionsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="ml-3 mt-1 overflow-hidden"
                >
                  <div className="space-y-2 border-l border-gray-200 pl-3">
                    <button
                      onClick={() => prescriptionInputRef.current?.click()}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Upload Prescription
                    </button>

                    {prescriptions.length === 0 ? (
                      <p className="px-3 text-xs text-gray-400 italic">No prescriptions uploaded</p>
                    ) : (
                      <div className="space-y-1">
                        {[...prescriptions]
                          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                          .map(item => (
                          <div key={item.id} className="group flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50">
                            <button
                              onClick={() => handleAttachSavedPrescription(item.id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <p className="text-xs font-medium text-gray-700 truncate">{item.fileName}</p>
                              <p className="text-[10px] text-gray-400">{formatDateBadge(item.uploadedAt)}</p>
                            </button>
                            <button
                              onClick={() => handleDeletePrescription(item.id)}
                              className="p-1 text-gray-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete prescription"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={() => { setIsHospitalLocatorOpen(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
            >
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Hospitals</span>
            </button>
          </div>

          {/* Recent Chats */}
          <div className="space-y-2">
            <button 
              onClick={() => setIsRecentChatsOpen(!isRecentChatsOpen)}
              className="w-full flex items-center justify-between px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
            >
              <span>Recent Chats</span>
              {isRecentChatsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            
            <AnimatePresence>
              {isRecentChatsOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {chatHistories.length === 0 ? (
                    <p className="px-3 text-xs text-gray-400 italic">No recent chats</p>
                  ) : (
                    chatHistories.slice().reverse().map(h => (
                      <div key={h.id} className="group relative">
                        <a 
                          href="#" 
                          onClick={() => { handleSelectChat(h.id); setIsSidebarOpen(false); }} 
                          className={`block px-3 py-2.5 rounded-lg text-sm transition-all ${
                            activeChatId === h.id 
                              ? 'bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-700 font-medium shadow-sm' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="truncate pr-6">{h.title}</div>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {h.createdAt 
                              ? new Date(h.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) 
                              : 'Just now'}
                          </div>
                        </a>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteChat(h.id); }} 
                          className="absolute right-2 top-2.5 p-1 text-gray-300 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-4">
          
          {/* Language Selector */}
          <div className="space-y-3">
            <button 
              onClick={() => { setIsPrivacyCenterOpen(true); setIsSidebarOpen(false); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group border border-transparent hover:border-emerald-100"
            >
              <div className="p-1 bg-gray-100 text-gray-500 rounded group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Privacy Center</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-indigo-300 transition-colors"
              >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-500" />
                <span>{language}</span>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isLanguageMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 max-h-48 overflow-y-auto"
                >
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang}
                      onClick={() => { setLanguage(lang); setIsLanguageMenuOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${language === lang ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-700'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pt-2">
            {user ? (
              <>
                {isGuestUser ? (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                ) : (
                  <img src={user.photos[0].value} alt={user.displayName} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{user.displayName}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-xs text-gray-500">Low Risk</span>
                  </div>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">Guest User</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                    <span className="text-xs text-gray-500">No Data</span>
                  </div>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`shadow-sm p-4 flex items-center justify-center relative transition-colors duration-300 ${isEmergencyMode ? 'bg-red-600 text-white' : 'bg-white text-indigo-700'}`}>
          <button onClick={() => setIsSidebarOpen(true)} className={`md:hidden p-2 absolute left-4 ${isEmergencyMode ? 'text-white' : 'text-gray-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {isEmergencyMode ? (
            <h1 className="text-2xl font-bold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-6 h-6" />
              EMERGENCY MODE ACTIVATED
            </h1>
          ) : (
            <h1 className="text-2xl font-bold">🩺 AI Health Navigator</h1>
          )}
        </header>

        {isEmergencyMode ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 bg-red-50 p-4 md:p-8 overflow-y-auto flex flex-col items-center"
          >
            <div className="w-full max-w-4xl space-y-6 md:space-y-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Emergency Call Button */}
                <a href="tel:108" className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl shadow-md border-2 border-red-100 flex items-center justify-between hover:border-red-300 transition-colors group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="bg-red-100 p-4 rounded-full text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <Phone className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Call Ambulance</h3>
                      <p className="text-gray-500">Immediate medical assistance</p>
                    </div>
                  </div>
                  <span className="text-4xl font-black text-red-600">108</span>
                </a>

                {/* Nearest Hospital */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
                  <div className="flex items-center gap-3 text-indigo-900">
                    <Building2 className="w-6 h-6 text-indigo-600" />
                    <h3 className="text-lg font-bold">Nearest Hospital</h3>
                  </div>
                  <div onClick={openEmergencyNavigation} className="h-40 bg-gray-100 rounded-xl flex items-center justify-center relative overflow-hidden group cursor-pointer">
                     <div className="absolute inset-0 bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                        <MapPin className="w-10 h-10 text-indigo-300" />
                        <span className="ml-2 text-indigo-400 font-medium">Map Preview</span>
                     </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{nearestEmergencyHospital?.name || (emergencyHospitalLoading ? 'Finding nearest hospital...' : 'Nearest hospital unavailable')}</h4>
                    <p className="text-sm text-gray-500">
                      {nearestEmergencyHospital
                        ? `${nearestEmergencyHospital.distanceKm.toFixed(1)} km away • ${nearestEmergencyHospital.isOpen ? 'Open Now' : 'Status Unknown'}`
                        : (emergencyHospitalError || 'Location is required to detect nearest hospital')}
                    </p>
                    <button onClick={openEmergencyNavigation} disabled={!nearestEmergencyHospital} className="mt-3 w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed">
                      Navigate
                    </button>
                  </div>
                </div>

                {/* First Aid */}
                <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 space-y-4">
                  <div className="flex items-center gap-3 text-indigo-900">
                    <Heart className="w-6 h-6 text-red-500" />
                    <h3 className="text-lg font-bold">Quick First Aid</h3>
                  </div>
                  <div className="space-y-3">
                     <div className="flex gap-3 items-start p-3 bg-red-50 rounded-lg">
                        <span className="font-bold text-red-600">1.</span>
                        <p className="text-sm text-gray-700">Check for breathing and pulse.</p>
                     </div>
                     <div className="flex gap-3 items-start p-3 bg-red-50 rounded-lg">
                        <span className="font-bold text-red-600">2.</span>
                        <p className="text-sm text-gray-700">If unconscious, place in recovery position.</p>
                     </div>
                     <div className="flex gap-3 items-start p-3 bg-red-50 rounded-lg">
                        <span className="font-bold text-red-600">3.</span>
                        <p className="text-sm text-gray-700">Apply pressure to any bleeding wounds.</p>
                     </div>
                  </div>
                  <button className="w-full text-indigo-600 font-medium text-sm hover:underline">View Full Guide</button>
                </div>
              </div>

              {/* Send Alert */}
              <button 
                onClick={() => setIsAlertModalOpen(true)}
                className="w-full bg-red-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-red-700 active:scale-[0.99] transition-all flex items-center justify-center gap-3"
              >
                <Send className="w-6 h-6" />
                Send Alert to Emergency Contacts
              </button>

            </div>
          </motion.div>
        ) : (
          <>
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {activeChat && activeChat.messages.length > 0 && (
              (() => {
                const lastModelMessage = [...activeChat.messages].reverse().find(m => m.role === 'model' && m.urgency);
                if (lastModelMessage && lastModelMessage.urgency) {
                  const confidenceMap = { 'Low': 40, 'Medium': 75, 'High': 95 };
                  const confidence = lastModelMessage.confidence ? confidenceMap[lastModelMessage.confidence] : 70;
                  
                  return (
                    <RiskAssessmentCard 
                      riskLevel={lastModelMessage.urgency}
                      confidence={confidence}
                      explanation={lastModelMessage.reasoning || "Based on the symptoms provided, this assessment suggests the potential urgency of the situation."}
                    />
                  );
                }
                return null;
              })()
            )}

            {!activeChat && !loading && (
              <div className="text-center mt-20 text-gray-600">
                Click "New Chat" to begin.
              </div>
            )}
            {activeChat?.messages.map((msg, index) => (
              <div key={index} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "user" ? (
                    <div className="bg-indigo-600 text-white px-5 py-3 rounded-2xl rounded-br-md shadow-md max-w-md">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-200 max-w-2xl text-[15px] leading-7 text-gray-700">
                      <ReactMarkdown
                        components={{
                          strong: ({node, ...props}) => <span className="font-bold text-gray-900" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-5 mt-3 space-y-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mt-3 space-y-2" {...props} />,
                          li: ({node, ...props}) => <li className="leading-7" {...props} />,
                          p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-7" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-5 mb-3" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-4 mb-3" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-3 mb-2" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      
                      {/* Structured Data Display */}
                      {(msg.urgency || msg.confidence || msg.reasoning) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 text-xs space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {msg.urgency && (
                              <span className={`px-2 py-1 rounded-full font-medium ${
                                msg.urgency === 'High' ? 'bg-red-100 text-red-700' :
                                msg.urgency === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                Urgency: {msg.urgency}
                              </span>
                            )}
                            {msg.confidence && (
                              <span className={`px-2 py-1 rounded-full font-medium ${
                                msg.confidence === 'High' ? 'bg-blue-100 text-blue-700' :
                                msg.confidence === 'Medium' ? 'bg-gray-100 text-gray-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                Confidence: {msg.confidence}
                              </span>
                            )}
                          </div>
                          {msg.reasoning && (
                            <div className="bg-gray-50 p-2 rounded text-gray-600">
                              <span className="font-semibold text-gray-800">Why:</span> {msg.reasoning}
                            </div>
                          )}
                          
                          {msg.abnormal_values && msg.abnormal_values.length > 0 && (
                            <div className="bg-red-50 p-2 rounded border border-red-100">
                              <span className="font-semibold text-red-800 block mb-1">⚠️ Abnormal Findings:</span>
                              <ul className="list-disc pl-4 text-red-700">
                                {msg.abnormal_values.map((val, idx) => (
                                  <li key={idx}>{val}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {msg.safety_advisory && (
                            <div className="bg-orange-50 p-2 rounded border border-orange-100 text-orange-800">
                              <span className="font-semibold block mb-1">🛡️ Safety Advisory:</span>
                              {msg.safety_advisory}
                            </div>
                          )}

                          {msg.disclaimer && (
                            <div className="text-gray-400 italic text-[10px]">
                              {msg.disclaimer}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-2">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex flex-col items-start">
                <div className="bg-white p-4 rounded-2xl shadow-md flex flex-col gap-3 border border-gray-100 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-xs font-medium text-gray-500 italic">{currentLoadingMessage}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full animate-[loading_2s_ease-in-out_infinite] w-1/3"></div>
                  </div>
                </div>
              </div>
            )}
            {isUserTyping && !loading && (
              <div className="flex justify-end">
                <div className="bg-indigo-50 text-indigo-400 px-3 py-1 rounded-full text-[10px] italic animate-pulse">
                  You are typing...
                </div>
              </div>
            )}
            <div ref={chatEndRef}></div>
          </div>
        </main>

        <footer className="p-2 md:p-4 bg-white shadow-inner">
          <div className="max-w-3xl mx-auto space-y-2">
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <div className="w-8 h-8 bg-indigo-100 rounded flex items-center justify-center text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <span className="text-xs text-gray-500 flex-1 truncate">{selectedFile.fileName || "File attached"}</span>
                <button onClick={() => setSelectedFile(null)} className="text-red-500 hover:text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative" ref={uploadMenuRef}>
                <button 
                  onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
                  className="p-2 md:p-3 rounded-full text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
                  title="Upload Options"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                
                {isUploadMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-2 w-40 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <button 
                      onClick={() => { fileInputRef.current?.click(); setIsUploadMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      Document
                    </button>
                    <button 
                      onClick={() => { cameraInputRef.current?.click(); setIsUploadMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Camera
                    </button>
                  </div>
                )}
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="application/pdf,image/*"
              />
              <input 
                type="file" 
                ref={cameraInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/jpeg,image/png,image/tiff" 
                capture="environment"
              />
              <input
                type="file"
                ref={labReportInputRef}
                onChange={handleUploadLabReport}
                className="hidden"
                accept="application/pdf,image/*"
              />
              <input
                type="file"
                ref={prescriptionInputRef}
                onChange={handleUploadPrescription}
                className="hidden"
                accept="application/pdf,image/*"
              />

              <div className="flex-1 relative flex items-center">
                {isRecording ? (
                  <div className="w-full flex items-center gap-3 p-2 md:p-3 rounded-full border border-red-200 bg-red-50 relative overflow-hidden">
                    {/* Waveform Animation */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                       <div className="flex items-end gap-1 h-full py-2">
                          {[...Array(10)].map((_, i) => (
                            <motion.div 
                              key={i}
                              animate={{ height: ["20%", "80%", "20%"] }}
                              transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 bg-red-500 rounded-full"
                            />
                          ))}
                       </div>
                    </div>

                    <div className="z-10 flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-sm text-red-700 font-medium truncate">
                        {transcriptPreview || "Listening..."}
                      </span>
                    </div>

                    <button 
                      onClick={handleVoiceInput}
                      className="z-10 p-1.5 bg-white text-red-600 rounded-full shadow-sm hover:bg-red-100 transition-colors"
                    >
                      <div className="w-3 h-3 bg-red-600 rounded-sm"></div>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Ask anything..."
                      className="w-full pl-4 pr-12 py-2 md:py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm md:text-base"
                      disabled={!activeChatId && chatHistories.length > 0}
                    />
                    <button 
                      onClick={handleVoiceInput}
                      className="absolute right-2 p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                      title="Voice Input"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    </button>
                  </>
                )}
              </div>

              {/* Distress Warning Banner */}
              <AnimatePresence>
                {showDistressWarning && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 right-0 mx-4 mb-2 bg-yellow-50 border border-yellow-200 p-3 rounded-xl shadow-lg flex items-center justify-between z-50"
                  >
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-medium">You sound distressed. Do you need immediate help?</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsEmergencyMode(true)}
                        className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        YES, HELP
                      </button>
                      <button 
                        onClick={() => setShowDistressWarning(false)}
                        className="px-3 py-1 bg-white text-gray-600 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleSendMessage}
                disabled={loading || (!activeChatId && chatHistories.length > 0)}
                className="p-2 md:px-6 md:py-3 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all disabled:bg-gray-400 flex-shrink-0"
              >
                <span className="hidden md:inline">Send</span>
                <svg className="md:hidden" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-center text-gray-500 mt-2">
            Educational purposes only. Not a substitute for professional medical advice.
          </p>
        </footer>
        </>
      )}
      </div>
    </div>
  );
};

export default ChatPage;
