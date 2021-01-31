import Keys from "./keys.js";

/**
 * @param {number} from
 * @param {number} to
 * @param {number} current
 * @param {number} initialX
 * @param {number} initialY
 * @param {(number) => string} toString
 * @param {HTMLCanvasElement} uiCanvas
 */
export function selectValue(from, to, current, initialX, initialY, toString, uiCanvas) {
  return new Promise(resolve => {
    const snapshot = Keys.snapshot();
    Keys.resetToRoot();

    const height = 200;

    let value = current;
    /**
     * @param {{ offsetY: number; }} e
     */
    Keys.mouseMove([], "Move to change the value", e => {
      value = current + (to - from)/height * (e.offsetY-initialY);
      value = Math.min(to, Math.max(from, value));

      drawSelection();
    });
  
    /**
     * @param {any} e
     */
    Keys.mouse(0, [], "Select", e => {
      Keys.restoreFromSnapshot(snapshot);
      resolve(value);
    });

    Keys.key("Escape", [], "Cancel selection", () => {
      Keys.restoreFromSnapshot(snapshot);
      resolve(current);
    });

    drawSelection();

    function drawSelection() {
      const ctx = uiCanvas.getContext("2d");
      ctx.save();
      
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      let fromy = (from - current)/(to - from)*height + initialY;
      let toy = (to - current)/(to - from)*height + initialY;
      let vy = (value - current)/(to - from)*height + initialY;

      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(initialX-1, fromy);
      ctx.lineTo(initialX-1, toy);
      ctx.stroke();
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.moveTo(initialX, fromy);
      ctx.lineTo(initialX, toy);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.arc(initialX, vy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(initialX, vy, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeText(toString(value), initialX + 5, vy);
      ctx.fillText(toString(value), initialX + 5, vy);

      ctx.restore();
    }
  });
}
