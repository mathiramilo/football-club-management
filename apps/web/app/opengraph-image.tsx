import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import messages from '@repo/i18n/messages/es.json';
import { neutralClubColor } from '@repo/ui-tokens';
import { ImageResponse } from 'next/og';

export const alt = messages.app.name;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const fonts = join(process.cwd(), '../../packages/ui-tokens/fonts');
const [display, body] = await Promise.all([
  readFile(join(fonts, 'ArchivoExpanded-Black.ttf')),
  readFile(join(fonts, 'Archivo-Regular.ttf')),
]);

const stripes = Array.from({ length: 20 }, (_, index) => index);

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: neutralClubColor,
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
          justifyContent: 'flex-end',
          gap: 24,
          padding: 80,
          width: '100%',
        }}
      >
        <div style={{ fontFamily: 'Archivo Expanded', fontSize: 84, lineHeight: 1 }}>
          {messages.app.name}
        </div>
        <div style={{ fontFamily: 'Archivo', fontSize: 36, opacity: 0.8 }}>
          {messages.app.description}
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
