import './global.css';

import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { useAppFonts } from '@/lib/fonts';

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="auto" />
    </View>
  );
}
