"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type DefaultValues } from "react-hook-form";
import {
  Check,
  CircleAlert,
  CircleCheckBig,
  Loader2,
  MapPin,
  MapPinOff,
  Pencil,
  Printer,
  X,
} from "lucide-react";
import { QrCode } from "@/components/qr-code";
import { AddressSearch } from "@/components/address-search";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  chapterInput,
  slugify,
  type ChapterInput,
} from "@/features/chapters/schemas";
import { formatDistance, type Locale } from "@/lib/format";
import { distanceMeters, type Coords } from "@/lib/geo";
import { regionName } from "@/lib/countries";
import type { ResolvedPlace } from "@/lib/mapbox";
import { haptics } from "@/lib/native/haptics";
import { cn, fill } from "@/lib/utils";
import { AdminDrawer, submitOnCmdEnter } from "../../_components/admin-drawer";
import { CopyButton } from "../../_components/copy-button";
import { notify, type NotifyLabels } from "../../_components/action-feedback";
import { DownloadQrButton } from "../../settings/_components/download-qr-button";
import { createCountryAction } from "../../countries/actions";
import {
  checkSlugAction,
  createChapterAction,
  resolveChapterPlace,
  reverseChapterPlace,
  suggestChapterPlaces,
} from "../actions";
import { ChapterLogo } from "./chapter-logo";
import type { ChapterPin } from "./chapters-map-view";
import type { ChapterRow } from "./chapters-table";

