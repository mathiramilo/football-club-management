import archivoBold from '@repo/ui-tokens/fonts/Archivo-Bold.ttf';
import archivoExtraBold from '@repo/ui-tokens/fonts/Archivo-ExtraBold.ttf';
import archivoRegular from '@repo/ui-tokens/fonts/Archivo-Regular.ttf';
import archivoSemiBold from '@repo/ui-tokens/fonts/Archivo-SemiBold.ttf';
import archivoExpandedBlack from '@repo/ui-tokens/fonts/ArchivoExpanded-Black.ttf';
import archivoSemiExpandedExtraBold from '@repo/ui-tokens/fonts/ArchivoSemiExpanded-ExtraBold.ttf';
import { useFonts } from 'expo-font';

export function useAppFonts() {
  return useFonts([
    {
      fontFamily: 'Archivo',
      fontDefinitions: [
        { path: archivoRegular, weight: 400 },
        { path: archivoSemiBold, weight: 600 },
        { path: archivoBold, weight: 700 },
        { path: archivoExtraBold, weight: 800 },
      ],
    },
    {
      fontFamily: 'ArchivoSemiExpanded',
      fontDefinitions: [{ path: archivoSemiExpandedExtraBold, weight: 800 }],
    },
    {
      fontFamily: 'ArchivoExpanded',
      fontDefinitions: [{ path: archivoExpandedBlack, weight: 900 }],
    },
  ]);
}
