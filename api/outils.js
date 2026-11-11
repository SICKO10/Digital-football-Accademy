/* global process */
import { verifierJetonSupabase, clientServiceSupabase, authentifier } from './_securite.js'
import Stripe from 'stripe'
import { lireOffre, planOffre, notificationOffre } from '../src/lib/offresOutils.js'
import { trouverOutil, outilEducateurPour, ESSAI_JOURS, ESSAIS_GRATUITS, lignesStripe, comparerPrix, compositionPaiement, planModification, tarifParCle, clePourPeriodicite, PERIODICITES } from '../src/lib/catalogueOutils.js'

// Outils à la carte : une seule fonction serveur, plusieurs actions (l'offre
// gratuite Vercel limite le nombre de fonctions).
//
// - `composer` (bloc 11) : à la fin de l'inscription composée (`/register?composer=1`),
//   le compte tout neuf passe au nouveau modèle (`modele_outils`, que le navigateur ne
//   peut pas écrire). Éducateur : son accès gratuit (le socle) s'ouvre tout de suite,
//   ses outils payants viennent ensuite par `payer`. Club : les outils choisis sont
//   posés (inclus au forfait), l'accès s'ouvre au paiement du forfait. Refusé pour un
//   compte qui a déjà eu un abonnement.
// - `essai` : un éducateur du nouveau modèle lance l'essai gratuit de 14 jours
//   d'un outil, une seule fois par outil. Sans carte bancaire.
// - `choisir_club` : un club du nouveau modèle ajoute ou retire un de ses outils.
//   Les outils du club sont inclus dans son forfait (source `forfait`), sans prix.
// - `ouvrir_club` (bloc 10) : le club ouvre (ou ferme) un de ses outils à ses
//   éducateurs affiliés, qui le reçoivent sans payer. Fermer, ou retirer l'outil
//   du club, prévient ses éducateurs (table `notifications`) : ils le perdent
//   tout de suite, comme le club.
// - `payer` : premier paiement d'une composition, en une fois et pour une seule
//   périodicité (éducateur : ses outils ; club : son forfait selon ses équipes).
//   Crée une session Stripe Checkout et rend son adresse. Les outils s'activent
//   à la réception du paiement par le webhook `stripe-webhook-outils`, jamais ici.
// - `abonnement` : état de l'abonnement des outils lu chez Stripe (tarif,
//   échéance, résiliation prévue, paiement en retard), pour l'écran Mes outils.
// - `modifier` (bloc 8) : change les outils de l'éducateur ou le forfait du club
//   sur l'abonnement en cours, même périodicité. Palier ou forfait supérieur :
//   la différence est facturée tout de suite et rien ne change si elle n'est pas
//   payée ; inférieur : le nouveau prix s'applique à l'échéance, sans
//   remboursement. Les outils s'activent ou s'éteignent par le webhook.
// - `resilier` / `reprendre` : fin de l'abonnement à l'échéance, ou annulation
//   de cette fin tant qu'elle n'est pas arrivée.
// - `periodicite` (bloc 9) : passer de mensuel à annuel, ou l'inverse, à la
//   prochaine échéance, avec les mêmes outils. Échéancier Stripe à deux phases
//   (le tarif actuel jusqu'à l'échéance, puis l'autre périodicité) ; `annuler`
//   supprime le changement programmé. Pendant qu'un changement est programmé,
//   `modifier` le refait sur le nouveau tarif et `resilier` l'annule.
// - `offrir` (bloc 12) : réservée aux administrateurs. Offre un outil pour une durée
//   choisie à un compte (par son adresse email) ou à tous les comptes d'un rôle
//   (`cible: 'groupe'`), limités aux comptes du nouveau modèle. Ignore la règle « un
//   essai par outil » (l'essai gratuit n'est pas marqué utilisé). Un compte qui a déjà
//   l'outil pour au moins aussi longtemps est laissé tel quel. `apercu: true` compte
//   sans rien écrire ; un envoi à un groupe exige `confirme: true` et `attendu` (le
//   nombre vu à l'aperçu). Les comptes reçoivent une notification dans la cloche.
// - `portail` : adresse du portail client Stripe (carte bancaire, factures).
// - `verifier-prix` : réservée aux administrateurs. Contrôle que chaque prix du
//   catalogue existe dans Stripe (clé de recherche, montant, période). Utilise
//   STRIPE_OUTILS_SECRET_KEY, ou à défaut STRIPE_SECRET_KEY (clé live de la plateforme).
//
// Les écritures passent ici (clé service) : le navigateur ne peut pas écrire
// dans outils_comptes. Identité = jeton Supabase vérifié côté serveur, jamais un
// identifiant envoyé par le navigateur.

