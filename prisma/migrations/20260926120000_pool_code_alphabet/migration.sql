-- The fleet backfill drew pool codes from MD5 hex, which contains 0 and 1.
-- `poolCode` in src/features/fleet/schemas.ts rejects both, so those pools
-- could never be joined. Redraw every such code from POOL_CODE_ALPHABET.
UPDATE `storage_location`
   SET `poolCode` = CONCAT(
         LEFT(`poolCode`, 2), '-',
         SUBSTRING('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + ORD(RANDOM_BYTES(1)) % 32, 1),
         SUBSTRING('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + ORD(RANDOM_BYTES(1)) % 32, 1),
         SUBSTRING('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + ORD(RANDOM_BYTES(1)) % 32, 1),
         SUBSTRING('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + ORD(RANDOM_BYTES(1)) % 32, 1),
         '-',
         SUBSTRING('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + ORD(RANDOM_BYTES(1)) % 32, 1),
         SUBSTRING('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + ORD(RANDOM_BYTES(1)) % 32, 1)
       )
 WHERE `poolCode` IS NOT NULL
   AND NOT REGEXP_LIKE(`poolCode`, '^[A-Z]{2}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{2}$', 'c');
