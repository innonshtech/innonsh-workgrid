import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { VendorInvoice } from '@/lib/db/models/finance/Vendor';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);

        const { searchParams } = new URL(request.url);
        const vendorId = searchParams.get('vendorId');
        const status = searchParams.get('status');

        let query = {};
        if (vendorId) query.vendor = vendorId;
        if (status) query.status = status;

        const invoices = await VendorInvoice.find(query)
            .populate('vendor', 'name companyName')
            .sort({ invoiceDate: -1 });

        return NextResponse.json({ invoices });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);

        const body = await request.json();

        // Basic validation
        if (!body.vendor || !body.totalAmount || !body.invoiceNumber) {
            return NextResponse.json({ error: "Vendor, Amount, and Invoice Number are required" }, { status: 400 });
        }

        const invoice = await VendorInvoice.create(body);
        return NextResponse.json({ invoice, message: "Invoice recorded successfully" }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);

        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });

        const invoice = await VendorInvoice.findByIdAndUpdate(id, updateData, { new: true });
        return NextResponse.json({ invoice, message: "Invoice updated successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