const JOUR_MS = 86400000

const ACTIONS = ['composer', 'essai', 'choisir_club', 'ouvrir_club', 'payer', 'abonnement', 'modifier', 'resilier', 'reprendre', 'periodicite', 'portail', 'verifier-prix', 'offrir']
const ACTIONS_ABONNEMENT = ['abonnement', 'modifier', 'resilier', 'reprendre', 'periodicite', 'portail']

// Adresse de retour après Stripe : l'origine de la page si elle est connue,
// sinon le site de production.
const ORIGINE_PAR_DEFAUT = 'https://digitalfootball.academy'
const ORIGINES = /^(https:\/\/(www\.)?digitalfootball\.academy|https:\/\/digital-football-[a-z0-9-]+\.vercel\.app|http:\/\/localhost:\d+)$/
export const origineRetour = (origine) => (typeof origine === 'string' && ORIGINES.test(origine) ? origine : ORIGINE_PAR_DEFAUT)

// Abonnement des outils déjà en cours : le premier paiement n'en crée pas un second.
const STATUTS_EN_COURS = ['active', 'trialing', 'past_due', 'unpaid']

// Abonnement Stripe réduit à ce dont les actions ont besoin. La fin de période
// est sur l'abonnement (anciennes versions d'API) ou sur ses lignes (récentes).
export function normaliserAbonnement(s) {
  const items = s.items?.data || []
  const fin = s.current_period_end ?? items[0]?.current_period_end
  return {
    id: s.id,
    statut: s.status,
    metadata: s.metadata || {},
    items: items.map(i => ({ id: i.id, cle: i.price?.lookup_key || null })),
    finPeriode: fin ? new Date(fin * 1000).toISOString() : null,
    resiliation: !!s.cancel_at_period_end || !!s.cancel_at,
    echeancier: (typeof s.schedule === 'string' ? s.schedule : s.schedule?.id) || null,
  }
}

// Échéancier Stripe réduit : phases (début, fin en secondes, clés de recherche
// des tarifs) et marque `offre: outils` posée par l'action `periodicite`.
export function normaliserEcheancier(e) {
  return {
    id: e.id,
    nous: e.metadata?.offre === 'outils',
    phases: (e.phases || []).map(p => ({ debut: p.start_date, fin: p.end_date, cles: (p.items || []).map(i => i.price?.lookup_key || null) })),
  }
}

// Changement programmé : la première phase qui n'a pas encore commencé.
// Rend { cle, periodicite, date } ou null.
export function changementProgramme(echeancier, maintenantMs) {
  const p = echeancier?.phases.find(x => x.debut * 1000 > maintenantMs)
  const t = p ? tarifParCle(p.cles[0]) : null
  return t ? { cle: p.cles[0], periodicite: t.periodicite, date: new Date(p.debut * 1000).toISOString() } : null
}

