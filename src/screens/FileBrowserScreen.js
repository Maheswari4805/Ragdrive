import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    TextInput,
    Alert,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Elevation } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { listFiles, searchFiles, getFileIcon, formatDate, formatFileSize } from '../services/driveApi';
import FileCard from '../components/FileCard';

const FileBrowserScreen = ({ navigation, route }) => {
    const { accessToken } = useAuth();
    const { folderId, folderName, searchMode } = route.params || {};

    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(searchMode || false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [nextPageToken, setNextPageToken] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

    useEffect(() => {
        loadFiles();
    }, [folderId]);

    const loadFiles = async (pageToken = null) => {
        try {
            if (!pageToken) setIsLoading(true);
            else setIsLoadingMore(true);

            const result = await listFiles(accessToken, {
                folderId,
                pageSize: 30,
                pageToken,
            });

            if (pageToken) {
                setFiles((prev) => [...prev, ...(result.files || [])]);
            } else {
                setFiles(result.files || []);
            }
            setNextPageToken(result.nextPageToken);
        } catch (error) {
            console.error('Failed to load files:', error);
            Alert.alert('Error', 'Failed to load files');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadFiles();
            return;
        }

        try {
            setIsLoading(true);
            const result = await searchFiles(accessToken, searchQuery.trim());
            setFiles(result.files || []);
        } catch (error) {
            Alert.alert('Error', 'Search failed');
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFiles();
        setRefreshing(false);
    }, [accessToken, folderId]);

    const handleFilePress = (file) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            navigation.push('FileBrowser', { folderId: file.id, folderName: file.name });
        } else {
            // Open RAG ChatBot for this file
            navigation.navigate('Chat', { fileId: file.id, fileName: file.name, mimeType: file.mimeType });
        }
    };

    const handleSelect = (file) => {
        setSelectionMode(true);
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(file.id)) {
                next.delete(file.id);
            } else {
                next.add(file.id);
            }
            if (next.size === 0) setSelectionMode(false);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedFiles.size === files.length) {
            setSelectedFiles(new Set());
            setSelectionMode(false);
        } else {
            setSelectedFiles(new Set(files.map((f) => f.id)));
        }
    };

    const handleLoadMore = () => {
        if (nextPageToken && !isLoadingMore) {
            loadFiles(nextPageToken);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>

                {isSearching ? (
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search in Drive"
                            placeholderTextColor={Colors.textTertiary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            autoFocus
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchQuery('');
                                    loadFiles();
                                }}
                            >
                                <MaterialIcons name="close" size={20} color={Colors.mediumGray} />
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {folderName || 'My Drive'}
                    </Text>
                )}

                <View style={styles.headerActions}>
                    {!isSearching && (
                        <TouchableOpacity
                            style={styles.headerButton}
                            onPress={() => setIsSearching(true)}
                            activeOpacity={0.7}
                        >
                            <MaterialIcons name="search" size={24} color={Colors.mediumGray} />
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons
                            name={viewMode === 'list' ? 'grid-view' : 'view-list'}
                            size={24}
                            color={Colors.mediumGray}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Selection Bar */}
            {selectionMode && (
                <View style={styles.selectionBar}>
                    <View style={styles.selectionInfo}>
                        <TouchableOpacity
                            onPress={() => {
                                setSelectionMode(false);
                                setSelectedFiles(new Set());
                            }}
                        >
                            <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.selectionCount}>
                            {selectedFiles.size} selected
                        </Text>
                    </View>
                    <View style={styles.selectionActions}>
                        <TouchableOpacity style={styles.selectionButton} onPress={handleSelectAll}>
                            <MaterialIcons
                                name={selectedFiles.size === files.length ? 'deselect' : 'select-all'}
                                size={22}
                                color={Colors.primary}
                            />
                            <Text style={styles.selectionButtonText}>
                                {selectedFiles.size === files.length ? 'Deselect' : 'Select All'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Breadcrumb */}
            {folderId && (
                <View style={styles.breadcrumb}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Home')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.breadcrumbText}>My Drive</Text>
                    </TouchableOpacity>
                    <MaterialIcons name="chevron-right" size={16} color={Colors.textTertiary} />
                    <Text style={styles.breadcrumbCurrent}>{folderName || 'Folder'}</Text>
                </View>
            )}

            {/* File List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading files...</Text>
                </View>
            ) : (
                <FlatList
                    data={files}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <FileCard
                            file={item}
                            onPress={handleFilePress}
                            isSelected={selectedFiles.has(item.id)}
                            onSelect={handleSelect}
                            selectionMode={selectionMode}
                        />
                    )}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[Colors.primary]}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isLoadingMore ? (
                            <View style={styles.footerLoading}>
                                <ActivityIndicator size="small" color={Colors.primary} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons
                                name={isSearching ? 'search-off' : 'folder-open'}
                                size={64}
                                color={Colors.lightGray}
                            />
                            <Text style={styles.emptyTitle}>
                                {isSearching ? 'No results found' : 'This folder is empty'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {isSearching
                                    ? 'Try different search terms'
                                    : 'Upload files or create folders'}
                            </Text>
                        </View>
                    }
                    contentContainerStyle={files.length === 0 ? styles.emptyListContent : undefined}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.extraLightGray,
        ...Elevation.low,
    },
    backButton: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    headerTitle: {
        ...Typography.h3,
        flex: 1,
        marginLeft: Spacing.sm,
        color: Colors.textPrimary,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceVariant,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.md,
        marginHorizontal: Spacing.sm,
        height: 40,
    },
    searchInput: {
        flex: 1,
        ...Typography.body1,
        color: Colors.textPrimary,
        paddingVertical: 0,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 4,
    },
    headerButton: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    selectionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.ripple,
        borderBottomWidth: 1,
        borderBottomColor: Colors.extraLightGray,
    },
    selectionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    selectionCount: {
        ...Typography.subtitle1,
        color: Colors.primary,
    },
    selectionActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    selectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.surface,
        ...Elevation.low,
    },
    selectionButtonText: {
        ...Typography.caption,
        color: Colors.primary,
        fontWeight: '600',
    },
    breadcrumb: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: 4,
        backgroundColor: Colors.surfaceVariant,
    },
    breadcrumbText: {
        ...Typography.caption,
        color: Colors.primary,
        fontWeight: '500',
    },
    breadcrumbCurrent: {
        ...Typography.caption,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.md,
    },
    loadingText: {
        ...Typography.body2,
        color: Colors.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.xxl,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    emptyTitle: {
        ...Typography.h3,
        color: Colors.textSecondary,
    },
    emptySubtitle: {
        ...Typography.body2,
        color: Colors.textTertiary,
    },
    footerLoading: {
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
});

export default FileBrowserScreen;
