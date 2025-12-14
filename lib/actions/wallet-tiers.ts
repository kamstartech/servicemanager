'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';

const tierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  position: z.coerce.number().min(1, 'Position must be at least 1'),
  isDefault: z.coerce.boolean().default(false),
  minimumBalance: z.coerce.number().min(0),
  maximumBalance: z.coerce.number().min(0),
  maximumCreditLimit: z.coerce.number().min(0).optional(),
  maximumDebtLimit: z.coerce.number().min(0).optional(),
  minTransactionAmount: z.coerce.number().min(0),
  maxTransactionAmount: z.coerce.number().min(0),
  dailyTransactionLimit: z.coerce.number().min(0),
  monthlyTransactionLimit: z.coerce.number().min(0),
  dailyTransactionCount: z.coerce.number().int().min(1),
  monthlyTransactionCount: z.coerce.number().int().min(1),
  requiredKycFields: z.string().optional(),
  kycRules: z.string().optional(),
});

export type TierFormState = {
  errors?: {
    name?: string[];
    position?: string[];
    minimumBalance?: string[];
    maximumBalance?: string[];
    minTransactionAmount?: string[];
    maxTransactionAmount?: string[];
    dailyTransactionLimit?: string[];
    monthlyTransactionLimit?: string[];
    dailyTransactionCount?: string[];
    monthlyTransactionCount?: string[];
    _form?: string[];
  };
  success?: boolean;
};

export async function createWalletTier(
  prevState: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const validatedFields = tierSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    position: formData.get('position'),
    isDefault: formData.get('isDefault') === 'on',
    minimumBalance: formData.get('minimumBalance'),
    maximumBalance: formData.get('maximumBalance'),
    maximumCreditLimit: formData.get('maximumCreditLimit') || 0,
    maximumDebtLimit: formData.get('maximumDebtLimit') || 0,
    minTransactionAmount: formData.get('minTransactionAmount'),
    maxTransactionAmount: formData.get('maxTransactionAmount'),
    dailyTransactionLimit: formData.get('dailyTransactionLimit'),
    monthlyTransactionLimit: formData.get('monthlyTransactionLimit'),
    dailyTransactionCount: formData.get('dailyTransactionCount'),
    monthlyTransactionCount: formData.get('monthlyTransactionCount'),
    requiredKycFields: formData.get('requiredKycFields'),
    kycRules: formData.get('kycRules'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;
  
  try {
    const requiredKycFields = data.requiredKycFields 
      ? JSON.parse(data.requiredKycFields) 
      : [];
    const kycRules = data.kycRules 
      ? JSON.parse(data.kycRules) 
      : {};

    await prisma.walletTier.create({
      data: {
        name: data.name,
        description: data.description,
        position: data.position,
        isDefault: data.isDefault,
        minimumBalance: data.minimumBalance.toString(),
        maximumBalance: data.maximumBalance.toString(),
        maximumCreditLimit: (data.maximumCreditLimit || 0).toString(),
        maximumDebtLimit: (data.maximumDebtLimit || 0).toString(),
        minTransactionAmount: data.minTransactionAmount.toString(),
        maxTransactionAmount: data.maxTransactionAmount.toString(),
        dailyTransactionLimit: data.dailyTransactionLimit.toString(),
        monthlyTransactionLimit: data.monthlyTransactionLimit.toString(),
        dailyTransactionCount: data.dailyTransactionCount,
        monthlyTransactionCount: data.monthlyTransactionCount,
        requiredKycFields,
        kycRules,
      },
    });

    revalidatePath('/wallet/tiers');
  } catch (error) {
    return {
      errors: {
        _form: ['Failed to create tier. Please try again.'],
      },
    };
  }

  redirect('/wallet/tiers');
}

export async function updateWalletTier(
  id: number,
  prevState: TierFormState,
  formData: FormData
): Promise<TierFormState> {
  const validatedFields = tierSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    position: formData.get('position'),
    isDefault: formData.get('isDefault') === 'on',
    minimumBalance: formData.get('minimumBalance'),
    maximumBalance: formData.get('maximumBalance'),
    maximumCreditLimit: formData.get('maximumCreditLimit') || 0,
    maximumDebtLimit: formData.get('maximumDebtLimit') || 0,
    minTransactionAmount: formData.get('minTransactionAmount'),
    maxTransactionAmount: formData.get('maxTransactionAmount'),
    dailyTransactionLimit: formData.get('dailyTransactionLimit'),
    monthlyTransactionLimit: formData.get('monthlyTransactionLimit'),
    dailyTransactionCount: formData.get('dailyTransactionCount'),
    monthlyTransactionCount: formData.get('monthlyTransactionCount'),
    requiredKycFields: formData.get('requiredKycFields'),
    kycRules: formData.get('kycRules'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;
  
  try {
    const requiredKycFields = data.requiredKycFields 
      ? JSON.parse(data.requiredKycFields) 
      : [];
    const kycRules = data.kycRules 
      ? JSON.parse(data.kycRules) 
      : {};

    await prisma.walletTier.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        position: data.position,
        isDefault: data.isDefault,
        minimumBalance: data.minimumBalance.toString(),
        maximumBalance: data.maximumBalance.toString(),
        maximumCreditLimit: (data.maximumCreditLimit || 0).toString(),
        maximumDebtLimit: (data.maximumDebtLimit || 0).toString(),
        minTransactionAmount: data.minTransactionAmount.toString(),
        maxTransactionAmount: data.maxTransactionAmount.toString(),
        dailyTransactionLimit: data.dailyTransactionLimit.toString(),
        monthlyTransactionLimit: data.monthlyTransactionLimit.toString(),
        dailyTransactionCount: data.dailyTransactionCount,
        monthlyTransactionCount: data.monthlyTransactionCount,
        requiredKycFields,
        kycRules,
      },
    });

    revalidatePath('/wallet/tiers');
    revalidatePath(`/wallet/tiers/${id}`);
  } catch (error) {
    return {
      errors: {
        _form: ['Failed to update tier. Please try again.'],
      },
    };
  }

  redirect('/wallet/tiers');
}
