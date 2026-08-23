import { useEffect, useState } from 'react'
import { useCoachTheme } from '../../pages/coach/useCoachTheme'

// Barre de filtres : boutons toggle (ex. actif/inactif, type) + recherche
// texte débouncée à 300ms pour éviter de re-filtrer à chaque frappe. Le
// champ n'est jamais réinitialisé de l'extérieur (search ne sert qu'à
// l'initialisation), donc pas besoin de resynchroniser draft dans un effet.
export default function FilterBar({ toggles = [], search, onSearchChange, searchPlaceholder = 'Rechercher...' }) {
  const { c, rgba } = useCoachTheme()
  const [draft, setDraft] = useState(search || '')

  useEffect(() => {
    const t = setTimeout(() => {
      if (draft !== search) onSearchChange?.(draft)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return (
    <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
      {toggles.map(t => (
        <button key={t.key} onClick={t.onClick}
          style={{
            padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            border: `1px solid ${t.active ? c.accent : c.border}`,
            background: t.active ? rgba(c.accent, 0.12) : c.surface,
            color: t.active ? c.accent : c.textMuted,
            fontFamily: 'Inter, sans-serif',
            transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
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
            marginLeft: 'auto', flex: '0 1 200px', minWidth: '160px', background: c.surface2, border: `1px solid ${c.border}`,
            color: c.text, borderRadius: '7px', padding: '6px 12px', fontSize: '13px', outline: 'none', fontFamily: 'Inter, sans-serif',
            transition: 'border-color 0.15s ease',
          }}
        />
      )}
    </div>
  )
}
