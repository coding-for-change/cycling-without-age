export const pickupLabel = (
  rider: { residence: "careHome" | "home" | null; address: string | null },
  careHome: string,
) =>
  rider.residence === "careHome"
    ? careHome
    : rider.residence === "home" && rider.address
      ? rider.address.split(",")[0].trim()
      : null;
