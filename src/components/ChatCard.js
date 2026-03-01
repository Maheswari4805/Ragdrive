import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Typography } from '../styles/theme';

const PASTEL_COLORS = [
    '#e5f1f4', // Light blue/teal
    '#efe8fb', // Light purple
    '#e6f4ea', // Light green
    '#fce8e6', // Light pink
    '#fef7e0'  // Light yellow
];

// Helper to reliably map a string to an index
const hashString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
};

// Generic emoji map based on mime type
const getEmojiForMime = (mime) => {
    if (mime?.includes('pdf')) return '📜';
    if (mime?.includes('presentation') || mime?.includes('powerpoint')) return '📊';
    if (mime?.includes('document') || mime?.includes('word')) return '📄';
    if (mime?.includes('spreadsheet') || mime?.includes('excel')) return '📉';
    if (mime?.includes('image')) return '🖼️';
    return '📝';
};

// Helper for relative time (e.g. "8 hours ago")
const getRelativeTime = (timestamp) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const daysDifference = Math.round((new Date(timestamp).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const hoursDifference = Math.round((new Date(timestamp).getTime() - new Date().getTime()) / (1000 * 60 * 60));
    const minutesDifference = Math.round((new Date(timestamp).getTime() - new Date().getTime()) / (1000 * 60));

    if (Math.abs(minutesDifference) < 60) {
        return rtf.format(minutesDifference, 'minute');
    } else if (Math.abs(hoursDifference) < 24) {
        return rtf.format(hoursDifference, 'hour');
    } else {
        return rtf.format(daysDifference, 'day');
    }
};

const ChatCard = ({ chat, onPress }) => {
    const bgColor = PASTEL_COLORS[hashString(chat.fileName || '') % PASTEL_COLORS.length];
    const emoji = getEmojiForMime(chat.mimeType);
    const timeText = getRelativeTime(chat.timestamp);

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: bgColor }]}
            onPress={() => onPress?.(chat)}
            activeOpacity={0.8}
        >
            <Text style={styles.emojiText}>{emoji}</Text>

            <View style={styles.info}>
                <Text style={styles.fileName} numberOfLines={1}>
                    {chat.fileName}
                </Text>

                <Text style={styles.subtitle} numberOfLines={1}>
                    1 source • {timeText.replace('in ', '').replace(/ ago$/, '')} ago
                </Text>
            </View>

            <View style={styles.playButtonContainer}>
                <MaterialIcons name="play-arrow" size={24} color="#1f1f1f" />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 18,
        borderRadius: 24, // NotebookLM rounded pill shape
        marginBottom: 12,
        marginHorizontal: 16,
    },
    emojiText: {
        fontSize: 24,
        marginRight: 16,
    },
    info: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center',
    },
    fileName: {
        ...Typography.subtitle1,
        fontWeight: '500',
        color: '#1f1f1f',
        marginBottom: 4,
    },
    subtitle: {
        ...Typography.caption,
        color: '#5f6368',
        fontSize: 13,
    },
    playButtonContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    }
});

export default ChatCard;
