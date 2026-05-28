
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import PayrollRun from '@/lib/db/models/payroll/PayrollRun';
import VariablePayConfig from '@/lib/db/models/payroll/VariablePayConfig';
import PayrollVariableInput from '@/lib/db/models/payroll/PayrollVariableInput';

export async function GET(req) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const runId = searchParams.get('runId');

        if (!runId) {
            return NextResponse.json({ error: 'Run ID is required' }, { status: 400 });
        }

        const run = await PayrollRun.findById(runId);
        if (!run) {
            return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
        }

        // Fetch all active employees associated with the run's organization
        // Note: In a real scenario, we might want to filter by the specific employees included in the run if that list exists.
        // For now, we fetch all active employees in the org.
        const employees = await Employee.find({
            'jobDetails.organizationId': run.organizationId,
            status: 'Active',
            'variablePayStructure.0': { $exists: true } // Only employees with variable pay assigned
        }).select('personalDetails.firstName personalDetails.lastName personalDetails.employeeCode variablePayStructure');

        // Fetch existing inputs for this run
        const inputs = await PayrollVariableInput.find({ payrollRunId: runId });
        const inputMap = {};
        inputs.forEach(input => {
            if (!inputMap[input.employeeId]) inputMap[input.employeeId] = {};
            inputMap[input.employeeId][input.componentId] = input;
        });

        // Fetch all variable pay components to get names
        const components = await VariablePayConfig.find({});
        const componentMap = {};
        components.forEach(c => componentMap[c._id] = c);

        const data = employees.map(emp => {
            const structure = emp.variablePayStructure.map(item => {
                const component = componentMap[item.componentId];
                const existingInput = inputMap[emp._id]?.[item.componentId];

                return {
                    componentId: item.componentId,
                    componentName: component?.name || 'Unknown',
                    targetAmount: item.targetAmount,
                    frequency: item.frequency,
                    achievementPercentage: existingInput ? existingInput.achievementPercentage : 100, // Default to 100%
                    payoutAmount: existingInput ? existingInput.payoutAmount : item.targetAmount // Default to target
                };
            });

            return {
                employeeId: emp._id,
                name: `${emp.personalDetails.firstName} ${emp.personalDetails.lastName}`,
                code: emp.personalDetails.employeeCode, // Assuming this field exists, otherwise remove
                structure
            };
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching variable pay inputs:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const body = await req.json();
        const { runId, inputs } = body;

        if (!runId || !Array.isArray(inputs)) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }

        const run = await PayrollRun.findById(runId);
        if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

        // Inputs is an array of { employeeId, componentId, achievementPercentage, payoutAmount }
        const operations = inputs.map(input => ({
            updateOne: {
                filter: {
                    payrollRunId: runId,
                    employeeId: input.employeeId,
                    componentId: input.componentId
                },
                update: {
                    $set: {
                        achievementPercentage: input.achievementPercentage,
                        payoutAmount: input.payoutAmount,
                        month: run.month,
                        year: run.year
                    }
                },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            await PayrollVariableInput.bulkWrite(operations);
        }

        return NextResponse.json({ message: 'Variable pay inputs saved successfully' });
    } catch (error) {
        console.error("Error saving variable pay inputs:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
