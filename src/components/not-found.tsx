import { Link } from "@tanstack/react-router";
import { RadioIcon } from "lucide-react";
import { buttonVariants } from "#/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty.tsx";

export function NotFound() {
  return (
    <main className="grid min-h-[60dvh] place-items-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RadioIcon />
          </EmptyMedia>
          <EmptyTitle>Nothing on this frequency</EmptyTitle>
          <EmptyDescription>The page you were looking for doesn't exist.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link className={buttonVariants()} to="/">
            Back to the studio
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
