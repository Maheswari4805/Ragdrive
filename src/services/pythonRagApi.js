/**
 * Service to connect the Expo app to the Python RAG Backend
 */

// Replace with your local IP address if testing on a physical device (e.g., 'http://192.168.1.5:8000')
const PYTHON_BACKEND_URL = 'https://ragdrive-backend.onrender.com';

/**
 * Chat with Python RAG Backend
 */
export const askPythonRag = async (fileId, fileName, mimeType, accessToken, query, history = []) => {
    try {
        const response = await fetch(`${PYTHON_BACKEND_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: fileId,
                file_name: fileName,
                mime_type: mimeType,
                access_token: accessToken,
                query: query,
                history: history
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Python backend error');
        }

        const data = await response.json();
        return data.answer;
    } catch (error) {
        console.error("Python RAG Error:", error);
        throw error;
    }
};

/**
 * Check if the Python backend is reachable
 */
export const checkBackendHealth = async () => {
    try {
        const response = await fetch(PYTHON_BACKEND_URL, { timeout: 2000 });
        return response.ok;
    } catch (e) {
        return false;
    }
};
