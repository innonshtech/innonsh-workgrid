import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/db/connect";
import Employee from "@/lib/db/models/payroll/Employee";
import Department from "@/lib/db/models/crm/Department/department";
import Organization from "@/lib/db/models/crm/organization/Organization";
import { getAuthUser, authorize } from "@/lib/auth-util";
import { logActivity } from "@/lib/logger";

const MAX_ROWS = 2000;

function normalizeKey(key) {
  return String(key || "").trim().toLowerCase();
}

function asString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(String(value).toString().replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function isProbablyObjectId(value) {
  const s = asString(value);
  return /^[a-f0-9]{24}$/i.test(s);
}

function excelDateToJSDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  // Excel serial date number
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
  }

  const s = asString(value);
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  return null;
}

function getCell(row, candidates) {
  for (const c of candidates) {
    const v = row[normalizeKey(c)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function parseRowsFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];

  const ws = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });

  return rawRows
    .map((r) => {
      const out = {};
      for (const [k, v] of Object.entries(r || {})) {
        out[normalizeKey(k)] = v;
      }
      return out;
    })
    .filter((r) => Object.values(r).some((v) => asString(v) !== ""));
}

async function getNextEmployeeIdSeed() {
  const lastEmployee = await Employee.findOne().sort({ createdAt: -1 }).select("employeeId");
  const last = lastEmployee?.employeeId ? String(lastEmployee.employeeId) : "";
  const lastNum = parseInt(last.replace(/\D/g, ""), 10);
  return Number.isFinite(lastNum) ? lastNum + 1 : 1;
}

function buildEmployeeId(n) {
  return `EMP${String(n).padStart(3, "0")}`;
}

