# murderpartyapp

🕵️ **Murder Party - Dossier Tournons d'Agenais** — application **100 % locale** qui génère et accompagne une partie de jeu grandeur nature façon « Cluedo » : chaque joueur (KILLER) reçoit un **ORDRE DE MISSION** (une VICTIME, un LIEU et une ARME) et doit amener sa victime dans le lieu pour la toucher avec l'arme, seul à seul dans la pièce. Celui qui réussit un meurtre récupère l'ordre de mission de sa victime. Il ne doit rester qu'un seul killer à la fin.

Aucun serveur, aucune installation : l'application s'ouvre dans le navigateur et fonctionne sur **Windows** comme sur **Linux (Ubuntu)**.

## ▶️ Lancer l'application

Ouvrir le fichier `index.html` dans un navigateur (double-clic, ou clic droit → « Ouvrir avec » → navigateur).

Alternative (si le navigateur bloque `localStorage` en `file://`) :

```bash
python3 -m http.server 8000
```

puis ouvrir <http://localhost:8000>.

## 🧭 Utilisation

1. **Onglet ⚙️ Configuration** — remplir les trois bacs :
   - 🔪 **ARMES** (chaque arme n'est attribuée qu'une seule fois),
   - 🚪 **LIEUX** (un lieu peut être attribué au maximum 2 fois),
   - 🕵️ **KILLERS** (les joueurs, minimum 2).
2. **Onglet 🎮 Partie** — cliquer sur **Générer la partie** : la boucle des victimes est tirée automatiquement (A tue B, B tue C, …, le dernier tue A).
3. **Cartons tampons 🃏** — chaque joueur vient à son tour devant l'ordinateur : l'écran affiche le carton tampon avec le nom du joueur attendu, il clique pour révéler son ordre de mission, puis remet le carton tampon avant de passer la main au joueur suivant.
4. **Suivi de partie** — le Maître du Jeu enregistre chaque meurtre ; le tueur hérite de l'ordre de mission de sa victime ; l'application annonce le gagnant quand il ne reste qu'un seul killer.
5. **Onglet 📄 Récapitulatif** — génère le document de fin de partie (rôles de chacun, historique des meurtres, gagnant), téléchargeable en `.html` ou imprimable.

## 📐 Règles implémentées

- Boucle fermée des victimes : avec A, B, C, D, E, F → A tue B, B tue C, …, F tue A.
- Chaque arme attribuée **une seule fois** (il faut au moins autant d'armes que de killers).
- Chaque lieu attribué **au maximum 2 fois** (il faut au moins ⌈killers/2⌉ lieux).
- Un killer ne peut jamais être sa propre victime.
- En cas de meurtre, le killer récupère l'intégralité de l'ordre de mission de sa victime.

## 🗂️ Structure

```
├── index.html          # page unique (3 onglets)
├── style.css           # thème sombre "enquête"
├── js/
│   ├── game.js         # logique pure (génération, validation, meurtres) — testable en Node
│   └── app.js          # interface (onglets, cartons tampons, suivi, récap)
└── test/
    └── test-game.js    # tests de la logique de génération
```

Les données (bacs, partie en cours) sont conservées dans le `localStorage` du navigateur.

## ✅ Tests

```bash
node test/test-game.js
```
