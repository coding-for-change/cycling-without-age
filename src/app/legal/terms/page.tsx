import {
  LegalDocumentPage,
  legalMetadata,
} from "../_components/legal-document";

export const generateMetadata = () => legalMetadata("terms");

export default function TermsPage() {
  return <LegalDocumentPage document="terms" />;
}
