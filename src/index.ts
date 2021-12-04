import DirectionNode, { NeighborData } from "./DirectionNode";
import DirectionCaret, { SHRINK_SCALE } from "./DirectionCaret";

import NodePalette from "./NodePalette";

import LayoutState, { nameLayoutState } from "./LayoutState";

import PreferredAxis, {
  namePreferredAxis,
  readPreferredAxis,
} from "./PreferredAxis";

import Direction, {
  NUM_DIRECTIONS,
  HORIZONTAL_ORDER,
  VERTICAL_ORDER,
  readDirection,
  nameDirection,
  isDirection,
  reverseDirection,
  isCardinalDirection,
  forEachCardinalDirection,
  alternateDirection,
} from './Direction';

import Axis, {
  nameAxis,
  getDirectionAxis,
  isVerticalDirection,
  isHorizontalDirection,
  getPerpendicularAxis,
  isPositiveDirection,
  getPositiveDirection,
  getNegativeDirection,
  isNegativeDirection,
  directionSign,
} from './Axis';

import {
  turnLeft,
  turnRight,
  turnNegative,
  turnPositive,
} from './turn';

import Alignment, { nameAlignment, readAlignment } from "./Alignment";
import AxisOverlap, { nameAxisOverlap, readAxisOverlap } from "./AxisOverlap";
import Fit, { nameFit, readFit } from "./Fit";

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
  Alignment,
  nameAlignment,
  readAlignment,
  AxisOverlap,
  nameAxisOverlap,
  readAxisOverlap,
  Fit,
  nameFit,
  readFit,
  SHRINK_SCALE
};
