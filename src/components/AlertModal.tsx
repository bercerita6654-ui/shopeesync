import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface AlertConfig {
  isOpen: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
  title?: string;
}

interface AlertModalProps {
  config: AlertConfig;
  onClose: () => void;
}

export default function AlertModal({ config, onClose }: AlertModalProps) {
  const { isOpen, message, type, title } = config;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden z-10 border border-slate-100"
          >
            {/* Header / Body */}
            <div className="p-6">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-start gap-4">
                {/* Icon based on type */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    type === 'success'
                      ? 'bg-emerald-50 text-emerald-600'
                      : type === 'error'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-orange-50 text-orange-600'
                  }`}
                >
                  {type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                  {type === 'error' && <AlertTriangle className="w-6 h-6" />}
                  {type === 'info' && <Info className="w-6 h-6" />}
                </div>

                <div className="flex-1 mt-0.5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {title || (type === 'success' ? 'Sukses' : type === 'error' ? 'Kesalahan' : 'Informasi')}
                  </h3>
                  <div className="mt-2 text-slate-600 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar">
                    {message}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
              <button
                onClick={onClose}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow transition-all ${
                  type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Mengerti
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
