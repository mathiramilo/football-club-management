import './globals.css';

import { cn } from '@/lib/utils';

import { archivo, archivoExpanded, archivoSemiExpanded } from './fonts';

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={cn(archivo.variable, archivoSemiExpanded.variable, archivoExpanded.variable)}
    >
      <body>{children}</body>
    </html>
  );
}
