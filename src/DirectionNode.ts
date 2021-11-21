import createException, {
  BAD_NODE_DIRECTION,
  BAD_LAYOUT_PREFERENCE,
  BAD_AXIS,
  NODE_IS_ROOT,
  CANNOT_AFFECT_PARENT,
} from "./Exception";

import {
  Axis,
  getNegativeDirection,
  getPositiveDirection,
  Direction,
  NUM_DIRECTIONS,
  reverseDirection,
  nameDirection,
  getDirectionAxis,
  HORIZONTAL_ORDER,
  VERTICAL_ORDER,
} from "./definition";
import LayoutState from "./LayoutState";
import PreferredAxis, { namePreferredAxis } from "./PreferredAxis";

export class NeighborData {
  owner: DirectionNode;
  direction: Direction;
  node: DirectionNode;

  constructor(owner: DirectionNode, dir: Direction) {
    this.owner = owner;
    this.direction = dir;
    this.node = null;
  }
}

let nodeCount: number = 0;

export default class DirectionNode {
  _id: string | number;
  _neighbors: NeighborData[];
  _parentNeighbor: NeighborData;
  _layoutState: LayoutState;
  _layoutPrev: this;
  _layoutNext: this;
  _currentPaintGroup: this;
  _paintGroupNext: this;
  _paintGroupPrev: this;
  _isPaintGroup: boolean;
  _dirty: boolean;
  _layoutPreference: PreferredAxis;

  constructor(fromNode?: DirectionNode, parentDirection?: Direction) {
    this._id = nodeCount++;

    this._isPaintGroup = false;
    this._dirty = true;

    // Layout
    this._neighbors = [];
    for (let i = 0; i < NUM_DIRECTIONS; ++i) {
      this._neighbors.push(null);
    }
    this._parentNeighbor = null;

    this._layoutState = LayoutState.NEEDS_COMMIT;
    this._layoutPrev = this;
    this._layoutNext = this;

    // Paint groups.
    this._currentPaintGroup = null;
    this._paintGroupNext = this;
    this._paintGroupPrev = this;

    // Check if a parent node was provided.
    if (fromNode != null) {
      // A parent node was provided; this node is a child.
      fromNode.connectNode(parentDirection, this);
      this._layoutPreference = PreferredAxis.PERPENDICULAR;
    } else {
      // No parent was provided; this node is a root.
      this._layoutPreference = PreferredAxis.HORIZONTAL;
    }
  }

  neighborAt(dir: Direction): NeighborData {
    return this._neighbors[dir];
  }

  createNeighborData(inDirection: Direction): NeighborData {
    return new NeighborData(this, inDirection);
  }

  ensureNeighbor(inDirection: Direction): NeighborData {
    if (!this.neighborAt(inDirection)) {
      this._neighbors[inDirection] = this.createNeighborData(inDirection);
    }
    return this.neighborAt(inDirection);
  }

  root(): this {
    let p: this = this;
    while (!p.isRoot()) {
      p = p.parentNode();
    }
    return p;
  }

  toString(): string {
    return "[DirectionNode " + this._id + "]";
  }

  needsCommit(): boolean {
    return this._layoutState === LayoutState.NEEDS_COMMIT;
  }

  removeFromLayout(inDirection: Direction): void {
    const disconnected: this = this.nodeAt(inDirection);
    if (!disconnected) {
      return;
    }
    const layoutBefore: this = this.findEarlierLayoutSibling(inDirection);
    const earliestDisc: this = disconnected.findLayoutHead(disconnected);

    if (layoutBefore) {
      DirectionNode.connectLayout(layoutBefore, disconnected._layoutNext);
    } else {
      DirectionNode.connectLayout(
        earliestDisc._layoutPrev,
        disconnected._layoutNext
      );
    }
    DirectionNode.connectLayout(disconnected, earliestDisc);
  }

