import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Spacing, Typography, BorderRadius, Elevation } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { getRecentFiles, listFiles, uploadFile, createFolder, getFileIcon, formatDate } from '../services/driveApi';
import Header from '../components/Header';
import RecentFiles from '../components/RecentFiles';
import FileCard from '../components/FileCard';
import ChatCard from '../components/ChatCard';
import ActionButtons from '../components/ActionButtons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeScreen = ({ navigation }) => {
    const { accessToken, user, signOut } = useAuth();
    const [recentFiles, setRecentFiles] = useState([]);
    const [allFiles, setAllFiles] = useState([]);
    const [isLoadingRecent, setIsLoadingRecent] = useState(true);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [activeTab, setActiveTab] = useState('recent');
    const [recentChats, setRecentChats] = useState([]);

    useEffect(() => {
        if (accessToken) {
            loadData();
        }
    }, [accessToken]);

    useEffect(() => {
        if (activeTab === 'recent') {
            loadRecentChats();
        }
    }, [activeTab]);

    const loadRecentChats = async () => {
        try {
            const data = await AsyncStorage.getItem('@recent_chats');
            if (data) {
                setRecentChats(JSON.parse(data));
            }
        } catch (e) {
            console.error("Failed to load chats:", e);
        }
    };

    const loadData = async () => {
        await Promise.all([loadRecentFiles(), loadAllFiles()]);
    };

    const loadRecentFiles = async () => {
        try {
            setIsLoadingRecent(true);
            const result = await getRecentFiles(accessToken, 10);
            setRecentFiles(result.files || []);
        } catch (error) {
            console.error('Failed to load recent files:', error);
        } finally {
            setIsLoadingRecent(false);
        }
    };

    const loadAllFiles = async () => {
        try {
            setIsLoadingFiles(true);
            const result = await listFiles(accessToken, { pageSize: 30 });
            setAllFiles(result.files || []);
        } catch (error) {
            console.error('Failed to load files:', error);
        } finally {
            setIsLoadingFiles(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [accessToken]);

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const file = result.assets[0];
                Alert.alert(
                    'Upload File',
                    `Upload "${file.name}" to Google Drive?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Upload',
                            onPress: async () => {
                                try {
                                    await uploadFile(
                                        accessToken,
                                        file.uri,
                                        file.name,
                                        file.mimeType || 'application/octet-stream'
                                    );
                                    Alert.alert('Success', 'File uploaded successfully!');
                                    loadData();
                                } catch (err) {
                                    Alert.alert('Error', 'Failed to upload file');
                                }
                            },
                        },
                    ]
                );
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick file');
        }
    };

    const handleCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is needed to take photos');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.length > 0) {
                const photo = result.assets[0];
                const fileName = `Photo_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;

                try {
                    await uploadFile(
                        accessToken,
                        photo.uri,
                        fileName,
                        'image/jpeg'
                    );
                    Alert.alert('Success', 'Photo uploaded to Google Drive!');
                    loadData();
                } catch (err) {
                    Alert.alert('Error', 'Failed to upload photo');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to open camera');
        }
    };

    const handleNewFolder = async () => {
        if (!newFolderName.trim()) return;

        setIsCreating(true);
        try {
            await createFolder(accessToken, newFolderName.trim());
            setShowNewFolderModal(false);
            setNewFolderName('');
            Alert.alert('Success', 'Folder created successfully!');
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to create folder');
        } finally {
            setIsCreating(false);
        }
    };

    const handleFilePress = (file) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            navigation.navigate('FileBrowser', { folderId: file.id, folderName: file.name });
        } else {
            // Open RAG ChatBot for this file
            navigation.navigate('Chat', { fileId: file.id, fileName: file.name, mimeType: file.mimeType });
        }
    };

    const handleChatPress = (chat) => {
        navigation.navigate('Chat', { fileId: chat.fileId, fileName: chat.fileName, mimeType: chat.mimeType });
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                    navigation.replace('Login');
                },
            },
        ]);
    };

    const tabs = [
        { key: 'recent', label: 'Recent', icon: 'access-time' },
        { key: 'files', label: 'My Drive', icon: 'folder' },
        { key: 'shared', label: 'Shared', icon: 'people' },
        { key: 'starred', label: 'Starred', icon: 'star' },
    ];

    const renderHeader = () => (
        <View>
            {/* Tabs */}
            <View style={styles.tabContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={tabs}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={styles.tabBar}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.tab, activeTab === item.key && styles.activeTab]}
                            onPress={() => setActiveTab(item.key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    activeTab === item.key && styles.activeTabText,
                                ]}
                            >
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Quick Access / Recent - only show on My Drive tab */}
            {activeTab === 'files' && (
                <RecentFiles
                    files={recentFiles}
                    isLoading={isLoadingRecent}
                    onFilePress={handleFilePress}
                />
            )}
        </View>
    );

    // Determine which data to show in the main list based on the active tab
    const getListData = () => {
        switch (activeTab) {
            case 'recent':
                return recentChats;
            case 'files':
                return allFiles;
            case 'shared':
            case 'starred':
                return []; // Placeholder for future features
            default:
                return allFiles;
        }
    };

    const getListLoadingStatus = () => {
        return activeTab === 'recent' ? false : isLoadingFiles; // Chats load instantly from local storage
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Header */}
            <Header
                onProfilePress={() => setShowProfileMenu(true)}
                onSearchPress={() => navigation.navigate('FileBrowser', { searchMode: true })}
            />

            {/* File List */}
            <FlatList
                data={getListData()}
                keyExtractor={(item) => item.fileId || item.id}
                renderItem={({ item }) => (
                    activeTab === 'recent' ? (
                        <ChatCard chat={item} onPress={handleChatPress} />
                    ) : (
                        <FileCard file={item} onPress={handleFilePress} />
                    )
                )}
                ListHeaderComponent={renderHeader}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                    />
                }
                ListEmptyComponent={
                    !getListLoadingStatus() ? (
                        <View style={styles.emptyContainer}>
                            <MaterialIcons
                                name={activeTab === 'files' ? "folder-open" : "history"}
                                size={48}
                                color={Colors.lightGray}
                            />
                            <Text style={styles.emptyTitle}>
                                {activeTab === 'files' ? "No files yet" : "No recent files"}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {activeTab === 'files' ? "Upload or create some files to get started" : "Files you open will appear here"}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    )
                }
                contentContainerStyle={styles.listContent}
            />

            <ActionButtons
                onCamera={handleCamera}
                onCreateNew={handleUpload}
            />
            {/* New Folder Modal */}
            <Modal
                visible={showNewFolderModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowNewFolderModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New folder</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Folder name"
                            placeholderTextColor={Colors.textTertiary}
                            value={newFolderName}
                            onChangeText={setNewFolderName}
                            autoFocus
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={() => {
                                    setShowNewFolderModal(false);
                                    setNewFolderName('');
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonPrimary]}
                                onPress={handleNewFolder}
                                disabled={!newFolderName.trim() || isCreating}
                            >
                                {isCreating ? (
                                    <ActivityIndicator size="small" color={Colors.textOnPrimary} />
                                ) : (
                                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                                        Create
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Profile Menu Modal (Google Account Switcher Style) */}
            <Modal
                visible={showProfileMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowProfileMenu(false)}
            >
                <TouchableOpacity
                    style={styles.profileOverlay}
                    activeOpacity={1}
                    onPress={() => setShowProfileMenu(false)}
                >
                    <View style={styles.googleAccountModal}>
                        {/* Close button row */}
                        <View style={styles.modalTopBar}>
                            <TouchableOpacity onPress={() => setShowProfileMenu(false)}>
                                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                            <Image
                                source={require('../../assets/top_logo.jpg')}
                                style={styles.googleLogoSmall}
                                contentFit="contain"
                            />
                            <View style={{ width: 24 }} />
                        </View>

                        {/* Current User */}
                        <View style={styles.accountCard}>
                            {user?.picture ? (
                                <Image source={{ uri: user.picture }} style={styles.largeAvatar} />
                            ) : (
                                <View style={[styles.largeAvatar, { backgroundColor: Colors.primary }]}>
                                    <Text style={styles.largeAvatarInitial}>
                                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.accountName}>{user?.name || 'User'}</Text>
                            <Text style={styles.accountEmail}>{user?.email || ''}</Text>

                            <TouchableOpacity style={styles.manageAccountBtn}>
                                <Text style={styles.manageAccountText}>Manage your Google Account</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.accountDivider} />

                        {/* List of other accounts (mocked to just show "Add another account" for now since auth-session only gives us 1) */}
                        <View style={styles.otherAccountsList}>
                            <TouchableOpacity
                                style={styles.accountRow}
                                onPress={async () => {
                                    setShowProfileMenu(false);
                                    await signOut();
                                    navigation.replace('Login');
                                }}
                            >
                                <View style={styles.iconCircle}>
                                    <MaterialIcons name="person-add-alt" size={20} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.accountRowText}>Add another account</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.accountRow}
                                onPress={async () => {
                                    setShowProfileMenu(false);
                                    await signOut();
                                    navigation.replace('Login');
                                }}
                            >
                                <View style={styles.iconCircle}>
                                    <MaterialIcons name="manage-accounts" size={20} color={Colors.textSecondary} />
                                </View>
                                <Text style={styles.accountRowText}>Manage accounts on this device</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.accountDivider} />

                        {/* Footer links */}
                        <View style={styles.modalFooterLinks}>
                            <Text style={styles.footerLinkText}>Privacy Policy</Text>
                            <Text style={styles.footerLinkDot}>•</Text>
                            <Text style={styles.footerLinkText}>Terms of Service</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    },
    quickActions: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.extraLightGray,
    },
    quickActionButton: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: Colors.surfaceVariant,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.extraLightGray,
    },
    quickActionText: {
        ...Typography.caption,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    tabContainer: {
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.extraLightGray,
    },
    tabBar: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    activeTab: {
        backgroundColor: '#e8eaed', // Light grey pill background
    },
    tabText: {
        fontSize: 14,
        color: '#3c4043',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#202124',
        fontWeight: '600',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    sectionTitle: {
        ...Typography.subtitle1,
        color: Colors.textPrimary,
    },
    listContent: {
        paddingBottom: 120,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
        gap: Spacing.sm,
    },
    emptyTitle: {
        ...Typography.h3,
        color: Colors.textSecondary,
    },
    emptySubtitle: {
        ...Typography.body2,
        color: Colors.textTertiary,
        textAlign: 'center',
    },
    loadingContainer: {
        paddingVertical: Spacing.xxl,
        alignItems: 'center',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        ...Elevation.high,
    },
    modalTitle: {
        ...Typography.h3,
        marginBottom: Spacing.lg,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: Colors.lightGray,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        ...Typography.body1,
        color: Colors.textPrimary,
        marginBottom: Spacing.lg,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: Spacing.sm,
    },
    modalButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: 10,
        borderRadius: BorderRadius.xl,
    },
    modalButtonPrimary: {
        backgroundColor: Colors.primary,
    },
    modalButtonText: {
        ...Typography.subtitle2,
        color: Colors.primary,
    },
    modalButtonTextPrimary: {
        color: Colors.textOnPrimary,
    },
    // Google Account Modal Styles
    googleAccountModal: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: Colors.surface,
        borderRadius: 24,
        overflow: 'hidden',
        paddingVertical: Spacing.md,
        ...Elevation.high,
    },
    modalTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    googleLogoSmall: {
        width: 100,
        height: 30,
    },
    accountCard: {
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.lg,
    },
    largeAvatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        marginBottom: Spacing.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    largeAvatarInitial: {
        fontSize: 32,
        color: Colors.textOnPrimary,
        fontWeight: '500',
    },
    accountName: {
        ...Typography.subtitle1,
        color: Colors.textPrimary,
        fontWeight: '500',
        marginBottom: 2,
    },
    accountEmail: {
        ...Typography.body2,
        color: Colors.textSecondary,
        marginBottom: Spacing.lg,
    },
    manageAccountBtn: {
        borderWidth: 1,
        borderColor: Colors.lightGray,
        borderRadius: 100,
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    manageAccountText: {
        color: Colors.textPrimary,
        fontWeight: '500',
        fontSize: 14,
    },
    accountDivider: {
        height: 1,
        backgroundColor: Colors.extraLightGray,
        width: '100%',
    },
    otherAccountsList: {
        paddingVertical: Spacing.sm,
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: Spacing.lg,
    },
    iconCircle: {
        width: 32,
        height: 32,
        // No background color to match the generic icons in the screenshot better, but can add if needed
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    accountRowText: {
        ...Typography.body1,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    modalFooterLinks: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: Spacing.md,
    },
    footerLinkText: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
    footerLinkDot: {
        color: Colors.textSecondary,
        fontSize: 12,
        marginHorizontal: 8,
    },
});

export default HomeScreen;
