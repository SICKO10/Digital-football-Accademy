import { Fragment, useState } from 'react'
import { useCoachTheme } from '../../pages/coach/useCoachTheme'

const PAGE_SIZE = 25

// Table générique en mémoire (pas de lib externe — aucun tableau de l'app
// n'a de pagination aujourd'hui, on reste cohérent). Ligne cliquable/
// dépliable optionnelle via `renderExpanded`, pagination 25/page.
export default function SimpleTable({ columns, rows, rowKey, renderExpanded, emptyLabel = 'Aucun résultat' }) {
  const { c } = useCoachTheme()
  const [ouverts, setOuverts] = useState({})
  const [page, setPage] = useState(1)
  const toggle = (id) => setOuverts(prev => ({ ...prev, [id]: !prev[id] }))

  if (rows.length === 0) {
    return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem 0' }}>{emptyLabel}</p>
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  // Clampé au rendu plutôt que resynchronisé dans un effet : si la liste se
  // réduit (filtre/recherche) et que la page courante n'existe plus, on
  // retombe simplement sur la dernière page valable.
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr>
              {columns.map(c2 => (
                <th key={c2.key} style={{ textAlign: 'left', padding: '9px 10px', color: c.textMuted, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
                  {c2.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(row => {
              const id = row[rowKey]
              const ouvert = ouverts[id]
              return (
                <Fragment key={id}>
                  <tr
                    onClick={renderExpanded ? () => toggle(id) : undefined}
                    style={{ borderBottom: `1px solid ${c.border}`, cursor: renderExpanded ? 'pointer' : 'default', transition: 'background 0.15s ease' }}>
                    {columns.map(c2 => (
                      <td key={c2.key} style={{ padding: '10px', color: c.text, whiteSpace: 'nowrap' }}>
                        {c2.render ? c2.render(row) : row[c2.key]}
                      </td>
                    ))}
                  </tr>
                  {renderExpanded && ouvert && (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: '12px 14px', background: c.surface2, borderBottom: `1px solid ${c.border}` }}>
                        {renderExpanded(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <span style={{ fontSize: '12px', color: c.textMuted }}>Page {safePage} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
            style={{ background: c.surface2, border: `1px solid ${c.border}`, color: safePage <= 1 ? c.textMuted : c.text, borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: safePage <= 1 ? 'not-allowed' : 'pointer', opacity: safePage <= 1 ? 0.5 : 1, transition: 'background 0.15s ease' }}>
            Précédent
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
            style={{ background: c.surface2, border: `1px solid ${c.border}`, color: safePage >= totalPages ? c.textMuted : c.text, borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages ? 0.5 : 1, transition: 'background 0.15s ease' }}>
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
