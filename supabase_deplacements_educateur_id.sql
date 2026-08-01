-- Lien fiable vers l'éducateur concerné par un déplacement (educateur_responsable
-- reste le nom affiché en texte libre, mais un uuid est nécessaire pour pouvoir
-- filtrer/notifier précisément — utilisé par le Planning week-end).
alter table deplacements add column if not exists educateur_id uuid references profiles(id);
