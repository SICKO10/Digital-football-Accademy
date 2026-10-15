import { demanderSignatureImage, ajouterChampsSignes, urlUploadCloudinary } from './signatureUpload'

// Schémas tactiques (Tactipad, scanner de procédés) : le PNG était stocké
// tel quel en base (data URL de plusieurs centaines de Ko par procédé), ce
// qui alourdissait la Bibliothèque et les fiches de séance. Il est désormais
// envoyé sur Cloudinary et seul son lien est enregistré (schema_png garde son
// nom : il contient une URL au lieu d'une data URL). schema_data, les
// données d'édition du Tactipad, ne change pas.

const DATA_URL_IMAGE = /^data:image\/(png|jpe?g|webp);base64,/i

// Envoie une image en data URL et renvoie son lien Cloudinary. Ne fait rien
// pour une valeur déjà hébergée ou un schéma SVG généré par l'IA (léger). En
// cas d'échec, renvoie la data URL d'origine : le schéma reste enregistrable
// comme avant, jamais perdu.
export async function envoyerSchema(valeur) {
  if (typeof valeur !== 'string' || !DATA_URL_IMAGE.test(valeur)) return valeur
  try {
    const blob = await (await fetch(valeur)).blob()
    const sig = await demanderSignatureImage({ usage: 'schema' })
    const formData = ajouterChampsSignes(new FormData(), sig)
    formData.append('file', blob, 'schema.png')
    const res = await fetch(urlUploadCloudinary(sig), { method: 'POST', body: formData })
    const data = await res.json().catch(() => ({}))
    return res.ok && data.secure_url ? data.secure_url : valeur
  } catch {
    return valeur
  }
}

// Remplace une data URL par son lien Cloudinary une fois l'envoi terminé,
// sans bloquer l'interface : appliquer(lien) n'est appelé que si l'envoi a
// réussi, au parent de ne l'écrire que si le schéma n'a pas changé entre-temps.
export function remplacerSchemaParLien(valeur, appliquer) {
  if (typeof valeur !== 'string' || !DATA_URL_IMAGE.test(valeur)) return
  envoyerSchema(valeur).then(lien => { if (lien !== valeur) appliquer(lien) })
}

// Version réduite pour les miniatures (cartes de la Bibliothèque, vignettes) :
// transformation Cloudinary à la volée, quelques dizaines de Ko au lieu de
// l'original. Toute autre valeur (data URL, SVG IA) est renvoyée telle quelle.
export function miniatureSchema(valeur, largeur = 400) {
  if (typeof valeur !== 'string' || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(valeur)) return valeur
  return valeur.replace('/image/upload/', `/image/upload/w_${largeur},c_limit,f_auto,q_auto/`)
}
