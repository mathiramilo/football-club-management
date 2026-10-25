import { createCn } from 'cn/config';

export const textStyles = [
  'display',
  'title',
  'title-sm',
  'card-title',
  'section',
  'action-lg',
  'action',
  'action-sm',
  'body',
  'body-sm',
  'meta',
  'caption',
] as const;

export const radii = ['field', 'banner', 'tile', 'header', 'card'] as const;

export const shadows = ['raised', 'card'] as const;

export type TextStyle = (typeof textStyles)[number];

export const cn = createCn({
  extend: {
    theme: { text: [...textStyles], radius: [...radii], shadow: [...shadows] },
  },
});
