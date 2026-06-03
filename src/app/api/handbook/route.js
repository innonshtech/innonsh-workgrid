import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HandbookDocument from "@/lib/db/models/HandbookDocument";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        await getAuthUser(); // Ensure user is authenticated
        await dbConnect();
        const docs = await HandbookDocument.find({}).sort({ createdAt: -1 });
        return NextResponse.json(docs);
    } catch (error) {
        const isAuthError = error.message.startsWith("Unauthorized");
        return NextResponse.json({ error: error.message }, { status: isAuthError ? 401 : 500 });
    }
}

export async function POST(request) {
    try {
        const user = await getAuthUser();
        // Restrict uploading to admin/hr/super_admin roles
        authorize(user, ["admin", "hr", "super_admin"]);

        await dbConnect();
        const body = await request.json();

        if (!body.title || !body.fileUrl) {
            return NextResponse.json({ error: "Title and File URL are required" }, { status: 400 });
        }

        const newDoc = await HandbookDocument.create({
            ...body,
            uploadedBy: user.id || user._id
        });
        return NextResponse.json(newDoc, { status: 201 });
    } catch (error) {
        console.error("Error uploading document:", error);
        const isAuthError = error.message.startsWith("Unauthorized") || error.message.startsWith("Forbidden");
        const status = isAuthError ? (error.message.startsWith("Unauthorized") ? 401 : 403) : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

export async function DELETE(request) {
    try {
        const user = await getAuthUser();
        // Restrict deleting to admin/hr/super_admin roles
        authorize(user, ["admin", "hr", "super_admin"]);

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        await HandbookDocument.findByIdAndDelete(id);
        return NextResponse.json({ message: "Document deleted" });
    } catch (error) {
        console.error("Error deleting document:", error);
        const isAuthError = error.message.startsWith("Unauthorized") || error.message.startsWith("Forbidden");
        const status = isAuthError ? (error.message.startsWith("Unauthorized") ? 401 : 403) : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}
