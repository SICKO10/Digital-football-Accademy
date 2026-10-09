import {
  FORMATS_IMAGE, FORMATS_DOCUMENT, verifierJetonSupabase, configCloudinaryDepuisEnv, clientServiceSupabase,
  authentifier, repondreSignature, aleatoire,
} from './_securite.js'
import { peutEditerSection } from '../src/lib/permissionsClub.js'

// Signature d'upload Cloudinary pour images et documents (avatars, pièces de
// certification, licence/feuilles recruteur, fiches de séance, thème et
// projet sportif du club).
//
// Avant : un userId (ou un clubId passé comme userId) envoyé par le
// navigateur suffisait, sans authentification. Désormais :
// - identité = jeton Supabase vérifié côté serveur ;
// - « usage » demandé => formats, sous-dossier et règle d'accès imposés ici ;
// - propriétaire du dossier :
//     · soi-même (par défaut) ;
//     · un joueur dont on est le parent ACCEPTÉ (pièces de certification
//       uniquement, cf. dashboard parent qui rend DashboardJoueur) ;
//     · un club : le club lui-même, un membre staff_club ayant le droit
//       d'édition sur la section (même règle que canEditSection), ou — pour
//       le projet sportif — un éducateur affilié autorisé par le club ;
// - tout le reste => 403, sans signature.

export const USAGES = {
  certifications: { formats: FORMATS_DOCUMENT, cible: ['soi', 'enfant'] },
  avatar: { formats: FORMATS_IMAGE, cible: ['soi'] },
  licence: { formats: FORMATS_DOCUMENT, cible: ['soi'] },
  feuille: { formats: FORMATS_DOCUMENT, cible: ['soi'] },
  seance: { formats: FORMATS_DOCUMENT, cible: ['soi'] },
  avatar_club: { formats: FORMATS_IMAGE, cible: ['club'], section: 'profil' },
  theme: { formats: FORMATS_IMAGE, cible: ['club'], section: 'profil' },
  principe_photo: { formats: FORMATS_IMAGE, cible: ['club'], section: 'sportif', educateursProjet: true },
  terrain_fond: { formats: FORMATS_IMAGE, cible: ['club'], section: 'sportif', educateursProjet: true },
  terrain_galerie: { formats: FORMATS_IMAGE, cible: ['club'], section: 'sportif', educateursProjet: true },
}

const estId = (v) => typeof v === 'string' && /^[0-9a-f-]{8,64}$/i.test(v)

// Droit d'agir pour un club (lectures seules, clé service côté serveur).
export async function peutAgirPourClub({ donnees, userId, clubId, usage }) {
  const regle = USAGES[usage]
  if (userId === clubId) {
    const club = await donnees.profil(clubId)
    if (club?.plan === 'club') return true
  }
  const staff = await donnees.staffClub(userId, clubId)
  if (staff) {
    // Même repli que DashboardClub.jsx : rôle absent => président.
    const role = staff.role || 'president'
    const ligne = role === 'president' ? null : await donnees.permissionRole(clubId, role, regle.section)
    if (peutEditerSection({ role, section: regle.section, ligne })) return true
  }
  if (regle.educateursProjet) {
    const aff = await donnees.affiliationEducateur(userId, clubId)
    if (aff) {
      const club = await donnees.profil(clubId)
      if (aff.peut_editer_projet_sportif ?? club?.educateurs_editent_projet_sportif ?? false) return true
    }
  }
  return false
}

export function creerHandler({ verifierJeton, lireConfig, donnees, maintenant = () => Date.now() }) {
  return async function handler(req, res) {
    const utilisateur = await authentifier(req, res, verifierJeton)
    if (!utilisateur) return

    const corps = req.body || {}
    // « type » : nom historique du paramètre, gardé comme alias.
    const usage = corps.usage || corps.type || 'certifications'
    const regle = Object.prototype.hasOwnProperty.call(USAGES, usage) ? USAGES[usage] : null
    if (!regle) return res.status(400).json({ error: 'Usage non pris en charge' })

    let proprietaire = utilisateur.id
    try {
      if (regle.cible.includes('club')) {
        if (!estId(corps.clubId)) return res.status(400).json({ error: 'Club manquant' })
        if (!(await peutAgirPourClub({ donnees, userId: utilisateur.id, clubId: corps.clubId, usage }))) {
          return res.status(403).json({ error: 'Accès refusé pour ce club' })
        }
        proprietaire = corps.clubId
      } else if (corps.joueurId && corps.joueurId !== utilisateur.id) {
        if (!regle.cible.includes('enfant') || !estId(corps.joueurId) || !(await donnees.parentAccepte(utilisateur.id, corps.joueurId))) {
          return res.status(403).json({ error: 'Accès refusé pour ce joueur' })
        }
        proprietaire = corps.joueurId
      }
    } catch {
      return res.status(500).json({ error: 'Vérification des droits impossible' })
    }

    const config = lireConfig()
    if (!config) return res.status(500).json({ error: 'Configuration serveur incomplète' })

    const timestamp = Math.round(maintenant() / 1000)
    return repondreSignature(res, {
      config,
      resource_type: 'image',
      params: {
        folder: `digital-football/${proprietaire}/${usage}`,
        public_id: `${usage}_${timestamp}_${aleatoire()}`,
        timestamp,
        allowed_formats: regle.formats,
      },
    })
  }
}

// Accès réel aux données (lecture seule, clé service). Toute erreur Supabase
// est remontée => 500, jamais un accès accordé par défaut.
export function donneesSupabase() {
  const lire = async (requete) => {
    const { data, error } = await requete
    if (error) throw error
    return data
  }
  return {
    profil: (id) => lire(clientServiceSupabase().from('profiles').select('plan, educateurs_editent_projet_sportif').eq('id', id).maybeSingle()),
    staffClub: (userId, clubId) => lire(clientServiceSupabase().from('staff_club').select('role').eq('user_id', userId).eq('club_id', clubId).maybeSingle()),
    permissionRole: (clubId, role, section) => lire(clientServiceSupabase().from('role_permissions').select('can_view, can_edit').eq('club_id', clubId).eq('role', role).eq('section', section).maybeSingle()),
    affiliationEducateur: (userId, clubId) => lire(clientServiceSupabase().from('club_educateurs').select('peut_editer_projet_sportif').eq('educateur_id', userId).eq('club_id', clubId).eq('statut', 'accepte').maybeSingle()),
    parentAccepte: async (parentId, joueurId) => !!(await lire(clientServiceSupabase().from('parents_acces').select('id').eq('parent_id', parentId).eq('joueur_id', joueurId).eq('statut', 'accepte').maybeSingle())),
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, lireConfig: configCloudinaryDepuisEnv, donnees: donneesSupabase() })
