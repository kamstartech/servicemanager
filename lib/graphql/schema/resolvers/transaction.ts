import { t24TransactionsService } from "@/lib/services/t24/transactions";
import { transactionResolvers as proxyTransactionResolvers } from "@/lib/graphql/resolvers/transactions";

export const transactionResolvers = {
  Query: {
    /**
     * Fetch transactions for a specific account from T24 (legacy)
     */
    t24AccountTransactions: async (
      _parent: any,
      args: { accountNumber: string }
    ) => {
      const { accountNumber } = args;

      if (!accountNumber) {
        return {
          transactions: [],
          totalCount: 0,
          accountNumber: "",
          status: "error",
        };
      }

      const result = await t24TransactionsService.getAccountTransactions(
        accountNumber
      );

      if (result.status === "error") {
        console.error(
          `Failed to fetch transactions for ${accountNumber}:`,
          result.error
        );
        return {
          transactions: [],
          totalCount: 0,
          accountNumber,
          status: "error",
        };
      }

      const transactions = result.transactions || [];

      return {
        transactions,
        totalCount: transactions.length,
        accountNumber,
        status: "success",
      };
    },
    
    // Add proxy transaction queries
    ...proxyTransactionResolvers.Query,
  },
  
  Mutation: {
    // Add proxy transaction mutations
    ...proxyTransactionResolvers.Mutation,
  },
  
  // Add Transaction type resolver
  Transaction: proxyTransactionResolvers.Transaction,
};
