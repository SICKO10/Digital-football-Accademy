-- Symétrique de reclamer_creneau_date (supabase_planning_terrains_exceptions.sql) :
-- l'éducateur qui a réclamé un créneau libéré (exception type='remplacement')
-- peut le rendre — redevient 'liberation' (donc à nouveau disponible pour un
-- autre éducateur, ou récupérable par le titulaire via "Annuler la
-- libération"). libere_par (nom du libérateur d'origine) n'est jamais
-- touché par reclamer_creneau_date, donc reste correct après ce retour en
-- arrière ; educateur_id de l'exception, lui, ne peut pas être restauré à
-- l'UUID d'origine (écrasé au moment de la réclamation) — remis à null.
create or replace function annuler_reclamation_date(p_creneau_id uuid, p_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update planning_terrains_exceptions
  set type = 'liberation', educateur_id = null, equipe_remplacante = null
  where creneau_id = p_creneau_id and date_exception = p_date and type = 'remplacement' and educateur_id = auth.uid();

  if not found then
    raise exception 'Tu n''as pas réclamé ce créneau';
  end if;
end;
$$;

grant execute on function annuler_reclamation_date(uuid, date) to authenticated;