// Phases de l'échéancier : la phase en cours telle que Stripe l'a créée depuis
// l'abonnement (mêmes tarifs, mêmes réductions, jusqu'à l'échéance), puis une
// période du nouveau tarif ; ensuite l'abonnement continue seul sur ce tarif.
// Les métadonnées de l'abonnement (outils choisis) sont reprises sur les deux phases.
export function phasesPeriodicite(phase, prixId, periodicite, metadata) {
  const reductions = (phase.discounts || []).map(d => {
    const ref = (x) => (typeof x === 'string' ? x : x?.id)
    if (d.discount) return { discount: ref(d.discount) }
    if (d.promotion_code) return { promotion_code: ref(d.promotion_code) }
    return { coupon: ref(d.coupon) }
  })
  const commun = { metadata, proration_behavior: 'none', ...(reductions.length ? { discounts: reductions } : {}) }
  return [
    {
      ...commun,
      items: phase.items.map(i => ({ price: typeof i.price === 'string' ? i.price : i.price.id, quantity: i.quantity ?? 1 })),
      start_date: phase.start_date,
      end_date: phase.end_date,
    },
    {
      ...commun,
      items: [{ price: prixId, quantity: 1 }],
      duration: { interval: periodicite === 'annuel' ? 'year' : 'month', interval_count: 1 },
    },
  ]
}


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
    profil: (id) => lire(db().from('profiles').select('plan, modele_outils, abonnement_actif, abonnement_debut, email').eq('id', id).maybeSingle()),
    // Passe un compte neuf au nouveau modèle ; l'éducateur obtient en plus l'accès gratuit au socle.
    activerModele: async (id, { ouvrirAcces }) => {
      const { error } = await db().from('profiles').update({ modele_outils: true, ...(ouvrirAcces ? { abonnement_actif: true } : {}) }).eq('id', id)
      if (error) throw error
    },
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
    // Outils du club ouverts à ses éducateurs (bloc 10).
    ouvert: async (club, outil) => !!(await lire(db().from('outils_club_ouverts').select('outil').eq('club_id', club).eq('outil', outil).maybeSingle())),
    ouvrirOutil: async (club, outil) => {
      const { error } = await db().from('outils_club_ouverts').upsert({ club_id: club, outil }, { onConflict: 'club_id,outil' })
      if (error) throw error
    },
    fermerOutil: async (club, outil) => {
      const { error } = await db().from('outils_club_ouverts').delete().eq('club_id', club).eq('outil', outil)
      if (error) throw error
    },
    // Éducateurs affiliés acceptés du club, au nouveau modèle (les autres ne voient pas les outils).
    educateursDuClub: async (club) => {
      const lies = await lire(db().from('club_educateurs').select('educateur_id').eq('club_id', club).eq('statut', 'accepte'))
      const ids = [...new Set((lies || []).map(l => l.educateur_id).filter(Boolean))]
      if (ids.length === 0) return []
      const profils = await lire(db().from('profiles').select('id').in('id', ids).eq('modele_outils', true))
      return (profils || []).map(p => p.id)
    },
    // Notifications de la cloche (table `notifications`) : { user_id, type, titre, contenu, lien }.
    notifier: async (lignes) => {
      const { error } = await db().from('notifications').insert(lignes)
      if (error) throw error
    },
    // Offres de l'administrateur (bloc 12). Seuls les comptes du nouveau modèle sont visés.
    compteParEmail: (email) => lire(db().from('profiles').select('id, plan, modele_outils, abonnement_actif').ilike('email', email).limit(1).maybeSingle()),
    comptesDuRole: async (role) => {
      const comptes = []
      for (let debut = 0; ; debut += 1000) {
        const page = await lire(db().from('profiles').select('id, abonnement_actif').eq('plan', role).eq('modele_outils', true).order('id').range(debut, debut + 999))
        comptes.push(...(page || []))
        if (!page || page.length < 1000) return comptes
      }
    },
    lignesOutil: async (ids, outil) => {
      const lignes = []
      for (let i = 0; i < ids.length; i += 200) {
        lignes.push(...(await lire(db().from('outils_comptes').select('compte_id, source, fin_le').eq('outil', outil).in('compte_id', ids.slice(i, i + 200))) || []))
      }
      return lignes
    },
    poserOffres: async (lignes) => {
      for (let i = 0; i < lignes.length; i += 200) {
        const { error } = await db().from('outils_comptes').upsert(lignes.slice(i, i + 200), { onConflict: 'compte_id,outil' })
        if (error) throw error
      }
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
    // Client Stripe du compte, sans en créer (null s'il n'a jamais payé).
    trouverClient: async (compteId) => {
      const { data } = await stripeOutils().customers.search({ query: `metadata['compte_id']:'${compteId}'`, limit: 1 })
      return data[0]?.id || null
    },
    abonnementOutils: async (client) => {
      const { data } = await stripeOutils().subscriptions.list({ customer: client, status: 'all', limit: 100 })
      const s = data.find(a => a.metadata?.offre === 'outils' && STATUTS_EN_COURS.includes(a.status))
      return s ? normaliserAbonnement(s) : null
    },
    modifierAbonnement: async (id, params) => { await stripeOutils().subscriptions.update(id, params) },
    lireEcheancier: async (id) => normaliserEcheancier(await stripeOutils().subscriptionSchedules.retrieve(id, { expand: ['phases.items.price'] })),
    // Échéancier créé depuis l'abonnement puis complété d'une seconde phase.
    // S'il ne peut pas être complété, il est retiré : l'abonnement reste tel quel.
    programmerEcheancier: async ({ abonnementId, compteId, prixId, periodicite, metadata }) => {
      const stripe = stripeOutils()
      const e = await stripe.subscriptionSchedules.create({ from_subscription: abonnementId })
      try {
        await stripe.subscriptionSchedules.update(e.id, {
          end_behavior: 'release',
          proration_behavior: 'none',
          metadata: { offre: 'outils', compte_id: compteId },
          phases: phasesPeriodicite(e.phases[0], prixId, periodicite, metadata),
        })
      } catch (err) {
        await stripe.subscriptionSchedules.release(e.id).catch(() => {})
        throw err
      }
    },
    // L'abonnement quitte l'échéancier et garde son tarif actuel.
    libererEcheancier: async (id) => { await stripeOutils().subscriptionSchedules.release(id) },
    sessionPortail: async (params) => {
      const session = await stripeOutils().billingPortal.sessions.create(params)
      return { url: session.url }
    },
    creerSessionPaiement: async (params) => {
      const session = await stripeOutils().checkout.sessions.create(params)
      return { url: session.url }
    },
  }
}

