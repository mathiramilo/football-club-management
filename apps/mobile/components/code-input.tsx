import { TextInput, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export const codeLength = 6;

const positions = Array.from({ length: codeLength }, (_, index) => index);

export function CodeInput({
  value,
  onChangeText,
  label,
  invalid = false,
}: {
  value: string;
  onChangeText: (code: string) => void;
  label: string;
  invalid?: boolean;
}) {
  return (
    <View>
      <View aria-hidden className="flex-row gap-2">
        {positions.map((position) => {
          const digit = value.charAt(position);
          const isNext = position === value.length;
          return (
            <View
              key={position}
              className={cn(
                'h-16 flex-1 items-center justify-center rounded-field border-2',
                digit ? 'border-border bg-background' : 'border-transparent bg-muted',
                isNext && 'border-primary bg-background',
                invalid && 'border-danger',
              )}
            >
              <Text className="font-heading text-title-sm tabular-nums">{digit}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        value={value}
        onChangeText={(text) => {
          onChangeText(text.replace(/\D/g, '').slice(0, codeLength));
        }}
        accessibilityLabel={label}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={codeLength}
        autoFocus
        caretHidden
        className="absolute inset-0 text-transparent opacity-0"
      />
    </View>
  );
}
