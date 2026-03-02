import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Modal, Portal, Text, IconButton, useTheme } from 'react-native-paper';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { trackEvent } from '../lib/analytics';

// Steps
import { EmailStep } from './auth/steps/EmailStep';
import { CodeStep } from './auth/steps/CodeStep';
import { ProfileStep } from './auth/steps/ProfileStep';
import { PasswordStep } from './auth/steps/PasswordStep';
import { ExistingUserStep } from './auth/steps/ExistingUserStep';
import { Stepper, StepKey } from './auth/ui/Stepper';

interface LoginModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const ALL_STEPS: Record<'new' | 'existing', StepKey[]> = {
  new: ['email', 'code', 'profile', 'password'],
  existing: ['email', 'existing-user']
};

export const LoginModal = ({ visible, onDismiss }: LoginModalProps) => {
  const { login } = useAuth();
  const theme = useTheme();

  // State
  const [step, setStep] = useState<StepKey>('email');
  const [isUserExisting, setIsUserExisting] = useState(false);
  const [phase, setPhase] = useState<'email' | 'flow'>('email');
  const [authOrigin, setAuthOrigin] = useState<'traditional' | 'apple' | 'google'>('traditional');

  // Data
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [registrationToken, setRegistrationToken] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      reset();
    } else {
      trackEvent('auth_modal_open');
    }
  }, [visible]);

  const reset = () => {
    setStep('email');
    setPhase('email');
    setIsUserExisting(false);
    setAuthOrigin('traditional');
    setEmail('');
    setCode('');
    setRegistrationToken('');
    setFirstName('');
    setLastName('');
    setBirthDate('');
    setGender('');
    setError('');
    setLoading(false);
  };

  const currentSteps = isUserExisting ? ALL_STEPS.existing : ALL_STEPS.new;

  const handleClose = () => {
    onDismiss();
    // setTimeout(reset, 300); // Reset after closing animation? No need, useEffect handles it
  };

  const getTitle = () => {
    if (phase === 'email') return '¡Bienvenid@ a La Guía!';
    if (isUserExisting && step === 'existing-user') return 'Iniciar Sesión';
    if (!isUserExisting && step === 'email') return 'Acceder / Registrarse'; // Should not happen since phase moves to flow
    if (step === 'code') return 'Verificar correo'; // or 'Recuperar contraseña' if forgot
    if (step === 'profile') return 'Completa tu perfil';
    if (step === 'password') return 'Creá tu contraseña'; // or 'Nueva contraseña'
    return '';
  };

  // --- Handlers ---

  const handleEmailSubmit = async (e: string) => {
    setEmail(e);
    setLoading(true);
    setError('');

    try {
      const { exists, user } = await authApi.checkEmail(e);

      if (exists) {
        setIsUserExisting(true);
        // Check social login
        if (user.origin && user.origin !== 'traditional') {
          // For now, show error as per existing mobile logic since we don't have full social login
          setError(`Esta cuenta fue registrada con ${user.origin === 'google' ? 'Google' : 'Facebook'}. Por favor usa la versión web para acceder con social login.`);
          setLoading(false);
          return;
        }

        // Populate user data if available to greet them?
        if (user.firstName) setFirstName(user.firstName);
        if (user.gender) setGender(user.gender);

        setStep('existing-user');
        setPhase('flow');
      } else {
        setIsUserExisting(false);
        await authApi.sendCode(e);
        setStep('code');
        setPhase('flow');
      }
    } catch (err) {
      setError('Error al verificar el email. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (c: string) => {
    setCode(c);
    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyCode(email, c);

      if (response.isNew) {
        setRegistrationToken(response.registration_token);
        setStep('profile');
      } else {
        // Existing user logging in via OTP (e.g. forgot password flow or magic link logic if supported, but here it's typically Verify -> Token)
        // Wait, existing LoginModal logic for code submit:
        // if (response.isNew) -> profile
        // else -> login( tokens )
        await login(response.access_token, response.refresh_token);
        handleClose();
      }
    } catch (err) {
      setError('Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await trackEvent('social_login_attempt', { provider: 'apple' });

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // email is only guaranteed on the first login.
      // If we don't have it here, it means the user already authorized the app.
      // But we need the email to send to backend or the backend decodes the identity token.
      // Usually, it's better to verify the identityToken in backend.
      // For now, let's implement the API request using email if available, or parse token (if backend supports it).
      // Since backend requires email and we might not get it on subsequent logins:
      // The backend `/auth/social-login` currently requires `email` in body.
      // We will extract email from identityToken payload locally as a workaround since backend doesn't verify Apple JWT yet.
      // (A robust solution involves backend verifying apple token, but we conform to the existing `social-login` endpoint).

      let appleEmail = credential.email;
      if (!appleEmail && credential.identityToken) {
        // Decode JWT payload to get email
        const parts = credential.identityToken.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            appleEmail = payload.email;
          } catch (e) {
            console.error('Could not parse Apple identity token', e);
          }
        }
      }

      if (!appleEmail) {
        throw new Error('No se pudo obtener el email de Apple');
      }

      const response = await authApi.socialLogin({
        email: appleEmail,
        firstName: credential.fullName?.givenName || undefined,
        lastName: credential.fullName?.familyName || undefined,
        origin: 'apple',
      });

      if (response.profileIncomplete) {
        setEmail(appleEmail);
        setAuthOrigin('apple');
        if (response.user.firstName) setFirstName(response.user.firstName);
        if (response.user.lastName) setLastName(response.user.lastName);
        setRegistrationToken(response.registration_token);
        setStep('profile');
        setPhase('flow');
      } else {
        await login(response.access_token, response.refresh_token);
        handleClose();
      }

    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED' || e.code === 'ERR_CANCELED') {
        // User canceled, do nothing
      } else {
        setError('Error al iniciar sesión con Apple. ' + (e.message || ''));
        trackEvent('login_error', { error: e.message || 'unknown', method: 'apple' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await trackEvent('social_login_attempt', { provider: 'google' });

      GoogleSignin.configure({
        webClientId: Constants.expoConfig?.extra?.googleClientIds?.web,
      });

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const user = userInfo.data ? userInfo.data.user : (userInfo as any).user || userInfo; // Handle different react-native-google-signin version payload shapes

      const emailToUse = user.email || (user as any).user?.email;

      if (!emailToUse) {
        throw new Error('No se pudo obtener el email de Google');
      }

      const response = await authApi.socialLogin({
        email: emailToUse,
        firstName: user.givenName || undefined,
        lastName: user.familyName || undefined,
        origin: 'google',
      });

      if (response.profileIncomplete) {
        setEmail(emailToUse);
        setAuthOrigin('google');
        if (response.user.firstName) setFirstName(response.user.firstName);
        if (response.user.lastName) setLastName(response.user.lastName);
        setRegistrationToken(response.registration_token);
        setStep('profile');
        setPhase('flow');
      } else {
        await login(response.access_token, response.refresh_token);
        handleClose();
      }

    } catch (e: any) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        // User canceled
      } else if (e.code === statusCodes.IN_PROGRESS) {
        // In progress
      } else if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services no disponible o desactualizado.');
        trackEvent('login_error', { error: 'play_services_not_available', method: 'google' });
      } else {
        setError('Error al iniciar sesión con Google. ' + (e.message || ''));
        trackEvent('login_error', { error: e.message || 'unknown', method: 'google' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (f: string, l: string, b: string, g: string) => {
    setFirstName(f);
    setLastName(l);
    setBirthDate(b);
    setGender(g);

    if (authOrigin !== 'traditional') {
      setLoading(true);
      setError('');
      try {
        const [d, m, y] = b.split('/');
        const formattedDate = `${y}-${m}-${d}`;

        const response = await authApi.completeProfile({
          registration_token: registrationToken,
          firstName: f,
          lastName: l,
          birthDate: formattedDate,
          gender: g
        });

        await login(response.access_token, response.refresh_token);
        handleClose();
      } catch (err) {
        setError('Error al completar el perfil.');
      } finally {
        setLoading(false);
      }
    } else {
      setStep('password');
    }
  };

  const handlePasswordRegister = async (pw: string) => {
    setLoading(true);
    setError('');

    try {
      // Format date YYYY-MM-DD
      // birthDate from input is DD/MM/YYYY
      const [d, m, y] = birthDate.split('/');
      const formattedDate = `${y}-${m}-${d}`;

      const response = await authApi.register({
        registration_token: registrationToken,
        firstName,
        lastName,
        password: pw,
        // deviceId handled by api interceptor
        birthDate: formattedDate,
        gender
      });

      await login(response.access_token, response.refresh_token);
      trackEvent('signup_success', { method: 'traditional' });
      handleClose();
    } catch (err: any) {
      setError('Error al registrarse.');
      trackEvent('signup_error', { error: err.message || 'unknown', method: 'traditional' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (pw: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await authApi.login(email, pw);
      await login(response.access_token, response.refresh_token);
      handleClose();
    } catch (err: any) {
      setError('Credenciales inválidas');
      trackEvent('login_error', { error: err.message || 'invalid_credentials', method: 'traditional' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    try {
      await authApi.sendCode(email);
      setStep('code');
      // In this flow, we are "verifying" to reset? 
      // The web flow uses a "forgotPassword" flag. 
      // Mobile logic previously just sent code. 
      // If code is verified, does backend return text token?
      // Web: verify-code returns access_token if not new? 
      // For complexity, let's treat forgot password as "Login with Code" for now or similar to web's forgot flow.
      // Web: setForgotPassword(true) -> CodeStep -> PasswordStep (new password).
      // For now I'll just redirect to CodeStep, and if they verify, they log in (if backend supports OTP login).
    } catch (err) {
      setError('Error al enviar código');
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---

  const renderContent = () => {
    switch (step) {
      case 'email':
        return <EmailStep onSubmit={handleEmailSubmit} onAppleLogin={handleAppleLogin} onGoogleLogin={handleGoogleLogin} isLoading={loading} error={error} initialEmail={email} />;
      case 'code':
        return (
          <CodeStep
            email={email}
            initialCode={code}
            onSubmit={handleCodeSubmit}
            onBack={() => {
              if (phase === 'flow' && !isUserExisting) {
                setStep('email');
                setPhase('email');
              } else {
                setStep('existing-user');
              }
            }}
            isLoading={loading}
            error={error}
          />
        );
      case 'profile':
        return (
          <ProfileStep
            initialFirst={firstName}
            initialLast={lastName}
            initialBirthDate={birthDate}
            initialGender={gender}
            onSubmit={handleProfileSubmit}
            onBack={() => {
              setStep('email');
              setPhase('email');
            }}
            isLoading={loading}
            error={error}
          />
        );
      case 'password':
        return (
          <PasswordStep
            onSubmit={handlePasswordRegister}
            onBack={() => setStep('profile')}
            isLoading={loading}
            error={error}
          />
        );
      case 'existing-user':
        return (
          <ExistingUserStep
            email={email}
            firstName={firstName}
            gender={gender}
            onSubmit={handleLogin}
            onBack={() => {
              setStep('email');
              setPhase('email');
            }}
            onForgotPassword={handleForgotPassword}
            isLoading={loading}
            error={error}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleClose}
        contentContainerStyle={[styles.modal, { backgroundColor: '#0F172A' }]}
      >
        <View style={styles.header}>
          <Text variant="titleLarge" style={styles.title}>{getTitle()}</Text>
          <IconButton icon="close" onPress={handleClose} style={styles.closeButton} />
        </View>

        {phase === 'flow' && (
          <Stepper currentStep={step} steps={currentSteps} isLoading={loading} />
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0} // Adjust based on header height
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {renderContent()}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    marginVertical: 40,
    borderRadius: 12,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
