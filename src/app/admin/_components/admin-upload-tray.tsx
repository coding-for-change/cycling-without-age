import { UploadTrayProvider } from "@/features/training/components/upload-tray";
import { uploadTrayStrings } from "@/features/training/components/strings";
import { getDictionary, getLocale } from "@/lib/i18n";

export async function AdminUploadTray() {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  return (
    <UploadTrayProvider
      strings={uploadTrayStrings(dict)}
      locale={locale}
    />
  );
}
