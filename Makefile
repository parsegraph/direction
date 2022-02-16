DIST_NAME = direction

SCRIPT_FILES = \
	src/index.ts \
	src/Direction.ts \
	src/Axis.ts \
	src/turn.ts \
	src/DirectionCaret.ts \
	src/DirectionNode.ts \
	src/DirectionNodeSiblings.ts \
	src/DirectionNodeState.ts \
	src/DirectionNodePaintGroup.ts \
	src/Exception.ts \
	src/LayoutState.ts \
	src/NeighborData.ts \
	src/NodePalette.ts \
	src/Alignment.ts \
	src/AxisOverlap.ts \
	src/Fit.ts \
	src/PreferredAxis.ts \
	src/demo.ts

include ./Makefile.microproject
