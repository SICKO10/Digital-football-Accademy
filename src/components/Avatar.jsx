export default function Avatar({
  person,
  size = 40,
  bg = '#4ade8015',
  border = '2px solid #4ade8040',
  textColor = '#4ade80',
  style = {},
}) {
  const initials = `${(person?.prenom || '?')[0]}${(person?.nom || '?')[0]}`.toUpperCase()
  const base = { width: size, height: size, borderRadius: '50%', border, flexShrink: 0, ...style }
  if (person?.avatar_url) {
    return <img src={person.avatar_url} alt={initials} style={{ ...base, objectFit: 'cover' }} />
  }
  return (
    <div style={{ ...base, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.38), fontWeight: 700, color: textColor }}>
      {initials}
    </div>
  )
}
