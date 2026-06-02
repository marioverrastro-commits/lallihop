/* ===== LALLI-HOP APP ===== */

// Navigazione tra schermate
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  // Ricarica dati alla navigazione
  if (id === 'screen-ordini') caricaOrdini();
  if (id === 'screen-spese') caricaSpese();
  if (id === 'screen-clienti') caricaClienti();
  if (id === 'screen-stats') caricaStats();
  if (id === 'screen-home') { aggiornaMetriche(); aggiornaOrdiniRecenti(); }
}

// Mesi in italiano
const MESI = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'
];

let meseCorrente = new Date().getMonth();
let annoCorrente = new Date().getFullYear();

function aggiornaLabelMese() {
  const el = document.getElementById('month-label');
  if (el) el.textContent = `${MESI[meseCorrente]} ${annoCorrente}`;
}

document.getElementById('prev-month')?.addEventListener('click', () => {
  meseCorrente--;
  if (meseCorrente < 0) { meseCorrente = 11; annoCorrente--; }
  aggiornaLabelMese();
  aggiornaMetriche();
  aggiornaOrdiniRecenti();
});

document.getElementById('next-month')?.addEventListener('click', () => {
  meseCorrente++;
  if (meseCorrente > 11) { meseCorrente = 0; annoCorrente++; }
  aggiornaLabelMese();
  aggiornaMetriche();
  aggiornaOrdiniRecenti();
});

// ===== QUANTITÀ =====
let ordineQty = 1;

function cambiaQty(delta) {
  ordineQty = Math.max(1, ordineQty + delta);
  const el = document.getElementById('ordine-qty');
  if (el) el.textContent = ordineQty;
}

// ===== CHIP SELECTOR =====
function selectChip(el, groupId) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

// ===== DATA DI DEFAULT =====
function setDataOggi() {
  const oggi = new Date();
  const yyyy = oggi.getFullYear();
  const mm = String(oggi.getMonth() + 1).padStart(2, '0');
  const dd = String(oggi.getDate()).padStart(2, '0');
  const dataStr = `${yyyy}-${mm}-${dd}`;
  const inputSpesa = document.getElementById('spesa-data');
  const inputOrdine = document.getElementById('ordine-data');
  if (inputSpesa) inputSpesa.value = dataStr;
  if (inputOrdine) inputOrdine.value = dataStr;
}

// ===== SALVA SPESA =====
// I dati vengono salvati nel localStorage del browser
function salvaSpesa() {
  const categoriaEl = document.querySelector('#chip-categoria .chip.selected');
  const importo = parseFloat(document.getElementById('spesa-importo').value);
  const data = document.getElementById('spesa-data').value;
  const nota = document.getElementById('spesa-nota').value.trim();
  const feedback = document.getElementById('spesa-feedback');

  // Validazione
  if (!categoriaEl) {
    mostraFeedback(feedback, '⚠️ Seleziona una categoria', 'error');
    return;
  }
  if (!importo || importo <= 0) {
    mostraFeedback(feedback, '⚠️ Inserisci un importo valido', 'error');
    return;
  }
  if (!data) {
    mostraFeedback(feedback, '⚠️ Inserisci la data', 'error');
    return;
  }

  const spesa = {
    id: Date.now(),
    tipo: 'spesa',
    categoria: categoriaEl.dataset.value,
    importo: importo,
    data: data,
    nota: nota
  };

  // Salva in localStorage
  const spese = JSON.parse(localStorage.getItem('lallihop_spese') || '[]');
  spese.push(spesa);
  localStorage.setItem('lallihop_spese', JSON.stringify(spese));

  mostraFeedback(feedback, '✅ Spesa salvata!', 'success');
  resetFormSpesa();
  aggiornaMetriche();

  setTimeout(() => showScreen('screen-home'), 1200);
}

