(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GameLogic = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function normalizeList(list) {
    const seen = new Set();
    const out = [];
    (list || []).forEach(function (item) {
      const v = String(item).trim();
      const key = v.toLowerCase();
      if (v && !seen.has(key)) {
        seen.add(key);
        out.push(v);
      }
    });
    return out;
  }

  function validateConfig(config) {
    const killers = normalizeList(config.killers);
    const armes = normalizeList(config.armes);
    const lieux = normalizeList(config.lieux);
    const errors = [];
    if (killers.length < 2) {
      errors.push("Il faut au moins 2 killers pour générer une partie.");
    }
    if (armes.length < killers.length) {
      errors.push(
        "Il faut au moins autant d'armes que de killers (" +
          armes.length +
          "/" +
          killers.length +
          ") : chaque arme n'est attribuée qu'une seule fois."
      );
    }
    const minLieux = killers.length > 0 ? Math.ceil(killers.length / 2) : 1;
    if (lieux.length < minLieux) {
      errors.push(
        "Il faut au moins " +
          minLieux +
          " lieu(x) distinct(s) (un lieu peut être attribué au maximum 2 fois)."
      );
    }
    return { errors: errors, killers: killers, armes: armes, lieux: lieux };
  }

  function generatePartie(config) {
    const v = validateConfig(config);
    if (v.errors.length > 0) {
      return { errors: v.errors, missions: [], ordreRevelation: [] };
    }
    const n = v.killers.length;
    const cycle = shuffle(v.killers);
    const armes = shuffle(v.armes).slice(0, n);
    const lieuxPool = shuffle(
      v.lieux.reduce(function (acc, l) {
        return acc.concat([l, l]);
      }, [])
    ).slice(0, n);
    const missions = cycle.map(function (killer, i) {
      return {
        killer: killer,
        victime: cycle[(i + 1) % n],
        lieu: lieuxPool[i],
        arme: armes[i]
      };
    });
    return {
      errors: [],
      missions: missions,
      ordreRevelation: shuffle(cycle.slice())
    };
  }

  function creerEtat(partie) {
    return {
      missionsInitiales: partie.missions.map(function (m) {
        return Object.assign({}, m);
      }),
      missionsCourantes: partie.missions.map(function (m) {
        return Object.assign({}, m);
      }),
      vivants: partie.missions.map(function (m) {
        return m.killer;
      }),
      historique: [],
      terminee: false,
      gagnant: null
    };
  }

  function enregistrerMeurtre(etat, tueur, victime) {
    if (etat.terminee) {
      return { ok: false, erreur: "La partie est déjà terminée." };
    }
    const mT = etat.missionsCourantes.find(function (m) {
      return m.killer === tueur;
    });
    const mV = etat.missionsCourantes.find(function (m) {
      return m.killer === victime;
    });
    if (!mT) return { ok: false, erreur: "Killer inconnu : " + tueur };
    if (!mV) return { ok: false, erreur: "Victime inconnue ou déjà éliminée : " + victime };
    if (mT.victime !== victime) {
      return {
        ok: false,
        erreur: tueur + " n'a pas pour victime " + victime + " (sa victime est " + mT.victime + ")."
      };
    }
    etat.missionsCourantes = etat.missionsCourantes.filter(function (m) {
      return m.killer !== victime;
    });
    const idx = etat.missionsCourantes.findIndex(function (m) {
      return m.killer === tueur;
    });
    etat.missionsCourantes[idx] = {
      killer: tueur,
      victime: mV.victime,
      lieu: mV.lieu,
      arme: mV.arme
    };
    etat.vivants = etat.vivants.filter(function (k) {
      return k !== victime;
    });
    etat.historique.push({
      tueur: tueur,
      victime: victime,
      date: new Date().toISOString()
    });
    if (etat.vivants.length === 1) {
      etat.terminee = true;
      etat.gagnant = etat.vivants[0];
    }
    return { ok: true };
  }

  return {
    shuffle: shuffle,
    normalizeList: normalizeList,
    validateConfig: validateConfig,
    generatePartie: generatePartie,
    creerEtat: creerEtat,
    enregistrerMeurtre: enregistrerMeurtre
  };
});
