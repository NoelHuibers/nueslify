import { type ErrorComponentProps, Link, useRouter } from "@tanstack/react-router";
import { RefreshCwIcon } from "lucide-react";
import { Button, buttonVariants } from "#/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card.tsx";

export function DefaultCatchBoundary({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <Card className="glass w-full max-w-md">
        <CardHeader>
          <CardTitle>Static on the line</CardTitle>
          <CardDescription>Something went wrong while loading this page.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="break-words rounded-md bg-muted p-3 font-mono text-muted-foreground text-xs">
            {error instanceof Error ? error.message : String(error)}
          </p>
        </CardContent>
        <CardFooter className="gap-2">
          <Button
            onClick={() => {
              reset();
              void router.invalidate();
            }}
          >
            <RefreshCwIcon /> Try again
          </Button>
          <Link className={buttonVariants({ variant: "ghost" })} to="/">
            Home
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
