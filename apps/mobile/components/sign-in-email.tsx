import { createContext, use, useState } from 'react';

const SignInEmailContext = createContext<{
  email: string;
  setEmail: (email: string) => void;
} | null>(null);

export function SignInEmailProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('');

  return <SignInEmailContext value={{ email, setEmail }}>{children}</SignInEmailContext>;
}

export function useSignInEmail() {
  const context = use(SignInEmailContext);
  if (!context) throw new Error('useSignInEmail needs a SignInEmailProvider');
  return context;
}
