// app/api/crm/documents/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Documents from "@/lib/db/models/crm/Documents/Documents";

// GET: Fetch all documents
export async function GET(request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit")) || 1000;

    const documents = await Documents.find()
      .select("_id name description")
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      { data: documents },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

// POST: Create a new document
export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, description,documentCategory } = body;

    // Basic validation
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Document name is required and must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existingDocument = await Documents.findOne({ name: name.trim() });
    if (existingDocument) {
      return NextResponse.json(
        { error: "A document with this name already exists" },
        { status: 409 }
      );
    }

    // Create new document
    const document = new Documents({
      name: name.trim(),
      description: description?.trim() || "",
      documentCategory: documentCategory,
    });

    await document.save();

    console.log(document);
    
    return NextResponse.json(
      {
        _id: document._id,
        name: document.name,
        description: document.description,
        documentCategory: document.documentCategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating document:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: Object.values(error.errors)[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}