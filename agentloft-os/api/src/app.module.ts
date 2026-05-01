import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { PrismaModule } from './core/prisma/prisma.module';
import { IdentityModule } from './core/identity/identity.module';
import { OrgModule } from './core/org/org.module';
import { PeopleModule } from './core/people/people.module';
import { AuditModule } from './core/audit/audit.module';

import { TransactionsModule } from './modules/transactions/transactions.module';
// Stubbed modules — to be built out by the dev team. See docs/ROADMAP.md.
// import { AgentLifecycleModule } from './modules/agent-lifecycle/agent-lifecycle.module';
// import { RecruitingModule } from './modules/recruiting/recruiting.module';
// import { CommissionsModule } from './modules/commissions/commissions.module';
// import { VendorsModule } from './modules/vendors/vendors.module';
// import { DocumentsModule } from './modules/documents/documents.module';
// import { TrainingModule } from './modules/training/training.module';
// import { ComplianceModule } from './modules/compliance/compliance.module';
// import { ReportingModule } from './modules/reporting/reporting.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    PrismaModule,
    IdentityModule,
    OrgModule,
    PeopleModule,
    AuditModule,
    TransactionsModule,
  ],
})
export class AppModule {}
