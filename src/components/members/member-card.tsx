import { UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";

import { memberHref, type MemberSummary } from "@/lib/members/types";

interface MemberCardProps {
  member: MemberSummary;
}

/**
 * One member in the directory (MEM-02): their avatar, their name, the handle
 * their profile lives at, and when they joined.
 *
 * Nothing is counted per card — a directory page is one query — so the numbers
 * a visitor cares about are read once, on the profile they actually open.
 */
export async function MemberCard({ member }: MemberCardProps) {
  const t = await getTranslations("members");
  const format = await getFormatter();

  return (
    <Link
      href={memberHref(member)}
      className="group border-border hover:border-primary/60 focus-visible:border-primary flex items-center gap-3 border p-3 transition-colors outline-none"
    >
      {member.image ? (
        <Image
          src={member.image}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="border-border size-12 shrink-0 border object-cover"
        />
      ) : (
        <span className="border-border bg-surface text-muted-foreground flex size-12 shrink-0 items-center justify-center border">
          <UserRound className="size-5" aria-hidden />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-foreground group-hover:text-primary truncate text-sm font-semibold transition-colors">
          {member.name}
        </p>
        {member.handle && (
          <p className="text-muted-foreground truncate text-xs">
            @{member.handle}
          </p>
        )}
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t("joined", {
            date: format.dateTime(new Date(member.createdAt), {
              year: "numeric",
              month: "short",
            }),
          })}
        </p>
      </div>
    </Link>
  );
}
