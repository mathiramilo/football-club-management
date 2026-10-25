import { ScrollView, View } from 'react-native';

import { ClubHeader } from '@/components/club-header';
import { OfflineBanner } from '@/components/offline-banner';

export function TabScreen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <ClubHeader title={title} />
      <OfflineBanner />
      <ScrollView contentContainerClassName="gap-6 px-5 py-6">{children}</ScrollView>
    </View>
  );
}
