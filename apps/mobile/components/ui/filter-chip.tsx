import { Pressable } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function FilterChip({
  className,
  pressed,
  onPressedChange,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, 'onPress'> & {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <TextClassContext
      value={cn('text-meta font-bold', pressed ? 'text-background' : 'text-secondary-foreground')}
    >
      <Pressable
        accessibilityRole="togglebutton"
        accessibilityState={{ checked: pressed }}
        hitSlop={2}
        onPress={() => {
          onPressedChange(!pressed);
        }}
        className={cn(
          'min-h-10 flex-row items-center gap-1.5 self-start rounded-full px-4 py-2',
          pressed ? 'bg-foreground' : 'bg-secondary active:bg-border',
          className,
        )}
        {...props}
      />
    </TextClassContext>
  );
}