const ChapterMap = dynamic(() => import("./chapter-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

const DEFAULT_RADIUS_KM = 10;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 60;
const DESCRIPTION_MAX = 600;
const SLUG_DEBOUNCE_MS = 300;

const EMPTY: DefaultValues<ChapterInput> = {
  name: "",
  slug: "",
  countryId: "",
  city: "",
  address: "",
  careHomeName: "",
  description: "",
  logo: undefined,
  latitude: undefined,
  longitude: undefined,
  serviceRadiusKm: DEFAULT_RADIUS_KM,
};

export type ChapterCreateStrings = {
  new: string;
  cancel: string;
  mapLabel: string;
  mapUnavailable: string;
  fields: {
    name: string;
    country: string;
    city: string;
    careHomeName: string;
    description: string;
    logo: string;
  };
  create: {
    intro: string;
    address: {
      label: string;
      placeholder: string;
      hint: string;
      searching: string;
      noResults: string;
    };
    changeAddress: string;
    dragHint: string;
    radius: string;
    radiusValue: string;
    overlap: string;
    webAddress: string;
    slugEdit: string;
    slugDone: string;
    slugChecking: string;
    slugFree: string;
    slugTaken: string;
    countryDetected: string;
    countryMissing: string;
    addCountry: string;
    countryAdded: string;
    needCountryAdmin: string;
    logoPreview: string;
    optional: string;
    counter: string;
    submit: string;
    pending: string;
    shortcut: string;
    done: { title: string; body: string; open: string; another: string };
  };
  joinLink: {
    copy: string;
    copied: string;
    poster: string;
    downloadPng: string;
  };
  errors: NotifyLabels["errors"];
};

type Country = { id: string; name: string; code: string };
type SlugState = "idle" | "checking" | "free" | "taken";
type Detected = { code: string; known: boolean };
type Created = { id: string; slug: string; name: string };

const isHttpUrl = (value: string | undefined | null) =>
  Boolean(value && /^https?:\/\//i.test(value));

/**
 * Name it, place it. Everything the schema needs beyond those two is either
 * derived (the slug from the name, the country from the address) or optional,
 * so the drawer asks for two things and fills in the rest from Mapbox.
 */
export function ChapterCreateDrawer({
  open,
  onOpenChange,
  onCreated,
  countries,
  canCreateCountry,
  pins,
  language,
  notation,
  joinBase,
  scopeQuery,
  strings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (row: ChapterRow) => void;
  countries: Country[];
  canCreateCountry: boolean;
  pins: ChapterPin[];
  language: string;
  notation: Locale;
  joinBase: string;
  scopeQuery: string;
  strings: ChapterCreateStrings;
}) {
  const router = useRouter();
  const formId = useId();
  const [pending, startTransition] = useTransition();
  const [addingCountry, startCountryTransition] = useTransition();

  const [extraCountries, setExtraCountries] = useState<Country[]>([]);
  const [slugOverride, setSlugOverride] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [checked, setChecked] = useState<{
    slug: string;
    available: boolean;
  } | null>(null);
  const [detected, setDetected] = useState<Detected | null>(null);
  const [resolving, setResolving] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  const form = useForm<ChapterInput>({
    resolver: zodResolver(chapterInput),
    defaultValues: EMPTY,
  });

  const sessionToken = useMemo(() => crypto.randomUUID(), []);
  const allCountries = useMemo(
    () => [...countries, ...extraCountries],
    [countries, extraCountries],
  );

  const values = useWatch({ control: form.control });
  const slug = values.slug ?? "";
  const radiusKm = values.serviceRadiusKm ?? DEFAULT_RADIUS_KM;
  const { latitude, longitude } = values;
  const center = useMemo<Coords | null>(
    () =>
      typeof latitude === "number" && typeof longitude === "number"
        ? { lat: latitude, lng: longitude }
        : null,
    [latitude, longitude],
  );

  // Mapbox owns the city until someone types over it.
  const autoCity = useRef<string | null>(null);
  const reverseTicket = useRef(0);

  useEffect(() => {
    if (slug.length < 2) return;
    let live = true;
    const timer = setTimeout(async () => {
      const { available } = await checkSlugAction(slug);
      if (live) setChecked({ slug, available });
    }, SLUG_DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [slug]);

  const slugState: SlugState =
    slug.length < 2
      ? "idle"
      : checked?.slug !== slug
        ? "checking"
        : checked.available
          ? "free"
          : "taken";

  const applyPlace = useCallback(
    (place: ResolvedPlace, coords: Coords) => {
      form.setValue("address", place.address, { shouldDirty: true });
      form.setValue("latitude", coords.lat, { shouldDirty: true });
      form.setValue("longitude", coords.lng, { shouldDirty: true });

      const city = form.getValues("city");
      if (place.city && (!city || city === autoCity.current)) {
        autoCity.current = place.city;
        form.setValue("city", place.city, { shouldDirty: true });
      }
      return place;
    },
    [form],
  );

  const pickPlace = (mapboxId: string) => {
    setResolving(true);
    void resolveChapterPlace({ mapboxId, sessionToken }).then((place) => {
      setResolving(false);
      if (!place) {
        notify(
          { ok: false, error: "generic" },
          { done: "", errors: strings.errors },
        );
        return;
      }
      applyPlace(place, place.coords);

      if (place.poiName && !form.getValues("careHomeName"))
        form.setValue("careHomeName", place.poiName, { shouldDirty: true });

      const code = place.countryCode;
      if (!code) {
        setDetected(null);
        return;
      }
      const match = allCountries.find(
        (country) => country.code.toUpperCase() === code,
      );
      if (match) form.setValue("countryId", match.id, { shouldDirty: true });
      setDetected({ code, known: Boolean(match) });
    });
  };

  // The drag is the truth about where the pin is; the reverse lookup only
  // catches the address up to it.
  const movePin = useCallback(
    (coords: Coords) => {
      form.setValue("latitude", coords.lat, { shouldDirty: true });
      form.setValue("longitude", coords.lng, { shouldDirty: true });
      const ticket = ++reverseTicket.current;
      void reverseChapterPlace({ ...coords, language }).then((place) => {
        if (!place || ticket !== reverseTicket.current) return;
        applyPlace(place, coords);
      });
    },
    [applyPlace, form, language],
  );

  const clearPlace = () => {
    form.setValue("latitude", undefined as unknown as number);
    form.setValue("longitude", undefined as unknown as number);
    form.setValue("address", "");
    setDetected(null);
  };

  const addCountry = (code: string) => {
    const name = regionName(code, language);
    startCountryTransition(async () => {
      const result = await createCountryAction({ name, code });
      if (!result.ok || !result.id) {
        notify(result, { done: "", errors: strings.errors });
        return;
      }
      const country = { id: result.id, name, code };
      setExtraCountries((previous) => [...previous, country]);
      form.setValue("countryId", country.id, { shouldDirty: true });
      setDetected({ code, known: true });
      notify(
        { ok: true },
        {
          done: fill(strings.create.countryAdded, { country: name }),
          errors: strings.errors,
        },
      );
      router.refresh();
    });
  };

  const overlap = useMemo(() => {
    if (!center) return null;
    const near = pins
      .map((pin) => ({ pin, meters: distanceMeters(center, pin.coords) }))
      .filter(({ pin, meters }) => meters < (radiusKm + pin.radiusKm) * 1000)
      .sort((a, b) => a.meters - b.meters);
    return near[0] ?? null;
  }, [center, pins, radiusKm]);

  const resetToEmpty = () => {
    form.reset(EMPTY);
    autoCity.current = null;
    setSlugOverride(false);
    setEditingSlug(false);
    setChecked(null);
    setDetected(null);
  };

  const submit = form.handleSubmit((input) => {
    startTransition(async () => {
      const result = await createChapterAction({
        ...input,
        address: input.address || undefined,
        careHomeName: input.careHomeName || undefined,
        description: input.description || undefined,
        logo: input.logo || undefined,
      });
      if (!result.ok) {
        notify(result, { done: "", errors: strings.errors });
        return;
      }
      haptics.success();
      onCreated({
        id: result.id,
        name: result.name,
        slug: result.slug,
        city: input.city,
        countryId: input.countryId,
        countryName:
          allCountries.find((country) => country.id === input.countryId)
            ?.name ?? "",
        address: input.address || null,
        careHomeName: input.careHomeName || null,
        description: input.description || null,
        logo: input.logo || null,
        latitude: input.latitude,
        longitude: input.longitude,
        serviceRadiusKm: input.serviceRadiusKm ?? DEFAULT_RADIUS_KM,
      });
      setCreated({ id: result.id, slug: result.slug, name: result.name });
    });
  });

  const joinLink = created ? `${joinBase}${created.slug}` : "";
  const ready = Boolean(values.name && center && values.countryId);
  const fixedCountry =
    allCountries.length === 1 ? allCountries[0].name : undefined;

  const close = (next: boolean) => {
    if (!next && created) {
      resetToEmpty();
      setCreated(null);
    }
    onOpenChange(next);
  };

  return (
    <AdminDrawer
      open={open}
      onOpenChange={close}
      title={
        created
          ? fill(strings.create.done.title, { name: created.name })
          : strings.new
      }
      description={created ? undefined : strings.create.intro}
      size="lg"
      bodyClassName={created ? undefined : "md:overflow-hidden"}
      footer={
        created ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                resetToEmpty();
                setCreated(null);
              }}
            >
              {strings.create.done.another}
            </Button>
            <Button
              type="button"
              className="min-h-11 bg-red text-white hover:bg-red-hover"
              onClick={() =>
                router.push(`/admin/chapters/${created.id}${scopeQuery}`)
              }
            >
              {strings.create.done.open}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => close(false)}
            >
              {strings.cancel}
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={!ready || pending}
              className="min-h-11 bg-red text-white hover:bg-red-hover"
            >
              {pending ? strings.create.pending : strings.create.submit}
              <Kbd className="hidden bg-white/20 text-white sm:inline-flex">
                {strings.create.shortcut}
              </Kbd>
            </Button>
          </>
        )
      }
    >
      {created ? (
        <DonePanel
          name={created.name}
          slug={created.slug}
          url={joinLink}
          strings={strings}
        />
      ) : (
        <div className="grid gap-6 md:h-full md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Form {...form}>
            <form
              id={formId}
              onSubmit={submit}
              onKeyDown={submitOnCmdEnter}
              aria-busy={pending}
              className="grid content-start gap-5 md:min-h-0 md:overflow-y-auto md:pr-3"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{strings.fields.name}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        autoFocus
                        autoComplete="off"
                        onChange={(event) => {
                          const next = event.target.value;
                          field.onChange(next);
                          if (!next) setSlugOverride(false);
                          if (!slugOverride || !next)
                            form.setValue("slug", slugify(next), {
                              shouldDirty: true,
                            });
                        }}
                        className="h-11 border-line text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <SlugRow
                slug={slug}
                joinBase={joinBase}
                editing={editingSlug}
                state={slugState}
                strings={strings.create}
                onChange={(next) =>
                  form.setValue("slug", next, { shouldDirty: true })
                }
                onEdit={() => setEditingSlug(true)}
                onDone={() => {
                  setEditingSlug(false);
                  setSlugOverride(true);
                }}
              />

              <div className="grid gap-2">
                {center ? (
                  <>
                    <div className="flex items-start gap-3 rounded-(--r-card) border border-line p-3">
                      <MapPin
                        className="mt-0.5 size-5 shrink-0 text-ink-faint"
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm break-words text-ink">
                          {values.address || strings.create.address.label}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={clearPlace}
                      >
                        {strings.create.changeAddress}
                      </Button>
                    </div>
                    <p className="text-2sm text-ink-soft">
                      {strings.create.dragHint}
                    </p>
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="pt-2">
                          <FormLabel>{strings.fields.city}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              autoComplete="off"
                              className="h-11 border-line text-base"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <div
                    aria-busy={resolving}
                    className={cn(
                      resolving && "pointer-events-none opacity-60",
                    )}
                  >
                    <AddressSearch
                      search={(query) =>
                        suggestChapterPlaces({ query, sessionToken, language })
                      }
                      strings={strings.create.address}
                      onPick={(suggestion) => pickPlace(suggestion.id)}
                      inputClassName="h-11 rounded-(--r-card)"
                    />
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                {fixedCountry ? (
                  <>
                    <span className="text-sm font-medium">
                      {strings.fields.country}
                    </span>
                    <p className="flex h-11 items-center text-base text-ink-soft">
                      {fixedCountry}
                    </p>
                  </>
                ) : (
                  <FormField
                    control={form.control}
                    name="countryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{strings.fields.country}</FormLabel>
                        <Select
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 w-full border-line text-base">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allCountries.map((country) => (
                              <SelectItem
                                key={country.id}
                                value={country.id}
                              >
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {detected?.known ? (
                  <p className="text-2sm text-ink-soft">
                    {strings.create.countryDetected}
                  </p>
                ) : null}

                {detected && !detected.known ? (
                  <div className="grid gap-2 rounded-(--r-card) bg-mint-tint p-3 text-2sm">
                    <p>
                      {fill(strings.create.countryMissing, {
                        country: regionName(detected.code, language),
                      })}
                    </p>
                    {canCreateCountry ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={addingCountry}
                        className="min-h-11 justify-self-start"
                        onClick={() => addCountry(detected.code)}
                      >
                        {fill(strings.create.addCountry, {
                          country: regionName(detected.code, language),
                        })}
                      </Button>
                    ) : (
                      <p className="text-ink-soft">
                        {fill(strings.create.needCountryAdmin, {
                          country: regionName(detected.code, language),
                        })}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <FormField
                control={form.control}
                name="serviceRadiusKm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{strings.create.radius}</FormLabel>
                    <FormControl>
                      <Slider
                        min={MIN_RADIUS_KM}
                        max={MAX_RADIUS_KM}
                        step={1}
                        value={[field.value ?? DEFAULT_RADIUS_KM]}
                        onValueChange={([next]) => field.onChange(next)}
                        aria-label={strings.create.radius}
                        data-vaul-no-drag
                        className="py-2"
                      />
                    </FormControl>
                    <p className="text-2sm tabular-nums text-ink-soft">
                      {fill(strings.create.radiusValue, {
                        distance: formatDistance(radiusKm * 1000, notation),
                      })}
                    </p>
                    {overlap ? (
                      <p className="flex items-start gap-2 text-2sm text-ink-soft">
                        <CircleAlert
                          className="mt-0.5 size-4 shrink-0"
                          aria-hidden
                        />
                        <span>
                          {fill(strings.create.overlap, {
                            name: overlap.pin.name,
                            distance: formatDistance(overlap.meters, notation),
                          })}
                        </span>
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <section className="grid gap-5 border-t border-line pt-5">
                <h3 className="text-2sm font-medium text-ink-soft">
                  {strings.create.optional}
                </h3>

                <FormField
                  control={form.control}
                  name="careHomeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{strings.fields.careHomeName}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          autoComplete="off"
                          className="h-11 border-line text-base"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{strings.fields.description}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ""}
                          maxLength={DESCRIPTION_MAX}
                          rows={3}
                          className="border-line text-base"
                        />
                      </FormControl>
                      <p className="text-right text-xs tabular-nums text-ink-faint">
                        {fill(strings.create.counter, {
                          count: (field.value ?? "").length,
                          max: DESCRIPTION_MAX,
                        })}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{strings.fields.logo}</FormLabel>
                      <div className="flex items-start gap-3">
                        <FormControl>
                          <Input
                            {...field}
                            type="url"
                            inputMode="url"
                            value={field.value ?? ""}
                            onChange={(event) =>
                              field.onChange(event.target.value || undefined)
                            }
                            autoComplete="off"
                            className="h-11 border-line text-base"
                          />
                        </FormControl>
                        {isHttpUrl(field.value) ? (
                          <span className="grid shrink-0 justify-items-center gap-1">
                            <ChapterLogo
                              logo={field.value ?? null}
                              name={values.name ?? ""}
                              className="size-14"
                            />
                            <span className="text-xs text-ink-faint">
                              {strings.create.logoPreview}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </form>
          </Form>

          <div className="order-first md:order-none md:h-full md:min-h-0">
            {process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
              <div className="h-56 overflow-hidden rounded-(--r-tile) border border-line md:h-full">
                <ChapterMap
                  center={center}
                  radiusKm={radiusKm}
                  others={pins}
                  onMove={movePin}
                  label={strings.mapLabel}
                />
              </div>
            ) : (
              <div className="grid h-56 place-items-center rounded-(--r-tile) bg-canvas-deep p-6 text-center md:h-full">
                <p className="max-w-xs text-sm text-ink-soft">
                  <MapPinOff
                    className="mx-auto mb-3 size-6"
                    aria-hidden
                  />
                  {strings.mapUnavailable}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminDrawer>
  );
}

function SlugRow({
  slug,
  joinBase,
  editing,
  state,
  strings,
  onChange,
  onEdit,
  onDone,
}: {
  slug: string;
  joinBase: string;
  editing: boolean;
  state: SlugState;
  strings: ChapterCreateStrings["create"];
  onChange: (slug: string) => void;
  onEdit: () => void;
  onDone: () => void;
}) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{strings.webAddress}</span>
      <div className="flex items-center gap-2">
        {editing ? (
          <Input
            value={slug}
            onChange={(event) => onChange(slugify(event.target.value))}
            autoComplete="off"
            autoFocus
            aria-label={strings.webAddress}
            className="h-11 min-w-0 flex-1 border-line font-mono text-base"
          />
        ) : (
          <p className="min-w-0 flex-1 font-mono text-2sm break-all text-ink-soft">
            {joinBase}
            <span className="text-ink">{slug}</span>
          </p>
        )}

        {state === "idle" ? null : (
          <p
            aria-live="polite"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              state === "free" && "bg-mint-tint text-ink",
              state === "taken" && "text-red",
              state === "checking" && "text-ink-soft",
            )}
          >
            {state === "checking" ? (
              <Loader2
                className="size-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : state === "free" ? (
              <Check
                className="size-3.5"
                aria-hidden
              />
            ) : (
              <X
                className="size-3.5"
                aria-hidden
              />
            )}
            {state === "checking"
              ? strings.slugChecking
              : state === "free"
                ? strings.slugFree
                : strings.slugTaken}
          </p>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={editing ? strings.slugDone : strings.slugEdit}
          className="shrink-0"
          onClick={editing ? onDone : onEdit}
        >
          {editing ? (
            <Check
              className="size-4"
              aria-hidden
            />
          ) : (
            <Pencil
              className="size-4"
              aria-hidden
            />
          )}
        </Button>
      </div>
    </div>
  );
}

function DonePanel({
  name,
  slug,
  url,
  strings,
}: {
  name: string;
  slug: string;
  url: string;
  strings: ChapterCreateStrings;
}) {
  return (
    <div className="mx-auto grid max-w-lg content-start justify-items-center gap-4 py-6 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-mint-tint">
        <CircleCheckBig
          className="size-7 text-ink"
          aria-hidden
        />
      </span>
      <h2 className="font-display text-xl font-bold tracking-tight text-ink">
        {fill(strings.create.done.title, { name })}
      </h2>
      <p className="max-w-prose text-sm text-ink-soft">
        {strings.create.done.body}
      </p>

      <div className="rounded-(--r-tile) bg-mint-tint p-4">
        <QrCode
          value={url}
          className="size-40"
        />
      </div>
      <p className="font-mono text-2sm break-all text-ink-soft">{url}</p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <CopyButton
          value={url}
          label={strings.joinLink.copy}
          copiedLabel={strings.joinLink.copied}
        />
        <Button
          asChild
          variant="outline"
          className="min-h-11"
        >
          <a
            href={`/join/${slug}/poster?print=1`}
            target="_blank"
            rel="noopener"
          >
            <Printer aria-hidden />
            {strings.joinLink.poster}
          </a>
        </Button>
        <DownloadQrButton
          value={url}
          fileName={`${slug}-qr.png`}
          label={strings.joinLink.downloadPng}
        />
      </div>
    </div>
  );
}
