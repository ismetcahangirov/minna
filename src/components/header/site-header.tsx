import { CategoriesMenu } from "@/components/header/categories-menu";
import { HeaderShell } from "@/components/header/header-shell";
import { LanguageSwitcher } from "@/components/header/language-switcher";
import { Logo } from "@/components/header/logo";
import { MobileMenu } from "@/components/header/mobile-menu";
import { NavLinks } from "@/components/header/nav-links";
import { UserMenu, type SessionUser } from "@/components/header/user-menu";
import { getCategories } from "@/lib/anime/categories";
import { getCurrentUser } from "@/lib/auth/session";

/**
 * The shared site header (EPIC-03), rendered on every page from the root
 * layout. Server component: fetches the category taxonomy once (Redis-cached)
 * and hydrates the interactive pieces as client islands.
 *
 * `user` is threaded through as a prop so the auth session (EPIC-02) is wired
 * here in a single place without touching the client components — the session
 * user (or `null` when signed out) is read server-side and passed down.
 */
export async function SiteHeader() {
  const categories = await getCategories();
  const currentUser = await getCurrentUser();
  const user: SessionUser | null = currentUser
    ? {
        name: currentUser.name,
        email: currentUser.email,
        image: currentUser.image,
      }
    : null;

  return (
    <HeaderShell>
      <Logo />

      {/* Desktop: categories + primary links */}
      <div className="hidden items-center lg:flex">
        <CategoriesMenu categories={categories} />
        <NavLinks />
      </div>

      {/* Right slot */}
      <div className="ml-auto flex items-center gap-1">
        <div className="hidden items-center gap-1 lg:flex">
          <LanguageSwitcher />
          <UserMenu user={user} />
        </div>
        <MobileMenu categories={categories} user={user} />
      </div>
    </HeaderShell>
  );
}
