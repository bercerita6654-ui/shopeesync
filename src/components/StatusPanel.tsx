import React, { useRef, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, UploadCloud, History, TableProperties } from 'lucide-react';
import { motion } from 'motion/react';

interface StatusPanelProps {
  sheetStatus: 'loading' | 'success' | 'error';
  sheetErrorMsg?: string;
  rowCount: number;
  colCount: number;
  lastUpdateTime: string | null;
  onFileSelect: (file: File) => void;
  isProcessingFile: boolean;
  isUpdatingSheet: boolean;
  updateProgress: number;
  updateStatusText: string;
}

export default function StatusPanel({
  sheetStatus,
  sheetErrorMsg,
  rowCount,
  colCount,
  lastUpdateTime,
  onFileSelect,
  isProcessingFile,
  isUpdatingSheet,
  updateProgress,
  updateStatusText,
}: StatusPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* 1. Status Google Sheets Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-slate-800 text-sm">Status Google Sheets</h4>
          {sheetStatus === 'loading' && (
            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Memuat...
            </span>
          )}
          {sheetStatus === 'success' && (
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terhubung
            </span>
          )}
          {sheetStatus === 'error' && (
            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-full flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              Gagal
            </span>
          )}
        </div>

        <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          ShopeeBalist Sheets Integration
        </div>

        {sheetStatus === 'success' && (
          <div className="mt-3 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3 text-slate-600 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Jumlah Baris:</span>
              <span className="font-semibold text-slate-800">{rowCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Jumlah Kolom:</span>
              <span className="font-semibold text-slate-800">{colCount}</span>
            </div>
          </div>
        )}

        {sheetStatus === 'error' && (
          <div className="mt-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 leading-normal">
            {sheetErrorMsg || 'Gagal memuat data dari spreadsheet. Pastikan URL dan akses publik sudah benar.'}
          </div>
        )}

        {/* Last updated tracking */}
        {lastUpdateTime && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex items-start gap-2 text-xs">
              <History className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="block text-slate-500 font-medium text-[10px] uppercase tracking-wider">Terakhir Disinkronkan:</span>
                <span className="text-shopee font-semibold">{lastUpdateTime}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Upload Box */}
      <div
        onClick={triggerFileSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative bg-white border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer ${
          isDragActive
            ? 'border-shopee bg-shopee-light/50 scale-[0.99]'
            : 'border-slate-300 hover:border-shopee hover:bg-slate-50/50'
        } ${isProcessingFile ? 'pointer-events-none opacity-80' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          onClick={(e) => e.stopPropagation()}
          accept=".xlsx, .xls"
          className="hidden"
          disabled={isProcessingFile}
        />

        <div className="flex justify-center mb-3">
          <div className={`p-3 rounded-full transition-colors ${isDragActive ? 'bg-shopee-light text-shopee' : 'bg-slate-100 text-slate-500'}`}>
            {isProcessingFile ? (
              <Loader2 className="w-8 h-8 text-shopee animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>
        </div>

        <h4 className="font-semibold text-slate-800 text-sm mb-1">
          {isProcessingFile ? 'Membaca data file...' : 'Upload Data Produk Shopee'}
        </h4>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-normal">
          {isProcessingFile
            ? 'Mohon tunggu, sedang memilah data Excel Anda'
            : 'Seret & taruh file Excel (.xlsx, .xls) Anda di sini, atau klik untuk memilih file'}
        </p>

        {/* Excel upload constraints info */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <TableProperties className="w-3.5 h-3.5" />
          Mendukung sheet dengan format kolom Shopee
        </div>
      </div>

      {/* 3. Progress Bar for Google Sheets uploading */}
      {isUpdatingSheet && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 animate-pulse">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-shopee" />
              {updateStatusText}
            </span>
            <span className="text-shopee">{Math.floor(updateProgress)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-shopee h-2 rounded-full transition-all duration-300"
              style={{ width: `${updateProgress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
