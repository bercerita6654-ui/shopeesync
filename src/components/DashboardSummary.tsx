import React, { useMemo } from 'react';
import { RefreshCw, Play, AlertTriangle, CheckCircle, Sparkles, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DataRow {
  [key: string]: any;
}

interface DashboardSummaryProps {
  originalData: DataRow[];
  excelData: DataRow[];
  updatedData: DataRow[];
  mergeStats: {
    primaryKey: string;
    rowsUpdated: number;
    rowsAdded: number;
    matchingCols: string[];
  } | null;
}

export default function DashboardSummary({
  originalData,
  excelData,
  updatedData,
  mergeStats,
}: DashboardSummaryProps) {
  
  // Compute SKU summary metrics
  const stats = useMemo(() => {
    let unpaddedSkusCount = 0;
    let emptySkusCount = 0;
    let formatCorrectedCount = 0;
    
    const processedRows = excelData.length > 0 ? excelData : originalData;
    
    processedRows.forEach((row) => {
      for (const key in row) {
        const keyLower = key.toString().toLowerCase().trim();
        if (keyLower.includes('sku')) {
          const rawVal = row[key];
          if (rawVal === undefined || rawVal === null) {
            emptySkusCount++;
            continue;
          }
          
          let valStr = String(rawVal).trim();
          if (valStr === '') {
            emptySkusCount++;
            continue;
          }
          
          // Check for Excel float trailing .0 (e.g., 7188.0)
          if (valStr.endsWith('.0')) {
            formatCorrectedCount++;
            valStr = valStr.slice(0, -2);
          }
          
          // Check if purely numeric and less than 5 characters (e.g. 7188 or 33)
          if (/^\d+$/.test(valStr) && valStr.length < 5) {
            unpaddedSkusCount++;
          }
          
          // Check if it has been padded to 5 digits (starting with 0)
          if (/^0+\d+$/.test(valStr) && valStr.length === 5) {
            formatCorrectedCount++;
          }
        }
      }
    });

    // If there are unpadded SKUs or corrected SKUs, count them as "SKU yang perlu perbaikan / terformat otomatis"
    const totalSkuIssues = unpaddedSkusCount + emptySkusCount;

    return {
      unpaddedSkus: unpaddedSkusCount,
      emptySkus: emptySkusCount,
      correctedSkus: formatCorrectedCount,
      totalIssues: totalSkuIssues,
    };
  }, [originalData, excelData]);

  const hasExcel = excelData.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="dashboard-summary-panel">
      {/* Card 1: Products to Update */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden"
      >
        <div className="space-y-1.5 z-10">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Produk Akan Diperbarui
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {hasExcel ? (mergeStats?.rowsUpdated || 0) : 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">produk</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            {hasExcel 
              ? `Mencocokkan data di Google Sheets dengan file Excel baru.`
              : `Upload file Excel untuk melihat pratinjau pembaruan.`}
          </p>
        </div>
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl z-10 shrink-0">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-50/30 rounded-full blur-xl pointer-events-none" />
      </motion.div>

      {/* Card 2: New Products */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden"
      >
        <div className="space-y-1.5 z-10">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Produk Baru Ditambahkan
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {hasExcel ? (mergeStats?.rowsAdded || 0) : 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">produk</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            {hasExcel 
              ? `Baris baru yang tidak ditemukan di Sheets akan ditambahkan.`
              : `Mendeteksi otomatis SKU baru yang belum terdaftar.`}
          </p>
        </div>
        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl z-10 shrink-0">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-blue-50/30 rounded-full blur-xl pointer-events-none" />
      </motion.div>

      {/* Card 3: SKU Format Verification */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`bg-white p-5 rounded-2xl border shadow-sm flex items-center justify-between relative overflow-hidden ${
          stats.unpaddedSkus > 0 ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200'
        }`}
      >
        <div className="space-y-1.5 z-10">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            Status Format SKU
            {stats.unpaddedSkus > 0 && (
              <span className="inline-block w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            )}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${stats.unpaddedSkus > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stats.unpaddedSkus}
            </span>
            <span className="text-xs text-slate-500 font-medium">perlu padding</span>
          </div>
          <div className="text-[11px] text-slate-600 space-y-0.5">
            {stats.unpaddedSkus > 0 ? (
              <p className="text-amber-700 font-medium leading-normal">
                ⚠️ Ditemukan {stats.unpaddedSkus} SKU (misal: 7188) kurang dari 5 digit. 
                <span className="block text-slate-500 font-normal mt-0.5">
                  Sistem otomatis mengubahnya menjadi 5 digit (07188) demi keamanan sinkronisasi!
                </span>
              </p>
            ) : stats.correctedSkus > 0 ? (
              <p className="text-emerald-700 font-medium leading-normal">
                ✨ Format SKU aman. {stats.correctedSkus} SKU telah terformat dengan format 5-digit leading zero.
              </p>
            ) : (
              <p className="text-slate-500 leading-normal">
                Semua format SKU valid dan aman untuk diupdate ke Sheets.
              </p>
            )}
          </div>
        </div>
        <div className={`p-4 rounded-2xl z-10 shrink-0 ${
          stats.unpaddedSkus > 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
        }`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-50/40 rounded-full blur-xl pointer-events-none" />
      </motion.div>
    </div>
  );
}
