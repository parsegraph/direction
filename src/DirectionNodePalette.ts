import DirectionNode from "./DirectionNode";
import NodePalette from "./NodePalette";

export default class DirectionNodePalette<Value> extends NodePalette<Value> {
  spawn(): DirectionNode {
    return new DirectionNode();
  }
  replace(): void {}
}
