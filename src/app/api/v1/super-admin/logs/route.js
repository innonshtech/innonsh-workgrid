import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import ActivityLog from "@/lib/db/models/ActivityLog";
import { getAuthUser, authorize } from "@/lib/auth-util";

export async function GET(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["super_admin"]);

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const action = searchParams.get("action");
    const entity = searchParams.get("entity");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const sortBy = searchParams.get("sortBy") || "newest";

    const skip = (page - 1) * limit;

    let filter = {};

    if (action && action !== "all") {
      filter.action = action;
    }

    if (entity) {
      filter.entity = entity;
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { "performedBy.name": { $regex: search, $options: "i" } },
        { "performedBy.email": { $regex: search, $options: "i" } },
        { entityId: { $regex: search, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDay = new Date(dateTo);
        endDay.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDay;
      }
    }

    let sortOptions = {};
    if (sortBy === "newest") {
      sortOptions.createdAt = -1;
    } else if (sortBy === "oldest") {
      sortOptions.createdAt = 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const logs = await ActivityLog.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments(filter);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching super admin logs:", error);
    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
