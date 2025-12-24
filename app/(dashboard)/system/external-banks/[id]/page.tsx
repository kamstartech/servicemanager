import { getExternalBank } from "../actions";
import { notFound } from "next/navigation";
import { ExternalBankDetailsView } from "../details-view";

export default async function ExternalBankDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const bank = await getExternalBank(id);
    if (!bank) {
        notFound();
    }

    return <ExternalBankDetailsView bank={bank} />;
}
