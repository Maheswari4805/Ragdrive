import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Elevation, BorderRadius, Typography } from '../styles/theme';
import { getFileIcon, formatDate } from '../services/driveApi';

const RecentFiles = ({ files, isLoading, onFilePress, onViewAll }) => {
    const renderFileItem = ({ item }) => {
        const icon = getFileIcon(item.mimeType);

        return (
            <TouchableOpacity
                style={styles.fileItem}
                onPress={() => onFilePress?.(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.fileIcon, { backgroundColor: `${icon.color}12` }]}>
                    <MaterialIcons name={icon.name} size={24} color={icon.color} />
                </View>
                <Text style={styles.fileName} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={styles.fileDate}>{formatDate(item.modifiedTime)}</Text>
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading recent files...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent</Text>
                {onViewAll && (
                    <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
                        <Text style={styles.viewAllText}>View all</Text>
                    </TouchableOpacity>
                )}
            </View>

            {files && files.length > 0 ? (
                <FlatList
                    data={files}
                    renderItem={renderFileItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <MaterialIcons name="history" size={40} color={Colors.lightGray} />
                    <Text style={styles.emptyText}>No recent files</Text>
                    <Text style={styles.emptySubtext}>
                        Files you open will appear here
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        ...Typography.h3,
        color: Colors.textPrimary,
    },
    viewAllText: {
        ...Typography.subtitle2,
        color: Colors.primary,
    },
    listContent: {
        paddingHorizontal: Spacing.md,
    },
    fileItem: {
        width: 150,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.extraLightGray,
        ...Elevation.low,
    },
    fileIcon: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    fileName: {
        ...Typography.subtitle2,
        color: Colors.textPrimary,
        marginBottom: 4,
        height: 36,
    },
    fileDate: {
        ...Typography.caption,
        color: Colors.textTertiary,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xl,
        gap: Spacing.sm,
    },
    loadingText: {
        ...Typography.body2,
        color: Colors.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        gap: Spacing.xs,
    },
    emptyText: {
        ...Typography.subtitle1,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    emptySubtext: {
        ...Typography.body2,
        color: Colors.textTertiary,
    },
});

export default RecentFiles;
