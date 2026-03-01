import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Elevation, BorderRadius, Typography } from '../styles/theme';

const FAB = ({ onUpload, onNewFolder, onCamera }) => {
    const [isOpen, setIsOpen] = useState(false);
    const animation = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;

        Animated.parallel([
            Animated.spring(animation, {
                toValue,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
                toValue,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        setIsOpen(!isOpen);
    };

    const handleAction = (action) => {
        toggleMenu();
        setTimeout(() => action?.(), 200);
    };

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    const options = [
        { icon: 'cloud-upload', label: 'Upload file', action: onUpload, color: Colors.primary },
        { icon: 'create-new-folder', label: 'New folder', action: onNewFolder, color: Colors.accent },
        { icon: 'camera-alt', label: 'Camera', action: onCamera, color: Colors.warning },
    ];

    return (
        <View style={styles.container}>
            {/* Backdrop */}
            {isOpen && (
                <TouchableOpacity
                    style={styles.backdrop}
                    onPress={toggleMenu}
                    activeOpacity={1}
                />
            )}

            {/* Option Buttons */}
            {options.map((option, index) => {
                const translateY = animation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(70 * (index + 1))],
                });

                const scale = animation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0.5, 1],
                });

                const opacity = animation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0, 1],
                });

                return (
                    <Animated.View
                        key={option.label}
                        style={[
                            styles.optionContainer,
                            {
                                transform: [{ translateY }, { scale }],
                                opacity,
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.optionLabelContainer}
                            onPress={() => handleAction(option.action)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.optionLabel}>{option.label}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.optionButton, { backgroundColor: option.color }]}
                            onPress={() => handleAction(option.action)}
                            activeOpacity={0.8}
                        >
                            <MaterialIcons name={option.icon} size={22} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}

            {/* Main FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={toggleMenu}
                activeOpacity={0.85}
            >
                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                    <MaterialIcons name="add" size={28} color={Colors.textOnPrimary} />
                </Animated.View>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 90 : 80,
        right: 20,
        alignItems: 'flex-end',
        zIndex: 100,
    },
    backdrop: {
        position: 'absolute',
        top: -1000,
        left: -1000,
        right: -100,
        bottom: -100,
        backgroundColor: Colors.overlay,
        zIndex: -1,
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...Elevation.high,
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        bottom: 0,
        right: 0,
        gap: Spacing.sm,
    },
    optionButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 7,
        ...Elevation.medium,
    },
    optionLabelContainer: {
        backgroundColor: Colors.surface,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        ...Elevation.low,
    },
    optionLabel: {
        ...Typography.subtitle2,
        color: Colors.textPrimary,
    },
});

export default FAB;
