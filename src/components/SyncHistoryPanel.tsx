import React from 'react';
import { History, Trash2, CheckCircle2, AlertTriangle, FileSpreadsheet, Calendar } from 'lucide-react';
import { SyncHistoryLog } from '../types';

interface SyncHistoryPanelProps {
  logs: SyncHistoryLog[];
  onClearLogs: () => void;
}

export default function SyncHistoryPanel({ logs, onClearLogs }: SyncHistoryPanelProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-shopee-light text-shopee rounded-lg">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-xs md:text-sm">Riwayat Sinkronisasi</h4>
            <p className="text-[10px] text-slate-500">Jejak audit sinkronisasi Excel ke Sheets</p>
          </div>
        </div>
        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            className="text-xs text-slate-400 hover:text-rose-600 transition-colors p-1.5 hover:bg-rose-50 rounded-lg flex items-center gap-1 focus:outline-none"
            title="Bersihkan Semua Riwayat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus</span>
          </button>
        )}
      </div>

      <div className="p-4 max-h-72 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <History className="w-8 h-8 stroke-[1.2] mx-auto mb-1.5 text-slate-300" />
            <p className="text-xs">Belum ada riwayat aktivitas</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Semua jejak update akan dicatat di sini</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="py-3 first:pt-0 last:pb-0 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className={`mt-0.5 p-1 rounded-md shrink-0 ${
                    log.status === 'success' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-rose-50 text-rose-600'
                  }`}>
                    {log.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <span>Update ke Google Sheets</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        log.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {log.status === 'success' ? 'Sukses' : 'Gagal'}
                      </span>
                    </div>

                    {log.fileName && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                        <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[150px] sm:max-w-xs">{log.fileName}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>

                {log.status === 'success' && (
                  <div className="text-right shrink-0">
                    <span className="block font-bold text-emerald-600 text-[11px]">
                      +{log.rowsUpdated + log.rowsAdded} Baris
                    </span>
                    <span className="block text-[9px] text-slate-400">
                      ({log.rowsUpdated} u / {log.rowsAdded} b)
                    </span>
                  </div>
                )}
              </div>
              
              {log.errorMsg && (
                <div className="mt-1.5 ml-8 p-1.5 bg-rose-50 text-rose-700 rounded text-[10px] leading-relaxed font-mono">
                  {log.errorMsg}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
