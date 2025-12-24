import { getExternalBanks } from "./actions";
import { ExternalBanksClientView } from "./client-view";

export default async function ExternalBanksPage() {
    const banks = await getExternalBanks();
    return <ExternalBanksClientView banks={banks} />;
}
