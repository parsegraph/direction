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
  isVerticalDirection,
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
import NeighborData from "./NeighborData";
import DirectionNodeSiblings from "./DirectionNodeSiblings";
import DirectionNodePaintGroup, {
  PaintGroupNode,
} from "./DirectionNodePaintGroup";

let nodeCount: number = 0;

export default class DirectionNode<Value = any> implements PaintGroupNode {
  _id: string | number;
  _nodeFit: Fit;
  _rightToLeft: boolean;
  _layoutPreference: PreferredAxis;
  _scale: number;
  _value: Value;
  _layoutState: LayoutState;

  _neighbors: NeighborData<DirectionNode<Value>>[];
  _parentNeighbor: NeighborData<DirectionNode<Value>>;

  _siblings: DirectionNodeSiblings<this>;
  _paintGroup: DirectionNodePaintGroup<DirectionNode<Value>>;
  _paintGroupRoot: DirectionNode<Value>;

  constructor(initialVal: Value = null) {
    this._id = nodeCount++;
    this._nodeFit = Fit.LOOSE;
    this._rightToLeft = false;
    this._layoutPreference = PreferredAxis.HORIZONTAL;
    this._scale = 1.0;
    this._value = initialVal;
    this._layoutState = LayoutState.NEEDS_COMMIT;

    // Neighbors
    this._neighbors = [];
    for (let i = 0; i < NUM_DIRECTIONS; ++i) {
      this._neighbors.push(null);
    }
    this._parentNeighbor = null;

    // Layout
    this._siblings = new DirectionNodeSiblings<this>(this);
    this._paintGroupRoot = this;
    this._paintGroup = new DirectionNodePaintGroup<DirectionNode<Value>>(
      this,
      false
    );
  }

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Neighbors
  //
  // ///////////////////////////////////////////////////////////////////////////

  neighborAt(dir: Direction): NeighborData<DirectionNode<Value>> {
    return this._neighbors[dir];
  }

  protected createNeighborData(
    inDirection: Direction
  ): NeighborData<DirectionNode<Value>> {
    return new NeighborData<DirectionNode<Value>>(this, inDirection);
  }

  protected ensureNeighbor(
    inDirection: Direction
  ): NeighborData<DirectionNode<Value>> {
    if (!this.neighborAt(inDirection)) {
      this._neighbors[inDirection] = this.createNeighborData(inDirection);
    }
    return this.neighborAt(inDirection);
  }

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Node parent
  //
  // ///////////////////////////////////////////////////////////////////////////

