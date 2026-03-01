const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

const makeRequest = async (url, accessToken, options = {}) => {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Drive API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Drive API Error:', error);
        throw error;
    }
};

// List files from Google Drive
export const listFiles = async (accessToken, {
    pageSize = 20,
    pageToken = null,
    query = null,
    orderBy = 'modifiedTime desc',
    folderId = null,
} = {}) => {
    const params = new URLSearchParams({
        pageSize: pageSize.toString(),
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, iconLink, thumbnailLink, webViewLink, parents, starred)',
        orderBy,
    });

    let q = 'trashed = false';
    if (folderId) {
        q += ` and '${folderId}' in parents`;
    }
    if (query) {
        q += ` and ${query}`;
    }
    params.set('q', q);

    if (pageToken) {
        params.set('pageToken', pageToken);
    }

    return makeRequest(`${DRIVE_API_BASE}/files?${params}`, accessToken);
};

// Get recently modified files
export const getRecentFiles = async (accessToken, limit = 10) => {
    return listFiles(accessToken, {
        pageSize: limit,
        orderBy: 'viewedByMeTime desc,modifiedTime desc',
    });
};

// Search files
export const searchFiles = async (accessToken, searchTerm) => {
    return listFiles(accessToken, {
        query: `name contains '${searchTerm}'`,
        pageSize: 30,
    });
};

// Upload a file to Google Drive
export const uploadFile = async (accessToken, fileUri, fileName, mimeType, folderId = null) => {
    const metadata = {
        name: fileName,
        mimeType: mimeType,
    };

    if (folderId) {
        metadata.parents = [folderId];
    }

    // For simple upload, use multipart
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType,
    });

    try {
        const response = await fetch(
            `${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,size,iconLink,thumbnailLink,webViewLink`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Upload failed');
        }

        return await response.json();
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
};

// Create a new folder
export const createFolder = async (accessToken, folderName, parentFolderId = null) => {
    const metadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentFolderId) {
        metadata.parents = [parentFolderId];
    }

    return makeRequest(`${DRIVE_API_BASE}/files`, accessToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
    });
};

// Download file info
export const getFileInfo = async (accessToken, fileId) => {
    return makeRequest(
        `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,modifiedTime,size,iconLink,thumbnailLink,webViewLink,parents`,
        accessToken
    );
};

// Fetch raw content or exported text from a file
export const fetchFileContent = async (accessToken, fileId, mimeType) => {
    try {
        let url = `${DRIVE_API_BASE}/files/${fileId}`;

        // If it's a Google Doc/Sheet/Slide, we must export it rather than download directly
        if (mimeType.includes('application/vnd.google-apps')) {
            // For Documents, export as plain text
            if (mimeType === 'application/vnd.google-apps.document') {
                url += '/export?mimeType=text/plain';
            }
            // For Presentations or Spreadsheets, it's harder to get raw text easily via export without parsing PDF/CSV.
            // We'll fallback to text/plain if supported by Google.
            else {
                url += '/export?mimeType=text/plain';
            }
        } else {
            // For normal files like .txt, .md, .csv etc, we download the media
            url += '?alt=media';
        }

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            console.warn(`Failed to extract text from file ${fileId}. Status: ${response.status}. Error: ${errorMsg}`);
            return null; // Don't throw, just return null so the chat can say "No context available"
        }

        const text = await response.text();
        return text;
    } catch (error) {
        console.error('File content fetch error:', error);
        return null;
    }
};

// Get storage quota info
export const getStorageQuota = async (accessToken) => {
    return makeRequest(
        `${DRIVE_API_BASE}/about?fields=storageQuota,user`,
        accessToken
    );
};

// Delete a file
export const deleteFile = async (accessToken, fileId) => {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Failed to delete file');
    }

    return true;
};

// Get file icon based on mime type
export const getFileIcon = (mimeType) => {
    if (!mimeType) return { name: 'insert-drive-file', color: '#5f6368' };

    const iconMap = {
        'application/vnd.google-apps.folder': { name: 'folder', color: '#f5ba13' },
        'application/vnd.google-apps.document': { name: 'description', color: '#4285f4' },
        'application/vnd.google-apps.spreadsheet': { name: 'grid-on', color: '#0f9d58' },
        'application/vnd.google-apps.presentation': { name: 'slideshow', color: '#f4b400' },
        'application/pdf': { name: 'picture-as-pdf', color: '#ea4335' },
        'image/': { name: 'image', color: '#7b1fa2' },
        'video/': { name: 'videocam', color: '#ea4335' },
        'audio/': { name: 'audiotrack', color: '#f4b400' },
        'text/': { name: 'article', color: '#4285f4' },
        'application/zip': { name: 'folder-zip', color: '#5f6368' },
    };

    for (const [key, value] of Object.entries(iconMap)) {
        if (mimeType.startsWith(key)) return value;
    }

    return { name: 'insert-drive-file', color: '#5f6368' };
};

// Format file size
export const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(parseInt(bytes)) / Math.log(1024));
    return `${(parseInt(bytes) / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

// Format date
export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'long' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
};