  insertIntoLayout(inDirection: Direction): void {
    const node: this = this.nodeAt(inDirection);
    if (!node) {
      return;
    }

    const nodeHead: this = node.findLayoutHead();

    const layoutAfter: this = this.findLaterLayoutSibling(inDirection);
    const layoutBefore: this = this.findEarlierLayoutSibling(inDirection);

    const nodeTail: this = node;
    // console.log(this + ".connectNode(" + nameDirection(inDirection) +
    //   ", " + node + ") layoutBefore=" +
    //   layoutBefore + " layoutAfter=" +
    //   layoutAfter + " nodeHead=" + nodeHead);

    if (layoutBefore) {
      DirectionNode.connectLayout(layoutBefore, nodeHead);
    } else if (layoutAfter) {
      DirectionNode.connectLayout(
        layoutAfter.findLayoutHead()._layoutPrev,
        nodeHead
      );
    } else {
      DirectionNode.connectLayout(this._layoutPrev, nodeHead);
    }

    if (layoutAfter) {
      DirectionNode.connectLayout(nodeTail, layoutAfter.findLayoutHead());
    } else {
      DirectionNode.connectLayout(nodeTail, this);
    }
  }

  setPaintGroup(paintGroup: boolean): void {
    paintGroup = !!paintGroup;
    if (this.localPaintGroup() === paintGroup) {
      return;
    }

    if (paintGroup) {
      // console.log(this + " is becoming a paint group.");
      this._isPaintGroup = true;

      if (this.isRoot()) {
        // Do nothing; this node was already an implied paint group.
      } else {
        this.parentNode().removeFromLayout(
          reverseDirection(this.parentDirection())
        );
        const paintGroupFirst = this.findFirstPaintGroup();
        // console.log("First paint group of " +
        //   this +
        //   " is " +
        //   paintGroupFirst);
        const parentsPaintGroup = this.parentNode().findPaintGroup();
        // console.log("Parent paint group of " +
        //   this +
        //   " is " +
        //   parentsPaintGroup);

        DirectionNode.connectPaintGroup(
          parentsPaintGroup._paintGroupPrev,
          paintGroupFirst
        );
        DirectionNode.connectPaintGroup(this, parentsPaintGroup);
      }

      this.layoutChanged();
      for (let n = this._layoutNext; n !== this; n = n._layoutNext) {
        // console.log("Setting " + n._id + " paint group to " + this._id);
        n._currentPaintGroup = this;
      }
      return;
    }

    this._isPaintGroup = false;

    // console.log(this + " is no longer a paint group.");
    if (!this.isRoot()) {
      const paintGroupLast = this.findLastPaintGroup();
      this.parentNode().insertIntoLayout(
        reverseDirection(this.parentDirection())
      );

      // Remove the paint group's entry in the parent.
      // console.log("Node " + this +
      //   " is not a root, so adding paint groups.");
      if (paintGroupLast !== this) {
        DirectionNode.connectPaintGroup(paintGroupLast, this._paintGroupNext);
      } else {
        DirectionNode.connectPaintGroup(
          this._paintGroupPrev,
          this._paintGroupNext
        );
      }
      this._paintGroupNext = this;
      this._paintGroupPrev = this;

      const pg = this.parentNode().findPaintGroup();
      for (let n = pg._layoutNext; n !== pg; n = n._layoutNext) {
        // console.log("Setting " + n._id + " paint group to " + pg._id);
        n._currentPaintGroup = pg;
      }
    } else {
      // Retain the paint groups for this implied paint group.
    }

    this.layoutChanged();
  }

  hasAncestor(parent: DirectionNode): boolean {
    let candidate = this;
    while (!candidate.isRoot()) {
      if (candidate == parent) {
        return true;
      }
      candidate = candidate.parentNode();
    }
    return candidate == parent;
  }

  /**
   * Finds the first paint group to be drawn that is a descendant of this
   * node, or this node if no descendant is a paint group.
   *
   * @return {this} The first paint group to be drawn that is a child of this paint group.
   */
  findFirstPaintGroup(): this {
    let candidate: this = this._paintGroupPrev;
    while (candidate !== this) {
      if (!candidate.hasAncestor(this)) {
        return candidate._paintGroupNext;
      }
      candidate = candidate._paintGroupPrev;
    }
    return candidate;
  }