function mostraFeedback(el, testo, tipo) {
  el.textContent = testo;
  el.className = `feedback ${tipo}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2500);
}

function resetFormSpesa() {
  document.querySelectorAll('#chip-categoria .chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('spesa-importo').value = '';
  document.getElementById('spesa-nota').value = '';
  setDataOggi();
}

// ===== AGGIORNA METRICHE HOME =====
function aggiornaMetriche() {
  const spese = JSON.parse(localStorage.getItem('lallihop_spese') || '[]');
  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  const mese = meseCorrente;
  const anno = annoCorrente;

  const speseDelMese = spese.filter(s => {
    const d = new Date(s.data);
    return d.getMonth() === mese && d.getFullYear() === anno;
  });

  const ordiniDelMese = ordini.filter(o => {
    const d = new Date(o.data);
    return d.getMonth() === mese && d.getFullYear() === anno && o.stato !== 'Annullato';
  });

  const totaleSpese = speseDelMese.reduce((acc, s) => acc + s.importo, 0);

  let totaleEntrate = 0;
  ordini.forEach(o => {
    if (o.stato === 'Annullato') return;
    if (o.accontoData) {
      const d = new Date(o.accontoData);
      if (d.getMonth() === mese && d.getFullYear() === anno) totaleEntrate += (o.acconto || 0);
    }
    if (o.saldoData) {
      const d = new Date(o.saldoData);
      if (d.getMonth() === mese && d.getFullYear() === anno) totaleEntrate += (o.saldo || 0);
    }
    if (!o.accontoData && !o.saldoData) {
      const d = new Date(o.data);
      if (d.getMonth() === mese && d.getFullYear() === anno) totaleEntrate += o.prezzo;
    }
  });

  const ordiniAperti = ordini.filter(o =>
    o.stato === 'In attesa' || o.stato === 'In lavorazione'
  ).length;

  const elSpese = document.getElementById('metric-spese');
  const elEntrate = document.getElementById('metric-entrate');
  const elMargine = document.getElementById('metric-margine');
  const elOrdini = document.getElementById('metric-ordini');

  if (elSpese) elSpese.textContent = `€ ${totaleSpese.toFixed(0)}`;
  if (elEntrate) elEntrate.textContent = `€ ${totaleEntrate.toFixed(0)}`;
  if (elMargine) elMargine.textContent = `€ ${margine.toFixed(0)}`;
  if (elOrdini) elOrdini.textContent = ordiniAperti;

  // Aggiorna barra obiettivo
  const obiettivo = 750;
  const pct = Math.min(100, Math.round((totaleEntrate / obiettivo) * 100));
  const elGoalValues = document.getElementById('goal-values');
  const elGoalFill = document.getElementById('goal-fill');
  const elGoalPct = document.getElementById('goal-pct');
  if (elGoalValues) elGoalValues.textContent = `€ ${totaleEntrate.toFixed(0)} / € ${obiettivo}`;
  if (elGoalFill) elGoalFill.style.width = `${pct}%`;
  if (elGoalPct) elGoalPct.textContent = `${pct}% raggiunto`;
}

// ===== TOGGLE RICAMO =====
function toggleRicamo(visibile) {
  const sezione = document.getElementById('sezione-ricamo');
  if (sezione) sezione.style.display = visibile ? 'flex' : 'none';
}

// ===== AUTOCOMPLETE CLIENTI =====
document.getElementById('ordine-cliente')?.addEventListener('input', function() {
  const val = this.value.toLowerCase().trim();
  const lista = document.getElementById('autocomplete-list');
  if (!val) { lista.style.display = 'none'; return; }

  const clienti = JSON.parse(localStorage.getItem('lallihop_clienti') || '[]');
  const trovati = clienti.filter(c => c.nome.toLowerCase().includes(val));

  if (trovati.length === 0) { lista.style.display = 'none'; return; }

  lista.innerHTML = trovati.map(c =>
    `<div class="autocomplete-item" onclick="selezionaCliente('${c.nome}')">${c.nome}</div>`
  ).join('');
  lista.style.display = 'block';
});

function selezionaCliente(nome) {
  document.getElementById('ordine-cliente').value = nome;
  document.getElementById('autocomplete-list').style.display = 'none';
}

// ===== SALVA ORDINE =====
function salvaOrdine() {
  const cliente = document.getElementById('ordine-cliente').value.trim();
  const prodottoEl = document.querySelector('#chip-prodotto .chip.selected');
  const prezzoVal = parseFloat(document.getElementById('ordine-prezzo').value);
  const canaleEl = document.querySelector('#chip-canale .chip.selected');
  const destinazioneEl = document.querySelector('#chip-destinazione .chip.selected');
  const pagamentoEl = document.querySelector('#chip-pagamento .chip.selected');
  const statoEl = document.querySelector('#chip-stato .chip.selected');
  const consegna = document.getElementById('ordine-consegna').value;
  const dataOrdine = document.getElementById('ordine-data').value || new Date().toISOString().split('T')[0];
  const ricamoEl = document.querySelector('#chip-ricamo .chip.selected');
  const ricamoDettaglio = document.getElementById('ordine-ricamo').value.trim();
  const note = document.getElementById('ordine-note').value.trim();
  const feedback = document.getElementById('ordine-feedback');

  if (!cliente) { mostraFeedback(feedback, '⚠️ Inserisci il nome del cliente', 'error'); return; }
  if (!prodottoEl) { mostraFeedback(feedback, '⚠️ Seleziona un prodotto', 'error'); return; }
  if (!prezzoVal || prezzoVal <= 0) { mostraFeedback(feedback, '⚠️ Inserisci un prezzo valido', 'error'); return; }
  if (!canaleEl) { mostraFeedback(feedback, '⚠️ Seleziona il canale', 'error'); return; }

  const ordine = {
    id: Date.now(),
    tipo: 'ordine',
    cliente: cliente,
    prodotto: prodottoEl.dataset.value,
    quantita: ordineQty,
    ore: parseFloat(prodottoEl.dataset.ore) || 0,
    prezzo: prezzoVal,
    canale: canaleEl.dataset.value,
    destinazione: destinazioneEl ? destinazioneEl.dataset.value : '',
    pagamento: pagamentoEl ? pagamentoEl.dataset.value : '',
    stato: statoEl ? statoEl.dataset.value : 'In attesa',
    consegna: consegna,
    ricamo: ricamoEl ? ricamoEl.dataset.value === 'si' : false,
    ricamoDettaglio: ricamoDettaglio,
    note: note,
    data: dataOrdine
  };

  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  ordini.push(ordine);
  localStorage.setItem('lallihop_ordini', JSON.stringify(ordini));

  aggiornaCliente(cliente, canaleEl.dataset.value);

  mostraFeedback(feedback, '✅ Ordine salvato!', 'success');
  resetFormOrdine();
  aggiornaMetriche();
  aggiornaOrdiniRecenti();

  setTimeout(() => showScreen('screen-home'), 1200);
}

function aggiornaCliente(nome, canale) {
  const clienti = JSON.parse(localStorage.getItem('lallihop_clienti') || '[]');
  const idx = clienti.findIndex(c => c.nome.toLowerCase() === nome.toLowerCase());
  if (idx >= 0) {
    clienti[idx].ordini = (clienti[idx].ordini || 0) + 1;
    clienti[idx].ultimoAcquisto = new Date().toISOString().split('T')[0];
  } else {
    clienti.push({ nome, canale, ordini: 1, ultimoAcquisto: new Date().toISOString().split('T')[0] });
  }
  localStorage.setItem('lallihop_clienti', JSON.stringify(clienti));
}

function resetFormOrdine() {
  document.getElementById('ordine-cliente').value = '';
  document.getElementById('ordine-prezzo').value = '';
  ordineQty = 1;
  const qtyEl = document.getElementById('ordine-qty');
  if (qtyEl) qtyEl.textContent = '1';
  document.getElementById('ordine-data').value = new Date().toISOString().split('T')[0];
  document.getElementById('ordine-consegna').value = '';
  document.getElementById('ordine-ricamo').value = '';
  document.getElementById('ordine-note').value = '';
  document.querySelectorAll('#chip-prodotto .chip, #chip-ricamo .chip, #chip-canale .chip, #chip-destinazione .chip, #chip-pagamento .chip').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('#chip-stato .chip').forEach(c => c.classList.remove('selected'));
  document.querySelector('#chip-stato .chip[data-value="In attesa"]')?.classList.add('selected');
  toggleRicamo(false);
}

// ===== AGGIORNA ORDINI RECENTI IN HOME =====
function aggiornaOrdiniRecenti() {
  const lista = document.getElementById('orders-preview');
  if (!lista) return;
  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  if (ordini.length === 0) return;

  const colori = { 'In attesa': 'yellow', 'In lavorazione': 'blue', 'Consegnato': 'green', 'Annullato': 'red' };
  const ultimi = ordini.slice(-3).reverse();

  lista.innerHTML = ultimi.map(o => `
    <div class="order-item">
      <span class="order-dot ${colori[o.stato] || 'yellow'}"></span>
      <div class="order-info">
        <span class="order-name">${o.cliente} — ${o.prodotto}${o.quantita > 1 ? ` × ${o.quantita}` : ''}</span>
        <span class="order-sub">${o.stato} · ${o.canale}</span>
      </div>
      <span class="order-price">€ ${o.prezzo.toFixed(0)}</span>
    </div>
  `).join('');
}

// ===== SCHERMATA ORDINI =====
let filtroCorrente = 'tutti';

function caricaOrdini() {
  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  const lista = document.getElementById('ordini-lista');
  const count = document.getElementById('ordini-count');
  if (!lista) return;

  const filtrati = filtroCorrente === 'tutti'
    ? ordini
    : ordini.filter(o => o.stato === filtroCorrente);

  const totale = filtrati.length;
  if (count) count.textContent = `${totale} ordin${totale === 1 ? 'e' : 'i'}`;

  if (totale === 0) {
    lista.innerHTML = '<p class="empty-state">Nessun ordine trovato.</p>';
    return;
  }

  const colori = { 'In attesa': 'yellow', 'In lavorazione': 'blue', 'Consegnato': 'green', 'Annullato': 'red' };
  const ordinati = [...filtrati].reverse();

  lista.innerHTML = ordinati.map(o => `
    <div class="ordine-card" onclick="apriModale(${o.id})">
      <span class="order-dot ${colori[o.stato] || 'yellow'}"></span>
      <div class="ordine-card-info">
        <span class="ordine-card-nome">${o.cliente} — ${o.prodotto}${o.quantita > 1 ? ` × ${o.quantita}` : ''}</span>
        <span class="ordine-card-sub">${o.canale}${o.consegna ? ' · consegna ' + formatData(o.consegna) : ''}</span>
        ${o.ricamo ? '<span class="ricamo-tag">✂️ ricamo</span>' : ''}
      </div>
      <div class="ordine-card-right">
        <span class="ordine-card-prezzo">€ ${o.prezzo.toFixed(0)}</span>
        <span class="badge-stato badge-${colori[o.stato]}">${o.stato}</span>
      </div>
    </div>
  `).join('');
}

function filtraOrdini(el) {
  document.querySelectorAll('.filtro').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  filtroCorrente = el.dataset.stato;
  caricaOrdini();
}

function formatData(dataStr) {
  if (!dataStr) return '';
  const d = new Date(dataStr);
  return `${d.getDate()} ${['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'][d.getMonth()]}`;
}

    ${totIncassato < o.prezzo ? `<div class="modale-row

function cambiaStato(id, nuovoStato) {
  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  const idx = ordini.findIndex(o => o.id === id);
  if (idx >= 0) {
    ordini[idx].stato = nuovoStato;
    localStorage.setItem('lallihop_ordini', JSON.stringify(ordini));
  }
  document.getElementById('modale-ordine').style.display = 'none';
  caricaOrdini();
  aggiornaMetriche();
  aggiornaOrdiniRecenti();
}

function eliminaOrdine(id) {
  if (!confirm('Eliminare questo ordine?')) return;
  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  const nuovi = ordini.filter(o => o.id !== id);
  localStorage.setItem('lallihop_ordini', JSON.stringify(nuovi));
  document.getElementById('modale-ordine').style.display = 'none';
  caricaOrdini();
  aggiornaMetriche();
  aggiornaOrdiniRecenti();
  showScreen('screen-home');
}

function chiudiModale(event) {
  if (event.target === document.getElementById('modale-ordine')) {
    document.getElementById('modale-ordine').style.display = 'none';
  }
}

// ===== SCHERMATA CLIENTI =====
function caricaClienti() {
  const lista = document.getElementById('clienti-lista');
  const count = document.getElementById('clienti-count');
  const search = document.getElementById('clienti-search')?.value.toLowerCase().trim() || '';
  if (!lista) return;

  const clienti = JSON.parse(localStorage.getItem('lallihop_clienti') || '[]');
  const ordini  = JSON.parse(localStorage.getItem('lallihop_ordini')  || '[]');

  const filtrati = clienti.filter(c => c.nome.toLowerCase().includes(search));
  if (count) count.textContent = `${filtrati.length} client${filtrati.length !== 1 ? 'i' : 'e'}`;

  if (filtrati.length === 0) {
    lista.innerHTML = search
      ? '<p class="empty-state">Nessun cliente trovato.</p>'
      : '<p class="empty-state">Nessun cliente ancora.<br>Appariranno automaticamente<br>quando salvi un ordine!</p>';
    return;
  }

  // Ordina per numero ordini decrescente
  const ordinati = [...filtrati].sort((a, b) => (b.ordini || 0) - (a.ordini || 0));

  lista.innerHTML = ordinati.map(c => {
    const iniziali = c.nome.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
    const totale = ordini
      .filter(o => o.cliente.toLowerCase() === c.nome.toLowerCase() && o.stato === 'Consegnato')
      .reduce((acc, o) => acc + o.prezzo, 0);

    const tags = [];
    if (c.tags?.includes('nuova'))    tags.push('<span class="tag tag-nuova">🌸 Nuova</span>');
    if (c.tags?.includes('abituale')) tags.push('<span class="tag tag-abituale">🔁 Abituale</span>');
    if (c.tags?.includes('vip'))      tags.push('<span class="tag tag-vip">⭐ VIP</span>');

    return `
      <div class="cliente-card" onclick="apriModaleCliente('${c.nome.replace(/'/g, "\\'")}')">
        <div class="avatar">${iniziali}</div>
        <div class="cliente-info">
          <span class="cliente-nome">${c.nome}</span>
          <span class="cliente-sub">${c.ordini || 0} ordine${(c.ordini||0) !== 1 ? 'i' : ''} · ${c.canale}${c.ultimoAcquisto ? ' · ' + formatData(c.ultimoAcquisto) : ''}</span>
          ${tags.length ? `<div class="cliente-tags">${tags.join('')}</div>` : ''}
        </div>
        ${totale > 0 ? `<span class="cliente-totale">€ ${totale.toFixed(0)}</span>` : ''}
      </div>
    `;
  }).join('');
}

let clienteCorrente = null;

function apriModaleCliente(nome) {
  const clienti = JSON.parse(localStorage.getItem('lallihop_clienti') || '[]');
  const ordini  = JSON.parse(localStorage.getItem('lallihop_ordini')  || '[]');
  const c = clienti.find(x => x.nome === nome);
  if (!c) return;

  clienteCorrente = c.nome;

  const ordiniCliente = ordini.filter(o => o.cliente.toLowerCase() === c.nome.toLowerCase());
  const totalePagato   = ordiniCliente.filter(o => o.pagato).reduce((acc, o) => acc + o.prezzo, 0);
  const totaleInSospeso = ordiniCliente.filter(o => !o.pagato && o.stato !== 'Annullato').reduce((acc, o) => acc + o.prezzo, 0);

  document.getElementById('modale-cliente-nome').textContent = c.nome;

  document.getElementById('modale-cliente-body').innerHTML = `
    <div class="modale-row"><span class="modale-row-label">Ordini totali</span><span class="modale-row-value">${c.ordini || 0}</span></div>
    <div class="modale-row">
      <span class="modale-row-label">✅ Pagato</span>
      <span class="modale-row-value" style="color:var(--green-dark)">€ ${totalePagato.toFixed(2)}</span>
    </div>
    ${totaleInSospeso > 0 ? `
    <div class="modale-row">
      <span class="modale-row-label">⚠️ Scoperto</span>
      <span class="modale-row-value" style="color:#DC2626">€ ${totaleInSospeso.toFixed(2)}</span>
    </div>` : ''}
    ${c.ultimoAcquisto ? `<div class="modale-row"><span class="modale-row-label">Ultimo ordine</span><span class="modale-row-value">${formatData(c.ultimoAcquisto)}</span></div>` : ''}
  `;

  // Storico ordini con toggle pagamento
  const storicoEl = document.getElementById('modale-cliente-ordini');
  if (ordiniCliente.length > 0) {
    const colori = { 'In attesa': 'yellow', 'In lavorazione': 'blue', 'Consegnato': 'green', 'Annullato': 'red' };
    storicoEl.innerHTML = `
      <p class="modale-ordini-title">Storico ordini</p>
      ${[...ordiniCliente].reverse().map(o => `
        <div class="modale-ordine-item">
          <span class="modale-ordine-nome">
            <span class="order-dot ${colori[o.stato]||'yellow'}" style="display:inline-block;margin-right:6px"></span>
            ${o.prodotto}
          </span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="modale-ordine-prezzo">€ ${o.prezzo.toFixed(0)}</span>
            <button class="btn-pagamento ${o.pagato ? 'pagato' : 'sospeso'}"
              onclick="togglePagamento(${o.id},'${c.nome.replace(/'/g,"\\'")}')">
              ${o.pagato ? '💰 Pagato' : '⚠️ Scoperto'}
            </button>
          </div>
        </div>
      `).join('')}
    `;
  } else {
    storicoEl.innerHTML = '';
  }

  // Mostra note scoperto solo se c'è uno scoperto
  const sezioneNote = document.getElementById('sezione-note-scoperto');
  const noteInput = document.getElementById('note-scoperto');
  if (sezioneNote && noteInput) {
    sezioneNote.style.display = totaleInSospeso > 0 ? 'flex' : 'none';
    noteInput.value = c.noteScroperto || '';
  }

  // Tag attivi
  const tags = c.tags || [];
  ['nuova','abituale','vip'].forEach(t => {
    const btn = document.getElementById(`btn-tag-${t}`);
    if (btn) btn.classList.toggle('selected', tags.includes(t));
  });

  document.getElementById('modale-cliente-elimina').onclick = () => eliminaCliente(c.nome);
  document.getElementById('modale-cliente').style.display = 'flex';
}

