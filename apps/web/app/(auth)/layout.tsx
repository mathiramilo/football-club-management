import { SignInEmailProvider } from '@/components/sign-in-email';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <SignInEmailProvider>{children}</SignInEmailProvider>;
}
