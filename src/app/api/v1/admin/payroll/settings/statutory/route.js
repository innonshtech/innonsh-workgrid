
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StatutoryConfig from '@/lib/db/models/payroll/StatutoryConfig';

// GET: Fetch all configs or a specific state's config
export async function GET(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const state = searchParams.get('state');

        let query = {};
        if (state) {
            query = { state: { $regex: new RegExp(state, 'i') } };
        }

        const configs = await StatutoryConfig.find(query);
        return NextResponse.json(configs);
    } catch (error) {
        console.error('Error fetching statutory configs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create or Update a config
export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();
        const { state, ptSlabs, lwfRules, isEnabled, ptApplicable, lwfApplicable } = body;

        if (!state) {
            return NextResponse.json({ error: 'State is required' }, { status: 400 });
        }

        // Check if config exists for state (case-insensitive)
        let config = await StatutoryConfig.findOne({ state: { $regex: new RegExp(`^${state}$`, 'i') } });

        if (config) {
            // Update existing
            config.ptSlabs = ptSlabs || config.ptSlabs;
            config.lwfRules = lwfRules || config.lwfRules;
            config.isEnabled = isEnabled !== undefined ? isEnabled : config.isEnabled;
            config.ptApplicable = ptApplicable !== undefined ? ptApplicable : config.ptApplicable;
            config.lwfApplicable = lwfApplicable !== undefined ? lwfApplicable : config.lwfApplicable;
            // config.lastUpdatedBy = user?._id; // To be added when auth context is available
            await config.save();
        } else {
            // Create new
            config = await StatutoryConfig.create({
                state,
                ptSlabs,
                lwfRules,
                isEnabled,
                ptApplicable,
                lwfApplicable
            });
        }

        return NextResponse.json({ message: 'Configuration saved successfully', config });

    } catch (error) {
        console.error('Error saving statutory config:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
