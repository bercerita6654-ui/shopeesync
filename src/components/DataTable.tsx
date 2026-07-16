import React, { useState, useMemo } from 'react';
import { Table, Search, ChevronLeft, ChevronRight, CloudUpload, Info, ArrowRight, Sparkles } from 'lucide-react';
import { ActiveTab, DataRow, MergeStats } from '../types';

// Helper to classify column colors based on standard Shopee CSV templates
const getHeaderStyle = (header: string) => {
  const h = header.toLowerCase();
  
  // 1. Identifiers / Codes (Product ID, Variation ID, etc.)
  if (h.includes('id') || h === 'kode' || h.includes('kode_produk') || h.includes('kode_variasi') || h.includes('product_id') || h.includes('variation_id') || h.includes('model_id')) {
    return {
      bg: 'bg-blue-50/90 text-blue-900 border-blue-200/70',
      badge: 'bg-blue-100 text-blue-800 border border-blue-200/50',
      text: 'text-blue-900 font-mono text-[11px] font-semibold bg-blue-50/40 px-1.5 py-0.5 rounded border border-blue-100/50',
      label: 'ID/Kode'
    };
  }
  
  // 2. SKUs (Parent SKU, Variation SKU)
  if (h.includes('sku') || h === 'induk' || h === 'variasi' || h.includes('parent_sku') || h.includes('variation_sku')) {
    return {
      bg: 'bg-amber-50/90 text-amber-900 border-amber-200/70',
      badge: 'bg-amber-100 text-amber-800 border border-amber-200/50',
      text: 'text-amber-900 font-mono text-[11px] font-bold bg-amber-50/40 px-1.5 py-0.5 rounded border border-amber-100/50',
      label: 'SKU'
    };
  }
  
  // 3. Price (Variation Price, Harga)
  if (h.includes('price') || h.includes('harga') || h.includes('price_val') || h.includes('pricing') || h.includes('harga_variasi')) {
    return {
      bg: 'bg-emerald-50/90 text-emerald-900 border-emerald-200/70',
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200/50',
      text: 'text-emerald-900 font-bold bg-emerald-50/40 px-1.5 py-0.5 rounded border border-emerald-100/50 font-mono text-xs',
      label: 'Harga'
    };
  }
  
  // 4. Stock / Qty (Variation Stock, Qty, Stok)
  if (h.includes('stock') || h.includes('stok') || h.includes('qty') || h.includes('stok_variasi') || h.includes('stok_induk')) {
    return {
      bg: 'bg-orange-50/90 text-orange-900 border-orange-200/70',
      badge: 'bg-orange-100 text-orange-800 border border-orange-200/50',
      text: 'text-orange-900 font-extrabold bg-orange-50/50 px-2 py-0.5 rounded border border-orange-200/50 font-mono text-xs',
      label: 'Stok'
    };
  }

  // 5. Names (Product Name, Variation Name, Nama)
  if (h.includes('name') || h.includes('nama') || h.includes('title') || h.includes('judul') || h.includes('deskripsi') || h.includes('description')) {
    return {
      bg: 'bg-violet-50/90 text-violet-900 border-violet-200/70',
      badge: 'bg-violet-100 text-violet-800 border border-violet-200/50',
      text: 'text-slate-800 font-semibold text-xs',
      label: 'Nama'
    };
  }

  // Default Column Styling
  return {
    bg: 'bg-slate-50/90 text-slate-700 border-slate-200',
    badge: 'bg-slate-100 text-slate-600 border border-slate-200/50',
    text: 'text-slate-600 font-medium text-xs',
    label: 'Lainnya'
  };
};

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
  const [hideTemplateRows, setHideTemplateRows] = useState(true);
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

  // Map row positions so we can uniquely display their original spreadsheet index
  const datasetWithIndices = useMemo(() => {
    return currentDataset.map((row, idx) => ({
      ...row,
      _originalIndex: idx + 1
    }));
  }, [currentDataset]);

  // Handle Search Filtering & Template Row Hiding
  const filteredData = useMemo(() => {
    let data = datasetWithIndices;

    if (hideTemplateRows) {
      data = data.filter((row) => {
        const rowNum = row._originalIndex;
        return rowNum !== 1 && rowNum !== 3 && rowNum !== 4 && rowNum !== 5;
      });
    }

    if (!searchTerm.trim()) return data;
    const lowerSearch = searchTerm.toLowerCase();
    
    return data.filter((row) => {
      return Object.entries(row).some(([key, val]) => {
        if (key === '_originalIndex') return false;
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(lowerSearch);
      });
    });
  }, [datasetWithIndices, searchTerm, hideTemplateRows]);

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

  // Helper to normalize values for comparison matching
  const getNormalizedKey = (val: any): string => {
    if (val === undefined || val === null) return '';
    let valStr = String(val).trim();
    if (valStr.endsWith('.0')) valStr = valStr.slice(0, -2);
    if (/^\d+$/.test(valStr)) {
      return parseInt(valStr, 10).toString();
    }
    return valStr;
  };

  // Pre-computed lookup map for extremely fast O(1) matching of original rows
  const originalDataMap = useMemo(() => {
    const map = new Map<string, DataRow>();
    const pkField = mergeStats?.primaryKey;
    if (!pkField || originalData.length === 0) return map;

    originalData.forEach((row) => {
      const val = row[pkField];
      const normKey = getNormalizedKey(val);
      if (normKey) {
        map.set(normKey, row);
      }
    });
    return map;
  }, [originalData, mergeStats]);

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
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200/50 text-xs font-bold">
              <span>⚡ Google Sheets API</span>
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
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 px-5 pt-3 pb-3 gap-4 bg-white">
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

        {/* Controls: Hide Template and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Hide Shopee Template Rows Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 px-3.5 py-1.5 rounded-xl cursor-pointer select-none transition-all">
            <input
              type="checkbox"
              checked={hideTemplateRows}
              onChange={(e) => setHideTemplateRows(e.target.checked)}
              className="rounded border-slate-300 text-shopee focus:ring-shopee/20 focus:ring-2 accent-shopee w-4.5 h-4.5"
            />
            <span>Sembunyikan Baris Template (1, 3, 4, 5)</span>
          </label>

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
      </div>

      {/* Skema Warna Kolom Legend Bar */}
      <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-medium text-slate-500">
        <span className="text-slate-400 font-bold uppercase tracking-wider">Skema Warna Kolom:</span>
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50/80 text-blue-800 border border-blue-200/40 rounded-md">
          <span className="w-2 h-2 rounded bg-blue-500"></span>
          <span>ID / Kode</span>
        </span>
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50/80 text-amber-800 border border-amber-200/40 rounded-md">
          <span className="w-2 h-2 rounded bg-amber-500"></span>
          <span>SKU</span>
        </span>
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50/80 text-violet-800 border border-violet-200/40 rounded-md">
          <span className="w-2 h-2 rounded bg-violet-500"></span>
          <span>Nama</span>
        </span>
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50/80 text-emerald-800 border border-emerald-200/40 rounded-md">
          <span className="w-2 h-2 rounded bg-emerald-500"></span>
          <span>Harga</span>
        </span>
        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-50/80 text-orange-800 border border-orange-200/40 rounded-md">
          <span className="w-2 h-2 rounded bg-orange-500"></span>
          <span>Stok</span>
        </span>
      </div>

      {/* 4. Table Scroll Container */}
      <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/20">
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
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap table-auto border-t border-l border-slate-300">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 shadow-[0_2px_4px_rgba(0,0,0,0.04)]">
              <tr>
                <th className="px-4 py-3 text-slate-500 font-bold bg-slate-100 border-b border-r border-slate-300 w-14 text-center sticky left-0 z-20 shadow-[1px_0_0_0_#cbd5e1] text-[10px] uppercase tracking-wider">
                  #
                </th>
                {currentHeaders.map((header) => {
                  const style = getHeaderStyle(header);
                  return (
                    <th
                      key={header}
                      className={`px-4 py-3 font-bold border-b-2 border-r border-slate-300 text-xs transition-all ${style.bg}`}
                      style={{ minWidth: header.toLowerCase().includes('name') || header.toLowerCase().includes('nama') ? '250px' : '150px' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="whitespace-nowrap" title={header}>{header}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide opacity-90 scale-95 origin-right select-none ${style.badge}`}>
                          {style.label}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="bg-white divide-y divide-slate-100">
              {paginatedData.map((row, index) => {
                let trClass = 'hover:bg-slate-50 transition-colors duration-150';
                let numCellClass = 'px-4 py-2 text-slate-400 border-r border-b border-slate-300 text-center sticky left-0 z-10 shadow-[1px_0_0_0_#cbd5e1] font-semibold text-xs';
                
                if (row._isUpdated) {
                  trClass = 'bg-emerald-50/40 hover:bg-emerald-50/80 duration-150';
                  numCellClass += ' bg-emerald-100/40 text-emerald-800';
                } else if (row._isNew) {
                  trClass = 'bg-blue-50/40 hover:bg-blue-50/80 duration-150';
                  numCellClass += ' bg-blue-100/40 text-blue-800';
                } else {
                  numCellClass += ' bg-white';
                }

                return (
                  <tr key={index} className={trClass}>
                    {/* Index Counter Cell */}
                    <td className={numCellClass}>
                      <span>{row._originalIndex !== undefined ? row._originalIndex : startIndex + index + 1}</span>
                    </td>

                    {/* Data Cells */}
                    {currentHeaders.map((header) => {
                      const cellVal = row[header] !== undefined && row[header] !== null ? row[header] : '';
                      const isPrimaryKey = mergeStats && header === mergeStats.primaryKey;
                      const colStyle = getHeaderStyle(header);
                      
                      let cellClass = 'px-4 py-2 border-r border-b border-slate-300 text-slate-700 font-medium transition-all duration-150';
                      let isCellChanged = false;
                      let originalCellValue = '';

                      const pkField = mergeStats?.primaryKey;

                      if (activeTab === 'updated' && row._isUpdated && pkField && header !== pkField) {
                        const rowKeyVal = row[pkField];
                        const normKey = getNormalizedKey(rowKeyVal);
                        const originalRow = originalDataMap.get(normKey);

                        if (originalRow) {
                          let origValStr = String(originalRow[header] || '').trim();
                          let newValStr = String(row[header] || '').trim();

                          if (origValStr.endsWith('.0')) origValStr = origValStr.slice(0, -2);
                          if (newValStr.endsWith('.0')) newValStr = newValStr.slice(0, -2);

                          if (origValStr !== newValStr) {
                            isCellChanged = true;
                            originalCellValue = originalRow[header] !== undefined && originalRow[header] !== null ? String(originalRow[header]) : '';
                            cellClass = 'px-4 py-2.5 border-r border-b border-slate-300 bg-emerald-50 text-slate-900 font-semibold transition-all duration-150';
                          }
                        }
                      }

                      return (
                        <td 
                          key={header} 
                          className={`${cellClass} ${isPrimaryKey ? 'bg-shopee-light/10 text-shopee border-r-shopee/10 font-bold' : ''}`}
                        >
                          {isCellChanged ? (
                            <div className="flex flex-col py-0.5">
                              <span className="text-emerald-950 font-bold flex items-center gap-1.5">
                                <span className={colStyle.text}>{String(cellVal) || <em className="text-slate-400 font-normal">(kosong)</em>}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-600 text-[8px] text-white rounded font-bold uppercase tracking-wider select-none">
                                  Ubah
                                </span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-normal mt-0.5">
                                Semula: <span className="line-through decoration-slate-300 font-mono bg-white px-1.5 py-0.5 border border-slate-300 rounded">{originalCellValue || '(kosong)'}</span>
                              </span>
                            </div>
                          ) : row._isNew ? (
                            <div className="flex flex-col py-0.5">
                              <span className="text-blue-950 font-semibold flex items-center gap-1.5">
                                <span className={colStyle.text}>{String(cellVal) || <em className="text-slate-400 font-normal">(kosong)</em>}</span>
                                {header === pkField && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-600 text-[8px] text-white rounded font-bold uppercase tracking-wider select-none">
                                    Baru
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="py-0.5 flex items-center">
                              {activeTab === 'updated' && row._isUpdated && header === pkField && (
                                <span className="mr-1.5 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Baris memiliki pembaruan" />
                              )}
                              <span className={`${colStyle.text} whitespace-nowrap`} title={String(cellVal)}>
                                {String(cellVal)}
                              </span>
                            </div>
                          )}
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