function togglePagamento(ordineId, nomeCliente) {
  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  const idx = ordini.findIndex(o => o.id === ordineId);
  if (idx < 0) return;
  ordini[idx].pagato = !ordini[idx].pagato;
  localStorage.setItem('lallihop_ordini', JSON.stringify(ordini));
  apriModaleCliente(nomeCliente);
  aggiornaMetriche();
}

function salvaNoteScroperto() {
  if (!clienteCorrente) return;
  const testo = document.getElementById('note-scoperto').value;
  const clienti = JSON.parse(localStorage.getItem('lallihop_clienti') || '[]');
  const idx = clienti.findIndex(c => c.nome === clienteCorrente);
  if (idx < 0) return;
  clienti[idx].noteScroperto = testo;
  localStorage.setItem('lallihop_clienti', JSON.stringify(clienti));
}

function toggleTag(tag) {
  if (!clienteCorrente) return;
  const clienti = JSON.parse(localStorage.getItem('lallihop_clienti') || '[]');
  const idx = clienti.findIndex(c => c.nome === clienteCorrente);
  if (idx < 0) return;

  const tags = clienti[idx].tags || [];
  const pos = tags.indexOf(tag);
  if (pos >= 0) tags.splice(pos, 1);
  else tags.push(tag);
  clienti[idx].tags = tags;
  localStorage.setItem('lallihop_clienti', JSON.stringify(clienti));

  const btn = document.getElementById(`btn-tag-${tag}`);
  if (btn) btn.classList.toggle('selected', tags.includes(tag));
  caricaClienti();
}

