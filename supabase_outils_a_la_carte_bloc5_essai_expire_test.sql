-- Test du bloc 5 : fait expirer les essais en cours de l'éducateur de test
-- (testfinal@gmail.com) pour voir l'encart « Garder cet outil ».
-- Ne touche que ce compte, et seulement les lignes d'essai.
update public.outils_comptes oc
set fin_le = now() - interval '1 day'
from auth.users u
where u.id = oc.compte_id
  and lower(u.email) = 'testfinal@gmail.com'
  and oc.source = 'essai'
returning oc.outil, oc.fin_le;
