import { GoogleGenerativeAI } from "@google/generative-ai";
import * as Speech from 'expo-speech';
import { GEMINI_API_KEY } from '../config/keys';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Detect language based on character ranges (Simple heuristic)
 */
export const detectLanguage = (text) => {
    if (!text) return 'en';
    // Remove bolding before detection
    const cleanText = text.replace(/\*\*/g, '');
    if (/[\u0B80-\u0BFF]/.test(cleanText)) return 'ta'; // Tamil
    if (/[\u0900-\u097F]/.test(cleanText)) return 'hi'; // Hindi
    return 'en';
};

/**
 * Chat with Gemini using history and context with retry logic
 */
export const askGeminiWithContext = async (userInput, context, history = [], retryCount = 0) => {
    try {
        // Gemini SDK requires history to start with 'user' role.
        // If our first message is 'model' (like the initial summary), we filter it out for the API call.
        let sanitizedHistory = history;
        if (history.length > 0 && history[0].role === 'model') {
            sanitizedHistory = history.slice(1);
        }

        const chat = model.startChat({
            history: sanitizedHistory,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // Truncate context to ~30,000 chars (~10k tokens) to stay within free tier
        const truncatedContext = context ? context.substring(0, 30000) : "None";

        const systemInstruction = `You are a helpful AI assistant for the Drivedrop app.
        Current Context from file: ${truncatedContext}
        
        RULES:
        1. Use the file context to answer questions.
        2. If the user asks in Tamil (தமிழ்), respond in Tamil.
        3. If the user asks in Hindi (हिन्दी), respond in Hindi.
        4. Use **bolding** for important terms.
        5. Keep responses concise and fast.`;

        const prompt = `${systemInstruction}\n\nClient Input: ${userInput}`;

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini API Error:", error);

        // Handle 429 (Too Many Requests) with retry
        if (error.status === 429 || error.message?.includes('429') && retryCount < 2) {
            console.log(`Rate limited. Retrying in ${retryCount + 1}s...`);
            await sleep(1000 * (retryCount + 1));
            return askGeminiWithContext(userInput, context, history, retryCount + 1);
        }

        throw new Error(error.status === 429 ? "QUOTA_EXCEEDED" : "Failed to get response from Gemini AI");
    }
};

/**
 * Generate a comprehensive audio overview of the file content in a specific language
 */
export const generateAudioOverview = async (language, context, retryCount = 0) => {
    try {
        const langMap = {
            'en': 'English',
            'ta': 'Tamil',
            'hi': 'Hindi'
        };
        const langName = langMap[language] || 'English';
        const truncatedContext = context ? context.substring(0, 30000) : "None";

        const prompt = `Provide a comprehensive, engaging "Audio Overview" summary of the following document in ${langName} language. 
        It should sound like a natural verbal briefing. 
        Keep it professional yet conversational.
        
        CONTEXT:
        ${truncatedContext}`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Audio Overview Error:", error);

        if (error.status === 429 || error.message?.includes('429') && retryCount < 1) {
            await sleep(2000);
            return generateAudioOverview(language, context, retryCount + 1);
        }

        throw new Error(error.status === 429 ? "QUOTA_EXCEEDED" : "Failed to generate audio overview");
    }
};

/**
 * Read text aloud using Expo Speech with language support
 */
export const speakText = (text, langCode = 'en', onDone) => {
    const voiceMap = {
        'en': 'en-US',
        'ta': 'ta-IN',
        'hi': 'hi-IN'
    };

    Speech.speak(text, {
        language: voiceMap[langCode] || 'en-US',
        pitch: 1.0,
        rate: 1.0,
        onDone: onDone,
        onStopped: onDone,
        onError: onDone
    });
};

/**
 * Stop any currently playing speech
 */
export const stopSpeaking = () => {
    Speech.stop();
};
