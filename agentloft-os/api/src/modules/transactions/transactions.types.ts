import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  TransactionStatus,
  TransactionSide,
  PropertyType,
  FeeType,
  VendorRole,
  ContactType,
} from '@prisma/client';

registerEnumType(TransactionStatus, { name: 'TransactionStatus' });
registerEnumType(TransactionSide, { name: 'TransactionSide' });
registerEnumType(PropertyType, { name: 'PropertyType' });
registerEnumType(FeeType, { name: 'FeeType' });
registerEnumType(VendorRole, { name: 'VendorRole' });
registerEnumType(ContactType, { name: 'ContactType' });

@ObjectType()
export class AgentSplitType {
  @Field(() => ID) id!: string;
  @Field() agentId!: string;
  @Field(() => Int, { nullable: true }) splitBps?: number | null;
  @Field(() => Int, { nullable: true }) flatCents?: number | null;
  @Field() role!: string;
}

@ObjectType()
export class CommissionLineType {
  @Field(() => ID) id!: string;
  @Field(() => TransactionSide) side!: TransactionSide;
  @Field(() => Int) amountCents!: number;
  @Field({ nullable: true }) description?: string | null;
}

@ObjectType()
export class FeeTypeOut {
  @Field(() => ID) id!: string;
  @Field(() => FeeType) type!: FeeType;
  @Field({ nullable: true }) description?: string | null;
  @Field(() => Int, { nullable: true }) amountCents?: number | null;
  @Field(() => Int, { nullable: true }) bpsOfGci?: number | null;
  @Field({ nullable: true }) payeeName?: string | null;
}

@ObjectType()
export class TransactionLeadSourceType {
  @Field(() => ID) id!: string;
  @Field() leadSourceId!: string;
  @Field(() => Int) attributionBps!: number;
}

@ObjectType()
export class TransactionVendorType {
  @Field(() => ID) id!: string;
  @Field() vendorId!: string;
  @Field(() => VendorRole) role!: VendorRole;
  @Field({ nullable: true }) notes?: string | null;
}

// Computed commission breakdown — not stored, derived by CommissionCalcService.
@ObjectType()
export class CommissionBreakdown {
  @Field(() => Int) gciCents!: number;
  @Field(() => Int) totalFeesCents!: number;
  @Field(() => Int) brokerageNetCents!: number;
  @Field(() => [AgentNetType]) agentNets!: AgentNetType[];
}

@ObjectType()
export class AgentNetType {
  @Field() agentId!: string;
  @Field(() => Int) grossCents!: number;
  @Field(() => Int) feesCents!: number;
  @Field(() => Int) netCents!: number;
}

@ObjectType()
export class TransactionType {
  @Field(() => ID) id!: string;
  @Field() brokerageId!: string;
  @Field(() => TransactionSide) side!: TransactionSide;
  @Field(() => TransactionStatus) status!: TransactionStatus;
  @Field(() => PropertyType) propertyType!: PropertyType;
  @Field() addressLine1!: string;
  @Field({ nullable: true }) addressLine2?: string | null;
  @Field() city!: string;
  @Field() state!: string;
  @Field() postalCode!: string;
  @Field({ nullable: true }) mlsNumber?: string | null;
  @Field(() => Int, { nullable: true }) listPriceCents?: number | null;
  @Field(() => Int, { nullable: true }) salePriceCents?: number | null;
  @Field({ nullable: true }) contractDate?: Date | null;
  @Field({ nullable: true }) closeDate?: Date | null;
  @Field({ nullable: true }) inspectionDeadline?: Date | null;
  @Field({ nullable: true }) financingDeadline?: Date | null;
  @Field({ nullable: true }) appraisalDeadline?: Date | null;
  @Field({ nullable: true }) notes?: string | null;
  @Field() createdAt!: Date;
  @Field() updatedAt!: Date;

  @Field(() => [AgentSplitType]) splits!: AgentSplitType[];
  @Field(() => [CommissionLineType]) commissions!: CommissionLineType[];
  @Field(() => [FeeTypeOut]) fees!: FeeTypeOut[];
  @Field(() => [TransactionLeadSourceType]) leadSources!: TransactionLeadSourceType[];
  @Field(() => [TransactionVendorType]) vendors!: TransactionVendorType[];
  @Field(() => CommissionBreakdown) breakdown!: CommissionBreakdown;
}
