import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Activity, ShieldAlert } from 'lucide-react';

interface RiskAssessmentCardProps {
  riskLevel: 'Low' | 'Moderate' | 'High';
  confidence: number; // 0-100
  explanation: string;
}

const RiskAssessmentCard: React.FC<RiskAssessmentCardProps> = ({ riskLevel, confidence, explanation }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = {
    Low: {
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      barColor: 'bg-emerald-500',
      icon: CheckCircle,
      label: 'Low Risk'
    },
    Moderate: {
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      barColor: 'bg-amber-500',
      icon: Activity,
      label: 'Moderate Risk'
    },
    High: {
      color: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      barColor: 'bg-rose-500',
      icon: ShieldAlert,
      label: 'High Risk'
    }
  };

  const theme = config[riskLevel] || config.Low;
  const Icon = theme.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto mb-6"
    >
      <div className={`rounded-xl border ${theme.borderColor} ${theme.bgColor} overflow-hidden shadow-sm transition-all duration-300`}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-white shadow-sm ${theme.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${theme.color}`}>{theme.label}</h3>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">AI Health Assessment</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold ${theme.color}`}>{confidence}%</span>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Confidence</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2.5 bg-white/60 rounded-full overflow-hidden mb-4 border border-black/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={`absolute top-0 left-0 h-full rounded-full ${theme.barColor}`}
            />
          </div>

          {/* Toggle Button */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wide ${theme.color} hover:opacity-80 transition-opacity focus:outline-none`}
          >
            {isExpanded ? 'Hide Analysis' : 'View Analysis'}
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-5 pb-5 pt-0">
                <div className="p-4 bg-white/80 rounded-lg border border-black/5 text-sm text-gray-800 leading-relaxed shadow-sm">
                  <div className="flex gap-2 mb-2 text-gray-900 font-semibold items-center text-xs uppercase tracking-wide">
                    <Info className="w-3.5 h-3.5" />
                    Reasoning
                  </div>
                  {explanation}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default RiskAssessmentCard;
