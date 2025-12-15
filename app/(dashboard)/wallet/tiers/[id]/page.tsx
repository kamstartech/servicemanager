import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TierForm } from '@/components/wallet-tiers/tier-form';
import { updateWalletTier } from '@/lib/actions';
import { prisma } from '@/lib/db/prisma';

export default async function EditTierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tierId = parseInt(id);

  const tier = await prisma.walletTier.findUnique({
    where: { id: tierId },
  });

  if (!tier) {
    notFound();
  }

  const updateTierWithId = updateWalletTier.bind(null, tierId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <a href="/wallet/tiers">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </a>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Tier</h1>
          <p className="text-muted-foreground">Update tier configuration</p>
        </div>
      </div>

      <TierForm
        action={updateTierWithId}
        isEdit
        initialData={{
          name: tier.name,
          description: tier.description || undefined,
          position: tier.position,
          isDefault: tier.isDefault,
          minimumBalance: parseFloat(String(tier.minimumBalance ?? 0)),
          maximumBalance: parseFloat(String(tier.maximumBalance ?? 0)),
          maximumCreditLimit: parseFloat(String(tier.maximumCreditLimit ?? 0)),
          maximumDebtLimit: parseFloat(String(tier.maximumDebtLimit ?? 0)),
          minTransactionAmount: parseFloat(String(tier.minTransactionAmount ?? 0)),
          maxTransactionAmount: parseFloat(String(tier.maxTransactionAmount ?? 0)),
          dailyTransactionLimit: parseFloat(String(tier.dailyTransactionLimit ?? 0)),
          monthlyTransactionLimit: parseFloat(String(tier.monthlyTransactionLimit ?? 0)),
          dailyTransactionCount: tier.dailyTransactionCount,
          monthlyTransactionCount: tier.monthlyTransactionCount,
          requiredKycFields: tier.requiredKycFields as string[],
          kycRules: tier.kycRules as Record<string, any>,
        }}
      />
    </div>
  );
}
