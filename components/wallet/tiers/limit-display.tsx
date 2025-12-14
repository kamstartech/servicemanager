'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency, calculateLimitPercentage } from '@/lib/services/wallet-tiers/validation';

interface LimitDisplayProps {
  type: 'daily' | 'monthly';
  category: 'amount' | 'count';
  used: number;
  limit: number;
  label?: string;
}

export function LimitDisplay({ type, category, used, limit, label }: LimitDisplayProps) {
  const percentage = calculateLimitPercentage(used, limit);

  const getStatusColor = (pct: number) => {
    if (pct >= 100) return 'text-destructive';
    if (pct >= 80) return 'text-orange-500';
    if (pct >= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = (pct: number) => {
    if (pct >= 100) return <AlertCircle className="h-4 w-4" />;
    if (pct >= 80) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'bg-destructive';
    if (pct >= 80) return 'bg-orange-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const remaining = Math.max(0, limit - used);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`${getStatusColor(percentage)}`}>{getStatusIcon(percentage)}</span>
          <span className="text-sm font-medium">
            {label || `${type.charAt(0).toUpperCase() + type.slice(1)} ${category === 'amount' ? 'Limit' : 'Count'}`}
          </span>
        </div>
        <Badge variant={percentage >= 80 ? 'destructive' : 'secondary'}>
          {percentage}%
        </Badge>
      </div>

      <Progress value={Math.min(percentage, 100)} className="h-2" indicatorClassName={getProgressColor(percentage)} />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Used: {category === 'amount' ? formatCurrency(used) : used.toLocaleString()}
        </span>
        <span>
          Limit: {category === 'amount' ? formatCurrency(limit) : limit.toLocaleString()}
        </span>
      </div>

      {remaining > 0 ? (
        <p className="text-xs text-muted-foreground">
          Remaining: {category === 'amount' ? formatCurrency(remaining) : remaining.toLocaleString()}
        </p>
      ) : (
        <p className="text-xs text-destructive font-medium">Limit reached</p>
      )}
    </div>
  );
}

interface LimitOverviewCardProps {
  title: string;
  description?: string;
  limits: {
    dailyAmount?: { used: number; limit: number };
    monthlyAmount?: { used: number; limit: number };
    dailyCount?: { used: number; limit: number };
    monthlyCount?: { used: number; limit: number };
  };
}

export function LimitOverviewCard({ title, description, limits }: LimitOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {limits.dailyAmount && (
          <LimitDisplay
            type="daily"
            category="amount"
            used={limits.dailyAmount.used}
            limit={limits.dailyAmount.limit}
            label="Daily Transaction Limit"
          />
        )}

        {limits.monthlyAmount && (
          <LimitDisplay
            type="monthly"
            category="amount"
            used={limits.monthlyAmount.used}
            limit={limits.monthlyAmount.limit}
            label="Monthly Transaction Limit"
          />
        )}

        {limits.dailyCount && (
          <LimitDisplay
            type="daily"
            category="count"
            used={limits.dailyCount.used}
            limit={limits.dailyCount.limit}
            label="Daily Transaction Count"
          />
        )}

        {limits.monthlyCount && (
          <LimitDisplay
            type="monthly"
            category="count"
            used={limits.monthlyCount.used}
            limit={limits.monthlyCount.limit}
            label="Monthly Transaction Count"
          />
        )}
      </CardContent>
    </Card>
  );
}
