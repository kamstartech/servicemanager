"use client";

import { ApolloClient, InMemoryCache, HttpLink, from } from "@apollo/client";
import { onError } from "@apollo/client/link/error";

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

export const apolloClient = new ApolloClient({
  link: from([errorLink, httpLink]),
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
