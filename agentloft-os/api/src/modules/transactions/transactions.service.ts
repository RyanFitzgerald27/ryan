import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CommissionCalcService } from './commission-calc.service';
import type { TransactionStatus } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calc: CommissionCalcService,
  ) {}

  async findAll(args: { status?: TransactionStatus; brokerageId?: string }) {
    return this.prisma.transaction.findMany({
      where: {
        ...(args.status && { status: args.status }),
        ...(args.brokerageId && { brokerageId: args.brokerageId }),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        splits: true,
        commissions: true,
        fees: true,
        leadSources: true,
        vendors: true,
        contacts: true,
      },
    });
    if (!tx) throw new NotFoundException(`Transaction ${id} not found`);
    return tx;
  }

  async getBreakdown(id: string) {
    const tx = await this.findOne(id);
    return this.calc.calculate({
      transaction: tx,
      splits: tx.splits,
      commissions: tx.commissions,
      fees: tx.fees,
    });
  }
}
