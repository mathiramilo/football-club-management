import { Image } from 'expo-image';
import { CameraIcon, UserRoundIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { pickSquarePhoto, type PreparedPhoto } from '@/lib/profile-photo';

type PhotoMessage = 'preview' | 'preparing' | 'change' | 'choose' | 'remove' | 'unreadable';

export function ProfilePhotoPicker({
  previewUri,
  cacheKey,
  disabled = false,
  onSelect,
  onRemove,
}: {
  previewUri: string | null;
  cacheKey?: string;
  disabled?: boolean;
  onSelect: (photo: PreparedPhoto) => void;
  onRemove: () => void;
}) {
  const intl = useIntl();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isUnreadable, setIsUnreadable] = useState(false);
  const t = (id: PhotoMessage) => intl.formatMessage({ id: `profileCompletion.photo.${id}` });

  const choose = async () => {
    setIsPreparing(true);
    setIsUnreadable(false);
    const result = await pickSquarePhoto();
    setIsPreparing(false);
    if (result.status === 'picked') onSelect(result.photo);
    if (result.status === 'unreadable') setIsUnreadable(true);
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-4">
        <View className="size-20 items-center justify-center overflow-hidden rounded-full bg-muted">
          {previewUri ? (
            <Image
              source={{ uri: previewUri, cacheKey }}
              accessibilityLabel={t('preview')}
              contentFit="cover"
              style={{ width: 80, height: 80 }}
            />
          ) : (
            <Icon as={UserRoundIcon} className="size-9 text-subtle-foreground" />
          )}
        </View>
        <View className="flex-1 items-start gap-1">
          <Button
            variant="secondary"
            disabled={disabled || isPreparing}
            onPress={() => void choose()}
          >
            {isPreparing ? <ActivityIndicator /> : <Icon as={CameraIcon} />}
            <Text>{isPreparing ? t('preparing') : t(previewUri ? 'change' : 'choose')}</Text>
          </Button>
          {previewUri && (
            <Button variant="link" size="sm" disabled={disabled} onPress={onRemove}>
              <Text>{t('remove')}</Text>
            </Button>
          )}
        </View>
      </View>
      {isUnreadable && <FieldError>{t('unreadable')}</FieldError>}
    </View>
  );
}
