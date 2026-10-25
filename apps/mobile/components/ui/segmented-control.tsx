import { createContext, use } from 'react';
import { Pressable, View } from 'react-native';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const SegmentedControlContext = createContext<{
  value: string | undefined;
  onValueChange: (value: string) => void;
}>({ value: undefined, onValueChange: () => undefined });

export function SegmentedControl({
  className,
  value,
  onValueChange,
  ...props
}: React.ComponentProps<typeof View> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <SegmentedControlContext value={{ value, onValueChange }}>
      <View
        accessibilityRole="radiogroup"
        className={cn('flex-row gap-1 rounded-full bg-secondary p-1', className)}
        {...props}
      />
    </SegmentedControlContext>
  );
}

export function SegmentedControlItem({
  className,
  value,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, 'onPress'> & { value: string }) {
  const context = use(SegmentedControlContext);
  const checked = context.value === value;

  return (
    <TextClassContext
      value={cn(
        'text-center text-body-sm',
        checked ? 'font-extrabold text-foreground' : 'font-semibold text-muted-foreground',
      )}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked }}
        onPress={() => {
          context.onValueChange(value);
        }}
        className={cn(
          'min-h-11 flex-1 items-center justify-center rounded-full px-3 py-2',
          checked && 'bg-background shadow-raised',
          className,
        )}
        {...props}
      />
    </TextClassContext>
  );
}
