'use client';

import { useActionState } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AVAILABLE_KYC_FIELDS, AVAILABLE_KYC_RULES, getKYCFieldLabel } from '@/lib/services/wallet-tiers/validation';
import type { TierFormState } from '@/lib/actions';

type TierFormProps = {
  action: (prevState: TierFormState, formData: FormData) => Promise<TierFormState>;
  initialData?: {
    name: string;
    description?: string;
    position: number;
    isDefault: boolean;
    minimumBalance: number;
    maximumBalance: number;
    maximumCreditLimit?: number;
    maximumDebtLimit?: number;
    minTransactionAmount: number;
    maxTransactionAmount: number;
    dailyTransactionLimit: number;
    monthlyTransactionLimit: number;
    dailyTransactionCount: number;
    monthlyTransactionCount: number;
    requiredKycFields: string[];
    kycRules: Record<string, any>;
  };
  isEdit?: boolean;
};

export function TierForm({ action, initialData, isEdit }: TierFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [selectedKycFields, setSelectedKycFields] = useState<string[]>(
    initialData?.requiredKycFields || []
  );
  const [kycRules, setKycRules] = useState<Record<string, any>>(
    initialData?.kycRules || {}
  );

  const toggleKycField = (field: string) => {
    setSelectedKycFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const updateKycRule = (key: string, value: any) => {
    setKycRules((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="requiredKycFields" value={JSON.stringify(selectedKycFields)} />
      <input type="hidden" name="kycRules" value={JSON.stringify(kycRules)} />

      {state.errors?._form && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {state.errors._form.join(', ')}
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>General tier details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name}
                placeholder="e.g., Silver"
                required
              />
              {state.errors?.name && (
                <p className="text-sm text-red-600">{state.errors.name.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                name="position"
                type="number"
                defaultValue={initialData?.position || 1}
                required
              />
              <p className="text-sm text-muted-foreground">Hierarchy position (1, 2, 3...)</p>
              {state.errors?.position && (
                <p className="text-sm text-red-600">{state.errors.position.join(', ')}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialData?.description}
              placeholder="Brief description of this tier..."
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Default Tier</Label>
              <p className="text-sm text-muted-foreground">Automatically assigned to new users</p>
            </div>
            <Switch name="isDefault" defaultChecked={initialData?.isDefault} />
          </div>
        </CardContent>
      </Card>

      {/* Balance Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Limits</CardTitle>
          <CardDescription>Minimum and maximum balance constraints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minimumBalance">Minimum Balance (MWK)</Label>
              <Input
                id="minimumBalance"
                name="minimumBalance"
                type="number"
                defaultValue={initialData?.minimumBalance || 0}
                required
              />
              {state.errors?.minimumBalance && (
                <p className="text-sm text-red-600">{state.errors.minimumBalance.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximumBalance">Maximum Balance (MWK)</Label>
              <Input
                id="maximumBalance"
                name="maximumBalance"
                type="number"
                defaultValue={initialData?.maximumBalance || 50000}
                required
              />
              {state.errors?.maximumBalance && (
                <p className="text-sm text-red-600">{state.errors.maximumBalance.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximumCreditLimit">Maximum Credit Limit (MWK)</Label>
              <Input
                id="maximumCreditLimit"
                name="maximumCreditLimit"
                type="number"
                defaultValue={initialData?.maximumCreditLimit || 0}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximumDebtLimit">Maximum Debt Limit (MWK)</Label>
              <Input
                id="maximumDebtLimit"
                name="maximumDebtLimit"
                type="number"
                defaultValue={initialData?.maximumDebtLimit || 0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Limits</CardTitle>
          <CardDescription>Per-transaction and periodic limits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minTransactionAmount">Min Transaction Amount (MWK)</Label>
              <Input
                id="minTransactionAmount"
                name="minTransactionAmount"
                type="number"
                defaultValue={initialData?.minTransactionAmount || 100}
                required
              />
              {state.errors?.minTransactionAmount && (
                <p className="text-sm text-red-600">{state.errors.minTransactionAmount.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTransactionAmount">Max Transaction Amount (MWK)</Label>
              <Input
                id="maxTransactionAmount"
                name="maxTransactionAmount"
                type="number"
                defaultValue={initialData?.maxTransactionAmount || 10000}
                required
              />
              {state.errors?.maxTransactionAmount && (
                <p className="text-sm text-red-600">{state.errors.maxTransactionAmount.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyTransactionLimit">Daily Transaction Limit (MWK)</Label>
              <Input
                id="dailyTransactionLimit"
                name="dailyTransactionLimit"
                type="number"
                defaultValue={initialData?.dailyTransactionLimit || 20000}
                required
              />
              {state.errors?.dailyTransactionLimit && (
                <p className="text-sm text-red-600">{state.errors.dailyTransactionLimit.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyTransactionLimit">Monthly Transaction Limit (MWK)</Label>
              <Input
                id="monthlyTransactionLimit"
                name="monthlyTransactionLimit"
                type="number"
                defaultValue={initialData?.monthlyTransactionLimit || 100000}
                required
              />
              {state.errors?.monthlyTransactionLimit && (
                <p className="text-sm text-red-600">{state.errors.monthlyTransactionLimit.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyTransactionCount">Daily Transaction Count</Label>
              <Input
                id="dailyTransactionCount"
                name="dailyTransactionCount"
                type="number"
                defaultValue={initialData?.dailyTransactionCount || 10}
                required
              />
              {state.errors?.dailyTransactionCount && (
                <p className="text-sm text-red-600">{state.errors.dailyTransactionCount.join(', ')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyTransactionCount">Monthly Transaction Count</Label>
              <Input
                id="monthlyTransactionCount"
                name="monthlyTransactionCount"
                type="number"
                defaultValue={initialData?.monthlyTransactionCount || 50}
                required
              />
              {state.errors?.monthlyTransactionCount && (
                <p className="text-sm text-red-600">{state.errors.monthlyTransactionCount.join(', ')}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KYC Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>KYC Requirements</CardTitle>
          <CardDescription>Required fields and validation rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Required KYC Fields</h4>
            <div className="grid gap-3 md:grid-cols-2">
              {AVAILABLE_KYC_FIELDS.map((field) => (
                <div key={field} className="flex items-center space-x-2">
                  <Checkbox
                    id={field}
                    checked={selectedKycFields.includes(field)}
                    onCheckedChange={() => toggleKycField(field)}
                  />
                  <label htmlFor={field} className="text-sm font-medium leading-none">
                    {getKYCFieldLabel(field)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-3">Validation Rules</h4>
            <div className="space-y-4">
              {AVAILABLE_KYC_RULES.map((rule) => (
                <div key={rule.key}>
                  {rule.type === 'boolean' ? (
                    <div className="flex items-center justify-between">
                      <label className="text-sm">{rule.label}</label>
                      <Switch
                        checked={kycRules[rule.key] || false}
                        onCheckedChange={(checked) => updateKycRule(rule.key, checked)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-sm">{rule.label}</label>
                      <Input
                        type="number"
                        value={kycRules[rule.key] || ''}
                        onChange={(e) => updateKycRule(rule.key, parseInt(e.target.value))}
                        placeholder="Enter value..."
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : isEdit ? 'Update Tier' : 'Create Tier'}
        </Button>
      </div>
    </form>
  );
}
