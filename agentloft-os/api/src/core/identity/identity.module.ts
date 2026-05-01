import { Module } from '@nestjs/common';

// Identity stub. The dev team should replace this with AgentLoft's existing auth.
// What's expected:
//   - JWT verification middleware that populates req.user = { id, role, brokerageId, agentId }
//   - GraphQL context wires currentUser onto each resolver context
//   - Guards: JwtAuthGuard, RoleGuard, PermissionGuard
//
// For local dev, the api currently trusts an `x-user-id` header. See README.

@Module({
  providers: [],
  exports: [],
})
export class IdentityModule {}
