import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import { TransactionsService } from './transactions.service';
import {
  TransactionType,
  CommissionBreakdown,
} from './transactions.types';
import { TransactionStatus } from '@prisma/client';

@Resolver(() => TransactionType)
export class TransactionsResolver {
  constructor(private readonly service: TransactionsService) {}

  @Query(() => [TransactionType])
  async transactions(
    @Args('status', { type: () => TransactionStatus, nullable: true })
    status?: TransactionStatus,
  ) {
    const txs = await this.service.findAll({ status });
    // Resolver-level: enrich with breakdown so the UI can render per-row commission. Prefer
    // a DataLoader if list size grows.
    return Promise.all(
      txs.map(async (tx) => ({
        ...tx,
        splits: [],
        commissions: [],
        fees: [],
        leadSources: [],
        vendors: [],
        breakdown: await this.service.getBreakdown(tx.id),
      })),
    );
  }

  @Query(() => TransactionType, { nullable: true })
  async transaction(@Args('id', { type: () => ID }) id: string) {
    const tx = await this.service.findOne(id);
    return { ...tx, breakdown: await this.service.getBreakdown(id) };
  }

  @Query(() => CommissionBreakdown)
  transactionBreakdown(@Args('id', { type: () => ID }) id: string) {
    return this.service.getBreakdown(id);
  }
}
