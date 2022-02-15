import createException, {
  BAD_NODE_DIRECTION,
  BAD_LAYOUT_PREFERENCE,
  BAD_AXIS,
  NODE_IS_ROOT,
  CANNOT_AFFECT_PARENT,
  NO_NODE_FOUND,
  NO_OUTWARD_CONNECT,
  NO_PARENT_CONNECT,
  NOT_PAINT_GROUP,
} from "./Exception";

import Axis, {
  getNegativeDirection,
  getPositiveDirection,
  getDirectionAxis,
} from "./Axis";

import Direction, {
  isCardinalDirection,
  NUM_DIRECTIONS,
  reverseDirection,
  HORIZONTAL_ORDER,
  VERTICAL_ORDER,
} from "./Direction";

import LayoutState from "./LayoutState";
import PreferredAxis from "./PreferredAxis";
import Alignment from "./Alignment";
import AxisOverlap from "./AxisOverlap";
import Fit from "./Fit";

export class NeighborData<Value> {
  owner: DirectionNode<Value>;
  direction: Direction;
  node: DirectionNode<Value>;
  alignmentMode: Alignment;
  allowAxisOverlap: AxisOverlap;
  alignmentOffset: number;
  separation: number;
  lineLength: number;
  xPos: number;
  yPos: number;

  constructor(owner: DirectionNode<Value>, dir: Direction) {
    this.owner = owner;
    this.direction = dir;
    this.node = null;
    this.alignmentMode = Alignment.NULL;
    this.alignmentOffset = 0;
    this.allowAxisOverlap = AxisOverlap.DEFAULT;
    this.separation = 0;
    this.lineLength = 0;
    this.xPos = null;
    this.yPos = null;
  }

  setNode(node: DirectionNode<Value>) {
    this.node = node;
  }

  getNode(): DirectionNode<Value> {
    return this.node;
  }

  getOwner(): DirectionNode<Value> {
    return this.owner;
  }
}

let nodeCount: number = 0;

export default class DirectionNode<Value = any> {
  _rightToLeft: boolean;
  _id: string | number;
  _nodeFit: Fit;
  _layoutPreference: PreferredAxis;
  _scale: number;

  _neighbors: NeighborData<Value>[];
  _parentNeighbor: NeighborData<Value>;

  _layoutState: LayoutState;
  _layoutPrev: DirectionNode<Value>;
  _layoutNext: DirectionNode<Value>;

  _currentPaintGroup: DirectionNode<Value>;
  _paintGroupNext: DirectionNode<Value>;
  _paintGroupPrev: DirectionNode<Value>;
  _isPaintGroup: boolean;

  _value: Value;

  constructor(initialVal: Value = null) {
    this._id = nodeCount++;

    this._nodeFit = Fit.LOOSE;
    this._rightToLeft = false;
    this._isPaintGroup = false;
    this._scale = 1.0;

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

    this._value = initialVal;

    this._layoutPreference = PreferredAxis.HORIZONTAL;
  }

  x(): number {
    if (this.isRoot()) {
      return 0;
    }
    return this.parentNeighbor().xPos;
  }

  y(): number {
    if (this.isRoot()) {
      return 0;
    }
    return this.parentNeighbor().yPos;
  }

  setRightToLeft(val: boolean): void {
    this._rightToLeft = !!val;
    this.layoutWasChanged(Direction.INWARD);
  }

  rightToLeft(): boolean {
    return this._rightToLeft;
  }

  nodeFit(): Fit {
    return this._nodeFit;
  }

  setNodeFit(nodeFit: Fit): void {
    this._nodeFit = nodeFit;
    this.layoutWasChanged(Direction.INWARD);
  }

  neighborAt(dir: Direction): NeighborData<Value> {
    return this._neighbors[dir];
  }

  protected createNeighborData(inDirection: Direction): NeighborData<Value> {
    return new NeighborData(this, inDirection);
  }

