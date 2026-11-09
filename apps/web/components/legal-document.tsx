import legal from '@repo/i18n/legal/es.json';

import { ClubHeader } from '@/components/club-header';
import { Alert, AlertContent } from '@/components/ui/alert';

export type LegalDocumentName = 'terms' | 'privacy';

export function LegalDocument({ document }: { document: LegalDocumentName }) {
  const { title, inForceSince, sections } = legal[document];

  return (
    <>
      <ClubHeader title={title} subtitle={inForceSince} size="screen" />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-6">
        <Alert variant="warning" role="note">
          <AlertContent>{legal.draftNotice}</AlertContent>
        </Alert>
        {sections.map(({ heading, paragraphs }) => (
          <section key={heading} className="flex flex-col gap-2">
            <h2 className="font-heading text-section">{heading}</h2>
            {paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-body text-pretty">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </main>
    </>
  );
}
