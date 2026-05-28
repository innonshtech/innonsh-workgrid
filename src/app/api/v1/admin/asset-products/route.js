import dbConnect from "@/lib/db/connect";
import ProductCatalog from "@/lib/db/models/ProductCatalog";
import { NextResponse } from "next/server";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const { searchParams } = new URL(request.url);
        
        let query = {};
        
        // SaaS PROTECTION: Scope to org
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        const products = await ProductCatalog.find(query).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        console.error("GET ASSET PRODUCTS ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const body = await request.json();

        if (!body.name || !body.category || !body.totalQuantity) {
            return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
        }

        // SaaS PROTECTION: Attach org
        const orgId = authUser.role !== 'super_admin' ? authUser.organizationId : body.organizationId;

        const product = await ProductCatalog.create({ ...body, organizationId: orgId, createdBy: authUser.id });
        return NextResponse.json({ success: true, data: product, message: "Product added to vault" }, { status: 201 });
    } catch (error) {
        console.error("POST ASSET PRODUCT ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: error.status || 400 });
    }
}
