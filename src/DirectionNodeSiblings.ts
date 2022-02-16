import Direction from "./Direction";

export interface SiblingNode {
  siblings(): DirectionNodeSiblings<this>;
  nodeAt(inDirection: Direction): this;
  layoutOrder(): Direction[];
  parentDirection(): Direction;
  localPaintGroup(): any;
  paintGroup(): any;
  hasNode(inDirection: Direction): boolean;
}

export default class DirectionNodeSiblings<T extends SiblingNode> {
  _prev: T;
  _next: T;
  _node: T;

  constructor(node: T) {
    this._node = node;
    this._prev = this._node;
    this._next = this._node;
  }

  node() {
    return this._node;
  }

  removeFromLayout(inDirection: Direction): void {
    const disconnected: T = this.node().nodeAt(inDirection);
    if (!disconnected) {
      return;
    }
    const layoutBefore: T = this.node().siblings().earlier(inDirection);
    const earliestDisc: T = disconnected.siblings().head(disconnected);

    if (layoutBefore) {
      this.connect(layoutBefore, disconnected.siblings().next());
    } else {
      this.connect(
        earliestDisc.siblings().prev(),
        disconnected.siblings().next()
      );
    }
    this.connect(disconnected, earliestDisc);
  }

  private connect(a: T, b: T): void {
    // console.log("connecting " +  a.id() + " to " + b.id());
    a.siblings()._next = b;
    b.siblings()._prev = a;
  }

  insertIntoLayout(inDirection: Direction): void {
    const node: T = this.node().nodeAt(inDirection);
    if (!node) {
      return;
    }

    const nodeHead: T = node.siblings().head();

    const layoutAfter: T = this.node().siblings().later(inDirection);
    const layoutBefore: T = this.node().siblings().earlier(inDirection);

    const nodeTail: T = node;
    // console.log(this + ".connectNode(" + nameDirection(inDirection) +
    //   ", " + node + ") layoutBefore=" +
    //   layoutBefore + " layoutAfter=" +
    //   layoutAfter + " nodeHead=" + nodeHead);

    if (layoutBefore) {
      this.connect(layoutBefore, nodeHead);
    } else if (layoutAfter) {
      this.connect(layoutAfter.siblings().head().siblings().prev(), nodeHead);
    } else {
      this.connect(this.prev(), nodeHead);
    }

    if (layoutAfter) {
      this.connect(nodeTail, layoutAfter.siblings().head());
    } else {
      this.connect(nodeTail, this.node());
    }
  }

  next(): T {
    return this._next;
  }

  prev(): T {
    return this._prev;
  }

  head(excludeThisNode?: T): T {
    let deeplyLinked: T = this.node();
    let foundOne;
    while (true) {
      foundOne = false;
      const dirs = deeplyLinked.layoutOrder();
      for (let i = 0; i < dirs.length; ++i) {
        const dir = dirs[i];
        const candidate = deeplyLinked.nodeAt(dir);
        if (
          candidate &&
          candidate != excludeThisNode &&
          deeplyLinked.parentDirection() !== dir &&
          !candidate.localPaintGroup()
        ) {
          deeplyLinked = candidate;
          foundOne = true;
          break;
        }
      }
      if (!foundOne) {
        break;
      }
    }
    return deeplyLinked;
  }

  earlier(inDirection: Direction): T {
    let layoutBefore;
    const dirs = this.node().layoutOrder();
    let pastDir = false;
    for (let i = dirs.length - 1; i >= 0; --i) {
      const dir = dirs[i];
      if (dir === inDirection) {
        pastDir = true;
        continue;
      }
      if (!pastDir) {
        continue;
      }
      if (dir === this.node().parentDirection()) {
        continue;
      }
      if (this.node().hasNode(dir)) {
        const candidate = this.node().nodeAt(dir);
        if (candidate && !candidate.localPaintGroup()) {
          layoutBefore = candidate;
          break;
        }
      }
    }
    return layoutBefore;
  }

  later(inDirection: Direction): T {
    let layoutAfter;
    const dirs = this.node().layoutOrder();
    let pastDir = false;
    for (let i = 0; i < dirs.length; ++i) {
      const dir = dirs[i];
      // console.log(nameDirection(dir) + " pastDir=" + pastDir);
      if (dir === inDirection) {
        pastDir = true;
        continue;
      }
      if (!pastDir) {
        continue;
      }
      if (dir === this.node().parentDirection()) {
        continue;
      }
      if (this.node().hasNode(dir)) {
        const candidate = this.node().nodeAt(dir);
        if (candidate && !candidate.localPaintGroup()) {
          layoutAfter = candidate;
          break;
        }
      }
    }
    return layoutAfter;
  }

  horzToVert() {
    const parentDir = this.node().parentDirection();
    const b =
      parentDir === Direction.BACKWARD
        ? null
        : this.node().nodeAt(Direction.BACKWARD);
    const f =
      parentDir === Direction.FORWARD
        ? null
        : this.node().nodeAt(Direction.FORWARD);
    const u =
      parentDir === Direction.UPWARD
        ? null
        : this.node().nodeAt(Direction.UPWARD);
    const d =
      parentDir === Direction.DOWNWARD
        ? null
        : this.node().nodeAt(Direction.DOWNWARD);
    let firstHorz = b || f;
    if (firstHorz) {
      firstHorz = firstHorz.siblings().head();
    }
    const lastHorz = f || b;
    let firstVert = d || u;
    if (firstVert) {
      firstVert = firstVert.siblings().head();
    }
    const lastVert = u || d;
    // console.log("horzToVert exec");
    if (!firstHorz || !firstVert) {
      return;
    }
    const aa = firstHorz.siblings().prev();
    const dd = lastVert.siblings().next();
    this.connect(aa, firstVert);
    this.connect(lastHorz, dd);
    this.connect(lastVert, firstHorz);
  }

  vertToHorz() {
    const parentDir = this.node().parentDirection();
    const b =
      parentDir === Direction.BACKWARD
        ? null
        : this.node().nodeAt(Direction.BACKWARD);
    const f =
      parentDir === Direction.FORWARD
        ? null
        : this.node().nodeAt(Direction.FORWARD);
    const u =
      parentDir === Direction.UPWARD
        ? null
        : this.node().nodeAt(Direction.UPWARD);
    const d =
      parentDir === Direction.DOWNWARD
        ? null
        : this.node().nodeAt(Direction.DOWNWARD);

    let firstHorz = b || f;
    if (firstHorz) {
      firstHorz = firstHorz.siblings().head();
    }
    const lastHorz = f || b;
    let firstVert = d || u;
    if (firstVert) {
      firstVert = firstVert.siblings().head();
    }
    const lastVert = u || d;
    // console.log("vertToHorz exec");
    if (!firstHorz || !firstVert) {
      return;
    }
    const aa = firstHorz.siblings().prev();
    const dd = lastVert.siblings().next();
    // console.log("aa=" + aa.id());
    // console.log("dd=" + dd.id());
    // console.log("firstHorz=" + firstHorz.id());
    // console.log("lastVert=" + lastVert.id());
    // console.log("lastHorz=" + lastHorz.id());
    // console.log("firstVert=" + firstVert.id());
    this.connect(aa, firstHorz);
    this.connect(lastVert, dd);
    this.connect(lastHorz, firstVert);
  }
}
