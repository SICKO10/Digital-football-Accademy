import { useCoachTheme } from '../../pages/coach/useCoachTheme'

export default function Card({ children, style, onClick }) {
  const { c } = useCoachTheme()
  return (
    <div onClick={onClick} style={{
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: '10px', padding: '18px 20px',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>
      {children}
    </div>
  )
}