function eliminaCliente(nome) {
  if (!confirm(`Eliminare ${nome}?`)) return;
  const clienti = JSON.parse(localStorage.getItem('lallihop_clienti') || '[]');
  localStorage.setItem('lallihop_clienti', JSON.stringify(clienti.filter(c => c.nome !== nome)));
  document.getElementById('modale-cliente').style.display = 'none';
  caricaClienti();
}

function chiudiModaleCliente(event) {
  if (event.target === document.getElementById('modale-cliente')) {
    document.getElementById('modale-cliente').style.display = 'none';
  }
}

// ===== SCHERMATA SPESE =====
let filtroCatCorrente = 'tutti';

function caricaSpese() {
  const lista  = document.getElementById('spese-lista');
  const count  = document.getElementById('spese-count');
  if (!lista) return;

  const spese = JSON.parse(localStorage.getItem('lallihop_spese') || '[]');
  const filtrate = filtroCatCorrente === 'tutti'
    ? spese
    : spese.filter(s => s.categoria === filtroCatCorrente);

  const totale = filtrate.length;
  const totImporto = filtrate.reduce((a, s) => a + s.importo, 0);
  if (count) count.textContent = `${totale} voc${totale !== 1 ? 'i' : 'e'} · € ${totImporto.toFixed(0)}`;

  if (totale === 0) {
    lista.innerHTML = '<p class="empty-state">Nessuna spesa trovata.</p>';
    return;
  }

  const icone = {
    'Merceria': '🧵', 'Tessuti': '🪡', 'Packaging': '📦',
    'Grafica': '🎨', 'Fiere/Mercatini': '🎪', 'Altro': '➕'
  };

  lista.innerHTML = [...filtrate].reverse().map(s => `
    <div class="ordine-card" onclick="apriModaleSpesa(${s.id})">
      <span style="font-size:20px;flex-shrink:0">${icone[s.categoria] || '➕'}</span>
      <div class="ordine-card-info">
        <span class="ordine-card-nome">${s.categoria}</span>
        <span class="ordine-card-sub">${formatData(s.data)}${s.nota ? ' · ' + s.nota : ''}</span>
      </div>
      <div class="ordine-card-right">
        <span class="ordine-card-prezzo">− € ${s.importo.toFixed(2)}</span>
      </div>
    </div>
  `).join('');
}

