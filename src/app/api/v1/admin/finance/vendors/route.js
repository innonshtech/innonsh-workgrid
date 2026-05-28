import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/connect';
import { Vendor } from '@/lib/db/models/finance/Vendor';

export async function GET() {
    try {
        await dbConnect();
        const vendors = await Vendor.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ vendors });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();

        // Basic validation
        if (!body.name) {
            return NextResponse.json({ error: "Vendor name is required" }, { status: 400 });
        }

        const vendor = await Vendor.create(body);
        return NextResponse.json({ vendor, message: "Vendor added successfully" }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
export async function PUT(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const body = await request.json();

        if (!id) return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });

        const vendor = await Vendor.findByIdAndUpdate(id, body, { new: true });
        return NextResponse.json({ vendor, message: "Vendor updated successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Vendor ID is required" }, { status: 400 });

        await Vendor.findByIdAndDelete(id);
        return NextResponse.json({ message: "Vendor deleted successfully" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
