-- Coordinates become mandatory. A chapter is a physical place people are matched
-- to by distance: one without a position could be neither pinned nor ranked, so
-- a missing pair is a broken row rather than an incomplete one.
--
-- Backfill first so the NOT NULL below cannot fail on an existing database. The
-- fallback is the centroid of the chapter's country where one is known, and
-- otherwise (0, 0) — deliberately somewhere obviously wrong in the Gulf of
-- Guinea, so a row that still needs a real position is easy to spot rather than
-- quietly plausible.
UPDATE `organization` o
  LEFT JOIN `country` c ON c.id = o.countryId
  SET o.latitude = COALESCE(o.latitude, CASE c.code
        WHEN 'DE' THEN 51.1657
        WHEN 'DK' THEN 56.2639
        ELSE 0 END),
      o.longitude = COALESCE(o.longitude, CASE c.code
        WHEN 'DE' THEN 10.4515
        WHEN 'DK' THEN 9.5018
        ELSE 0 END)
  WHERE o.latitude IS NULL OR o.longitude IS NULL;

-- AlterTable
ALTER TABLE `organization`
    MODIFY `latitude` DOUBLE NOT NULL,
    MODIFY `longitude` DOUBLE NOT NULL;

-- The geospatial access path: a composite index over the two coordinates, which
-- is what serves the bounding-box scan a "chapters near here" query becomes
--   WHERE latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
-- Latitude leads because it is the more selective of the two at our latitudes.
--
-- Deliberately NOT a MySQL SPATIAL index. That needs a POINT column, and the
-- only way to keep one in step with these two is a STORED GENERATED column —
-- which Prisma cannot model. Declared required it removes `create` from the
-- client entirely; declared optional, the next `prisma migrate dev` emits
-- `MODIFY coordinates point NOT NULL`, which MySQL accepts while silently
-- dropping the generation expression, leaving a column nothing populates.
-- Verified both, hence this. See docs-internal/ARCHITECTURE.md.
CREATE INDEX `organization_latitude_longitude_idx`
    ON `organization` (`latitude`, `longitude`);
