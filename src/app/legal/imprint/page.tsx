import {
  LegalDocumentPage,
  legalMetadata,
} from "../_components/legal-document";

export const generateMetadata = () => legalMetadata("imprint");

export default function ImprintPage() {
  return <LegalDocumentPage document="imprint" />;
}
