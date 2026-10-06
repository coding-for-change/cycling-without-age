import en from "@/messages/app/en.json";
import da from "@/messages/app/da.json";
import de from "@/messages/app/de.json";
import { OfflineScreen } from "./_components/offline-screen";

export default function OfflinePage() {
  return (
    <OfflineScreen
      strings={{ en: en.offline, da: da.offline, de: de.offline }}
    />
  );
}
