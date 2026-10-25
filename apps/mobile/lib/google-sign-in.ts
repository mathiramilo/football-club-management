import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export const isGoogleSignInAvailable =
  Boolean(webClientId) && (Platform.OS !== 'ios' || Boolean(iosClientId));

if (isGoogleSignInAvailable) {
  GoogleSignin.configure({ webClientId, iosClientId });
}

export async function signOutOfGoogle() {
  if (isGoogleSignInAvailable) await GoogleSignin.signOut();
}
