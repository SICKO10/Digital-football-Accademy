import { useState } from 'react'
import { useColors } from '../lib/theme'

// Ce que contiennent vraiment les macronutriments — comparaison bonnes/
// mauvaises sources, objectifs personnalisés (profil.poids_kg quand connu).
const MACROS_EXPLICATION = (profil, colors) => [
  {
    nom: 'Protéines',
    emoji: '💪',
    couleur: colors.accent.green,
    kcal_par_g: 4,
    role: "Construisent et réparent les muscles. Essentielles après l'effort pour la récupération.",
    objectif: profil?.poids_kg ? `${Math.round(profil.poids_kg * 1.8)}g / jour (1.8g × ${profil.poids_kg}kg)` : '1.6 à 2g par kg de poids corporel',
    sources_bonnes: [
      { aliment: 'Blanc de poulet (100g)', val: '31g de protéines', icon: '🍗' },
      { aliment: 'Thon au naturel (100g)', val: '26g de protéines', icon: '🐟' },
      { aliment: 'Œufs (2 œufs)', val: '13g de protéines', icon: '🥚' },
      { aliment: 'Yaourt grec (200g)', val: '18g de protéines', icon: '🥛' },
      { aliment: 'Fromage blanc (200g)', val: '16g de protéines', icon: '🧀' },
      { aliment: 'Saumon (100g)', val: '25g de protéines', icon: '🐠' },
      { aliment: 'Lentilles cuites (150g)', val: '14g de protéines', icon: '🫘' },
      { aliment: 'Whey protéine (1 scoop)', val: '25g de protéines', icon: '🥤' },
    ],
    sources_mauvaises: [
      { aliment: 'Burger fast-food', val: '13g seulement (+ 45g de graisses)', icon: '🍔' },
      { aliment: 'Nuggets ×6', val: '14g (+ friture et additifs)', icon: '🍟' },
      { aliment: 'Saucisson (30g)', val: '5g (+ 15g graisses saturées)', icon: '🥩' },
    ],
    conseil: "Répartis tes protéines sur 4-5 repas/jour. Le corps n'absorbe pas plus de 30-40g en une seule fois.",
  },
  {
    nom: 'Glucides',
    emoji: '⚡',
    couleur: colors.accent.amber,
    kcal_par_g: 4,
    role: 'Le carburant principal du footballeur. Stockés dans les muscles sous forme de glycogène, ils alimentent les sprints et les accélérations.',
    objectif: 'Entre 5 et 7g par kg de poids corporel (+ les jours de match)',
    sources_bonnes: [
      { aliment: 'Pâtes complètes (100g cru)', val: '68g de glucides', icon: '🍝' },
      { aliment: 'Riz basmati (100g cru)', val: '78g de glucides', icon: '🍚' },
      { aliment: 'Patate douce (200g)', val: '40g de glucides', icon: '🍠' },
      { aliment: "Flocons d'avoine (80g)", val: '55g de glucides', icon: '🥣' },
      { aliment: 'Banane (1 grande)', val: '27g de glucides', icon: '🍌' },
      { aliment: 'Pain complet (2 tranches)', val: '30g de glucides', icon: '🍞' },
      { aliment: 'Quinoa cuit (150g)', val: '33g de glucides', icon: '🌾' },
    ],
    sources_mauvaises: [
      { aliment: 'Coca-Cola 33cl', val: '35g de sucre pur (index glycémique 65)', icon: '🥤' },
      { aliment: 'Croissant', val: '26g glucides + 22g de graisses', icon: '🥐' },
      { aliment: 'Barre chocolatée', val: '40g de sucre + lipides saturés', icon: '🍫' },
      { aliment: "Jus d'orange 25cl", val: '25g de sucre sans les fibres du fruit', icon: '🧃' },
    ],
    conseil: "Préfère les glucides complexes (riz, pâtes, patate douce) aux sucres rapides. La veille d'un match, augmente les glucides de 20%.",
  },
  {
    nom: 'Lipides',
    emoji: '🛡️',
    couleur: colors.accent.orange,
    kcal_par_g: 9,
    role: 'Protègent les articulations, transportent les vitamines (A, D, E, K) et fournissent une énergie de longue durée. À ne pas éliminer.',
    objectif: "20 à 30% de l'apport calorique total. Privilégier les graisses insaturées (oméga-3, oméga-9).",
    sources_bonnes: [
      { aliment: 'Avocat (½)', val: '15g de graisses saines (oméga-9)', icon: '🥑' },
      { aliment: 'Saumon (100g)', val: "13g dont 3g d'oméga-3", icon: '🐟' },
      { aliment: 'Amandes (30g)', val: '15g de graisses + vitamine E', icon: '🌰' },
      { aliment: "Huile d'olive (1cs)", val: "14g d'oméga-9", icon: '🫒' },
      { aliment: 'Graines de chia (2cs)', val: "9g dont 5g d'oméga-3", icon: '🌱' },
      { aliment: 'Noix (30g)', val: '18g dont oméga-3 végétaux', icon: '🥜' },
    ],
    sources_mauvaises: [
      { aliment: 'Frites (portion fast-food)', val: '17g de graisses trans + inflammatoires', icon: '🍟' },
      { aliment: 'Chips (50g)', val: '17g de graisses saturées', icon: '🥔' },
      { aliment: 'Beurre (20g)', val: '16g dont 11g de graisses saturées', icon: '🧈' },
      { aliment: 'Charcuterie (50g)', val: '15g de graisses saturées + sel', icon: '🥩' },
    ],
    conseil: 'Les oméga-3 (saumon, noix, chia) réduisent l\'inflammation après les matchs. Intègre-les 3-4 fois par semaine.',
  },
]

