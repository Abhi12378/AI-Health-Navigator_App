import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Lock, Clock, Trash2, FileText, CheckCircle, 
  AlertTriangle, X, Eye, EyeOff, Server
} from 'lucide-react';

interface PrivacyCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrivacyCenter: React.FC<PrivacyCenterProps> = ({ isOpen, onClose }) => {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  
  // Mock timers
  const [fileTimer, setFileTimer] = useState({ hours: 23, minutes: 59 });
  const [sessionTimer, setSessionTimer] = useState({ minutes: 14, seconds: 59 });

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setSessionTimer(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleDeleteData = () => {
    setIsDeleted(true);
    setTimeout(() => {
      setIsDeleted(false);
      setDeleteConfirm(false);
      onClose();
      // In a real app, this would trigger a wipe function
      alert("All local data has been securely wiped.");
    }, 2000);
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
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-emerald-900">Privacy Center</h2>
                <p className="text-xs text-emerald-600 font-medium">Your Data, Your Control</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Encryption Status */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Lock className="w-32 h-32" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-white/20 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                    Status: Active
                  </span>
                  <CheckCircle className="w-4 h-4 text-emerald-200" />
                </div>
                <h3 className="text-2xl font-bold mb-1">End-to-End Encrypted</h3>
                <p className="text-emerald-100 text-sm max-w-md">
                  Your personal health data is encrypted using AES-256 standards. 
                  Only you have access to your medical records and chat history.
                </p>
              </div>
            </div>

            {/* Timers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Auto-Delete */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors group">
                <div className="flex items-center gap-3 mb-3 text-gray-700">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-semibold">File Auto-Delete</h4>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{fileTimer.hours}</span>
                  <span className="text-sm text-gray-500 font-medium">h</span>
                  <span className="text-3xl font-bold text-gray-900 ml-2">{fileTimer.minutes}</span>
                  <span className="text-sm text-gray-500 font-medium">m</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Uploaded documents are automatically purged from our servers after 24 hours.
                </p>
              </div>

              {/* Session Expiry */}
              <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 hover:border-emerald-200 transition-colors group">
                <div className="flex items-center gap-3 mb-3 text-gray-700">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-semibold">Session Expiry</h4>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">{sessionTimer.minutes}</span>
                  <span className="text-sm text-gray-500 font-medium">m</span>
                  <span className="text-3xl font-bold text-gray-900 ml-2">{sessionTimer.seconds.toString().padStart(2, '0')}</span>
                  <span className="text-sm text-gray-500 font-medium">s</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  For your security, inactive sessions are terminated automatically.
                </p>
              </div>
            </div>

            {/* Data Retention Policy */}
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <Server className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Data Retention Policy</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">
                    We practice data minimization. Your chat logs are stored locally on your device 
                    where possible. Cloud backups are optional and fully encrypted. We do not sell 
                    or share your personal health information with third parties.
                  </p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Danger Zone</h4>
              
              {!deleteConfirm ? (
                <button 
                  onClick={() => setDeleteConfirm(true)}
                  className="w-full bg-white border border-red-200 text-red-600 p-4 rounded-xl font-semibold hover:bg-red-50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5" />
                    <span>Delete All My Data</span>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded group-hover:bg-red-200">Irreversible</span>
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-3 mb-4 text-red-800">
                    <AlertTriangle className="w-6 h-6" />
                    <div>
                      <p className="font-bold">Are you absolutely sure?</p>
                      <p className="text-xs">This action cannot be undone. All history will be lost.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDeleteConfirm(false)}
                      className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteData}
                      disabled={isDeleted}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 flex items-center justify-center gap-2"
                    >
                      {isDeleted ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          Yes, Delete Everything
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PrivacyCenter;
