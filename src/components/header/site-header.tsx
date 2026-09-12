import { CategoriesMenu } from "@/components/header/categories-menu";
import { CommunityMenu } from "@/components/header/community-menu";
import { HeaderShell } from "@/components/header/header-shell";
import { LanguageSwitcher } from "@/components/header/language-switcher";
import { Logo } from "@/components/header/logo";
import { MobileMenu } from "@/components/header/mobile-menu";
import { NavLinks } from "@/components/header/nav-links";
import { UserMenu } from "@/components/header/user-menu";
import { getCategories } from "@/lib/anime/categories";

/**
 * The shared site header (EPIC-03), rendered on every page from the root
 * layout. Server component: fetches the category taxonomy once (Redis-cached)
 * and hydrates the interactive pieces as client islands.
 *
 * Deliberately session-free. This component is mounted from the root layout on
 * *every* route, so anything it reads, every page pays for. It used to read the
 * session here and pass the user down — and because a cookie read during render
 * opts a route out of static and ISR rendering, that single call made Next emit
 * `Cache-Control: private, no-cache, no-store` across the whole site. Nothing
 * could be cached at the edge, so every request from every crawler rendered
 * React on the server: the account's Fluid Active CPU allowance went 300% over
 * and Vercel paused it.
 *
 * `UserMenu` and `MobileMenu` now read the session in the browser instead (they
 * were already client components), which leaves the HTML identical for every
 * visitor and therefore cacheable. The session must not come back into this
 * render path — see `@/store/api/session-api`.
 */
export async function SiteHeader() {
  const categories = await getCategories();

  return (
    <HeaderShell>
      <Logo />

      {/* Desktop: categories + primary links */}
      <div className="hidden items-center lg:flex">
        <CategoriesMenu categories={categories} />
        <NavLinks />
        <CommunityMenu />
      </div>

      {/* Right slot */}
      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center gap-1 lg:flex">
          <LanguageSwitcher />
          <UserMenu />
        </div>
        <MobileMenu categories={categories} />
      </div>
    </HeaderShell>
  );
}
