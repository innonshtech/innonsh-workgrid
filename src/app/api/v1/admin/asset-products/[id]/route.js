import dbConnect from "@/lib/db/connect";
import ProductCatalog from "@/lib/db/models/ProductCatalog";
import { NextResponse } from "next/server";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function PUT(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const { id } = params;
        const body = await request.json();

        let query = { _id: id };
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        const product = await ProductCatalog.findOneAndUpdate(query, body, { new: true });
        
        if (!product) {
            return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: product, message: "Product updated successfully" });
    } catch (error) {
        console.error("PUT ASSET PRODUCT ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: error.status || 400 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const { id } = params;

        let query = { _id: id };
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        // Ideally check if assets exist for this product before deleting, 
        // but for now we just delete the catalog entry.
        const product = await ProductCatalog.findOneAndDelete(query);
        
        if (!product) {
            return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("DELETE ASSET PRODUCT ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: error.status || 400 });
    }
}
