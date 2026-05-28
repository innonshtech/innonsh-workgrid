import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import OfferLetter from '@/lib/db/models/recruitment/OfferLetter';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const candidateId = searchParams.get('candidateId');

        let query = {};
        
        // SaaS PROTECTION
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        if (candidateId) query.candidate = candidateId;

        const offers = await OfferLetter.find(query).populate('candidate', 'name email');
        return NextResponse.json({ success: true, offers });
    } catch (error) {
        console.error("GET OFFERS ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const body = await request.json();
        const orgId = authUser.role !== 'super_admin' ? authUser.organizationId : body.organizationId;
        const offer = await OfferLetter.create({ 
            ...body, 
            status: 'Pending Internal Approval',
            approvalChain: [
                { role: 'HR Admin', status: 'Pending' },
                { role: 'Finance', status: 'Pending' }
            ],
            organizationId: orgId, 
            sentBy: authUser.id 
        });
        return NextResponse.json({ success: true, offer, message: "Offer letter generated successfully" }, { status: 201 });
    } catch (error) {
        console.error("POST OFFER ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        await dbConnect();
        const body = await request.json();
        const { id, approvalRole, approvalStatus, remarks, ...updateData } = body;

        const offer = await OfferLetter.findById(id);
        if (!offer) return NextResponse.json({ success: false, error: 'Offer not found' }, { status: 404 });

        if (approvalRole && approvalStatus) {
            const levelIndex = offer.approvalChain.findIndex(c => c.role === approvalRole);
            if (levelIndex > -1) {
                offer.approvalChain[levelIndex].status = approvalStatus;
                offer.approvalChain[levelIndex].approvedBy = authUser.id;
                offer.approvalChain[levelIndex].approvedAt = new Date();
                offer.approvalChain[levelIndex].remarks = remarks || '';
                
                const allApproved = offer.approvalChain.every(c => c.status === 'Approved');
                const anyRejected = offer.approvalChain.some(c => c.status === 'Rejected');
                
                if (anyRejected) {
                    offer.status = 'Rejected';
                } else if (allApproved) {
                    offer.status = 'Approved';
                }
            }
            await offer.save();
            return NextResponse.json({ success: true, offer, message: "Approval status updated" });
        }

        if (Object.keys(updateData).length > 0) {
            Object.assign(offer, updateData);
            await offer.save();
        }

        return NextResponse.json({ success: true, offer, message: "Offer updated successfully" });
    } catch (error) {
        console.error("PUT OFFER ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
