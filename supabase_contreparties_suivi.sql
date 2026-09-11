-- CRM sponsoring — Phase 2 : suivi structuré des contreparties après
-- signature (tableau Partenaire / Engagement / Échéance / Statut), au lieu
-- du simple cochage plat contreparties_livrees (conservée telle quelle pour
-- ne rien casser, mais plus lue/écrite par l'UI après cette migration).
-- Chaque élément : { id, label, echeance, statut: 'a_faire'|'fait', preuve_url }.
alter table sponsors
  add column if not exists contreparties_suivi jsonb not null default '[]'::jsonb;

-- Rétro-remplissage : pour chaque sponsor déjà lié à un niveau, on reprend la
-- liste de contreparties du niveau, en marquant "fait" celles déjà cochées
-- dans contreparties_livrees — pas de perte de saisie existante.
update sponsors s
set contreparties_suivi = (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid(),
    'label', c,
    'echeance', null,
    'statut', case when s.contreparties_livrees @> array[c] then 'fait' else 'a_faire' end,
    'preuve_url', null
  )), '[]'::jsonb)
  from niveaux_partenariat np, unnest(np.contreparties) as c
  where np.id = s.niveau_id
)
where s.niveau_id is not null
  and (s.contreparties_suivi is null or s.contreparties_suivi = '[]'::jsonb);
