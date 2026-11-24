import { type ClubColorSwatch, clubColorSwatches } from '@repo/ui-tokens';
import { BanIcon, CheckIcon } from 'lucide-react-native';
import { useIntl } from 'react-intl';
import { Pressable, View } from 'react-native';

import { FieldLabel } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const swatches = Object.entries(clubColorSwatches) as [ClubColorSwatch, string][];

function Swatch({
  label,
  color,
  checked,
  disabled,
  onPress,
}: {
  label: string;
  color: string | null;
  checked: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={2}
      className={cn(
        'size-11 items-center justify-center rounded-full border border-border',
        color === null && 'bg-muted',
        checked && 'border-3 border-foreground',
      )}
      style={color === null ? undefined : { backgroundColor: color }}
    >
      {checked ? (
        <View className="size-7 items-center justify-center rounded-full bg-background shadow-raised">
          <Icon as={CheckIcon} strokeWidth={3} className="size-4" />
        </View>
      ) : (
        color === null && <Icon as={BanIcon} className="text-muted-foreground" />
      )}
    </Pressable>
  );
}

export function ClubColorPicker({
  label,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled?: boolean;
  onChange: (color: string | null) => void;
}) {
  const intl = useIntl();

  return (
    <View className="gap-2">
      <FieldLabel>{label}</FieldLabel>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        className="flex-row flex-wrap gap-2"
      >
        <Swatch
          label={intl.formatMessage({ id: 'createClub.colors.none' })}
          color={null}
          checked={value === null}
          disabled={disabled}
          onPress={() => {
            onChange(null);
          }}
        />
        {swatches.map(([name, color]) => (
          <Swatch
            key={name}
            label={intl.formatMessage({ id: `createClub.colors.swatches.${name}` })}
            color={color}
            checked={value === color}
            disabled={disabled}
            onPress={() => {
              onChange(color);
            }}
          />
        ))}
      </View>
    </View>
  );
}
