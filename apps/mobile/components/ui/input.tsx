import { colors } from '@repo/ui-tokens';
import { TextInput } from 'react-native';

import { cn } from '@/lib/utils';

export function Input({
  className,
  invalid = false,
  ...props
}: React.ComponentProps<typeof TextInput> & { invalid?: boolean }) {
  return (
    <TextInput
      placeholderTextColor={colors.subtleForeground}
      className={cn(
        'min-h-14 rounded-field border-2 border-transparent bg-muted px-4 py-3 font-sans text-body text-foreground focus:border-primary focus:bg-background',
        invalid && 'border-danger bg-background',
        className,
      )}
      {...props}
    />
  );
}
