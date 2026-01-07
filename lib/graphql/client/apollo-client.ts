"use client";

import { ApolloClient, InMemoryCache, HttpLink, from, split } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { getMainDefinition } from "@apollo/client/utilities";
import { ApolloLink, Operation, FetchResult, Observable } from "@apollo/client";
import { print } from "graphql";
import { createClient } from "graphql-sse";

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      // Don't spam console with complexity limit errors - these are expected
      if (message.includes("complexity limit")) {
        console.warn(`[GraphQL]: Query complexity limit exceeded`);
      } else {
        console.error(
          `[GraphQL error]: Message: ${message}, Location: ${JSON.stringify(locations)}, Path: ${path}`
        );
      }
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

const httpLink = new HttpLink({
  uri: "/api/graphql",
  credentials: "include",
  // Enable batching to combine multiple queries into one request
  fetchOptions: {
    next: { revalidate: 0 }, // Disable Next.js cache for real-time data
  },
});

const sseClient = createClient({
  url: "/api/graphql/stream",
  credentials: "include",
  // graphql-sse uses POST by default with proper SSE handling
});

const sseLink = new ApolloLink((operation: Operation) => {
  return new Observable((sink) => {
    console.log(`[SSE-Link] Starting subscription for: ${operation.operationName}`, operation.variables);
    
    const unsubscribe = sseClient.subscribe(
      {
        ...operation,
        query: print(operation.query),
      },
      {
        next: (result) => {
          console.log(`[SSE-Link] ✅ Received data for: ${operation.operationName}`, result);
          sink.next(result as FetchResult);
        },
        complete: () => {
          console.log(`[SSE-Link] ⚠️ Completed: ${operation.operationName}`);
          sink.complete();
        },
        error: (err) => {
          console.error(`[SSE-Link] ❌ Error in: ${operation.operationName}`, err);
          sink.error(err);
        },
      }
    );
    
    console.log(`[SSE-Link] 🔗 Subscription active for: ${operation.operationName}`);
    
    return () => {
      console.log(`[SSE-Link] 🔌 Unsubscribing from: ${operation.operationName}`);
      unsubscribe();
    };
  });
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  sseLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: from([errorLink, splitLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Configure pagination for list queries
          dbConnections: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          adminWebUsers: {
            merge(existing, incoming) {
              return incoming;
            },
          },
          mobileUsers: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  // Enable query deduplication
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "cache-and-network",
      nextFetchPolicy: "cache-first",
      errorPolicy: "all",
    },
    query: {
      fetchPolicy: "cache-first",
      errorPolicy: "all",
    },
    mutate: {
      errorPolicy: "all",
    },
  },
});
