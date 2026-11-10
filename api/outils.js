/* global process */
import { verifierJetonSupabase, clientServiceSupabase, authentifier } from './_securite.js'
import Stripe from 'stripe'
import { trouverOutil, ESSAI_JOURS, lignesStripe, comparerPrix, compositionPaiement } from '../src/lib/catalogueOutils.js'

// Outils à la carte : une seule fonction serveur, plusieurs actions (l'offre
// gratuite Vercel limite le nombre de fonctions).
//
// - `essai` : un éducateur du nouveau modèle lance l'essai gratuit de 14 jours
//   d'un outil, une seule fois par outil. Sans carte bancaire.
// - `choisir_club` : un club du nouveau modèle ajoute ou retire un de ses outils.
//   Les outils du club sont inclus dans son forfait (source `forfait`), sans prix.
// - `payer` : premier paiement d'une composition, en une fois et pour une seule
//   périodicité (éducateur : ses outils ; club : son forfait selon ses équipes).
//   Crée une session Stripe Checkout et rend son adresse. Les outils s'activent
//   à la réception du paiement par le webhook `stripe-webhook-outils`, jamais ici.
// - `verifier-prix` : réservée aux administrateurs. Contrôle que chaque prix du
//   catalogue existe dans Stripe (clé de recherche, montant, période). Utilise
//   STRIPE_OUTILS_SECRET_KEY, ou à défaut STRIPE_SECRET_KEY (clé live de la plateforme).
//
// Les écritures passent ici (clé service) : le navigateur ne peut pas écrire
// dans outils_comptes. Identité = jeton Supabase vérifié côté serveur, jamais un
// identifiant envoyé par le navigateur.

const JOUR_MS = 86400000

const ACTIONS = ['essai', 'choisir_club', 'payer', 'verifier-prix']

// Adresse de retour après Stripe : l'origine de la page si elle est connue,
// sinon le site de production.
const ORIGINE_PAR_DEFAUT = 'https://digitalfootball.academy'
const ORIGINES = /^(https:\/\/(www\.)?digitalfootball\.academy|https:\/\/digital-football-[a-z0-9-]+\.vercel\.app|http:\/\/localhost:\d+)$/
export const origineRetour = (origine) => (typeof origine === 'string' && ORIGINES.test(origine) ? origine : ORIGINE_PAR_DEFAUT)

// Abonnement des outils déjà en cours : le premier paiement n'en crée pas un second.
const STATUTS_EN_COURS = ['active', 'trialing', 'past_due', 'unpaid']

function stripeOutils() {
  // Clé dédiée si elle existe, sinon la clé Stripe déjà utilisée par la plateforme.
  const cle = process.env.STRIPE_OUTILS_SECRET_KEY || process.env.STRIPE_SECRET_KEY
  if (!cle) throw new Error('config_stripe_absente')
  return new Stripe(cle)
}

