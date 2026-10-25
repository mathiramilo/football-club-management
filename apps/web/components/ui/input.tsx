import * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-14 w-full min-w-0 rounded-field border-2 border-transparent bg-muted px-4 text-body text-foreground transition-colors outline-none placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:bg-background disabled:cursor-not-allowed disabled:text-subtle-foreground aria-invalid:border-danger aria-invalid:bg-background',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
