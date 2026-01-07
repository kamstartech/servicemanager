import { NextRequest } from "next/server";
import { createYoga } from "graphql-yoga";
import { schema } from "@/lib/graphql/schema";
import { createGraphQLContext } from "@/lib/graphql/context";

// Force dynamic rendering and disable caching for streaming
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Create a separate Yoga instance for subscriptions with SSE enabled
const yoga = createYoga({
    schema,
    graphqlEndpoint: "/api/graphql/stream",
    context: ({ request }) => createGraphQLContext({ req: request }),
    fetchAPI: {
        Request,
        Response,
        Headers,
    },
    // Disable GraphiQL for this endpoint
    graphiql: false,
    // Important: Enable SSE for subscriptions
    multipart: true,
});

export async function GET(request: NextRequest) {
    console.log("[SSE-Stream] GET request received");
    const adminToken = request.cookies.get("admin_token")?.value;
    if (!adminToken) {
        console.warn("[SSE-Stream] No admin token found");
        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    console.log("[SSE-Stream] Admin authenticated, processing request");
    // Return the yoga response directly for streaming
    const response = await yoga(request);
    console.log("[SSE-Stream] Response headers:", Object.fromEntries(response.headers.entries()));
    return response;
}

export async function POST(request: NextRequest) {
    console.log("[SSE-Stream] POST request received");
    const adminToken = request.cookies.get("admin_token")?.value;
    if (!adminToken) {
        console.warn("[SSE-Stream] No admin token found");
        return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { "Content-Type": "application/json" } }
        );
    }

    console.log("[SSE-Stream] Admin authenticated, processing request");
    // Return the yoga response directly for streaming
    const response = await yoga(request);
    console.log("[SSE-Stream] Response headers:", Object.fromEntries(response.headers.entries()));
    return response;
}
