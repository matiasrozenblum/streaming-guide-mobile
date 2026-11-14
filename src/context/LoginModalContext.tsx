import React, { createContext, useContext, useState, ReactNode } from 'react';

export type PendingAction = (accessToken: string) => Promise<void>;

/**
 * How the sign-in was reached, for the places that already asked something.
 *
 * `initialEmail` comes from a screen that has its own e-mail field — the
 * signed-out recap — so the modal can carry on from there instead of asking
 * for it a second time.
 */
export interface LoginEntry {
    initialEmail?: string;
    social?: 'google' | 'apple';
    /** Bottom-anchored and full height, for a screen whose panel is growing. */
    panel?: boolean;
}

interface LoginModalContextType {
    visible: boolean;
    show: (onSuccess?: PendingAction, entry?: LoginEntry) => void;
    entry: LoginEntry;
    hide: () => void;
    pendingAction: PendingAction | null;
    clearPendingAction: () => void;
}

const LoginModalContext = createContext<LoginModalContextType>({
    visible: false,
    show: () => {},
    entry: {},
    hide: () => {},
    pendingAction: null,
    clearPendingAction: () => {},
});

export function LoginModalProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [entry, setEntry] = useState<LoginEntry>({});

    const show = (onSuccess?: PendingAction, nextEntry: LoginEntry = {}) => {
        if (onSuccess) {
            setPendingAction(() => onSuccess);
        }
        setEntry(nextEntry);
        setVisible(true);
    };

    const clearPendingAction = () => setPendingAction(null);

    return (
        <LoginModalContext.Provider value={{
            visible,
            show,
            entry,
            hide: () => setVisible(false),
            pendingAction,
            clearPendingAction,
        }}>
            {children}
        </LoginModalContext.Provider>
    );
}

export function useLoginModal() {
    return useContext(LoginModalContext);
}
