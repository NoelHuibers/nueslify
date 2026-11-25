import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppIcon, Wordmark } from "#/components/brand.tsx";
import { SiteFooter } from "#/components/site-footer.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card.tsx";
import { OPERATOR } from "#/lib/legal.ts";

/** Shell for the pages anyone can read without an account: about, Impressum, privacy. */
export function PublicPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center px-4 py-4 md:px-8">
        <Link className="flex items-center gap-2" to="/">
          <AppIcon />
          <Wordmark className="text-2xl" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-16 md:px-8">
        <h1 className="font-semibold text-3xl tracking-tight">{title}</h1>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function PublicSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

export function OperatorAddress() {
  return (
    <address className="not-italic">
      {OPERATOR.name}
      {OPERATOR.address.map((line) => (
        <span key={line}>
          <br />
          {line}
        </span>
      ))}
    </address>
  );
}

export function OperatorContact() {
  return (
    <p>
      Phone:{" "}
      <a
        className="underline underline-offset-4"
        href={`tel:${OPERATOR.phone.replaceAll(" ", "")}`}
      >
        {OPERATOR.phone}
      </a>
      <br />
      E-mail:{" "}
      <a className="underline underline-offset-4" href={`mailto:${OPERATOR.email}`}>
        {OPERATOR.email}
      </a>
    </p>
  );
}
