import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-primary sm:text-7xl">
        {t("common.appName").toUpperCase()}
      </h1>
      <p className="max-w-md text-base text-muted-foreground">
        {t("home.hero.tagline")}
      </p>
      <Button size="lg">{t("auth.login")}</Button>
    </main>
  );
}
