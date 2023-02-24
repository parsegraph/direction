import { assert } from "chai";
import Direction, { PreferredAxis, DirectionNode } from "../src/index";

describe("DirectionNode", function () {
  it("can be constructed without a Type param", () => {
    new DirectionNode();
  });

  it("can be constructed with a string param", () => {
    const n = new DirectionNode<string>();
    assert.equal(null, n.value());
    n.setValue("Hey");
    assert.equal("Hey", n.value());
  });

  it("can handle paint group creasing", () => {
    const root = new DirectionNode<string>().setId("root");

    const makeBlock = (name: string) => {
      const node = new DirectionNode<string>().setId(name + " block");
      const inner = new DirectionNode<string>().setId(name + "inward");
      inner.crease();
      node.connectNode(Direction.INWARD, inner);
      return node;
    };

    let last = root;
    let next = root;
    for (let i = 0; i < 5; ++i) {
      const b = makeBlock(String(i));
      const bud = new DirectionNode().setId(`${i} bud`);
      bud.connectNode(Direction.FORWARD, b);
      // b.crease();
      next.connectNode(Direction.DOWNWARD, bud);
      last = next;
      next = bud;
    }

    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual(["root", "0inward", "1inward", "2inward", "3inward", "4inward"]);

    const spawned = makeBlock("spawned");
    next.connectNode(Direction.FORWARD, spawned);
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual([
      "root",
      "0inward",
      "1inward",
      "2inward",
      "3inward",
      "spawnedinward",
    ]);
    spawned.crease();
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual([
      "root",
      "0inward",
      "1inward",
      "2inward",
      "3inward",
      "spawnedinward",
      "spawned block",
    ]);
    next.disconnectNode(Direction.FORWARD);
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual(["root", "0inward", "1inward", "2inward", "3inward"]);
    next.connectNode(Direction.FORWARD, spawned);
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual([
      "root",
      "0inward",
      "1inward",
      "2inward",
      "3inward",
      "spawnedinward",
      "spawned block",
    ]);
    spawned.uncrease();
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual([
      "root",
      "0inward",
      "1inward",
      "2inward",
      "3inward",
      "spawnedinward",
    ]);
    next.disconnectNode(Direction.FORWARD);
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual(["root", "0inward", "1inward", "2inward", "3inward"]);

    last.disconnectNode(Direction.FORWARD);
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual(["root", "0inward", "1inward", "2inward"]);
    const spawned2 = makeBlock("spawned2");
    // spawned2.crease();
    last.connectNode(Direction.FORWARD, spawned2);

    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual(["root", "0inward", "1inward", "2inward", "spawned2inward"]);

    spawned2.crease();

    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual([
      "root",
      "0inward",
      "1inward",
      "2inward",
      "spawned2inward",
      "spawned2 block",
    ]);

    last.disconnectNode(Direction.FORWARD);

    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual(["root", "0inward", "1inward", "2inward"]);
    spawned2.uncrease();

    last.connectNode(Direction.FORWARD, spawned2);
    expect(
      root
        .paintGroup()
        .dump()
        .map((pg) => pg.id())
    ).toEqual(["root", "0inward", "1inward", "2inward", "spawned2inward"]);
  });

  it("can be pulled", () => {
    const bud = new DirectionNode().setId("bud");
    bud.setLayoutPreference(PreferredAxis.VERTICAL);
    bud.connectNode(Direction.FORWARD, new DirectionNode().setId("f"));
    bud.connectNode(Direction.BACKWARD, new DirectionNode().setId("b"));
    bud.connectNode(Direction.DOWNWARD, new DirectionNode().setId("d"));
    bud.connectNode(Direction.UPWARD, new DirectionNode().setId("u"));
    bud.setLayoutPreference(PreferredAxis.HORIZONTAL);
  });

  it("can be pulled the other way", () => {
    const bud = new DirectionNode().setId("bud");
    bud.setLayoutPreference(PreferredAxis.HORIZONTAL);
    bud.connectNode(Direction.FORWARD, new DirectionNode().setId("f"));
    bud.connectNode(Direction.BACKWARD, new DirectionNode().setId("b"));
    bud.connectNode(Direction.DOWNWARD, new DirectionNode().setId("d"));
    bud.connectNode(Direction.UPWARD, new DirectionNode().setId("u"));
    bud.setLayoutPreference(PreferredAxis.VERTICAL);
  });
});
