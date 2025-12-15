"use client";

import { useQuery, gql, useMutation } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Trash2, Edit, Power } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const GET_BENEFICIARIES = gql`
  query GetBeneficiaries($userId: ID!) {
    beneficiaries(userId: $userId) {
      id
      name
      beneficiaryType
      phoneNumber
      accountNumber
      bankCode
      bankName
      branch
      description
      isActive
      createdAt
      updatedAt
    }
  }
`;

const DELETE_BENEFICIARY = gql`
  mutation DeleteBeneficiary($id: ID!) {
    deleteBeneficiary(id: $id)
  }
`;

const TOGGLE_BENEFICIARY_STATUS = gql`
  mutation ToggleBeneficiaryStatus($id: ID!) {
    toggleBeneficiaryStatus(id: $id) {
      id
      isActive
    }
  }
`;

export default function BeneficiariesPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const { data, loading, error, refetch } = useQuery(GET_BENEFICIARIES, {
    variables: { userId },
  });

  const [deleteBeneficiary] = useMutation(DELETE_BENEFICIARY, {
    onCompleted: () => {
      toast.success("Beneficiary deleted successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete beneficiary: ${error.message}`);
    },
  });

  const [toggleStatus] = useMutation(TOGGLE_BENEFICIARY_STATUS, {
    onCompleted: () => {
      toast.success("Beneficiary status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  const handleDelete = async (id: string) => {
    await deleteBeneficiary({ variables: { id } });
  };

  const handleToggleStatus = async (id: string) => {
    await toggleStatus({ variables: { id } });
  };

  const getBeneficiaryTypeLabel = (type: string) => {
    switch (type) {
      case "WALLET":
        return "Wallet";
      case "BANK_INTERNAL":
        return "Bank (Internal)";
      case "BANK_EXTERNAL":
        return "Bank (External)";
      default:
        return type;
    }
  };

  const getIdentifier = (beneficiary: any) => {
    switch (beneficiary.beneficiaryType) {
      case "WALLET":
        return beneficiary.phoneNumber;
      case "BANK_INTERNAL":
      case "BANK_EXTERNAL":
        return beneficiary.accountNumber;
      default:
        return "-";
    }
  };

  const getBankInfo = (beneficiary: any) => {
    if (beneficiary.beneficiaryType === "BANK_INTERNAL") {
      return "FDH Bank";
    }
    if (beneficiary.beneficiaryType === "BANK_EXTERNAL") {
      return beneficiary.bankName || beneficiary.bankCode || "-";
    }
    return "-";
  };

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading beneficiaries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error: {error.message}</p>
      </div>
    );
  }

  const beneficiaries = data?.beneficiaries || [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/wallet/users/${userId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Beneficiaries</h1>
            <p className="text-muted-foreground">
              Manage beneficiaries for user #{userId}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/wallet/users/${userId}/beneficiaries/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Beneficiary
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Beneficiaries ({beneficiaries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {beneficiaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No beneficiaries found.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link href={`/wallet/users/${userId}/beneficiaries/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Beneficiary
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Identifier</th>
                    <th className="text-left p-3 font-medium">Bank</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficiaries.map((beneficiary: any) => (
                    <tr key={beneficiary.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">{beneficiary.name}</td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {getBeneficiaryTypeLabel(beneficiary.beneficiaryType)}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-sm">
                        {getIdentifier(beneficiary)}
                      </td>
                      <td className="p-3">{getBankInfo(beneficiary)}</td>
                      <td className="p-3">
                        <Badge variant={beneficiary.isActive ? "default" : "secondary"}>
                          {beneficiary.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            asChild
                            className="text-amber-700 bg-amber-50 hover:bg-amber-100 hover:text-amber-800 border-amber-200"
                          >
                            <Link
                              href={`/wallet/users/${userId}/beneficiaries/${beneficiary.id}/edit`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleStatus(beneficiary.id)}
                            className="text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 border-blue-200"
                          >
                            <Power className="h-4 w-4 mr-2" />
                            Toggle
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-700 bg-red-50 hover:bg-red-100 hover:text-red-800 border-red-200"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Beneficiary</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{beneficiary.name}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(beneficiary.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
