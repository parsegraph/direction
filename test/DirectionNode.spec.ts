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