  findLastPaintGroup(): this {
    let candidate: this = this._layoutPrev;
    while (candidate !== this) {
      if (candidate.localPaintGroup()) {
        break;
      }
      candidate = candidate._layoutPrev;
    }
    return candidate;
  }

  markDirty(): void {
    // console.log(this + " marked dirty");
    this._dirty = true;
  }

  isDirty(): boolean {
    return this._dirty;
  }

  findPaintGroup(): this {
    if (!this._currentPaintGroup) {
      let node: this = this;
      while (!node.isRoot()) {
        if (node.localPaintGroup()) {
          break;
        }
        if (node._currentPaintGroup) {
          /* console.log(
            "Setting " +
              this._id +
              " paint group to " +
              node._currentPaintGroup._id
          );*/
          this._currentPaintGroup = node._currentPaintGroup;
          return this._currentPaintGroup;
        }
        node = node.parentNode();
      }
      this._currentPaintGroup = node;
    } else {
      // console.log("Returning cached paint group " +
      //   this._currentPaintGroup._id +
      //   " for node " +
      //   this._id);
    }
    return this._currentPaintGroup;
  }

  localPaintGroup(): boolean {
    return !!this._isPaintGroup;
  }

  isRoot(): boolean {
    return !this._parentNeighbor;
  }

  parentDirection(): Direction {
    if (this.isRoot()) {
      return Direction.NULL;
    }
    return reverseDirection(this._parentNeighbor.direction);
  }

  nodeParent(): this {
    if (this.isRoot()) {
      throw createException(NODE_IS_ROOT);
    }
    return this._parentNeighbor.owner as this;
  }

  parentNode(): this {
    return this.nodeParent();
  }

  parent(): this {
    return this.nodeParent();
  }

  hasNode(atDirection: Direction): boolean {
    if (atDirection == Direction.NULL) {
      return false;
    }
    if (this._neighbors[atDirection] && this._neighbors[atDirection].node) {
      return true;
    }
    return !this.isRoot() && this.parentDirection() === atDirection;
  }

  hasNodes(axis: Axis): [Direction, Direction] {
    if (axis === Axis.NULL) {
      throw createException(BAD_AXIS, axis);
    }

    const result: [Direction, Direction] = [Direction.NULL, Direction.NULL];

    if (this.hasNode(getNegativeDirection(axis))) {
      result[0] = getNegativeDirection(axis);
    }
    if (this.hasNode(getPositiveDirection(axis))) {
      result[1] = getPositiveDirection(axis);
    }

    return result;
  }

  hasChildAt(direction: Direction): boolean {
    return this.hasNode(direction) && this.parentDirection() !== direction;
  }

  hasChild(direction: Direction): boolean {
    return this.hasChildAt(direction);
  }

  hasAnyNodes(): boolean {
    return (
      this.hasChildAt(Direction.DOWNWARD) ||
      this.hasChildAt(Direction.UPWARD) ||
      this.hasChildAt(Direction.FORWARD) ||
      this.hasChildAt(Direction.BACKWARD) ||
      this.hasChildAt(Direction.INWARD)
    );
  }

  dumpPaintGroups(): this[] {
    const pgs: this[] = [];
    let pg: this = this;
    do {
      pg = pg._paintGroupNext;
      pgs.push(pg);
    } while (pg !== this);
    return pgs;
  }

  nodeAt(atDirection: Direction): this {
    const n = this._neighbors[atDirection];
    if (!n) {
      if (this._parentNeighbor && this.parentDirection() === atDirection) {
        return this._parentNeighbor.owner as this;
      }
      return null;
    }
    return n.node as this;
  }

  static connectLayout = function (a: DirectionNode, b: DirectionNode): void {
    // console.log("connecting " +  a._id + " to " + b._id);
    a._layoutNext = b;
    b._layoutPrev = a;
  };

  static connectPaintGroup = function (
    a: DirectionNode,
    b: DirectionNode
  ): void {
    a._paintGroupNext = b;
    b._paintGroupPrev = a;
    // console.log("Connecting paint groups " + a + " to " + b);
  };

