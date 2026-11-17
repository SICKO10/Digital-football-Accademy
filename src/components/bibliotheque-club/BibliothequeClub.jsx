import { useState } from 'react'
import { useColors } from '../../lib/theme'
import { TitreEcran } from '../identite'
import { coqueVars } from '../../lib/menuLateral'
import ProceduresClub from './ProceduresClub'
import DigitalFootballClub from './DigitalFootballClub'
import BibliothequeVideos from '../BibliothequeVideos'

// Bibliothèque du club : procédés et vidéos qui appartiennent au club.
// Onglet « Bibliothèque du club » : procédés (bloc 3) et vidéos (bloc 6).
// Onglet « Digital Football » : lecture et copie dans le club (bloc 7).
const ONGLETS = [
  { id: 'club', label: 'Bibliothèque du club' },
  { id: 'digital_football', label: 'Digital Football' },
]

export default function BibliothequeClub({ clubId, userId, peutEditer = false }) {
  const colors = useColors()
  const [onglet, setOnglet] = useState('club')
  const [contenu, setContenu] = useState('procedes')

  return (
    <div>
      <TitreEcran
        titre="Bibliothèque"
        sousTitre="Les procédés et les vidéos de votre club, à partager avec vos éducateurs."
      />
      <div role="tablist" className="df-onglets" style={{ ...coqueVars(colors, colors.accent.green), marginBottom: 16 }}>
        {ONGLETS.map(o => (
          <button key={o.id} role="tab" aria-selected={onglet === o.id} className="df-onglet" onClick={() => setOnglet(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'club' && (
        <>
          <div role="group" aria-label="Type de contenu" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[{ id: 'procedes', label: 'Procédés' }, { id: 'videos', label: 'Vidéos' }].map(c => {
              const actif = contenu === c.id
              return (
                <button key={c.id} type="button" aria-pressed={actif} onClick={() => setContenu(c.id)}
                  style={{ minHeight: 40, padding: '0 18px', borderRadius: 999, fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    border: `1px solid ${actif ? colors.accent.brand : colors.border.strong}`,
                    background: actif ? colors.accent.brand : 'transparent',
                    color: actif ? colors.accent.onBrand : colors.text.primary }}>
                  {c.label}
                </button>
              )
            })}
          </div>
          {contenu === 'procedes' && <ProceduresClub clubId={clubId} userId={userId} peutEditer={peutEditer} />}
          {/* club_id = le club (clubId), jamais le compte connecté : un directeur sportif écrit pour le club. */}
          {contenu === 'videos' && <BibliothequeVideos type="club" clubId={clubId} peutAjouter={peutEditer} accentColor={colors.accent.brand} />}
        </>
      )}
      {onglet === 'digital_football' && (
        <DigitalFootballClub
          clubId={clubId}
          peutEditer={peutEditer}
          onVoirCopie={() => { setContenu('procedes'); setOnglet('club') }}
        />
      )}
    </div>
  )
}
