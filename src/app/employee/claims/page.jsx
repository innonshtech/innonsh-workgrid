"use client";

import { useSession } from "@/context/SessionContext";
import EmployeeClaimsManager from "@/components/finance/employee-claims-manager";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EmployeeClaimsPage() {
    const { user, loading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !user.id)) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading || !user || !user.id) {
        return <div className="p-8 text-center text-slate-500 font-medium">Loading your claims...</div>;
    }

    return (
        <div className="w-full">
            <EmployeeClaimsManager employeeId={user.id} />
        </div>
    );
}
