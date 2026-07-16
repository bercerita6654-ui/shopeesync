import React, { useState } from 'react';
import { Settings, HelpCircle, RotateCcw, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsPanelProps {
  csvUrl: string;
  appsScriptUrl: string;
  onSave: (csvUrl: string, appsScriptUrl: string) => void;
  onReset: () => void;
}

export default function SettingsPanel({
  csvUrl: initialCsvUrl,
  appsScriptUrl: initialAppsScriptUrl,
  onSave,
  onReset,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [csvUrl, setCsvUrl] = useState(initialCsvUrl);
  const [appsScriptUrl, setAppsScriptUrl] = useState(initialAppsScriptUrl);
  const [isSavedMessage, setIsSavedMessage] = useState(false);

  // Sync state if props change (e.g. on Reset)
  React.useEffect(() => {
    setCsvUrl(initialCsvUrl);
    setAppsScriptUrl(initialAppsScriptUrl);
  }, [initialCsvUrl, initialAppsScriptUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(csvUrl.trim(), appsScriptUrl.trim());
    setIsSavedMessage(true);
    setTimeout(() => {
      setIsSavedMessage(false);
    }, 2000);
  };

  const handleResetClick = () => {
    onReset();
    setIsSavedMessage(true);
    setTimeout(() => {
      setIsSavedMessage(false);
    }, 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm md:text-base">Pengaturan Integrasi</h3>
            <p className="text-xs text-slate-500">Konfigurasi tautan Google Sheets & Apps Script</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Content wrapper with smooth animation */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
              {/* CSV URL Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  URL Ekspor CSV Google Sheets
                  <span className="group relative cursor-pointer">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-60 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-30 leading-normal font-normal">
                      URL dari "Publikasikan ke web" dalam format CSV agar data dapat dibaca oleh aplikasi.
                    </span>
                  </span>
                </label>
                <input
                  type="text"
                  value={csvUrl}
                  onChange={(e) => setCsvUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-shopee/20 focus:border-shopee text-xs transition-all"
                  required
                />
              </div>

              {/* Apps Script Web App URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  URL Web App Google Apps Script
                  <span className="group relative cursor-pointer">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-60 hidden group-hover:block bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-30 leading-normal font-normal">
                      URL Web App hasil deployment Google Apps Script Anda untuk memproses POST update data.
                    </span>
                  </span>
                </label>
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-shopee/20 focus:border-shopee text-xs transition-all"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={handleResetClick}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors py-1 px-2 rounded-lg hover:bg-slate-50 focus:outline-none"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Default
                </button>

                <div className="flex items-center gap-2">
                  {isSavedMessage && (
                    <span className="text-xs text-emerald-600 font-medium animate-pulse">
                      Tersimpan!
                    </span>
                  )}
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-shopee hover:bg-shopee-hover text-white font-medium text-xs px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow transition-all focus:outline-none"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>

            {/* Guide section */}
            <div className="p-5 border-t border-slate-100 bg-slate-50/50">
              <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                ⚡ Petunjuk Integrasi Google Apps Script (Metode Firebase Sync)
              </h4>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Untuk sinkronisasi yang sangat akurat dan terhindar dari batas ukuran data / timeout browser, gunakan kode Apps Script di bawah ini pada Google Sheets Anda. Script ini akan secara otomatis menarik data terbaru yang aman disimpan di database Firebase Firestore Anda.
              </p>
              
              <div className="relative bg-slate-900 rounded-xl overflow-hidden p-4 border border-slate-800 font-mono text-[11px] text-slate-300">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <span className="text-slate-500">Google Apps Script Code</span>
                  <button
                    type="button"
                    onClick={() => {
                      const codeText = `// Copy of Apps Script with Firebase Pull Sync
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Check if we are doing a Firebase Pull Sync
    if (payload.action === "sync_from_firestore" || payload.action === "sync_from_firebase") {
      return handleFirebasePullSync(sheet, payload);
    }
    
    // Fallback: Direct payload sync
    var data = payload.data;
    if (!data || data.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Payload data kosong atau tidak valid"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return updateSheetData(sheet, data);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleFirebasePullSync(sheet, payload) {
  var projectId = payload.projectId || "database-online-750f1";
  var databaseId = payload.databaseId || "ai-studio-updatedatashopee-6a862ffc-f666-402f-a72b-4d31388e1eec";
  
  // Fetch from Firestore REST API
  var collectionUrl = "https://firestore.googleapis.com/v1/projects/" + projectId + "/databases/" + databaseId + "/documents/products?pageSize=1000";
  
  var response = UrlFetchApp.fetch(collectionUrl, {
    method: "get",
    muteHttpExceptions: true,
    headers: {
      "Content-Type": "application/json"
    }
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error("Gagal mengambil data dari Firestore: " + response.getContentText());
  }
  
  var result = JSON.parse(response.getContentText());
  var documents = result.documents || [];
  
  if (documents.length === 0) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Tidak ada produk ditemukan di Firestore"
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Parse documents into flat objects
  var products = [];
  for (var i = 0; i < documents.length; i++) {
    var doc = documents[i];
    var fields = doc.fields;
    var item = {};
    for (var key in fields) {
      var fieldVal = fields[key];
      if (fieldVal.stringValue !== undefined) {
        item[key] = fieldVal.stringValue;
      } else if (fieldVal.integerValue !== undefined) {
        item[key] = parseInt(fieldVal.integerValue, 10);
      } else if (fieldVal.doubleValue !== undefined) {
        item[key] = parseFloat(fieldVal.doubleValue);
      } else if (fieldVal.booleanValue !== undefined) {
        item[key] = fieldVal.booleanValue;
      } else {
        item[key] = JSON.stringify(fieldVal);
      }
    }
    products.push(item);
  }
  
  return updateSheetData(sheet, products);
}

function updateSheetData(sheet, data) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  var colMap = {};
  for (var c = 0; c < headers.length; c++) {
    colMap[headers[c].toString().trim()] = c;
  }
  
  var exactKeys = ["sku", "barcode", "code", "kode", "id", "no", "nomor"];
  var variationKeys = ["variation_sku", "variation", "variasi", "varian"];
  var partialKeys = ["sku", "barcode", "code", "kode", "id"];
  var resolvedPrimaryKey = "";
  
  for (var k = 0; k < exactKeys.length; k++) {
    for (var col in colMap) {
      if (col.toLowerCase() === exactKeys[k]) {
        resolvedPrimaryKey = col;
        break;
      }
    }
    if (resolvedPrimaryKey) break;
  }
  
  if (!resolvedPrimaryKey) {
    for (var k = 0; k < variationKeys.length; k++) {
      for (var col in colMap) {
        if (col.toLowerCase().indexOf(variationKeys[k]) !== -1) {
          resolvedPrimaryKey = col;
          break;
        }
      }
      if (resolvedPrimaryKey) break;
    }
  }
  
  if (!resolvedPrimaryKey) {
    for (var k = 0; k < partialKeys.length; k++) {
      for (var col in colMap) {
        if (col.toLowerCase().indexOf(partialKeys[k]) !== -1) {
          resolvedPrimaryKey = col;
          break;
        }
      }
      if (resolvedPrimaryKey) break;
    }
  }
  
  if (!resolvedPrimaryKey) {
    resolvedPrimaryKey = headers[0];
  }
  
  var keyColIndex = colMap[resolvedPrimaryKey];
  
  var lastRow = sheet.getLastRow();
  var sheetValues = [];
  if (lastRow > 1) {
    sheetValues = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  }
  
  var updatedCount = 0;
  var addedCount = 0;
  
  var sheetRowsByKey = {};
  for (var r = 0; r < sheetValues.length; r++) {
    var rawKey = sheetValues[r][keyColIndex];
    if (rawKey !== undefined && rawKey !== null && rawKey !== "") {
      var normalizedKey = String(rawKey).trim();
      if (normalizedKey.endsWith(".0")) normalizedKey = normalizedKey.slice(0, -2);
      sheetRowsByKey[normalizedKey] = {
        rowIndex: r + 2,
        rowValues: sheetValues[r]
      };
    }
  }
  
  var newRowsToAppend = [];
  
  for (var i = 0; i < data.length; i++) {
    var incomingItem = data[i];
    var incomingKeyVal = incomingItem[resolvedPrimaryKey];
    if (incomingKeyVal === undefined || incomingKeyVal === null || incomingKeyVal === "") continue;
    
    var normalizedIncomingKey = String(incomingKeyVal).trim();
    if (normalizedIncomingKey.endsWith(".0")) normalizedIncomingKey = normalizedIncomingKey.slice(0, -2);
    
    var existingRowInfo = sheetRowsByKey[normalizedIncomingKey];
    
    if (existingRowInfo) {
      var rowRange = sheet.getRange(existingRowInfo.rowIndex, 1, 1, headers.length);
      var currentValues = existingRowInfo.rowValues;
      var hasChanges = false;
      
      for (var colName in incomingItem) {
        var colIdx = colMap[colName];
        if (colIdx !== undefined) {
          var val = incomingItem[colName];
          if (val !== undefined && val !== null) {
            var strVal = String(val).trim();
            var currentStrVal = String(currentValues[colIdx]).trim();
            if (strVal.endsWith(".0")) strVal = strVal.slice(0, -2);
            if (currentStrVal.endsWith(".0")) currentStrVal = currentStrVal.slice(0, -2);
            
            if (strVal !== currentStrVal) {
              currentValues[colIdx] = val;
              hasChanges = true;
            }
          }
        }
      }
      
      if (hasChanges) {
        rowRange.setValues([currentValues]);
        updatedCount++;
      }
    } else {
      var newRowValues = [];
      for (var c = 0; c < headers.length; c++) {
        var colName = headers[c];
        newRowValues.push(incomingItem[colName] !== undefined ? incomingItem[colName] : "");
      }
      newRowsToAppend.push(newRowValues);
      addedCount++;
    }
  }
  
  if (newRowsToAppend.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRowsToAppend.length, headers.length).setValues(newRowsToAppend);
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    message: "Berhasil sinkronisasi dari Firebase Firestore! Diperbarui: " + updatedCount + " baris, Ditambahkan: " + addedCount + " baris."
  })).setMimeType(ContentService.MimeType.JSON);
}`;
                      navigator.clipboard.writeText(codeText);
                      alert('Kode Google Apps Script disalin ke papan klip!');
                    }}
                    className="px-2.5 py-1 bg-shopee hover:bg-shopee-hover text-white rounded font-semibold text-[10px] transition-colors"
                  >
                    Salin Kode Script
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto whitespace-pre select-all text-slate-400">
                  {`function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (payload.action === "sync_from_firestore") {
      return handleFirebasePullSync(sheet, payload);
    }
    return updateSheetData(sheet, payload.data);
  } ...`}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
