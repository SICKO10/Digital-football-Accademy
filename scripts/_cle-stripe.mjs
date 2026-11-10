/* global process */
// Saisie de la clé secrète Stripe dans le terminal : rien ne s'affiche, rien n'est écrit.
export function demanderCle() {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error('Terminal interactif requis pour saisir la clé, ou utilise STRIPE_OUTILS_SECRET_KEY.'))
    process.stdout.write('Colle ta clé secrète Stripe (rien ne s\'affiche), puis Entrée : ')
    let saisie = ''
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    const fin = (err) => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.off('data', surDonnees)
      process.stdout.write('\n')
      err ? reject(err) : resolve(saisie.trim())
    }
    const surDonnees = (morceau) => {
      for (const c of morceau) {
        if (c === '\r' || c === '\n') return fin()
        if (c === '\u0003') return fin(new Error('Annulé.'))
        if (c === '\u007f') saisie = saisie.slice(0, -1)
        else saisie += c
      }
    }
    process.stdin.on('data', surDonnees)
  })
}
