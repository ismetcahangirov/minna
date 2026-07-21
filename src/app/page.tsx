import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight text-primary sm:text-7xl">
        MINNA
      </h1>
      <p className="max-w-md text-base text-muted-foreground">
        Premium anime streaming platform. Coming soon.
      </p>
      <Button size="lg">Get Started</Button>
    </main>
  );
}
