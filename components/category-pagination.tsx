"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Pagination } from "@/components/ui/pagination";

interface CategoryPaginationProps {
    currentPage: number;
    totalPages: number;
    basePath: string;
}

export function CategoryPagination({
    currentPage,
    totalPages,
    basePath,
}: CategoryPaginationProps) {
    const router = useRouter();
    // const pathname = usePathname(); // No longer needed
    // const searchParams = useSearchParams(); // No longer needed

    const onPageChange = (page: number) => {
        // const params = new URLSearchParams(searchParams); // No longer needed
        // params.set("page", page.toString()); // No longer needed
        // router.push(`${pathname}?${params.toString()}`); // No longer needed
        if (page === 1) {
            router.push(basePath);
        } else {
            router.push(`${basePath}/${page}`);
        }
    };

    return (
        <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={30}
            totalItems={totalPages * 30} // Approximate since we only care about pages
            onPageChange={onPageChange}
            showPageNumbers={true}
        />
    );
}
