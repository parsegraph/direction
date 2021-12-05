import { assert, expect } from "chai";
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
} from "../dist/parsegraph-direction";

describe("DirectionNode", function () {
  it("can be constructed without a Type param", () => {
    new DirectionNode();
  });

  it("can be constructed with a string param", () => {
    const n = new DirectionNode<string>("No time");
    assert.equal("No time", n.value());
    n.setValue("Hey");
    assert.equal("Hey", n.value());
  });

  it("can listen for dirty events", () => {
    const p = new DirectionNode<string>("No time");
    const c = new DirectionNode<string>("Child");
    p.connectNode(Direction.DOWNWARD, c);
    p.clearDirty();
    let f = 0;
    p.setDirtyListener(() => {
      ++f;
    });
    c.setValue("Teenager");
    assert.equal(1, f, "Dirty listener is fired once on change");
  });
});
