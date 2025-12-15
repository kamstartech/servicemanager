import { NextRequest, NextResponse } from "next/server";
import { createYoga } from "graphql-yoga";
import { schema } from "@/lib/graphql/schema";
import { createGraphQLContext } from "@/lib/graphql/context";
import depthLimit from "graphql-depth-limit";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import {
  checkRateLimit,
  getClientIdentifier,
} from "@/lib/utils/rate-limit";

// Rate limit configuration
const RATE_LIMIT = {
  // Admin users: 1000 requests per 15 minutes
  admin: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000,
    identifier: "graphql-admin",
  },
  // Mobile users: 200 requests per 15 minutes
  mobile: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000,
    identifier: "graphql-mobile",
  },
  // Unauthenticated: Should be blocked by middleware, but just in case
  unauthenticated: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    identifier: "graphql-unauth",
  },
};

// Complexity rule: prevent expensive queries
const complexityRule = createComplexityLimitRule(5000, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  introspectionListFactor: 15,
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  context: ({ request }) => createGraphQLContext({ req: request }),
  fetchAPI: {
    Request,
    Response,
    Headers,
  },
  
  // Security plugins
  plugins: [
    {
      onValidate: ({ addValidationRule }: any) => {
        // Limit query depth to 15 levels (increased for nested data)
        addValidationRule(depthLimit(15));
        
        // Limit query complexity
        addValidationRule(complexityRule as any);
      },
    },
  ],
  
  // Disable introspection in production
  graphiql: process.env.NODE_ENV !== "production",
  
  // Performance: disable batching to prevent abuse
  batching: false,
});

export async function GET(request: NextRequest) {
  return handleGraphQLRequest(request);
}

export async function POST(request: NextRequest) {
  return handleGraphQLRequest(request);
}

async function handleGraphQLRequest(request: NextRequest) {
  // Get client identifier
  const clientId = getClientIdentifier(request);
  
  // Determine user type from token
  let rateLimitConfig = RATE_LIMIT.unauthenticated;
  let rateLimitKey = clientId;
  
  // Check for admin token (cookie)
  const adminToken = request.cookies.get("admin_token")?.value;
  if (adminToken) {
    rateLimitConfig = RATE_LIMIT.admin;
    rateLimitKey = `admin:${clientId}`;
  } else {
    // Check for mobile Bearer token
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      rateLimitConfig = RATE_LIMIT.mobile;
      rateLimitKey = `mobile:${clientId}`;
    }
  }
  
  // Check rate limit
  const rateLimitResult = checkRateLimit(rateLimitKey, rateLimitConfig);
  
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        errors: [
          {
            message: "Rate limit exceeded. Please try again later.",
            extensions: {
              code: "RATE_LIMIT_EXCEEDED",
              limit: rateLimitResult.limit,
              remaining: rateLimitResult.remaining,
              resetAt: new Date(rateLimitResult.resetAt).toISOString(),
            },
          },
        ],
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          "X-RateLimit-Reset": String(rateLimitResult.resetAt),
          "Retry-After": String(
            Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
          ),
        },
      }
    );
  }
  
  // Process GraphQL request
  const response = await yoga(request);
  
  // Add rate limit headers to response
  const headers = new Headers(response.headers);
  headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
  headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
  headers.set("X-RateLimit-Reset", String(rateLimitResult.resetAt));
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