function filtraSpese(el) {
  document.querySelectorAll('.filtri-bar .filtro').forEach(f => f.classList.remove('active'));
  el.classList.add('active');
  filtroCatCorrente = el.dataset.cat;
  caricaSpese();
}

function apriModaleSpesa(id) {
  const spese = JSON.parse(localStorage.getItem('lallihop_spese') || '[]');
  const s = spese.find(x => x.id === id);
  if (!s) return;

  document.getElementById('modale-spesa-titolo').textContent = s.categoria;
  document.getElementById('modale-spesa-body').innerHTML = `
    <div class="modale-row"><span class="modale-row-label">Categoria</span><span class="modale-row-value">${s.categoria}</span></div>
    <div class="modale-row"><span class="modale-row-label">Importo</span><span class="modale-row-value">€ ${s.importo.toFixed(2)}</span></div>
    <div class="modale-row"><span class="modale-row-label">Data</span><span class="modale-row-value">${formatData(s.data)}</span></div>
    ${s.nota ? `<div class="modale-row"><span class="modale-row-label">Nota</span><span class="modale-row-value">${s.nota}</span></div>` : ''}
  `;
  document.getElementById('modale-spesa-elimina').onclick = () => eliminaSpesa(s.id);
  document.getElementById('modale-spesa').style.display = 'flex';
}

