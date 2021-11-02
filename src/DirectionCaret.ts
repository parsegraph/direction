import {
  Direction,
  readDirection,
  reverseDirection,
  isVerticalDirection,
  getDirectionAxis,
} from "./definition";
import createException, { NO_NODE_FOUND } from "./Exception";
import generateID from "parsegraph-generateid";
import DirectionNode from "./DirectionNode";
import PreferredAxis from "./PreferredAxis";
import NodePalette from "./NodePalette";

export default class DirectionCaret<T extends DirectionNode> {
  _nodeRoot: T;
  _nodes: T[];
  _savedNodes: { [key: string]: T };
  _palette: NodePalette<T>;

  constructor(palette: NodePalette<T>, given: any) {
    // A mapping of nodes to their saved names.
    this._savedNodes = null;

    this._palette = palette;

    this._nodeRoot = this.doSpawn(given) as T;

    // Stack of nodes.
    this._nodes = [this._nodeRoot];
  }

  setPalette(palette: NodePalette<T>) {
    this._palette = palette;
  }

  palette(): NodePalette<T> {
    return this._palette;
  }

  doSpawn(given?: any): T {
    if (this._palette) {
      return this._palette.spawn(given);
    }
    return given instanceof DirectionNode
      ? (given as T)
      : (new DirectionNode() as T);
  }

  doReplace(node: T, given?: any): void {
    if (this._palette) {
      return this._palette.replace(node, given);
    }
    throw new Error(`Replace of ${node} with ${given} not supported`);
  }

  clone(): DirectionCaret<T> {
    const car = new DirectionCaret<T>(this.palette(), this.node());
    return car;
  }

  node(): T {
    if (this._nodes.length === 0) {
      throw createException(NO_NODE_FOUND);
    }
    return this._nodes[this._nodes.length - 1];
  }

  has(inDirection: Direction | string): boolean {
    inDirection = readDirection(inDirection);
    return this.node().hasNode(inDirection);
  }

  connect(inDirection: Direction | string, node: T): T {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    this.node().connectNode(inDirection, node);

    return node;
  }

  connectMove(inDirection: Direction | string, node: T): T {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    this.connect(inDirection, node);
    this.move(inDirection);
    return node;
  }

  disconnect(inDirection?: Direction | string): T {
    if (arguments.length > 0) {
      // Interpret the given direction for ease-of-use.
      inDirection = readDirection(inDirection);
      return this.node().disconnectNode(inDirection);
    }

    if (this.node().isRoot()) {
      return this.node();
    }

    return this.node()
      .parentNode()
      .disconnectNode(reverseDirection(this.node().parentDirection()));
  }

  crease(inDirection?: Direction | string): void {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    let node: T;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }

    // Create a new paint group for the connection.
    if (!node.localPaintGroup()) {
      node.setPaintGroup(true);
    }
  }

  uncrease(inDirection?: Direction | string) {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    let node: T;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }

    // Remove the paint group.
    node.setPaintGroup(false);
  }

  isCreased(inDirection?: Direction | string): boolean {
    // Interpret the given direction for ease-of-use.
    inDirection = readDirection(inDirection);

    let node: T;
    if (arguments.length === 0) {
      node = this.node();
    } else {
      node = this.node().nodeAt(inDirection);
    }

    return !!node.localPaintGroup();
  }

  creased(inDirection?: Direction | string): boolean {
    return this.isCreased(inDirection);
  }

  erase(inDirection: Direction | string): void {
    inDirection = readDirection(inDirection);
    this.node().eraseNode(inDirection);
  }

  move(toDirection: Direction | string): void {
    toDirection = readDirection(toDirection);
    const dest: T = this.node().nodeAt(toDirection);
    if (!dest) {
      throw createException(NO_NODE_FOUND);
    }
    this._nodes[this._nodes.length - 1] = dest;
  }

  push(): void {
    this._nodes.push(this.node());
  }

  save(id?: string): string {
    if (id === undefined) {
      id = generateID();
    }
    if (!this._savedNodes) {
      this._savedNodes = {};
    }
    this._savedNodes[id] = this.node();
    return id;
  }

  clearSave(id: string): void {
    if (!this._savedNodes) {
      return;
    }
    if (id === undefined) {
      id = "";
    }
    delete this._savedNodes[id];
  }

  restore(id: string): void {
    if (!this._savedNodes) {
      throw new Error(
        "No saved nodes were found for the provided ID '" + id + "'"
      );
    }
    const loadedNode: T = this._savedNodes[id];
    if (loadedNode == null) {
      throw new Error("No node found for the provided ID '" + id + "'");
    }
    this._nodes[this._nodes.length - 1] = loadedNode;
  }

  moveTo(id: string): void {
    this.restore(id);
  }

  moveToRoot(): void {
    this._nodes[this._nodes.length - 1] = this._nodeRoot;
  }

  pop(): void {
    if (this._nodes.length <= 1) {
      throw createException(NO_NODE_FOUND);
    }
    this._nodes.pop();
  }

  pull(given: Direction | string): void {
    given = readDirection(given);
    if (
      this.node().isRoot() ||
      this.node().parentDirection() === Direction.OUTWARD
    ) {
      if (isVerticalDirection(given)) {
        this.node().setLayoutPreference(PreferredAxis.VERTICAL);
      } else {
        this.node().setLayoutPreference(PreferredAxis.HORIZONTAL);
      }
      return;
    }
    if (
      getDirectionAxis(given) ===
      getDirectionAxis(this.node().parentDirection())
    ) {
      // console.log(namePreferredAxis(PreferredAxis.PARENT));
      this.node().setLayoutPreference(PreferredAxis.PARENT);
    } else {
      // console.log(namePreferredAxis(PreferredAxis.PERPENDICULAR);
      this.node().setLayoutPreference(PreferredAxis.PERPENDICULAR);
    }
  }

  /*
   * Returns the initially provided node.
   */
  root(): T {
    return this._nodeRoot;
  }

  // ////////////////////////////////////////////////////////////////////////////
  //
  // Type-related methods
  //
  // ////////////////////////////////////////////////////////////////////////////

  spawn(inDirection: Direction | string, newType?: any): T {
    // Interpret the given direction and type for ease-of-use.
    inDirection = readDirection(inDirection);

    // Spawn a node in the given direction.
    const created: T = this.doSpawn(newType);
    this.node().connectNode(inDirection, created);
    created.setLayoutPreference(PreferredAxis.PERPENDICULAR);

    return created;
  }

  replace(...args: any[]): void {
    // Retrieve the arguments.
    let node: T = this.node();
    let withType: T | string;
    if (args.length > 1) {
      node = node.nodeAt(readDirection(args[0]));
      withType = args[1];
    } else {
      withType = args[0];
    }
    this.doReplace(node, withType);
  }

  spawnMove(inDirection: Direction | string, newType?: T | string): T {
    const created: T = this.spawn(inDirection, newType);
    this.move(inDirection);
    return created;
  }

  at(inDirection: Direction | string): T {
    inDirection = readDirection(inDirection);
    if (this.node().hasNode(inDirection)) {
      return this.node().nodeAt(inDirection);
    }
  }
}
