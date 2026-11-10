-- Vérification du bloc 5 : lecture seule. Colle le résultat dans la conversation.
-- Attendu : 2 lignes. La règle « source » liste achat, essai, offre, forfait ;
-- la règle « fin_essai » exempte achat et forfait.
select conname as regle, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.outils_comptes'::regclass
  and contype = 'c'
order by conname;