export function donneesOutils() {
  const db = () => clientServiceSupabase()
  const lire = async (requete) => {
    const { data, error } = await requete
    if (error) throw error
    return data
  }
  return {
    profil: (id) => lire(db().from('profiles').select('plan, modele_outils, abonnement_actif, email').eq('id', id).maybeSingle()),
    nbEquipes: async (clubId) => {
      const { count, error } = await db().from('club_categories').select('id', { count: 'exact', head: true }).eq('club_id', clubId)
      if (error) throw error
      return count || 0
    },
    ligne: (compte, outil) => lire(db().from('outils_comptes').select('source, fin_le').eq('compte_id', compte).eq('outil', outil).maybeSingle()),
    // Faux si l'essai de cet outil a déjà servi (clé primaire déjà prise).
    marquerEssai: async (compte, outil) => {
      const { error } = await db().from('outils_essais_utilises').insert({ compte_id: compte, outil })
      if (!error) return true
      if (error.code === '23505') return false
      throw error
    },
    oublierEssai: async (compte, outil) => {
      await db().from('outils_essais_utilises').delete().eq('compte_id', compte).eq('outil', outil)
    },
    poserLigne: async (ligne) => {
      const { error } = await db().from('outils_comptes').upsert(
        { ...ligne, maj_le: new Date().toISOString() }, { onConflict: 'compte_id,outil' },
      )
      if (error) throw error
    },
    supprimerLigne: async (compte, outil) => {
      const { error } = await db().from('outils_comptes').delete().eq('compte_id', compte).eq('outil', outil)
      if (error) throw error
    },
    estAdmin: async (id) => !!(await lire(db().from('admins_coach').select('user_id').eq('user_id', id).maybeSingle())),
    // Prix actifs de Stripe pour ces clés de recherche (10 clés par appel au maximum).
    prixStripe: async (cles) => {
      const stripe = stripeOutils()
      const trouves = []
      for (let i = 0; i < cles.length; i += 10) {
        const { data } = await stripe.prices.list({ lookup_keys: cles.slice(i, i + 10), active: true, limit: 10 })
        trouves.push(...data)
      }
      return trouves.map(p => ({ id: p.id, cle: p.lookup_key, montant: p.unit_amount, devise: p.currency, intervalle: p.recurring?.interval, live: p.livemode }))
    },
    // Un seul client Stripe par compte, retrouvé par son identifiant de compte.
    // La clé d'idempotence évite d'en créer deux sur un double clic.
    clientStripe: async ({ compteId, email }) => {
      const stripe = stripeOutils()
      const { data } = await stripe.customers.search({ query: `metadata['compte_id']:'${compteId}'`, limit: 1 })
      if (data[0]) return data[0].id
      const client = await stripe.customers.create(
        { ...(email ? { email } : {}), metadata: { compte_id: compteId, offre: 'outils' } },
        { idempotencyKey: `outils-client-${compteId}` },
      )
      return client.id
    },
    abonnementEnCours: async (client) => {
      const { data } = await stripeOutils().subscriptions.list({ customer: client, status: 'all', limit: 100 })
      return data.some(s => s.metadata?.offre === 'outils' && STATUTS_EN_COURS.includes(s.status))
    },
    creerSessionPaiement: async (params) => {
      const session = await stripeOutils().checkout.sessions.create(params)
      return { url: session.url }
    },
  }
}

const actifMaintenant = (ligne, maintenant) => !!ligne && (!ligne.fin_le || new Date(ligne.fin_le).getTime() > maintenant)

