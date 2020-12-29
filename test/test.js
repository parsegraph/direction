var assert = require("assert");
import {
  Direction,
  readDirection
}
from "../dist/direction";

describe("Package", function () {
  it("works", ()=>{
    assert.equal(Direction.FORWARD, readDirection('f'));
  });
});
