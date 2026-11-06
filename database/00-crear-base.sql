-- Cine Tucumán · Creación de la base de datos (PostgreSQL)
--
-- Se ejecuta UNA SOLA VEZ, conectado a la base "postgres" (no a cine_tucuman, que todavía no existe):
--
--   psql -U postgres -f database/00-crear-base.sql
--
-- Después se crean las tablas con schema.sql y se cargan los datos con seed.sql.

SELECT 'La base cine_tucuman ya existe: no se crea de nuevo' AS aviso
WHERE EXISTS (SELECT 1 FROM pg_database WHERE datname = 'cine_tucuman');

CREATE DATABASE cine_tucuman
  WITH ENCODING = 'UTF8'
       TEMPLATE = template0;

COMMENT ON DATABASE cine_tucuman IS 'Base de datos del proyecto Cine Tucumán (Programación IV)';