export async function POST(request) {
  try {
    const authUser = await getAuthUser();
    authorize(authUser, ["admin", "hr", "company_admin", "super_admin"]);
    await dbConnect();

    const form = await request.formData();
    const file = form.get("file");
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }
    if (typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ success: false, error: "Invalid file upload" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parseRowsFromWorkbook(buf);

    if (!rows.length) {
      return NextResponse.json({ success: false, error: "No rows found in the sheet" }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { success: false, error: `Too many rows. Max allowed is ${MAX_ROWS}` },
        { status: 400 }
      );
    }

    const orgIdFromAuth = authUser.organizationId ? String(authUser.organizationId) : null;
    const needsOrgFromSheet = authUser.role === "super_admin" && !orgIdFromAuth;

    // Load org name (optional but nice for employee.jobDetails.organization).
    const orgNameById = new Map();
    async function getOrgName(orgId) {
      const key = String(orgId);
      if (orgNameById.has(key)) return orgNameById.get(key);
      const org = await Organization.findById(orgId).select("name");
      const name = org?.name || "";
      orgNameById.set(key, name);
      return name;
    }

    // Preload departments for the org (when org is fixed).
    const deptMap = new Map(); // lowerName -> { _id, departmentName }
    async function ensureDeptMap(orgId) {
      const key = String(orgId);
      if (deptMap.has(key)) return;
      const depts = await Department.find({ organizationId: orgId }).select("_id departmentName");
      const m = new Map();
      for (const d of depts) {
        m.set(String(d.departmentName || "").trim().toLowerCase(), { _id: d._id, departmentName: d.departmentName });
      }
      deptMap.set(key, m);
    }

    const errors = [];
    const toInsert = [];
    const rowMeta = [];

    // First pass: validate + normalize + build docs.
    let employeeIdSeed = await getNextEmployeeIdSeed();

    const emailsInFile = new Map(); // emailLower -> rowNumber
    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // header row is 1
      const row = rows[i];

      const firstName = asString(getCell(row, ["firstName", "first name"]));
      const lastName = asString(getCell(row, ["lastName", "last name"]));
      const email = asString(getCell(row, ["email", "emailAddress", "email address"])).toLowerCase();
      const phone = asString(getCell(row, ["phone", "mobile", "mobileNumber", "mobile number"])).replace(/\s/g, "");
      const dateOfJoiningRaw = getCell(row, ["dateOfJoining", "date of joining", "doj"]);
      const doj = excelDateToJSDate(dateOfJoiningRaw);

      const designation = asString(getCell(row, ["designation", "jobTitle", "job title"]));
      const workingHr = asNumber(getCell(row, ["workingHr", "working hours", "workingHours", "working hours (per day)"])) ?? 8;

      const basicSalary = asNumber(getCell(row, ["basicSalary", "basic salary"])) ?? null;
      const salaryType = asString(getCell(row, ["salaryType", "salary type"])) || "monthly";

      const bankAccountNumber = asString(getCell(row, ["bankAccountNumber", "accountNumber", "account number"]));
      const bankName = asString(getCell(row, ["bankName", "bank name"]));
      const ifscCode = asString(getCell(row, ["ifscCode", "ifsc", "ifsc code"])).toUpperCase();

      const departmentIdRaw = getCell(row, ["departmentId", "department id"]);
      const departmentNameRaw = asString(getCell(row, ["departmentName", "department name", "department"]));

      const organizationIdRaw = needsOrgFromSheet ? getCell(row, ["organizationId", "organization id"]) : null;
      const organizationId = needsOrgFromSheet ? asString(organizationIdRaw) : orgIdFromAuth;

      if (!organizationId) {
        errors.push({ row: rowNumber, email, error: "Organization is required (missing auth org and organizationId column)" });
        continue;
      }

      if (!firstName || !lastName || !email || !phone || !doj) {
        errors.push({
          row: rowNumber,
          email,
          error: "Missing required fields: firstName, lastName, email, phone, dateOfJoining",
        });
        continue;
      }

      if (!designation) {
        errors.push({ row: rowNumber, email, error: "Designation is required" });
        continue;
      }

      if (!basicSalary || basicSalary <= 0) {
        errors.push({ row: rowNumber, email, error: "basicSalary must be > 0" });
        continue;
      }

      if (!bankAccountNumber || !bankName || !ifscCode) {
        errors.push({
          row: rowNumber,
          email,
          error: "Missing bank details: bankAccountNumber, bankName, ifscCode",
        });
        continue;
      }

      const emailKey = email.toLowerCase();
      if (emailsInFile.has(emailKey)) {
        errors.push({
          row: rowNumber,
          email,
          error: `Duplicate email in file (already used on row ${emailsInFile.get(emailKey)})`,
        });
        continue;
      }
      emailsInFile.set(emailKey, rowNumber);

      // Department lookup
      let departmentId = null;
      let departmentName = "";
      if (departmentIdRaw && isProbablyObjectId(departmentIdRaw)) {
        departmentId = asString(departmentIdRaw);
        // Name optional when ID is provided.
        departmentName = departmentNameRaw || "";
      } else if (departmentNameRaw) {
        await ensureDeptMap(organizationId);
        const m = deptMap.get(String(organizationId));
        const d = m.get(departmentNameRaw.trim().toLowerCase());
        if (!d) {
          errors.push({
            row: rowNumber,
            email,
            error: `Department not found: ${departmentNameRaw}`,
          });
          continue;
        }
        departmentId = String(d._id);
        departmentName = d.departmentName;
      } else {
        errors.push({ row: rowNumber, email, error: "Department is required (departmentName or departmentId)" });
        continue;
      }

      // Organization name (best-effort)
      const organizationName = await getOrgName(organizationId);

      const employeeId = asString(getCell(row, ["employeeId", "employee id"])) || buildEmployeeId(employeeIdSeed++);

      const doc = {
        employeeId,
        role: asString(getCell(row, ["role"])) || "employee",
        status: asString(getCell(row, ["status"])) || "Active",
        personalDetails: {
          firstName,
          lastName,
          email,
          phone,
          dateOfJoining: doj,
        },
        jobDetails: {
          organizationId,
          organization: organizationName,
          departmentId,
          department: departmentName || departmentNameRaw || "Unknown",
          designation,
        },
        workingHr,
        payslipStructure: {
          salaryType,
          basicSalary,
          earnings: [],
          deductions: [],
          additionalFields: [],
        },
        salaryDetails: {
          bankAccount: {
            accountNumber: bankAccountNumber,
            bankName,
            ifscCode,
          },
        },
        createdBy: authUser.id,
      };

      toInsert.push(doc);
      rowMeta.push({ row: rowNumber, email, employeeId });
    }

    if (!toInsert.length) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid rows to import",
          summary: { created: 0, skipped: 0, failed: errors.length },
          errors,
        },
        { status: 400 }
      );
    }

    // Pre-check existing emails to skip duplicates already in DB.
    const allEmails = toInsert.map((d) => d.personalDetails.email.toLowerCase());
    const existing = await Employee.find({ "personalDetails.email": { $in: allEmails } })
      .select("personalDetails.email")
      .lean();
    const existingEmails = new Set(existing.map((e) => String(e.personalDetails?.email || "").toLowerCase()));

    const filteredDocs = [];
    const filteredMeta = [];
    let skipped = 0;
    for (let i = 0; i < toInsert.length; i++) {
      const email = String(toInsert[i].personalDetails.email || "").toLowerCase();
      if (existingEmails.has(email)) {
        skipped++;
        continue;
      }
      filteredDocs.push(toInsert[i]);
      filteredMeta.push(rowMeta[i]);
    }

    let created = 0;
    let failed = errors.length;

    if (filteredDocs.length) {
      try {
        const insertedDocs = await Employee.insertMany(filteredDocs, { ordered: false });
        created = insertedDocs.length;
      } catch (err) {
        // With ordered:false, Mongo can insert some docs and still throw.
        const inserted = Array.isArray(err?.insertedDocs) ? err.insertedDocs.length : 0;
        created = inserted;

        if (Array.isArray(err?.writeErrors)) {
          for (const we of err.writeErrors) {
            const idx = we.index;
            const meta = filteredMeta[idx] || {};
            errors.push({
              row: meta.row || null,
              email: meta.email || null,
              error: we.errmsg || we.message || "Insert failed",
            });
          }
        } else if (err?.message) {
          errors.push({ row: null, email: null, error: err.message });
        }
      }
    }

    failed = errors.length;

    await logActivity({
      action: "bulk_imported",
      entity: "Employee",
      description: `Bulk import employees: created=${created}, skipped=${skipped}, failed=${failed}`,
      performedBy: { userId: authUser.id, name: authUser.name, role: authUser.role },
      details: { created, skipped, failed },
      req: request,
    });

    return NextResponse.json({
      success: true,
      message: "Bulk import processed",
      summary: { created, skipped, failed },
      errors,
    });
  } catch (error) {
    const msg = error?.message || "Server error";
    const status = msg.startsWith("Unauthorized") ? 401 : msg.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
