import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <div data-slot="native-select-wrapper" className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          'h-14 w-full min-w-0 appearance-none rounded-field border-2 border-transparent bg-muted pr-12 pl-4 text-body text-foreground transition-colors outline-none focus-visible:border-primary focus-visible:bg-background disabled:cursor-not-allowed disabled:text-subtle-foreground aria-invalid:border-danger aria-invalid:bg-background',
          className,
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
