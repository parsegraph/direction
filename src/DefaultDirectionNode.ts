import DirectionNode from "./DirectionNode";

export default class DefaultDirectionNode extends DirectionNode {
  supportsDirection(): boolean {
    return true;
  }
}
