import { formatDate, formatJourCourt, elementsPlanningEncadrant } from './stages'

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

  const nomFichier = `autorisation-${enfant.prenom}-${enfant.nom}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
  doc.save(`${nomFichier}.pdf`)
}

// Planning PDF d'un ou plusieurs encadrants : une page (ou plus) par
// encadrant, jour par jour, heure par heure. Même contenu que l'onglet
// Organisation (elementsPlanningEncadrant).
export async function telechargerPlanningEncadrants({ stage, clubNom, encadrants, taches, creneaux }) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const marge = 16
  const largeur = 210 - marge * 2
  const basPage = 280

  encadrants.forEach((enc, index) => {
    if (index > 0) doc.addPage()
    let y = 18
    const nouvellePageSiBesoin = (hauteur) => { if (y + hauteur > basPage) { doc.addPage(); y = 18 } }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(120)
    doc.text(nettoyer(`${clubNom || 'Club'} · ${stage.nom}`), marge, y); y += 7
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(20)
    doc.text(nettoyer(`Planning de ${enc.nom}`), marge, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(70)
    const identite = [enc.role, enc.telephone].filter(Boolean).join(' · ')
    if (identite) { doc.text(nettoyer(identite), marge, y); y += 5 }
    doc.setDrawColor(200); doc.line(marge, y, marge + largeur, y); y += 7

    const elements = elementsPlanningEncadrant(enc, taches, creneaux)
    if (elements.length === 0) {
      doc.setFontSize(11); doc.setTextColor(110); doc.text('Rien de prévu pour cet encadrant.', marge, y)
      return
    }
    const parJour = elements.reduce((acc, e) => { const k = e.date || 'tout'; (acc[k] = acc[k] || []).push(e); return acc }, {})
    for (const [jour, liste] of Object.entries(parJour)) {
      nouvellePageSiBesoin(16)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20)
      const titreJour = jour === 'tout' ? 'Tout le stage' : formatDate(jour)
      doc.text(nettoyer(titreJour.charAt(0).toUpperCase() + titreJour.slice(1)), marge, y); y += 6
      for (const e of liste) {
        const horaire = e.debut ? `${e.debut.slice(0, 5)}${e.fin ? ` - ${e.fin.slice(0, 5)}` : ''}` : 'Sans horaire'
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5)
        const titre = doc.splitTextToSize(nettoyer(`${e.titre}  (${e.type})`), largeur - 34)
        const detail = e.detail ? doc.splitTextToSize(nettoyer(e.detail), largeur - 34) : []
        const hauteur = titre.length * 4.6 + detail.length * 4.2 + 3
        nouvellePageSiBesoin(hauteur)
        doc.setDrawColor(e.type === 'Tâche' ? 96 : 34, e.type === 'Tâche' ? 165 : 197, e.type === 'Tâche' ? 250 : 94)
        doc.setLineWidth(0.8); doc.line(marge, y - 3.6, marge, y - 3.6 + hauteur - 2); doc.setLineWidth(0.2)
        doc.setFont('helvetica', 'bold'); doc.setTextColor(40); doc.text(horaire, marge + 3, y)
        doc.setTextColor(20); doc.text(titre, marge + 34, y)
        if (detail.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(100); doc.text(detail, marge + 34, y + titre.length * 4.6) }
        y += hauteur + 1.5
      }
      y += 3
    }
  })

  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setTextColor(150)
    doc.text(nettoyer(`${stage.nom} · page ${p}/${total} · Digital Football`), marge, 290)
  }
  const nom = encadrants.length === 1 ? `planning-${encadrants[0].nom}` : `plannings-encadrants-${stage.nom}`
  doc.save(`${nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}.pdf`)
}
