import dbConnect from "@/lib/db/connect";
import Asset from "@/lib/db/models/Asset";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
    console.log("PUT Asset API HIT");
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        console.log("PUT Body:", body);

        const asset = await Asset.findById(id);
        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        // Update history only if relevant changes occur
        // Update history only if relevant changes occur
        // 1. Assignment change
        if (body.assignedTo && body.assignedTo !== asset.assignedTo) {
            asset.history.push({
                action: "Assigned",
                date: new Date(),
                details: `Assigned to employee ID: ${body.assignedTo}`,
            });
            // Also update status to Assigned if not explicitly set
            if (!body.status) body.status = "Assigned";
        } else if (!body.assignedTo && asset.assignedTo) {
            asset.history.push({
                action: "Unassigned",
                date: new Date(),
                details: `Unassigned from employee ID: ${asset.assignedTo}`,
            });
            if (!body.status) body.status = "Available";
        }

        // 2. Status change
        if (body.status && body.status !== asset.status) {
            asset.history.push({
                action: "Status Change",
                date: new Date(),
                details: `Status changed from ${asset.status} to ${body.status}`,
            });
        }

        Object.assign(asset, body);
        await asset.save();
        return NextResponse.json(asset);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        // Soft delete usually preferred, but for now we'll allow status update to "Retired"
        // or actual delete if requested. Let's start with marking as Retired.

        const asset = await Asset.findByIdAndDelete(id);

        if (!asset) {
            return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Asset deleted successfully", asset });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
