# API Documentation

This directory contains API-related documentation including GraphQL schema, security, rate limiting, and REST endpoints.

## Contents

### GraphQL

- [GRAPHQL_SECURITY_SUMMARY.md](GRAPHQL_SECURITY_SUMMARY.md) - Security best practices and implementation
- [GRAPHQL_RATE_LIMITING.md](GRAPHQL_RATE_LIMITING.md) - Rate limiting configuration
- [GRAPHQL_SECURITY_QUICK_REFERENCE.md](GRAPHQL_SECURITY_QUICK_REFERENCE.md) - Quick security reference

## Overview

The admin panel uses GraphQL as the primary API layer for client-server communication. The GraphQL server is integrated directly into the Next.js application at `/api/graphql`.

### Key Features

- **Authentication** - JWT-based authentication with context validation
- **Rate Limiting** - Query complexity and request rate limiting
- **Security** - Query depth limiting, introspection controls, input validation
- **Type Safety** - Full TypeScript integration with Prisma

### Quick Links

- **GraphQL Endpoint**: `/api/graphql`
- **Schema**: `lib/graphql/schema/typeDefs.ts`
- **Resolvers**: `lib/graphql/schema/resolvers/`
- **Middleware**: `lib/auth/middleware.ts`

## Common Tasks

### Adding a New Query

1. Add type definition to `typeDefs.ts`
2. Create resolver in appropriate resolver file
3. Export resolver in `lib/graphql/schema/resolvers/index.ts`
4. Test with GraphQL playground

### Adding a New Mutation

1. Define mutation in `typeDefs.ts`
2. Implement resolver with proper authentication
3. Add input validation
4. Document expected inputs/outputs
5. Add to appropriate feature documentation

### Security Checklist

- ✅ Authentication required for sensitive operations
- ✅ Input validation on all mutations
- ✅ Rate limiting configured
- ✅ Query complexity limits set
- ✅ Error messages don't leak sensitive data

## Related Documentation

- [Authentication System](../features/AUTHENTICATION_SYSTEM.md)
- [Backup System](../infrastructure/BACKUP_SYSTEM_SUMMARY.md)
- [Features](../features/)

---

*Last Updated: 2024-12-14*
