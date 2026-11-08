// Résultat d'un match (V / N / D) en tenant compte des tirs au but.
// Le score du match reste celui du temps réglementaire : les tirs au but ne
// comptent ni dans les buts marqués/encaissés ni dans les buts des joueurs.
// Un nul au temps réglementaire avec des tirs au but départagés devient une
// victoire ou une défaite ; sans tirs au but renseignés, il reste un nul.

const nombre = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

export const resultatMatch = (m) => {
  const nous = nombre(m?.score_nous), eux = nombre(m?.score_eux)
  if (nous === null || eux === null || Number.isNaN(nous) || Number.isNaN(eux)) return null
  if (nous > eux) return 'V'
  if (nous < eux) return 'D'
  const tn = nombre(m?.tab_nous), te = nombre(m?.tab_eux)
  if (tn !== null && te !== null && !Number.isNaN(tn) && !Number.isNaN(te) && tn !== te) return tn > te ? 'V' : 'D'
  return 'N'
}

export const aTirsAuBut = (m) => nombre(m?.tab_nous) !== null && nombre(m?.tab_eux) !== null

// « 1-1 (4-2 t.a.b.) » ; sans tirs au but : « 1-1 »
export const scoreAffiche = (m, sep = '-') => {
  const base = `${m?.score_nous}${sep}${m?.score_eux}`
  return aTirsAuBut(m) ? `${base} (${m.tab_nous}-${m.tab_eux} t.a.b.)` : base
}

export const estCoupe = (competition) => /coupe/i.test(competition || '')
