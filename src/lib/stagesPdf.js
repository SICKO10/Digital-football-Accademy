import { formatDate, formatJourCourt } from './stages'

// Autorisation parentale pré-remplie (module Stages, étape 3), générée dans
// le navigateur avec jsPDF (déjà utilisé ailleurs dans le projet), chargé à
// la demande pour ne pas alourdir les pages.
// Polices standard jsPDF : jeu Latin-1 (accents français OK) — on évite les
// caractères hors de ce jeu (apostrophe typographique, tirets longs…).

const nettoyer = (s) => String(s ?? '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')

export async function telechargerAutorisationParentale({ stage, enfant, jours, contact, sante, reference }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marge = 18
  const largeur = 210 - marge * 2
  let y = 20

  const texte = (t, { taille = 10.5, gras = false, couleur = 20, espace = 1.5 } = {}) => {
    doc.setFont('helvetica', gras ? 'bold' : 'normal')
    doc.setFontSize(taille)
    doc.setTextColor(couleur)
    const lignes = doc.splitTextToSize(nettoyer(t), largeur)
    doc.text(lignes, marge, y)
    y += lignes.length * taille * 0.42 + espace
  }
  const case_ = (t) => {
    doc.setDrawColor(60)
    doc.rect(marge, y - 3.2, 3.6, 3.6)
    const sauve = marge
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(20)
    const lignes = doc.splitTextToSize(nettoyer(t), largeur - 7)
    doc.text(lignes, sauve + 6, y)
    y += lignes.length * 4.4 + 2.5
  }
  const ligneSaisie = (libelle) => {
    texte(libelle, { espace: 0 })
    doc.setDrawColor(150)
    doc.line(marge + doc.getTextWidth(nettoyer(libelle)) + 2, y - 1.6, marge + largeur, y - 1.6)
    y += 5
  }

  const periode = stage.date_debut === stage.date_fin
    ? formatDate(stage.date_debut, { day: 'numeric', month: 'long', year: 'numeric' })
    : `du ${formatDate(stage.date_debut, { day: 'numeric', month: 'long' })} au ${formatDate(stage.date_fin, { day: 'numeric', month: 'long', year: 'numeric' })}`
  const naissance = enfant.date_naissance ? formatDate(enfant.date_naissance, { day: 'numeric', month: 'long', year: 'numeric' }) : '____________________'

  texte(stage.club_nom || 'Club', { taille: 10, couleur: 110, espace: 3 })
  texte('AUTORISATION PARENTALE', { taille: 17, gras: true, espace: 1 })
  texte(`Stage « ${stage.nom} » - ${periode}${stage.lieu ? ` - ${stage.lieu}` : ''}`, { taille: 11, couleur: 60, espace: 6 })

  ligneSaisie('Je soussigné(e), nom et prénom du responsable légal : ')
  texte(`responsable légal de l'enfant ${enfant.prenom} ${enfant.nom}, né(e) le ${naissance},`, { espace: 1 })
  texte(`autorise mon enfant à participer au stage « ${stage.nom} » organisé par ${stage.club_nom || 'le club'} ${periode}, les jours suivants : ${(jours || []).map(j => formatJourCourt(j)).join(', ').replace(/\.$/, '')}.`, { espace: 5 })

  texte('Cocher les cases :', { gras: true, espace: 2.5 })
  case_("J'autorise les responsables du stage à prendre toutes les mesures nécessaires en cas d'urgence (appel des secours, hospitalisation, intervention médicale) et je m'engage à rembourser les éventuels frais engagés.")
  case_("J'autorise mon enfant à être transporté (minibus, véhicule des encadrants, transports en commun) pour les déplacements prévus au programme du stage.")
  case_("J'autorise la prise et la diffusion de photos ou vidéos de mon enfant dans le cadre du stage (site, réseaux sociaux et supports du club).")
  case_("Mon enfant peut repartir seul à la fin de la journée. Sinon, personnes autorisées à le récupérer :")
  ligneSaisie('Nom(s) et téléphone(s) : ')
  y += 2

  texte('Contact en cas d\'urgence', { gras: true, espace: 1.5 })
  texte(`Téléphone : ${contact?.tel_parent || '____________________'}${contact?.email_parent ? `    E-mail : ${contact.email_parent}` : ''}`, { espace: 4 })

  texte('Informations médicales signalées à l\'inscription', { gras: true, espace: 1.5 })
  const infos = [
    sante?.allergies && `Allergies : ${sante.allergies}`,
    sante?.medicaments && `Médicaments : ${sante.medicaments}`,
    sante?.notes_medicales && `Autres informations : ${sante.notes_medicales}`,
  ].filter(Boolean)
  texte(infos.length ? infos.join('\n') : 'Aucune information signalée.', { espace: 2 })
  texte('En cas de PAI ou de traitement, joindre le document et les médicaments à remettre aux encadrants.', { taille: 9, couleur: 100, espace: 6 })

  ligneSaisie('Fait à : ')
  ligneSaisie('Le : ')
  texte('Signature du responsable légal (précédée de la mention « Lu et approuvé ») :', { espace: 22 })

  doc.setFontSize(8.5)
  doc.setTextColor(140)
  doc.text(nettoyer(`Référence d'inscription : ${reference || '-'}  ·  Document généré avec Digital Football`), marge, 287)

  const nomFichier = `autorisation-${enfant.prenom}-${enfant.nom}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  doc.save(`${nomFichier}.pdf`)
}
