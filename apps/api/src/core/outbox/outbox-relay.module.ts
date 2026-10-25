import { Module } from '@nestjs/common';

import { ClockModule } from '../clock/clock.js';
import { OutboxMaintenance } from './outbox-maintenance.js';
import { OutboxRelay, OutboxRelayLoop } from './outbox-relay.js';

@Module({
  imports: [ClockModule],
  providers: [OutboxRelay, OutboxRelayLoop, OutboxMaintenance],
})
export class OutboxRelayModule {}
