import React, { createContext, useContext, useState, useEffect } from 'react';
import { getStoredAuthData, saveAuthData, clearAuthData, getUserInfo } from '../services/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkStoredAuth();
    }, []);

    const checkStoredAuth = async () => {
        try {
            const data = await getStoredAuthData();
            if (data) {
                setAccessToken(data.accessToken);
                setUser(data.userInfo);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Error checking stored auth:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (token, expiresIn) => {
        console.log('SignIn triggered in Context');
        try {
            setAccessToken(token);
            const userInfo = await getUserInfo(token);
            console.log('User info fetched for:', userInfo?.email);
            setUser(userInfo);
            setIsAuthenticated(true);
            await saveAuthData(token, userInfo, expiresIn);
            console.log('Auth data saved to storage');
        } catch (error) {
            console.error('Sign in failed in Context:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            await clearAuthData();
            setUser(null);
            setAccessToken(null);
            setIsAuthenticated(false);
        } catch (error) {
            console.error('Sign out failed:', error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isLoading,
                isAuthenticated,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
