import { NextRequest, NextResponse } from "next/server";
import { createYoga } from "graphql-yoga";
import { mobileSchema } from "@/lib/graphql/schema/mobile";
import { createGraphQLContext } from "@/lib/graphql/context";
import depthLimit from "graphql-depth-limit";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import {
  checkRateLimit,
  getClientIdentifier,
} from "@/lib/utils/rate-limit";

const RATE_LIMIT = {
  mobile: {
    maxRequests: 200,
    windowMs: 15 * 60 * 1000,
    identifier: "graphql-mobile",
  },
  unauthenticated: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
    identifier: "graphql-unauth",
  },
};

const complexityRule = createComplexityLimitRule(5000, {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  introspectionListFactor: 15,
});

const yoga = createYoga({
  schema: mobileSchema,
  graphqlEndpoint: "/api/mobile/graphql",
  context: ({ request }) => createGraphQLContext({ req: request }),
  fetchAPI: {
    Request,
    Response,
    Headers,
  },
  plugins: [
    {
      onValidate: ({ addValidationRule }: any) => {
        addValidationRule(depthLimit(15));
        addValidationRule(complexityRule as any);
      },
    },
  ],
  graphiql: process.env.NODE_ENV !== "production",
  batching: false,
});

export async function GET(request: NextRequest) {
  return handleGraphQLRequest(request);
}

export async function POST(request: NextRequest) {
  return handleGraphQLRequest(request);
}

async function handleGraphQLRequest(request: NextRequest) {
  if (request.cookies.get("admin_token")?.value) {
    return NextResponse.json(
      {
        errors: [
          {
            message: "Admin cookie is not allowed on the mobile GraphQL endpoint",
            extensions: {
              code: "FORBIDDEN",
            },
          },
        ],
      },
      { status: 403 }
    );
  }

  const clientId = getClientIdentifier(request);

  const authHeader = request.headers.get("authorization");
  const hasMobileBearer = !!authHeader?.startsWith("Bearer ");

  const rateLimitConfig = hasMobileBearer
    ? RATE_LIMIT.mobile
    : RATE_LIMIT.unauthenticated;
  const rateLimitKey = hasMobileBearer ? `mobile:${clientId}` : clientId;

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

  const response = await yoga(request);

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
