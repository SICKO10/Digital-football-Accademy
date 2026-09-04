// Icônes de navigation en ligne (style Lucide) — remplace les émojis
// décoratifs, cf. retour utilisateur : pas d'émojis dans les nouvelles UI.
// currentColor hérite de la couleur du parent ; `size` (défaut 15) permet de
// réutiliser les mêmes icônes en plus grand pour les états vides.
const base = (size) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })

export const IcoGrid = ({ size = 15 }) => (
  <svg {...base(size)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
)
export const IcoUsers = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
)
export const IcoCard = ({ size = 15 }) => (
  <svg {...base(size)}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)
export const IcoDollar = ({ size = 15 }) => (
  <svg {...base(size)}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
)
export const IcoShare = ({ size = 15 }) => (
  <svg {...base(size)}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
)
export const IcoPlay = ({ size = 15 }) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" /></svg>
)
export const IcoShield = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
)
export const IcoBook = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
)
export const IcoHome = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
)
export const IcoMessage = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
)
export const IcoLink = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
)
export const IcoBriefcase = ({ size = 15 }) => (
  <svg {...base(size)}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>
)
export const IcoMic = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path d="M19 10v2a7 7 0 01-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
)
export const IcoClock = ({ size = 15 }) => (
  <svg {...base(size)}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
export const IcoCheck = ({ size = 15 }) => (
  <svg {...base(size)}><polyline points="20 6 9 17 4 12" /></svg>
)
export const IcoLock = ({ size = 15 }) => (
  <svg {...base(size)}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
)
export const IcoAlert = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
)
export const IcoFile = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
)
export const IcoImage = ({ size = 15 }) => (
  <svg {...base(size)}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
)
export const IcoCopy = ({ size = 15 }) => (
  <svg {...base(size)}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
)
export const IcoMail = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z" /><polyline points="22 6 12 13 2 6" /></svg>
)
export const IcoUser = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
)
export const IcoTrophy = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" /><path d="M17 5h3a2 2 0 010 4h-1M7 5H4a2 2 0 000 4h1" /></svg>
)
export const IcoInbox = ({ size = 15 }) => (
  <svg {...base(size)}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>
)
export const IcoX = ({ size = 15 }) => (
  <svg {...base(size)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
export const IcoMegaphone = ({ size = 15 }) => (
  <svg {...base(size)}><path d="M3 11l18-5v12L3 13z" /><path d="M11.6 16.8a3 3 0 01-5.8-1.6" /></svg>
)
export const IcoLibrary = ({ size = 15 }) => (
  <svg {...base(size)}><line x1="4" y1="21" x2="4" y2="3" /><line x1="9" y1="21" x2="9" y2="7" /><line x1="14" y1="21" x2="14" y2="4" /><line x1="19" y1="21" x2="19" y2="10" /></svg>
)
