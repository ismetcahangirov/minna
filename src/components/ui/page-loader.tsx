import { SpinnerMorph } from "@/components/ui/spinner-morph";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  /** Extra classes for the outer wrapper. */
  className?: string;
  /** Spinner size in px. */
  size?: number;
};

/**
 * Full-viewport, centered loading state. Used as the App Router `loading.tsx`
 * fallback so the morphing red spinner appears during route transitions while
 * the destination page's data streams in. Sits on the project's black
 * background with sharp edges — no gradient, blur, or radius.
 */
export function PageLoader({ className, size = 120 }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "bg-background flex min-h-[70vh] w-full flex-1 items-center justify-center",
        className,
      )}
    >
      <SpinnerMorph size={size} />
    </div>
  );
}

export default PageLoader;
