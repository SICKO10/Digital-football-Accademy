import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CSS_STAGE_PUBLIC, useStagePublic } from '../lib/stagesPublic'
import EcranEtatStage from '../components/stages/EcranEtatStage'
import { formatDate, formatJourCourt, heure, euros, detailOffre } from '../lib/stages'

// Page publique d'un stage (parents, joueurs) — accessible sans compte.
// Toutes les données passent par la fonction stage_public(lien) (cf.
// supabase_stages_etape1.sql / etape2.sql) : uniquement les champs publics,
// uniquement pour un stage publié. Aucune lecture directe des tables.

export default function StagePublic() {
  const { lien } = useParams()
  const { stage, etat } = useStagePublic(lien)
  const [onglet, setOnglet] = useState('programme')
  if (etat !== 'ok') return <EcranEtatStage etat={etat} />

  const accent = stage.club_couleur || '#4ade80'
  const carte = { background: '#111', border: '1px solid #1f1f1f', borderRadius: 16, padding: '20px 22px', marginTop: 16 }
  const titreSection = { margin: '0 0 12px', fontSize: 13, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: accent }
  const parJour = (stage.planning || []).reduce((acc, c) => { (acc[c.date] = acc[c.date] || []).push(c); return acc }, {})
  const periode = stage.date_debut === stage.date_fin
    ? formatDate(stage.date_debut, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `Du ${formatDate(stage.date_debut, { day: 'numeric', month: 'long' })} au ${formatDate(stage.date_fin, { day: 'numeric', month: 'long', year: 'numeric' })}`
  const statutLibelle = { ouvert: 'Inscriptions ouvertes', complet: 'Complet', termine: 'Stage terminé' }[stage.statut]
  const jours = stage.jours || []
  const inscriptionPossible = stage.statut === 'ouvert' && (stage.offres || []).length > 0 && jours.some(j => j.places_restantes > 0)
  const posts = stage.posts || []
  const actualites = posts.filter(p => p.type === 'actualite')
  const photos = posts.filter(p => p.image_url && (p.type === 'photo' || p.type === 'actualite'))
  const objets = posts.filter(p => p.type === 'objet_perdu')
  const sponsors = stage.sponsors || []
  const ONGLETS = [
    ['programme', 'Programme'],
    ...(actualites.length ? [['actualites', `Actualités (${actualites.length})`]] : []),
    ...(photos.length ? [['photos', `Photos (${photos.length})`]] : []),
    ...(objets.length ? [['objets', `Objets oubliés (${objets.length})`]] : []),
  ]
  const dateHeure = (iso) => new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <style>{CSS_STAGE_PUBLIC}</style>
      <div className="sp-page">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          {stage.club_avatar && <img src={stage.club_avatar} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover' }} />}
          <span style={{ fontSize: 14, fontWeight: 700, color: '#bbb' }}>{stage.club_nom || 'Club'}</span>
        </div>

        {statutLibelle && (
          <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, border: `1px solid ${accent}55`, color: accent, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>{statutLibelle}</span>
        )}
        <h1 className="sp-titre" style={{ fontWeight: 900, lineHeight: 1.15, margin: '0 0 10px' }}>{stage.nom}</h1>
        <p style={{ margin: 0, color: '#aaa', fontSize: 15 }}>{periode}</p>
        {stage.lieu && <p style={{ margin: '4px 0 0', color: '#777', fontSize: 14 }}>{stage.lieu}</p>}

        {inscriptionPossible && (
          <Link to={`/stage/${lien}/inscription`} style={{ display: 'inline-block', marginTop: 20, padding: '13px 28px', borderRadius: 12, background: accent, color: '#0a0a0a', fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>
            Inscrire mon enfant
          </Link>
        )}

        {ONGLETS.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 24 }}>
            {ONGLETS.map(([id, label]) => (
              <button key={id} onClick={() => setOnglet(id)} style={{
                padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                background: onglet === id ? accent + '22' : 'transparent', border: `1px solid ${onglet === id ? accent : '#262626'}`, color: onglet === id ? accent : '#aaa',
              }}>{label}</button>
            ))}
          </div>
        )}

        {onglet === 'programme' && (
          <>
          {stage.description && (
            <div style={carte}><p style={{ margin: 0, color: '#bbb', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{stage.description}</p></div>
          )}

          {(stage.offres || []).length > 0 && (
            <div style={carte}>
              <p style={titreSection}>Tarifs</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stage.offres.map(o => (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', background: '#0a0a0a', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{o.nom}</span>
                    <span style={{ fontSize: 13, color: '#aaa' }}>{detailOffre(o, jours.length)}</span>
                  </div>
                ))}
              </div>
              {(stage.formules_repas || []).length > 0 && (
                <>
                  <p style={{ margin: '14px 0 6px', fontSize: 13, fontWeight: 700, color: '#ccc' }}>Repas</p>
                  {stage.formules_repas.map(f => (
                    <p key={f.id} style={{ margin: '2px 0', fontSize: 13, color: '#aaa' }}>{f.nom} · {Number(f.prix_jour) > 0 ? `${euros(f.prix_jour)} par jour` : 'sans supplément'}</p>
                  ))}
                </>
              )}
            </div>
          )}

          {jours.length > 0 && stage.statut === 'ouvert' && (
            <div style={carte}>
              <p style={titreSection}>Places disponibles</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {jours.map(j => (
                  <span key={j.date} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, border: '1px solid #262626', color: j.places_restantes > 0 ? '#ddd' : '#666', textTransform: 'capitalize' }}>
                    {formatJourCourt(j.date)} · {j.places_restantes > 0 ? `${j.places_restantes} place${j.places_restantes > 1 ? 's' : ''}` : 'complet'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(parJour).length > 0 && (
            <div style={carte}>
              <p style={titreSection}>Programme</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {Object.entries(parJour).map(([jour, liste]) => (
                  <div key={jour}>
                    <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 14, textTransform: 'capitalize' }}>{formatDate(jour)}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {liste.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, background: '#0a0a0a', borderRadius: 10, padding: '9px 12px', borderLeft: `4px solid ${c.couleur || accent}` }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ccc', minWidth: 86 }}>{heure(c.heure_debut)} – {heure(c.heure_fin)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{c.activite}{c.groupe ? <span style={{ color: '#777', fontWeight: 400 }}> · {c.groupe}</span> : null}</div>
                            {(c.lieu || c.responsable) && <div style={{ fontSize: 12, color: '#888' }}>{[c.lieu, c.responsable].filter(Boolean).join(' · ')}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stage.liste_materiel && (
            <div style={carte}>
              <p style={titreSection}>Matériel à apporter</p>
              <p style={{ margin: 0, color: '#bbb', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{stage.liste_materiel}</p>
            </div>
          )}

          {stage.reglement && (
            <div style={carte}>
              <p style={titreSection}>Règlement</p>
              <p style={{ margin: 0, color: '#bbb', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{stage.reglement}</p>
            </div>
          )}
          </>
        )}

        {onglet === 'actualites' && actualites.map((p, i) => (
          <div key={i} style={carte}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#777', textTransform: 'capitalize' }}>{dateHeure(p.created_at)}</p>
            {p.titre && <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800 }}>{p.titre}</p>}
            {p.image_url && <img src={p.image_url} alt="" loading="lazy" style={{ width: '100%', borderRadius: 12, margin: '6px 0', maxHeight: 420, objectFit: 'cover' }} />}
            {p.contenu && <p style={{ margin: 0, color: '#bbb', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-line' }}>{p.contenu}</p>}
          </div>
        ))}

        {onglet === 'photos' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginTop: 16 }}>
            {photos.map((p, i) => (
              <a key={i} href={p.image_url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 12, overflow: 'hidden', background: '#111' }}>
                <img src={p.image_url} alt={p.titre || ''} loading="lazy" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                {p.titre && <span style={{ display: 'block', padding: '6px 8px', fontSize: 12, color: '#bbb' }}>{p.titre}</span>}
              </a>
            ))}
          </div>
        )}

        {onglet === 'objets' && (
          <>
            <p style={{ margin: '16px 0 0', color: '#999', fontSize: 14 }}>Ces objets ont été retrouvés sur le stage. Pour les récupérer, adresse-toi à l'équipe d'encadrement.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginTop: 12 }}>
              {objets.map((p, i) => (
                <div key={i} style={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
                  {p.image_url && <img src={p.image_url} alt="" loading="lazy" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }} />}
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.titre}</div>
                    {p.contenu && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{p.contenu}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {sponsors.length > 0 && (
          <div style={{ ...carte, marginTop: 28 }}>
            <p style={titreSection}>Nos partenaires</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {sponsors.map((sp, i) => {
                const contenuSponsor = (
                  <>
                    {sp.logo_url
                      ? <img src={sp.logo_url} alt={sp.nom} loading="lazy" style={{ width: '100%', height: 64, objectFit: 'contain', background: '#fff', borderRadius: 8, padding: 6, boxSizing: 'border-box' }} />
                      : <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15 }}>{sp.nom}</div>}
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6, color: '#ddd' }}>{sp.nom}</div>
                    {sp.message && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{sp.message}</div>}
                  </>
                )
                return sp.lien_url && /^https?:\/\//i.test(sp.lien_url)
                  ? <a key={i} href={sp.lien_url} target="_blank" rel="noreferrer noopener" style={{ textDecoration: 'none', color: 'inherit', background: '#0a0a0a', borderRadius: 10, padding: 10 }}>{contenuSponsor}</a>
                  : <div key={i} style={{ background: '#0a0a0a', borderRadius: 10, padding: 10 }}>{contenuSponsor}</div>
              })}
            </div>
          </div>
        )}

        <p style={{ marginTop: 36, textAlign: 'center', color: '#444', fontSize: 12 }}>
          Organisé avec Digital<span style={{ color: '#4ade80' }}>Football</span>
        </p>
      </div>
    </div>
  )
}
