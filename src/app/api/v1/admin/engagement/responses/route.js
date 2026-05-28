import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import PulseResponse from '@/lib/db/models/engagement/PulseResponse';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(req) {
    try {
        const authUser = await getAuthUser();
        // Allow employees and admins
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
        
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const surveyId = searchParams.get('surveyId');

        if (authUser.role !== 'employee') {
            const query = surveyId ? { surveyId } : {};
            const responses = await PulseResponse.find(query).populate('employeeId', 'personalDetails.firstName personalDetails.lastName');
            return NextResponse.json({ success: true, responses });
        } else {
            // Employee: Fetch only their responses
            const query = { employeeId: authUser.id };
            if (surveyId) query.surveyId = surveyId;
            const responses = await PulseResponse.find(query);
            return NextResponse.json({ success: true, responses });
        }
    } catch (error) {
        console.error('Fetch responses error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}

export async function POST(req) {
    try {
        const authUser = await getAuthUser();
        // Everyone can post if they have an account
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin", "employee"]);
        
        await dbConnect();
        const body = await req.json();

        // Prevent duplicate responses for the same survey
        const existing = await PulseResponse.findOne({
            surveyId: body.surveyId,
            employeeId: authUser.id
        });

        if (existing) {
            return NextResponse.json({ success: false, message: 'You have already submitted a response for this survey' }, { status: 400 });
        }

        const response = await PulseResponse.create({
            ...body,
            employeeId: authUser.id
        });

        return NextResponse.json({ success: true, response }, { status: 201 });
    } catch (error) {
        console.error('Submit response error:', error);
        return NextResponse.json({ success: false, message: 'Server error: ' + error.message }, { status: error.status || 500 });
    }
}
