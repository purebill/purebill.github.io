class LifeFileReader {
  /**
   * @param {string} text
   * @param {Board2} board
   */
  read(name, text, board) {
    if (name.match(/\.lif$/)) {
      const lines = text.split(/\n|(?:\r\n)/);
      if (lines[0].match(/^#Life\s+1.05/i)) return this._read105(lines, board);
      else throw new Error("Unsupported file format");
    }
    else if (name.match(/\.rle$/i)) return this._readRle(text, board);
    else throw new Error("Unsupported file format");
  }

  /**
   * @param {string} text
   * @param {Board2} board
   * @see https://www.conwaylife.com/w/index.php?title=Life_1.05
   */
  _readRle(text, board) {
    const lines = text.split(/\n|(?:\r\n)/);
    let width, height;
    let figure = [];
    let row = [];
    let l = 0;
outerLoop:
    for (let line of lines) {
      if (line.match(/^#/)) continue;
      
      const m = line.match(/^\s*x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)/);
      if (m) {
        width = parseInt(m[1]);
        height = parseInt(m[2]);
        continue;
      }
      
      for (let p = 0; p < line.length; p++) {
        let ch = line[p];
        if (ch.match(/\d/)) l = l*10 + parseInt(ch);
        else if (ch == "b") {
          for (let i = 0; i < (l == 0 ? 1 : l); i++) row.push(0);
          l = 0;
        } else if (ch == "o") {
          for (let i = 0; i < (l == 0 ? 1 : l); i++) row.push(1);
          l = 0;
        } else if (ch == "$") {
          for (let i = 0; i < (l == 0 ? 1 : l); i++) {
            figure.push(row);
            row = [];
          }
          l = 0;
        } else if (ch == "!") {
          figure.push(row);
          break outerLoop;
        }
      }
    }
    
    if (figure.length > 0) return board.put(0, 0, figure);
    return Promise.resolve();
  }

  /**
   * @param {string[]} lines
   * @param {Board2} board
   * @see https://www.conwaylife.com/wiki/Run_Length_Encoded
   */
  _read105(lines, board) {
    const promises = [];

    let x, y, figure;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^#D/) || line.match(/^#N/)) continue;
      if (line.match(/^#R/)) throw new Error("Other rules but the original Game of Life are not supported: " + line);
      if (line.match(/^#P/)) {
        x = 0;
        y = 0;
        const m = line.match(/^#P\s+(\d+)\s+(\d+)/);
        if (m) {
          if (x !== undefined) {
            promises.push(board.put(x, y, figure));
          }
          x = parseInt(m[1]);
          y = parseInt(m[2]);
        }
        figure = [];
      } else {
        const row = [];
        for (let p = 0; p < line.length; p++) {
          row.push(line[p] == "*" ? 1 : 0);
        }
        figure.push(row);
      }
    }
    if (x !== undefined) {
      promises.push(board.put(x, y, figure));
    }

    return Promise.all(promises);
  }
}