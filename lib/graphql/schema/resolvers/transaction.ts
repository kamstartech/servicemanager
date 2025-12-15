import { t24TransactionsService } from "@/lib/services/t24/transactions";
import { transactionResolvers as proxyTransactionResolvers } from "@/lib/graphql/resolvers/transactions";

export const transactionResolvers = {
  Query: {
    /**
     * Fetch transactions for a specific account from T24
     */
    accountTransactions: async (
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
    
    // Add proxy transaction queries (renamed to avoid conflicts)
    proxyTransaction: proxyTransactionResolvers.Query.transaction,
    proxyTransactionByReference: proxyTransactionResolvers.Query.transactionByReference,
    proxyTransactions: proxyTransactionResolvers.Query.transactions,
    proxyAccountTransactions: proxyTransactionResolvers.Query.accountTransactions,
    walletTransactions: proxyTransactionResolvers.Query.walletTransactions,
    retryableTransactions: proxyTransactionResolvers.Query.retryableTransactions,
    transactionRetryStats: proxyTransactionResolvers.Query.transactionRetryStats,
  },
  
  Mutation: {
    // Add proxy transaction mutations
    ...proxyTransactionResolvers.Mutation,
  },
  
  // Add Transaction type resolver (only statusHistory, others are direct fields)
  Transaction: {
    statusHistory: proxyTransactionResolvers.Transaction.statusHistory,
  },
};
