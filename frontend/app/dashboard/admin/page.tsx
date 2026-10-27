"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardAdminRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/admin');
    }, [router]);

    return (
        <div className="p-8 text-zinc-400 text-sm">
            Redirecting to Admin Portal...
        </div>
    );
}