export function creerHandler({ verifierJeton, donnees, maintenant = () => Date.now() }) {
  return async function handler(req, res) {
    const utilisateur = await authentifier(req, res, verifierJeton)
    if (!utilisateur) return

    const corps = req.body || {}
    const action = corps.action
    if (!ACTIONS.includes(action)) return res.status(400).json({ error: 'Action inconnue' })
    const idOutil = typeof corps.outil === 'string' ? corps.outil : ''

    try {
      if (action === 'verifier-prix') {
        if (!(await donnees.estAdmin(utilisateur.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' })
        const attendus = lignesStripe()
        try {
          const trouves = await donnees.prixStripe(attendus.map(l => l.cle))
          return res.status(200).json(comparerPrix(attendus, trouves))
        } catch (err) {
          if (err.message === 'config_stripe_absente') return res.status(503).json({ error: 'Clé Stripe absente côté Vercel (STRIPE_SECRET_KEY)' })
          throw err
        }
      }

      const profil = await donnees.profil(utilisateur.id)
      if (!profil?.modele_outils) return res.status(403).json({ error: 'Ce compte n\'utilise pas encore les outils à la carte' })
      const maintenantMs = maintenant()

      if (action === 'essai') {
        if (profil.plan !== 'educateur') return res.status(403).json({ error: 'L\'essai gratuit est réservé aux éducateurs' })
        const outil = trouverOutil('educateur', idOutil)
        if (!outil || !outil.achetable) return res.status(400).json({ error: 'Outil inconnu ou non disponible à l\'essai' })
        if (actifMaintenant(await donnees.ligne(utilisateur.id, outil.id), maintenantMs)) {
          return res.status(409).json({ error: 'Cet outil est déjà actif sur ton compte' })
        }
        if (!(await donnees.marquerEssai(utilisateur.id, outil.id))) {
          return res.status(409).json({ error: 'Tu as déjà utilisé l\'essai gratuit de cet outil' })
        }
        const finLe = new Date(maintenantMs + ESSAI_JOURS * JOUR_MS).toISOString()
        try {
          await donnees.poserLigne({ compte_id: utilisateur.id, outil: outil.id, source: 'essai', fin_le: finLe })
        } catch (err) {
          // L'essai n'a pas démarré : on le rend à l'utilisateur.
          await donnees.oublierEssai(utilisateur.id, outil.id).catch(() => {})
          throw err
        }
        return res.status(200).json({ ok: true, fin_le: finLe })
      }

      if (action === 'payer') {
        const role = profil.plan
        if (role !== 'educateur' && role !== 'club') return res.status(403).json({ error: 'Paiement réservé aux éducateurs et aux clubs' })
        const nbEquipes = role === 'club' ? await donnees.nbEquipes(utilisateur.id) : 0
        const compo = compositionPaiement(role, { outils: corps.outils, palier: corps.palier, periodicite: corps.periodicite }, nbEquipes)
        if (compo.erreur) return res.status(400).json({ error: compo.erreur })
        if (role === 'educateur') {
          for (const id of compo.outils) {
            const ligne = await donnees.ligne(utilisateur.id, id)
            if (ligne?.source === 'achat' && actifMaintenant(ligne, maintenantMs)) {
              return res.status(409).json({ error: 'Un des outils choisis est déjà payé' })
            }
          }
        }
        try {
          // Garde-fou : le montant de chaque prix Stripe doit être celui du catalogue.
          const attendus = new Map(lignesStripe().map(l => [l.cle, l.montant]))
          const prix = new Map((await donnees.prixStripe(compo.cles)).map(p => [p.cle, p]))
          if (compo.cles.some(c => prix.get(c)?.montant !== attendus.get(c))) {
            console.error('outils payer : prix Stripe absent ou différent du catalogue', compo.cles)
            return res.status(503).json({ error: 'Paiement indisponible pour le moment, réessaie plus tard' })
          }
          const client = await donnees.clientStripe({ compteId: utilisateur.id, email: profil.email })
          if (await donnees.abonnementEnCours(client)) {
            return res.status(409).json({ error: 'Tu as déjà un abonnement en cours. L\'ajout d\'outils à cet abonnement arrive bientôt.' })
          }
          const base = origineRetour(req.headers?.origin)
          const page = role === 'club' ? '/club' : '/educateur'
          const meta = { offre: 'outils', compte_id: utilisateur.id, role }
          const session = await donnees.creerSessionPaiement({
            mode: 'subscription',
            customer: client,
            client_reference_id: utilisateur.id,
            line_items: compo.cles.map(c => ({ price: prix.get(c).id, quantity: 1 })),
            metadata: meta,
            subscription_data: { metadata: meta },
            locale: 'fr',
            success_url: `${base}${page}?outils=paye`,
            cancel_url: `${base}${page}?outils=annule`,
          })
          return res.status(200).json({ url: session.url })
        } catch (err) {
          if (err.message === 'config_stripe_absente') return res.status(503).json({ error: 'Paiement indisponible pour le moment, réessaie plus tard' })
          throw err
        }
      }

      // choisir_club
      if (profil.plan !== 'club') return res.status(403).json({ error: 'Seul le compte du club choisit les outils du club' })
      if (!profil.abonnement_actif) return res.status(403).json({ error: 'L\'abonnement du club n\'est pas actif' })
      const outil = trouverOutil('club', idOutil)
      if (!outil) return res.status(400).json({ error: 'Outil inconnu' })
      if (typeof corps.actif !== 'boolean') return res.status(400).json({ error: 'Choix manquant' })
      const ligne = await donnees.ligne(utilisateur.id, outil.id)
      if (corps.actif) {
        if (!ligne) await donnees.poserLigne({ compte_id: utilisateur.id, outil: outil.id, source: 'forfait', fin_le: null })
      } else if (ligne?.source === 'forfait') {
        await donnees.supprimerLigne(utilisateur.id, outil.id)
      }
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('outils', action, err.message)
      return res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant' })
    }
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, donnees: donneesOutils() })
