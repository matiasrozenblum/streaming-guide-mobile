import React, { createContext, useContext, useState, ReactNode } from 'react';

export type PendingAction = (accessToken: string) => Promise<void>;

interface LoginModalContextType {
    visible: boolean;
    show: (onSuccess?: PendingAction) => void;
    hide: () => void;
    pendingAction: PendingAction | null;
    clearPendingAction: () => void;
}

const LoginModalContext = createContext<LoginModalContextType>({
    visible: false,
    show: () => {},
    hide: () => {},
    pendingAction: null,
    clearPendingAction: () => {},
});

export function LoginModalProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const show = (onSuccess?: PendingAction) => {
        if (onSuccess) {
            setPendingAction(() => onSuccess);
        }
        setVisible(true);
    };

    const clearPendingAction = () => setPendingAction(null);

    return (
        <LoginModalContext.Provider value={{
            visible,
            show,
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