// Ce que contiennent vraiment les aliments du quotidien — pour comparer un
// choix courant à ce qu'il apporte réellement (calories et macros).
const ALIMENTS_QUOTIDIEN = [
  { categorie: 'Fast-food', aliment: 'Menu burger classique', emoji: '🍔', cal: 540, prot: 25, gluc: 45, lip: 29, note: 'danger', commentaire: "L'équivalent de 2 repas équilibrés en lipides saturés" },
  { categorie: 'Fast-food', aliment: 'Menu complet (burger + frites + boisson)', emoji: '🍟', cal: 1100, prot: 36, gluc: 130, lip: 48, note: 'danger', commentaire: '60% de tes besoins caloriques journaliers en un seul repas' },
  { categorie: 'Fast-food', aliment: 'Kebab avec sauce', emoji: '🥙', cal: 750, prot: 32, gluc: 65, lip: 38, note: 'warning', commentaire: 'Protéines correctes mais trop de graisses saturées' },
  { categorie: 'Fast-food', aliment: 'Pizza 4 fromages (½)', emoji: '🍕', cal: 680, prot: 28, gluc: 72, lip: 30, note: 'warning', commentaire: 'Riche en calcium mais index glycémique élevé' },
  { categorie: 'Boissons', aliment: 'Coca-Cola 33cl', emoji: '🥤', cal: 140, prot: 0, gluc: 35, lip: 0, note: 'danger', commentaire: '35g de sucre pur = 7 morceaux de sucre. Zéro nutriment.' },
  { categorie: 'Boissons', aliment: "Jus d'orange 25cl", emoji: '🧃', cal: 110, prot: 1, gluc: 25, lip: 0, note: 'warning', commentaire: 'Naturel mais sans fibres — sucres absorbés aussi vite qu\'un soda' },
  { categorie: 'Boissons', aliment: 'Eau (500ml)', emoji: '💧', cal: 0, prot: 0, gluc: 0, lip: 0, note: 'good', commentaire: 'Le meilleur choix. 2L minimum par jour pour un footballeur.' },
  { categorie: 'Boissons', aliment: "Lait d'avoine 25cl", emoji: '🥛', cal: 120, prot: 3, gluc: 18, lip: 3, note: 'good', commentaire: 'Glucides + minéraux. Idéal dans un shake post-entraînement.' },
  { categorie: 'Snacks', aliment: 'Chips (100g)', emoji: '🥔', cal: 520, prot: 6, gluc: 51, lip: 33, note: 'danger', commentaire: 'Quasiment que du sel et des graisses trans. À éviter.' },
  { categorie: 'Snacks', aliment: 'Barre chocolatée', emoji: '🍫', cal: 280, prot: 4, gluc: 40, lip: 12, note: 'warning', commentaire: "Pic glycémique rapide suivi d'une chute d'énergie" },
  { categorie: 'Snacks', aliment: 'Amandes (30g)', emoji: '🌰', cal: 180, prot: 6, gluc: 5, lip: 15, note: 'good', commentaire: 'Graisses saines + magnésium. Parfait entre deux entraînements.' },
  { categorie: 'Snacks', aliment: 'Banane', emoji: '🍌', cal: 90, prot: 1, gluc: 23, lip: 0, note: 'good', commentaire: 'Sucres naturels + potassium. Snack idéal pré-match.' },
]

