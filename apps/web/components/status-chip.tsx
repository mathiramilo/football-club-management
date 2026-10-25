import { CheckIcon, CircleHelpIcon, ClockIcon, XIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

const toneIcons = {
  success: CheckIcon,
  danger: XIcon,
  warning: ClockIcon,
  neutral: CircleHelpIcon,
};

export type StatusTone = keyof typeof toneIcons;

export function StatusChip({
  tone,
  size,
  children,
}: {
  tone: StatusTone;
  size?: 'md' | 'sm';
  children: React.ReactNode;
}) {
  const Icon = toneIcons[tone];

  return (
    <Badge variant={tone} size={size}>
      <Icon aria-hidden="true" strokeWidth={2.8} />
      {children}
    </Badge>
  );
}
