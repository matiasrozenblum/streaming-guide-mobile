import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LoginModalContextType {
    visible: boolean;
    show: () => void;
    hide: () => void;
}

const LoginModalContext = createContext<LoginModalContextType>({
    visible: false,
    show: () => {},
    hide: () => {},
});

export function LoginModalProvider({ children }: { children: ReactNode }) {
    const [visible, setVisible] = useState(false);

    return (
        <LoginModalContext.Provider value={{
            visible,
            show: () => setVisible(true),
            hide: () => setVisible(false),
        }}>
            {children}
        </LoginModalContext.Provider>
    );
}

export function useLoginModal() {
    return useContext(LoginModalContext);
}
