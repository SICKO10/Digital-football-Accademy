import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useColors } from '../lib/theme'
import { saisonActuelle } from '../lib/saison'

// Colonnes attendues dans l'export CSV Veo (format non documenté publiquement,
// à ajuster si la structure réelle diffère) : Veo exporte typiquement Player,
// Goals, Assists, Shots, Minutes.
const COLONNES_VEO = {
  joueur:  ['Player', 'Name', 'Joueur'],
  buts:    ['Goals', 'Buts'],
  passes:  ['Assists', 'Passes décisives'],
  tirs:    ['Shots', 'Tirs'],
  minutes: ['Minutes', 'Mins'],
}

function trouverColonne(headers, candidats) {
  return headers.find(h => candidats.some(c => h.toLowerCase().includes(c.toLowerCase()))) || null
}

function parseCSV(texte) {
  const lignes = texte.trim().split('\n')
  if (lignes.length < 2) return []
  const sep = texte.includes(';') ? ';' : ','
  const headers = lignes[0].split(sep).map(h => h.trim().replace(/"/g, ''))
  return lignes.slice(1).map(ligne => {
    const vals = ligne.split(sep).map(v => v.trim().replace(/"/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] || '']))
  })
}

function extraireStats(rows, headers) {
  const cols = {
    joueur:  trouverColonne(headers, COLONNES_VEO.joueur),
    buts:    trouverColonne(headers, COLONNES_VEO.buts),
    passes:  trouverColonne(headers, COLONNES_VEO.passes),
    tirs:    trouverColonne(headers, COLONNES_VEO.tirs),
    minutes: trouverColonne(headers, COLONNES_VEO.minutes),
  }
  const parJoueur = {}
  rows.forEach(row => {
    const nom = row[cols.joueur] || 'Inconnu'
    if (!parJoueur[nom]) parJoueur[nom] = { nom, buts: 0, passes: 0, tirs: 0, minutes: 0, matchs: 0 }
    parJoueur[nom].buts    += parseInt(row[cols.buts]    || 0, 10)
    parJoueur[nom].passes  += parseInt(row[cols.passes]  || 0, 10)
    parJoueur[nom].tirs    += parseInt(row[cols.tirs]    || 0, 10)
    parJoueur[nom].minutes += parseInt(row[cols.minutes] || 0, 10)
    parJoueur[nom].matchs  += 1
  })
  return Object.values(parJoueur)
}

// Import CSV Veo (Phase 3 Recrutement, cf. supabase_veo_import.sql) : les
// stats agrégées restent dans veo_imports.stats_extraites (pas de table
// stats_joueurs dans ce projet) et chaque joueur associé à une ligne du CSV
// reçoit le badge "Vidéo vérifiée" (joueur_video_badges, 1 par saison).
export default function ImportVeo({ educateurId, clubCategorieId, joueurs = [], onImporte, onFermer }) {
  const colors = useColors()
  const saison = saisonActuelle()
  const [fichier, setFichier] = useState(null)
  const [apercu, setApercu] = useState(null)
  const [etape, setEtape] = useState('upload')
  const [associations, setAssociations] = useState({})
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [historique, setHistorique] = useState([])

  // Joueurs de l'effectif ayant un compte lié (joueur_id) : seuls ceux-là
  // peuvent recevoir le badge, joueur_video_badges.joueur_id référence profiles(id).
  const joueursAssociables = joueurs.filter(j => j.joueur_id)

  useEffect(() => {
    supabase.from('veo_imports').select('id, nom_fichier, statut, created_at, stats_extraites')
      .eq('educateur_id', educateurId).eq('club_categorie_id', clubCategorieId)
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => setHistorique(data || []))
  }, [educateurId, clubCategorieId])

  const handleFichier = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFichier(f)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result)
        if (rows.length === 0) { setErreur('Fichier vide ou format non reconnu.'); return }
        const stats = extraireStats(rows, Object.keys(rows[0]))
        setApercu({ stats, rawRows: rows })
        setEtape('apercu')
        setErreur(null)
      } catch (err) {
        setErreur('Erreur de lecture : ' + err.message)
      }
    }
    reader.readAsText(f)
  }

  const validerImport = async () => {
    if (!apercu) return
    setLoading(true)
    const { data: importData, error: importError } = await supabase.from('veo_imports').insert({
      educateur_id: educateurId,
      club_categorie_id: clubCategorieId,
      saison,
      nom_fichier: fichier?.name,
      statut: 'traite',
      raw_data: apercu.rawRows,
      stats_extraites: apercu.stats,
    }).select().single()

    if (importError) { setErreur(importError.message); setLoading(false); return }

    for (const [nomCSV, joueurId] of Object.entries(associations)) {
      if (!joueurId) continue
      const { error } = await supabase.from('joueur_video_badges')
        .upsert({ joueur_id: joueurId, educateur_id: educateurId, saison, veo_import_id: importData.id }, { onConflict: 'joueur_id,saison' })
      if (error) console.error('joueur_video_badges upsert error:', nomCSV, error)
    }

    setLoading(false)
    setEtape('succes')
    onImporte?.()
  }

  const recommencer = () => { setEtape('upload'); setApercu(null); setFichier(null); setAssociations({}); setErreur(null) }

  const s = {
    card: { background: colors.background.raised, borderRadius: '10px', padding: '14px 16px' },
    btn: { background: colors.accent.green, color: colors.black, border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    btnGhost: { background: 'transparent', color: colors.text.faint, border: `1px solid ${colors.border.default}`, borderRadius: '8px', padding: '9px 18px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', fontFamily: 'Inter, sans-serif' },
    label: { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: colors.text.faint, fontWeight: 700 },
    select: { background: colors.background.base, border: `1px solid ${colors.border.strong}`, color: colors.text.primary, borderRadius: '6px', padding: '5px 8px', fontSize: '11px', width: '100%', fontFamily: 'Inter, sans-serif' },
  }

  return (
    <div>
      <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>Importer un export Veo</div>
      <div style={{ color: colors.text.faint, fontSize: '12px', marginBottom: '20px' }}>Fichier CSV exporté depuis votre compte Veo — saison {saison}</div>

      {etape === 'upload' && (
        <>
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: `2px dashed ${colors.border.default}`, borderRadius: '12px', padding: '32px 20px', cursor: 'pointer',
            background: colors.background.sunken,
          }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFichier({ target: { files: e.dataTransfer.files } }) }}>
            <span style={{ color: colors.text.secondary, fontSize: '14px', fontWeight: 600 }}>Déposer le CSV Veo ici</span>
            <span style={{ color: colors.text.faint, fontSize: '12px', marginTop: '4px' }}>ou cliquer pour parcourir</span>
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFichier} />
          </label>

          {historique.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ ...s.label, marginBottom: '8px' }}>Imports précédents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {historique.map(h => (
                  <div key={h.id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: colors.text.secondary, fontSize: '12px' }}>{h.nom_fichier || 'Fichier'}</span>
                    <span style={{ color: colors.text.faint, fontSize: '11px' }}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {etape === 'apercu' && apercu && (
        <div>
          <div style={{ color: colors.accent.green, fontWeight: 700, fontSize: '13px', marginBottom: '16px' }}>
            {apercu.stats.length} joueur(s) détecté(s) dans le CSV
          </div>

          <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                  {['Nom (CSV)', 'Matchs', 'Buts', 'Passes', 'Min.', 'Associer au joueur'].map(h => (
                    <th key={h} style={{ color: colors.text.faint, fontWeight: 600, padding: '6px 10px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {apercu.stats.map(st => (
                  <tr key={st.nom} style={{ borderBottom: `1px solid ${colors.border.subtle}` }}>
                    <td style={{ color: colors.text.primary, padding: '8px 10px', fontWeight: 600 }}>{st.nom}</td>
                    <td style={{ color: colors.text.secondary, padding: '8px 10px' }}>{st.matchs}</td>
                    <td style={{ color: colors.accent.green, padding: '8px 10px', fontWeight: 700 }}>{st.buts}</td>
                    <td style={{ color: colors.accent.amber, padding: '8px 10px' }}>{st.passes}</td>
                    <td style={{ color: colors.text.secondary, padding: '8px 10px' }}>{st.minutes}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <select style={s.select} value={associations[st.nom] || ''} onChange={e => setAssociations(prev => ({ ...prev, [st.nom]: e.target.value }))}>
                        <option value="">— Associer —</option>
                        {joueursAssociables.map(j => <option key={j.joueur_id} value={j.joueur_id}>{j.prenom} {j.nom}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ color: colors.text.faint, fontSize: '11px', marginBottom: '16px' }}>
            Les joueurs associés recevront le badge « Vidéo vérifiée » pour la saison {saison}.
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ ...s.btn, opacity: loading || Object.values(associations).every(v => !v) ? 0.6 : 1 }}
              disabled={loading || Object.values(associations).every(v => !v)} onClick={validerImport}>
              {loading ? 'Import en cours...' : 'Valider l\'import'}
            </button>
            <button style={s.btnGhost} onClick={recommencer}>Annuler</button>
          </div>
        </div>
      )}

      {etape === 'succes' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ color: colors.accent.green, fontWeight: 800, fontSize: '16px', marginBottom: '8px' }}>Import réussi</div>
          <div style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '20px' }}>Les stats Veo ont été enregistrées et les badges attribués.</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button style={s.btnGhost} onClick={recommencer}>Importer un autre fichier</button>
            {onFermer && <button style={s.btnGhost} onClick={onFermer}>Fermer</button>}
          </div>
        </div>
      )}

      {erreur && <div style={{ color: colors.accent.red, fontSize: '12px', marginTop: '12px' }}>{erreur}</div>}
    </div>
  )
}
