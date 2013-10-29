CXX=~/Projects/emscripten/emcc
CXXFLAGS=-v -std=c++11 -O2 -s TOTAL_MEMORY=67108864 --js-library library-canvas.js
OBJS=bench-raster-tiger.o rasterizer.o skia-utils.o

tiger.js: $(OBJS) library-canvas.js
	$(CXX) $(CXXFLAGS) $(OBJS) -s EXPORTED_FUNCTIONS="['_drawFrame','_init']"  -o $@
