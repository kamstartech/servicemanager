
import { ConfigurationService } from "@/lib/services/configuration-service";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
    // Fetch current values
    try {
        console.log("Fetching suspense accounts...");
        const inbound = await ConfigurationService.get("suspense_account_inbound");
        // Fallback to old key if not set, or default
        const initialInbound = inbound || await ConfigurationService.get("suspense_account") || "1520000114607";

        const outbound = await ConfigurationService.get("suspense_account_outbound");

        return <SettingsForm
            inboundSuspenseAccount={initialInbound}
            outboundSuspenseAccount={outbound}
        />;
    } catch (error) {
        console.error("Error in SettingsPage:", error);
        return <div>Error loading settings. Please check logs.</div>;
    }
}
