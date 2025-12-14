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
        <Button variant="ghost" size="icon" asChild>
          <a href="/wallet/tiers">
            <ArrowLeft className="h-4 w-4" />
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
          minimumBalance: parseFloat(tier.minimumBalance),
          maximumBalance: parseFloat(tier.maximumBalance),
          maximumCreditLimit: parseFloat(tier.maximumCreditLimit || '0'),
          maximumDebtLimit: parseFloat(tier.maximumDebtLimit || '0'),
          minTransactionAmount: parseFloat(tier.minTransactionAmount),
          maxTransactionAmount: parseFloat(tier.maxTransactionAmount),
          dailyTransactionLimit: parseFloat(tier.dailyTransactionLimit),
          monthlyTransactionLimit: parseFloat(tier.monthlyTransactionLimit),
          dailyTransactionCount: tier.dailyTransactionCount,
          monthlyTransactionCount: tier.monthlyTransactionCount,
          requiredKycFields: tier.requiredKycFields as string[],
          kycRules: tier.kycRules as Record<string, any>,
        }}
      />
    </div>
  );
}
