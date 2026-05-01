import { Injectable } from '@nestjs/common';
import type {
  AgentSplit,
  CommissionLine,
  Fee,
  Transaction,
} from '@prisma/client';

export interface CommissionInputs {
  transaction: Transaction;
  splits: AgentSplit[];
  commissions: CommissionLine[];
  fees: Fee[];
}

export interface AgentNet {
  agentId: string;
  grossCents: number;
  feesCents: number;
  netCents: number;
}

export interface CommissionBreakdownResult {
  gciCents: number;
  totalFeesCents: number;
  brokerageNetCents: number;
  agentNets: AgentNet[];
}

// Pure calculation — deterministic, no DB writes. Easy to unit-test and reuse.
//
// Rules:
//   1. GCI  = sum of CommissionLine.amountCents
//   2. Off-the-top fees (REFERRAL_OUT, FRANCHISE) come out of GCI before agent splits.
//   3. Remaining "after-top" amount is divided across AgentSplit rows by splitBps,
//      with any flatCents agents paid first.
//   4. Per-agent fees (E&O, TC, ADMIN) come out of each agent's gross — for v0 we apply
//      them pro-rata across agents. The dev team can swap this with per-agent fee assignments
//      when they wire up Cap Plans.
//   5. brokerageNet = GCI − (agent grosses) − off-the-top fees + REFERRAL_IN.
@Injectable()
export class CommissionCalcService {
  calculate(inputs: CommissionInputs): CommissionBreakdownResult {
    const { splits, commissions, fees } = inputs;

    const gciCents = commissions.reduce((sum, c) => sum + c.amountCents, 0);

    const offTopTypes = new Set(['REFERRAL_OUT', 'FRANCHISE']);
    const perAgentFeeTypes = new Set(['ADMIN', 'EO_INSURANCE', 'TRANSACTION_COORDINATOR']);
    const referralInTypes = new Set(['REFERRAL_IN']);

    const feeAmount = (fee: Fee): number => {
      if (fee.amountCents != null) return fee.amountCents;
      if (fee.bpsOfGci != null) return Math.round((gciCents * fee.bpsOfGci) / 10000);
      return 0;
    };

    const offTopFees = fees
      .filter((f) => offTopTypes.has(f.type))
      .reduce((sum, f) => sum + feeAmount(f), 0);

    const referralIn = fees
      .filter((f) => referralInTypes.has(f.type))
      .reduce((sum, f) => sum + feeAmount(f), 0);

    const perAgentFees = fees
      .filter((f) => perAgentFeeTypes.has(f.type))
      .reduce((sum, f) => sum + feeAmount(f), 0);

    const otherFees = fees
      .filter(
        (f) => !offTopTypes.has(f.type) && !perAgentFeeTypes.has(f.type) && !referralInTypes.has(f.type),
      )
      .reduce((sum, f) => sum + feeAmount(f), 0);

    const totalFeesCents = offTopFees + perAgentFees + otherFees;

    const afterTop = gciCents - offTopFees;

    // First, pay flatCents agents.
    const flatAgents = splits.filter((s) => s.flatCents != null);
    const flatTotal = flatAgents.reduce((sum, s) => sum + (s.flatCents ?? 0), 0);
    const remainingForBps = Math.max(0, afterTop - flatTotal);

    const bpsAgents = splits.filter((s) => s.splitBps != null);
    const totalBps = bpsAgents.reduce((sum, s) => sum + (s.splitBps ?? 0), 0) || 1;

    const agentGrosses = new Map<string, number>();
    for (const s of flatAgents) {
      agentGrosses.set(s.agentId, (agentGrosses.get(s.agentId) ?? 0) + (s.flatCents ?? 0));
    }
    for (const s of bpsAgents) {
      const share = Math.round((remainingForBps * (s.splitBps ?? 0)) / totalBps);
      agentGrosses.set(s.agentId, (agentGrosses.get(s.agentId) ?? 0) + share);
    }

    // Pro-rata per-agent fees by agent gross.
    const totalAgentGross = [...agentGrosses.values()].reduce((a, b) => a + b, 0) || 1;
    const agentNets: AgentNet[] = [...agentGrosses.entries()].map(([agentId, gross]) => {
      const feesShare = Math.round((perAgentFees * gross) / totalAgentGross);
      return {
        agentId,
        grossCents: gross,
        feesCents: feesShare,
        netCents: gross - feesShare,
      };
    });

    const brokerageNetCents =
      gciCents - totalAgentGross - offTopFees - otherFees + referralIn;

    return {
      gciCents,
      totalFeesCents,
      brokerageNetCents,
      agentNets,
    };
  }
}
