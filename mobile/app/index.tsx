import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, Image, Text, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/Config';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();

        if (!cleanEmail || !cleanPassword) {
            Alert.alert('Erreur', 'Veuillez entrer votre email et votre mot de passe');
            return;
        }

        setLoading(true);

        try {
            console.log(`Attempting login to ${API_URL}/api/auth/login for ${cleanEmail}`);
            const response = await axios.post(`${API_URL}/api/auth/login`, {
                email: cleanEmail,
                password: cleanPassword
            });

            const { token, user } = response.data;

            // Store token securely
            if (Platform.OS !== 'web') {
                await SecureStore.setItemAsync('auth_token', token);
            } else {
                // Fallback for web dev
                localStorage.setItem('auth_token', token);
            }

            console.log('Login successful:', user.email);

            // Navigate to main app
            router.replace({
                pathname: '/dashboard',
                params: { token } // Pass token just in case, though we have it in storage
            });

        } catch (error: any) {
            console.warn('Login failed:', error.response?.data || error.message);
            const backendError = error.response?.data?.error;
            const message = backendError === 'User not found'
                ? 'Utilisateur non trouvé. Vérifiez votre adresse email.'
                : backendError === 'Invalid password'
                ? 'Mot de passe incorrect.'
                : (backendError || 'Échec de la connexion. Veuillez vérifier vos identifiants.');
            Alert.alert('Échec de connexion', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>GPS Tracker</Text>
                    <Text style={styles.subtitle}>Connectez-vous pour continuer</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="votre@email.com"
                            placeholderTextColor="#666"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Mot de passe</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Mot de passe"
                            placeholderTextColor="#666"
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                            autoCorrect={false}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Connexion...' : 'Se connecter'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardView: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    headerContainer: {
        marginBottom: 48,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    button: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 12,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
