import { NextRequest } from "next/server";
import { createYoga } from "graphql-yoga";
import { schema } from "@/lib/graphql/schema";
import { createGraphQLContext } from "@/lib/graphql/context";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  context: ({ request }) => createGraphQLContext({ req: request }),
  fetchAPI: {
    Request,
    Response,
    Headers,
  },
});

export async function GET(request: NextRequest) {
  return yoga(request);
}

export async function POST(request: NextRequest) {
  return yoga(request);
}
