"use client";

import { useRouter } from "@/i18n/navigation";
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

  const onPageChange = (page: number) => {
    const path = page === 1 ? basePath : `${basePath}/${page}`;
    // Read only when navigating so pagination can be rendered in ISR HTML.
    const query = new URLSearchParams(window.location.search).toString();
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
