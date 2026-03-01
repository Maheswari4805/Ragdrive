import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Elevation, BorderRadius, Typography } from '../styles/theme';
import { useAuth } from '../context/AuthContext';

const Header = ({ onProfilePress, onSearchPress }) => {
    const { user } = useAuth();

    return (
        <View style={styles.container}>
            <View style={styles.leftSection}>
                <TouchableOpacity onPress={onProfilePress} activeOpacity={0.7}>
                    <Image
                        source={require('../../assets/top_logo.jpg')}
                        style={styles.logo}
                        contentFit="contain"
                    />

                </TouchableOpacity>
            </View>

            <View style={styles.rightSection}>
                {onSearchPress && (
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={onSearchPress}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="search" size={24} color={Colors.mediumGray} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={onProfilePress}
                    activeOpacity={0.7}
                >
                    {user?.picture ? (
                        <Image
                            source={{ uri: user.picture }}
                            style={styles.profileImage}
                            contentFit="cover"
                        />
                    ) : (
                        <View style={styles.profilePlaceholder}>
                            <MaterialIcons name="account-circle" size={36} color={Colors.mediumGray} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.extraLightGray,
        ...Elevation.low,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    logo: {
        width: 180,
        height: 54,
    },
    appName: {
        ...Typography.h3,
        color: Colors.black,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    iconButton: {
        padding: Spacing.sm,
        borderRadius: BorderRadius.full,
    },
    profileButton: {
        marginLeft: Spacing.xs,
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: Colors.extraLightGray,
    },
    profilePlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default Header;