const HYDRATATION = [
  { moment: 'Réveil', conseil: "Boire 500ml d'eau dès le lever", emoji: '🌅', detail: "Le corps perd 500ml d'eau pendant le sommeil. Réhydrate avant de manger." },
  { moment: "Avant l'entraînement (2h)", conseil: "500ml d'eau", emoji: '⏰', detail: "Ne pas attendre d'avoir soif — la soif = déjà 2% de déshydratation = -20% de performance." },
  { moment: "Pendant l'entraînement", conseil: '150-200ml toutes les 20 min', emoji: '🏃', detail: 'Par temps chaud, ajouter une pincée de sel de mer dans ta gourde (électrolytes).' },
  { moment: "Après l'entraînement", conseil: '500ml dans la première heure', emoji: '🔄', detail: 'Pour chaque kg perdu pendant l\'effort, boire 1.5L d\'eau (pèse-toi avant/après).' },
  { moment: 'Avant le match', conseil: "500ml dans l'heure précédant le match", emoji: '⚽', detail: 'Pas plus pour éviter la sensation de ventre plein. Boire à petites gorgées.' },
  { moment: 'Pendant le match', conseil: '150ml à chaque mi-temps + pendant les arrêts', emoji: '🥅', detail: 'En match, tu peux perdre entre 1 et 2.5L de sueur selon la température.' },
  { moment: 'Objectif journalier', conseil: '2.5 à 3L par jour (entraînement)', emoji: '💧', detail: 'Surveille la couleur de tes urines : jaune pâle = bien hydraté, jaune foncé = bois plus.' },
]

const SOUS_SECTIONS = [
  { id: 'macros', label: 'Les macros' },
  { id: 'comparateur', label: 'Comparateur' },
  { id: 'hydratation', label: 'Hydratation' },
]

const NOTE_LABELS = { good: 'Bon choix', warning: 'Avec modération', danger: 'À éviter' }

