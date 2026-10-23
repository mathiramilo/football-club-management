import { z } from 'zod';

export const EXTENSIBLE_ENUM = 'x-extensible-enum';

// A response enum that gains values over time. The OpenAPI document lists them under
// `x-extensible-enum` instead of `enum`, so adding one isn't a breaking change for `v1`.
export const extensibleEnum = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).meta({ [EXTENSIBLE_ENUM]: true });
