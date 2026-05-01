import { Module } from '@nestjs/common';
import { TransactionsResolver } from './transactions.resolver';
import { TransactionsService } from './transactions.service';
import { CommissionCalcService } from './commission-calc.service';

@Module({
  providers: [TransactionsResolver, TransactionsService, CommissionCalcService],
  exports: [TransactionsService, CommissionCalcService],
})
export class TransactionsModule {}
