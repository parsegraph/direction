import DefaultDirectionNode from "./DefaultDirectionNode";
import DirectionNode from "./DirectionNode";
import NodePalette from "./NodePalette";

export default class DirectionNodePalette extends NodePalette<DirectionNode> {
  spawn(): DirectionNode {
    return new DefaultDirectionNode();
  }
  replace(): void {}
}
