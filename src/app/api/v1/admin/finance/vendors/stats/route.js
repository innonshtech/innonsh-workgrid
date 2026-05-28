import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { Vendor, VendorInvoice } from '@/lib/db/models/finance/Vendor';
import { getAuthUser, authorize } from '@/lib/auth-util';

export async function GET() {
    try {
        await dbConnect();
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "super_admin"]);
        
        const totalVendors = await Vendor.countDocuments();
        
        const invoices = await VendorInvoice.find({ status: { $ne: 'Cancelled' } });
        
        const stats = invoices.reduce((acc, inv) => {
            acc.totalExpenses += inv.totalAmount || 0;
            if (inv.status === 'Paid') {
                acc.paidAmount += inv.totalAmount || 0;
            } else if (inv.status === 'Approved' || inv.status === 'Pending') {
                acc.pendingPayments += inv.totalAmount || 0;
            }
            return acc;
        }, { totalExpenses: 0, paidAmount: 0, pendingPayments: 0 });

        return NextResponse.json({
            totalVendors,
            ...stats
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
