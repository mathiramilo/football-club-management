import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { styled } from 'nativewind';
import { use } from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

function IconGlyph({ as: Glyph, ...props }: LucideProps & { as: LucideIcon }) {
  return <Glyph {...props} />;
}

const StyledIcon = styled(IconGlyph, {
  className: { target: 'style', nativeStyleMapping: { color: 'color', height: 'size' } },
});

export function Icon({
  className,
  ...props
}: React.ComponentProps<typeof StyledIcon> & { className?: string }) {
  const inheritedClassName = use(TextClassContext);

  return (
    <StyledIcon
      aria-hidden
      className={cn('size-5 text-foreground', inheritedClassName, className)}
      {...props}
    />
  );
}
