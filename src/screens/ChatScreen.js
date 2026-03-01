import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    SafeAreaView,
    Clipboard,
    Modal,
    Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { fetchFileContent } from '../services/driveApi';
import { askGeminiWithContext, speakText, stopSpeaking, generateAudioOverview, detectLanguage } from '../services/geminiApi';
import { askPythonRag, checkBackendHealth } from '../services/pythonRagApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHATS_STORAGE_KEY = '@recent_chats';
const { width } = Dimensions.get('window');

const getEmojiForMime = (mime) => {
    if (mime?.includes('pdf')) return '📜';
    if (mime?.includes('presentation') || mime?.includes('powerpoint')) return '📊';
    if (mime?.includes('document') || mime?.includes('word')) return '📄';
    if (mime?.includes('spreadsheet') || mime?.includes('excel')) return '📉';
    if (mime?.includes('image')) return '🖼️';
    return '📝';
};

// Component to handle bold text parsing (**text**)
const ParsedText = ({ text, style }) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
        <Text style={style}>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <Text key={index} style={{ fontWeight: 'bold' }}>
                            {part.slice(2, -2)}
                        </Text>
                    );
                }
                return part;
            })}
        </Text>
    );
};

const ChatScreen = ({ route, navigation }) => {
    const { fileId, fileName, mimeType } = route.params;
    const { accessToken } = useAuth();

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(true);
    const [isGeneratingOverview, setIsGeneratingOverview] = useState(false);
    const [fileContext, setFileContext] = useState('');
    const [isSpeakingMessageId, setIsSpeakingMessageId] = useState(null);
    const [isSpeakingOverview, setIsSpeakingOverview] = useState(false);
    const [showLangModal, setShowLangModal] = useState(false);
    const [usePythonBackend, setUsePythonBackend] = useState(false);
    const flatListRef = useRef(null);

    // Initial load: fetch file content and generate a fast summary
    useEffect(() => {
        const initializeChat = async () => {
            try {
                // Check if Python Backend is available
                const isBackendAvailable = await checkBackendHealth();
                setUsePythonBackend(isBackendAvailable);

                let summaryText = "";

                if (isBackendAvailable) {
                    console.log("Using Python RAG Backend");
                    summaryText = await askPythonRag(fileId, fileName, mimeType, accessToken, "Summarize this file in 3 sentences.");
                } else {
                    const content = await fetchFileContent(accessToken, fileId, mimeType, fileName);
                    setFileContext(content || "");

                    // Concise prompt to save tokens (429 prevention)
                    const initialPrompt = `Summarize text: "${fileName}". 3 lines max. Use **bold**.`;
                    summaryText = await askGeminiWithContext(initialPrompt, content || "", []);
                }

                const initialMessage = {
                    id: 'init-' + Date.now().toString(),
                    text: summaryText,
                    sender: 'bot',
                    timestamp: new Date()
                };

                setMessages([initialMessage]);
                saveChatToHistory(initialMessage.text);

            } catch (error) {
                console.error("Failed to initialize chat:", error);
                let text = `I had trouble reading "${fileName}", but I'm ready to chat!`;
                if (error.message === 'QUOTA_EXCEEDED') {
                    text = "The AI is busy (quota reached). Please wait a few seconds and ask a question!";
                }
                const errorMsg = {
                    id: 'err-' + Date.now().toString(),
                    text,
                    sender: 'bot',
                    timestamp: new Date()
                };
                setMessages([errorMsg]);
            } finally {
                setIsProcessing(false);
            }
        };

        initializeChat();
        return () => stopSpeaking();
    }, []);

    const saveChatToHistory = async (summaryText) => {
        try {
            const currentHistoryJson = await AsyncStorage.getItem(CHATS_STORAGE_KEY);
            let history = currentHistoryJson ? JSON.parse(currentHistoryJson) : [];
            history = history.filter(chat => chat.fileId !== fileId);
            history.unshift({
                fileId,
                fileName,
                mimeType,
                lastMessage: summaryText.substring(0, 100),
                timestamp: new Date().toISOString()
            });
            if (history.length > 20) history = history.slice(0, 20);
            await AsyncStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(history));
        } catch (e) { console.error(e); }
    };

    const handleSend = async () => {
        if (!inputText.trim() || isProcessing) return;

        const userText = inputText.trim();
        setInputText('');

        const userMsg = {
            id: 'u-' + Date.now().toString(),
            text: userText,
            sender: 'user',
            timestamp: new Date()
        };

        const chatHistory = messages.map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        }));

        setMessages(prev => [...prev, userMsg]);
        setIsProcessing(true);

        try {
            let aiResponse = "";
            if (usePythonBackend) {
                aiResponse = await askPythonRag(fileId, fileName, mimeType, accessToken, userText, chatHistory);
            } else {
                aiResponse = await askGeminiWithContext(userText, fileContext, chatHistory);
            }
            const botMsg = {
                id: 'b-' + (Date.now() + 1).toString(),
                text: aiResponse,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            saveChatToHistory(aiResponse);
        } catch (error) {
            console.error('Chat error:', error);
            if (error.message === 'QUOTA_EXCEEDED') {
                Alert.alert("Busy", "The AI is at its limit. Please wait 15-20 seconds and try again.");
            } else {
                Alert.alert("Error", "Gemini failed to respond. Check your connection.");
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleSpeech = (msgId, text) => {
        if (isSpeakingMessageId === msgId) {
            stopSpeaking();
            setIsSpeakingMessageId(null);
        } else {
            stopSpeaking();
            setIsSpeakingOverview(false);
            setIsSpeakingMessageId(msgId);
            const lang = detectLanguage(text);
            speakText(text, lang, () => setIsSpeakingMessageId(null));
        }
    };

    const handleAudioOverview = async (lang) => {
        setShowLangModal(false);
        setIsGeneratingOverview(true);
        try {
            const overview = await generateAudioOverview(lang, fileContext);
            stopSpeaking();
            setIsSpeakingMessageId(null);
            setIsSpeakingOverview(true);
            speakText(overview, lang, () => setIsSpeakingOverview(false));

            // Optionally add the overview to the chat
            const overviewMsg = {
                id: 'ov-' + Date.now().toString(),
                text: `**Audio Overview (${lang.toUpperCase()}):**\n\n${overview}`,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, overviewMsg]);
        } catch (error) {
            Alert.alert("Error", "Could not generate audio overview.");
        } finally {
            setIsGeneratingOverview(false);
        }
    };

    const copyToClipboard = (text) => {
        Clipboard.setString(text);
        // Minimal feedback could be added here if desired
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={styles.messageRow}>
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                    <ParsedText text={item.text} style={[styles.messageText, isUser ? styles.userText : styles.botText]} />
                </View>
                {!isUser && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity onPress={() => copyToClipboard(item.text.replace(/\*\*/g, ''))} style={styles.actionIcon}>
                            <MaterialIcons name="content-copy" size={20} color="#5f6368" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon}>
                            <MaterialIcons name="thumb-up-off-alt" size={20} color="#5f6368" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionIcon}>
                            <MaterialIcons name="thumb-down-off-alt" size={20} color="#5f6368" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleSpeech(item.id, item.text)} style={styles.actionIcon}>
                            <MaterialIcons name={isSpeakingMessageId === item.id ? "volume-off" : "volume-up"} size={20} color="#5f6368" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderHeader = () => (
        <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderEmoji}>{getEmojiForMime(mimeType)}</Text>
            <Text style={styles.chatHeaderTitle}>{fileName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.chatHeaderSource}>1 source</Text>
                {usePythonBackend && (
                    <View style={styles.ragBadge}>
                        <Text style={styles.ragBadgeText}>Python RAG v2</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Toolbar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#1f1f1f" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{fileName}</Text>
                <TouchableOpacity style={styles.moreBtn}>
                    <MaterialIcons name="more-vert" size={24} color="#1f1f1f" />
                </TouchableOpacity>
            </View>

            {/* Chat List */}
            {isProcessing && messages.length === 0 ? (
                <View style={styles.loadingContainer}>
                    {renderHeader()}
                    <ActivityIndicator size="large" color="#1f1f1f" style={{ marginTop: 40 }} />
                    <Text style={styles.loadingText}>Reading file and generating summary...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={styles.chatList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}

            {/* Bottom Section */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.bottomConfig}>
                    {/* Audio Overview Button */}
                    <TouchableOpacity
                        style={styles.audioOverviewBtn}
                        onPress={() => isSpeakingOverview ? (stopSpeaking(), setIsSpeakingOverview(false)) : setShowLangModal(true)}
                        disabled={isGeneratingOverview}
                    >
                        {isGeneratingOverview ? <ActivityIndicator size="small" color="#1f1f1f" /> : (
                            <>
                                <MaterialIcons name={isSpeakingOverview ? "stop" : "waves"} size={22} color="#6750a4" />
                                <Text style={styles.audioOverviewText}>
                                    {isSpeakingOverview ? "Stop Overview" : "Audio Overview"}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Input Bar */}
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.textInput}
                            placeholder="Ask 1 source..."
                            placeholderTextColor="#5f6368"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <View style={styles.sourcePill}>
                            <MaterialIcons name="folder-open" size={16} color="#1f1f1f" />
                            <Text style={styles.sourcePillText}>1</Text>
                            <MaterialIcons name="arrow-drop-down" size={16} color="#1f1f1f" />
                        </View>
                        {inputText.trim().length > 0 && (
                            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                                <MaterialIcons name="send" size={24} color="#1f1f1f" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Tab Navigation */}
                    <View style={styles.bottomTabs}>
                        <TouchableOpacity style={styles.tabItem}>
                            <MaterialIcons name="folder-open" size={24} color="#5f6368" />
                            <Text style={styles.tabLabel}>Sources</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tabItemActive}>
                            <MaterialIcons name="forum" size={24} color="#1f1f1f" />
                            <Text style={styles.tabLabelActive}>Chat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.tabItem}>
                            <MaterialIcons name="auto-awesome" size={24} color="#5f6368" />
                            <Text style={styles.tabLabel}>Studio</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Language Modal */}
            <Modal visible={showLangModal} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLangModal(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Language</Text>
                        <TouchableOpacity style={styles.langOption} onPress={() => handleAudioOverview('en')}>
                            <Text style={styles.langText}>English</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.langOption} onPress={() => handleAudioOverview('ta')}>
                            <Text style={styles.langText}>Tamil (தமிழ்)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.langOption} onPress={() => handleAudioOverview('hi')}>
                            <Text style={styles.langText}>Hindi (हिन्दी)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowLangModal(false)}>
                            <Text style={styles.closeModalText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 },
    backBtn: { padding: 8 },
    moreBtn: { padding: 8 },
    headerTitle: { flex: 1, fontSize: 16, color: '#1f1f1f', fontWeight: '500', marginHorizontal: 8 },
    loadingContainer: { flex: 1 },
    loadingText: { textAlign: 'center', color: '#5f6368', fontSize: 14, marginTop: 12 },
    chatHeader: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 },
    chatHeaderEmoji: { fontSize: 48, marginBottom: 24 },
    chatHeaderTitle: { fontSize: 32, fontWeight: '400', color: '#1f1f1f', lineHeight: 38, marginBottom: 16 },
    chatHeaderSource: { fontSize: 16, color: '#5f6368', marginBottom: 24 },
    chatList: { paddingBottom: 40 },
    messageRow: { marginBottom: 24 },
    messageBubble: { maxWidth: '90%', padding: 16, borderRadius: 20, marginHorizontal: 16 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: '#f0f4f9', borderBottomRightRadius: 4 },
    botBubble: { alignSelf: 'flex-start', backgroundColor: '#ffffff' },
    messageText: { fontSize: 17, lineHeight: 26, color: '#1f1f1f', fontWeight: '400' },
    userText: { color: '#1f1f1f' },
    botText: { color: '#1f1f1f' },
    actionRow: { flexDirection: 'row', marginLeft: 16, marginTop: 12, gap: 20, alignItems: 'center' },
    actionIcon: { padding: 4 },
    bottomConfig: { backgroundColor: '#ffffff', paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
    audioOverviewBtn: {
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: '#e8eaed',
        marginBottom: 16,
        gap: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 }
    },
    audioOverviewText: { fontSize: 17, fontWeight: '500', color: '#1f1f1f' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#f8f9fb', borderRadius: 32, borderWidth: 1, borderColor: '#e8eaed' },
    textInput: { flex: 1, fontSize: 16, color: '#1f1f1f', paddingVertical: 6, maxHeight: 100 },
    sourcePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9eef6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4, marginLeft: 8 },
    sourcePillText: { fontSize: 14, color: '#1f1f1f', fontWeight: '500' },
    sendButton: { marginLeft: 12 },
    bottomTabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f3f4', paddingVertical: 10 },
    tabItem: { flex: 1, alignItems: 'center', gap: 4 },
    tabItemActive: { flex: 1, alignItems: 'center', gap: 4 },
    tabLabel: { fontSize: 12, color: '#5f6368' },
    tabLabelActive: { fontSize: 12, color: '#1f1f1f', fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24, textAlign: 'center', color: '#1f1f1f' },
    langOption: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f3f4' },
    langText: { fontSize: 19, textAlign: 'center', color: '#1f1f1f' },
    closeModalBtn: { marginTop: 16, padding: 12 },
    closeModalText: { fontSize: 17, textAlign: 'center', color: '#5f6368', fontWeight: '500' },
    ragBadge: {
        backgroundColor: '#e8f0fe',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: '#1a73e8',
    },
    ragBadgeText: {
        fontSize: 11,
        color: '#1a73e8',
        fontWeight: 'bold',
    },
});

export default ChatScreen;
