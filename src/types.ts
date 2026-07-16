export type ActiveTab = 'original' | 'excel' | 'updated';

export interface DataRow extends Record<string, any> {
  _isUpdated?: boolean;
  _isNew?: boolean;
}

export interface MergeStats {
  primaryKey: string;
  matchingCols: string[];
  rowsUpdated: number;
  rowsAdded: number;
}

export interface SyncHistoryLog {
  id: string;
  timestamp: string;
  rowsUpdated: number;
  rowsAdded: number;
  fileName?: string;
  status: 'success' | 'failed';
  errorMsg?: string;
}

