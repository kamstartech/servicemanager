
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const stepIds = [
        'cmjykbx85001ho228nrwxqlrv',
        'cmjykdtej001jo228gjdzs9qb',
        'cmjzqlm600005o22824lw4p7s'
    ];

    console.log('--- Inspecting Workflow Steps ---');

    const steps = await prisma.workflowStep.findMany({
        where: {
            id: { in: stepIds }
        },
        orderBy: { order: 'asc' }
    });

    for (const step of steps) {
        console.log(`\nStep ID: ${step.id}`);
        console.log(`Order: ${step.order}`);
        console.log(`Type: ${step.type}`);
        console.log(`Label: ${step.label}`);
        console.log(`Execution Mode: ${step.executionMode}`);
        console.log(`Trigger Timing: ${step.triggerTiming}`);
        console.log(`Trigger Endpoint: ${step.triggerEndpoint || 'N/A'}`);
        console.log(`Config:`, JSON.stringify(step.config, null, 2));
    }

    // Also check the workflow they belong to
    if (steps.length > 0) {
        const workflow = await prisma.workflow.findUnique({
            where: { id: steps[0].workflowId },
            include: { steps: { orderBy: { order: 'asc' }, select: { id: true, order: true, type: true } } }
        });
        console.log(`\n--- Workflow Context ---`);
        console.log(`Workflow ID: ${workflow?.id}`);
        console.log(`Steps Sequence:`);
        workflow?.steps.forEach(s => {
            const marker = stepIds.includes(s.id) ? ' <--- IN LOGS' : '';
            console.log(`  ${s.order}. ${s.type} (${s.id})${marker}`);
        });
    }

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
