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
});
