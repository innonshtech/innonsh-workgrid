import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HelpdeskTicket from "@/lib/db/models/HelpdeskTicket";

export async function GET(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;

        const ticket = await HelpdeskTicket.findById(id)
            .populate("employee", "personalDetails")
            .populate("comments.user", "name");

        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        const ticket = await HelpdeskTicket.findById(id);
        if (!ticket) {
            return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
        }

        // Handle Comment Addition
        if (body.newComment) {
            ticket.comments.push({
                user: body.newComment.userId,
                userName: body.newComment.userName,
                message: body.newComment.message,
                date: new Date(),
            });
        }

        // Handle Status/Priority/Assignment Updates
        if (body.status) ticket.status = body.status;
        if (body.priority) ticket.priority = body.priority;
        if (body.assignedTo) ticket.assignedTo = body.assignedTo;

        await ticket.save();
        return NextResponse.json(ticket);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
