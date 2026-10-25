import { clubTheme, clubThemeVariables } from '@repo/ui-tokens';

export function ClubTheme({
  primaryColor,
  className,
  children,
}: {
  primaryColor: string | null | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className} style={clubThemeVariables(clubTheme(primaryColor))}>
      {children}
    </div>
  );
}
