const expect = require("chai").expect;
const assert = require("chai").assert;
import {
  Direction,
  DirectionNode,
  readDirection,
  DirectionCaret,
  FORWARD,
  BACKWARD,
  UPWARD,
  DOWNWARD,
  INWARD,
  PreferredAxis,
  namePreferredAxis,
  NodePalette,
  DefaultDirectionNode,
} from "../dist/parsegraph-direction";
import { elapsed } from "parsegraph-timing";

class DirectionNodePalette extends NodePalette<DirectionNode> {
  spawn(given?: any): DirectionNode {
    return new DefaultDirectionNode();
  }
  replace(node: DirectionNode, given?: any): void {}
}

function makeCaret() {
  return new DirectionCaret(new DirectionNodePalette(), null);
}

describe("Package", function () {
  it("works", () => {
    expect(readDirection("f")).to.equal(Direction.FORWARD);
  });
});

describe("DirectionNode", function () {
  it("works", () => {
    const node = new DefaultDirectionNode();
    expect(node).to.be.instanceof(DirectionNode);
    assert(node.isRoot());
  });

  it("PaintGroup sanity", function () {
    // Spawn the graph.
    const caret = makeCaret();

    const node = caret.node();
    if (node._paintGroupNext !== node) {
      throw new Error("Node's paint group next is not itself");
    }
    const creased = caret.spawnMove(FORWARD);
    if (creased._paintGroupNext !== creased._paintGroupNext) {
      throw new Error("Child's paint group next is not null");
    }
    caret.crease();
    if (creased._paintGroupNext !== node) {
      throw new Error("Child's paint group next is not node ");
    }
  });

  it("Viewport - Block with forward creased bud", function () {
    // Spawn the graph.
    const caret = makeCaret();
    const creased = caret.spawnMove(FORWARD);
    caret.crease();
    const grandchild = caret.spawnMove(FORWARD);
    // caret.spawnMove(FORWARD);
    caret.moveToRoot();
    if (creased._layoutNext !== grandchild) {
      throw new Error(
        "Creased layout next must be " +
          grandchild +
          " but was " +
          creased._layoutNext
      );
    }
    if (grandchild._layoutNext !== creased) {
      throw new Error(
        "Grandchilds layout next must be " +
          creased +
          " but was " +
          grandchild._layoutNext
      );
    }
    if (creased._paintGroupNext !== caret.root()) {
      throw new Error(
        creased +
          "'s next paint group must be the root but was " +
          creased._paintGroupNext
      );
    }
    if (caret.root()._paintGroupNext !== creased) {
      throw new Error(
        caret.root() +
          "'s next paint group must be " +
          creased +
          " but was " +
          caret.root()._paintGroupNext
      );
    }
  });

  it("Viewport - Block with forward creased bud, uncreased", function () {
    // Spawn the graph.
    const caret = makeCaret();
    const root = caret.root();
    const creased = caret.spawnMove(FORWARD);
    caret.crease();
    caret.spawnMove(FORWARD);
    creased.setPaintGroup(false);
    if (creased._paintGroupPrev !== creased) {
      throw new Error("Creased's previous paint group must be reset");
    }
    if (creased._paintGroupNext !== creased) {
      throw new Error("Creased's next paint group must be reset");
    }
    if (root._paintGroupNext !== root) {
      throw new Error("Root's next paint group must be reset");
    }
    if (root._paintGroupPrev !== root) {
      throw new Error("Root's previous paint group must be reset");
    }
  });

  it("Viewport - Block with forward bud, removed", function () {
    // Spawn the graph.
    const caret = makeCaret();
    const root = caret.root();
    const creased = caret.spawnMove(FORWARD);
    caret.spawnMove(FORWARD);
    creased.disconnectNode();
    assert.equal(
      creased._paintGroupPrev._id,
      creased._id,
      "Creased's previous paint group must be reset"
    );
    assert.equal(
      creased._paintGroupNext._id,
      creased._id,
      "Creased's next paint group must be reset"
    );
    assert.equal(
      root._paintGroupNext._id,
      root._id,
      "Root's next paint group must be reset"
    );
    assert.equal(
      root._paintGroupPrev._id,
      root._id,
      "Root's previous paint group must be reset"
    );
  });

  it("Node Morris world threading spawned", function () {
    const n = new DefaultDirectionNode();
    n.connectNode(FORWARD, new DefaultDirectionNode());
  });
});

