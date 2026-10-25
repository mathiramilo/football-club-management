import localFont from 'next/font/local';

export const archivo = localFont({
  src: [
    { path: '../../../packages/ui-tokens/fonts/Archivo-Regular.woff2', weight: '400' },
    { path: '../../../packages/ui-tokens/fonts/Archivo-SemiBold.woff2', weight: '600' },
    { path: '../../../packages/ui-tokens/fonts/Archivo-Bold.woff2', weight: '700' },
    { path: '../../../packages/ui-tokens/fonts/Archivo-ExtraBold.woff2', weight: '800' },
  ],
  variable: '--font-archivo',
  display: 'swap',
});

export const archivoSemiExpanded = localFont({
  src: '../../../packages/ui-tokens/fonts/ArchivoSemiExpanded-ExtraBold.woff2',
  weight: '800',
  variable: '--font-archivo-semi-expanded',
  display: 'swap',
});

export const archivoExpanded = localFont({
  src: '../../../packages/ui-tokens/fonts/ArchivoExpanded-Black.woff2',
  weight: '900',
  variable: '--font-archivo-expanded',
  display: 'swap',
});
