-- Bannière large (image pleine hauteur dans le bandeau "Nos partenaires",
-- cf. supabase_sponsors_bandeau.sql) en plus du logo — un sponsor peut avoir
-- les deux : la bannière prend le pas sur le logo/nom dans SponsorsBar.jsx
-- si elle est renseignée, sinon fallback sur logo_url puis entreprise.
ALTER TABLE sponsors
  ADD COLUMN IF NOT EXISTS banniere_url TEXT;
