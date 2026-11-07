-- Bloc 3 : donne l'outil Séances (abonnement en cours, sans paiement) à
-- l'éducateur de test, pour vérifier que les entrées Séances apparaissent.
-- Une seule ligne, sur un seul compte (testfinal@gmail.com).
-- Le résultat doit afficher 1 ligne.

insert into public.outils_comptes (compte_id, outil, source, fin_le)
select p.id, 'seances', 'achat', null
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = 'testfinal@gmail.com'
on conflict (compte_id, outil) do nothing
returning compte_id, outil, source, fin_le;
