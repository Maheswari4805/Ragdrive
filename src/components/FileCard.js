import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Elevation, BorderRadius, Typography } from '../styles/theme';
import { getFileIcon, formatFileSize, formatDate } from '../services/driveApi';

const FileCard = ({ file, onPress, isSelected, onSelect, selectionMode }) => {
    const icon = getFileIcon(file.mimeType);
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isSelected && styles.selectedContainer,
            ]}
            onPress={() => selectionMode ? onSelect?.(file) : onPress?.(file)}
            onLongPress={() => onSelect?.(file)}
            activeOpacity={0.6}
        >
            {selectionMode && (
                <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => onSelect?.(file)}
                >
                    <MaterialIcons
                        name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                        size={22}
                        color={isSelected ? Colors.primary : Colors.mediumGray}
                    />
                </TouchableOpacity>
            )}

            <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
                <MaterialIcons name={icon.name} size={28} color={icon.color} />
            </View>

            <View style={styles.info}>
                <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                </Text>
                <View style={styles.metaRow}>
                    {file.modifiedTime && (
                        <Text style={styles.metaText}>{formatDate(file.modifiedTime)}</Text>
                    )}
                    {file.size && !isFolder && (
                        <>
                            <Text style={styles.metaDot}>·</Text>
                            <Text style={styles.metaText}>{formatFileSize(file.size)}</Text>
                        </>
                    )}
                </View>
            </View>

            <TouchableOpacity style={styles.moreButton} onPress={() => { }}>
                <MaterialIcons name="more-vert" size={20} color={Colors.mediumGray} />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        backgroundColor: Colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.extraLightGray,
    },
    selectedContainer: {
        backgroundColor: Colors.ripple,
    },
    checkbox: {
        marginRight: Spacing.sm,
        padding: 2,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    info: {
        flex: 1,
        marginRight: Spacing.sm,
    },
    fileName: {
        ...Typography.subtitle2,
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        ...Typography.caption,
        color: Colors.textTertiary,
    },
    metaDot: {
        ...Typography.caption,
        color: Colors.textTertiary,
        marginHorizontal: 4,
    },
    moreButton: {
        padding: Spacing.xs,
    },
});

export default FileCard;
