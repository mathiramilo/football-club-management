import 'react';

declare module 'react' {
  // Declaration merging only works with an interface, so the Record form can't replace it.
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface CSSProperties {
    [variable: `--${string}`]: string | undefined;
  }
}