function eliminaSpesa(id) {
  if (!confirm('Eliminare questa spesa?')) return;
  const spese = JSON.parse(localStorage.getItem('lallihop_spese') || '[]');
  localStorage.setItem('lallihop_spese', JSON.stringify(spese.filter(s => s.id !== id)));
  document.getElementById('modale-spesa').style.display = 'none';
  caricaSpese();
  aggiornaMetriche();
}

function chiudiModaleSpesa(event) {
  if (event.target === document.getElementById('modale-spesa')) {
    document.getElementById('modale-spesa').style.display = 'none';
  }
}

// ===== STATISTICHE =====
let statsAnno = new Date().getFullYear();
let statsMese = new Date().getMonth();
let statsModo = 'mese'; // 'mese' o 'anno'

document.getElementById('stats-prev-periodo')?.addEventListener('click', () => {
  if (statsModo === 'mese') {
    statsMese--; if (statsMese < 0) { statsMese = 11; statsAnno--; }
  } else { statsAnno--; }
  caricaStats();
});

document.getElementById('stats-next-periodo')?.addEventListener('click', () => {
  if (statsModo === 'mese') {
    statsMese++; if (statsMese > 11) { statsMese = 0; statsAnno++; }
  } else { statsAnno++; }
  caricaStats();
});

