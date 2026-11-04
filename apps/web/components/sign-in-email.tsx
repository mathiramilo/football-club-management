'use client';

import { createContext, use, useState } from 'react';

interface SentCode {
  email: string;
  sentAt: number;
}

const SignInEmailContext = createContext<{
  email: string;
  setEmail: (email: string) => void;
  sentCode: SentCode | null;
  setSentCode: (sentCode: SentCode) => void;
} | null>(null);

export function SignInEmailProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('');
  const [sentCode, setSentCode] = useState<SentCode | null>(null);

  return (
    <SignInEmailContext value={{ email, setEmail, sentCode, setSentCode }}>
      {children}
    </SignInEmailContext>
  );
}

export function useSignInEmail() {
  const context = use(SignInEmailContext);
  if (!context) throw new Error('useSignInEmail needs a SignInEmailProvider');
  return context;
}
