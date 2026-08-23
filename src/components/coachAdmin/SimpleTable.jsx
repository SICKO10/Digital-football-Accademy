import { Fragment, useState } from 'react'
import { colors } from '../../tokens'

// Table générique en mémoire (pas de lib externe — aucun tableau de l'app
// n'a de pagination aujourd'hui, on reste cohérent). Ligne cliquable/
// dépliable optionnelle via `renderExpanded`.
export default function SimpleTable({ columns, rows, rowKey, renderExpanded, emptyLabel = 'Aucun résultat' }) {
  const [ouverts, setOuverts] = useState({})
  const toggle = (id) => setOuverts(prev => ({ ...prev, [id]: !prev[id] }))

  if (rows.length === 0) {
    return <p style={{ color: colors.text.dim, textAlign: 'center', padding: '2rem 0' }}>{emptyLabel}</p>
  }

  return (
    <div style={{ overflowX: 'auto', background: colors.background.surface, border: '1px solid #222', borderRadius: '14px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr>
            {columns.map(c => (
              <th key={c.key} style={{ textAlign: 'left', padding: '12px 16px', color: colors.text.faint, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #222', whiteSpace: 'nowrap' }}>
                {c.label}
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
                  style={{ borderBottom: '1px solid #1a1a1a', cursor: renderExpanded ? 'pointer' : 'default' }}>
                  {columns.map(c => (
                    <td key={c.key} style={{ padding: '12px 16px', color: colors.text.secondary, whiteSpace: 'nowrap' }}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
                {renderExpanded && ouvert && (
                  <tr>
                    <td colSpan={columns.length} style={{ padding: '16px', background: colors.background.raised, borderBottom: '1px solid #1a1a1a' }}>
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
