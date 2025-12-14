'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, XCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { formatCurrency, getKYCFieldLabel } from '@/lib/services/wallet-tiers/validation';
import { useToast } from '@/hooks/use-toast';

const UPGRADE_USER_TIER = gql`
  mutation UpgradeWalletUserTier($mobileUserId: Int!, $newTierId: Int!) {
    upgradeWalletUserTier(mobileUserId: $mobileUserId, newTierId: $newTierId) {
      id
      walletTierId
      walletTier {
        id
        name
        position
      }
    }
  }
`;

const GET_MOBILE_USER_KYC = gql`
  query GetMobileUserKYC($mobileUserId: Int!) {
    mobileUserKYC(mobileUserId: $mobileUserId) {
      id
      walletTier {
        id
        name
        position
      }
      dateOfBirth
      occupation
      employerName
      sourceOfFunds
      idNumber
      idImage
      nrbValidation
      kycComplete
    }
  }
`;

interface TierUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobileUserId: number;
  currentTier: {
    id: number;
    name: string;
    position: number;
  } | null;
  targetTier: {
    id: number;
    name: string;
    position: number;
    minimumBalance: number;
    maximumBalance: number;
    maxTransactionAmount: number;
    dailyTransactionLimit: number;
    monthlyTransactionLimit: number;
    requiredKycFields: string[];
    kycRules: any;
  };
  onSuccess?: () => void;
}

export function TierUpgradeDialog({
  open,
  onOpenChange,
  mobileUserId,
  currentTier,
  targetTier,
  onSuccess,
}: TierUpgradeDialogProps) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(true);
  const [canUpgrade, setCanUpgrade] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [failedRules, setFailedRules] = useState<Array<{ rule: string; reason: string }>>([]);

  const { data: kycData } = useQuery(GET_MOBILE_USER_KYC, {
    variables: { mobileUserId },
    skip: !open,
    onCompleted: (data) => {
      checkEligibility(data.mobileUserKYC);
    },
  });

  const [upgradeTier, { loading: upgrading }] = useMutation(UPGRADE_USER_TIER);

  const checkEligibility = (kyc: any) => {
    const missing: string[] = [];
    const failed: Array<{ rule: string; reason: string }> = [];

    // Check required fields
    const completedFields = [];
    if (kyc?.dateOfBirth) completedFields.push('date_of_birth');
    if (kyc?.occupation) completedFields.push('occupation');
    if (kyc?.employerName) completedFields.push('employer_name');
    if (kyc?.sourceOfFunds) completedFields.push('source_of_funds');
    if (kyc?.idNumber) completedFields.push('id_number');
    if (kyc?.idImage) completedFields.push('id_image');
    if (kyc?.nrbValidation) completedFields.push('nrb_validation');

    for (const field of targetTier.requiredKycFields) {
      if (!completedFields.includes(field)) {
        missing.push(field);
      }
    }

    // Check rules
    const rules = targetTier.kycRules || {};

    if (rules.minimum_age && kyc?.dateOfBirth) {
      const age = Math.floor(
        (Date.now() - new Date(kyc.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      if (age < rules.minimum_age) {
        failed.push({
          rule: 'minimum_age',
          reason: `Must be at least ${rules.minimum_age} years old (currently ${age})`,
        });
      }
    }

    if (rules.id_required && !kyc?.idNumber) {
      failed.push({ rule: 'id_required', reason: 'ID number is required' });
    }

    if (rules.nrb_verification && !kyc?.nrbValidation) {
      failed.push({ rule: 'nrb_verification', reason: 'NRB verification is required' });
    }

    setMissingFields(missing);
    setFailedRules(failed);
    setCanUpgrade(missing.length === 0 && failed.length === 0);
    setChecking(false);
  };

  const handleUpgrade = async () => {
    try {
      await upgradeTier({
        variables: {
          mobileUserId,
          newTierId: targetTier.id,
        },
      });

      toast({
        title: 'Success',
        description: `User upgraded to ${targetTier.name} tier`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upgrade tier',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upgrade to {targetTier.name} Tier</DialogTitle>
          <DialogDescription>
            Review the tier upgrade requirements and benefits
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 pr-4">
            {/* Tier Change */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <Badge variant="outline" className="mb-2">
                  Current
                </Badge>
                <p className="text-lg font-semibold">
                  {currentTier?.name || 'No Tier'}
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <Badge className="mb-2">New</Badge>
                <p className="text-lg font-semibold">{targetTier.name}</p>
              </div>
            </div>

            <Separator />

            {/* Eligibility Status */}
            {checking ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {canUpgrade ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      User meets all requirements for this tier upgrade
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      User does not meet all requirements for this tier
                    </AlertDescription>
                  </Alert>
                )}

                {/* Missing Fields */}
                {missingFields.length > 0 && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Missing KYC Fields
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {missingFields.map((field) => (
                        <li key={field}>{getKYCFieldLabel(field)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Failed Rules */}
                {failedRules.length > 0 && (
                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      Failed Requirements
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {failedRules.map((rule, i) => (
                        <li key={i}>{rule.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {/* Tier Benefits */}
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-semibold text-sm">New Tier Benefits</h4>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Max Balance</dt>
                  <dd className="font-medium">{formatCurrency(targetTier.maximumBalance)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Max Transaction</dt>
                  <dd className="font-medium">
                    {formatCurrency(targetTier.maxTransactionAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Daily Limit</dt>
                  <dd className="font-medium">
                    {formatCurrency(targetTier.dailyTransactionLimit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Monthly Limit</dt>
                  <dd className="font-medium">
                    {formatCurrency(targetTier.monthlyTransactionLimit)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Required KYC Fields */}
            {targetTier.requiredKycFields.length > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-semibold text-sm">Required KYC Fields</h4>
                <div className="flex flex-wrap gap-2">
                  {targetTier.requiredKycFields.map((field) => (
                    <Badge key={field} variant="secondary">
                      {getKYCFieldLabel(field)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={!canUpgrade || upgrading || checking}
          >
            {upgrading ? 'Upgrading...' : 'Confirm Upgrade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
