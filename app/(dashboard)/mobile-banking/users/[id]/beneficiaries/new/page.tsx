"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GET_EXTERNAL_BANKS = gql`
  query GetExternalBanks {
    externalBanks {
      id
      name
      code
      type
    }
  }
`;

const CREATE_BENEFICIARY = gql`
  mutation CreateBeneficiary($input: BeneficiaryInput!) {
    createBeneficiary(input: $input) {
      id
      name
      beneficiaryType
    }
  }
`;

export default function NewBeneficiaryPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [beneficiaryType, setBeneficiaryType] = useState<string>("FDH_WALLET");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [branch, setBranch] = useState("");
  const [externalBankType, setExternalBankType] = useState<string>("BANK");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Fetch external banks
  const { data: externalBanksData } = useQuery(GET_EXTERNAL_BANKS);
  
  // Filter banks based on beneficiary type
  const availableBanks = externalBanksData?.externalBanks?.filter((bank: any) => {
    if (beneficiaryType === "EXTERNAL_BANK") {
      return bank.type === "BANK";
    } else if (beneficiaryType === "EXTERNAL_WALLET") {
      return bank.type === "WALLET";
    }
    return false;
  }) || [];

  const [createBeneficiary, { loading }] = useMutation(CREATE_BENEFICIARY, {
    onCompleted: () => {
      toast.success("Beneficiary created successfully");
      router.push(`/mobile-banking/users/${userId}/beneficiaries`);
    },
    onError: (error) => {
      toast.error(`Failed to create beneficiary: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: any = {
      userId: parseInt(userId),
      name: name.trim(),
      beneficiaryType,
      isActive,
    };

    if (beneficiaryType === "FDH_WALLET") {
      input.accountNumber = phoneNumber.trim(); // Phone stored in accountNumber
    } else if (beneficiaryType === "EXTERNAL_WALLET") {
      input.accountNumber = phoneNumber.trim(); // Phone stored in accountNumber
      input.bankCode = bankCode.trim();
      if (bankName.trim()) input.bankName = bankName.trim();
      input.externalBankType = "WALLET";
    } else if (beneficiaryType === "FDH_BANK") {
      input.accountNumber = accountNumber.trim();
    } else if (beneficiaryType === "EXTERNAL_BANK") {
      input.accountNumber = accountNumber.trim();
      input.bankCode = bankCode.trim();
      if (bankName.trim()) input.bankName = bankName.trim();
      if (branch.trim()) input.branch = branch.trim();
      input.externalBankType = "BANK";
    }

    if (description.trim()) {
      input.description = description.trim();
    }

    await createBeneficiary({ variables: { input } });
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/mobile-banking/users/${userId}/beneficiaries`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Add Beneficiary</h1>
          <p className="text-muted-foreground">
            Create a new beneficiary for user #{userId}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Beneficiary Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Beneficiary Type */}
            <div className="space-y-2">
              <Label>Beneficiary Type *</Label>
              <RadioGroup
                value={beneficiaryType}
                onValueChange={setBeneficiaryType}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FDH_WALLET" id="fdh-wallet" />
                  <Label htmlFor="fdh-wallet" className="font-normal cursor-pointer">
                    FDH Wallet (Phone Number)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EXTERNAL_WALLET" id="external-wallet" />
                  <Label htmlFor="external-wallet" className="font-normal cursor-pointer">
                    External Wallet (Phone Number)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="FDH_BANK" id="fdh-bank" />
                  <Label htmlFor="fdh-bank" className="font-normal cursor-pointer">
                    FDH Bank Account
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="EXTERNAL_BANK" id="external-bank" />
                  <Label htmlFor="external-bank" className="font-normal cursor-pointer">
                    External Bank Account
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Beneficiary Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter beneficiary name"
                required
              />
            </div>

            {/* Wallet External Fields */}
            {beneficiaryType === "EXTERNAL_WALLET" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number *</Label>
                  <Input
                    id="phoneNumber"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+265991234567"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Include country code (e.g., +265)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mno">Mobile Network Operator *</Label>
                  <Select
                    value={bankCode}
                    onValueChange={(value) => {
                      const selectedBank = availableBanks.find((b: any) => b.code === value);
                      setBankCode(value);
                      setBankName(selectedBank?.name || "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select MNO" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.length === 0 ? (
                        <SelectItem value="none" disabled>No MNOs configured</SelectItem>
                      ) : (
                        availableBanks.map((bank: any) => (
                          <SelectItem key={bank.id} value={bank.code}>
                            {bank.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Wallet Fields */}
            {beneficiaryType === "FDH_WALLET" && (
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+265991234567"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Include country code (e.g., +265)
                </p>
              </div>
            )}

            {/* Bank Internal Fields */}
            {beneficiaryType === "FDH_BANK" && (
              <div className="space-y-2">
                <Label htmlFor="accountNumber">FDH Account Number *</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter FDH account number"
                  required
                />
              </div>
            )}

            {/* Bank External Fields */}
            {beneficiaryType === "EXTERNAL_BANK" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="bank">Select Bank *</Label>
                  <Select
                    value={bankCode}
                    onValueChange={(value) => {
                      const selectedBank = availableBanks.find((b: any) => b.code === value);
                      setBankCode(value);
                      setBankName(selectedBank?.name || "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBanks.length === 0 ? (
                        <SelectItem value="none" disabled>No banks configured</SelectItem>
                      ) : (
                        availableBanks.map((bank: any) => (
                          <SelectItem key={bank.id} value={bank.code}>
                            {bank.name} ({bank.code})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter account number"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">Branch (Optional)</Label>
                  <Input
                    id="branch"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="Branch name or code"
                  />
                </div>
              </>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any notes or description"
                rows={3}
              />
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="font-normal cursor-pointer">
                Active
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Beneficiary"}
              </Button>
              <Button
                type="button"
                variant="outline"
                asChild
              >
                <Link href={`/mobile-banking/users/${userId}/beneficiaries`}>
                  Cancel
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
