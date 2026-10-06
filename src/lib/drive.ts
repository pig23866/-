import { DriveAttachment } from '../types';
import { getAccessToken } from './auth';

export interface GoogleDriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
}

export async function fetchDriveFiles(searchQuery?: string): Promise<GoogleDriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('未登入 Google 帳號或存取憑證已過期');
  }

  let q = 'trashed = false';
  if (searchQuery && searchQuery.trim()) {
    const escaped = searchQuery.replace(/'/g, "\\'");
    q += ` and (name contains '${escaped}')`;
  }

  const fields = 'files(id,name,mimeType,webViewLink,iconLink,thumbnailLink,size,modifiedTime)';
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=30&orderBy=modifiedTime desc&q=${encodeURIComponent(
    q
  )}&fields=${encodeURIComponent(fields)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Drive fetch error:', errorText);
    throw new Error(`存取 Google 雲端硬碟失敗 (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

export async function uploadFileToDrive(
  file: File,
  folderId?: string
): Promise<DriveAttachment> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('未登入 Google 帳號或存取憑證已過期');
  }

  const metadata: Record<string, any> = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const fileBytes = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    fileBytes.set(chunk, offset);
    offset += chunk.length;
  }

  const encoder = new TextEncoder();
  const headerPart = encoder.encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata
    )}\r\n${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
  );
  const footerPart = encoder.encode(closeDelimiter);

  const totalLength = headerPart.length + fileBytes.length + footerPart.length;
  const combined = new Uint8Array(totalLength);
  combined.set(headerPart, 0);
  combined.set(fileBytes, headerPart.length);
  combined.set(footerPart, headerPart.length + fileBytes.length);

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,iconLink,thumbnailLink,size';

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: combined,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`上傳檔案到 Google 雲端失敗: ${err}`);
  }

  const uploadedData = await response.json();
  return {
    id: uploadedData.id,
    name: uploadedData.name,
    mimeType: uploadedData.mimeType,
    webViewLink: uploadedData.webViewLink || `https://drive.google.com/file/d/${uploadedData.id}/view`,
    iconLink: uploadedData.iconLink,
    thumbnailLink: uploadedData.thumbnailLink,
    size: uploadedData.size ? `${Math.round(parseInt(uploadedData.size, 10) / 1024)} KB` : undefined,
  };
}