  connectNode(inDirection: Direction, node: this): this {
    // console.log("Connecting " + node + " to " + this + " in the " +
    //   nameDirection(inDirection) + " direction.");

    // Ensure the node can be connected in the given direction.
    if (inDirection == Direction.OUTWARD) {
      throw new Error(
        "By rule, nodes cannot be spawned in the outward direction."
      );
    }
    if (inDirection == Direction.NULL) {
      throw new Error("Nodes cannot be spawned in the null node direction.");
    }
    if (inDirection == this.parentDirection()) {
      throw new Error(
        "Cannot connect a node in the parent's direction (" +
          nameDirection(inDirection) +
          ")"
      );
    }
    if (this.hasNode(inDirection)) {
      this.disconnectNode(inDirection);
    }
    if (node.hasNode(reverseDirection(inDirection))) {
      node.disconnectNode(reverseDirection(inDirection));
    }

    // Connect the node.
    const neighbor = this.ensureNeighbor(inDirection);
    neighbor.node = node;
    node.assignParent(this, inDirection);

    if (node.localPaintGroup()) {
      // console.log("Connecting local paint group");
      const pg = this.findPaintGroup();
      const paintGroupLast = pg._paintGroupPrev;
      const nodeFirst = node._paintGroupNext;
      // console.log("Node", node._id);
      // console.log("PG", pg._id);
      // console.log("PG Last", paintGroupLast._id);
      // console.log("Node first", nodeFirst._id);
      DirectionNode.connectPaintGroup(paintGroupLast, nodeFirst);
      DirectionNode.connectPaintGroup(node, pg);
    } else {
      this.insertIntoLayout(inDirection);
      node._currentPaintGroup = this._currentPaintGroup;
      for (let n = node._layoutNext; n !== node; n = n._layoutNext) {
        n._currentPaintGroup = this._currentPaintGroup;
      }
      if (node._paintGroupNext !== node) {
        const pg = this.findPaintGroup();
        const paintGroupLast = pg._paintGroupPrev;
        const nodeFirst = node._paintGroupNext;
        const nodeLast = node._paintGroupPrev;
        DirectionNode.connectPaintGroup(paintGroupLast, nodeFirst);
        DirectionNode.connectPaintGroup(nodeLast, pg);
        node._paintGroupPrev = node;
        node._paintGroupNext = node;
      }
    }

    this.layoutWasChanged(inDirection);

    return node;
  }

  firstAndLastPaintGroups(): [DirectionNode, DirectionNode] {
    const pg = this.findPaintGroup();
    if (!pg.isRoot() && !pg.localPaintGroup()) {
      throw new Error("Paint group returned is not a paint group");
    }
    let lastPaintGroup: DirectionNode = null;
    let firstPaintGroup: DirectionNode = null;
    for (let n = pg._paintGroupPrev; n != pg; n = n._paintGroupPrev) {
      // console.log("First and last iteration. n=" + n._id);
      if (!n.hasAncestor(pg)) {
        break;
      }
      if (!n.hasAncestor(this)) {
        continue;
      }
      if (!lastPaintGroup) {
        firstPaintGroup = n;
        lastPaintGroup = n;
      } else {
        firstPaintGroup = n;
      }
    }
    if (!lastPaintGroup) {
      firstPaintGroup = this;
      lastPaintGroup = this;
    }
    return [firstPaintGroup, lastPaintGroup];
  }

