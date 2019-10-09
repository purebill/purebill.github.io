const state = {
  nParties: 0,
  nIsEnough: 0
};

intValue("nParties");
intValue("nIsEnough");

function encrypt() {
  const el = document.getElementById("plaintext");
  const bytes = new TextEncoder().encode(el.value).length;
  if (bytes > 32) el.value = el.value.substr(0, 32);
  try {
    el.classList.remove("error");
    const parties = el.value.trim() ? ShamirSharing.encrypt(el.value.trim(), state.nParties, state.nIsEnough) : [];

    const div = document.getElementById("shares");
    div.innerHTML = "";

    let i = 1;
    parties.forEach(it => {
      const e = document.createElement("div");
      e.innerText = "Share #" + i++;
      e.title = "Click to copy";
      e.onclick = () => Clipboard.copy(it);
      div.appendChild(e);
    });

    if (parties.length > 0) 
      document.getElementById("encryptSharesContainer").style.display = "block";
  } catch (e) {
    el.classList.add("error");
    console.error(e);
  }
}
document.getElementById("plaintext").addEventListener("input", encrypt);

function sharesUpdated() {
  const parties = [];
  for (let i of document.querySelectorAll("#sharesContainer > input")) {
    const v = i.value.trim();
    if (v.length > 0) parties.push(v);
  }

  const decrypted = document.getElementById("decrypted");
  decrypted.style.display = "none";
  decrypted.innerText = "";
  if (parties.length > 0) {
    decrypted.innerText = ShamirSharing.decrypt(parties);
    decrypted.style.display = "block";
  }
}

function addMore(e) {
  if (e.target.dataset.duplicated) return;
  e.target.dataset.duplicated = true;

  const el = document.createElement("input");
  el.placeholder = "Paste shares here, one per line";
  el.addEventListener("input", addMore);
  el.addEventListener("input", sharesUpdated);
  document.getElementById("sharesContainer").appendChild(el);
}

document.getElementById("share1").addEventListener("input", addMore);
document.getElementById("share1").addEventListener("input", sharesUpdated);

let first = true;
document.querySelectorAll(".tabNav > a").forEach(it => {
  let f = () => {
    document.querySelectorAll(".tabContainer").forEach(it => it.style.display = "none");
    document.getElementById(it.dataset.tabId).style.display = "block";

    document.querySelectorAll(".tabNav > a").forEach(it => it.classList.remove("selected"));
    it.classList.add("selected");
  };
  it.addEventListener("click", f);
  if (first) f();
  first = false;
});

function intValue(id) {
  const el = document.getElementById(id);
  const f = () => {
    el.classList.remove("error");
    let value = parseInt(el.value);
    if (isNaN(value)) el.classList.add("error");
    state[id] = value;
    encrypt();
  };
  el.addEventListener("input", f);
  f();
}