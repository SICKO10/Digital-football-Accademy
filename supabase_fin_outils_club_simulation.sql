-- Test réel du bloc 6 (PLAN-outils-offerts.md) : simule la fin du forfait du
-- club d'essai pour que testfinal reçoive l'avis « Ton club ne fournit plus
-- tes outils ». Club d'essai uniquement.
--
-- Le forfait est coupé puis rétabli dans la même opération : aucun autre
-- compte ne voit jamais le club sans forfait, et il n'y a rien à remettre
-- ensuite. Seule la notification de testfinal reste (c'est le but).
--
-- À lancer après supabase_fin_outils_club.sql et son contrôle (21 sur 21).
-- Lancer une seule fois : relancé dans l'heure sans que testfinal ait lu
-- l'avis, il n'en crée pas de deuxième (protection contre les doublons).

begin;

do $$
declare
  v_club uuid;
  v_edu uuid;
begin
  select u.id into v_club from auth.users u where u.email = 'deabreu.amorim+club@gmail.com';
  select ce.educateur_id into v_edu from public.club_educateurs ce
  where ce.club_id = v_club and ce.statut = 'accepte' and ce.educateur_id::text like '75df7fba%'
  limit 1;
  if v_club is null or v_edu is null then
    raise exception 'Club d''essai ou testfinal introuvable (ou testfinal plus affilié au club)';
  end if;
  if not public.club_offre_outils(v_club) then
    raise exception 'Le club d''essai n''a pas de forfait actif au nouveau modèle : rien à simuler';
  end if;
  if not exists (
    select 1 from public.outils_club_ouverts o
    where o.club_id = v_club and public.outil_offert_par_club(o.outil)
  ) then
    raise exception 'Le club d''essai ne fournit aucun outil : allume d''abord Tacticboard dans Configuration > Outils des éducateurs';
  end if;
  if not public.educateur_a_place(v_club, v_edu) then
    raise exception 'testfinal n''a pas de place dans le forfait du club d''essai';
  end if;

  update public.profiles set abonnement_actif = false where id = v_club;
  update public.profiles set abonnement_actif = true where id = v_club;
end $$;

commit;

-- Résultat attendu : une ligne, « Ton club ne fournit plus tes outils depuis le JJ/MM… », lu = false.
select n.titre, n.contenu, n.lu, n.created_at
from public.notifications n
where n.type = 'outils_club_fin' and n.user_id::text like '75df7fba%'
order by n.created_at desc
limit 1;
