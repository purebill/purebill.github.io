class Node {
  /**@type {InnerNode} */
  parent;

  /**@type {0|1|2|3} */
  parentIndex;
}

class InnerNode extends Node {
  /**@type {number} */
  xc;
  /**@type {number} */
  yc;
  /**@type {number} */
  w;
  /**@type {number} */
  h;

  /**@type [Node, Node, Node, Node] */
  children = [null, null, null, null];

  constructor(x1, x2, y1, y2) {
    super();
    this.w = x2 - x1;
    this.h = y2 - y1;
    this.xc = this.w/2;
    this.yc = this.h/2;
  }
}

class LeafNode extends Node {
  /**@type {Set<any>} */
  objects = new Set();
}

export class Tree {
  /**@type {Node}*/
  root;
  w;
  h;
  maxNodeSize = 10;

  constructor (w, h) {
    this.w = w;
    this.h = h;
    this.root = new InnerNode(0, w, 0, h);
  }

  /**
   * Inserts the object o with the coordinates (x, y) into the tree.
   * 
   * @param {{x: number, y: number}} o 
   */
  insert(o) {
    let node = this._find(this.root, o.x, o.y);

    if (node instanceof LeafNode) {
      if (node.objects.size > this.maxNodeSize) {
        // split the node
        const w2 = node.parent.w/2;
        const h2 = node.parent.h/2;
        const xc = (node.parentIndex & 1) == 1 ? node.parent.xc + w2/2 : node.parent.xc - w2/2;
        const yc = (node.parentIndex & 2) == 2 ? node.parent.yc + h2/2 : node.parent.yc - h2/2;
        const innerNode = new InnerNode(xc - w2/2, xc + w2/2, yc - h2/2, yc + h2/2);
        node.parent.children[node.parentIndex] = innerNode;

        node.objects.forEach(o => this._find(innerNode, o.x, o.y).objects.add(o));
        return;
      }

      node.objects.add(o);
      return;
    }

    throw new Error("Bad state");
  }

  /**
   * Finds the node for the coordinates (x, y) starting from the node.
   * 
   * @param {Node} startNode
   * @param {number} x 
   * @param {number} y 
   * @returns {LeafNode}
   */
  _find(startNode, x, y) {
    let node = startNode;
    for (;;) {
      if (node instanceof InnerNode) {
        let idx = x > node.xc ? 1 : 0;
        idx |= y > node.yc ? 2 : 0;
        
        let child = node.children[idx];
        
        if (child == null) {
          let newChild = new LeafNode();
          newChild.parent = node;
          node.children[idx] = newChild;
          return newChild;
        }

        node = child;
        continue;
      }

      if (node instanceof LeafNode) return node;

      throw new Error("Bad state");
    }
  }

  /**
   * Search for the object that is at the minimum distance to the point (x, y).
   * 
   * @param {number} x
   * @param {number} y
   * @returns {any}
   */
  findMinDist(x, y) {
    let node = this._find(this.root, x, y);

  }

  /**
   * Removes the object o with the coordinates (x, y) from the tree.
   * 
   * @param {{x: number, y: number}} o 
   */
  remove(o) {
    let n = this._find(this.root, o.x, o.y);
    n.objects.delete(o);
    if (n.objects.size == 0) {
      n.parent.children[n.parentIndex] = null;
    }
  }

}