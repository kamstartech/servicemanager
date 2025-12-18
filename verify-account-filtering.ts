import { prisma } from "./lib/db/prisma";
import { workflowExecutionResolvers } from "./lib/graphql/schema/resolvers/workflowExecution";

async function verifyAccountFiltering() {
    console.log("Verifying account filtering...");

    // 1. Get a test workflow and user
    const user = await prisma.mobileUser.findFirst({
        include: { accounts: true }
    });

    if (!user) {
        console.log("No user found for test");
        return;
    }

    const workflow = await prisma.workflow.findFirst({
        where: { isActive: true },
        include: { steps: true }
    });

    if (!workflow) {
        console.log("No active workflow found for test");
        return;
    }

    // 2. Simulate startWorkflowExecution
    console.log(`Starting workflow ${workflow.id} for user ${user.id}`);

    const context = { userId: user.id.toString(), sessionId: "test-session" };
    const execution = await (workflowExecutionResolvers.Mutation as any).startWorkflowExecution(
        null,
        { workflowId: workflow.id, pageId: "test-page" },
        context
    );

    console.log("Workflow execution started");

    // 3. Inspect hydrated steps
    const accountSteps = execution.workflow.steps.filter((s: any) =>
        s.type === "FORM" && s.config.schema?.fields?.some((f: any) => f.type === "account")
    );

    if (accountSteps.length === 0) {
        console.log("No account form steps found in this workflow. Please ensure a workflow has a form with an 'account' field.");
        return;
    }

    accountSteps.forEach((s: any) => {
        const accountFields = s.config.schema.fields.filter((f: any) => f.type === "account");
        accountFields.forEach((f: any) => {
            console.log(`Field '${f.label}' options:`, f.options);
            console.log(`Field '${f.label}' accountOptions:`, f.accountOptions);
        });
    });
}

// Note: This script is meant for conceptual verification or running in a properly configured environment.
// verifyAccountFiltering().catch(console.error);
