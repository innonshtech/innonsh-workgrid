import dbConnect from "@/lib/db/connect";
import Asset from "@/lib/db/models/Asset";
import ProductCatalog from "@/lib/db/models/ProductCatalog";
import { NextResponse } from "next/server";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const assignedTo = searchParams.get("assignedTo");
        const status = searchParams.get("status");

        let query = {};
        
        // SaaS PROTECTION: Scope to org
        if (authUser.role !== "super_admin" && authUser.organizationId) {
            query.organizationId = authUser.organizationId;
        }

        if (assignedTo) query.assignedTo = assignedTo;
        if (status) query.status = status;

        const assets = await Asset.find(query)
            .populate('assignedTo', 'personalDetails.firstName personalDetails.lastName employeeId')
            .populate('productCatalogId', 'name category totalQuantity')
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: assets });
    } catch (error) {
        console.error("GET ASSETS ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: error.status || 500 });
    }
}

export async function POST(request) {
    try {
        const authUser = await getAuthUser();
        authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
        
        await dbConnect();
        const body = await request.json();

        // Basic validation
        if (!body.name || !body.assetId || !body.category) {
            return NextResponse.json({ success: false, error: "Missing required fields: name, assetId, and category" }, { status: 400 });
        }

        // SaaS PROTECTION: Attach org
        const orgId = authUser.role !== 'super_admin' ? authUser.organizationId : body.organizationId;

        // JIT Stock Check
        if (body.productCatalogId) {
            const catalog = await ProductCatalog.findById(body.productCatalogId);
            if (!catalog) {
                return NextResponse.json({ success: false, error: "Invalid vault product selected" }, { status: 400 });
            }
            const deployedCount = await Asset.countDocuments({ 
                productCatalogId: catalog._id, 
                organizationId: orgId, 
                status: { $ne: "Retired" } 
            });
            if (deployedCount >= catalog.totalQuantity) {
                return NextResponse.json({ success: false, error: "Insufficient stock in the vault for this product" }, { status: 400 });
            }
        }

        const asset = await Asset.create({ ...body, organizationId: orgId, createdBy: authUser.id });
        return NextResponse.json({ success: true, data: asset, message: "Asset registered successfully" }, { status: 201 });
    } catch (error) {
        console.error("POST ASSET ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: error.status || 400 });
    }
}
