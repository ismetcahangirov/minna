import { getFormatter, getTranslations } from "next-intl/server";

import { DeleteUserButton } from "@/components/admin/users/delete-user-button";
import type { AdminUserRow } from "@/lib/admin/users/queries";
import { setUserBlockedAction } from "@/lib/admin/users/actions";
import { cn } from "@/lib/utils";

function initials(name: string, email: string): string {
  const source = name?.trim() || email?.trim() || "";
  if (!source) return "U";
  const parts = source.split(/\s+/);
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source[0];
  return letters.toUpperCase();
}

/**
 * Admin user listing (ADMIN-06): every account with role, join date, an inline
 * block/unblock toggle and delete. The signed-in admin's own row shows a "you"
 * marker and no destructive actions — matching the server-side self-guards.
 */
export async function UsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const [t, format] = await Promise.all([
    getTranslations("admin.users"),
    getFormatter(),
  ]);

  if (users.length === 0) {
    return (
      <div className="border-border text-muted-foreground border border-dashed p-10 text-center text-sm">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="border-border overflow-x-auto border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
            <th className="px-4 py-3 font-medium">{t("user")}</th>
            <th className="px-4 py-3 font-medium">{t("role")}</th>
            <th className="px-4 py-3 font-medium">{t("joined")}</th>
            <th className="px-4 py-3 font-medium">{t("status")}</th>
            <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isSelf = user.id === currentUserId;
            return (
              <tr
                key={user.id}
                className="border-border/60 hover:bg-muted/30 border-b last:border-0"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-secondary text-secondary-foreground border-border flex size-9 shrink-0 items-center justify-center border text-xs font-medium">
                      {initials(user.name, user.email)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-foreground flex items-center gap-2 truncate font-medium">
                        {user.name}
                        {isSelf && (
                          <span className="text-muted-foreground text-xs font-normal">
                            ({t("you")})
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "border px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
                      user.role === "admin"
                        ? "border-primary/40 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {user.role === "admin" ? t("roleAdmin") : t("roleUser")}
                  </span>
                </td>
                <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">
                  {format.dateTime(new Date(user.createdAt), {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  {isSelf ? (
                    <span className="bg-muted text-muted-foreground px-2 py-1 text-xs font-semibold tracking-wide uppercase">
                      {t("active")}
                    </span>
                  ) : (
                    <form
                      action={setUserBlockedAction.bind(
                        null,
                        user.id,
                        !user.blocked,
                      )}
                    >
                      <button
                        type="submit"
                        aria-label={user.blocked ? t("unblock") : t("block")}
                        className={cn(
                          "px-2 py-1 text-xs font-semibold tracking-wide uppercase transition-colors",
                          user.blocked
                            ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
                            : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {user.blocked ? t("blocked") : t("active")}
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    {isSelf ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <DeleteUserButton id={user.id} name={user.name} />
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
