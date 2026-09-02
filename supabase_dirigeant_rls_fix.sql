-- Fix: un dirigeant (accès délégué via dirigeant_acces) ne peut lire ni club_educateurs,
-- ni materiel_distribution, ni vehicules, ni planning_terrains, car les policies RLS
-- existantes ne vérifient que auth.uid() = club_id / educateur_id / staff_club,
-- ce qui ne correspond jamais au compte auth réel d'un dirigeant délégué.
-- On ajoute des policies additives (on ne touche pas aux existantes) basées sur
-- une fonction miroir de est_parent_accepte_de().

CREATE OR REPLACE FUNCTION public.est_dirigeant_accepte_de(p_educateur_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM dirigeant_acces
    WHERE educateur_id = p_educateur_id
      AND dirigeant_id = auth.uid()
      AND statut = 'accepte'
  );
$function$;

CREATE POLICY "dirigeant_lit_club_educateurs_de_son_educateur"
ON public.club_educateurs
FOR SELECT
USING (public.est_dirigeant_accepte_de(educateur_id));

CREATE POLICY "dirigeant_lit_materiel_de_son_educateur"
ON public.materiel_distribution
FOR SELECT
USING (public.est_dirigeant_accepte_de(educateur_id));

-- vehicules n'a pas de colonne educateur_id (uniquement club_id) : on vérifie
-- que le club appartient bien au club_educateurs de l'éducateur délégant.
CREATE OR REPLACE FUNCTION public.est_dirigeant_accepte_de_club(p_club_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM dirigeant_acces da
    JOIN club_educateurs ce ON ce.educateur_id = da.educateur_id
    WHERE ce.club_id = p_club_id
      AND da.dirigeant_id = auth.uid()
      AND da.statut = 'accepte'
      AND ce.statut = 'accepte'
  );
$function$;

CREATE POLICY "dirigeant_lit_vehicules_de_son_educateur"
ON public.vehicules
FOR SELECT
USING (public.est_dirigeant_accepte_de_club(club_id));

-- planning_terrains.educateur_id est nullable (nombreux créneaux club-wide, non
-- rattachés à un éducateur précis) : la policy existante pour un éducateur normal
-- se base sur club_id via club_educateurs, pas sur educateur_id. On mirror ça.
CREATE POLICY "dirigeant_lit_planning_terrains_de_son_educateur"
ON public.planning_terrains
FOR SELECT
USING (public.est_dirigeant_accepte_de_club(club_id));