describe("DirectionCaret", function () {
  it("works", () => {
    const caret = makeCaret();
    if (
      caret.has(FORWARD) ||
      caret.has(BACKWARD) ||
      caret.has(UPWARD) ||
      caret.has(DOWNWARD)
    ) {
      return "Graph roots must begin as leaves.";
    }

    caret.spawn(FORWARD);
    if (!caret.has(FORWARD)) {
      return "Graph must add nodes in the specified direction.";
    }
    if (caret.has(DOWNWARD) || caret.has(BACKWARD) || caret.has(UPWARD)) {
      return "Graph must not add nodes in incorrect directions.";
    }

    caret.erase(FORWARD);
    if (
      caret.has(FORWARD) ||
      caret.has(BACKWARD) ||
      caret.has(UPWARD) ||
      caret.has(DOWNWARD)
    ) {
      return "Erase must remove the specified node.";
    }
  });

  it("nodeAt returns parent", function () {
    // Build the graph.
    const caret = makeCaret();
    caret.spawn(DOWNWARD);
    caret.move("d");
    if (caret.node().nodeAt(UPWARD) === null) {
      throw new Error("nodeAt must return parent if possible");
    }
    caret.move("u");
    caret.moveToRoot();
  });

  it("Multiple crease still creates valid paint group chain", function () {
    // console.log("Multiple crease");
    const caret = makeCaret();
    caret.node()._id = "Multiple crease root";
    const first = caret.spawnMove(DOWNWARD);
    first._id = "first";
    const second = caret.spawnMove(DOWNWARD);
    second._id = "second";
    const third = caret.spawnMove(DOWNWARD);
    third._id = "third";
    const fourth = caret.spawnMove(DOWNWARD);
    fourth._id = "fourth";
    const fifth = caret.spawnMove(DOWNWARD);
    fifth._id = "fifth";
    first.setPaintGroup(true);
    third.setPaintGroup(true);
    const pgs = caret.root().dumpPaintGroups();
    if (pgs[0] !== third) {
      console.log(pgs);
      throw new Error(
        "First paint group must be " + third + " but was " + pgs[0]
      );
    }
    if (pgs[1] !== first) {
      console.log(pgs);
      throw new Error(
        "Second paint group must be " + first + " but was " + pgs[1]
      );
    }
    if (pgs[2] !== caret.root()) {
      console.log(pgs);
      throw new Error(
        "Third paint group must be " + caret.root() + " but was " + pgs[2]
      );
    }
    // console.log("Multiple crease DONE");
  });

  it("Fancy crease", function () {
    // Build the graph.
    const caret = makeCaret();
    caret.node()._id = "root";
    const first = caret.spawnMove(DOWNWARD);
    first._id = "first";
    const second = caret.spawnMove(DOWNWARD);
    caret.push();
    second._id = "second";
    const third = caret.spawnMove(DOWNWARD);
    third._id = "third";
    const fourth = caret.spawnMove(DOWNWARD);
    fourth._id = "fourth";
    caret.pop();
    let n = caret.node();
    while (n) {
      n.setPaintGroup(true);
      n = n.nodeAt(DOWNWARD);
    }
    second.setPaintGroup(false);
    caret.moveToRoot();
    // console.log(dumpPaintGroups(caret.root()));
  });

  it("Creased forward buds", function () {
    // console.log("Creased forward buds");
    const car = makeCaret();
    const root = car.root();
    root._id = "root";
    const bnode = car.spawnMove("f", "u");
    bnode._id = "bnode";
    car.crease();
    // console.log("root next: " + root._paintGroupNext._id);
    // console.log("bnode next: " + bnode._paintGroupNext._id);
    const cnode = car.spawnMove("f", "u");
    cnode._id = "cnode";
    car.crease();
    if (root._layoutNext !== root) {
      console.log("root next: " + root._paintGroupNext._id);
      console.log("bnode next: " + bnode._paintGroupNext._id);
      console.log("cnode next: " + cnode._paintGroupNext._id);
      throw new Error(
        "root's next layout node must be itself but was " + root._layoutNext
      );
    }
    if (root._paintGroupNext !== cnode) {
      console.log(root);
      console.log(bnode);
      console.log(cnode);
      throw new Error(
        "root's next paint group must be cnode but was " + root._paintGroupNext
      );
    }
  });

  it("Node layout preference test", function () {
    const root = new DefaultDirectionNode();
    root._id = "root";

    const a = new DefaultDirectionNode();
    a._id = "a";
    const b = new DefaultDirectionNode();
    b._id = "b";
    const c = new DefaultDirectionNode();
    c._id = "c";

    const chi = new DefaultDirectionNode();
    chi._id = "chi";

    chi.connectNode(FORWARD, c);

    // root--a--b
    //       |
    //      chi--c

    // console.log("cur a",
    //   namePreferredAxis(a._layoutPreference));
    a.connectNode(DOWNWARD, chi);
    a.connectNode(FORWARD, b);
    root.connectNode(FORWARD, a);
    a.setLayoutPreference(PreferredAxis.PERPENDICULAR);

    // console.log("new a",
    //   namePreferredAxis(a._layoutPreference));
    const r = getLayoutNodes(root)[0];
    if (r !== c) {
      throw new Error("Expected c, got " + r._id);
    }

    root.disconnectNode(FORWARD);
    if (a._layoutPreference !== PreferredAxis.VERTICAL) {
      throw new Error(
        "a layoutPreference was not VERT but " +
          namePreferredAxis(a._layoutPreference)
      );
    }
  });

  it("Node Morris world threading connected", function () {
    const n = new DefaultDirectionNode();
    if (n._layoutNext != n) {
      throw new Error("Previous sanity");
    }
    if (n._layoutPrev != n) {
      throw new Error("Next sanity");
    }

    const b = new DefaultDirectionNode();
    if (b._layoutNext != b) {
      throw new Error("Previous sanity");
    }
    if (b._layoutPrev != b) {
      throw new Error("Next sanity");
    }

    n.connectNode(FORWARD, b);
    if (n._layoutPrev != b) {
      throw new Error("Next connected sanity");
    }
    if (b._layoutPrev != n) {
      return false;
    }
    if (n._layoutNext != b) {
      return false;
    }
    if (b._layoutNext != n) {
      return false;
    }
  });

  it("Node Morris world threading connected with multiple siblings", function () {
    const n = new DefaultDirectionNode();
    n._id = "n";
    if (n._layoutNext != n) {
      throw new Error("Previous sanity");
    }
    if (n._layoutPrev != n) {
      throw new Error("Next sanity");
    }

    const b = new DefaultDirectionNode();
    b._id = "b";
    if (b._layoutNext != b) {
      throw new Error("Previous sanity");
    }
    if (b._layoutPrev != b) {
      throw new Error("Next sanity");
    }

    n.connectNode(FORWARD, b);
    if (n._layoutPrev != b) {
      throw new Error("Next connected sanity");
    }
    if (b._layoutPrev != n) {
      throw new Error("Next connected sanity");
    }
    if (n._layoutNext != b) {
      throw new Error("Next connected sanity");
    }
    if (b._layoutNext != n) {
      throw new Error("Next connected sanity");
    }
    const c = new DefaultDirectionNode();
    c._id = "c";
    n.connectNode(BACKWARD, c);

    const nodes = getLayoutNodes(n);
    if (nodes[0] != c) {
      throw new Error("First node is not C");
    }
    if (nodes[1] != b) {
      throw new Error("Second node is not B");
    }
    if (nodes[2] != n) {
      throw new Error("Third node is not n");
    }
  });

  it(
    "Node Morris world threading connected with" +
      " multiple siblings and disconnected",
    function () {
      const n = new DefaultDirectionNode();
      n._id = "n";
      const b = new DefaultDirectionNode();
      b._id = "b";

      const inner = b.connectNode(INWARD, new DefaultDirectionNode());
      inner._id = "inner";
      if (b._layoutPrev != inner) {
        return "B layoutBefore isn't inner";
      }
      if (inner._layoutPrev != b) {
        return "Inner layoutBefore isn't B";
      }

      n.connectNode(FORWARD, b);
      if (n._layoutPrev != b) {
        throw new Error("Next connected sanity");
      }
      if (b._layoutPrev != inner) {
        throw new Error("N layoutBefore wasn't B");
      }
      if (inner._layoutPrev != n) {
        throw new Error("N layoutBefore wasn't B");
      }
      if (n._layoutNext != inner) {
        throw new Error("N layoutBefore wasn't B");
      }
      if (inner._layoutNext != b) {
        throw new Error("N layoutBefore wasn't B");
      }
      if (b._layoutNext != n) {
        throw new Error("N layoutBefore wasn't B");
      }
      // console.log("LNS");
      // console.log(getLayoutNodes(n));
      const c = new DefaultDirectionNode();
      c._id = "c";
      n.connectNode(BACKWARD, c);
      // console.log("PLNS");
      // console.log(getLayoutNodes(n));

      const nodes = getLayoutNodes(n);
      if (nodes[0] != c) {
        throw new Error("First node is not C");
      }
      if (nodes[1] != inner) {
        throw new Error("Second node is not inner");
      }
      if (nodes[2] != b) {
        throw new Error("Third node is not b");
      }
      if (nodes[3] != n) {
        throw new Error("Third node is not n");
      }
      if (b !== n.disconnectNode(FORWARD)) {
        throw new Error("Not even working properly");
      }
    }
  );

  it(
    "Node Morris world threading connected with" +
      " multiple siblings and disconnected 2",
    function () {
      const n = new DefaultDirectionNode();
      n._id = "n";
      if (n._layoutNext != n) {
        throw new Error("Previous sanity");
      }
      if (n._layoutPrev != n) {
        throw new Error("Next sanity");
      }

      const b = new DefaultDirectionNode();
      b._id = "b";
      testLayoutNodes([b]);

      const inner = b.connectNode(INWARD, new DefaultDirectionNode());
      inner._id = "inner";
      testLayoutNodes([inner, b]);

      n.connectNode(FORWARD, b);
      testLayoutNodes([inner, b, n]);
      const c = new DefaultDirectionNode();
      c._id = "c";
      n.connectNode(BACKWARD, c);
      testLayoutNodes([c, inner, b, n]);
      if (c !== n.disconnectNode(BACKWARD)) {
        throw new Error("Not even working properly");
      }
      testLayoutNodes([c], "disconnected");
      testLayoutNodes([inner, b, n], "finished");
    }
  );

  it("Node Morris world threading deeply connected", function () {
    const n = new DefaultDirectionNode();
    n._id = "n";
    testLayoutNodes([n], "deeply conn 1");
    const b = n.connectNode(FORWARD, new DefaultDirectionNode());
    b._id = "b";
    testLayoutNodes([b, n], "deeply conn 2");
    const c = b.connectNode(DOWNWARD, new DefaultDirectionNode());
    c._id = "c";
    testLayoutNodes([c, b, n], "deeply conn 3");
    const d = b.connectNode(FORWARD, new DefaultDirectionNode());
    d._id = "d";
    b.setLayoutPreference(PreferredAxis.VERTICAL);
    testLayoutNodes([c, d, b, n], "deeply conn 4");

    if (n._layoutNext !== c) {
      throw new Error(
        "Previous sanity 1: got " + n._layoutNext._id + " expected " + c._id
      );
    }
    if (d._layoutNext !== b) {
      throw new Error("Previous sanity 2");
    }
    if (c._layoutNext !== d) {
      throw new Error("Previous sanity 3");
    }
    if (b._layoutNext !== n) {
      throw new Error("Previous sanity 4");
    }
  });

  it("Disconnect simple test", function () {
    // console.log("DISCONNECT SIMPLE TEST");
    const car = makeCaret();
    const originalRoot = car.node();
    const midRoot = car.spawnMove("f", "b");
    car.spawnMove("f", "b");
    // *=[]=[] <--newRoot == car
    // ^oldRoot
    const newRoot = car.node();
    if (originalRoot._layoutNext != newRoot) {
      console.log("originalRoot", originalRoot);
      console.log("midRoot", midRoot);
      console.log("layoutAfter of originalRoot", originalRoot._layoutNext);
      console.log("newRoot", newRoot);
      throw new Error("Original's previous should be newroot");
    }
    // console.log("Doing disconnect");
    car.disconnect();
    if (originalRoot._layoutNext != midRoot) {
      console.log("originalRoot", originalRoot);
      console.log("midRoot", midRoot);
      console.log("layoutAfter of originalRoot", originalRoot._layoutNext);
      console.log("newRoot", newRoot);
      throw new Error("layoutAfter is invalid");
    }
  });

  it("Disconnect simple test, reversed", function () {
    const car = makeCaret();
    const originalRoot = car.node();
    const midRoot = car.spawnMove("f", "b");
    car.spawnMove("f", "b");
    const newRoot = car.node();
    car.disconnect();
    if (originalRoot._layoutNext != midRoot) {
      throw new Error("layoutAfter is invalid");
    }
  });

  it("Node Morris world threading connected with crease", function () {
    const n = new DefaultDirectionNode();
    const b = new DefaultDirectionNode();
    n.connectNode(FORWARD, b);
    b.setPaintGroup(true);
    if (b._layoutNext !== b) {
      throw new Error(
        "Crease must remove that node" +
          " from its parents layout chain (child)"
      );
    }
    if (n._layoutNext !== n) {
      throw new Error(
        "Crease must remove that node" +
          " from its parents layout chain (parent)"
      );
    }
  });

  it("Node Morris world threading connected with creased child", function () {
    const n = new DefaultDirectionNode();
    const b = new DefaultDirectionNode();
    b.setPaintGroup(true);
    n.connectNode(FORWARD, b);
    if (b._layoutNext !== b) {
      throw new Error(
        "Crease must remove that node" +
          " from its parents layout chain (child)"
      );
    }
    if (n._layoutNext !== n) {
      throw new Error(
        "Crease must remove that node" +
          " from its parents layout chain (parent)"
      );
    }
  });

  it("Disconnect complex test", function () {
    const car = makeCaret();
    const originalRoot = car.node();
    car.spawnMove("f", "b");
    car.push();
    // console.log("NODE WITH CHILD", car.node());
    car.spawnMove("d", "u");
    // console.log("MOST DOWNWARD NODE OF CHILD", car.node());
    car.pop();
    car.spawnMove("f", "b");
    // console.log("Doing complex disc", originalRoot);
    // console.log(getLayoutNodes(originalRoot));
    car.disconnect();
    // console.log("COMPLEX DISCONNECT DONE");
    // console.log(getLayoutNodes(originalRoot));
    // newRoot.commitLayoutIteratively();
  });

  it("Disconnect parent test, forward", function () {
    const car = makeCaret();
    const originalRoot = car.node();
    const midRoot = car.spawnMove("f", "b");
    const newNode = makeCaret().node();
    originalRoot.connectNode(Direction.FORWARD, newNode);
    if (originalRoot.nodeAt(Direction.FORWARD) !== newNode) {
      throw new Error("Unexpected node");
    }
  });

  it("Disconnect parent test", function () {
    const car = makeCaret();
    const originalRoot = car.node();
    const midRoot = car.spawnMove("i", "b");
    const newNode = makeCaret().node();
    originalRoot.connectNode(Direction.INWARD, newNode);
    if (originalRoot.nodeAt(Direction.INWARD) !== newNode) {
      throw new Error("Unexpected node");
    }
  });

  it("Disconnect parent test", function () {
    const n = new DefaultDirectionNode();
    const b = new DefaultDirectionNode();
    b.setPaintGroup(true);
    n.connectNode(INWARD, b);

    const a = new DefaultDirectionNode();
    const r = new DefaultDirectionNode();
    r.setPaintGroup(true);
    a.connectNode(INWARD, r);
    r.connectNode(INWARD, b);

    if (a._paintGroupNext !== b) {
      throw new Error("Wanted " + b._id + " but got " + a._paintGroupNext._id);
    }
    if (b._paintGroupNext !== r) {
      throw new Error(
        "Wanted " + r._id + " but got " + b._paintGroupNext._id + ", b=" + b._id
      );
    }
    if (r._paintGroupNext !== a) {
      throw new Error(
        "Wanted " + a._id + " but got " + r._paintGroupNext._id + ", b=" + b._id
      );
    }
  });

  it("Disconnect parent test, removal", function () {
    const car = makeCaret();
    const originalRoot = car.node();
    car.spawnMove("i", "b");
    const newNode = makeCaret().spawnMove("i", "b");
    originalRoot.connectNode(Direction.INWARD, newNode);
    if (originalRoot.nodeAt(Direction.INWARD) !== newNode) {
      throw new Error("Unexpected node");
    }
  });

  it("Disconnect parent test, creased removal", function () {
    const car = makeCaret();
    const originalRoot = car.node();
    const midRoot = car.spawnMove("i", "b");
    car.crease();
    let pgs = originalRoot.dumpPaintGroups();
    assert.deepEqual(pgs, [midRoot, originalRoot]);
    const newNode = makeCaret().spawnMove("i", "b");
    newNode.setPaintGroup(true);
    originalRoot.connectNode(Direction.INWARD, newNode);
    if (originalRoot.nodeAt(Direction.INWARD) !== newNode) {
      throw new Error("Unexpected node");
    }
    pgs = originalRoot.dumpPaintGroups();
    assert.deepEqual(
      pgs.map((n) => n._id),
      [newNode._id, originalRoot._id]
    );
  });

  it("Disconnect parent test, complex creased removal", function () {
    const car = makeCaret();
    const originalRoot = car.node();
    const midRoot = car.spawnMove("i", "b");
    car.crease();
    let pgs = originalRoot.dumpPaintGroups();
    assert.deepEqual(pgs, [midRoot, originalRoot]);
    const newNode = makeCaret().spawnMove("i", "b");
    newNode.setPaintGroup(true);
    midRoot.connectNode(Direction.INWARD, newNode);
    pgs = originalRoot.dumpPaintGroups();
    assert.deepEqual(
      pgs.map((n) => n._id),
      [newNode._id, midRoot._id, originalRoot._id]
    );
  });

  it("Disconnect parent test, creased removal with outer pg", function () {
    let car = makeCaret();
    const midRoot = car.spawnMove("i", "b");
    car.crease();
    const newNode = car.spawnMove("i", "b");
    car.crease();
    let pgs = car.root().dumpPaintGroups();
    assert.deepEqual(
      pgs.map((n) => n._id),
      [newNode._id, midRoot._id, car.root()._id]
    );

    midRoot.disconnectNode();
    assert.deepEqual(
      midRoot.dumpPaintGroups().map((n) => n._id),
      [newNode._id, midRoot._id]
    );

    car = makeCaret();
    const originalRoot = car.node();
    car.connect("i", midRoot);

    pgs = car.root().dumpPaintGroups();
    assert.deepEqual(
      pgs.map((n) => n._id),
      [newNode._id, midRoot._id, originalRoot._id]
    );
  });

  it("Disconnect parent test, creased removal with outer pg", function () {
    let car = makeCaret();
    car.spawnMove("f", "s");
    const hello = new DefaultDirectionNode();
    car.node().connectNode(Direction.INWARD, hello);

    const notime = new DefaultDirectionNode();
    hello.connectNode(Direction.FORWARD, notime);

    let ccar = makeCaret();
    const there = ccar.spawnMove("i", "b");
    ccar.crease();
    car.connect("f", ccar.root());

    assert.deepEqual(
      car
        .root()
        .dumpPaintGroups()
        .map((n) => n._id),
      [there._id, car.root()._id]
    );
  });

  it("Layout disconnection test", function () {
    let car = makeCaret();
    car.spawnMove("f", "b");
    // car is [car.root()]-[b]

    let ccar = makeCaret();
    ccar.spawnMove("f", "b");
    let n = ccar.spawnMove("i", "s");
    ccar.crease();
    // ccar is [ccar.root()]-[[n]]

    assert.deepEqual(
      car
        .root()
        .dumpPaintGroups()
        .map((n) => n._id),
      [car.root()._id]
    );

    assert.deepEqual(
      ccar
        .root()
        .dumpPaintGroups()
        .map((n) => n._id),
      [n._id, ccar.root()._id],
      "ccar should have itself and n as paint groups"
    );

    car.connect("f", ccar.root());
    // car is now [car.root()]-[ccar.root()]-[[n]]

    assert.notEqual(
      ccar.root().findPaintGroup()._id,
      ccar.root()._id,
      "ccar's paint group is not itself"
    );
    assert.equal(
      ccar.root().findPaintGroup()._id,
      car.root()._id,
      "ccar's paint group is root"
    );
    assert.equal(n.findPaintGroup()._id, n._id);

    assert.deepEqual(
      car
        .root()
        .dumpPaintGroups()
        .map((n) => n._id),
      [n._id, car.root()._id]
    );

    //console.log("Testing layout disconnection");

    car.disconnect("f");
    // car is now [car.root()]

    assert.deepEqual(
      ccar
        .root()
        .dumpPaintGroups()
        .map((n) => n._id),
      [n._id, ccar.root()._id],
      "ccar should have itself and n as paint groups"
    );

    assert.deepEqual(
      car
        .root()
        .dumpPaintGroups()
        .map((n) => n._id),
      [car.root()._id],
      "Old root should only have itself as a paint group"
    );
  });

  it("Layout failing test", function () {
    let car = makeCaret();
    car.spawnMove("f", "b");

    let n: DirectionNode;
    for (let i = 0; i < 5; ++i) {
      let ccar = makeCaret();
      ccar.spawnMove("f", "b");
      n = ccar.spawnMove("i", "s");
      ccar.crease();
      car.connect("f", ccar.root());
    }

    assert.deepEqual(
      car
        .root()
        .dumpPaintGroups()
        .map((n) => n._id),
      [n._id, car.root()._id]
    );
  });
});

function getLayoutNodes(node: DirectionNode) {
  const list = [];
  const orig = node;
  const start = new Date();
  do {
    node = node._layoutNext;
    // console.log(node._id);
    for (let i = 0; i < list.length; ++i) {
      if (list[i] == node) {
        console.log(list);
        throw new Error("Layout list has loop");
      }
    }
    list.push(node);
    if (elapsed(start) > 5000) {
      throw new Error("Infinite loop");
    }
  } while (orig != node);
  return list;
}

function testLayoutNodes(expected: DirectionNode[], name?: string) {
  const node = expected[expected.length - 1];
  const nodes = getLayoutNodes(node);
  for (let i = 0; i < expected.length; ++i) {
    if (nodes[i] != expected[i]) {
      // console.log("TESTLAYOUTNODES");
      // console.log(nodes);
      throw new Error(
        (name ? name : "") +
          " index " +
          i +
          ": Node " +
          (expected[i] ? expected[i]._id : "null") +
          " expected, not " +
          (nodes[i] ? nodes[i]._id : "null")
      );
    }
  }
}
