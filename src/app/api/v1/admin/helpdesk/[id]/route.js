import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HelpdeskTicket from "@/lib/db/models/HelpdeskTicket";
import User from "@/lib/db/models/User";
import Employee from "@/lib/db/models/payroll/Employee";

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

        let assignedToData = null;
        if (ticket.assignedTo) {
            const userObj = await User.findById(ticket.assignedTo).select('name');
            if (userObj) {
                assignedToData = { _id: userObj._id, name: userObj.name };
            } else {
                const empObj = await Employee.findById(ticket.assignedTo).select('personalDetails');
                if (empObj) {
                    assignedToData = { 
                        _id: empObj._id, 
                        name: `${empObj.personalDetails.firstName} ${empObj.personalDetails.lastName}` 
                    };
                }
            }
        }

        const ticketJson = ticket.toObject();
        ticketJson.assignedTo = assignedToData || ticket.assignedTo;

        return NextResponse.json(ticketJson);
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
