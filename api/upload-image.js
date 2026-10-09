import {
  FORMATS_IMAGE, FORMATS_DOCUMENT, verifierJetonSupabase, configCloudinaryDepuisEnv,
  authentifier, repondreSignature, aleatoire,
} from './_securite.js'
import { donneesSupabase, peutEditerPourClub, estUuid } from './_droits.js'

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

// Droit d'agir pour un club : règle partagée (api/_droits.js).
export const peutAgirPourClub = ({ donnees, userId, clubId, usage }) =>
  peutEditerPourClub({ donnees, userId, clubId, section: USAGES[usage].section, educateursProjet: !!USAGES[usage].educateursProjet })

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
        if (!estUuid(corps.clubId)) return res.status(400).json({ error: 'Club manquant' })
        if (!(await peutAgirPourClub({ donnees, userId: utilisateur.id, clubId: corps.clubId, usage }))) {
          return res.status(403).json({ error: 'Accès refusé pour ce club' })
        }
        proprietaire = corps.clubId
      } else if (corps.joueurId && corps.joueurId !== utilisateur.id) {
        if (!regle.cible.includes('enfant') || !estUuid(corps.joueurId) || !(await donnees.parentAccepte(utilisateur.id, corps.joueurId))) {
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

export default creerHandler({ verifierJeton: verifierJetonSupabase, lireConfig: configCloudinaryDepuisEnv, donnees: donneesSupabase() })
