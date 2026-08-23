import { useEffect, useState } from 'react'
import { colors } from '../../tokens'

// Barre de filtres : boutons toggle (ex. actif/inactif, type) + recherche
// texte débouncée à 300ms pour éviter de re-filtrer à chaque frappe. Le
// champ n'est jamais réinitialisé de l'extérieur (search ne sert qu'à
// l'initialisation), donc pas besoin de resynchroniser draft dans un effet.
export default function FilterBar({ toggles = [], search, onSearchChange, searchPlaceholder = 'Rechercher...' }) {
  const [draft, setDraft] = useState(search || '')

  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== search) onSearchChange?.(draft)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
      {toggles.map(t => (
        <button key={t.key} onClick={t.onClick}
          style={{
            background: t.active ? colors.accent.green : 'transparent',
            color: t.active ? colors.black : colors.text.dim,
            border: t.active ? 'none' : '1px solid #2a2a2a',
            padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}>
          {t.label}
        </button>
      ))}
      {onSearchChange && (
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            flex: '1 1 200px', minWidth: '160px', background: colors.background.base, border: '1px solid #333',
            color: 'white', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif',
          }}
        />
      )}
    </div>
  )
}
