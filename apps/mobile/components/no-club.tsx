import { Link } from 'expo-router';
import { ChevronRightIcon, LinkIcon, ShieldPlusIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { Pressable, View } from 'react-native';

import { ClubStripes } from '@/components/club-stripes';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

type NoClubMessage =
  'title' | 'body' | 'create.title' | 'create.body' | 'invite.title' | 'invite.body';

export function NoClub() {
  const intl = useIntl();
  const t = (id: NoClubMessage) => intl.formatMessage({ id: `home.noClub.${id}` });

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text role="heading" className="font-heading text-card-title">
          {t('title')}
        </Text>
        <Text className="text-muted-foreground">{t('body')}</Text>
      </View>
      <Link href="/create-club" asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('create.title')}
          accessibilityHint={t('create.body')}
          className="flex-row items-center gap-4 overflow-hidden rounded-tile bg-club p-4 active:opacity-90"
        >
          <ClubStripes />
          <View className="size-12 items-center justify-center rounded-field bg-white/15">
            <Icon as={ShieldPlusIcon} className="size-6 text-white" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="font-heading text-action text-white">{t('create.title')}</Text>
            <Text className="text-body-sm text-white/80">{t('create.body')}</Text>
          </View>
          <Icon as={ChevronRightIcon} className="text-white" />
        </Pressable>
      </Link>
      <View className="flex-row items-start gap-4 rounded-tile bg-muted p-4">
        <View className="size-12 items-center justify-center rounded-field bg-background">
          <Icon as={LinkIcon} className="size-6 text-muted-foreground" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text role="heading" className="font-heading text-action">
            {t('invite.title')}
          </Text>
          <Text className="text-body-sm text-muted-foreground">{t('invite.body')}</Text>
        </View>
      </View>
    </View>
  );
}
