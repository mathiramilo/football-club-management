import {
  ApiError,
  getProfileGetQueryKey,
  type ProfileResponse,
  useProfilePhotoRemove,
} from '@repo/api-client';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Alert, View } from 'react-native';

import { ProfilePhotoPicker } from '@/components/profile-photo-picker';
import { Banner } from '@/components/ui/banner';
import { Text } from '@/components/ui/text';
import { errorMessageKey, type MessageKey } from '@/lib/i18n';
import { useProfile } from '@/lib/profile';
import { type PreparedPhoto, uploadProfilePhoto } from '@/lib/profile-photo';
import { queryClient } from '@/lib/query-client';

export function ProfilePhotoSection() {
  const intl = useIntl();
  const { data: profile } = useProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<MessageKey | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const t = (id: MessageKey) => intl.formatMessage({ id });

  const show = (result: ProfileResponse, message: MessageKey) => {
    queryClient.setQueryData(getProfileGetQueryKey(), result);
    setStatus(message);
    setError(null);
  };
  const remove = useProfilePhotoRemove({
    mutation: {
      onSuccess: (result) => {
        show(result, 'profile.photo.removed');
      },
      onError: (failure) => {
        setError(errorMessageKey(failure.code));
      },
    },
  });

  const upload = async (photo: PreparedPhoto) => {
    setIsUploading(true);
    setStatus(null);
    try {
      show(await uploadProfilePhoto(photo.blob), 'profile.photo.saved');
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? errorMessageKey(failure.code)
          : 'profileCompletion.photo.unreadable',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const confirmRemove = () => {
    Alert.alert(t('profile.photo.confirmRemove'), undefined, [
      { text: t('profile.photo.cancel'), style: 'cancel' },
      {
        text: t('profile.photo.confirm'),
        style: 'destructive',
        onPress: () => {
          remove.mutate();
        },
      },
    ]);
  };

  if (!profile) return null;

  return (
    <View className="gap-3">
      <Text role="heading" className="font-heading text-section">
        {t('profile.photo.title')}
      </Text>
      <ProfilePhotoPicker
        previewUri={profile.photo?.thumbnailUrl ?? null}
        cacheKey={profile.photo ? `profile-photo-${profile.photo.id}` : undefined}
        disabled={isUploading || remove.isPending}
        onSelect={(photo) => void upload(photo)}
        onRemove={confirmRemove}
      />
      {(isUploading || status !== null || !profile.photo) && (
        <Text accessibilityLiveRegion="polite" className="text-meta text-subtle-foreground">
          {isUploading
            ? t('profileCompletion.photo.preparing')
            : status
              ? t(status)
              : t('profile.photo.none')}
        </Text>
      )}
      {error && (
        <Banner variant="danger" role="alert">
          <Text>{t(error)}</Text>
        </Banner>
      )}
    </View>
  );
}
