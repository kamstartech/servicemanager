'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, CreditCard, TrendingUp, Shield } from 'lucide-react';
import { formatCurrency, formatCompactNumber, getTierBadgeVariant } from '@/lib/services/wallet-tiers/validation';

interface TierCardProps {
  tier: {
    id: number;
    name: string;
    description?: string | null;
    position: number;
    isDefault: boolean;
    minimumBalance: number;
    maximumBalance: number;
    maxTransactionAmount: number;
    dailyTransactionLimit: number;
    monthlyTransactionLimit: number;
    walletUsersCount: number;
    requiredKycFields: string[];
  };
  variant?: 'default' | 'compact';
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TierCard({
  tier,
  variant = 'default',
  showActions = false,
  onEdit,
  onDelete,
}: TierCardProps) {
  if (variant === 'compact') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                {tier.isDefault && <Badge variant="secondary">Default</Badge>}
              </div>
              <CardDescription className="mt-1">{tier.description}</CardDescription>
            </div>
            <Badge variant={getTierBadgeVariant(tier.position)}>#{tier.position}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Max Balance</p>
              <p className="font-semibold">{formatCompactNumber(tier.maximumBalance)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Daily Limit</p>
              <p className="font-semibold">{formatCompactNumber(tier.dailyTransactionLimit)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Users</p>
              <p className="font-semibold">{tier.walletUsersCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">KYC Fields</p>
              <p className="font-semibold">{tier.requiredKycFields.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CardTitle>{tier.name}</CardTitle>
              {tier.isDefault && <Badge variant="secondary">Default</Badge>}
              <Badge variant={getTierBadgeVariant(tier.position)}>Position {tier.position}</Badge>
            </div>
            <CardDescription>{tier.description || 'No description'}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tier.walletUsersCount}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCompactNumber(tier.maximumBalance)}</p>
              <p className="text-xs text-muted-foreground">Max Balance</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCompactNumber(tier.dailyTransactionLimit)}
              </p>
              <p className="text-xs text-muted-foreground">Daily Limit</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Shield className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tier.requiredKycFields.length}</p>
              <p className="text-xs text-muted-foreground">KYC Fields</p>
            </div>
          </div>
        </div>

        {/* Detailed Limits */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Balance Range</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Min:</span>
                <span className="font-medium">{formatCurrency(tier.minimumBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max:</span>
                <span className="font-medium">{formatCurrency(tier.maximumBalance)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Transaction Limits</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max/Txn:</span>
                <span className="font-medium">{formatCurrency(tier.maxTransactionAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily:</span>
                <span className="font-medium">
                  {formatCurrency(tier.dailyTransactionLimit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly:</span>
                <span className="font-medium">
                  {formatCurrency(tier.monthlyTransactionLimit)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Requirements</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">KYC Fields:</span>
                <span className="font-medium">{tier.requiredKycFields.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Default:</span>
                <span className="font-medium">{tier.isDefault ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
