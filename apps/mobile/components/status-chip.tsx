import { CheckIcon, CircleHelpIcon, ClockIcon, XIcon } from 'lucide-react-native';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const toneIcons = {
  success: CheckIcon,
  danger: XIcon,
  warning: ClockIcon,
  neutral: CircleHelpIcon,
};

export type StatusTone = keyof typeof toneIcons;

export function StatusChip({
  tone,
  size = 'md',
  children,
}: {
  tone: StatusTone;
  size?: 'md' | 'sm';
  children: string;
}) {
  return (
    <Badge variant={tone} size={size}>
      <Icon
        as={toneIcons[tone]}
        strokeWidth={2.8}
        className={size === 'md' ? 'size-4' : 'size-3.5'}
      />
      <Text>{children}</Text>
    </Badge>
  );
}
