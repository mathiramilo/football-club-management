import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import messages from '@repo/i18n/messages/es.json';
import { clubTheme } from '@repo/ui-tokens';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';

import { getInvitePreview } from '@/lib/invite-preview';

export const alt = messages.app.name;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const fonts = join(process.cwd(), '../../packages/ui-tokens/fonts');
const [display, body] = await Promise.all([
  readFile(join(fonts, 'ArchivoExpanded-Black.ttf')),
  readFile(join(fonts, 'Archivo-Regular.ttf')),
]);

const stripes = Array.from({ length: 20 }, (_, index) => index);

async function crestDataUrl(url: string | undefined) {
  if (!url) return null;
  const response = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!response?.ok) return null;
  const png = await sharp(Buffer.from(await response.arrayBuffer()))
    .png()
    .toBuffer()
    .catch(() => null);
  return png && `data:image/png;base64,${png.toString('base64')}`;
}

export default async function InviteImage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await getInvitePreview(token);
  const club = preview?.club;
  const crest = await crestDataUrl(club?.crest?.url);
  const heading = preview
    ? messages.invite.imageHeading.replace('{category}', preview.category.name)
    : messages.app.name;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: clubTheme(club?.primaryColor).club,
        color: 'white',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        {stripes.map((stripe) => (
          <div
            key={stripe}
            style={{
              width: 60,
              height: '100%',
              background: stripe % 2 === 1 ? 'rgba(255, 255, 255, 0.07)' : 'transparent',
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          width: '100%',
        }}
      >
        <div
          style={{
            width: 180,
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 32,
            background: 'rgba(255, 255, 255, 0.15)',
          }}
        >
          {crest && (
            <img src={crest} alt="" width={156} height={156} style={{ objectFit: 'contain' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontFamily: 'Archivo Expanded', fontSize: 72, lineHeight: 1.05 }}>
            {heading}
          </div>
          {club && (
            <div style={{ fontFamily: 'Archivo', fontSize: 40, opacity: 0.85 }}>{club.name}</div>
          )}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Archivo Expanded', data: display, weight: 900, style: 'normal' },
        { name: 'Archivo', data: body, weight: 400, style: 'normal' },
      ],
    },
  );
}
