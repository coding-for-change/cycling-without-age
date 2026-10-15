UPDATE `ride` r
LEFT JOIN `chapter_settings` s ON s.`chapterId` = r.`chapterId`
SET r.`staffingCheckedAt` = CURRENT_TIMESTAMP(3)
WHERE r.`status` = 'scheduled'
  AND r.`staffingCheckedAt` IS NULL
  AND r.`startsAt` > CURRENT_TIMESTAMP(3)
  AND r.`startsAt` <= DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL COALESCE(s.`staffingCheckLeadHours`, 48) HOUR);
