'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable, type DataTableColumn } from '@/components/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatCurrency, formatCompactNumber, getTierColor, getTierBadgeVariant } from '@/lib/services/wallet-tiers/validation';

const GET_WALLET_TIERS = gql`
  query GetWalletTiers {
    walletTiers {
      id
      name
      description
      position
      isDefault
      minimumBalance
      maximumBalance
      minTransactionAmount
      maxTransactionAmount
      dailyTransactionLimit
      monthlyTransactionLimit
      dailyTransactionCount
      monthlyTransactionCount
      requiredKycFields
      walletUsersCount
      createdAt
      updatedAt
    }
  }
`;

const DELETE_WALLET_TIER = gql`
  mutation DeleteWalletTier($id: Int!) {
    deleteWalletTier(id: $id)
  }
`;

interface WalletTier {
  id: number;
  name: string;
  description: string | null;
  position: number;
  isDefault: boolean;
  minimumBalance: number;
  maximumBalance: number;
  minTransactionAmount: number;
  maxTransactionAmount: number;
  dailyTransactionLimit: number;
  monthlyTransactionLimit: number;
  dailyTransactionCount: number;
  monthlyTransactionCount: number;
  requiredKycFields: string[];
  walletUsersCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function WalletTiersPage() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const { data, loading, error, refetch } = useQuery(GET_WALLET_TIERS);
  const [deleteTier] = useMutation(DELETE_WALLET_TIER);

  const tiers: WalletTier[] = data?.walletTiers || [];

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteTier({ variables: { id: deleteId } });
      toast.success('Tier deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete tier');
    } finally {
      setDeleteId(null);
    }
  };

  const columns: DataTableColumn<WalletTier>[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.name}</span>
            {row.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
          </div>
          {row.description && (
            <div className="text-xs text-muted-foreground mt-1">
              {row.description}
            </div>
          )}
        </div>
      ),
      sortKey: 'name',
    },
    {
      id: 'position',
      header: 'Position',
      accessor: (row) => (
        <Badge variant={getTierBadgeVariant(row.position)} className="text-xs">
          {row.position}
        </Badge>
      ),
      sortKey: 'position',
    },
    {
      id: 'balanceLimits',
      header: 'Balance Limits',
      accessor: (row) => (
        <div className="text-sm">
          <div>{formatCurrency(row.minimumBalance)} - {formatCurrency(row.maximumBalance)}</div>
        </div>
      ),
    },
    {
      id: 'transactionLimits',
      header: 'Transaction Limits',
      accessor: (row) => (
        <div className="text-sm">
          <div className="text-xs text-muted-foreground">Max: {formatCurrency(row.maxTransactionAmount)}</div>
          <div className="text-xs text-muted-foreground">Daily: {formatCurrency(row.dailyTransactionLimit)}</div>
          <div className="text-xs text-muted-foreground">Monthly: {formatCurrency(row.monthlyTransactionLimit)}</div>
        </div>
      ),
    },
    {
      id: 'counts',
      header: 'Transaction Counts',
      accessor: (row) => (
        <div className="text-sm">
          <div className="text-xs text-muted-foreground">Daily: {row.dailyTransactionCount}</div>
          <div className="text-xs text-muted-foreground">Monthly: {row.monthlyTransactionCount}</div>
        </div>
      ),
    },
    {
      id: 'kyc',
      header: 'KYC Fields',
      accessor: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.requiredKycFields.length} fields
        </Badge>
      ),
    },
    {
      id: 'users',
      header: 'Users',
      accessor: (row) => (
        <span className="font-medium">{row.walletUsersCount}</span>
      ),
      sortKey: 'walletUsersCount',
      alignRight: true,
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/wallet/tiers/${row.id}`)}
            className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          {!row.isDefault && row.walletUsersCount === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(row.id)}
              className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Wallet Tiers</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage wallet tiers, limits, and KYC requirements
              {tiers.length > 0 && ` (${tiers.length} total)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => router.push('/wallet/tiers/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading tiers...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">Error: {error.message}</p>
          )}
          {!loading && !error && tiers.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No tiers found. Create your first tier to get started.
            </p>
          )}
          {!loading && !error && tiers.length > 0 && (
            <DataTable<WalletTier>
              data={tiers}
              columns={columns}
              searchableKeys={['name', 'description']}
              initialSortKey="position"
              pageSize={20}
              searchPlaceholder="Search by name or description..."
              showRowNumbers
              rowNumberHeader="#"
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this tier. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
