import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, MapPin, Phone, X, Check } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName: string;
  contactNumber: string;
  location: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, onClose, onConfirm, contactName, contactNumber, location 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Emergency Alert</h2>
              <p className="text-sm text-red-600 font-medium">Confirm sending SOS?</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-gray-600 text-sm">
              This will send an immediate SMS alert with your current location to your emergency contact.
            </p>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Emergency Contact</p>
                  <p className="font-semibold text-gray-900">{contactName} ({contactNumber})</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">Detected Location</p>
                  <p className="font-semibold text-gray-900 text-sm">{location}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirm & Send
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmationModal;
