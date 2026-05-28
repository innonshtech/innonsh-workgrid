import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import JobRequisition from '@/lib/db/models/recruitment/JobRequisition';
import { getAuthUser, authorize } from '@/lib/auth-util';
import { z } from 'zod';

const jobSchema = z.object({
    title: z.string().min(1, "Title is required"),
    department: z.string().min(1, "Department is required"),
    location: z.string().min(1, "Location is required"),
    type: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']),
    workplaceType: z.enum(['On-site', 'Remote', 'Hybrid']).optional().default('On-site'),
    headcount: z.number().min(1).optional().default(1),
    experienceLevel: z.enum(['Entry', 'Mid', 'Senior', 'Executive', 'Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']).optional().nullable(),
    hiringManagerName: z.string().optional(),
    description: z.string().min(10, "Description must be at least 10 characters"),
    requirements: z.array(z.string()).optional(),
    salaryRange: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        currency: z.string().default('INR')
    }).optional(),
    targetDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const department = searchParams.get('department');

        let query = {};

        // SaaS PROTECTION: Scope to org
        if (authUser.role === 'admin') {
            query.organizationId = authUser.organizationId;
        } else if (authUser.role === 'super_admin') {
            const orgId = searchParams.get('organizationId');
            if (orgId) query.organizationId = orgId;
        }

        if (status) query.status = status;
        if (department) query.department = department;

        const jobs = await JobRequisition.find(query).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, jobs });
    } catch (error) {
        console.error("GET JOBS ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();
        
        // Convert empty string to undefined for Zod so it parses correctly
        if (body.targetDate === '') delete body.targetDate;
        if (!body.salaryRange?.min) delete body.salaryRange?.min;
        if (!body.salaryRange?.max) delete body.salaryRange?.max;

        const validatedData = jobSchema.parse(body);

        // SaaS PROTECTION: Attach org to the job
        const orgId = authUser.role === 'admin' ? authUser.organizationId : body.organizationId;

        const job = await JobRequisition.create({
            ...validatedData,
            status: 'Pending Approval',
            approvalChain: [
                { role: 'HR Admin', status: 'Pending' },
                { role: 'Department Head', status: 'Pending' }
            ],
            organizationId: orgId,
            createdBy: authUser.id
        });
        return NextResponse.json({ success: true, job, message: "Job requisition created successfully" }, { status: 201 });
    } catch (error) {
        console.error("POST JOB ERROR:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation failed', details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        
        const body = await request.json();
        const { jobId, status, approvalRole, approvalStatus, remarks } = body;
        const orgId = authUser.role === 'admin' ? authUser.organizationId : body.organizationId;

        const job = await JobRequisition.findOne({ _id: jobId, organizationId: orgId });
        if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

        if (approvalRole && approvalStatus) {
            const levelIndex = job.approvalChain.findIndex(c => c.role === approvalRole);
            if (levelIndex > -1) {
                job.approvalChain[levelIndex].status = approvalStatus;
                job.approvalChain[levelIndex].approvedBy = authUser.id;
                job.approvalChain[levelIndex].approvedAt = new Date();
                job.approvalChain[levelIndex].remarks = remarks || '';
                
                const allApproved = job.approvalChain.every(c => c.status === 'Approved');
                const anyRejected = job.approvalChain.some(c => c.status === 'Rejected');
                
                if (anyRejected) {
                    job.status = 'Rejected';
                } else if (allApproved) {
                    job.status = 'Open';
                }
            }
            await job.save();
            return NextResponse.json({ success: true, job });
        }

        // Edit mode: update editable fields
        const editableFields = ['title', 'department', 'location', 'type', 'priority', 'workplaceType', 'headcount', 'experienceLevel', 'hiringManagerName', 'description', 'requirements', 'salaryRange', 'targetDate'];
        const hasEdits = editableFields.some(f => body[f] !== undefined);

        if (hasEdits) {
            editableFields.forEach(field => {
                if (body[field] !== undefined) {
                    if (field === 'targetDate' && body[field]) {
                        job[field] = new Date(body[field]);
                    } else {
                        job[field] = body[field];
                    }
                }
            });
            if (status) job.status = status;
            await job.save();
            return NextResponse.json({ success: true, job });
        }

        if (status) {
            job.status = status;
            await job.save();
            return NextResponse.json({ success: true, job });
        }

        return NextResponse.json({ success: false, error: 'Invalid update payload' }, { status: 400 });

    } catch (error) {
        console.error("PUT JOB ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const jobId = searchParams.get('id');

        if (!jobId) {
            return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
        }

        const orgId = authUser.organizationId;
        const job = await JobRequisition.findOneAndDelete({ _id: jobId, organizationId: orgId });

        if (!job) {
            return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
        console.error("DELETE JOB ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