function aggiornaStatsModo() {
  const el = document.querySelector('#chip-stats-modo .chip.selected');
  if (el) statsModo = el.dataset.value;
  caricaStats();
}

function caricaStats() {
  const ordini = JSON.parse(localStorage.getItem('lallihop_ordini') || '[]');
  const spese  = JSON.parse(localStorage.getItem('lallihop_spese')  || '[]');

  const labelEl = document.getElementById('stats-periodo-label');
  const headerEl = document.getElementById('stats-periodo');
  const testo = statsModo === 'mese' ? `${MESI[statsMese]} ${statsAnno}` : `Anno ${statsAnno}`;
  if (labelEl) labelEl.textContent = testo;
  if (headerEl) headerEl.textContent = testo;

  // Filtra per periodo
  const filtraData = (data) => {
    const d = new Date(data);
    if (statsModo === 'anno') return d.getFullYear() === statsAnno;
    return d.getFullYear() === statsAnno && d.getMonth() === statsMese;
  };

  const ordiniPeriodo = ordini.filter(o => filtraData(o.data) && o.stato !== 'Annullato');
  const spesePeriodo  = spese.filter(s => filtraData(s.data));

  const fatturato = ordiniPeriodo.reduce((a, o) => a + o.prezzo, 0);
  const totSpese  = spesePeriodo.reduce((a, s) => a + s.importo, 0);
  const margine   = fatturato - totSpese;

  document.getElementById('stats-fatturato').textContent = `€ ${fatturato.toFixed(0)}`;
  document.getElementById('stats-spese').textContent     = `€ ${totSpese.toFixed(0)}`;
  document.getElementById('stats-margine').textContent   = `€ ${margine.toFixed(0)}`;
  document.getElementById('stats-ordini').textContent    = ordiniPeriodo.length;

  // Grafico mensile solo in modalità anno
  const cardAndamento = document.getElementById('card-andamento');
  if (cardAndamento) cardAndamento.style.display = statsModo === 'anno' ? 'flex' : 'none';

  if (statsModo === 'anno') {
    const perMese = Array(12).fill(0);
    ordiniPeriodo.forEach(o => { perMese[new Date(o.data).getMonth()] += o.prezzo; });
    const maxMese = Math.max(...perMese, 1);
    const mesiBrevi = ['G','F','M','A','M','G','L','A','S','O','N','D'];
    const meseOggi = new Date().getMonth();

    document.getElementById('bar-chart-mesi').innerHTML = perMese.map((v, i) => `
      <div class="bar-col" style="flex:1">
        <div class="bar-fill ${i === meseOggi && statsAnno === new Date().getFullYear() ? 'current' : ''}"
          style="height:${Math.max(3, Math.round((v/maxMese)*70))}px"></div>
      </div>`).join('');

    document.getElementById('bar-chart-labels').innerHTML = mesiBrevi.map(m => `
      <div class="bar-col" style="flex:1"><span class="bar-lbl">${m}</span></div>`).join('');
  }

  // Prodotti più venduti
  const prodMap = {};
  ordiniPeriodo.forEach(o => { prodMap[o.prodotto] = (prodMap[o.prodotto] || 0) + 1; });
  const prodSorted = Object.entries(prodMap).sort((a,b) => b[1]-a[1]);
  const maxProd = prodSorted[0]?.[1] || 1;

  document.getElementById('stats-prodotti').innerHTML = prodSorted.length
    ? prodSorted.map(([nome, n]) => `
        <div class="stat-row">
          <span class="stat-row-label">${nome}</span>
          <div class="stat-row-bar-wrap"><div class="stat-row-bar" style="width:${Math.round(n/maxProd*100)}%"></div></div>
          <span class="stat-row-value">${n} pz</span>
        </div>`).join('')
    : '<p class="stat-empty">Nessun dato</p>';

  // Canali di vendita
  const canaleMap = {};
  ordiniPeriodo.forEach(o => { canaleMap[o.canale] = (canaleMap[o.canale] || 0) + o.prezzo; });
  const canaleSorted = Object.entries(canaleMap).sort((a,b) => b[1]-a[1]);
  const maxCanale = canaleSorted[0]?.[1] || 1;
  const coloriCanale = ['', 'sky', 'green', 'red'];

  document.getElementById('stats-canali').innerHTML = canaleSorted.length
    ? canaleSorted.map(([nome, tot], i) => `
        <div class="stat-row">
          <span class="stat-row-label">${nome}</span>
          <div class="stat-row-bar-wrap"><div class="stat-row-bar ${coloriCanale[i]||''}" style="width:${Math.round(tot/maxCanale*100)}%"></div></div>
          <span class="stat-row-value">€ ${tot.toFixed(0)}</span>
        </div>`).join('')
    : '<p class="stat-empty">Nessun dato</p>';

  // Guadagno orario
  const oreMap = {};
  ordiniPeriodo.forEach(o => {
    if (!o.ore || o.ore <= 0) return;
    if (!oreMap[o.prodotto]) oreMap[o.prodotto] = { tot: 0, ore: 0 };
    oreMap[o.prodotto].tot += o.prezzo;
    oreMap[o.prodotto].ore += o.ore;
  });
  const oreSorted = Object.entries(oreMap).map(([n, d]) => [n, d.tot/d.ore]).sort((a,b) => b[1]-a[1]);
  const maxOre = oreSorted[0]?.[1] || 1;

  document.getElementById('stats-ore').innerHTML = oreSorted.length
    ? oreSorted.map(([nome, euro]) => {
        const colore = euro >= maxOre*0.7 ? 'green' : euro >= maxOre*0.4 ? '' : 'red';
        return `<div class="stat-row">
          <span class="stat-row-label">${nome}</span>
          <div class="stat-row-bar-wrap"><div class="stat-row-bar ${colore}" style="width:${Math.round(euro/maxOre*100)}%"></div></div>
          <span class="stat-row-value" style="color:${colore==='green'?'var(--green-dark)':colore==='red'?'#EF4444':'var(--orange)'}">€${euro.toFixed(0)}/h</span>
        </div>`;}).join('')
    : '<p class="stat-empty">Nessun dato</p>';

  // Spese per categoria
  const catMap = {};
  spesePeriodo.forEach(s => { catMap[s.categoria] = (catMap[s.categoria] || 0) + s.importo; });
  const catSorted = Object.entries(catMap).sort((a,b) => b[1]-a[1]);
  const maxCat = catSorted[0]?.[1] || 1;

  document.getElementById('stats-spese-cat').innerHTML = catSorted.length
    ? catSorted.map(([nome, tot]) => `
        <div class="stat-row">
          <span class="stat-row-label">${nome}</span>
          <div class="stat-row-bar-wrap"><div class="stat-row-bar sky" style="width:${Math.round(tot/maxCat*100)}%"></div></div>
          <span class="stat-row-value" style="color:var(--sky-dark)">€ ${tot.toFixed(0)}</span>
        </div>`).join('')
    : '<p class="stat-empty">Nessun dato</p>';

  // Metodo di pagamento
  const pagMap = {};
  ordiniPeriodo.forEach(o => {
    if (!o.pagamento) return;
    pagMap[o.pagamento] = (pagMap[o.pagamento] || 0) + o.prezzo;
  });
  const pagSorted = Object.entries(pagMap).sort((a,b) => b[1]-a[1]);
  const maxPag = pagSorted[0]?.[1] || 1;
  const iconiPag = { 'Contanti': '💵', 'PayPal': '🅿️' };

  document.getElementById('stats-pagamento').innerHTML = pagSorted.length
    ? pagSorted.map(([nome, tot]) => `
        <div class="stat-row">
          <span class="stat-row-label">${iconiPag[nome] || ''} ${nome}</span>
          <div class="stat-row-bar-wrap"><div class="stat-row-bar green" style="width:${Math.round(tot/maxPag*100)}%"></div></div>
          <span class="stat-row-value" style="color:var(--green-dark)">€ ${tot.toFixed(0)}</span>
        </div>`).join('')
    : '<p class="stat-empty">Nessun dato</p>';
}

// ===== INIT =====
aggiornaLabelMese();
setDataOggi();
aggiornaMetriche();
aggiornaOrdiniRecenti();
caricaOrdini();
caricaStats();
