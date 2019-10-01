const state = {
  nParties: 0,
  nIsEnough: 0
};

intValue("nParties");
intValue("nIsEnough");

const el = document.getElementById("plaintext");
el.addEventListener("input", () => {
  let parties, enough;

  try {
    el.classList.remove("error");
    const parties = ShamirSharing.encrypt(el.value, state.nParties, state.nIsEnough);

    const div = document.getElementById("shares");
    div.innerHTML = "";
    
    parties.forEach(it => {
      const e = document.createElement("div");
      e.innerText = it;
      div.appendChild(e);
    });
  } catch (e) {
    el.classList.add("error");
    console.log(e);
  }
});

document.getElementById("btnDecrypt").addEventListener("click", () => {
  const parties = document.getElementById("parties").value.trim().split(/\s+/);
  document.getElementById("decrypted").innerText = ShamirSharing.decrypt(parties);
});

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
  };
  el.addEventListener("input", f);
  f();
}