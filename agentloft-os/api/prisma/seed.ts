import { PrismaClient, Role, TransactionSide, TransactionStatus, PropertyType, FeeType, VendorRole, ContactType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.commissionLedgerEntry.deleteMany();
  await prisma.transactionVendor.deleteMany();
  await prisma.transactionLeadSource.deleteMany();
  await prisma.transactionContact.deleteMany();
  await prisma.fee.deleteMany();
  await prisma.commissionLine.deleteMany();
  await prisma.agentSplit.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.leadSource.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.team.deleteMany();
  await prisma.office.deleteMany();
  await prisma.brokerage.deleteMany();

  const brokerage = await prisma.brokerage.create({ data: { name: 'Raleigh Realty' } });
  const office = await prisma.office.create({ data: { name: 'Raleigh HQ', brokerageId: brokerage.id } });

  const agentSeeds = [
    { firstName: 'Sally', lastName: 'Brooks', email: 'sally@raleighrealty.com' },
    { firstName: 'Marcus', lastName: 'Chen', email: 'marcus@raleighrealty.com' },
    { firstName: 'Jamie', lastName: 'Patel', email: 'jamie@raleighrealty.com' },
    { firstName: 'Alex', lastName: 'Rivera', email: 'alex@raleighrealty.com' },
    { firstName: 'Devon', lastName: 'Park', email: 'devon@raleighrealty.com' },
    { firstName: 'Riley', lastName: 'O\'Connor', email: 'riley@raleighrealty.com' },
    { firstName: 'Taylor', lastName: 'Singh', email: 'taylor@raleighrealty.com' },
    { firstName: 'Jordan', lastName: 'Nguyen', email: 'jordan@raleighrealty.com' },
  ];
  const agents = await Promise.all(
    agentSeeds.map((a) =>
      prisma.agent.create({
        data: { ...a, brokerageId: brokerage.id, officeId: office.id, licenseState: 'NC' },
      }),
    ),
  );

  await prisma.user.create({
    data: { email: 'ryan@raleighrealty.com', name: 'Ryan Fitzgerald', role: Role.OWNER },
  });

  const leadSources = await Promise.all(
    [
      { name: 'Zillow', category: 'PAID' },
      { name: 'Sphere', category: 'ORGANIC' },
      { name: 'Past Client', category: 'REFERRAL' },
      { name: 'Open House', category: 'ORGANIC' },
      { name: 'Team Lead', category: 'TEAM' },
      { name: 'Realtor.com', category: 'PAID' },
      { name: 'Website', category: 'ORGANIC' },
      { name: 'Agent Referral', category: 'REFERRAL' },
    ].map((d) => prisma.leadSource.create({ data: d })),
  );

  const vendors = await Promise.all([
    prisma.vendor.create({ data: { name: 'Pinnacle Mortgage', defaultRole: VendorRole.LENDER, email: 'team@pinnaclemtg.com' } }),
    prisma.vendor.create({ data: { name: 'Carolina Title Co.', defaultRole: VendorRole.TITLE } }),
    prisma.vendor.create({ data: { name: 'A1 Home Inspections', defaultRole: VendorRole.INSPECTOR } }),
    prisma.vendor.create({ data: { name: 'Triangle Photography', defaultRole: VendorRole.PHOTOGRAPHER } }),
    prisma.vendor.create({ data: { name: 'StageRight Interiors', defaultRole: VendorRole.STAGER } }),
  ]);

  const addresses = [
    { line1: '1422 Glenwood Ave', city: 'Raleigh', state: 'NC', zip: '27608' },
    { line1: '8 Oakwood Pl', city: 'Raleigh', state: 'NC', zip: '27601' },
    { line1: '3306 Hillsborough St', city: 'Raleigh', state: 'NC', zip: '27607' },
    { line1: '405 Fayetteville St', city: 'Raleigh', state: 'NC', zip: '27601' },
    { line1: '912 N Person St', city: 'Raleigh', state: 'NC', zip: '27604' },
    { line1: '77 Boylan Ave', city: 'Raleigh', state: 'NC', zip: '27603' },
    { line1: '226 E Hargett St', city: 'Raleigh', state: 'NC', zip: '27601' },
    { line1: '511 W Jones St', city: 'Raleigh', state: 'NC', zip: '27603' },
    { line1: '1808 Wake Forest Rd', city: 'Raleigh', state: 'NC', zip: '27608' },
    { line1: '4221 Six Forks Rd', city: 'Raleigh', state: 'NC', zip: '27609' },
  ];

  const statuses: TransactionStatus[] = [
    TransactionStatus.PRE_LISTING,
    TransactionStatus.ACTIVE_LISTING,
    TransactionStatus.ACTIVE_LISTING,
    TransactionStatus.UNDER_CONTRACT,
    TransactionStatus.UNDER_CONTRACT,
    TransactionStatus.PENDING,
    TransactionStatus.PENDING,
    TransactionStatus.CLOSED,
    TransactionStatus.CLOSED,
    TransactionStatus.CLOSED,
  ];

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    const status = statuses[i];
    const side: TransactionSide = i % 2 === 0 ? TransactionSide.SELL : TransactionSide.BUY;
    const list = 425000 + i * 37500;
    const sale = status === TransactionStatus.CLOSED ? list - 5000 : null;

    const tx = await prisma.transaction.create({
      data: {
        brokerageId: brokerage.id,
        side,
        status,
        propertyType: PropertyType.SINGLE_FAMILY,
        addressLine1: addr.line1,
        city: addr.city,
        state: addr.state,
        postalCode: addr.zip,
        mlsNumber: `MLS-${100000 + i}`,
        listPriceCents: list * 100,
        salePriceCents: sale ? sale * 100 : null,
        contractDate: status !== TransactionStatus.PRE_LISTING && status !== TransactionStatus.ACTIVE_LISTING ? new Date(2026, 2, i + 1) : null,
        closeDate: status === TransactionStatus.CLOSED ? new Date(2026, 3, i + 1) : null,
      },
    });

    const primary = agents[i % agents.length];
    await prisma.agentSplit.create({
      data: { transactionId: tx.id, agentId: primary.id, splitBps: 7000, role: 'primary' },
    });
    if (i % 3 === 0) {
      const co = agents[(i + 2) % agents.length];
      await prisma.agentSplit.create({
        data: { transactionId: tx.id, agentId: co.id, splitBps: 3000, role: 'co-list' },
      });
    }

    const baseGci = Math.round(((sale ?? list) * 100) * 0.03);
    await prisma.commissionLine.create({
      data: { transactionId: tx.id, side, amountCents: baseGci, description: `${side} side commission` },
    });

    await prisma.fee.createMany({
      data: [
        { transactionId: tx.id, type: FeeType.FRANCHISE, bpsOfGci: 600, payeeName: 'Franchise HQ' },
        { transactionId: tx.id, type: FeeType.ADMIN, amountCents: 29500, payeeName: 'AgentLoft' },
        { transactionId: tx.id, type: FeeType.EO_INSURANCE, amountCents: 4500 },
      ],
    });
    if (i % 4 === 0) {
      await prisma.fee.create({
        data: { transactionId: tx.id, type: FeeType.REFERRAL_OUT, bpsOfGci: 2500, payeeName: 'Sphere referral' },
      });
    }

    await prisma.transactionLeadSource.create({
      data: { transactionId: tx.id, leadSourceId: leadSources[i % leadSources.length].id, attributionBps: 10000 },
    });

    await prisma.transactionVendor.create({
      data: { transactionId: tx.id, vendorId: vendors[0].id, role: VendorRole.LENDER },
    });
    await prisma.transactionVendor.create({
      data: { transactionId: tx.id, vendorId: vendors[1].id, role: VendorRole.TITLE },
    });
    if (i % 2 === 0) {
      await prisma.transactionVendor.create({
        data: { transactionId: tx.id, vendorId: vendors[2].id, role: VendorRole.INSPECTOR },
      });
    }
  }

  console.log('Seeded brokerage, agents, lead sources, vendors, and 10 transactions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
