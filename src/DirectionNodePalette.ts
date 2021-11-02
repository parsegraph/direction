import DirectionNode from "./DirectionNode";
import NodePalette from "./NodePalette";

export default class DirectionNodePalette extends NodePalette<DirectionNode> {
  spawn(given?: any): DirectionNode {
    return new DirectionNode();
  }
  replace(node: DirectionNode, given?: any): void {}
}
