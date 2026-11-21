"use strict";

const assert = require("assert");
const GameLogic = require("../js/game.js");

function configPour(n) {
  const killers = [];
  const armes = [];
  const lieux = [];
  for (let i = 0; i < n; i++) {
    killers.push("K" + i);
    armes.push("arme-" + i);
  }
  for (let i = 0; i < Math.ceil(n / 2); i++) {
    lieux.push("lieu-" + i);
  }
  return { killers: killers, armes: armes, lieux: lieux };
}

let tests = 0;
function ok(cond, msg) {
  assert.ok(cond, msg);
  tests++;
}

for (let n = 2; n <= 12; n++) {
  for (let essai = 0; essai < 200; essai++) {
    const res = GameLogic.generatePartie(configPour(n));
    ok(res.errors.length === 0, "pas d'erreur pour n=" + n);
    ok(res.missions.length === n, "n missions pour n=" + n);

    const victimes = res.missions.map(function (m) { return m.victime; });
    const setK = new Set(res.missions.map(function (m) { return m.killer; }));
    ok(setK.size === n, "killers tous distincts");
    ok(new Set(victimes).size === n, "chaque joueur est victime exactement une fois (boucle)");
    res.missions.forEach(function (m) {
      ok(m.killer !== m.victime, "personne ne se tue soi-même");
    });
    const cycleValide = res.missions.every(function (m) {
      const next = res.missions.find(function (x) { return x.killer === m.victime; });
      return !!next;
    });
    ok(cycleValide, "la chaîne des victimes forme un cycle fermé");

    const armes = res.missions.map(function (m) { return m.arme; });
    ok(new Set(armes).size === n, "armes toutes uniques (une seule fois chacune)");

    const compteLieux = {};
    res.missions.forEach(function (m) {
      compteLieux[m.lieu] = (compteLieux[m.lieu] || 0) + 1;
    });
    Object.keys(compteLieux).forEach(function (l) {
      ok(compteLieux[l] <= 2, "lieu " + l + " attribué au max 2 fois");
    });

    ok(res.ordreRevelation.length === n, "ordre de révélation complet");
    ok(new Set(res.ordreRevelation).size === n, "ordre de révélation sans doublon");
  }
}

let v = GameLogic.validateConfig({ killers: ["A"], armes: ["x"], lieux: ["y"] });
ok(v.errors.some(function (e) { return e.includes("au moins 2 killers"); }), "erreur: moins de 2 killers");

v = GameLogic.validateConfig({ killers: ["A", "B", "C"], armes: ["x", "y"], lieux: ["l1", "l2"] });
ok(v.errors.some(function (e) { return e.includes("armes"); }), "erreur: pas assez d'armes");

v = GameLogic.validateConfig({ killers: ["A", "B", "C", "D", "E"], armes: ["a", "b", "c", "d", "e"], lieux: ["l1", "l2"] });
ok(v.errors.some(function (e) { return e.includes("lieu"); }), "erreur: pas assez de lieux (5 killers -> 3 lieux min)");

v = GameLogic.validateConfig({ killers: ["A", "A", "  ", "B"], armes: ["a", "b"], lieux: ["l1"] });
ok(v.killers.length === 2 && v.killers[0] === "A" && v.killers[1] === "B", "normalisation: doublons et vides retirés");

const partie = GameLogic.generatePartie(configPour(4));
const etat = GameLogic.creerEtat(partie);
ok(etat.vivants.length === 4, "4 vivants au départ");

const m0 = etat.missionsCourantes[0];
let r = GameLogic.enregistrerMeurtre(etat, m0.killer, "quelquun d'autre");
ok(!r.ok, "meurtre refusé si la victime n'est pas la bonne");

r = GameLogic.enregistrerMeurtre(etat, m0.killer, m0.victime);
ok(r.ok, "meurtre accepté quand la victime correspond");
const missionMaj = etat.missionsCourantes.find(function (m) { return m.killer === m0.killer; });
const missionVictime = partie.missions.find(function (m) { return m.killer === m0.victime; });
ok(missionMaj.victime === missionVictime.victime && missionMaj.lieu === missionVictime.lieu && missionMaj.arme === missionVictime.arme,
  "le tueur hérite de l'ordre de mission complet de sa victime");
ok(etat.vivants.length === 3 && !etat.vivants.includes(m0.victime), "la victime est retirée des vivants");

let dernierTueur = null;
while (!etat.terminee) {
  const vivant = etat.missionsCourantes[0];
  const res = GameLogic.enregistrerMeurtre(etat, vivant.killer, vivant.victime);
  assert.ok(res.ok, "meurtre valide dans la chaîne: " + JSON.stringify(res));
  dernierTueur = vivant.killer;
}
ok(etat.terminee && etat.gagnant === dernierTueur && etat.vivants.length === 1, "un seul gagnant à la fin");
r = GameLogic.enregistrerMeurtre(etat, dernierTueur, dernierTueur);
ok(!r.ok, "plus de meurtre possible après la fin");

console.log("✅ Tous les tests passent (" + tests + " assertions).");
