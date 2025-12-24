
import { ConfigurationService } from "@/lib/services/configuration-service";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
    // Fetch current values
    try {
        console.log("Fetching suspense account...");
        const suspenseAccount = await ConfigurationService.get("suspense_account");
        console.log("Suspense account fetched:", suspenseAccount);
        return <SettingsForm suspenseAccount={suspenseAccount} />;
    } catch (error) {
        console.error("Error in SettingsPage:", error);
        return <div>Error loading settings. Please check logs.</div>;
    }
}
