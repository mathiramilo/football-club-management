import { applyDecorators, HttpStatus, SerializeOptions } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export interface ResponseSchemaOptions {
  status?: HttpStatus;
}

export const ResponseSchema = (
  schema: StandardSchemaV1,
  { status = HttpStatus.OK }: ResponseSchemaOptions = {},
) => applyDecorators(SerializeOptions({ schema }), ApiResponse({ status, standardSchema: schema }));
