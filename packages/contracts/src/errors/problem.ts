import { z } from 'zod';

import { errorCode } from './codes.js';

export const fieldError = z.object({
  in: z.enum(['body', 'query', 'path']),
  pointer: z.string().describe('JSON Pointer (RFC 6901) into that part of the request'),
  code: z.string(),
  detail: z.string().optional(),
});

export const problemDetails = z.object({
  type: z.string(),
  title: z.string(),
  status: z.int(),
  code: errorCode,
  detail: z.string().optional(),
  errors: z.array(fieldError).optional(),
});

export type FieldError = z.infer<typeof fieldError>;
export type ProblemDetails = z.infer<typeof problemDetails>;
