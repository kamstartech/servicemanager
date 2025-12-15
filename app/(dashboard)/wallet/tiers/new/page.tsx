import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TierForm } from '@/components/wallet-tiers/tier-form';
import { createWalletTier } from '@/lib/actions';

export default function NewTierPage() {
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
          <h1 className="text-3xl font-bold tracking-tight">Create Tier</h1>
          <p className="text-muted-foreground">Create a new wallet tier</p>
        </div>
      </div>

      <TierForm action={createWalletTier} />
    </div>
  );
}