  parentNeighbor(): NeighborData<DirectionNode<Value>> {
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

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Node root
  //
  // ///////////////////////////////////////////////////////////////////////////

  root(): DirectionNode<Value> {
    let p: DirectionNode<Value> = this;
    while (!p.isRoot()) {
      p = p.parentNode();
    }
    return p;
  }

  isRoot(): boolean {
    return !this._parentNeighbor;
  }

  isRootlike(): boolean {
    return (
      this.isRoot() ||
      this.parentDirection() === Direction.INWARD ||
      this.parentDirection() === Direction.OUTWARD
    );
  }

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Graph traversal
  //
  // ///////////////////////////////////////////////////////////////////////////

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

  nodeAt(atDirection: Direction): this {
    const n = this.neighborAt(atDirection);
    if (!n) {
      if (this.parentNeighbor() && this.parentDirection() === atDirection) {
        return this.parentNeighbor().owner as this;
      }
      return null;
    }
    return n.node as this;
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

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Node state
  //
  // ///////////////////////////////////////////////////////////////////////////

  id(): string | number {
    return this._id;
  }

  setId(id: string | number) {
    this._id = id;
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

  rightToLeft(): boolean {
    return this._rightToLeft;
  }

  setRightToLeft(val: boolean): void {
    this._rightToLeft = !!val;
    this.layoutChanged(Direction.INWARD);
  }

  nodeFit(): Fit {
    return this._nodeFit;
  }

  setNodeFit(nodeFit: Fit): void {
    this._nodeFit = nodeFit;
    this.layoutChanged(Direction.INWARD);
  }

  getLayoutState(): LayoutState {
    return this._layoutState;
  }

  needsCommit(): boolean {
    return this.getLayoutState() === LayoutState.NEEDS_COMMIT;
  }

  nodeAlignmentMode(inDirection: Direction): Alignment {
    if (this.hasNode(inDirection)) {
      return this.neighborAt(inDirection).alignmentMode;
    }
    return Alignment.NULL;
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
    this.layoutChanged(inDirection as Direction);
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
    this.layoutChanged(inDirection as Direction);
  }

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Layout order
  //
  // ///////////////////////////////////////////////////////////////////////////

  siblings(): DirectionNodeSiblings<this> {
    return this._siblings;
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

  setLayoutPreference(given: PreferredAxis): void {
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
        this.siblings().horzToVert();
      } else {
        // PREFER_VERTICAL_AXIS -> PREFER_HORIZONTAL_AXIS
        this.siblings().vertToHorz();
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
        this.siblings().horzToVert();
      } else {
        this.siblings().vertToHorz();
      }
    } else {
      if (paxis === Axis.VERTICAL) {
        this.siblings().vertToHorz();
      } else {
        this.siblings().horzToVert();
      }
    }

    this.layoutChanged(Direction.INWARD);
  }

  pull(given: Direction): void {
    if (this.isRoot() || this.parentDirection() === Direction.OUTWARD) {
      if (isVerticalDirection(given)) {
        this.setLayoutPreference(PreferredAxis.VERTICAL);
      } else {
        this.setLayoutPreference(PreferredAxis.HORIZONTAL);
      }
      return;
    }
    if (getDirectionAxis(given) === getDirectionAxis(this.parentDirection())) {
      // console.log(namePreferredAxis(PreferredAxis.PARENT));
      this.setLayoutPreference(PreferredAxis.PARENT);
    } else {
      // console.log(namePreferredAxis(PreferredAxis.PERPENDICULAR);
      this.setLayoutPreference(PreferredAxis.PERPENDICULAR);
    }
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

  forEachNode(func: (node: this) => void): void {
    let node = this;
    do {
      func(node);
      node = node.siblings().prev();
    } while (node !== this);
  }

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Position
  //
  // ///////////////////////////////////////////////////////////////////////////

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

  setPosAt(inDirection: Direction, x: number, y: number): void {
    this.neighborAt(inDirection).xPos = x;
    this.neighborAt(inDirection).yPos = y;
  }

  scale(): number {
    return this._scale;
  }

  setScale(scale: number): void {
    this._scale = scale;
    this.layoutChanged(Direction.INWARD);
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

  scaleAt(direction: Direction): number {
    return this.nodeAt(direction).scale();
  }

  lineLengthAt(direction: Direction): number {
    if (!this.hasNode(direction)) {
      return 0;
    }
    return this.neighborAt(direction).lineLength;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Paint groups
  //
  // ///////////////////////////////////////////////////////////////////////////

  localPaintGroup(): DirectionNodePaintGroup<DirectionNode<Value>> {
    return this._paintGroup;
  }

  paintGroup(): DirectionNodePaintGroup<DirectionNode<Value>> {
    if (!this._paintGroup) {
      const node = this.paintGroupRoot();
      if (!node || node === this) {
        return null;
      }
      return node.paintGroup();
    }
    return this._paintGroup;
  }

  forEachPaintGroup(func: (node: PaintGroupNode) => void): void {
    let node: PaintGroupNode = this;
    do {
      if (!node.paintGroup()) {
        throw createException(NOT_PAINT_GROUP);
      }
      func(node);
      node = node.paintGroup().prev();
    } while (node !== this);
  }

  findPaintGroup(): DirectionNode<Value> {
    if (!this.paintGroupRoot()) {
      let node: DirectionNode<Value> = this;
      while (!node.isRoot()) {
        if (node.localPaintGroup()) {
          break;
        }
        if (node.paintGroupRoot()) {
          /* console.log(
            "Setting " +
              this.id() +
              " paint group to " +
              node.currentPaintGroup().id()
          );*/
          this.setPaintGroupRoot(node.paintGroupRoot());
          return this.paintGroupRoot();
        }
        node = node.parentNode();
      }
      this.setPaintGroupRoot(node);
    } else {
      // console.log("Returning cached paint group " +
      //   this.currentPaintGroup().id() +
      //   " for node " +
      //   this.id());
    }
    return this.paintGroupRoot();
  }

  /**
   * Finds the first paint group to be drawn that is a descendant of this
   * node, or this node if no descendant is a paint group.
   *
   * @return {this} The first paint group to be drawn that is a child of this paint group.
   */
  findFirstPaintGroup(): PaintGroupNode {
    let candidate: PaintGroupNode = this.localPaintGroup()
      ? this.paintGroup().prev()
      : this;
    while (candidate !== this) {
      if (!candidate.hasAncestor(this)) {
        return candidate.paintGroup().next();
      }
      candidate = candidate.paintGroup().prev();
    }
    return candidate;
  }

  paintGroupRoot(): DirectionNode<Value> {
    return this._paintGroupRoot;
  }

  crease() {
    if (this.localPaintGroup()) {
      this.paintGroup().crease();
    } else {
      this._paintGroup = new DirectionNodePaintGroup<DirectionNode<Value>>(
        this,
        true
      );
    }
  }

  uncrease() {
    if (this.paintGroup()) {
      this.paintGroup().uncrease();
    }
  }

  setPaintGroupRoot(pg: DirectionNode<Value>) {
    if (!pg) {
      throw new Error("Refusing to set paint group root to null");
    }
    this._paintGroupRoot = pg;
  }

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Layout state
  //
  // ///////////////////////////////////////////////////////////////////////////

  protected invalidateLayout(): void {
    this.setLayoutState(LayoutState.NEEDS_COMMIT);
  }

  setLayoutState(state: LayoutState) {
    this._layoutState = state;
  }

  layoutChanged(changeDirection?: Direction): void {
    // console.log("layoutChanged(" +
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

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Graph manipulators
  //
  // ///////////////////////////////////////////////////////////////////////////

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

    if (node.paintGroup().explicit()) {
      // console.log("Connecting local paint group");
      const pg = this.findPaintGroup();
      pg.paintGroup().append(node);
    } else {
      this.siblings().insertIntoLayout(inDirection);
      node.setPaintGroupRoot(this.paintGroupRoot());
      node.forEachNode((n) => n.setPaintGroupRoot(this.paintGroupRoot()));
      if (node.paintGroup().next() !== node) {
        const pg = this.findPaintGroup();
        pg.paintGroup().merge(node);
      }
      node._paintGroup = null;
    }

    this.layoutChanged(inDirection);

    return node;
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
    // console.log("Disconnecting ", disconnected.id(), " from ", this.id());
    const neighbor = this.neighborAt(inDirection);
    const disconnected = neighbor.node as this;

    const clearExplicit = !disconnected.localPaintGroup();
    if (!disconnected.localPaintGroup()) {
      disconnected.crease();
    }
    disconnected.paintGroup().disconnect();

    neighbor.node = null;
    disconnected.assignParent(null);

    if (clearExplicit) {
      disconnected.paintGroup().clearExplicit();
    }

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
    this.layoutChanged(inDirection);

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

  // ///////////////////////////////////////////////////////////////////////////
  //
  // Debugging
  //
  // ///////////////////////////////////////////////////////////////////////////

  toString(): string {
    return "[DirectionNode id=" + this.id() + ", value=" + this.value() + "]";
  }
}
