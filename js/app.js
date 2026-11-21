(function () {
  "use strict";

  const LS_CONFIG = "mdj.config.v1";
  const LS_PARTIE = "mdj.partie.v1";
  const LS_ETAT = "mdj.etat.v1";
  const LS_SESSION = "mdj.session.v1";

  const state = {
    config: { armes: [], lieux: [], killers: [] },
    partie: null,
    etat: null,
    revelationIndex: 0,
    phase: "intro",
    suiviMontre: false
  };

  function $(sel) {
    return document.querySelector(sel);
  }

  function $$ (sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function chargerJSON(cle, defaut) {
    try {
      const brut = localStorage.getItem(cle);
      if (!brut) return defaut;
      return JSON.parse(brut);
    } catch (e) {
      return defaut;
    }
  }

  function sauverJSON(cle, valeur) {
    localStorage.setItem(cle, JSON.stringify(valeur));
  }

  function chargerEtat() {
    state.config = chargerJSON(LS_CONFIG, state.config);
    state.partie = chargerJSON(LS_PARTIE, null);
    state.etat = chargerJSON(LS_ETAT, null);
    const session = chargerJSON(LS_SESSION, null);
    if (state.partie && state.etat && session) {
      state.phase = session.phase;
      state.revelationIndex = session.revelationIndex;
      state.suiviMontre = session.suiviMontre;
      if (state.phase === "revelation") {
        state.phase = "tampon";
      }
    } else {
      state.partie = null;
      state.etat = null;
      state.phase = "intro";
      state.revelationIndex = 0;
      state.suiviMontre = false;
    }
  }

  function sauverSession() {
    sauverJSON(LS_SESSION, {
      phase: state.phase === "revelation" ? "tampon" : state.phase,
      revelationIndex: state.revelationIndex,
      suiviMontre: state.suiviMontre
    });
  }

  function changerOnglet(nom) {
    $$(".tab-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === nom);
    });
    $$(".tab").forEach(function (s) {
      s.classList.toggle("active", s.id === "tab-" + nom);
    });
    if (nom === "partie") rendrePartie();
    if (nom === "recap") rendreRecapVide();
  }

  function rendreConfig() {
    ["armes", "lieux", "killers"].forEach(function (bac) {
      const ul = document.querySelector('.bac[data-bac="' + bac + '"] .liste');
      ul.innerHTML = "";
      state.config[bac].forEach(function (item, i) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = item;
        const btn = document.createElement("button");
        btn.className = "suppr";
        btn.textContent = "✖";
        btn.title = "Retirer";
        btn.addEventListener("click", function () {
          state.config[bac].splice(i, 1);
          sauverJSON(LS_CONFIG, state.config);
          rendreConfig();
        });
        li.appendChild(span);
        li.appendChild(btn);
        ul.appendChild(li);
      });
    });
    const v = GameLogic.validateConfig(state.config);
    $("#config-resume").textContent =
      "📦 " + state.config.armes.length + " arme(s) · " +
      state.config.lieux.length + " lieu(x) · " +
      state.config.killers.length + " killer(s)" +
      (v.errors.length ? " — ⚠️ " + v.errors.join(" ") : " — ✅ prêt à générer");
  }

  function ajouterItem(bac, valeur) {
    const v = String(valeur).trim();
    if (!v) return;
    const existe = state.config[bac].some(function (x) {
      return x.toLowerCase() === v.toLowerCase();
    });
    if (!existe) {
      state.config[bac].push(v);
      sauverJSON(LS_CONFIG, state.config);
    }
    rendreConfig();
  }

  function generer() {
    const resultat = GameLogic.generatePartie(state.config);
    const zoneErreurs = $("#partie-erreurs");
    if (resultat.errors.length > 0) {
      zoneErreurs.hidden = false;
      zoneErreurs.innerHTML = "<b>Impossible de générer la partie :</b><ul><li>" +
        resultat.errors.join("</li><li>") + "</li></ul>";
      return;
    }
    zoneErreurs.hidden = true;
    state.partie = resultat;
    state.etat = GameLogic.creerEtat(resultat);
    state.revelationIndex = 0;
    state.phase = "tampon";
    state.suiviMontre = false;
    sauverJSON(LS_PARTIE, resultat);
    sauverJSON(LS_ETAT, state.etat);
    sauverSession();
    rendrePartie();
  }

  function rendrePartie() {
    const intro = $("#partie-intro");
    const jeu = $("#partie-jeu");
    const aPartie = !!state.partie;
    intro.hidden = aPartie;
    $("#btn-regenerer").hidden = !aPartie;
    jeu.hidden = !aPartie;
    if (!aPartie) return;

    const tampon = $("#carton-tampon");
    const mission = $("#mission-carte");
    const fin = $("#distribution-terminee");
    const suivi = $("#suivi");

    const distributionTerminee = state.revelationIndex >= state.partie.ordreRevelation.length;

    tampon.hidden = state.phase !== "tampon";
    mission.hidden = state.phase !== "revelation";
    fin.hidden = !(state.phase === "distribuee" || (state.phase === "jeu" && distributionTerminee && !state.suiviMontre));
    suivi.hidden = !(state.phase === "jeu" && distributionTerminee && state.suiviMontre);

    if (state.phase === "tampon") {
      const joueur = state.partie.ordreRevelation[state.revelationIndex];
      $("#tampon-texte").innerHTML =
        "🃏 <b>" + escapeHTML(joueur) + "</b>, c'est à toi de venir devant l'ordinateur.<br>Assure-toi que personne d'autre ne regarde l'écran.";
      $("#btn-reveler").textContent = "Enlever le carton tampon — révéler la mission de " + joueur;
    }
    if (state.phase === "revelation") {
      const joueur = state.partie.ordreRevelation[state.revelationIndex];
      const m = state.partie.missions.find(function (x) { return x.killer === joueur; });
      $("#mission-killer").textContent = joueur;
      $("#mission-victime").textContent = m.victime;
      $("#mission-lieu").textContent = m.lieu;
      $("#mission-arme").textContent = m.arme;
    }
    if (suivi.hidden === false) rendreSuivi();
  }

  function revealMission() {
    state.phase = "revelation";
    sauverSession();
    rendrePartie();
  }

  function passerTampon() {
    state.revelationIndex++;
    if (state.revelationIndex >= state.partie.ordreRevelation.length) {
      state.phase = "distribuee";
    } else {
      state.phase = "tampon";
    }
    sauverSession();
    rendrePartie();
  }

  function allerSuivi() {
    state.suiviMontre = true;
    state.phase = "jeu";
    sauverSession();
    rendrePartie();
  }

  function rendreSuivi() {
    const vivants = state.etat.vivants;
    $("#suivi-vivants").textContent =
      "🕵️ Killers encore en vie : " + vivants.length + " — " + vivants.join(", ");
    const selTueur = $("#select-tueur");
    const selVictime = $("#select-victime");
    selTueur.innerHTML = "";
    selVictime.innerHTML = "";
    vivants.forEach(function (k) {
      const o1 = document.createElement("option");
      o1.value = k;
      o1.textContent = k;
      selTueur.appendChild(o1);
      const o2 = document.createElement("option");
      o2.value = k;
      o2.textContent = k;
      selVictime.appendChild(o2);
    });
    const hist = $("#suivi-historique");
    hist.innerHTML = "";
    if (state.etat.historique.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Aucun meurtre enregistré pour l'instant.";
      hist.appendChild(li);
    } else {
      state.etat.historique.forEach(function (h) {
        const li = document.createElement("li");
        const d = new Date(h.date);
        li.textContent = "💀 " + h.tueur + " a tué " + h.victime +
          " (" + d.toLocaleString("fr-FR") + ") — " + h.tueur + " hérite de la mission de " + h.victime + ".";
        hist.appendChild(li);
      });
    }
    const g = $("#suivi-gagnant");
    if (state.etat.terminee) {
      g.hidden = false;
      g.textContent = "🏆 Partie terminée ! Il ne reste qu'un seul killer : " + state.etat.gagnant + " !";
      $("#suivi-form").style.display = "none";
    } else {
      g.hidden = true;
      $("#suivi-form").style.display = "flex";
    }
  }

  function enregistrerMeurtreUI() {
    const tueur = $("#select-tueur").value;
    const victime = $("#select-victime").value;
    const res = GameLogic.enregistrerMeurtre(state.etat, tueur, victime);
    const msg = $("#suivi-message");
    msg.hidden = false;
    if (res.ok) {
      msg.className = "message ok";
      msg.textContent = "💀 Meurtre enregistré : " + tueur + " a tué " + victime + ". " + tueur + " récupère l'ordre de mission de " + victime + ".";
    } else {
      msg.className = "message ko";
      msg.textContent = "⚠️ " + res.erreur;
    }
    sauverJSON(LS_ETAT, state.etat);
    sauverSession();
    rendreSuivi();
    rendrePartie();
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function construireDocRecap() {
    const e = state.etat;
    const lignesInitiales = e.missionsInitiales.map(function (m) {
      return "<tr><td>" + escapeHTML(m.killer) + "</td><td>" + escapeHTML(m.victime) +
        "</td><td>" + escapeHTML(m.lieu) + "</td><td>" + escapeHTML(m.arme) + "</td></tr>";
    }).join("");
    const lignesHist = e.historique.map(function (h) {
      return "<li>" + escapeHTML(h.tueur) + " a tué " + escapeHTML(h.victime) + "</li>";
    }).join("");
    const gagnant = e.terminee
      ? "<p><b>🏆 Gagnant (dernier killer en vie) :</b> " + escapeHTML(e.gagnant) + "</p>"
      : "<p><b>Partie non terminée.</b> Killers encore en vie : " +
        e.vivants.map(escapeHTML).join(", ") + ".</p>";
    const date = new Date().toLocaleString("fr-FR");
    return "<!DOCTYPE html><html lang=\"fr\"><head><meta charset=\"UTF-8\"><title>Récapitulatif de partie — Murder Party - Dossier Tournons d'Agenais</title>" +
      "<style>body{font-family:Arial,sans-serif;margin:40px;color:#1a1a1a;}h1{color:#8f1d2c;}table{border-collapse:collapse;width:100%;margin:16px 0;}" +
      "th,td{border:1px solid #999;padding:8px 12px;text-align:left;}th{background:#f0e6ea;}.date{color:#555;font-size:.9em;}</style></head><body>" +
      "<h1>📄 Récapitulatif de fin de partie</h1>" +
      "<p class=\"date\">Généré le " + escapeHTML(date) + " — application « Murder Party - Dossier Tournons d'Agenais »</p>" +
      "<h2>Ordres de mission distribués en début de partie</h2>" +
      "<table><thead><tr><th>Killer</th><th>Victime</th><th>Lieu</th><th>Arme</th></tr></thead><tbody>" +
      lignesInitiales + "</tbody></table>" +
      "<h2>Déroulement de la partie</h2><ul>" + (lignesHist || "<li>Aucun meurtre enregistré.</li>") + "</ul>" +
      gagnant + "</body></html>";
  }

  function rendreRecapVide() {
    const contenu = $("#recap-contenu");
    const actions = $("#recap-actions");
    if (!state.etat) {
      contenu.innerHTML = "<p class=\"aide\">Aucune partie générée pour l'instant. Va dans l'onglet <b>Partie</b> pour en lancer une.</p>";
      actions.hidden = true;
      return;
    }
    contenu.innerHTML = "";
    actions.hidden = false;
  }

  function genererRecap() {
    if (!state.etat) return;
    const doc = construireDocRecap();
    const contenu = $("#recap-contenu");
    contenu.innerHTML = '<div class="recap-doc">' +
      doc.replace(/^<!DOCTYPE html>[\s\S]*?<body>/, "").replace(/<\/body>[\s\S]*$/, "") +
      "</div>";
    $("#recap-actions").hidden = false;
    window.__dernierRecap = doc;
  }

  function telechargerRecap() {
    const doc = window.__dernierRecap || construireDocRecap();
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, "0"); };
    a.href = url;
    a.download = "recap-partie-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
      "-" + pad(d.getHours()) + pad(d.getMinutes()) + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function initialiser() {
    chargerEtat();

    $$(".tab-btn").forEach(function (b) {
      b.addEventListener("click", function () { changerOnglet(b.dataset.tab); });
    });

    $$(".bac").forEach(function (bac) {
      const nom = bac.dataset.bac;
      const form = bac.querySelector(".add-form");
      const input = form.querySelector("input");
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        ajouterItem(nom, input.value);
        input.value = "";
        input.focus();
      });
    });

    $("#btn-generer").addEventListener("click", generer);
    $("#btn-regenerer").addEventListener("click", function () {
      if (window.confirm("Regénérer une nouvelle partie ? La partie en cours et son suivi seront perdus.")) {
        generer();
      }
    });
    $("#btn-reveler").addEventListener("click", revealMission);
    $("#btn-passer").addEventListener("click", passerTampon);
    $("#btn-suivi").addEventListener("click", allerSuivi);
    $("#btn-meurtre").addEventListener("click", enregistrerMeurtreUI);
    $("#btn-recap").addEventListener("click", genererRecap);
    $("#btn-telecharger").addEventListener("click", telechargerRecap);
    $("#btn-imprimer").addEventListener("click", function () { window.print(); });

    rendreConfig();
    rendrePartie();
  }

  document.addEventListener("DOMContentLoaded", initialiser);
})();
