import {
  LegalDocumentPage,
  legalMetadata,
} from "../_components/legal-document";

export const generateMetadata = () => legalMetadata("privacy");

export default function PrivacyPage() {
  return <LegalDocumentPage document="privacy" />;
}
