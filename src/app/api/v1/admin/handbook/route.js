import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import HandbookDocument from "@/lib/db/models/HandbookDocument";

export async function GET(request) {
    try {
        await dbConnect();
        const docs = await HandbookDocument.find({}).sort({ createdAt: -1 });
        return NextResponse.json(docs);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await dbConnect();
        const body = await request.json();

        if (!body.title || !body.fileUrl) {
            return NextResponse.json({ error: "Title and File URL are required" }, { status: 400 });
        }

        const newDoc = await HandbookDocument.create(body);
        return NextResponse.json(newDoc, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        await HandbookDocument.findByIdAndDelete(id);
        return NextResponse.json({ message: "Document deleted" });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
