import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Modal, Portal, Text, IconButton, useTheme } from 'react-native-paper';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { useLoginModal } from '../context/LoginModalContext';
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
  const { pendingAction, clearPendingAction, entry } = useLoginModal();
  const theme = useTheme();

  // State
  const [step, setStep] = useState<StepKey>('email');
  const [isUserExisting, setIsUserExisting] = useState(false);
  const [phase, setPhase] = useState<'email' | 'flow'>('email');
  /**
   * The last step is done when the password is accepted, not when it is shown.
   * Without this the bar would be full while the form is still empty, and the
   * one moment the sign-up is actually finished would have nothing to show.
   */
  const [flowComplete, setFlowComplete] = useState(false);
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
    setFlowComplete(false);
    clearPendingAction();
  };

  const currentSteps = isUserExisting ? ALL_STEPS.existing : ALL_STEPS.new;

  const handleClose = () => {
    onDismiss();
    // setTimeout(reset, 300); // Reset after closing animation? No need, useEffect handles it
  };

  const getTitle = () => {
    if (phase === 'email') return '¡Bienvenid@ a La Guía!';
    if (isUserExisting && step === 'existing-user') return 'Iniciar sesión';
    if (!isUserExisting && step === 'email') return 'Acceder / Registrarse'; // Should not happen since phase moves to flow
    if (step === 'code') return 'Verificar correo'; // or 'Recuperar contraseña' if forgot
    if (step === 'profile') return 'Completa tu perfil';
    if (step === 'password') return 'Creá tu contraseña'; // or 'Nueva contraseña'
    return '';
  };

  // --- Auth success helper ---
  // Called after every successful login/register. Executes any pending action
  // (e.g. subscribe to a program) that was queued before the user authenticated.
  const handleAuthSuccess = async (
    accessToken: string,
    refreshToken: string,
    holdFor?: Promise<unknown>,
  ) => {
    await login(accessToken, refreshToken);
    if (pendingAction) {
      try {
        await pendingAction(accessToken);
      } catch (err) {
        console.error('[LoginModal] pendingAction failed:', err);
      }
      clearPendingAction();
    }
    // Runs alongside the work above rather than after it, so whatever the
    // caller wants seen gets its moment without anybody waiting twice.
    if (holdFor) await holdFor;
    handleClose();
  };

  // --- Handlers ---

  /**
   * A screen that already has an e-mail field hands it over here, so the
   * reader is not asked for the same thing twice. Guarded by a ref: the
   * effect must fire once per opening and not on every re-render of a flow
   * that is already under way.
   */
  const handedOver = useRef(false);
  useEffect(() => {
    if (!visible) {
      handedOver.current = false;
      return;
    }
    if (handedOver.current) return;

    if (entry.initialEmail) {
      handedOver.current = true;
      setEmail(entry.initialEmail);
      void handleEmailSubmit(entry.initialEmail);
    } else if (entry.social === 'google') {
      handedOver.current = true;
      void handleGoogleLogin();
    } else if (entry.social === 'apple') {
      handedOver.current = true;
      void handleAppleLogin();
    }
    // The handlers are recreated on every render; the ref is what keeps this
    // from running twice, so they are deliberately not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, entry]);

  /**
   * Back to the e-mail step with the address still in hand — what "Cambiar
   * correo" means, and where the header arrow goes from the first step.
   */
  const returnToEmail = () => {
    setError('');
    setCode('');
    setStep('email');
    setPhase('email');
  };

  /** One step back, along the same path each step's own button takes. */
  const goBack = () => {
    setError('');
    const index = currentSteps.indexOf(step);
    if (index <= 0) return returnToEmail();
    /**
     * Landing on the e-mail step means leaving the flow, not just moving the
     * cursor: the e-mail field renders in the other phase, so setting the step
     * alone left the panel with nothing in it.
     */
    const previous = currentSteps[index - 1];
    if (previous === 'email') return returnToEmail();
    setStep(previous);
  };

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
        await handleAuthSuccess(response.access_token, response.refresh_token);
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
        await handleAuthSuccess(response.access_token, response.refresh_token);
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
        await handleAuthSuccess(response.access_token, response.refresh_token);
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

        await handleAuthSuccess(response.access_token, response.refresh_token);
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

      trackEvent('signup_success', { method: 'traditional' });
      // Here is where the sign-up is finished, which is the one place the bar
      // has to reach the end.
      setFlowComplete(true);
      await handleAuthSuccess(
        response.access_token,
        response.refresh_token,
        new Promise((r) => setTimeout(r, 420)),
      );
    } catch (err: any) {
      setFlowComplete(false);
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
      await handleAuthSuccess(response.access_token, response.refresh_token);
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
            onChangeEmail={returnToEmail}
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
        contentContainerStyle={[
          entry.panel ? styles.panel : styles.modal,
          { backgroundColor: entry.panel ? '#141C30' : '#0F172A' },
        ]}
      >
        <View style={styles.header}>
          {/* A way back that is not the way out: the cross closes the whole
              thing, which is not what somebody who mistyped their e-mail
              wants. Only once there is a step to go back to. */}
          {phase === 'flow' && (
            <IconButton
              icon="arrow-left"
              onPress={goBack}
              accessibilityLabel="Volver"
              style={styles.backButton}
            />
          )}
          <Text variant="titleLarge" style={styles.title}>{getTitle()}</Text>
          <IconButton icon="close" onPress={handleClose} style={styles.closeButton} />
        </View>

        {phase === 'flow' && !isUserExisting && (
          <Stepper
            style={styles.stepper}
            currentStep={step}
            steps={currentSteps}
            complete={flowComplete}
            isLoading={loading}
          />
        )}

        {/* No `flex: 1` on either of these. Claiming the height here is what
            would let a step pin its button to the bottom edge, but inside the
            modal of react-native-paper that nesting collapses on iOS and takes
            the whole form with it — the panel renders as an empty box under
            the title. Android survives it, which is why it took a device to
            see. The button sits under the content instead. */}
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
  /**
   * For a screen whose own panel is what opened this: hinged to the bottom
   * edge, full height, same corners. It reads as that panel growing rather
   * than as a card appearing over it.
   */
  panel: {
    /**
     * Explicit, because the two platforms disagreed without it: the content
     * does not claim the panel's height —that nesting collapses the form on
     * iOS— so Android was centring it and leaving a hole above the header
     * while iOS started at the top. The form belongs at the top on both.
     */
    justifyContent: 'flex-start',
    marginTop: 60,
    marginHorizontal: 0,
    marginBottom: 0,
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 10 : 24,
    paddingBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  backButton: {
    margin: 0,
    marginLeft: -8,
  },
  closeButton: {
    margin: 0,
  },
  stepper: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});
