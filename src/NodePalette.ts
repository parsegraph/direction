import DirectionNode from "./DirectionNode";

export default abstract class NodePalette<T extends DirectionNode> {
  abstract spawn(given?: any): T;
  abstract replace(node: T, given?: any): void;
}
