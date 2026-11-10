-- Essais gratuits suspendus (2026-11-10) : retire les essais en cours des
-- comptes du nouveau modèle (les 3 comptes de test) pour qu'ils repartent d'un
-- état propre avant le paiement. Les achats, forfaits et offres ne sont pas touchés.

-- 1. Essais en cours retirés
delete from public.outils_comptes oc
using public.profiles p
where p.id = oc.compte_id
  and p.modele_outils = true
  and oc.source = 'essai'
returning oc.compte_id, oc.outil, oc.source;

-- 2. Mémoire des essais déjà utilisés effacée (pour que rien ne bloque quand les essais reviendront)
delete from public.outils_essais_utilises eu
using public.profiles p
where p.id = eu.compte_id
  and p.modele_outils = true
returning eu.compte_id, eu.outil;
