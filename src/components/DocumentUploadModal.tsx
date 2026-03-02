import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, FileText, CheckCircle, AlertCircle, 
  FlaskConical, Pill, Activity, File, Loader2
} from 'lucide-react';

interface AnalysisResult {
  document_type: string;
  extracted_entities: string[];
  abnormal_values: string[];
  explanation: string;
  safety_advisory: string;
  urgency_level?: string;
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ isOpen, onClose }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setIsProcessing(false);
      setAnalysisResult(null);
      setError(null);
    }
  }, [isOpen]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }
    setFile(file);
    uploadAndAnalyze(file);
  };

  const uploadAndAnalyze = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: "Analyze this medical document and provide a structured summary.",
              fileData: {
                data: base64Data,
                mimeType: file.type
              }
            })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.response || data.details || data.error || "Failed to analyze document");
          }
          
          // Check if the response indicates an error in processing (from our backend logic)
          if (data.response && data.response.startsWith("Error:")) {
             throw new Error(data.response);
          }

          setAnalysisResult({
            document_type: data.document_type || "Medical Document",
            extracted_entities: data.extracted_entities || [],
            abnormal_values: data.abnormal_values || [],
            explanation: data.explanation || data.response || "No explanation provided.",
            safety_advisory: data.safety_advisory || "Consult a healthcare professional.",
            urgency_level: data.urgency_level
          });

        } catch (err: any) {
          console.error("Analysis Error:", err);
          setError(err.message || "Failed to analyze document. Please try again.");
          setFile(null); // Reset file on error to allow retry
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read file.");
        setIsProcessing(false);
      };

    } catch (err: any) {
      setError("An unexpected error occurred.");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Upload Medical Document
            </h2>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {error && (
               <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
                 <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                 <p className="text-sm font-medium">{error}</p>
               </div>
            )}

            {!analysisResult ? (
              <div className="space-y-6">
                {/* Upload Area */}
                {!isProcessing ? (
                  <div 
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors ${
                      dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700">
                      Drag & Drop your file here
                    </h3>
                    <p className="text-gray-500 mt-2 text-sm">
                      Supports PDF and image files (auto-converted when needed, Max 10MB)
                    </p>
                    <div className="mt-6">
                      <input 
                        ref={inputRef}
                        type="file" 
                        className="hidden" 
                        accept="application/pdf,image/*"
                        onChange={handleChange}
                      />
                      <button 
                        onClick={() => inputRef.current?.click()}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                      >
                        Browse Files
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900">Analyzing Document...</h3>
                      <p className="text-sm text-gray-500">Extracting medical data using AI</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success Header */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Analysis Complete</h3>
                    <p className="text-sm text-green-700">Successfully extracted data from {file?.name}</p>
                  </div>
                </div>

                {/* Analysis Result Card */}
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-gray-800 capitalize">
                      {analysisResult.document_type} Analysis
                    </h3>
                    {analysisResult.urgency_level === 'High' && (
                      <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                        High Urgency
                      </span>
                    )}
                  </div>
                  
                  <div className="p-5 space-y-4">
                    {/* Explanation */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Summary & Explanation</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {analysisResult.explanation}
                      </p>
                    </div>

                    {/* Abnormal Values */}
                    {analysisResult.abnormal_values.length > 0 && (
                      <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                        <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Abnormal Findings
                        </h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                          {analysisResult.abnormal_values.map((val, idx) => (
                            <li key={idx}>{val}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Extracted Entities List */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Extracted Data</h4>
                      {analysisResult.extracted_entities.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.extracted_entities.map((entity, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">
                              {entity}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No medical data extracted.</p>
                      )}
                    </div>

                    {/* Safety Advisory */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h4 className="text-sm font-semibold text-blue-800 mb-1">Safety Advisory</h4>
                      <p className="text-sm text-blue-700">
                        {analysisResult.safety_advisory}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl text-xs text-gray-500">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    AI-generated analysis may contain errors. Always verify critical values with the original document and consult a healthcare professional.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => { setFile(null); setAnalysisResult(null); }}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Upload Another
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DocumentUploadModal;
