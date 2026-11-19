CREATE TABLE IF NOT EXISTS pelicula_reparto (
  pelicula_id  INTEGER      NOT NULL,
  orden        SMALLINT     NOT NULL,
  nombre       VARCHAR(80)  NOT NULL,
  foto_archivo VARCHAR(120),
  PRIMARY KEY (pelicula_id, orden),
  CONSTRAINT pelicula_reparto_pelicula_fkey FOREIGN KEY (pelicula_id)
    REFERENCES peliculas (id) ON DELETE CASCADE,
  CONSTRAINT pelicula_reparto_orden_check CHECK (orden > 0),
  CONSTRAINT pelicula_reparto_nombre_key UNIQUE (pelicula_id, nombre)
);

COMMENT ON TABLE pelicula_reparto IS 'Actores de cada película, en el orden en que se muestran, con el archivo de su foto';

INSERT INTO pelicula_reparto (pelicula_id, orden, nombre, foto_archivo)
SELECT p.id, v.orden, v.nombre, v.foto
FROM (VALUES
  ('spider-man-un-nuevo-dia', 1, 'Tom Holland', 'tom-holland.jpg'),
  ('spider-man-un-nuevo-dia', 2, 'Zendaya', 'zendaya.jpg'),
  ('spider-man-un-nuevo-dia', 3, 'Sadie Sink', 'sadie-sink.jpg'),
  ('spider-man-un-nuevo-dia', 4, 'Jacob Batalon', 'jacob-batalon.jpg'),
  ('spider-man-un-nuevo-dia', 5, 'Jon Bernthal', 'jon-bernthal.jpg'),
  ('spider-man-un-nuevo-dia', 6, 'Mark Ruffalo', 'mark-ruffalo.jpg')
) AS v (slug, orden, nombre, foto)
JOIN peliculas p ON p.slug = v.slug
ON CONFLICT DO NOTHING;
