"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export const BackButton = () => {
  const router = useRouter();
  const t = useTranslations("common");

  return (
    <Button
      variant="outline"
      onClick={() => router.back()}
      className="not-prose"
    >
      {t("back")}
    </Button>
  );
};
