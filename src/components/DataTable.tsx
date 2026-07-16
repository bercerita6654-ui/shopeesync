import React, { useState, useMemo } from 'react';
import { Table, Search, ChevronLeft, ChevronRight, CloudUpload, Info, ArrowRight, Sparkles } from 'lucide-react';
import { ActiveTab, DataRow, MergeStats } from '../types';

interface DataTableProps {
  originalData: DataRow[];
  originalHeaders: string[];
  excelData: DataRow[];
  excelHeaders: string[];
  updatedData: DataRow[];
  updatedHeaders: string[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  mergeStats: MergeStats | null;
  onUpdateToSheets: () => void;
  isUpdatingSheet: boolean;
  syncMethod: 'firebase' | 'direct' | 'sheets_api';
  setSyncMethod: (method: 'firebase' | 'direct' | 'sheets_api') => void;
}

export default function DataTable({
  originalData,
  originalHeaders,
  excelData,
  excelHeaders,
  updatedData,
  updatedHeaders,
  activeTab,
  setActiveTab,
  mergeStats,
  onUpdateToSheets,
  isUpdatingSheet,
  syncMethod,
  setSyncMethod,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50; // Use a comfortable row count per page

  // Determine which data and headers to show
  const currentDataset = useMemo(() => {
    if (activeTab === 'original') return originalData;
    if (activeTab === 'excel') return excelData;
    return updatedData;
  }, [activeTab, originalData, excelData, updatedData]);

  const currentHeaders = useMemo(() => {
    if (activeTab === 'original') return originalHeaders;
    if (activeTab === 'excel') return excelHeaders;
    return updatedHeaders;
  }, [activeTab, originalHeaders, excelHeaders, updatedHeaders]);

  // Handle Search Filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return currentDataset;
    const lowerSearch = searchTerm.toLowerCase();
    
    return currentDataset.filter((row) => {
      return Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [currentDataset, searchTerm]);

  // Reset page when changing tabs or search terms
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  // Paginated Data
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredData.length);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[75vh] min-h-[550px] overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-shopee-light text-shopee rounded-lg">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
              Pratinjau Data
              {mergeStats && activeTab === 'updated' && (
                <span className="text-[10px] bg-shopee-light text-shopee font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  Siap Sinkron
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">Pratinjau data dinamis dari setiap sumber data</p>
          </div>
        </div>

        {excelData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 font-sans">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => setSyncMethod('sheets_api')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 focus:outline-none ${
                  syncMethod === 'sheets_api'
                    ? 'bg-shopee text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Sinkronisasi langsung menggunakan Google Sheets API resmi secara cepat dan aman tanpa setup Apps Script."
              >
                ⚡ Google Sheets API
              </button>
              <button
                type="button"
                onClick={() => setSyncMethod('firebase')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 focus:outline-none ${
                  syncMethod === 'firebase'
                    ? 'bg-white text-shopee shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Menyimpan ke Firebase lalu memicu Google Sheets menarik data secara akurat & aman dari resiko timeout browser."
              >
                🔥 Firebase Sync
              </button>
              <button
                type="button"
                onClick={() => setSyncMethod('direct')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 focus:outline-none ${
                  syncMethod === 'direct'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Mengirim payload JSON secara langsung ke Apps Script. Dapat mengalami timeout pada file besar."
              >
                Direct POST
              </button>
            </div>

            <button
              onClick={onUpdateToSheets}
              disabled={isUpdatingSheet || excelData.length === 0}
              className={`px-4 py-2 bg-shopee hover:bg-shopee-hover text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-shopee/20 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CloudUpload className="w-4 h-4 animate-bounce" />
              Update Data ke Sheets
            </button>
          </div>
        )}
      </div>

      {/* 2. Key/Merge Statistics Bar if merge active */}
      {mergeStats && activeTab === 'updated' && (
        <div className="bg-shopee-light/50 border-b border-shopee/10 px-5 py-3 text-xs text-shopee-hover flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-shopee flex-shrink-0" />
            <span>
              Kolom Identifikator Utama: <strong className="font-bold text-shopee">"{mergeStats.primaryKey}"</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Pencocokan Kolom: <strong className="font-bold text-shopee">{mergeStats.matchingCols.length} kolom sama</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Pembaruan: <strong className="font-bold text-emerald-700">{mergeStats.rowsUpdated} baris</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
              Baris Baru: <strong className="font-bold text-blue-700">{mergeStats.rowsAdded} baris</strong>
            </span>
          </div>
        </div>
      )}

      {/* 3. Tabs Navigation & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-5 pt-3 pb-3 gap-4">
        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('original')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'original'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Data Sheets ({originalData.length})
          </button>

          {excelData.length > 0 && (
            <button
              onClick={() => setActiveTab('excel')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'excel'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Excel Upload ({excelData.length})
            </button>
          )}

          {updatedData.length > 0 && (
            <button
              onClick={() => setActiveTab('updated')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'updated'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              Data Diperbarui ({updatedData.length})
              {mergeStats && (
                <span className="bg-shopee text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {mergeStats.rowsUpdated + mergeStats.rowsAdded}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kata kunci..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-shopee/20 focus:border-shopee transition-all"
          />
        </div>
      </div>

      {/* 4. Table Scroll Container */}
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {currentHeaders.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8">
            <Table className="w-12 h-12 stroke-[1.2] text-slate-300 mb-2" />
            <p className="text-sm">Tidak ada kolom data yang terbaca</p>
            <p className="text-xs mt-1 text-slate-400">Harap muat data atau unggah file Excel</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8">
            <Search className="w-12 h-12 stroke-[1.2] text-slate-300 mb-2" />
            <p className="text-sm">Data tidak ditemukan</p>
            <p className="text-xs mt-1 text-slate-400">Tidak ada baris yang cocok dengan "{searchTerm}"</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
            {/* Table Header */}
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
              <tr>
                <th className="px-4 py-3 text-slate-500 font-semibold bg-slate-100 border-b border-r border-slate-200 w-12 text-center sticky left-0 z-20 shadow-[1px_0_0_0_#e2e8f0]">
                  #
                </th>
                {currentHeaders.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-slate-700 font-semibold bg-slate-100 border-b border-r border-slate-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-slate-100">
              {paginatedData.map((row, index) => {
                let trClass = 'hover:bg-slate-50 transition-colors';
                let numCellClass = 'px-4 py-2 text-slate-400 border-r border-slate-200 text-center sticky left-0 z-10 shadow-[1px_0_0_0_#e2e8f0]';
                
                if (row._isUpdated) {
                  trClass = 'bg-emerald-50/70 hover:bg-emerald-50';
                  numCellClass += ' bg-emerald-100/50';
                } else if (row._isNew) {
                  trClass = 'bg-blue-50/70 hover:bg-blue-50';
                  numCellClass += ' bg-blue-100/50';
                } else {
                  numCellClass += ' bg-white';
                }

                return (
                  <tr key={index} className={trClass}>
                    {/* Index Counter Cell */}
                    <td className={numCellClass}>
                      <span className="font-semibold">{startIndex + index + 1}</span>
                    </td>

                    {/* Data Cells */}
                    {currentHeaders.map((header) => {
                      const cellVal = row[header] !== undefined && row[header] !== null ? row[header] : '';
                      const isPrimaryKey = mergeStats && header === mergeStats.primaryKey;
                      
                      let cellClass = 'px-4 py-2 border-r border-slate-200 text-slate-700 font-medium';
                      if (isPrimaryKey) {
                        cellClass += ' font-bold text-shopee bg-shopee-light/30';
                      }

                      return (
                        <td key={header} className={cellClass}>
                          {row._isUpdated && header !== mergeStats?.primaryKey && (
                            <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" title="Diubah" />
                          )}
                          {row._isNew && (
                            <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500" title="Baris Baru" />
                          )}
                          {String(cellVal)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. Pagination Footer */}
      <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500" id="pagination-info">
          {filteredData.length > 0 ? (
            <span>
              Menampilkan <strong className="font-semibold text-slate-700">{startIndex + 1}</strong> sampai{' '}
              <strong className="font-semibold text-slate-700">{endIndex}</strong> dari{' '}
              <strong className="font-semibold text-slate-700">{filteredData.length}</strong> data
              {searchTerm && <span> (difilter dari {currentDataset.length})</span>}
            </span>
          ) : (
            <span>Menampilkan 0 data</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
            title="Halaman Pertama"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-semibold text-slate-600 flex items-center gap-1 transition-all"
          >
            Sebelumnya
          </button>

          <span className="text-xs text-slate-500 px-2">
            Halaman <strong className="font-semibold text-slate-800">{currentPage}</strong> dari{' '}
            <strong className="font-semibold text-slate-800">{totalPages}</strong>
          </span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-semibold text-slate-600 flex items-center gap-1 transition-all"
          >
            Selanjutnya
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-45 disabled:cursor-not-allowed transition-all"
            title="Halaman Terakhir"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}
