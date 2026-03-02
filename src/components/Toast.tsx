import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const config = {
    success: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    error: { icon: XCircle, color: 'bg-red-50 text-red-800 border-red-200' },
    warning: { icon: AlertCircle, color: 'bg-amber-50 text-amber-800 border-amber-200' },
    info: { icon: Info, color: 'bg-blue-50 text-blue-800 border-blue-200' }
  };

  const { icon: Icon, color } = config[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%' }}
          className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[70] flex items-center gap-3 px-6 py-3 rounded-full shadow-lg border ${color} min-w-[300px] max-w-md`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
