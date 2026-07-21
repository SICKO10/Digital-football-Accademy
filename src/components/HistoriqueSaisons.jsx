const COULEURS_STAT = { green: '#4ade80', orange: '#f59e0b', red: '#ef4444' }

export function MiniStat({ label, valeur, couleur }) {
  return (
    <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: COULEURS_STAT[couleur] || '#fff' }}>{valeur}</p>
      <p style={{ margin: '2px 0 0', fontSize: '9px', color: '#666', textTransform: 'uppercase' }}>{label}</p>
    </div>
  )
}

// Card saison réutilisée telle quelle dans le dashboard éducateur (édition), le dashboard
// club (lecture seule) et la fiche club publique (lecture seule, compacte).
export function CarteHistoriqueSaison({ h, onEdit }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '16px', marginBottom: '12px', border: '1px solid #2a2a2a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontWeight: 'bold' }}>{h.saison}{h.categorie ? ` — ${h.categorie}` : ''}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {h.niveau_championnat && <span style={{ color: '#aaa', fontSize: '13px' }}>{h.niveau_championnat}</span>}
          {onEdit && (
            <button onClick={() => onEdit(h)} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '6px', padding: '3px 9px', fontSize: '11px', cursor: 'pointer' }}>
              ✏️ Modifier
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
        <MiniStat label="Classement" valeur={h.classement_final ? `${h.classement_final}e` : '—'} />
        <MiniStat label="Victoires" valeur={`${h.taux_victoire ?? 0}%`} couleur="green" />
        <MiniStat label="Nuls" valeur={`${h.taux_nul ?? 0}%`} couleur="orange" />
        <MiniStat label="Défaites" valeur={`${h.taux_defaite ?? 0}%`} couleur="red" />
      </div>
      <div style={{ marginTop: '8px', color: '#86efac', fontSize: '13px' }}>
        🏃 Présence entraînements : {h.taux_presence_entrainement ?? 0}%
        &nbsp;·&nbsp; {h.nb_matchs ?? 0} match{(h.nb_matchs ?? 0) > 1 ? 's' : ''} joué{(h.nb_matchs ?? 0) > 1 ? 's' : ''}
      </div>
    </div>
  )
}
