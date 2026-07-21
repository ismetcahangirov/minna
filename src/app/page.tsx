import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations();

  return (
    <main className="bg-background flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-primary text-5xl font-extrabold tracking-tight sm:text-7xl">
        {t("common.appName").toUpperCase()}
      </h1>
      <p className="text-muted-foreground max-w-md text-base">
        {t("home.hero.tagline")}
      </p>
      <Button size="lg">{t("auth.login")}</Button>
    </main>
  );
}
