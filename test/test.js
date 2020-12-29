var assert = require("assert");
import todo from "../dist/direction";

describe("Package", function () {
  it("works", ()=>{
    assert.equal(todo(), 42);
  });
});
