import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Upload,
  FileText,
  Check,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  HardDrive,
  FolderOpen,
} from 'lucide-react';
import { DriveAttachment } from '../types';
import { fetchDriveFiles, uploadFileToDrive, GoogleDriveFileItem } from '../lib/drive';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ConfirmationModal } from './ConfirmationModal';

interface DrivePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (attachment: DriveAttachment) => void;
  isAuthenticated: boolean;
  onSignIn: () => Promise<void>;
  isSigningIn: boolean;
}

export const DrivePickerModal: React.FC<DrivePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
  isAuthenticated,
  onSignIn,
  isSigningIn,
}) => {
  const [files, setFiles] = useState<GoogleDriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Manual link state
  const [manualName, setManualName] = useState('');
  const [manualLink, setManualLink] = useState('');

  const loadFiles = async (query?: string) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchDriveFiles(query);
      setFiles(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '無法取得雲端硬碟檔案列表');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadFiles();
    }
  }, [isOpen, isAuthenticated]);

  if (!isOpen) return null;

  const handleFileSelect = (item: GoogleDriveFileItem) => {
    const attachment: DriveAttachment = {
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      webViewLink: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
      iconLink: item.iconLink,
      thumbnailLink: item.thumbnailLink,
      size: item.size ? `${Math.round(parseInt(item.size, 10) / 1024)} KB` : undefined,
    };
    onSelectFile(attachment);
    onClose();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPendingUploadFile(e.target.files[0]);
      setShowUploadConfirm(true);
      // Reset input value so same file can be chosen again
      e.target.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingUploadFile) return;
    setShowUploadConfirm(false);
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await uploadFileToDrive(pendingUploadFile);
      onSelectFile(uploaded);
      onClose();
    } catch (err: any) {
      setError(err.message || '上傳失敗');
    } finally {
      setIsUploading(false);
      setPendingUploadFile(null);
    }
  };

  const handleAddManualLink = () => {
    if (!manualName.trim() || !manualLink.trim()) return;
    onSelectFile({
      id: `manual-${Date.now()}`,
      name: manualName.trim(),
      mimeType: 'application/octet-stream',
      webViewLink: manualLink.startsWith('http') ? manualLink : `https://${manualLink}`,
    });
    onClose();
  };

  const getMimeIcon = (mimeType: string) => {
    if (mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation')) return '📑';
    if (mimeType.includes('document')) return '📝';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    return '📄';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        id="drive-picker-modal"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">選擇或上傳 Google 雲端硬碟檔案</h3>
              <p className="text-xs text-slate-500">連結作業草稿、報告簡報、實驗數據或參考講義</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!isAuthenticated ? (
            <div className="text-center py-10 px-4 bg-blue-50/40 border border-blue-100 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 mx-auto flex items-center justify-center mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">尚未連結 Google 帳號</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 mb-5">
                透過 Google 雲端硬碟授權，您可以直接挑選 Google Docs、投影片或上傳作業檔案。
              </p>
              <div className="inline-block">
                <GoogleSignInButton onClick={onSignIn} isLoading={isSigningIn} />
              </div>

              {/* Manual Link Alternative */}
              <div className="mt-8 pt-6 border-t border-slate-200/60 text-left">
                <p className="text-xs font-semibold text-slate-700 mb-2">或直接手動貼上雲端共享連結：</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="檔案名稱 (例如：化學實驗筆記.pdf)"
                    className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={manualLink}
                      onChange={(e) => setManualLink(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualLink}
                      disabled={!manualName.trim() || !manualLink.trim()}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl shrink-0 cursor-pointer"
                    >
                      新增連結
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Actions row: Search & Upload */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadFiles(searchQuery)}
                    placeholder="在 Google 雲端硬碟搜尋檔案..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => loadFiles(searchQuery)}
                    disabled={loading}
                    className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                    title="重新整理"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl shadow-2xs cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>上傳至雲端硬碟</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </label>
                </div>
              </div>

              {isUploading && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <span>正在上傳檔案至您的 Google 雲端硬碟，請稍候...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* File list */}
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                  載入雲端硬碟檔案中...
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  查無檔案，您可以搜尋其他關鍵字或點擊上方按鈕上傳檔案。
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto pr-1">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => handleFileSelect(file)}
                      className="py-2.5 px-3 hover:bg-blue-50/70 rounded-xl transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0">{getMimeIcon(file.mimeType)}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">
                            {file.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {file.size ? `${Math.round(parseInt(file.size, 10) / 1024)} KB • ` : ''}
                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-white group-hover:bg-blue-600 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-blue-600 rounded-lg text-xs font-medium shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>選擇附件</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>

      {/* Upload Confirmation Modal (Mandatory as per Workspace skill) */}
      <ConfirmationModal
        isOpen={showUploadConfirm}
        title="確認上傳至 Google 雲端硬碟？"
        message={`您即將將本機檔案「${pendingUploadFile?.name}」上傳至您的 Google 雲端硬碟帳號中，以便作為此作業的繳交或參考附件。`}
        confirmLabel="確認上傳"
        cancelLabel="取消"
        onConfirm={handleConfirmUpload}
        onCancel={() => {
          setShowUploadConfirm(false);
          setPendingUploadFile(null);
        }}
      />
    </div>
  );
};