  protected ensureNeighbor(inDirection: Direction): NeighborData<Value> {
    if (!this.neighborAt(inDirection)) {
      this._neighbors[inDirection] = this.createNeighborData(inDirection);
    }
    return this.neighborAt(inDirection);
  }

  root(): DirectionNode<Value> {
    let p: DirectionNode<Value> = this;
    while (!p.isRoot()) {
      p = p.parentNode();
    }
    return p;
  }

  toString(): string {
    return "[DirectionNode id=" + this.id() + ", value=" + this.value() + "]";
  }

  needsCommit(): boolean {
    return this.getLayoutState() === LayoutState.NEEDS_COMMIT;
  }

  private removeFromLayout(inDirection: Direction): void {
    const disconnected: DirectionNode<Value> = this.nodeAt(inDirection);
    if (!disconnected) {
      return;
    }
    const layoutBefore: DirectionNode<Value> = this.findEarlierLayoutSibling(
      inDirection
    );
    const earliestDisc: DirectionNode<Value> = disconnected.findLayoutHead(
      disconnected
    );

    if (layoutBefore) {
      DirectionNode.connectLayout(layoutBefore, disconnected.nextLayout());
    } else {
      DirectionNode.connectLayout(
        earliestDisc.prevLayout(),
        disconnected.nextLayout()
      );
    }
    DirectionNode.connectLayout(disconnected, earliestDisc);
  }

  private insertIntoLayout(inDirection: Direction): void {
    const node: DirectionNode<Value> = this.nodeAt(inDirection);
    if (!node) {
      return;
    }

    const nodeHead: DirectionNode<Value> = node.findLayoutHead();

    const layoutAfter: DirectionNode<Value> = this.findLaterLayoutSibling(
      inDirection
    );
    const layoutBefore: DirectionNode<Value> = this.findEarlierLayoutSibling(
      inDirection
    );

    const nodeTail: DirectionNode<Value> = node;
    // console.log(this + ".connectNode(" + nameDirection(inDirection) +
    //   ", " + node + ") layoutBefore=" +
    //   layoutBefore + " layoutAfter=" +
    //   layoutAfter + " nodeHead=" + nodeHead);

    if (layoutBefore) {
      DirectionNode.connectLayout(layoutBefore, nodeHead);
    } else if (layoutAfter) {
      DirectionNode.connectLayout(
        layoutAfter.findLayoutHead().prevLayout(),
        nodeHead
      );
    } else {
      DirectionNode.connectLayout(this.prevLayout(), nodeHead);
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
          parentsPaintGroup.prevPaintGroup(),
          paintGroupFirst
        );
        DirectionNode.connectPaintGroup(this, parentsPaintGroup);
      }

      this.layoutChanged();
      for (let n = this.nextLayout(); n !== this; n = n.nextLayout()) {
        // console.log("Setting " + n.id() + " paint group to " + this.id());
        n.setCurrentPaintGroup(this);
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
        DirectionNode.connectPaintGroup(paintGroupLast, this.nextPaintGroup());
      } else {
        DirectionNode.connectPaintGroup(
          this.prevPaintGroup(),
          this.nextPaintGroup()
        );
      }
      this._paintGroupNext = this;
      this._paintGroupPrev = this;

