import { Module, StandardSchemaSerializerInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [{ provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor }],
})
export class ContractModule {}
