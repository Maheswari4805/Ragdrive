import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Elevation } from '../styles/theme';
import { useGoogleAuth, exchangeCodeForToken } from '../services/auth';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
    const { signIn } = useAuth();
    const { request, response, promptAsync } = useGoogleAuth();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const buttonScale = useRef(new Animated.Value(0.9)).current;
    const [isLoading, setIsLoading] = React.useState(false);

    // Entry animation
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(buttonScale, {
                toValue: 1,
                friction: 4,
                tension: 40,
                delay: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Handle auth response
    useEffect(() => {
        handleAuthResponse();
    }, [response]);

    const handleAuthResponse = async () => {
        if (!response) return;

        console.log('[Login] Auth response type:', response.type);

        if (response.type === 'success') {
            setIsLoading(true);
            try {
                const { authentication, params } = response;

                // If we get an access token directly (implicit flow)
                if (authentication?.accessToken) {
                    console.log('[Login] Got access token directly');
                    await signIn(authentication.accessToken, authentication.expiresIn);
                    navigation.replace('Home');
                    return;
                }

                // If we get a code, exchange it for a token (PKCE flow)
                if (params?.code) {
                    console.log('[Login] Got auth code, exchanging for token...');
                    const codeVerifier = request?.codeVerifier;
                    const redirectUri = request?.redirectUri;
                    const tokenData = await exchangeCodeForToken(params.code, codeVerifier, redirectUri);
                    await signIn(tokenData.access_token, tokenData.expires_in);
                    navigation.replace('Home');
                    return;
                }

                console.warn('[Login] No token or code in response');
                Alert.alert('Sign In Failed', 'No authentication data received.');
            } catch (error) {
                console.error('[Login] Auth flow error:', error);
                Alert.alert('Sign In Failed', 'Unable to complete sign in. Please try again.');
            } finally {
                setIsLoading(false);
            }
        } else if (response.type === 'error') {
            console.error('[Login] Auth error:', response.error);
            Alert.alert('Authentication Error', response.error?.message || 'Something went wrong');
        } else if (response.type === 'dismiss') {
            console.log('[Login] User dismissed the auth prompt');
        }
    };

    const handleSignIn = async () => {
        try {
            console.log('[Login] Starting Google Sign-In...');
            await promptAsync();
        } catch (error) {
            console.error('[Login] Prompt error:', error);
            Alert.alert('Error', 'Failed to start sign in process');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#ffffff', '#f0f4ff', '#e8eeff']}
                style={styles.gradient}
            >
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* Logo Section */}
                    <View style={styles.logoSection}>

                        <Text style={styles.subtitle}>
                            Your intelligent RAG chatbot powered{'\n'}by Google Gemini AI
                        </Text>
                    </View>

                    {/* Features Section */}
                    <View style={styles.featuresSection}>
                        {[
                            { icon: 'smart-toy', text: 'Chat with Gemini API' },
                            { icon: 'translate', text: 'Multi-language Translation' },
                            { icon: 'record-voice-over', text: 'Text-to-Voice Conversion' },
                        ].map((feature, index) => (
                            <View key={index} style={styles.featureRow}>
                                <View style={styles.featureIconContainer}>
                                    <MaterialIcons
                                        name={feature.icon}
                                        size={20}
                                        color={Colors.primary}
                                    />
                                </View>
                                <Text style={styles.featureText}>{feature.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Sign In Button */}
                    <Animated.View
                        style={[
                            styles.buttonContainer,
                            { transform: [{ scale: buttonScale }] },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.signInButton}
                            onPress={handleSignIn}
                            disabled={isLoading || !request}
                            activeOpacity={0.85}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={Colors.textPrimary} />
                            ) : (
                                <>
                                    <Image
                                        source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                                        style={styles.googleIcon}
                                    />
                                    <Text style={styles.signInText}>Sign in with Google</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </Animated.View>

                    <Text style={styles.termsText}>
                        By signing in, you agree to our Terms of Service{'\n'}and Privacy Policy
                    </Text>

                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => navigation.replace('Home')}
                        activeOpacity={0.6}
                    >
                        <Text style={styles.skipText}>Skip sign in</Text>
                    </TouchableOpacity>
                </Animated.View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: -150,
        marginLeft: 20,
    },

    appName: {
        fontSize: 30,
        fontWeight: '700',
        color: Colors.black,
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    subtitle: {
        ...Typography.body1,
        color: Colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    featuresSection: {
        width: '100%',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: 36,
        borderWidth: 1,
        borderColor: Colors.extraLightGray,
        ...Elevation.low,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    featureIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: `${Colors.primary}10`,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    featureText: {
        ...Typography.body1,
        color: Colors.textPrimary,
    },
    buttonContainer: {
        width: '100%',
        marginBottom: 20,
    },
    signInButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        paddingVertical: 14,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.lightGray,
        gap: Spacing.md,
        ...Elevation.medium,
    },
    googleIcon: {
        width: 24,
        height: 24,
    },
    signInText: {
        ...Typography.subtitle1,
        color: Colors.textPrimary,
        fontWeight: '500',
    },
    termsText: {
        ...Typography.caption,
        color: Colors.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },
    skipButton: {
        marginTop: 16,
        paddingVertical: 8,
    },
    skipText: {
        ...Typography.body2,
        color: Colors.textSecondary,
        textDecorationLine: 'underline',
    },
});

export default LoginScreen;
