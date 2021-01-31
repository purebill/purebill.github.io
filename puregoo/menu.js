import Keys from "./keys.js";

export function menu(gooOperators, menuItemSelected) {
  return new Promise(resolve => {
    let menuItems = [];

    let snapshot = Keys.snapshot();
    Keys.resetToRoot();
    Keys.key("ArrowUp", [], "Up", () => {
      menuItemSelected = (menuItemSelected + menuItems.length - 1) % menuItems.length;
      menuItems[menuItemSelected].onmouseover({target: menuItems[menuItemSelected]});
    });
    Keys.key("ArrowDown", [], "Down", () => {
      menuItemSelected = (menuItemSelected + 1) % menuItems.length;
      menuItems[menuItemSelected].onmouseover({target: menuItems[menuItemSelected]});
    });
    const selectMenuItem = () => menuItems[menuItemSelected].onclick({target: menuItems[menuItemSelected]});
    Keys.key("Enter", [], "Select", selectMenuItem);
    Keys.key("Space", [], "Select", selectMenuItem);
    Keys.key("Escape", [], "Exit", () => {
      menuItems[menuItemSelected].onclick(null);
    });

    let div = document.createElement("div");
    div.classList.add("modal");

    let menu = document.createElement("div");
    menu.classList.add("menu");
    for (let i = 0; i < gooOperators.length; i++) {
      const operator = gooOperators[i];
      let a = document.createElement("a");
      a.innerText = operator;
      a.onmouseover = e => {
        [...menu.querySelectorAll(".hover")].forEach(it => it.classList.remove("hover"));
        e.target.classList.add("hover");
      }
      a.onclick = e => {
        div.remove();
        menu.remove();
        Keys.restoreFromSnapshot(snapshot);
        resolve(e == null ? null : i);
      }
      if (i == menuItemSelected) a.classList.add("hover");
      menu.appendChild(a);
      menuItems.push(a);
    }
    document.body.appendChild(div);
    document.body.appendChild(menu);
  });
}