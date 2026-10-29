import { ClubHeader } from '@/components/club-header';
import { DownloadAppBanner } from '@/components/download-app-banner';

export function TabPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <ClubHeader title={title} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-6 pb-28">
        {children}
        <DownloadAppBanner />
      </main>
    </>
  );
}
