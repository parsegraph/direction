DIST_NAME = direction

SCRIPT_FILES = \
	src/Exception.ts \
	src/turn.ts \
	src/index.ts \
	src/AxisOverlap.ts \
	src/DirectionNodeState.ts \
	src/DirectionCaret.ts \
	src/Direction.ts \
	src/DirectionNode.ts \
	src/NeighborData.ts \
	src/PreferredAxis.ts \
	src/LayoutState.ts \
	src/DirectionNodeSiblings.ts \
	src/DirectionNodePaintGroup.ts \
	src/Alignment.ts \
	src/Axis.ts \
	src/Fit.ts \
	src/NodePalette.ts \
	src/demo.ts \
	test/DirectionNode.ts \
	test/test.ts \
	test/Caret.ts

EXTRA_SCRIPTS =

include ./Makefile.microproject
