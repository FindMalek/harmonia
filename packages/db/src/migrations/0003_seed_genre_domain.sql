-- Seed default genre domain so cluster inserts never fail on empty genre_domain
INSERT INTO "genre_domain" ("name", "description")
SELECT 'Unknown', 'Default domain for unclassified clusters'
WHERE NOT EXISTS (SELECT 1 FROM "genre_domain" LIMIT 1);
