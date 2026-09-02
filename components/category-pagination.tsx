"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
    const searchParams = useSearchParams();

    const onPageChange = (page: number) => {
        const path = page === 1 ? basePath : `${basePath}/${page}`;
        const query = searchParams.toString();
        router.push(query ? `${path}?${query}` : path);
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
