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

describe("Caret", function () {
  it("can use a ", () => {
    const car = new DirectionCaret("a");
    assert.equal("a", car.node().value());
    car.spawnMove("f", "b");
    assert.equal("b", car.node().value());
  });
});
