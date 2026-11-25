import { createFileRoute } from "@tanstack/react-router";
import {
  OperatorAddress,
  OperatorContact,
  PublicPage,
  PublicSection,
} from "#/components/public-page.tsx";
import { OPERATOR } from "#/lib/legal.ts";

export const Route = createFileRoute("/impressum")({
  head: () => ({ meta: [{ title: "Impressum · Nueslify" }] }),
  component: ImpressumPage,
});

function ImpressumPage() {
  return (
    <PublicPage title="Impressum">
      <PublicSection title="Information pursuant to § 5 DDG">
        <OperatorAddress />
      </PublicSection>

      <PublicSection title="Contact">
        <OperatorContact />
      </PublicSection>

      <PublicSection title="Responsible for content pursuant to § 18 (2) MStV">
        <p>{OPERATOR.name}, address as above.</p>
      </PublicSection>
    </PublicPage>
  );
}
