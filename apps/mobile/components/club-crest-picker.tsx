import { Image } from 'expo-image';
import { ImagePlusIcon, ShieldIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { pickCrest, type PreparedCrest } from '@/lib/club-crest';

type CrestMessage =
  'label' | 'hint' | 'preview' | 'preparing' | 'change' | 'choose' | 'remove' | 'unreadable';

export function ClubCrestPicker({
  previewUri,
  disabled = false,
  onSelect,
  onRemove,
}: {
  previewUri: string | null;
  disabled?: boolean;
  onSelect: (crest: PreparedCrest) => void;
  onRemove: () => void;
}) {
  const intl = useIntl();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUnreadable, setIsUnreadable] = useState(false);
  const t = (id: CrestMessage) => intl.formatMessage({ id: `createClub.crest.${id}` });

  const choose = async () => {
    setIsPreparing(true);
    setIsUnreadable(false);
    const result = await pickCrest();
    setIsPreparing(false);
    if (result.status === 'picked') onSelect(result.crest);
    if (result.status === 'unreadable') setIsUnreadable(true);
  };

  return (
    <View className="gap-2">
      <FieldLabel>{t('label')}</FieldLabel>
      <View className="flex-row items-center gap-4">
        <View className="size-20 items-center justify-center overflow-hidden rounded-tile bg-muted">
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              accessibilityLabel={t('preview')}
              contentFit="contain"
              style={{ width: 68, height: 68 }}
            />
          ) : (
            <Icon as={ShieldIcon} className="size-9 text-subtle-foreground" />
          )}
        </View>
        <View className="flex-1 items-start gap-1">
          <Button
            variant="secondary"
            disabled={disabled || isPreparing}
            onPress={() => void choose()}
          >
            {isPreparing ? <ActivityIndicator /> : <Icon as={ImagePlusIcon} />}
            <Text>{isPreparing ? t('preparing') : t(previewUri ? 'change' : 'choose')}</Text>
          </Button>
          {previewUri && (
            <Button variant="link" size="sm" disabled={disabled} onPress={onRemove}>
              <Text>{t('remove')}</Text>
            </Button>
          )}
        </View>
      </View>
      <FieldDescription>{t('hint')}</FieldDescription>
      {isUnreadable && <FieldError>{t('unreadable')}</FieldError>}
    </View>
  );
}
