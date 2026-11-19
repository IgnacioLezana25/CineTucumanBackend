ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS referencia VARCHAR(120);

UPDATE sucursales AS s
SET referencia = v.referencia
FROM (VALUES
  ('cinemacenter-tucuman', 'Hipermercado Libertad.'),
  ('sunstar-cinemas', 'Portal de Tucumán Shopping.'),
  ('cines-del-solar', 'Shopping Solar del Cerro.')
) AS v (slug, referencia)
WHERE s.slug = v.slug AND s.referencia IS NULL;
