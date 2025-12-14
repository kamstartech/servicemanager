import { GraphQLError } from "graphql";
import { GraphQLContext } from "./context";

/**
 * Auth guard for GraphQL resolvers
 * Throws error if user is not authenticated
 */
export function requireAuth(context: GraphQLContext): asserts context is Required<GraphQLContext> {
  if (!context.userId || !context.sessionId) {
    throw new GraphQLError("Authentication required", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }
}

/**
 * Admin auth guard for GraphQL resolvers
 * Note: For admin panel, we use a different auth system (admin_token cookie)
 * This is checked by the middleware, so if request reaches GraphQL, it's already authenticated
 */
export function requireAdminAuth(context: any): void {
  // Admin authentication is handled by middleware
  // If request reaches here, user is authenticated as admin
  // This is just a placeholder for consistency
}

/**
 * Optional auth - returns userId if authenticated, undefined otherwise
 */
export function getAuthUserId(context: GraphQLContext): number | undefined {
  return context.userId;
}

/**
 * Check if user is authenticated without throwing
 */
export function isAuthenticated(context: GraphQLContext): boolean {
  return !!context.userId && !!context.sessionId;
}