const actifMaintenant = (ligne, maintenant) => !!ligne && (!ligne.fin_le || new Date(ligne.fin_le).getTime() > maintenant)

export function creerHandler({ verifierJeton, donnees, maintenant = () => Date.now(), essaisGratuits = ESSAIS_GRATUITS }) {
  // Actions sur l'abonnement en cours (bloc 8). Rien n'est écrit dans la base
  // ici : le webhook applique ce que Stripe a réellement enregistré.
  async function gererAbonnement({ action, role, corps, compteId, req, res }) {
    const page = role === 'club' ? '/club' : '/educateur'
    const client = await donnees.trouverClient(compteId)
    if (action === 'portail') {
      if (!client) return res.status(404).json({ error: 'Aucun abonnement à gérer pour le moment' })
      const { url } = await donnees.sessionPortail({ customer: client, locale: 'fr', return_url: `${origineRetour(req.headers?.origin)}${page}?outils=portail` })
      return res.status(200).json({ url })
    }
    const abo = client ? await donnees.abonnementOutils(client) : null
    const nbEquipes = role === 'club' ? await donnees.nbEquipes(compteId) : 0
    // Changement de périodicité programmé (bloc 9), lu sur l'échéancier de l'abonnement.
    const ech = abo?.echeancier ? await donnees.lireEcheancier(abo.echeancier) : null
    const changement = ech?.nous ? changementProgramme(ech, maintenant()) : null
    if (action === 'abonnement') {
      if (!abo) return res.status(200).json({ abonnement: null, nbEquipes })
      const { statut, finPeriode, resiliation } = abo
      const outils = String(abo.metadata.outils || '').split(',').filter(Boolean)
      return res.status(200).json({ abonnement: { statut, finPeriode, resiliation, cle: abo.items[0]?.cle || null, outils, changement }, nbEquipes })
    }
    if (!abo) return res.status(404).json({ error: 'Aucun abonnement en cours' })
    // Échéancier posé à la main dans Stripe : on n'y touche pas d'ici.
    if (ech && !ech.nous) return res.status(409).json({ error: 'Ton abonnement ne peut pas être modifié ici : écris-nous' })

    // Garde-fou : le montant du tarif Stripe doit être celui du catalogue.
    const prixVerifie = async (cle) => {
      const attendu = lignesStripe().find(l => l.cle === cle)?.montant
      const [prix] = await donnees.prixStripe([cle])
      if (prix && prix.montant === attendu) return prix
      console.error(`outils ${action} : prix Stripe absent ou différent du catalogue`, cle)
      return null
    }
    const indisponible = (cle) => {
      console.error('outils abonnement : prix Stripe absent ou différent du catalogue', cle)
      return res.status(503).json({ error: 'Changement indisponible pour le moment, réessaie plus tard (code : prix)' })
    }
    const programmer = (prixId, periodicite, metadata) => donnees.programmerEcheancier({ abonnementId: abo.id, compteId, prixId, periodicite, metadata })

    if (action === 'resilier' || action === 'reprendre') {
      const resilier = action === 'resilier'
      if (abo.resiliation === resilier) {
        return res.status(409).json({ error: resilier ? 'Ton abonnement est déjà résilié' : 'Ton abonnement n\'est pas résilié' })
      }
      // L'abonnement s'arrête à l'échéance : le changement de périodicité prévu n'a plus lieu d'être.
      if (resilier && ech) await donnees.libererEcheancier(ech.id)
      await donnees.modifierAbonnement(abo.id, { cancel_at_period_end: resilier })
      return res.status(200).json({ ok: true, fin_le: abo.finPeriode })
    }

    const [item] = abo.items
    if (action === 'periodicite') {
      if (corps.annuler === true) {
        if (!changement) return res.status(409).json({ error: 'Aucun changement de périodicité n\'est programmé' })
        await donnees.libererEcheancier(ech.id)
        return res.status(200).json({ ok: true })
      }
      if (!PERIODICITES.includes(corps.periodicite)) return res.status(400).json({ error: 'Choisis le paiement mensuel ou annuel' })
      if (changement) return res.status(409).json({ error: 'Un changement de périodicité est déjà programmé : annule-le d\'abord' })
      if (abo.resiliation) return res.status(409).json({ error: 'Ton abonnement est résilié : reprends-le avant de changer de périodicité' })
      if (abo.statut !== 'active') return res.status(409).json({ error: 'Ton dernier paiement n\'est pas passé : mets à jour ta carte dans « Factures et carte » avant de changer de périodicité' })
      const tarif = abo.items.length === 1 ? tarifParCle(item.cle) : null
      if (!tarif || ech) return res.status(409).json({ error: 'Ton abonnement ne peut pas être modifié ici : écris-nous' })
      if (tarif.periodicite === corps.periodicite) return res.status(400).json({ error: `Tu paies déjà en ${corps.periodicite}` })
      const cle = clePourPeriodicite(item.cle, corps.periodicite)
      const prix = await prixVerifie(cle)
      if (!prix) return indisponible(cle)
      await programmer(prix.id, corps.periodicite, abo.metadata)
      return res.status(200).json({ ok: true, cle, total: tarifParCle(cle).prix, date: abo.finPeriode })
    }

    // modifier
    if (abo.resiliation) return res.status(409).json({ error: 'Ton abonnement est résilié : reprends-le avant de changer d\'offre' })
    if (abo.statut !== 'active') return res.status(409).json({ error: 'Ton dernier paiement n\'est pas passé : mets à jour ta carte dans « Factures et carte » avant de changer d\'offre' })
    if (abo.items.length !== 1) return res.status(409).json({ error: 'Ton abonnement ne peut pas être modifié ici : écris-nous' })
    const outilsActuels = String(abo.metadata.outils || '').split(',').filter(Boolean)
    const plan = planModification(role, { cleActuelle: item.cle, outilsActuels }, { outils: corps.outils, pack: corps.pack === true, palier: corps.palier }, nbEquipes)
    if (plan.erreur) return res.status(400).json({ error: plan.erreur })

    const params = { proration_behavior: plan.sens === 'hausse' ? 'always_invoice' : 'none' }
    if (plan.cle !== item.cle) {
      const prix = await prixVerifie(plan.cle)
      if (!prix) return indisponible(plan.cle)
      params.items = [{ id: item.id, price: prix.id }]
    }
    // Changement de périodicité programmé : il suit la nouvelle offre (même palier ou forfait, autre périodicité).
    const cleSuite = changement && clePourPeriodicite(plan.cle, changement.periodicite)
    const prixSuite = cleSuite ? await prixVerifie(cleSuite) : null
    if (cleSuite && !prixSuite) return indisponible(cleSuite)
    // La différence est payée avec la carte enregistrée ; si elle est refusée, Stripe ne change rien.
    if (plan.sens === 'hausse') params.payment_behavior = 'error_if_incomplete'
    if (role === 'educateur') params.metadata = { outils: plan.outils.join(',') }

    // L'abonnement quitte l'échéancier le temps du changement, puis il est reprogrammé.
    if (ech) await donnees.libererEcheancier(ech.id)
    try {
      await donnees.modifierAbonnement(abo.id, params)
    } catch (err) {
      // Rien n'a changé : le changement de périodicité est remis tel qu'il était.
      if (changement) {
        const prix = await prixVerifie(changement.cle).catch(() => null)
        if (prix) await programmer(prix.id, changement.periodicite, abo.metadata).catch(e => console.error('outils modifier : changement de périodicité non remis', e.message))
      }
      throw err
    }
    let avertissement
    if (prixSuite) {
      try {
        await programmer(prixSuite.id, changement.periodicite, { ...abo.metadata, ...params.metadata })
      } catch (err) {
        console.error('outils modifier : changement de périodicité non reprogrammé', err.code || err.type, err.message)
        avertissement = `Ton passage au paiement ${changement.periodicite} n'a pas pu suivre ce changement : programme-le à nouveau.`
      }
    }
    return res.status(200).json({ ok: true, sens: plan.sens, total: plan.total, fin_le: abo.finPeriode, ...(avertissement ? { avertissement } : {}) })
  }

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

      if (action === 'offrir') {
        if (!(await donnees.estAdmin(utilisateur.id))) return res.status(403).json({ error: 'Réservé aux administrateurs' })
        const offre = lireOffre(corps)
        if (offre.erreur) return res.status(400).json({ error: offre.erreur })
        const groupe = corps.cible === 'groupe'
        let comptes
        if (groupe) {
          comptes = await donnees.comptesDuRole(offre.role)
        } else {
          const email = typeof corps.email === 'string' ? corps.email.trim() : ''
          if (!/^[^\s@%_]+@[^\s@%_]+\.[^\s@%_]+$/.test(email)) return res.status(400).json({ error: 'Adresse email invalide' })
          const compte = await donnees.compteParEmail(email)
          if (!compte) return res.status(404).json({ error: 'Aucun compte avec cette adresse' })
          if (compte.plan !== offre.role) return res.status(400).json({ error: `Ce compte n'est pas ${offre.role === 'club' ? 'un club' : 'un éducateur'}` })
          if (!compte.modele_outils) return res.status(400).json({ error: 'Ce compte n\'utilise pas encore les outils à la carte' })
          comptes = [compte]
        }
        const lignes = comptes.length > 0 ? await donnees.lignesOutil(comptes.map(c => c.id), offre.outil.id) : []
        const plan = planOffre({ role: offre.role, comptes, lignes, jours: offre.jours, maintenantMs: maintenant() })
        const bilan = { total: plan.total, a_offrir: plan.aOffrir.length, deja: plan.deja, sans_forfait: plan.sansForfait, fin_le: plan.finLe }
        if (corps.apercu === true) return res.status(200).json({ ok: true, apercu: true, ...bilan })
        if (groupe && (corps.confirme !== true || corps.attendu !== plan.aOffrir.length)) {
          return res.status(409).json({ error: 'Le nombre de comptes concernés a changé ou n\'a pas été confirmé : refais l\'aperçu' })
        }
        if (plan.aOffrir.length > 0) {
          await donnees.poserOffres(plan.aOffrir.map(id => ({
            compte_id: id, outil: offre.outil.id, source: 'offre', fin_le: plan.finLe,
            periodicite: null, stripe_subscription_id: null, stripe_item_id: null, maj_le: new Date(maintenant()).toISOString(),
          })))
        }
        // La notification est secondaire : l'offre est déjà posée, on compte ce qui est parti.
        let notifies = 0
        if (plan.aOffrir.length > 0) {
          try {
            const modele = notificationOffre({ role: offre.role, outil: offre.outil, jours: offre.jours, finLe: plan.finLe })
            await donnees.notifier(plan.aOffrir.map(id => ({ user_id: id, ...modele })))
            notifies = plan.aOffrir.length
          } catch (err) {
            console.error('outils offrir : notifications', err.message)
          }
        }
        return res.status(200).json({ ok: true, ...bilan, offerts: plan.aOffrir.length, notifies })
      }

      const profil = await donnees.profil(utilisateur.id)

      if (action === 'composer') {
        if (profil?.plan !== 'educateur' && profil?.plan !== 'club') return res.status(403).json({ error: 'Réservé aux éducateurs et aux clubs' })
        if (profil.modele_outils) return res.status(200).json({ ok: true })
        // Seul un compte qui n'a jamais eu d'abonnement peut passer au nouveau modèle de lui-même.
        if (profil.abonnement_actif || profil.abonnement_debut) return res.status(409).json({ error: 'Ce compte a déjà un abonnement' })
        const choisis = Array.isArray(corps.outils) ? corps.outils : []
        const outilsClub = profil.plan === 'club' ? choisis.map(o => trouverOutil('club', o)) : []
        if (outilsClub.some(o => !o) || new Set(choisis).size !== choisis.length) return res.status(400).json({ error: 'Outil inconnu ou en double' })
        await donnees.activerModele(utilisateur.id, { ouvrirAcces: profil.plan === 'educateur' })
        for (const o of outilsClub) await donnees.poserLigne({ compte_id: utilisateur.id, outil: o.id, source: 'forfait', fin_le: null })
        return res.status(200).json({ ok: true })
      }

      if (!profil?.modele_outils) return res.status(403).json({ error: 'Ce compte n\'utilise pas encore les outils à la carte' })
      const maintenantMs = maintenant()

      if (action === 'essai') {
        if (!essaisGratuits) return res.status(403).json({ error: 'Les essais gratuits sont suspendus pour le moment' })
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
        const compo = compositionPaiement(role, { outils: corps.outils, palier: corps.palier, pack: corps.pack === true, periodicite: corps.periodicite }, nbEquipes)
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
            const manquants = compo.cles.filter(c => !prix.has(c))
            const differents = compo.cles.filter(c => prix.has(c) && prix.get(c).montant !== attendus.get(c))
            const mode = prix.size === 0 ? 'aucun tarif trouvé' : [...prix.values()].some(p => p.live) ? 'réel' : 'test'
            console.error('outils payer : prix Stripe absent ou différent du catalogue', { manquants, differents, mode })
            return res.status(503).json({ error: 'Paiement indisponible pour le moment, réessaie plus tard (code : prix)' })
          }
          const client = await donnees.clientStripe({ compteId: utilisateur.id, email: profil.email })
          if (await donnees.abonnementEnCours(client)) {
            return res.status(409).json({ error: 'Tu as déjà un abonnement en cours : change ton offre depuis « Mon abonnement ».' })
          }
          const base = origineRetour(req.headers?.origin)
          const page = role === 'club' ? '/club' : '/educateur'
          // Les outils choisis voyagent avec le paiement : le webhook les active (palier jusqu'à 3 ou 6 outils).
          const meta = { offre: 'outils', compte_id: utilisateur.id, role, ...(role === 'educateur' ? { outils: compo.outils.join(',') } : {}) }
          const session = await donnees.creerSessionPaiement({
            mode: 'subscription',
            customer: client,
            client_reference_id: utilisateur.id,
            line_items: compo.cles.map(c => ({ price: prix.get(c).id, quantity: 1 })),
            metadata: meta,
            subscription_data: { metadata: meta },
            locale: 'fr',
            // Champ « code promo » sur la page de paiement : les codes sont créés dans Stripe par l'administrateur.
            allow_promotion_codes: true,
            success_url: `${base}${page}?outils=paye`,
            cancel_url: `${base}${page}?outils=annule`,
          })
          return res.status(200).json({ url: session.url })
        } catch (err) {
          if (err.message === 'config_stripe_absente') {
            console.error('outils payer : clé Stripe absente (STRIPE_OUTILS_SECRET_KEY et STRIPE_SECRET_KEY)')
            return res.status(503).json({ error: 'Paiement indisponible pour le moment, réessaie plus tard (code : cle_stripe)' })
          }
          console.error('outils payer', err.code || err.type, err.message)
          return res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant' })
        }
      }

      if (ACTIONS_ABONNEMENT.includes(action)) {
        const role = profil.plan
        if (role !== 'educateur' && role !== 'club') return res.status(403).json({ error: 'Réservé aux éducateurs et aux clubs' })
        try {
          return await gererAbonnement({ action, role, corps, compteId: utilisateur.id, req, res })
        } catch (err) {
          if (err.message === 'config_stripe_absente') return res.status(503).json({ error: 'Service indisponible pour le moment, réessaie plus tard (code : cle_stripe)' })
          // Paiement de la différence refusé : Stripe n'a rien changé (error_if_incomplete).
          if (err.type === 'StripeCardError' || err.statusCode === 402) {
            return res.status(402).json({ error: 'Le paiement de la différence n\'est pas passé, rien n\'a changé. Vérifie ta carte dans « Factures et carte ».' })
          }
          console.error('outils', action, err.code || err.type, err.message)
          return res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant' })
        }
      }

      // Les éducateurs affiliés perdent l'outil du club : ils sont prévenus, sans bloquer l'action du club.
      const prevenirRetrait = async (outilClub) => {
        const outilEdu = outilEducateurPour(outilClub.id)
        try {
          const ids = await donnees.educateursDuClub(utilisateur.id)
          const lignes = []
          for (const id of ids) {
            const propre = actifMaintenant(await donnees.ligne(id, outilEdu.id), maintenantMs)
            lignes.push({
              user_id: id,
              type: 'outil_club_retire',
              titre: 'Outil retiré par ton club',
              contenu: `Ton club ne te fournit plus l'outil ${outilEdu.nom} depuis aujourd'hui.${propre ? ' Tu le gardes grâce à ton propre abonnement.' : ''}`,
              lien: '/educateur',
            })
          }
          if (lignes.length > 0) await donnees.notifier(lignes)
        } catch (err) {
          console.error('outils : prévenir les éducateurs', err.message)
        }
      }

      if (action === 'ouvrir_club') {
        if (profil.plan !== 'club') return res.status(403).json({ error: 'Seul le compte du club choisit les outils de ses éducateurs' })
        if (!profil.abonnement_actif) return res.status(403).json({ error: 'L\'abonnement du club n\'est pas actif' })
        const outilClub = trouverOutil('club', idOutil)
        if (!outilClub || !outilEducateurPour(outilClub.id)) return res.status(400).json({ error: 'Cet outil ne peut pas être ouvert aux éducateurs' })
        if (typeof corps.ouvert !== 'boolean') return res.status(400).json({ error: 'Choix manquant' })
        if (corps.ouvert) {
          if (!actifMaintenant(await donnees.ligne(utilisateur.id, outilClub.id), maintenantMs)) {
            return res.status(409).json({ error: 'Active d\'abord cet outil sur le dashboard du club' })
          }
          await donnees.ouvrirOutil(utilisateur.id, outilClub.id)
        } else if (await donnees.ouvert(utilisateur.id, outilClub.id)) {
          await donnees.fermerOutil(utilisateur.id, outilClub.id)
          await prevenirRetrait(outilClub)
        }
        return res.status(200).json({ ok: true })
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
        // Un outil ouvert aux éducateurs est fermé avec lui : il faudra le rouvrir si le club le reprend.
        if (outilEducateurPour(outil.id) && await donnees.ouvert(utilisateur.id, outil.id)) {
          await donnees.fermerOutil(utilisateur.id, outil.id)
          await prevenirRetrait(outil)
        }
      }
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('outils', action, err.message)
      return res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant' })
    }
  }
}

export default creerHandler({ verifierJeton: verifierJetonSupabase, donnees: donneesOutils() })