export default function EducationNutrition({ sousSection, setSousSection, profil }) {
  const colors = useColors()
  const noteCouleur = { good: colors.accent.green, warning: colors.accent.amber, danger: colors.accent.red }
  const card = { background: colors.background.surface, border: `1px solid ${colors.border.subtle}`, borderRadius: '12px', padding: '20px', marginBottom: '14px' }
  const badge = (color) => ({ background: color + '18', border: `1px solid ${color}`, color, borderRadius: '20px', padding: '3px 12px', fontSize: '11px', fontWeight: 700, display: 'inline-block' })

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {SOUS_SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSousSection(s.id)}
            style={{
              background: sousSection === s.id ? colors.accent.green : colors.background.raised,
              color: sousSection === s.id ? colors.black : colors.text.dim,
              border: `1px solid ${sousSection === s.id ? colors.accent.green : colors.border.default}`,
              borderRadius: '20px', padding: '7px 16px', fontSize: '12px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Inter, sans-serif',
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {sousSection === 'macros' && (
        <div>
          {MACROS_EXPLICATION(profil, colors).map(macro => (
            <MacroCard key={macro.nom} macro={macro} colors={colors} card={card} />
          ))}
        </div>
      )}

      {sousSection === 'comparateur' && (
        <div>
          <p style={{ color: colors.text.faint, fontSize: '13px', marginBottom: '16px' }}>
            Ce que contient vraiment ce que tu manges au quotidien — pour faire les bons choix.
          </p>
          {['Fast-food', 'Boissons', 'Snacks'].map(cat => (
            <div key={cat} style={card}>
              <div style={{ color: colors.text.primary, fontWeight: 700, fontSize: '13px', marginBottom: '14px' }}>{cat}</div>
              {ALIMENTS_QUOTIDIEN.filter(a => a.categorie === cat).map(item => (
                <div key={item.aliment} style={{ borderBottom: `1px solid ${colors.border.subtle}`, paddingBottom: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '22px' }}>{item.emoji}</span>
                      <span style={{ color: colors.text.primary, fontWeight: 600, fontSize: '14px' }}>{item.aliment}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: noteCouleur[item.note], fontWeight: 800, fontSize: '15px' }}>{item.cal} kcal</div>
                      <span style={badge(noteCouleur[item.note])}>{NOTE_LABELS[item.note]}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '6px' }}>
                    {[['P', item.prot, colors.accent.green], ['G', item.gluc, colors.accent.amber], ['L', item.lip, colors.accent.orange]].map(([l, v, c]) => (
                      <span key={l} style={{ color: c, fontSize: '12px' }}><b>{l}:</b> {v}g</span>
                    ))}
                  </div>
                  <p style={{ color: colors.text.faint, fontSize: '12px', margin: 0, fontStyle: 'italic' }}>{item.commentaire}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {sousSection === 'hydratation' && (
        <div>
          <div style={{ ...card, background: colors.accent.blue + '12', borderColor: colors.accent.blue + '44' }}>
            <div style={{ color: colors.accent.blue, fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>Le footballeur transpire en moyenne 1.5L par heure</div>
            <p style={{ color: colors.text.faint, fontSize: '13px', margin: 0 }}>Une déshydratation de seulement 2% du poids corporel = baisse de 20% des performances physiques et cognitives.</p>
          </div>
          {HYDRATATION.map((h, i) => (
            <div key={i} style={{ ...card, display: 'flex', gap: '14px' }}>
              <div style={{ fontSize: '28px', flexShrink: 0 }}>{h.emoji}</div>
              <div>
                <div style={{ color: colors.accent.blue, fontWeight: 700, fontSize: '12px', marginBottom: '2px' }}>{h.moment}</div>
                <div style={{ color: colors.text.primary, fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{h.conseil}</div>
                <p style={{ color: colors.text.faint, fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{h.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MacroCard({ macro, colors, card }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <div style={{ ...card, borderLeft: `3px solid ${macro.couleur}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOuvert(o => !o)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px' }}>{macro.emoji}</span>
          <div>
            <div style={{ color: colors.text.primary, fontWeight: 800, fontSize: '15px' }}>{macro.nom}</div>
            <div style={{ color: colors.text.faint, fontSize: '12px' }}>{macro.kcal_par_g} kcal / gramme</div>
          </div>
        </div>
        <span style={{ color: macro.couleur, fontSize: '18px' }}>{ouvert ? '▲' : '▼'}</span>
      </div>

      {ouvert && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
            <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>C'EST QUOI ?</div>
            <p style={{ color: colors.text.secondary, fontSize: '13px', margin: 0, lineHeight: 1.6 }}>{macro.role}</p>
          </div>

          <div style={{ background: colors.background.raised, borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
            <div style={{ color: colors.text.faint, fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>TON OBJECTIF</div>
            <p style={{ color: macro.couleur, fontSize: '13px', fontWeight: 700, margin: 0 }}>{macro.objectif}</p>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>BONNES SOURCES</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {macro.sources_bonnes.map((src, i) => (
                <div key={i} style={{ background: colors.accent.green + '0f', border: `1px solid ${colors.accent.green}26`, borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '16px', marginBottom: '2px' }}>{src.icon}</div>
                  <div style={{ color: colors.text.secondary, fontSize: '11px' }}>{src.aliment}</div>
                  <div style={{ color: colors.accent.green, fontSize: '11px', fontWeight: 700 }}>{src.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ color: colors.accent.red, fontSize: '11px', fontWeight: 700, marginBottom: '8px' }}>À LIMITER</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {macro.sources_mauvaises.map((src, i) => (
                <div key={i} style={{ background: colors.accent.red + '0f', border: `1px solid ${colors.accent.red}26`, borderRadius: '8px', padding: '8px 10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px' }}>{src.icon}</span>
                  <div>
                    <div style={{ color: colors.text.secondary, fontSize: '12px' }}>{src.aliment}</div>
                    <div style={{ color: colors.accent.red, fontSize: '11px' }}>{src.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: colors.accent.amber + '0f', border: `1px solid ${colors.accent.amber}33`, borderRadius: '8px', padding: '10px' }}>
            <div style={{ color: colors.accent.amber, fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>CONSEIL PRO</div>
            <p style={{ color: colors.text.secondary, fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{macro.conseil}</p>
          </div>
        </div>
      )}
    </div>
  )
}
