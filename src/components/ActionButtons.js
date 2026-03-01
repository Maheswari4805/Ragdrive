import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Elevation, Spacing } from '../styles/theme';

const ActionButtons = ({ onCamera, onCreateNew }) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.cameraButton}
                onPress={onCamera}
                activeOpacity={0.8}
            >
                <MaterialIcons name="camera-alt" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.createButton}
                onPress={onCreateNew}
                activeOpacity={0.8}
            >
                <MaterialIcons name="add" size={20} color="white" />
                <Text style={styles.createText}>Create New</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 65,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        zIndex: 100,
    },
    cameraButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        ...Elevation.medium,
    },
    createButton: {
        flexDirection: 'row',
        height: 46,
        paddingHorizontal: 18,
        borderRadius: 23,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        ...Elevation.medium,
    },
    createText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default ActionButtons;