      const pg = this.parentNode().findPaintGroup();
      for (let n = pg.nextLayout(); n !== pg; n = n.nextLayout()) {
        // console.log("Setting " + n.id() + " paint group to " + pg.id());
        n.setCurrentPaintGroup(pg);
      }
    } else {
      // Retain the paint groups for this implied paint group.
    }

    this.layoutChanged();
  }

  hasAncestor(parent: DirectionNode<Value>): boolean {
    let candidate: DirectionNode<Value> = this;
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
  protected findFirstPaintGroup(): DirectionNode<Value> {
    let candidate: DirectionNode<Value> = this.prevPaintGroup();
    while (candidate !== this) {
      if (!candidate.hasAncestor(this)) {
        return candidate.nextPaintGroup();
      }
      candidate = candidate.prevPaintGroup();
    }
    return candidate;
  }

  protected findLastPaintGroup(): DirectionNode<Value> {
    let candidate: DirectionNode<Value> = this.prevLayout();
    while (candidate !== this) {
      if (candidate.localPaintGroup()) {
        break;
      }
      candidate = candidate.prevLayout();
    }
    return candidate;
  }

  findPaintGroup(): DirectionNode<Value> {
    if (!this.currentPaintGroup()) {
      let node: DirectionNode<Value> = this;
      while (!node.isRoot()) {
        if (node.localPaintGroup()) {
          break;
        }
        if (node.currentPaintGroup()) {
          /* console.log(
            "Setting " +
              this.id() +
              " paint group to " +
              node.currentPaintGroup().id()
          );*/
          this.setCurrentPaintGroup(node.currentPaintGroup());
          return this.currentPaintGroup();
        }
        node = node.parentNode();
      }
      this.setCurrentPaintGroup(node);
    } else {
      // console.log("Returning cached paint group " +
      //   this.currentPaintGroup().id() +
      //   " for node " +
      //   this.id());
    }
    return this.currentPaintGroup();
  }

  localPaintGroup(): boolean {
    return !!this._isPaintGroup;
  }

  isRoot(): boolean {
    return !this._parentNeighbor;
  }

  protected parentNeighbor(): NeighborData<Value> {
    return this._parentNeighbor;
  }

  parentDirection(): Direction {
    if (this.isRoot()) {
      return Direction.NULL;
    }
    return reverseDirection(this.parentNeighbor().direction);
  }

  nodeParent(): DirectionNode<Value> {
    if (this.isRoot()) {
      throw createException(NODE_IS_ROOT);
    }
    return this.parentNeighbor().owner as this;
  }

  parentNode(): DirectionNode<Value> {
    return this.nodeParent();
  }

  parent(): DirectionNode<Value> {
    return this.nodeParent();
  }

  hasNode(atDirection: Direction): boolean {
    if (atDirection == Direction.NULL) {
      return false;
    }
    if (this.neighborAt(atDirection) && this.neighborAt(atDirection).node) {
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

  dumpPaintGroups(): DirectionNode<Value>[] {
    const pgs: DirectionNode<Value>[] = [];
    let pg: DirectionNode<Value> = this;
    do {
      pg = pg.nextPaintGroup();
      pgs.push(pg);
    } while (pg !== this);
    return pgs;
  }

  nodeAt(atDirection: Direction): DirectionNode<Value> {
    const n = this.neighborAt(atDirection);
    if (!n) {
      if (this.parentNeighbor() && this.parentDirection() === atDirection) {
        return this.parentNeighbor().owner as this;
      }
      return null;
    }
    return n.node as this;
  }

  static connectLayout = function (a: DirectionNode, b: DirectionNode): void {
    // console.log("connecting " +  a.id() + " to " + b.id());
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

  scaleAt(direction: Direction): number {
    return this.nodeAt(direction).scale();
  }

  lineLengthAt(direction: Direction): number {
    if (!this.hasNode(direction)) {
      return 0;
    }
    return this.neighborAt(direction).lineLength;
  }

  setNodeAlignmentMode(
    inDirection: Direction | Alignment,
    newAlignmentMode?: Alignment
  ): void {
    if (newAlignmentMode === undefined) {
      return this.parentNode().setNodeAlignmentMode(
        reverseDirection(this.parentDirection()),
        inDirection as Alignment
      );
    }
    this.ensureNeighbor(
      inDirection as Direction
    ).alignmentMode = newAlignmentMode;
    // console.log(nameNodeAlignment(newAlignmentMode));
    this.layoutWasChanged(inDirection as Direction);
  }

  nodeAlignmentMode(inDirection: Direction): Alignment {
    if (this.hasNode(inDirection)) {
      return this.neighborAt(inDirection).alignmentMode;
    }
    return Alignment.NULL;
  }

  setAxisOverlap(
    inDirection: Direction | AxisOverlap,
    newAxisOverlap?: AxisOverlap
  ): void {
    if (newAxisOverlap === undefined) {
      return this.parentNode().setAxisOverlap(
        reverseDirection(this.parentDirection()),
        inDirection as AxisOverlap
      );
    }
    this.ensureNeighbor(
      inDirection as Direction
    ).allowAxisOverlap = newAxisOverlap;
    this.layoutWasChanged(inDirection as Direction);
  }

  axisOverlap(inDirection?: Direction): AxisOverlap {
    if (inDirection === undefined) {
      return this.parentNode().axisOverlap(
        reverseDirection(this.parentDirection())
      );
    }
    if (this.hasNode(inDirection)) {
      return this.neighborAt(inDirection).allowAxisOverlap;
    }
    return AxisOverlap.NULL;
  }

  separationAt(inDirection: Direction): number {
    // Exclude some directions that cannot be calculated.
    if (!isCardinalDirection(inDirection)) {
      throw createException(BAD_NODE_DIRECTION);
    }

    // If the given direction is the parent's direction, use
    // their measurement instead.
    if (!this.isRoot() && inDirection == this.parentDirection()) {
      return this.nodeParent().separationAt(reverseDirection(inDirection));
    }

    if (!this.hasNode(inDirection)) {
      throw createException(NO_NODE_FOUND);
    }

    return this.neighborAt(inDirection).separation;
  }

  setPosAt(inDirection: Direction, x: number, y: number): void {
    this.neighborAt(inDirection).xPos = x;
    this.neighborAt(inDirection).yPos = y;
  }

  connectNode(
    inDirection: Direction,
    node: DirectionNode<Value>
  ): DirectionNode<Value> {
    // console.log("Connecting " + node + " to " + this + " in the " +
    //   nameDirection(inDirection) + " direction.");

    // Ensure the node can be connected in the given direction.
    if (inDirection == Direction.OUTWARD) {
      throw createException(NO_OUTWARD_CONNECT);
    }
    if (inDirection == Direction.NULL) {
      throw createException(BAD_NODE_DIRECTION);
    }
    if (inDirection == this.parentDirection()) {
      throw createException(NO_PARENT_CONNECT);
    }
    if (this.hasNode(inDirection)) {
      this.disconnectNode(inDirection);
    }
    if (!node.isRoot()) {
      node.disconnectNode();
    }
    if (node.hasNode(reverseDirection(inDirection))) {
      node.disconnectNode(reverseDirection(inDirection));
    }

    // Connect the node.
    const neighbor = this.ensureNeighbor(inDirection);
    // Allow alignments to be set before children are spawned.
    if (neighbor.alignmentMode == Alignment.NULL) {
      neighbor.alignmentMode = Alignment.NONE;
    }
    neighbor.node = node;
    node.assignParent(this, inDirection);

    if (node.localPaintGroup()) {
      // console.log("Connecting local paint group");
      const pg = this.findPaintGroup();
      const paintGroupLast = pg.prevPaintGroup();
      const nodeFirst = node.nextPaintGroup();
      // console.log("Node", node.id());
      // console.log("PG", pg.id());
      // console.log("PG Last", paintGroupLast.id());
      // console.log("Node first", nodeFirst.id());
      DirectionNode.connectPaintGroup(paintGroupLast, nodeFirst);
      DirectionNode.connectPaintGroup(node, pg);
    } else {
      this.insertIntoLayout(inDirection);
      node.setCurrentPaintGroup(this.currentPaintGroup());
      for (let n = node.nextLayout(); n !== node; n = n.nextLayout()) {
        n.setCurrentPaintGroup(this.currentPaintGroup());
      }
      if (node.nextPaintGroup() !== node) {
        const pg = this.findPaintGroup();
        const paintGroupLast = pg.prevPaintGroup();
        const nodeFirst = node.nextPaintGroup();
        const nodeLast = node.prevPaintGroup();
        DirectionNode.connectPaintGroup(paintGroupLast, nodeFirst);
        DirectionNode.connectPaintGroup(nodeLast, pg);
        node._paintGroupPrev = node;
        node._paintGroupNext = node;
      }
    }

    this.layoutWasChanged(inDirection);

    return node;
  }

  scale(): number {
    return this._scale;
  }

  setScale(scale: number): void {
    this._scale = scale;
    this.layoutWasChanged(Direction.INWARD);
  }

  protected firstAndLastPaintGroups(): [DirectionNode, DirectionNode] {
    const pg = this.findPaintGroup();
    if (!pg.isRoot() && !pg.localPaintGroup()) {
      throw createException(NOT_PAINT_GROUP);
    }
    let lastPaintGroup: DirectionNode<Value> = null;
    let firstPaintGroup: DirectionNode<Value> = null;
    for (let n = pg.prevPaintGroup(); n != pg; n = n.prevPaintGroup()) {
      // console.log("First and last iteration. n=" + n.id());
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

  disconnectNode(inDirection?: Direction): DirectionNode<Value> {
    if (arguments.length === 0) {
      if (this.isRoot()) {
        return this;
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
    const neighbor = this.neighborAt(inDirection);
    const disconnected = neighbor.node as this;
    // console.log("Disconnecting ", disconnected.id(), " from ", this.id());

    if (!disconnected.localPaintGroup()) {
      this.removeFromLayout(inDirection);

      const [
        firstPaintGroup,
        lastPaintGroup,
      ] = disconnected.firstAndLastPaintGroups();
      /* console.log(
        "paint groups",
        firstPaintGroup.id(),
        lastPaintGroup.id()
      );*/
      DirectionNode.connectPaintGroup(
        firstPaintGroup.prevPaintGroup(),
        lastPaintGroup.nextPaintGroup()
      );
      DirectionNode.connectPaintGroup(disconnected, firstPaintGroup);
      DirectionNode.connectPaintGroup(lastPaintGroup, disconnected);
    } else {
      const paintGroupFirst = disconnected.findFirstPaintGroup();
      /* console.log(
        "First paint group",
        paintGroupFirst.id(),
        paintGroupFirst.prevPaintGroup().id()
      );*/
      DirectionNode.connectPaintGroup(
        paintGroupFirst.prevPaintGroup(),
        disconnected.nextPaintGroup()
      );
      DirectionNode.connectPaintGroup(disconnected, paintGroupFirst);
    }

    neighbor.node = null;
    disconnected.assignParent(null);

    if (disconnected.getLayoutPreference() === PreferredAxis.PARENT) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected.setLayoutPreference(PreferredAxis.VERTICAL);
      } else {
        disconnected.setLayoutPreference(PreferredAxis.HORIZONTAL);
      }
    } else if (
      disconnected.getLayoutPreference() === PreferredAxis.PERPENDICULAR
    ) {
      if (Axis.VERTICAL === getDirectionAxis(inDirection)) {
        disconnected.setLayoutPreference(PreferredAxis.HORIZONTAL);
      } else {
        disconnected.setLayoutPreference(PreferredAxis.VERTICAL);
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

  protected findEarlierLayoutSibling(
    inDirection: Direction
  ): DirectionNode<Value> {
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

  protected findLaterLayoutSibling(
    inDirection: Direction
  ): DirectionNode<Value> {
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

  protected findLayoutHead(
    excludeThisNode?: DirectionNode<Value>
  ): DirectionNode<Value> {
    let deeplyLinked: DirectionNode<Value> = this;
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

  protected sanitizeLayoutPreference(given: PreferredAxis): PreferredAxis {
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

  getLayoutPreference(): PreferredAxis {
    return this._layoutPreference;
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
      const aa = firstHorz.prevLayout();
      const dd = lastVert.nextLayout();
      DirectionNode.connectLayout(aa, firstVert);
      DirectionNode.connectLayout(lastHorz, dd);
      DirectionNode.connectLayout(lastVert, firstHorz);
    };
    const vertToHorz = function () {
      // console.log("vertToHorz exec");
      if (!firstHorz || !firstVert) {
        return;
      }
      const aa = firstHorz.prevLayout();
      const dd = lastVert.nextLayout();
      // console.log("aa=" + aa.id());
      // console.log("dd=" + dd.id());
      // console.log("firstHorz=" + firstHorz.id());
      // console.log("lastVert=" + lastVert.id());
      // console.log("lastHorz=" + lastHorz.id());
      // console.log("firstVert=" + firstVert.id());
      DirectionNode.connectLayout(aa, firstHorz);
      DirectionNode.connectLayout(lastVert, dd);
      DirectionNode.connectLayout(lastHorz, firstVert);
    };
    if (this.isRoot()) {
      if (
        given !== PreferredAxis.VERTICAL &&
        given !== PreferredAxis.HORIZONTAL
      ) {
        throw createException(BAD_LAYOUT_PREFERENCE);
      }
      if (this.getLayoutPreference() === given) {
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
        this.getLayoutPreference() === PreferredAxis.HORIZONTAL ||
        this.getLayoutPreference() === PreferredAxis.PERPENDICULAR
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
    //   namePreferredAxis(this.getLayoutPreference()));
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
    let canonicalPref: PreferredAxis = this.getLayoutPreference();
    switch (this.getLayoutPreference()) {
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
        canonicalPref = this.getLayoutPreference();
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

  protected assignParent(
    fromNode?: DirectionNode<Value>,
    parentDirection?: Direction
  ): void {
    if (arguments.length === 0 || !fromNode) {
      // Clearing the parent.
      this._parentNeighbor = null;
      return;
    }
    this._parentNeighbor = fromNode.neighborAt(parentDirection);
    if (!this._parentNeighbor) {
      throw createException(BAD_NODE_DIRECTION);
    }
  }

  protected invalidateLayout(): void {
    this.setLayoutState(LayoutState.NEEDS_COMMIT);
    this.setCurrentPaintGroup(null);
  }

  getLayoutState(): LayoutState {
    return this._layoutState;
  }

  setLayoutState(state: LayoutState) {
    this._layoutState = state;
  }

  protected layoutWasChanged(changeDirection?: Direction): void {
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

    let node: DirectionNode<Value> = this;
    while (node !== null) {
      // console.log("Node " + node + " has layout changed");
      const oldLayoutState = node.getLayoutState();

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

  forEachNode(func: (node: DirectionNode<Value>) => void): void {
    let node: DirectionNode<Value> = this;
    do {
      func(node);
      node = node.prevLayout();
    } while (node !== this);
  }

  forEachPaintGroup(func: (node: DirectionNode<Value>) => void): void {
    let paintGroup: DirectionNode<Value> = this;
    do {
      if (!paintGroup.localPaintGroup() && !paintGroup.isRoot()) {
        throw createException(NOT_PAINT_GROUP);
      }
      func(paintGroup);
      paintGroup = paintGroup.prevPaintGroup();
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
    this.setLayoutState(LayoutState.NULL);
  }

  value(): Value {
    return this._value;
  }

  setValue(newValue: Value, report?: boolean): void {
    // console.log("Setting value to ", newValue);
    const orig = this.value();
    if (orig === newValue) {
      return;
    }
    this._value = newValue;
    if (arguments.length === 1 || report) {
      this.layoutChanged(Direction.INWARD);
    }
  }

  id(): string | number {
    return this._id;
  }

  setId(id: string | number) {
    this._id = id;
  }

  nextLayout(): DirectionNode<Value> {
    return this._layoutNext;
  }

  prevLayout(): DirectionNode<Value> {
    return this._layoutPrev;
  }

  nextPaintGroup(): DirectionNode<Value> {
    return this._paintGroupNext;
  }

  prevPaintGroup(): DirectionNode<Value> {
    return this._paintGroupPrev;
  }

  setCurrentPaintGroup(pg: DirectionNode<Value>) {
    this._currentPaintGroup = pg;
  }

  currentPaintGroup(): DirectionNode<Value> {
    return this._currentPaintGroup;
  }
}
