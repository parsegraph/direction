// Node Direction
export enum Direction {
  NULL = -1,
  INWARD,
  OUTWARD,
  DOWNWARD,
  UPWARD,
  BACKWARD,
  FORWARD,
}
export const NUM_DIRECTIONS = 6;

export enum Axis {
  NULL = 6,
  HORIZONTAL,
  VERTICAL,
}

export const HORIZONTAL_ORDER: Direction[] = [
  Direction.BACKWARD,
  Direction.FORWARD,
  Direction.DOWNWARD,
  Direction.UPWARD,
  Direction.INWARD,
  Direction.OUTWARD,
];

export const VERTICAL_ORDER: Direction[] = [
  Direction.DOWNWARD,
  Direction.UPWARD,
  Direction.BACKWARD,
  Direction.FORWARD,
  Direction.INWARD,
  Direction.OUTWARD,
];

export function readDirection(given: string | Direction): Direction {
  if (typeof given === 'number') {
    return given;
  }
  if (typeof given === 'string') {
    switch (given.charAt(0)) {
      case 'f':
      case 'F':
        return Direction.FORWARD;
      case 'b':
      case 'B':
        return Direction.BACKWARD;
      case 'u':
      case 'U':
        return Direction.UPWARD;
      case 'd':
      case 'D':
        return Direction.DOWNWARD;
      case 'i':
      case 'I':
        return Direction.INWARD;
      case 'o':
      case 'O':
        return Direction.OUTWARD;
    }
  }

  return Direction.NULL;
}

export function nameDirection(given: Direction): string {
  switch (given) {
    case Direction.NULL:
      return 'NULL';
    case Direction.FORWARD:
      return 'FORWARD';
    case Direction.BACKWARD:
      return 'BACKWARD';
    case Direction.DOWNWARD:
      return 'DOWNWARD';
    case Direction.UPWARD:
      return 'UPWARD';
    case Direction.INWARD:
      return 'INWARD';
    case Direction.OUTWARD:
      return 'OUTWARD';
  }
}
export const isDirection = nameDirection;

export function reverseDirection(given: Direction): Direction {
  switch (given) {
    case Direction.NULL:
      return Direction.NULL;
    case Direction.FORWARD:
      return Direction.BACKWARD;
    case Direction.BACKWARD:
      return Direction.FORWARD;
    case Direction.DOWNWARD:
      return Direction.UPWARD;
    case Direction.UPWARD:
      return Direction.DOWNWARD;
    case Direction.INWARD:
      return Direction.OUTWARD;
    case Direction.OUTWARD:
      return Direction.INWARD;
  }
}

export function turnLeft(given: Direction): Direction {
  switch (given) {
    case Direction.FORWARD:
      return Direction.UPWARD;
    case Direction.BACKWARD:
      return Direction.DOWNWARD;
    case Direction.DOWNWARD:
      return Direction.FORWARD;
    case Direction.UPWARD:
      return Direction.BACKWARD;
    default:
      throw new Error("BAD_NODE_DIRECTION");
  }
}

export function turnRight(given: Direction): Direction {
  return reverseDirection(turnLeft(given));
}

export function turnPositive(direction: Direction): Direction {
  return getPositiveDirection(getPerpendicularAxis(direction));
}

export function turnNegative(direction: Direction): Direction {
  return reverseDirection(turnPositive(direction));
}

export function isCardinalDirection(given: Direction): boolean {
  switch (given) {
    case Direction.NULL:
    case Direction.INWARD:
    case Direction.OUTWARD:
      return false;
    case Direction.UPWARD:
    case Direction.DOWNWARD:
    case Direction.BACKWARD:
    case Direction.FORWARD:
      return true;
  }
}

export function nameAxis(given: Axis): string {
  switch (given) {
    case Axis.NULL:
      return 'NULL';
    case Axis.VERTICAL:
      return 'VERTICAL';
    case Axis.HORIZONTAL:
      return 'HORIZONTAL';
  }
}

export function getDirectionAxis(given: Direction): Axis {
  switch (given) {
    case Direction.FORWARD:
    case Direction.BACKWARD:
      return Axis.HORIZONTAL;
    case Direction.DOWNWARD:
    case Direction.UPWARD:
      return Axis.VERTICAL;
    case Direction.INWARD:
    case Direction.OUTWARD:
    case Direction.NULL:
      return Axis.NULL;
  }
}

export function isVerticalDirection(given: Direction): boolean {
  return getDirectionAxis(given) === Axis.VERTICAL;
}

export function isHorizontalDirection(given: Direction): boolean {
  return getDirectionAxis(given) === Axis.HORIZONTAL;
}

export function getPerpendicularAxis(axisOrDirection: Direction | Axis): Axis {
  switch (axisOrDirection) {
    case Axis.HORIZONTAL:
      return Axis.VERTICAL;
    case Axis.VERTICAL:
      return Axis.HORIZONTAL;
    case Axis.NULL:
      return Axis.NULL;
    default:
      // Assume it's a direction.
      return getPerpendicularAxis(getDirectionAxis(axisOrDirection));
  }
}

export function getPositiveDirection(given: Axis) {
  switch (given) {
    case Axis.HORIZONTAL:
      return Direction.FORWARD;
    case Axis.VERTICAL:
      return Direction.DOWNWARD;
    case Axis.NULL:
      throw new Error("BAD_AXIS");
  }
}

export function forEachCardinalDirection(func: Function, thisArg?: object) {
  func.call(thisArg, Direction.DOWNWARD);
  func.call(thisArg, Direction.UPWARD);
  func.call(thisArg, Direction.FORWARD);
  func.call(thisArg, Direction.BACKWARD);
}

export function getNegativeDirection(given: Axis): Direction {
  return reverseDirection(getPositiveDirection(given));
}

export function isPositiveDirection(given: Direction): boolean {
  const positiveDirection = getPositiveDirection(getDirectionAxis(given));
  return given === positiveDirection;
}

export function isNegativeDirection(given: Direction): boolean {
  return isPositiveDirection(reverseDirection(given));
}

export function directionSign(given: Direction): number {
  return isPositiveDirection(given) ? 1 : -1;
}

export function alternateDirection(given: Direction): Direction {
  switch (given) {
    case Direction.DOWNWARD:
    case Direction.INWARD:
      return Direction.FORWARD;
    case Direction.FORWARD:
      return Direction.DOWNWARD;
    default:
      throw new Error("BAD_NODE_DIRECTION");
  }
}
