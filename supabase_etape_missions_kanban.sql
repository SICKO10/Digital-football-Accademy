-- Kanban par tâche (Projets club, phase 1) : les missions n'avaient ni
-- statut ni priorité — le Kanban existant était au niveau projet entier,
-- pas tâche. statut à 5 valeurs (vs les 4 de projet_etapes.statut) pour
-- matcher les colonnes du nouveau Kanban interne à un projet.

alter table etape_missions add column if not exists statut text not null default 'a_faire'
  check (statut in ('a_preparer','a_faire','en_cours','en_attente','termine'));
alter table etape_missions add column if not exists priorite text
  check (priorite in ('basse','moyenne','haute'));

-- Backfill depuis le statut de l'étape parente (mission fraîchement créée
-- avec le défaut 'a_faire' juste au-dessus, on l'affine ici une seule fois).
update etape_missions m set statut = case e.statut
  when 'valide' then 'termine'
  when 'en_cours' then 'en_cours'
  when 'en_retard' then 'en_attente'
  else 'a_faire'
end
from projet_etapes e
where e.id = m.etape_id;
