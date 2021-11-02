import DirectionNode, { NeighborData } from "./DirectionNode";
import DirectionCaret from "./DirectionCaret";

import NodePalette from "./NodePalette";
import DirectionNodePalette from "./DirectionNodePalette";

import LayoutState, { nameLayoutState } from "./LayoutState";

import PreferredAxis, {
  namePreferredAxis,
  readPreferredAxis,
} from "./PreferredAxis";

import Direction, {
  NUM_DIRECTIONS,
  Axis,
  HORIZONTAL_ORDER,
  VERTICAL_ORDER,
  readDirection,
  nameDirection,
  isDirection,
  reverseDirection,
  turnLeft,
  turnRight,
  turnNegative,
  turnPositive,
  isCardinalDirection,
  nameAxis,
  getDirectionAxis,
  isVerticalDirection,
  isHorizontalDirection,
  getPerpendicularAxis,
  getPositiveDirection,
  getNegativeDirection,
  forEachCardinalDirection,
  isPositiveDirection,
  isNegativeDirection,
  directionSign,
  alternateDirection,
} from "./definition";
import DefaultDirectionNode from "./DefaultDirectionNode";

export default Direction;

const FORWARD = Direction.FORWARD;
const BACKWARD = Direction.BACKWARD;
const UPWARD = Direction.UPWARD;
const DOWNWARD = Direction.DOWNWARD;
const INWARD = Direction.INWARD;
const OUTWARD = Direction.OUTWARD;
const NULL = Direction.NULL;

export {
  NULL,
  FORWARD,
  BACKWARD,
  UPWARD,
  DOWNWARD,
  INWARD,
  OUTWARD,
  DirectionNode,
  NeighborData,
  DirectionCaret,
  LayoutState,
  nameLayoutState,
  PreferredAxis,
  namePreferredAxis,
  readPreferredAxis,
  Direction,
  NUM_DIRECTIONS,
  Axis,
  HORIZONTAL_ORDER,
  VERTICAL_ORDER,
  readDirection,
  nameDirection,
  isDirection,
  reverseDirection,
  turnLeft,
  turnRight,
  turnNegative,
  turnPositive,
  isCardinalDirection,
  nameAxis,
  getDirectionAxis,
  isVerticalDirection,
  isHorizontalDirection,
  getPerpendicularAxis,
  getPositiveDirection,
  getNegativeDirection,
  forEachCardinalDirection,
  isPositiveDirection,
  isNegativeDirection,
  directionSign,
  alternateDirection,
  NodePalette,
  DirectionNodePalette,
  DefaultDirectionNode,
};
