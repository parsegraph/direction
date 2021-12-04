import DirectionNode from "./DirectionNode";

export default abstract class NodePalette<Value> {
  abstract spawn(given?: any): DirectionNode<Value>;
  abstract replace(node: DirectionNode<Value>, given?: any): void;
}
