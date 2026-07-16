import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ArrowUpDown, RefreshCw, AlertCircle } from 'lucide-react';

// Firebase
import { db, auth } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, getDocFromServer, writeBatch, query, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { LogIn, LogOut, ShieldCheck, Mail, Lock, UserPlus, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
import { ActiveTab, DataRow, MergeStats, SyncHistoryLog } from './types';

// Components
import SettingsPanel from './components/SettingsPanel';
import StatusPanel from './components/StatusPanel';
import DataTable from './components/DataTable';
import SyncHistoryPanel from './components/SyncHistoryPanel';
import AlertModal, { AlertConfig } from './components/AlertModal';
import DashboardSummary from './components/DashboardSummary';

const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/1xYSjq2Ez_cJn3NcoBPTW873Fpzmo8IpqLyZxBDDKOm4/export?format=csv&gid=1378584398";
const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRlarbUs_XTv012lT8e5T4Psa3ull6LOz3VBeYkl9-ZFBP_ptMUER_b7vh8LzLc6c/exec";

// Helper to format SKU columns with 5-digit padding of leading zeros if numeric
const formatSkuValue = (val: any): string => {
  if (val === undefined || val === null) return '';
  let strVal = String(val).trim();
  if (strVal === '') return '';
  
  // Remove trailing .0 from float values parsed from excel or sheet
  if (strVal.endsWith('.0')) {
    strVal = strVal.slice(0, -2);
  }
  
  if (/^\d+$/.test(strVal)) {
    return strVal.padStart(5, '0');
  }
  return strVal;
};

export default function App() {
  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // URLs State (initialized from localStorage or defaults)
  const [csvUrl, setCsvUrl] = useState(() => {
    return localStorage.getItem('shopee_csv_url') || DEFAULT_CSV_URL;
  });
  const [appsScriptUrl, setAppsScriptUrl] = useState(() => {
    return localStorage.getItem('shopee_app_script_url') || DEFAULT_APPS_SCRIPT_URL;
  });

  // Sync Method State
  const [syncMethod, setSyncMethod] = useState<'firebase' | 'direct' | 'sheets_api'>('firebase');

  // Google OAuth Access Token (cached in-memory)
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  const extractSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const extractGid = (url: string): string | null => {
    const match = url.match(/[?&]gid=([0-9]+)/);
    return match ? match[1] : null;
  };

  const fetchSheetNameByGid = async (spreadsheetId: string, gid: string | null, accessToken: string): Promise<string> => {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Gagal mengambil metadata spreadsheet: ${res.statusText}`);
    }
    const data = await res.json();
    const sheets = data.sheets || [];
    
    if (gid) {
      const targetGid = parseInt(gid, 10);
      const found = sheets.find((s: any) => s.properties.sheetId === targetGid);
      if (found) {
        return found.properties.title;
      }
    }
    if (sheets.length > 0) {
      return sheets[0].properties.title;
    }
    return 'Sheet1';
  };

  const getOrRequestAccessToken = async (): Promise<string | null> => {
    if (googleAccessToken) return googleAccessToken;
    
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    try {
      setUpdateStatusText('Menghubungkan akun Google Anda...');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        return credential.accessToken;
      }
    } catch (err: any) {
      console.error('Failed to get Google Access Token:', err);
      throw new Error('Gagal menghubungkan Google: Harap izinkan popup dan berikan akses ke Google Sheets Anda.');
    }
    return null;
  };

  // Data States
  const [originalData, setOriginalData] = useState<DataRow[]>([]);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  
  const [excelData, setExcelData] = useState<DataRow[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  
  const [updatedData, setUpdatedData] = useState<DataRow[]>([]);
  const [updatedHeaders, setUpdatedHeaders] = useState<string[]>([]);

  // UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>('original');
  const [sheetStatus, setSheetStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [sheetErrorMsg, setSheetErrorMsg] = useState<string>('');
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(() => {
    return localStorage.getItem('lastExcelUpdateToSheet') || null;
  });

  // Action/Process States
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isUpdatingSheet, setIsUpdatingSheet] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatusText, setUpdateStatusText] = useState('');
  const [mergeStats, setMergeStats] = useState<MergeStats | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>(() => {
    return localStorage.getItem('shopee_uploaded_file_name') || '';
  });
  const [syncLogs, setSyncLogs] = useState<SyncHistoryLog[]>(() => {
    const saved = localStorage.getItem('shopee_sync_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const addSyncLog = useCallback(async (log: Omit<SyncHistoryLog, 'id' | 'timestamp'>) => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    const formattedTime = now.toLocaleDateString('id-ID', options).replace(/\./g, ':');
    
    const id = Math.random().toString(36).substring(2, 9);
    const newLog: SyncHistoryLog = {
      ...log,
      id,
      timestamp: formattedTime,
    };
    
    setSyncLogs((prev) => {
      const updated = [newLog, ...prev];
      localStorage.setItem('shopee_sync_logs', JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'sync_logs', id), newLog);
    } catch (e) {
      console.error('Failed to save sync log to Firestore:', e);
    }
  }, []);

  const handleClearLogs = async () => {
    localStorage.removeItem('shopee_sync_logs');
    setSyncLogs([]);
    try {
      const logsSnap = await getDocs(collection(db, 'sync_logs'));
      const batch = writeBatch(db);
      logsSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    } catch (e) {
      console.error('Failed to clear sync logs in Firestore:', e);
    }
  };

  // Custom Alert Modal State
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    isOpen: false,
    message: '',
    type: 'info',
    title: '',
  });

  // Alert Handler helper
  const showAlert = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info', title?: string) => {
    setAlertConfig({
      isOpen: true,
      message,
      type,
      title,
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Fetch data from Google Sheets (CSV)
  const fetchSheetData = useCallback((urlToFetch = csvUrl) => {
    setSheetStatus('loading');
    setOriginalData([]);
    setOriginalHeaders([]);
    
    Papa.parse(urlToFetch, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawRows = results.data as DataRow[];
        const headers = results.meta.fields || [];
        
        // Format Google Sheets SKU columns as well to keep everything perfectly synchronized and formatted
        const formattedRows = rawRows.map((row) => {
          const newRow: DataRow = {};
          for (const key in row) {
            const val = row[key];
            const keyLower = key.toString().trim().toLowerCase();
            if (keyLower.includes('sku')) {
              newRow[key] = formatSkuValue(val);
            } else {
              newRow[key] = val;
            }
          }
          return newRow;
        });
        
        setOriginalData(formattedRows);
        setOriginalHeaders(headers);
        setUpdatedHeaders(headers); // Set default update headers to match original
        setSheetStatus('success');
        setSheetErrorMsg('');
      },
      error: (err) => {
        console.error('Failed to fetch spreadsheet data:', err);
        setSheetStatus('error');
        setSheetErrorMsg(err.message || 'Gagal memuat spreadsheet. Periksa kembali apakah URL Anda valid.');
        showAlert(
          `Gagal menghubungkan Google Sheets:\n${err.message || 'Periksa apakah spreadsheet dipublikasikan dengan format CSV.'}`,
          'error',
          'Koneksi Gagal'
        );
      },
    });
  }, [csvUrl, showAlert]);

  // Load Sheet data, settings, and logs on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        // Fetch initial sheet data
        fetchSheetData();

        try {
          // Load settings from Firestore
          const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
          if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            if (data.csvUrl) {
              setCsvUrl(data.csvUrl);
              fetchSheetData(data.csvUrl); // refetch with accurate firebase values
            }
            if (data.appsScriptUrl) {
              setAppsScriptUrl(data.appsScriptUrl);
            }
            if (data.lastUpdateTime) {
              setLastUpdateTime(data.lastUpdateTime);
            }
          }

          // Load sync logs from Firestore
          const logsSnap = await getDocs(query(collection(db, 'sync_logs'), orderBy('timestamp', 'desc'), limit(50)));
          const loadedLogs: SyncHistoryLog[] = [];
          logsSnap.forEach((docSnap) => {
            loadedLogs.push(docSnap.data() as SyncHistoryLog);
          });
          if (loadedLogs.length > 0) {
            setSyncLogs(loadedLogs);
          }
        } catch (e) {
          console.warn('Gagal menyinkronkan data inisiasi dengan Firebase:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [fetchSheetData]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);

    try {
      if (authMode === 'signin') {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        showAlert('Berhasil masuk ke akun Anda!', 'success', 'Login Sukses');
      } else {
        await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        showAlert('Akun baru berhasil dibuat!', 'success', 'Pendaftaran Sukses');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errMsg = 'Terjadi kesalahan sistem, silakan coba lagi.';
      
      const contains = (code: string) => 
        (err.code && String(err.code).includes(code)) || 
        (err.message && String(err.message).includes(code));

      if (contains('wrong-password') || contains('user-not-found')) {
        errMsg = 'Email atau password salah.';
      } else if (contains('invalid-email')) {
        errMsg = 'Format email tidak valid.';
      } else if (contains('weak-password')) {
        errMsg = 'Password terlalu lemah (minimal 6 karakter).';
      } else if (contains('email-already-in-use')) {
        errMsg = 'Email ini sudah terdaftar. Silakan gunakan menu "Masuk" jika Anda sudah memiliki akun.';
      } else if (contains('invalid-credential')) {
        errMsg = 'Kredensial login salah atau tidak ditemukan. Harap periksa kembali email dan password Anda.';
      }
      setAuthError(errMsg);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setIsSubmittingAuth(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        setSyncMethod('sheets_api');
        showAlert('Berhasil masuk menggunakan akun Google & mengaktifkan mode Sinkronisasi API langsung!', 'success', 'Login Google Sukses');
      } else {
        showAlert('Berhasil masuk menggunakan akun Google, tetapi gagal mendapatkan izin menulis ke Google Sheets. Silakan coba masuk lagi jika Anda ingin melakukan sinkronisasi langsung.', 'warning', 'Login Google Terbatas');
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      let errMsg = 'Gagal masuk dengan akun Google.';
      
      const contains = (code: string) => 
        (err.code && String(err.code).includes(code)) || 
        (err.message && String(err.message).includes(code));

      if (contains('popup-closed-by-user')) {
        errMsg = 'Proses masuk dibatalkan karena jendela popup ditutup.';
      } else if (contains('popup-blocked')) {
        errMsg = 'Popup diblokir oleh browser. Harap izinkan popup untuk situs ini atau silakan klik tombol buka aplikasi di tab baru jika Anda berada di dalam iframe preview.';
      } else if (contains('unauthorized-domain')) {
        errMsg = 'Domain ini belum diizinkan untuk Autentikasi Google di Firebase Console Anda.';
      } else if (err.message) {
        errMsg = `Gagal login Google: ${err.message}`;
      }
      setAuthError(errMsg);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setGoogleAccessToken(null);
      // Reset states
      setOriginalData([]);
      setExcelData([]);
      setUpdatedData([]);
      showAlert('Berhasil keluar dari akun.', 'info', 'Logout');
    } catch (err) {
      console.error('Signout error:', err);
    }
  };

  // Handle URL changes
  const handleSaveSettings = async (newCsvUrl: string, newAppsScriptUrl: string) => {
    localStorage.setItem('shopee_csv_url', newCsvUrl);
    localStorage.setItem('shopee_app_script_url', newAppsScriptUrl);
    setCsvUrl(newCsvUrl);
    setAppsScriptUrl(newAppsScriptUrl);

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        csvUrl: newCsvUrl,
        appsScriptUrl: newAppsScriptUrl,
        lastUpdateTime: lastUpdateTime || ''
      }, { merge: true });
    } catch (e) {
      console.error('Failed to save settings to Firebase:', e);
    }
    
    // Instantly refetch with new URL
    fetchSheetData(newCsvUrl);
  };

  const handleResetSettings = async () => {
    localStorage.removeItem('shopee_csv_url');
    localStorage.removeItem('shopee_app_script_url');
    setCsvUrl(DEFAULT_CSV_URL);
    setAppsScriptUrl(DEFAULT_APPS_SCRIPT_URL);

    try {
      await setDoc(doc(db, 'settings', 'global'), {
        csvUrl: DEFAULT_CSV_URL,
        appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
      }, { merge: true });
    } catch (e) {
      console.error('Failed to reset settings in Firebase:', e);
    }
    
    // Instantly refetch with default URL
    fetchSheetData(DEFAULT_CSV_URL);
  };

  // Process selected file (Excel format)
  const handleFileSelect = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showAlert('Format file tidak sesuai! Mohon pilih file Excel dengan ekstensi .xlsx atau .xls.', 'error', 'Format File Salah');
      return;
    }

    if (originalData.length === 0) {
      showAlert('Data Google Sheets belum siap. Tunggu hingga proses memuat data selesai.', 'error', 'Koneksi Sheets Belum Siap');
      return;
    }

    setIsProcessingFile(true);
    setUploadedFileName(file.name);
    localStorage.setItem('shopee_uploaded_file_name', file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) throw new Error('File tidak dapat dibaca.');
        
        const dataArray = new Uint8Array(buffer as ArrayBuffer);
        const workbook = XLSX.read(dataArray, { type: 'array' });
        
        // Read first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Fetch raw values & formatted display texts (Dual-read)
        const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "", raw: true });
        const textData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "", raw: false });

        if (rawData.length === 0) {
          throw new Error('Data file Excel kosong.');
        }

        // Deep merge smart processor (protect codes/barcodes with leading zeros, huge identifier numbers, etc.)
        const initialSourceData = rawData.map((row, i) => {
          const newRow: Record<string, any> = {};
          
          for (const key in row) {
            const valRaw = row[key];
            const valText = textData[i] ? textData[i][key] : valRaw;
            
            if (typeof valRaw === 'number') {
              // If text version has '0' as starting prefix (e.g., barcode or SKU ID), use text formatting
              if (typeof valText === 'string' && valText.startsWith('0')) {
                newRow[key] = valText;
              } 
              // If large long identifier, keep precision using the display string
              else if (valRaw >= 1000000000) {
                newRow[key] = valText;
              } 
              // Standard value formatting
              else {
                newRow[key] = valRaw;
              }
            } else {
              newRow[key] = valRaw;
            }
          }
          return newRow;
        });

        // Normalize casing of Excel headers based on existing Google Sheets headers (case-insensitive & whitespace trimmed)
        const normalizedExcelData = initialSourceData.map((row) => {
          const newRow: Record<string, any> = {};
          
          for (const key in row) {
            const trimmedKey = key.toString().trim().toLowerCase();
            const matchedHeader = originalHeaders.find(
              (oh) => oh.toString().trim().toLowerCase() === trimmedKey
            );
            
            const targetHeader = matchedHeader || key;
            const targetKeyLower = targetHeader.toString().trim().toLowerCase();
            
            let finalVal = row[key];
            if (targetKeyLower.includes('sku')) {
              finalVal = formatSkuValue(finalVal);
            }
            
            newRow[targetHeader] = finalVal;
          }
          return newRow;
        });

        // Capture headers of uploaded file
        const uploadHeaders = Object.keys(normalizedExcelData[0] || {});
        setExcelData(normalizedExcelData);
        setExcelHeaders(uploadHeaders);

        // Find intersecting columns
        const matchingColumns = originalHeaders.filter((col) => uploadHeaders.includes(col));

        if (matchingColumns.length === 0) {
          throw new Error(
            'Tidak ditemukan nama kolom yang sama antara file Excel Anda dengan Google Sheets.\n\nHarap pastikan nama header kolom di baris pertama file Excel sama dengan Google Sheets.'
          );
        }

        // Determine Primary Identifier Key (look for variation_sku, variation, sku, barcode, code, kode, id, no, nomor, dsb.)
        const exactKeys = ['sku', 'barcode', 'code', 'kode', 'id', 'no', 'nomor'];
        const variationKeys = ['variation_sku', 'variation', 'variasi', 'varian'];
        const partialKeys = ['sku', 'barcode', 'code', 'kode', 'id'];
        let resolvedPrimaryKey = '';

        // 1. Try exact matches first
        for (const key of exactKeys) {
          const found = matchingColumns.find((c) => c.toLowerCase().trim() === key);
          if (found) {
            resolvedPrimaryKey = found;
            break;
          }
        }

        // 2. Try variation-specific keys next (extremely important for Shopee templates: variation SKU is unique, parent SKU is not)
        if (!resolvedPrimaryKey) {
          for (const key of variationKeys) {
            const found = matchingColumns.find((c) => c.toLowerCase().includes(key));
            if (found) {
              resolvedPrimaryKey = found;
              break;
            }
          }
        }

        // 3. Try other partial matches (e.g. et_title_parent_sku)
        if (!resolvedPrimaryKey) {
          for (const key of partialKeys) {
            const found = matchingColumns.find((c) => c.toLowerCase().includes(key));
            if (found) {
              resolvedPrimaryKey = found;
              break;
            }
          }
        }

        // Fallback: If no candidate, pick first matching column
        if (!resolvedPrimaryKey) {
          resolvedPrimaryKey = matchingColumns[0];
        }

        // Merge & Synchronize Logic
        const updatedRows: DataRow[] = JSON.parse(JSON.stringify(originalData));
        let rowsUpdatedCount = 0;
        let rowsAddedCount = 0;

        normalizedExcelData.forEach((excelRow) => {
          const keyVal = excelRow[resolvedPrimaryKey];
          if (keyVal === undefined || keyVal === null || keyVal === '') return;

          // Find row index where primary keys match (extremely robust comparison matching e.g. 7188 with 07188)
          const targetIndex = updatedRows.findIndex((r) => {
            const rawOriginal = r[resolvedPrimaryKey];
            const rawNew = keyVal;
            
            if (rawOriginal === undefined || rawOriginal === null) return false;

            let origStr = String(rawOriginal).trim();
            let newStr = String(rawNew).trim();

            if (origStr === newStr) return true;

            // Remove trailing .0 from floats
            if (origStr.endsWith('.0')) origStr = origStr.slice(0, -2);
            if (newStr.endsWith('.0')) newStr = newStr.slice(0, -2);

            if (origStr === newStr) return true;

            // Match numeric digits regardless of leading zero differences (e.g. 7188 matches 07188)
            const isOrigNum = /^\d+$/.test(origStr);
            const isNewNum = /^\d+$/.test(newStr);
            if (isOrigNum && isNewNum) {
              return parseInt(origStr, 10) === parseInt(newStr, 10);
            }

            // Fallback padded comparison
            const origPadded = isOrigNum ? origStr.padStart(5, '0') : origStr;
            const newPadded = isNewNum ? newStr.padStart(5, '0') : newStr;
            return origPadded === newPadded;
          });

          if (targetIndex !== -1) {
            let rowHasChanges = false;
            
            matchingColumns.forEach((col) => {
              if (excelRow[col] !== undefined && excelRow[col] !== null) {
                let origValStr = String(updatedRows[targetIndex][col] || '').trim();
                let newValStr = String(excelRow[col] || '').trim();

                if (origValStr.endsWith('.0')) origValStr = origValStr.slice(0, -2);
                if (newValStr.endsWith('.0')) newValStr = newValStr.slice(0, -2);

                // If value differs, overwrite with new Excel data (allows updating the SKU column itself to padded format!)
                if (origValStr !== newValStr) {
                  updatedRows[targetIndex][col] = excelRow[col];
                  updatedRows[targetIndex]._isUpdated = true;
                  rowHasChanges = true;
                }
              }
            });
            
            if (rowHasChanges) {
              rowsUpdatedCount++;
            }
          } else {
            // New record: populate all Google Sheets columns with empty strings initially
            const newRow: DataRow = {};
            originalHeaders.forEach((h) => (newRow[h] = ''));
            
            // Overwrite with matching Excel columns
            matchingColumns.forEach((col) => {
              if (excelRow[col] !== undefined) {
                newRow[col] = excelRow[col];
              }
            });
            
            newRow._isNew = true;
            updatedRows.push(newRow);
            rowsAddedCount++;
          }
        });

        // Set state values
        setUpdatedData(updatedRows);
        setMergeStats({
          primaryKey: resolvedPrimaryKey,
          matchingCols: matchingColumns,
          rowsUpdated: rowsUpdatedCount,
          rowsAdded: rowsAddedCount,
        });

        setIsProcessingFile(false);
        setActiveTab('updated');
        
        showAlert(
          `Pratinjau Sinkronisasi Berhasil!\n\nIdentifikator Kunci: "${resolvedPrimaryKey}"\nKolom Terbaca: ${matchingColumns.length} Kolom\nData Diperbarui: ${rowsUpdatedCount} Baris\nData Baru Ditambahkan: ${rowsAddedCount} Baris\n\nSilakan periksa lembar pratinjau "Data Diperbarui". Klik tombol "Update Data ke Sheets" untuk menyimpan secara permanen.`,
          'info',
          'Analisis File Selesai'
        );
      } catch (err: any) {
        console.error('Error processing Excel file:', err);
        setIsProcessingFile(false);
        showAlert(err.message || 'Terjadi kesalahan tidak dikenal saat mengurai file Excel.', 'error', 'Gagal Memproses File');
      }
    };

    reader.onerror = () => {
      setIsProcessingFile(false);
      showAlert('Gagal membaca file Excel. File mungkin rusak atau dikunci oleh program lain.', 'error', 'File Gagal Dibaca');
    };

    reader.readAsArrayBuffer(file);
  };

  // Perform permanent synchronization to Google Sheets using Apps Script Web App Endpoint
  const handleUpdateToSheets = async () => {
    if (excelData.length === 0) return;

    if (syncMethod !== 'sheets_api' && appsScriptUrl === DEFAULT_APPS_SCRIPT_URL && appsScriptUrl.includes('MASUKKAN_URL_WEB_APP')) {
      showAlert('URL Google Apps Script Anda belum dikonfigurasi. Harap sesuaikan di panel pengaturan.', 'error', 'URL Belum Ditentukan');
      return;
    }

    setIsUpdatingSheet(true);
    setUpdateProgress(0);

    if (syncMethod === 'sheets_api') {
      try {
        setUpdateStatusText('Menghubungkan ke Google...');
        setUpdateProgress(10);
        
        const token = await getOrRequestAccessToken();
        if (!token) {
          throw new Error('Gagal mendapatkan Token Akses Google. Pastikan Anda telah mengizinkan popup.');
        }

        setUpdateStatusText('Menganalisis URL spreadsheet...');
        setUpdateProgress(25);
        const spreadsheetId = extractSpreadsheetId(csvUrl);
        const gid = extractGid(csvUrl);

        if (!spreadsheetId) {
          throw new Error('Format URL Google Sheets tidak valid. Silakan periksa kolom URL di Pengaturan.');
        }

        setUpdateStatusText('Mengambil nama sheet/tab...');
        setUpdateProgress(40);
        const sheetName = await fetchSheetNameByGid(spreadsheetId, gid, token);

        setUpdateStatusText(`Mengosongkan data lama di tab "${sheetName}"...`);
        setUpdateProgress(60);
        
        // Clear range to prevent leftover rows
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:ZZZ:clear`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        setUpdateStatusText(`Menulis data baru ke tab "${sheetName}"...`);
        setUpdateProgress(80);

        // Map updatedData to 2D values array matching originalHeaders
        const headers = originalHeaders.length > 0 ? originalHeaders : updatedHeaders;
        if (headers.length === 0) {
          throw new Error('Tidak ada kolom header yang terdeteksi untuk ditulis.');
        }

        const rows2D = [
          headers,
          ...updatedData.map((row) => headers.map((h) => {
            const val = row[h];
            return val !== undefined && val !== null ? val : '';
          }))
        ];

        const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            range: `${sheetName}!A1`,
            majorDimension: 'ROWS',
            values: rows2D,
          }),
        });

        if (!writeRes.ok) {
          const errData = await writeRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gagal menulis ke Google Sheets: ${writeRes.statusText}`);
        }

        setUpdateProgress(100);
        setUpdateStatusText('Google Sheets API Sync Berhasil!');

        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        };
        const formattedTime = now.toLocaleDateString('id-ID', options).replace(/\./g, ':');

        localStorage.setItem('lastExcelUpdateToSheet', formattedTime);
        setLastUpdateTime(formattedTime);

        // Update Firebase settings global with last updated time
        await setDoc(doc(db, 'settings', 'global'), { lastUpdateTime: formattedTime }, { merge: true }).catch(() => {});

        addSyncLog({
          rowsUpdated: mergeStats?.rowsUpdated || 0,
          rowsAdded: mergeStats?.rowsAdded || 0,
          fileName: uploadedFileName || 'Excel Upload',
          status: 'success'
        });

        setTimeout(() => {
          setIsUpdatingSheet(false);
          showAlert(
            `Sinkronisasi Google Sheets API berhasil! ${mergeStats?.rowsUpdated || 0} baris diperbarui, ${mergeStats?.rowsAdded || 0} baris ditambahkan ke sheet "${sheetName}".`,
            'success',
            'Sync API Sukses'
          );
          fetchSheetData();
        }, 600);

      } catch (err: any) {
        setIsUpdatingSheet(false);
        console.error('Error in Sheets API sync:', err);
        
        addSyncLog({
          rowsUpdated: 0,
          rowsAdded: 0,
          fileName: uploadedFileName || 'Excel Upload',
          status: 'failed',
          errorMsg: err.message || 'Sheets API sync failed'
        });

        showAlert(
          `Gagal Sinkronisasi via API Google Sheets:\n${err.message || 'Silakan coba lagi.'}`,
          'error',
          'Sheets API Sync Gagal'
        );
      }
    } else if (syncMethod === 'firebase') {
      setUpdateStatusText('Menyiapkan koneksi Firebase...');
      try {
        const total = updatedData.length;
        const primaryKey = mergeStats?.primaryKey || 'sku';
        
        // Write to Firestore in batches of 100
        const batchSize = 100;
        let index = 0;
        
        while (index < total) {
          const chunk = updatedData.slice(index, index + batchSize);
          const batch = writeBatch(db);
          
          chunk.forEach((item) => {
            const idVal = String(item[primaryKey] || '').trim();
            if (!idVal) return;
            
            // Clean id to avoid invalid Firestore document path chars
            const cleanedId = idVal.replace(/[\/.\s#]/g, '_');
            const docRef = doc(db, 'products', cleanedId);
            
            const docData: Record<string, any> = {};
            for (const key in item) {
              if (!key.startsWith('_')) {
                docData[key] = item[key] !== undefined ? item[key] : '';
              }
            }
            
            docData.id = idVal;
            docData.lastUpdated = new Date().toISOString();
            docData.syncStatus = item._isNew ? 'new' : (item._isUpdated ? 'updated' : 'unmodified');
            
            batch.set(docRef, docData, { merge: true });
          });
          
          await batch.commit();
          index += batchSize;
          
          const progressPercent = Math.min(80, Math.round((index / total) * 80));
          setUpdateProgress(progressPercent);
          setUpdateStatusText(`Menyimpan ke Firebase Firestore (${Math.min(total, index)}/${total})...`);
        }

        setUpdateStatusText('Memicu Google Sheets untuk menarik data dari Firebase...');
        setUpdateProgress(85);

        // Send a ping to the Apps Script with the action to pull from Firebase
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'sync_from_firestore',
            projectId: 'database-online-750f1',
            databaseId: 'ai-studio-updatedatashopee-6a862ffc-f666-402f-a72b-4d31388e1eec'
          }),
        });

        const result = await response.json();
        
        if (result.status === 'success' || result.status === 'ok') {
          setUpdateProgress(100);
          setUpdateStatusText('Firebase Sync Berhasil!');

          const now = new Date();
          const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          };
          const formattedTime = now.toLocaleDateString('id-ID', options).replace(/\./g, ':');

          localStorage.setItem('lastExcelUpdateToSheet', formattedTime);
          setLastUpdateTime(formattedTime);

          // Update Firebase settings global with last updated time
          await setDoc(doc(db, 'settings', 'global'), { lastUpdateTime: formattedTime }, { merge: true }).catch(() => {});

          addSyncLog({
            rowsUpdated: mergeStats?.rowsUpdated || 0,
            rowsAdded: mergeStats?.rowsAdded || 0,
            fileName: uploadedFileName || 'Excel Upload',
            status: 'success'
          });

          setTimeout(() => {
            setIsUpdatingSheet(false);
            showAlert(
              result.message || 'Pembaruan data produk berhasil disimpan ke Firebase dan ditarik ke Google Sheets!',
              'success',
              'Firebase Sync Sukses'
            );
            fetchSheetData();
          }, 600);
        } else {
          throw new Error(result.message || 'Apps Script gagal menarik data dari Firebase.');
        }

      } catch (err: any) {
        setIsUpdatingSheet(false);
        console.error('Error in Firebase sync:', err);
        
        addSyncLog({
          rowsUpdated: 0,
          rowsAdded: 0,
          fileName: uploadedFileName || 'Excel Upload',
          status: 'failed',
          errorMsg: err.message || 'Firebase sync failed'
        });

        showAlert(
          `Firebase Sync Gagal:\n${err.message || 'Harap periksa kecocokan data Anda atau Apps Script URL Anda.'}`,
          'error',
          'Firebase Sync Gagal'
        );
      }
    } else {
      // Legacy Direct payload POST
      setUpdateStatusText('Menghubungkan ke server Apps Script...');
      let simProgress = 0;
      const progressInterval = setInterval(() => {
        let remaining = 95 - simProgress;
        let randIncrement = Math.max(0.5, Math.random() * remaining * 0.12);
        simProgress += randIncrement;

        if (simProgress >= 95) simProgress = 95;
        setUpdateProgress(simProgress);

        if (simProgress < 30) {
          setUpdateStatusText('Mentransfer data produk Shopee...');
        } else if (simProgress < 65) {
          setUpdateStatusText('Mencocokkan barcode dan memperbarui stok...');
        } else {
          setUpdateStatusText('Menulis perubahan ke Google Sheets...');
        }
      }, 500);

      try {
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ data: excelData }),
        });

        const result = await response.json();
        clearInterval(progressInterval);

        if (result.status === 'success' || result.status === 'ok') {
          setUpdateProgress(100);
          setUpdateStatusText('Sinkronisasi Berhasil!');

          const now = new Date();
          const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          };
          const formattedTime = now.toLocaleDateString('id-ID', options).replace(/\./g, ':');

          localStorage.setItem('lastExcelUpdateToSheet', formattedTime);
          setLastUpdateTime(formattedTime);

          // Update Firebase settings global with last updated time
          await setDoc(doc(db, 'settings', 'global'), { lastUpdateTime: formattedTime }, { merge: true }).catch(() => {});

          addSyncLog({
            rowsUpdated: mergeStats?.rowsUpdated || 0,
            rowsAdded: mergeStats?.rowsAdded || 0,
            fileName: uploadedFileName || 'Excel Upload',
            status: 'success'
          });

          setTimeout(() => {
            setIsUpdatingSheet(false);
            showAlert(
              result.message || 'Pembaruan data produk berhasil diterapkan ke Google Sheets Anda secara langsung!',
              'success',
              'Sinkronisasi Sukses'
            );
            fetchSheetData();
          }, 600);
        } else {
          throw new Error(result.message || 'Server mengembalikan respons kegagalan.');
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        setIsUpdatingSheet(false);
        console.error('Error syncing to Google Sheets:', err);
        
        addSyncLog({
          rowsUpdated: 0,
          rowsAdded: 0,
          fileName: uploadedFileName || 'Excel Upload',
          status: 'failed',
          errorMsg: err.message || 'Koneksi terputus atau respon error'
        });

        showAlert(
          `Gagal menyimpan data ke Google Sheets:\n${err.message || 'Harap periksa koneksi internet Anda atau validasi URL Apps Script Anda.'}`,
          'error',
          'Sinkronisasi Gagal'
        );
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-shopee border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-600 animate-pulse">Menghubungkan ke Firebase...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-shopee/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-shopee/5 rounded-full blur-3xl"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden z-10"
        >
          {/* Header area */}
          <div className="bg-shopee p-8 text-white relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white text-shopee rounded-xl flex items-center justify-center font-black text-xl shadow-md">S</div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight">Shopee Sync Portal</h2>
                <p className="text-xs text-white/85 mt-0.5 font-medium">Masuk untuk mengelola & menyinkronkan data produk</p>
              </div>
            </div>
            <ShieldCheck className="absolute top-8 right-8 w-12 h-12 text-white/10" />
          </div>

          <div className="p-8">
            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200/50 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setAuthError('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none ${
                  authMode === 'signin'
                    ? 'bg-white text-shopee shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 focus:outline-none ${
                  authMode === 'signup'
                    ? 'bg-white text-shopee shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Daftar Baru
              </button>
            </div>

            {authError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-start gap-2.5 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </motion.div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 px-1">Email Anda</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-shopee focus:bg-white focus:ring-4 focus:ring-shopee/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1 px-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-xs font-semibold placeholder-slate-400 focus:outline-none focus:border-shopee focus:bg-white focus:ring-4 focus:ring-shopee/10 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-3 bg-shopee hover:bg-shopee-hover text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-shopee/15 hover:shadow-lg flex items-center justify-center gap-2 focus:outline-none disabled:opacity-50"
              >
                {isSubmittingAuth ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {authMode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {authMode === 'signin' ? 'Masuk ke Dashboard' : 'Buat Akun Baru'}
                  </>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider">
                <span className="bg-white px-3 text-slate-400">Atau masuk dengan</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={isSubmittingAuth}
              type="button"
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:opacity-50"
            >
              <div className="flex items-center tracking-normal font-black text-[13px]">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
              </div>
              <span className="text-slate-600 font-extrabold ml-1">Masuk dengan Google</span>
            </button>

            {/* Quick Demo Credentials Help */}
            {authMode === 'signin' && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-start gap-3">
                  <Key className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Gunakan Akun Demo (Praktis):</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Silakan klik tombol di bawah untuk langsung mengisi data login demo.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailInput('admin@shopee-sync.com');
                        setPasswordInput('shopee123');
                        setAuthError('');
                      }}
                      className="mt-2.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-xl text-[11px] font-bold transition-all border border-amber-500/10"
                    >
                      Isi Otomatis Kredensial Demo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
        
        <p className="text-[11px] text-slate-400 mt-6 z-10 font-medium">
          Diberdayakan oleh sistem autentikasi Firebase yang aman & andal
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-30">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-shopee rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">S</div>
          <div className="h-6 w-px bg-slate-200"></div>
          <span className="font-semibold text-slate-800 text-base md:text-lg tracking-tight">Seller Centre</span>
          <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-500 font-bold uppercase rounded-md tracking-wider hidden sm:inline-block">
            ShopeeBalist Sync v1.2.0
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-xs text-slate-400 font-mono hidden md:flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Sesi Aman (Firebase): <span className="font-semibold text-slate-600">{user.email}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500/10"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col p-4 shrink-0 justify-between gap-6 z-20">
          <div className="space-y-6">
            <nav className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Pengaturan Produk</div>
              <button
                onClick={() => setActiveTab('original')}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-semibold text-left transition-all text-xs ${
                  activeTab === 'original'
                    ? 'bg-shopee-light text-shopee'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                  <path d="M3 9h18M9 21V9M15 21V9"></path>
                </svg>
                <span>Produk Saya ({originalData.length})</span>
              </button>
              
              <button
                onClick={() => {
                  if (excelData.length > 0) {
                    setActiveTab('updated');
                  } else {
                    showAlert('Harap unggah file Excel produk terlebih dahulu untuk membuka pratinjau pembaruan.', 'info', 'Panduan Unggah');
                  }
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-semibold text-left transition-all text-xs ${
                  activeTab === 'updated'
                    ? 'bg-shopee-light text-shopee'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
                </svg>
                <span>Update Produk {updatedData.length > 0 ? `(${updatedData.length})` : ''}</span>
              </button>
            </nav>

            <div className="border-t border-slate-100 pt-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Status Hub</div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Google Sheets:</span>
                  <span className={`font-semibold ${sheetStatus === 'success' ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {sheetStatus === 'success' ? 'Terhubung' : 'Memuat'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Excel Upload:</span>
                  <span className={`font-semibold ${excelData.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {excelData.length > 0 ? `${excelData.length} baris` : 'Kosong'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:mt-auto border-t border-slate-100 pt-4 hidden lg:block">
            <div className="bg-shopee-light/50 p-4 rounded-xl border border-shopee/10">
              <p className="text-xs text-shopee font-bold">Tips Sinkronisasi</p>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Sistem ini mencocokkan barcode otomatis. Pastikan nama kolom Excel sesuai dengan Google Sheets.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Workspace Frame */}
        <main className="flex-1 flex flex-col bg-[#f5f5f5] overflow-x-hidden p-6 md:p-8 space-y-6">
          {/* Breadcrumbs & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 pb-1">
            <div>
              <div className="flex items-center text-xs text-slate-500 space-x-2">
                <span>Produk Saya</span>
                <span>/</span>
                <span className="text-slate-800 font-semibold">Update Produk</span>
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                Update Informasi Produk Shopee
              </h1>
            </div>
            
            {/* Sync Status Button or Refresh Button */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={() => fetchSheetData()}
                disabled={sheetStatus === 'loading'}
                className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-all shadow-sm focus:outline-none"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sheetStatus === 'loading' ? 'animate-spin text-shopee' : 'text-slate-500'}`} />
                Muat Ulang Sheets
              </button>
            </div>
          </div>

          {/* Settings collapsible Panel */}
          <SettingsPanel
            csvUrl={csvUrl}
            appsScriptUrl={appsScriptUrl}
            onSave={handleSaveSettings}
            onReset={handleResetSettings}
          />

          {/* Dashboard Summary Cards */}
          <DashboardSummary
            originalData={originalData}
            excelData={excelData}
            updatedData={updatedData}
            mergeStats={mergeStats}
          />

          {/* Modular Grid Area for status and tables */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            {/* Status, upload and action block */}
            <div className="lg:col-span-1 space-y-6">
              <StatusPanel
                sheetStatus={sheetStatus}
                sheetErrorMsg={sheetErrorMsg}
                rowCount={originalData.length}
                colCount={originalHeaders.length}
                lastUpdateTime={lastUpdateTime}
                onFileSelect={handleFileSelect}
                isProcessingFile={isProcessingFile}
                isUpdatingSheet={isUpdatingSheet}
                updateProgress={updateProgress}
                updateStatusText={updateStatusText}
              />
              <SyncHistoryPanel
                logs={syncLogs}
                onClearLogs={handleClearLogs}
              />
            </div>

            {/* Table pratinjau block */}
            <div className="lg:col-span-3">
              <DataTable
                originalData={originalData}
                originalHeaders={originalHeaders}
                excelData={excelData}
                excelHeaders={excelHeaders}
                updatedData={updatedData}
                updatedHeaders={updatedHeaders}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                mergeStats={mergeStats}
                onUpdateToSheets={handleUpdateToSheets}
                isUpdatingSheet={isUpdatingSheet}
                syncMethod={syncMethod}
                setSyncMethod={setSyncMethod}
              />
            </div>

          </div>
        </main>
      </div>

      {/* Elegant Custom Alert Modal */}
      <AlertModal config={alertConfig} onClose={closeAlert} />
    </div>
  );
}
