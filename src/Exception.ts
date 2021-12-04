export const NULL_STATUS = 0;
export const OK = 1;
export const BAD_STATUS = 2;
export const NO_NODE_FOUND = 3;
export const ALREADY_OCCUPIED = 4;
export const BAD_NODE_DIRECTION = 5;
export const BAD_NODE_CONTENT = 6;
export const BAD_AXIS = 7;
export const BAD_LAYOUT_STATE = 8;
export const BAD_NODE_ALIGNMENT = 9;
export const CANNOT_AFFECT_PARENT = 10;
export const OFFSET_IS_NEGATIVE = 11;
export const NODE_IS_ROOT = 12;
export const BAD_LAYOUT_PREFERENCE = 13;
export const BAD_AXIS_OVERLAP = 14;
export const BAD_NODE_TYPE = 15;
export const BAD_NODE_FIT = 16;
export const NODE_DIRTY = 17;
export const NO_OUTWARD_CONNECT = 18;
export const NO_PARENT_CONNECT = 19;
export const NOT_PAINT_GROUP = 20;

export function nameStatus(given: number) {
  switch (given) {
    case NULL_STATUS:
      return "NULL_STATUS";
    case OK:
      return "OK";
    case NO_NODE_FOUND:
      return "NO_NODE_FOUND";
    case ALREADY_OCCUPIED:
      return "ALREADY_OCCUPIED";
    case BAD_NODE_DIRECTION:
      return "BAD_NODE_DIRECTION";
    case BAD_NODE_CONTENT:
      return "BAD_NODE_CONTENT";
    case BAD_AXIS:
      return "BAD_AXIS";
    case BAD_LAYOUT_STATE:
      return "BAD_LAYOUT_STATE";
    case BAD_NODE_ALIGNMENT:
      return "BAD_NODE_ALIGNMENT";
    case NODE_IS_ROOT:
      return "NODE_IS_ROOT";
    case BAD_STATUS:
      return "BAD_STATUS";
    case CANNOT_AFFECT_PARENT:
      return "CANNOT_AFFECT_PARENT";
    case OFFSET_IS_NEGATIVE:
      return "OFFSET_IS_NEGATIVE";
    case BAD_LAYOUT_PREFERENCE:
      return "BAD_LAYOUT_PREFERENCE";
    case BAD_AXIS_OVERLAP:
      return "BAD_AXIS_OVERLAP";
    case BAD_NODE_TYPE:
      return "BAD_NODE_TYPE";
    case BAD_NODE_FIT:
      return "BAD_NODE_FIT";
    case NODE_DIRTY:
      return "NODE_DIRTY";
    case NO_OUTWARD_CONNECT:
      return "By rule, nodes cannot be spawned in the outward direction.";
    case NO_PARENT_CONNECT:
      return "Cannot connect a node in the parent's direction";
    case NOT_PAINT_GROUP:
      return "Paint group returned is not a paint group";
  }
  throw createException(BAD_STATUS, given);
}

export default function createException(exceptionCode: number, ...args: any[]) {
  if (args.length > 0) {
    return new Error(nameStatus(exceptionCode) + "\nArguments: " + args);
  }
  return new Error(nameStatus(exceptionCode));
}
