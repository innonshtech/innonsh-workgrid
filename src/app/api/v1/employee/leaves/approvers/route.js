import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/connect';
import Employee from '@/lib/db/models/payroll/Employee';
import '@/lib/db/models/crm/organization/Team'; 
import { getAuthUser } from '@/lib/auth-util';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const search = (searchParams.get('search') || '').trim();
        const mode = searchParams.get('mode') || 'managers'; // 'managers' or 'search'

        // Base query: Exclude self, only active employees
        let query = {
            _id: { $ne: authUser.id },
            status: 'Active'
        };

        // MODE 1: "managers" — Return ALL managers/leads across the organization (no team restriction)
        if (mode === 'managers' || (!search && mode !== 'search')) {
            const leadershipDesignations = [
                { 'jobDetails.designation': { $regex: 'Manager', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'HR', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'Lead', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'Admin', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'Director', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'Head', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'Supervisor', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'CTO', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'CEO', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'COO', $options: 'i' } },
                { 'jobDetails.designation': { $regex: 'VP', $options: 'i' } }
            ];

            query.$or = leadershipDesignations;

            const managers = await Employee.find(query)
                .select('_id employeeId personalDetails.firstName personalDetails.lastName personalDetails.thumbnail jobDetails.designation jobDetails.department')
                .sort({ 'personalDetails.firstName': 1 })
                .limit(50);

            return NextResponse.json({
                success: true,
                data: managers
            });
        }

        // MODE 2: "search" — Search ANY employee by name, ID, or designation (no restrictions)
        if (search && search.length >= 2) {
            const searchParts = search.split(/\s+/);
            const searchRegexes = searchParts.map(p => new RegExp(p, 'i'));
            const searchRegex = new RegExp(search, 'i');

            query.$or = [
                { employeeId: searchRegex },
                {
                    $and: searchRegexes.map(regex => ({
                        $or: [
                            { 'personalDetails.firstName': regex },
                            { 'personalDetails.lastName': regex }
                        ]
                    }))
                },
                { 'jobDetails.designation': searchRegex },
                { 'jobDetails.department': searchRegex }
            ];

            const employees = await Employee.find(query)
                .select('_id employeeId personalDetails.firstName personalDetails.lastName personalDetails.thumbnail jobDetails.designation jobDetails.department')
                .sort({ 'personalDetails.firstName': 1 })
                .limit(20);

            return NextResponse.json({
                success: true,
                data: employees
            });
        }

        // Fallback: return empty if search is too short
        return NextResponse.json({ success: true, data: [] });

    } catch (error) {
        console.error('Error searching approvers:', error);
        return NextResponse.json({ success: false, error: 'Failed to search employees' }, { status: 500 });
    }
}
