const isPrecache = (key: string) => key.includes("-precache-");

export async function clearOfflineCaches() {
  if (typeof caches === "undefined") return;
  const keys = await caches.keys();
  await Promise.all(
    keys.filter((key) => !isPrecache(key)).map((key) => caches.delete(key)),
  );
}