  disconnectNode(inDirection?: Direction): this {
    if (arguments.length === 0) {
      if (this.isRoot()) {
        throw new Error("Cannot disconnect a root node.");
      }
      return this.parentNode().disconnectNode(
        reverseDirection(this.parentDirection())
      );
    }
    if (!this.hasNode(inDirection)) {
      return;
    }
    if (!this.isRoot() && this.parentDirection() === inDirection) {
      return this.parentNode().disconnectNode(
        reverseDirection(this.parentDirection())
      );
    }
    // Disconnect the node.
    const neighbor = this._neighbors[inDirection];
    const disconnected = neighbor.node as this;
    // console.log("Disconnecting ", disconnected._id, " from ", this._id);

    if (!disconnected.localPaintGroup()) {
      this.removeFromLayout(inDirection);

      const [
        firstPaintGroup,
        lastPaintGroup,
      ] = disconnected.firstAndLastPaintGroups();
      /* console.log(
        "paint groups",
        firstPaintGroup._id,
        lastPaintGroup._id
      );*/
      DirectionNode.connectPaintGroup(
        firstPaintGroup._paintGroupPrev,
        lastPaintGroup._paintGroupNext
      );
      DirectionNode.connectPaintGroup(disconnected, firstPaintGroup);
      DirectionNode.connectPaintGroup(lastPaintGroup, disconnected);
    } else {
      const paintGroupFirst = disconnected.findFirstPaintGroup();
      /*console.log(
        "First paint group",
        paintGroupFirst._id,
        paintGroupFirst._paintGroupPrev._id
      );*/
      DirectionNode.connectPaintGroup(
        paintGroupFirst._paintGroupPrev,
        disconnected._paintGroupNext
      );
      DirectionNode.connectPaintGroup(disconnected, paintGroupFirst);
    }

    neighbor.node = null;
    disconnected.assignParent(null);

    if (disconnected._layoutPreference === PreferredAxis.PARENT) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected._layoutPreference = PreferredAxis.VERTICAL;
      } else {
        disconnected._layoutPreference = PreferredAxis.HORIZONTAL;
      }
    } else if (disconnected._layoutPreference === PreferredAxis.PERPENDICULAR) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected._layoutPreference = PreferredAxis.HORIZONTAL;
      } else {
        disconnected._layoutPreference = PreferredAxis.VERTICAL;
      }
    }
    this.layoutWasChanged(inDirection);

    return disconnected;
  }

  eraseNode(givenDirection: Direction): void {
    if (!this.hasNode(givenDirection)) {
      return;
    }
    if (!this.isRoot() && givenDirection == this.parentDirection()) {
      throw createException(CANNOT_AFFECT_PARENT);
    }
    this.disconnectNode(givenDirection);
  }

  findEarlierLayoutSibling(inDirection: Direction): this {
    let layoutBefore;
    const dirs = this.layoutOrder();
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
      if (dir === this.parentDirection()) {
        continue;
      }
      if (this.hasNode(dir)) {
        const candidate = this.nodeAt(dir);
        if (candidate && !candidate.localPaintGroup()) {
          layoutBefore = candidate;
          break;
        }
      }
    }
    return layoutBefore;
  }

  findLaterLayoutSibling(inDirection: Direction): this {
    let layoutAfter;
    const dirs = this.layoutOrder();
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
      if (dir === this.parentDirection()) {
        continue;
      }
      if (this.hasNode(dir)) {
        const candidate = this.nodeAt(dir);
        if (candidate && !candidate.localPaintGroup()) {
          layoutAfter = candidate;
          break;
        }
      }
    }
    return layoutAfter;
  }

  findLayoutHead(excludeThisNode?: this): this {
    let deeplyLinked: this = this;
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

  sanitizeLayoutPreference(given: PreferredAxis): PreferredAxis {
    const paxis = getDirectionAxis(this.parentDirection());
    if (given === PreferredAxis.VERTICAL) {
      given =
        paxis === Axis.VERTICAL
          ? PreferredAxis.PARENT
          : PreferredAxis.PERPENDICULAR;
    } else if (given === PreferredAxis.HORIZONTAL) {
      given =
        paxis === Axis.HORIZONTAL
          ? PreferredAxis.PARENT
          : PreferredAxis.PERPENDICULAR;
    }
    return given;
  }

  setLayoutPreference(given: PreferredAxis): void {
    const b =
      this.parentDirection() === Direction.BACKWARD
        ? null
        : this.nodeAt(Direction.BACKWARD);
    const f =
      this.parentDirection() === Direction.FORWARD
        ? null
        : this.nodeAt(Direction.FORWARD);
    const u =
      this.parentDirection() === Direction.UPWARD
        ? null
        : this.nodeAt(Direction.UPWARD);
    const d =
      this.parentDirection() === Direction.DOWNWARD
        ? null
        : this.nodeAt(Direction.DOWNWARD);
    let firstHorz = b || f;
    if (firstHorz) {
      firstHorz = firstHorz.findLayoutHead();
    }
    const lastHorz = f || b;
    let firstVert = d || u;
    if (firstVert) {
      firstVert = firstVert.findLayoutHead();
    }
    const lastVert = u || d;

    const horzToVert = function () {
      // console.log("horzToVert exec");
      if (!firstHorz || !firstVert) {
        return;
      }
      const aa = firstHorz._layoutPrev;
      const dd = lastVert._layoutNext;
      DirectionNode.connectLayout(aa, firstVert);
      DirectionNode.connectLayout(lastHorz, dd);
      DirectionNode.connectLayout(lastVert, firstHorz);
    };
    const vertToHorz = function () {
      // console.log("vertToHorz exec");
      if (!firstHorz || !firstVert) {
        return;
      }
      const aa = firstHorz._layoutPrev;
      const dd = lastVert._layoutNext;
      // console.log("aa=" + aa._id);
      // console.log("dd=" + dd._id);
      // console.log("firstHorz=" + firstHorz._id);
      // console.log("lastVert=" + lastVert._id);
      // console.log("lastHorz=" + lastHorz._id);
      // console.log("firstVert=" + firstVert._id);
      DirectionNode.connectLayout(aa, firstHorz);
      DirectionNode.connectLayout(lastVert, dd);
      DirectionNode.connectLayout(lastHorz, firstVert);
    };
    if (this.isRoot()) {
      if (
        given !== PreferredAxis.VERTICAL &&
        given !== PreferredAxis.HORIZONTAL
      ) {
        throw new Error(
          "Unallowed layout preference: " + namePreferredAxis(given)
        );
      }
      if (this._layoutPreference === given) {
        return;
      }
      if (given === PreferredAxis.VERTICAL) {
        // PREFER_HORIZONTAL_AXIS -> PREFER_VERTICAL_AXIS
        horzToVert.call(this);
      } else {
        // PREFER_VERTICAL_AXIS -> PREFER_HORIZONTAL_AXIS
        vertToHorz.call(this);
      }
      this._layoutPreference = given;
      return;
    }

    given = this.sanitizeLayoutPreference(given);

    const curCanon = this.canonicalLayoutPreference();
    this._layoutPreference = given;
    const newCanon = this.canonicalLayoutPreference();
    if (curCanon === newCanon) {
      return;
    }

    const paxis = getDirectionAxis(this.parentDirection());
    if (curCanon === PreferredAxis.PARENT) {
      if (paxis === Axis.HORIZONTAL) {
        horzToVert.call(this);
      } else {
        vertToHorz.call(this);
      }
    } else {
      if (paxis === Axis.VERTICAL) {
        vertToHorz.call(this);
      } else {
        horzToVert.call(this);
      }
    }

    this.layoutWasChanged(Direction.INWARD);
  }

  layoutOrder(): Direction[] {
    if (this.isRoot()) {
      if (
        this._layoutPreference === PreferredAxis.HORIZONTAL ||
        this._layoutPreference === PreferredAxis.PERPENDICULAR
      ) {
        return HORIZONTAL_ORDER;
      }
      return VERTICAL_ORDER;
    }
    if (this.canonicalLayoutPreference() === PreferredAxis.PERPENDICULAR) {
      // console.log("PREFER PERP");
      if (getDirectionAxis(this.parentDirection()) === Axis.HORIZONTAL) {
        return VERTICAL_ORDER;
      }
      return HORIZONTAL_ORDER;
    }
    // console.log("PREFER PARALLEL TO PARENT: " +
    //   namePreferredAxis(this._layoutPreference));
    // Parallel preference.
    if (getDirectionAxis(this.parentDirection()) === Axis.HORIZONTAL) {
      return HORIZONTAL_ORDER;
    }
    return VERTICAL_ORDER;
  }

  canonicalLayoutPreference(): PreferredAxis {
    // Root nodes do not have a canonical layout preference.
    if (this.isRoot()) {
      throw createException(NODE_IS_ROOT);
    }

    // Convert the layout preference to either preferring the parent or
    // the perpendicular axis.
    let canonicalPref: PreferredAxis = this._layoutPreference;
    switch (this._layoutPreference) {
      case PreferredAxis.HORIZONTAL: {
        if (getDirectionAxis(this.parentDirection()) === Axis.HORIZONTAL) {
          canonicalPref = PreferredAxis.PARENT;
        } else {
          canonicalPref = PreferredAxis.PERPENDICULAR;
        }
        break;
      }
      case PreferredAxis.VERTICAL: {
        if (getDirectionAxis(this.parentDirection()) === Axis.VERTICAL) {
          canonicalPref = PreferredAxis.PARENT;
        } else {
          canonicalPref = PreferredAxis.PERPENDICULAR;
        }
        break;
      }
      case PreferredAxis.PERPENDICULAR:
      case PreferredAxis.PARENT:
        canonicalPref = this._layoutPreference;
        break;
      case PreferredAxis.NULL:
        throw createException(BAD_LAYOUT_PREFERENCE);
    }
    return canonicalPref;
  }
  eachChild(
    visitor: (node: DirectionNode, dir: Direction) => void,
    visitorThisArg?: object
  ): void {
    const dirs = this.layoutOrder();
    for (let i = 0; i < dirs.length; ++i) {
      const dir = dirs[i];
      if (!this.isRoot() && dir === this.parentDirection()) {
        continue;
      }
      const node = this.nodeAt(dir);
      if (node) {
        visitor.call(visitorThisArg, node, dir);
      }
    }
  }

  assignParent(fromNode?: this, parentDirection?: Direction): void {
    if (arguments.length === 0 || !fromNode) {
      // Clearing the parent.
      this._parentNeighbor = null;
      return;
    }
    this._parentNeighbor = fromNode.neighborAt(parentDirection);
    if (!this._parentNeighbor) {
      throw new Error("Parent neighbor must be found when being assigned.");
    }
  }

  invalidateLayout(): void {
    this._layoutState = LayoutState.NEEDS_COMMIT;
    this._currentPaintGroup = null;

    this.findPaintGroup().markDirty();
  }

  layoutWasChanged(changeDirection?: Direction): void {
    // console.log("layoutWasChanged(" +
    //   (changeDirection != null ? nameDirection(
    //     changeDirection) : "null") +")")
    // Disallow null change directions.
    if (arguments.length === 0 || changeDirection === undefined) {
      changeDirection = Direction.INWARD;
    }
    if (changeDirection == Direction.NULL) {
      throw createException(BAD_NODE_DIRECTION);
    }

    let node: this = this;
    while (node !== null) {
      // console.log("Node " + node + " has layout changed");
      const oldLayoutState = node._layoutState;

      // Set the needs layout flag.
      node.invalidateLayout();

      if (node.isRoot()) {
        break;
      } else if (oldLayoutState === LayoutState.COMMITTED) {
        // Notify our parent, if we were previously committed.
        node = node.nodeParent();
        changeDirection = reverseDirection(node.parentDirection());
      } else {
        break;
      }
    }
  }

  layoutHasChanged(changeDirection?: Direction): void {
    return this.layoutWasChanged(changeDirection);
  }

  layoutChanged(changeDirection?: Direction): void {
    return this.layoutWasChanged(changeDirection);
  }

  isRootlike(): boolean {
    return (
      this.isRoot() ||
      this.parentDirection() === Direction.INWARD ||
      this.parentDirection() === Direction.OUTWARD
    );
  }

  forEachNode(func: Function): void {
    let node = this;
    do {
      func(node);
      node = node._layoutPrev;
    } while (node !== this);
  }

  forEachPaintGroup(func: Function): any {
    let paintGroup = this;
    do {
      if (!paintGroup.localPaintGroup() && !paintGroup.isRoot()) {
        throw new Error(
          "Paint group chain must not refer to a non-paint group"
        );
      }
      func(paintGroup);
      paintGroup = paintGroup._paintGroupPrev;
    } while (paintGroup !== this);
  }

  destroy(): void {
    if (!this.isRoot()) {
      this.disconnectNode();
    }
    this._neighbors.forEach(function (neighbor): void {
      // Clear all children.
      neighbor.node = null;
    }, this);
    this._layoutState = LayoutState.NULL;
  }
}
