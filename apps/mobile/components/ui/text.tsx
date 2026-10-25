import { createContext, use } from 'react';
import { Text as NativeText } from 'react-native';

import { cn } from '@/lib/utils';

export const TextClassContext = createContext<string | undefined>(undefined);

const displayMaxFontSizeMultiplier = 1.4;

export function Text({ className, ...props }: React.ComponentProps<typeof NativeText>) {
  const inheritedClassName = use(TextClassContext);
  const mergedClassName = cn('font-sans text-body text-foreground', inheritedClassName, className);
  const isDisplay = mergedClassName.split(' ').includes('font-display');

  return (
    <NativeText
      maxFontSizeMultiplier={isDisplay ? displayMaxFontSizeMultiplier : undefined}
      className={mergedClassName}
      {...props}
    />
  );
}
