import { getLegalDocumentsGetQueryKey, useLegalDocumentsAccept } from '@repo/api-client';
import * as WebBrowser from 'expo-web-browser';
import { ChevronRightIcon, FileTextIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { ClubHeader } from '@/components/club-header';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { signOut } from '@/lib/auth-client';
import { errorMessageKey } from '@/lib/i18n';
import { legalDocumentUrl, pendingAcceptances, useLegalDocuments } from '@/lib/legal-acceptance';
import { queryClient, useIsOnline } from '@/lib/query-client';
import { cn } from '@/lib/utils';

const documents = ['terms', 'privacy'] as const;

async function openDocument(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    return;
  }
}

export default function LegalAcceptanceScreen() {
  const intl = useIntl();
  const isOnline = useIsOnline();
  const { data } = useLegalDocuments();
  const queryKey = getLegalDocumentsGetQueryKey();
  const accept = useLegalDocumentsAccept({
    mutation: {
      networkMode: 'always',
      onSuccess: (status) => {
        queryClient.setQueryData(queryKey, status);
      },
      onError: (error) => {
        if (error.code === 'LEGAL_DOCUMENT_OUTDATED')
          void queryClient.invalidateQueries({ queryKey });
      },
    },
  });

  if (!data?.acceptanceRequired) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const pending = pendingAcceptances(data.documents);
  const isUpdate = data.documents.every(
    ({ acceptanceRequired, acceptedVersion }) => !acceptanceRequired || acceptedVersion !== null,
  );
  const [first, second] = pending;
  const changed = first && !second ? first.document : 'both';
  const links = documents.flatMap((document) => {
    const url = legalDocumentUrl(document);
    return url ? [{ document, url }] : [];
  });

  return (
    <View className="flex-1 bg-background">
      <ClubHeader
        title={intl.formatMessage({
          id: isUpdate ? 'legalAcceptance.updatedTitle' : 'legalAcceptance.title',
        })}
        size="screen"
      />
      <ScrollView contentContainerClassName="gap-6 px-5 py-6">
        <Text className="text-body">
          {isUpdate
            ? intl.formatMessage({ id: 'legalAcceptance.updatedBody' }, { changed })
            : intl.formatMessage({ id: 'legalAcceptance.body' })}
        </Text>
        {links.length > 0 && (
          <View className="overflow-hidden rounded-card border border-border bg-card">
            {links.map(({ document, url }, index) => (
              <Pressable
                key={document}
                accessibilityRole="link"
                onPress={() => void openDocument(url)}
                className={cn(
                  'min-h-14 flex-row items-center gap-3 px-4 py-3 active:bg-muted',
                  index > 0 && 'border-t border-border',
                )}
              >
                <Icon as={FileTextIcon} className="text-club" />
                <Text className="flex-1 text-body font-bold">
                  {intl.formatMessage({ id: `legalAcceptance.documents.${document}` })}
                </Text>
                <Icon as={ChevronRightIcon} className="text-subtle-foreground" />
              </Pressable>
            ))}
          </View>
        )}
        {!isOnline ? (
          <Banner variant="neutral">
            <Text>{intl.formatMessage({ id: 'legalAcceptance.offline' })}</Text>
          </Banner>
        ) : (
          accept.error && (
            <Banner variant="danger" role="alert">
              <Text>{intl.formatMessage({ id: errorMessageKey(accept.error.code) })}</Text>
            </Banner>
          )
        )}
        <View className="gap-2">
          <Button
            disabled={!isOnline || accept.isPending || pending.length === 0}
            onPress={() => {
              accept.mutate({ data: { documents: pending } });
            }}
          >
            {accept.isPending && <ActivityIndicator />}
            <Text>{intl.formatMessage({ id: 'legalAcceptance.accept' })}</Text>
          </Button>
          <Button variant="link" onPress={() => void signOut()}>
            <Text>{intl.formatMessage({ id: 'legalAcceptance.signOut' })}</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
