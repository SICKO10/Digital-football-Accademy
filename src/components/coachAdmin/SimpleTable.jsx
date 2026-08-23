import { Fragment, useState } from 'react'
import { useCoachTheme } from '../../pages/coach/useCoachTheme'

// Table générique en mémoire (pas de lib externe — aucun tableau de l'app
// n'a de pagination aujourd'hui, on reste cohérent). Ligne cliquable/
// dépliable optionnelle via `renderExpanded`.
export default function SimpleTable({ columns, rows, rowKey, renderExpanded, emptyLabel = 'Aucun résultat' }) {
  const { c } = useCoachTheme()
  const [ouverts, setOuverts] = useState({})
  const toggle = (id) => setOuverts(prev => ({ ...prev, [id]: !prev[id] }))

  if (rows.length === 0) {
    return <p style={{ color: c.textMuted, textAlign: 'center', padding: '2rem 0' }}>{emptyLabel}</p>
  }

  return (
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
          {rows.map(row => {
            const id = row[rowKey]
            const ouvert = ouverts[id]
            return (
              <Fragment key={id}>
                <tr
                  onClick={renderExpanded ? () => toggle(id) : undefined}
                  style={{ borderBottom: `1px solid ${c.border}`, cursor: renderExpanded ? 'pointer' : 'default' }}>
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
  )
}
