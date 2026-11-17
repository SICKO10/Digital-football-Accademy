import { FileText } from 'lucide-react'
import { resultatMatch, scoreAffiche } from '../lib/resultatMatch'
import { useColors } from '../lib/theme'
import { styleCarte, styleCarteLiseree, styleChiffreHeros, styleBoutonSecondaire, couleurCraie, CLASSE_BOUTON_SECONDAIRE, CLASSE_CLIQUABLE } from '../lib/identite'
import { PastilleResultat, Icone } from './identite'
import { police } from '../tokens'
import EcussonClub from './EcussonClub'

// Carte d'un match joué (Compétition > Résultats) façon feuille de match :
// notre club à gauche, score au centre en chiffres de tableau d'affichage et
// pastille V / N / D, adversaire à droite, date · heure | compétition ·
// domicile/extérieur · lieu en dessous, puis Rapport et le menu « ··· » fourni
// par le parent (menu). enVedette : dernier match joué, carte à liseré.
// Score affiché nous–eux, comme avant.
export default function LigneResultat({ m, nomClub, logoClub, logoAdversaire, enVedette, isMobile, locale = 'fr-FR', aRapport, afficherRapport, onOuvrir, onRapport, menu }) {
  const colors = useColors()
  const res = resultatMatch(m)

  const date = new Date(`${m.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
  const meta = [m.competition, m.domicile ? 'Domicile' : 'Extérieur', m.lieu].filter(Boolean).join(' · ')
  const tailleLogo = isMobile ? 34 : (enVedette ? 52 : 44)

  const equipe = (nom, logo, alignement) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '14px', minWidth: 0, flexDirection: alignement === 'droite' ? 'row-reverse' : 'row', justifyContent: 'flex-start' }}>
      <EcussonClub nom={nom} logo={logo} taille={tailleLogo} />
      <span style={{ fontFamily: police.titre, fontWeight: 700, fontSize: isMobile ? '15px' : (enVedette ? '22px' : '19px'), lineHeight: 1.1, color: colors.text.primary, textTransform: 'uppercase', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textAlign: alignement === 'droite' ? 'right' : 'left', minWidth: 0 }}>
        {nom}
      </span>
    </div>
  )

  const boutonRapport = (
    <button type="button" onClick={onRapport} className={CLASSE_BOUTON_SECONDAIRE}
      title={aRapport ? 'Voir le rapport de match' : 'Rapport de match'}
      style={{ ...styleBoutonSecondaire(colors), minHeight: '36px', padding: '0 12px', fontSize: '13px' }}>
      <Icone icone={FileText} taille={16} /> Rapport
    </button>
  )

  const ouvrirAuClavier = e => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOuvrir?.() }
  }

  return (
    <div onClick={onOuvrir} onKeyDown={ouvrirAuClavier} role="button" tabIndex={0} className={CLASSE_CLIQUABLE}
      style={{ ...(enVedette ? styleCarteLiseree(colors) : styleCarte(colors)), cursor: 'pointer', padding: isMobile ? '12px' : (enVedette ? '18px 20px' : '14px 18px'), paddingLeft: enVedette ? (isMobile ? '15px' : '23px') : undefined }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr) auto minmax(0,1fr)' : 'minmax(0,1fr) auto minmax(0,1fr) auto', alignItems: 'center', gap: isMobile ? '8px' : '18px' }}>
        {equipe(nomClub, logoClub, 'gauche')}

        <div style={{ textAlign: 'center', padding: isMobile ? 0 : '0 12px', borderLeft: isMobile ? 'none' : `1px solid ${couleurCraie(colors)}`, borderRight: isMobile ? 'none' : `1px solid ${couleurCraie(colors)}`, minWidth: isMobile ? '64px' : '120px' }}>
          <p style={{ ...styleChiffreHeros(colors, isMobile ? 26 : (enVedette ? 38 : 32)), margin: 0, letterSpacing: '0.04em' }}>
            {scoreAffiche(m, ' - ')}
          </p>
          <PastilleResultat resultat={res} style={{ marginTop: '6px' }} />
        </div>

        {equipe(m.adversaire || 'Adversaire', logoAdversaire, 'droite')}

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px', borderLeft: `1px solid ${couleurCraie(colors)}` }} onClick={e => e.stopPropagation()}>
            {afficherRapport && boutonRapport}
            {menu}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'center', gap: '10px', marginTop: isMobile ? '10px' : '8px', flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontFamily: police.texte, fontSize: isMobile ? '12px' : '13px', color: colors.text.secondary, textAlign: 'center' }}>
          {date}{m.heure ? ` · ${m.heure}` : ''}{meta ? `  |  ${meta}` : ''}
        </p>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
            {afficherRapport && boutonRapport}
            {menu}
          </div>
        )}
      </div>
    </div>
  )
}
