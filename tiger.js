// Note: For maximum-speed code, see "Optimizing Code" on the Emscripten wiki, https://github.com/kripken/emscripten/wiki/Optimizing-Code
// Note: Some Emscripten settings may limit the speed of the generated code.
// The Module object: Our interface to the outside world. We import
// and export values on it, and do the work to get that through
// closure compiler if necessary. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(Module) { ..generated code.. }
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to do an eval in order to handle the closure compiler
// case, where this code here is minified but Module was defined
// elsewhere (e.g. case 4 above). We also need to check if Module
// already exists (e.g. case 3 above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module;
if (!Module) Module = eval('(function() { try { return Module || {} } catch(e) { return {} } })()');
// Sometimes an existing Module object exists with properties
// meant to overwrite the default module functionality. Here
// we collect those properties and reapply _after_ we configure
// the current environment's defaults to avoid having to be so
// defensive during initialization.
var moduleOverrides = {};
for (var key in Module) {
  if (Module.hasOwnProperty(key)) {
    moduleOverrides[key] = Module[key];
  }
}
// The environment setup code below is customized to use Module.
// *** Environment setup code ***
var ENVIRONMENT_IS_NODE = typeof process === 'object' && typeof require === 'function';
var ENVIRONMENT_IS_WEB = typeof window === 'object';
var ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
  // Expose functionality in the same simple way that the shells work
  // Note that we pollute the global namespace here, otherwise we break in node
  Module['print'] = function(x) {
    process['stdout'].write(x + '\n');
  };
  Module['printErr'] = function(x) {
    process['stderr'].write(x + '\n');
  };
  var nodeFS = require('fs');
  var nodePath = require('path');
  Module['read'] = function(filename, binary) {
    filename = nodePath['normalize'](filename);
    var ret = nodeFS['readFileSync'](filename);
    // The path is absolute if the normalized version is the same as the resolved.
    if (!ret && filename != nodePath['resolve'](filename)) {
      filename = path.join(__dirname, '..', 'src', filename);
      ret = nodeFS['readFileSync'](filename);
    }
    if (ret && !binary) ret = ret.toString();
    return ret;
  };
  Module['readBinary'] = function(filename) { return Module['read'](filename, true) };
  Module['load'] = function(f) {
    globalEval(read(f));
  };
  Module['arguments'] = process['argv'].slice(2);
  module['exports'] = Module;
}
else if (ENVIRONMENT_IS_SHELL) {
  Module['print'] = print;
  if (typeof printErr != 'undefined') Module['printErr'] = printErr; // not present in v8 or older sm
  if (typeof read != 'undefined') {
    Module['read'] = read;
  } else {
    Module['read'] = function() { throw 'no read() available (jsc?)' };
  }
  Module['readBinary'] = function(f) {
    return read(f, 'binary');
  };
  if (typeof scriptArgs != 'undefined') {
    Module['arguments'] = scriptArgs;
  } else if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  this['Module'] = Module;
}
else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  Module['read'] = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    xhr.send(null);
    return xhr.responseText;
  };
  if (typeof arguments != 'undefined') {
    Module['arguments'] = arguments;
  }
  if (typeof console !== 'undefined') {
    Module['print'] = function(x) {
      console.log(x);
    };
    Module['printErr'] = function(x) {
      console.log(x);
    };
  } else {
    // Probably a worker, and without console.log. We can do very little here...
    var TRY_USE_DUMP = false;
    Module['print'] = (TRY_USE_DUMP && (typeof(dump) !== "undefined") ? (function(x) {
      dump(x);
    }) : (function(x) {
      // self.postMessage(x); // enable this if you want stdout to be sent as messages
    }));
  }
  if (ENVIRONMENT_IS_WEB) {
    this['Module'] = Module;
  } else {
    Module['load'] = importScripts;
  }
}
else {
  // Unreachable because SHELL is dependant on the others
  throw 'Unknown runtime environment. Where are we?';
}
function globalEval(x) {
  eval.call(null, x);
}
if (!Module['load'] == 'undefined' && Module['read']) {
  Module['load'] = function(f) {
    globalEval(Module['read'](f));
  };
}
if (!Module['print']) {
  Module['print'] = function(){};
}
if (!Module['printErr']) {
  Module['printErr'] = Module['print'];
}
if (!Module['arguments']) {
  Module['arguments'] = [];
}
// *** Environment setup code ***
// Closure helpers
Module.print = Module['print'];
Module.printErr = Module['printErr'];
// Callbacks
Module['preRun'] = [];
Module['postRun'] = [];
// Merge back in the overrides
for (var key in moduleOverrides) {
  if (moduleOverrides.hasOwnProperty(key)) {
    Module[key] = moduleOverrides[key];
  }
}
// === Auto-generated preamble library stuff ===
//========================================
// Runtime code shared with compiler
//========================================
var Runtime = {
  stackSave: function () {
    return STACKTOP;
  },
  stackRestore: function (stackTop) {
    STACKTOP = stackTop;
  },
  forceAlign: function (target, quantum) {
    quantum = quantum || 4;
    if (quantum == 1) return target;
    if (isNumber(target) && isNumber(quantum)) {
      return Math.ceil(target/quantum)*quantum;
    } else if (isNumber(quantum) && isPowerOfTwo(quantum)) {
      return '(((' +target + ')+' + (quantum-1) + ')&' + -quantum + ')';
    }
    return 'Math.ceil((' + target + ')/' + quantum + ')*' + quantum;
  },
  isNumberType: function (type) {
    return type in Runtime.INT_TYPES || type in Runtime.FLOAT_TYPES;
  },
  isPointerType: function isPointerType(type) {
  return type[type.length-1] == '*';
},
  isStructType: function isStructType(type) {
  if (isPointerType(type)) return false;
  if (isArrayType(type)) return true;
  if (/<?{ ?[^}]* ?}>?/.test(type)) return true; // { i32, i8 } etc. - anonymous struct types
  // See comment in isStructPointerType()
  return type[0] == '%';
},
  INT_TYPES: {"i1":0,"i8":0,"i16":0,"i32":0,"i64":0},
  FLOAT_TYPES: {"float":0,"double":0},
  or64: function (x, y) {
    var l = (x | 0) | (y | 0);
    var h = (Math.round(x / 4294967296) | Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  and64: function (x, y) {
    var l = (x | 0) & (y | 0);
    var h = (Math.round(x / 4294967296) & Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  xor64: function (x, y) {
    var l = (x | 0) ^ (y | 0);
    var h = (Math.round(x / 4294967296) ^ Math.round(y / 4294967296)) * 4294967296;
    return l + h;
  },
  getNativeTypeSize: function (type) {
    switch (type) {
      case 'i1': case 'i8': return 1;
      case 'i16': return 2;
      case 'i32': return 4;
      case 'i64': return 8;
      case 'float': return 4;
      case 'double': return 8;
      default: {
        if (type[type.length-1] === '*') {
          return Runtime.QUANTUM_SIZE; // A pointer
        } else if (type[0] === 'i') {
          var bits = parseInt(type.substr(1));
          assert(bits % 8 === 0);
          return bits/8;
        }
      }
    }
  },
  getNativeFieldSize: function (type) {
    return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE);
  },
  dedup: function dedup(items, ident) {
  var seen = {};
  if (ident) {
    return items.filter(function(item) {
      if (seen[item[ident]]) return false;
      seen[item[ident]] = true;
      return true;
    });
  } else {
    return items.filter(function(item) {
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }
},
  set: function set() {
  var args = typeof arguments[0] === 'object' ? arguments[0] : arguments;
  var ret = {};
  for (var i = 0; i < args.length; i++) {
    ret[args[i]] = 0;
  }
  return ret;
},
  STACK_ALIGN: 8,
  getAlignSize: function (type, size, vararg) {
    // we align i64s and doubles on 64-bit boundaries, unlike x86
    if (type == 'i64' || type == 'double' || vararg) return 8;
    if (!type) return Math.min(size, 8); // align structures internally to 64 bits
    return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE);
  },
  calculateStructAlignment: function calculateStructAlignment(type) {
    type.flatSize = 0;
    type.alignSize = 0;
    var diffs = [];
    var prev = -1;
    var index = 0;
    type.flatIndexes = type.fields.map(function(field) {
      index++;
      var size, alignSize;
      if (Runtime.isNumberType(field) || Runtime.isPointerType(field)) {
        size = Runtime.getNativeTypeSize(field); // pack char; char; in structs, also char[X]s.
        alignSize = Runtime.getAlignSize(field, size);
      } else if (Runtime.isStructType(field)) {
        if (field[1] === '0') {
          // this is [0 x something]. When inside another structure like here, it must be at the end,
          // and it adds no size
          // XXX this happens in java-nbody for example... assert(index === type.fields.length, 'zero-length in the middle!');
          size = 0;
          if (Types.types[field]) {
            alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
          } else {
            alignSize = type.alignSize || QUANTUM_SIZE;
          }
        } else {
          size = Types.types[field].flatSize;
          alignSize = Runtime.getAlignSize(null, Types.types[field].alignSize);
        }
      } else if (field[0] == 'b') {
        // bN, large number field, like a [N x i8]
        size = field.substr(1)|0;
        alignSize = 1;
      } else {
        assert(field[0] === '<', field); // assumed to be a vector type, if none of the above
        size = alignSize = Types.types[field].flatSize; // fully aligned
      }
      if (type.packed) alignSize = 1;
      type.alignSize = Math.max(type.alignSize, alignSize);
      var curr = Runtime.alignMemory(type.flatSize, alignSize); // if necessary, place this on aligned memory
      type.flatSize = curr + size;
      if (prev >= 0) {
        diffs.push(curr-prev);
      }
      prev = curr;
      return curr;
    });
    if (type.name_[0] === '[') {
      // arrays have 2 elements, so we get the proper difference. then we scale here. that way we avoid
      // allocating a potentially huge array for [999999 x i8] etc.
      type.flatSize = parseInt(type.name_.substr(1))*type.flatSize/2;
    }
    type.flatSize = Runtime.alignMemory(type.flatSize, type.alignSize);
    if (diffs.length == 0) {
      type.flatFactor = type.flatSize;
    } else if (Runtime.dedup(diffs).length == 1) {
      type.flatFactor = diffs[0];
    }
    type.needsFlattening = (type.flatFactor != 1);
    return type.flatIndexes;
  },
  generateStructInfo: function (struct, typeName, offset) {
    var type, alignment;
    if (typeName) {
      offset = offset || 0;
      type = (typeof Types === 'undefined' ? Runtime.typeInfo : Types.types)[typeName];
      if (!type) return null;
      if (type.fields.length != struct.length) {
        printErr('Number of named fields must match the type for ' + typeName + ': possibly duplicate struct names. Cannot return structInfo');
        return null;
      }
      alignment = type.flatIndexes;
    } else {
      var type = { fields: struct.map(function(item) { return item[0] }) };
      alignment = Runtime.calculateStructAlignment(type);
    }
    var ret = {
      __size__: type.flatSize
    };
    if (typeName) {
      struct.forEach(function(item, i) {
        if (typeof item === 'string') {
          ret[item] = alignment[i] + offset;
        } else {
          // embedded struct
          var key;
          for (var k in item) key = k;
          ret[key] = Runtime.generateStructInfo(item[key], type.fields[i], alignment[i]);
        }
      });
    } else {
      struct.forEach(function(item, i) {
        ret[item[1]] = alignment[i];
      });
    }
    return ret;
  },
  dynCall: function (sig, ptr, args) {
    if (args && args.length) {
      if (!args.splice) args = Array.prototype.slice.call(args);
      args.splice(0, 0, ptr);
      return Module['dynCall_' + sig].apply(null, args);
    } else {
      return Module['dynCall_' + sig].call(null, ptr);
    }
  },
  functionPointers: [],
  addFunction: function (func) {
    for (var i = 0; i < Runtime.functionPointers.length; i++) {
      if (!Runtime.functionPointers[i]) {
        Runtime.functionPointers[i] = func;
        return 2*(1 + i);
      }
    }
    throw 'Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.';
  },
  removeFunction: function (index) {
    Runtime.functionPointers[(index-2)/2] = null;
  },
  warnOnce: function (text) {
    if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
    if (!Runtime.warnOnce.shown[text]) {
      Runtime.warnOnce.shown[text] = 1;
      Module.printErr(text);
    }
  },
  funcWrappers: {},
  getFuncWrapper: function (func, sig) {
    assert(sig);
    if (!Runtime.funcWrappers[func]) {
      Runtime.funcWrappers[func] = function() {
        return Runtime.dynCall(sig, func, arguments);
      };
    }
    return Runtime.funcWrappers[func];
  },
  UTF8Processor: function () {
    var buffer = [];
    var needed = 0;
    this.processCChar = function (code) {
      code = code & 0xFF;
      if (buffer.length == 0) {
        if ((code & 0x80) == 0x00) {        // 0xxxxxxx
          return String.fromCharCode(code);
        }
        buffer.push(code);
        if ((code & 0xE0) == 0xC0) {        // 110xxxxx
          needed = 1;
        } else if ((code & 0xF0) == 0xE0) { // 1110xxxx
          needed = 2;
        } else {                            // 11110xxx
          needed = 3;
        }
        return '';
      }
      if (needed) {
        buffer.push(code);
        needed--;
        if (needed > 0) return '';
      }
      var c1 = buffer[0];
      var c2 = buffer[1];
      var c3 = buffer[2];
      var c4 = buffer[3];
      var ret;
      if (buffer.length == 2) {
        ret = String.fromCharCode(((c1 & 0x1F) << 6)  | (c2 & 0x3F));
      } else if (buffer.length == 3) {
        ret = String.fromCharCode(((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6)  | (c3 & 0x3F));
      } else {
        // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var codePoint = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) |
                        ((c3 & 0x3F) << 6)  | (c4 & 0x3F);
        ret = String.fromCharCode(
          Math.floor((codePoint - 0x10000) / 0x400) + 0xD800,
          (codePoint - 0x10000) % 0x400 + 0xDC00);
      }
      buffer.length = 0;
      return ret;
    }
    this.processJSString = function(string) {
      string = unescape(encodeURIComponent(string));
      var ret = [];
      for (var i = 0; i < string.length; i++) {
        ret.push(string.charCodeAt(i));
      }
      return ret;
    }
  },
  stackAlloc: function (size) { var ret = STACKTOP;STACKTOP = (STACKTOP + size)|0;STACKTOP = (((STACKTOP)+7)&-8); return ret; },
  staticAlloc: function (size) { var ret = STATICTOP;STATICTOP = (STATICTOP + size)|0;STATICTOP = (((STATICTOP)+7)&-8); return ret; },
  dynamicAlloc: function (size) { var ret = DYNAMICTOP;DYNAMICTOP = (DYNAMICTOP + size)|0;DYNAMICTOP = (((DYNAMICTOP)+7)&-8); if (DYNAMICTOP >= TOTAL_MEMORY) enlargeMemory();; return ret; },
  alignMemory: function (size,quantum) { var ret = size = Math.ceil((size)/(quantum ? quantum : 8))*(quantum ? quantum : 8); return ret; },
  makeBigInt: function (low,high,unsigned) { var ret = (unsigned ? ((+((low>>>0)))+((+((high>>>0)))*(+4294967296))) : ((+((low>>>0)))+((+((high|0)))*(+4294967296)))); return ret; },
  GLOBAL_BASE: 8,
  QUANTUM_SIZE: 4,
  __dummy__: 0
}
//========================================
// Runtime essentials
//========================================
var __THREW__ = 0; // Used in checking for thrown exceptions.
var ABORT = false; // whether we are quitting the application. no code should run after this. set in exit() and abort()
var EXITSTATUS = 0;
var undef = 0;
// tempInt is used for 32-bit signed values or smaller. tempBigInt is used
// for 32-bit unsigned values or more than 32 bits. TODO: audit all uses of tempInt
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed: ' + text);
  }
}
var globalScope = this;
// C calling interface. A convenient way to call C functions (in C files, or
// defined with extern "C").
//
// Note: LLVM optimizations can inline and remove functions, after which you will not be
//       able to call them. Closure can also do so. To avoid that, add your function to
//       the exports using something like
//
//         -s EXPORTED_FUNCTIONS='["_main", "_myfunc"]'
//
// @param ident      The name of the C function (note that C++ functions will be name-mangled - use extern "C")
// @param returnType The return type of the function, one of the JS types 'number', 'string' or 'array' (use 'number' for any C pointer, and
//                   'array' for JavaScript arrays and typed arrays; note that arrays are 8-bit).
// @param argTypes   An array of the types of arguments for the function (if there are no arguments, this can be ommitted). Types are as in returnType,
//                   except that 'array' is not possible (there is no way for us to know the length of the array)
// @param args       An array of the arguments to the function, as native JS values (as in returnType)
//                   Note that string arguments will be stored on the stack (the JS string will become a C string on the stack).
// @return           The return value, as a native JS value (as in returnType)
function ccall(ident, returnType, argTypes, args) {
  return ccallFunc(getCFunc(ident), returnType, argTypes, args);
}
Module["ccall"] = ccall;
// Returns the C function with a specified identifier (for C++, you need to do manual name mangling)
function getCFunc(ident) {
  try {
    var func = Module['_' + ident]; // closure exported function
    if (!func) func = eval('_' + ident); // explicit lookup
  } catch(e) {
  }
  assert(func, 'Cannot call unknown function ' + ident + ' (perhaps LLVM optimizations or closure removed it?)');
  return func;
}
// Internal function that does a C call using a function, not an identifier
function ccallFunc(func, returnType, argTypes, args) {
  var stack = 0;
  function toC(value, type) {
    if (type == 'string') {
      if (value === null || value === undefined || value === 0) return 0; // null string
      value = intArrayFromString(value);
      type = 'array';
    }
    if (type == 'array') {
      if (!stack) stack = Runtime.stackSave();
      var ret = Runtime.stackAlloc(value.length);
      writeArrayToMemory(value, ret);
      return ret;
    }
    return value;
  }
  function fromC(value, type) {
    if (type == 'string') {
      return Pointer_stringify(value);
    }
    assert(type != 'array');
    return value;
  }
  var i = 0;
  var cArgs = args ? args.map(function(arg) {
    return toC(arg, argTypes[i++]);
  }) : [];
  var ret = fromC(func.apply(null, cArgs), returnType);
  if (stack) Runtime.stackRestore(stack);
  return ret;
}
// Returns a native JS wrapper for a C function. This is similar to ccall, but
// returns a function you can call repeatedly in a normal way. For example:
//
//   var my_function = cwrap('my_c_function', 'number', ['number', 'number']);
//   alert(my_function(5, 22));
//   alert(my_function(99, 12));
//
function cwrap(ident, returnType, argTypes) {
  var func = getCFunc(ident);
  return function() {
    return ccallFunc(func, returnType, argTypes, Array.prototype.slice.call(arguments));
  }
}
Module["cwrap"] = cwrap;
// Sets a value in memory in a dynamic way at run-time. Uses the
// type data. This is the same as makeSetValue, except that
// makeSetValue is done at compile-time and generates the needed
// code then, whereas this function picks the right code at
// run-time.
// Note that setValue and getValue only do *aligned* writes and reads!
// Note that ccall uses JS types as for defining types, while setValue and
// getValue need LLVM types ('i8', 'i32') - this is a lower-level operation
function setValue(ptr, value, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': HEAP8[(ptr)]=value; break;
      case 'i8': HEAP8[(ptr)]=value; break;
      case 'i16': HEAP16[((ptr)>>1)]=value; break;
      case 'i32': HEAP32[((ptr)>>2)]=value; break;
      case 'i64': (tempI64 = [value>>>0,(tempDouble=value,(+(Math_abs(tempDouble))) >= (+1) ? (tempDouble > (+0) ? ((Math_min((+(Math_floor((tempDouble)/(+4294967296)))), (+4294967295)))|0)>>>0 : (~~((+(Math_ceil((tempDouble - +(((~~(tempDouble)))>>>0))/(+4294967296))))))>>>0) : 0)],HEAP32[((ptr)>>2)]=tempI64[0],HEAP32[(((ptr)+(4))>>2)]=tempI64[1]); break;
      case 'float': HEAPF32[((ptr)>>2)]=value; break;
      case 'double': HEAPF64[((ptr)>>3)]=value; break;
      default: abort('invalid type for setValue: ' + type);
    }
}
Module['setValue'] = setValue;
// Parallel to setValue.
function getValue(ptr, type, noSafe) {
  type = type || 'i8';
  if (type.charAt(type.length-1) === '*') type = 'i32'; // pointers are 32-bit
    switch(type) {
      case 'i1': return HEAP8[(ptr)];
      case 'i8': return HEAP8[(ptr)];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP32[((ptr)>>2)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      default: abort('invalid type for setValue: ' + type);
    }
  return null;
}
Module['getValue'] = getValue;
var ALLOC_NORMAL = 0; // Tries to use _malloc()
var ALLOC_STACK = 1; // Lives for the duration of the current function call
var ALLOC_STATIC = 2; // Cannot be freed
var ALLOC_DYNAMIC = 3; // Cannot be freed except through sbrk
var ALLOC_NONE = 4; // Do not allocate
Module['ALLOC_NORMAL'] = ALLOC_NORMAL;
Module['ALLOC_STACK'] = ALLOC_STACK;
Module['ALLOC_STATIC'] = ALLOC_STATIC;
Module['ALLOC_DYNAMIC'] = ALLOC_DYNAMIC;
Module['ALLOC_NONE'] = ALLOC_NONE;
// allocate(): This is for internal use. You can use it yourself as well, but the interface
//             is a little tricky (see docs right below). The reason is that it is optimized
//             for multiple syntaxes to save space in generated code. So you should
//             normally not use allocate(), and instead allocate memory using _malloc(),
//             initialize it with setValue(), and so forth.
// @slab: An array of data, or a number. If a number, then the size of the block to allocate,
//        in *bytes* (note that this is sometimes confusing: the next parameter does not
//        affect this!)
// @types: Either an array of types, one for each byte (or 0 if no type at that position),
//         or a single type which is used for the entire block. This only matters if there
//         is initial data - if @slab is a number, then this does not matter at all and is
//         ignored.
// @allocator: How to allocate memory, see ALLOC_*
function allocate(slab, types, allocator, ptr) {
  var zeroinit, size;
  if (typeof slab === 'number') {
    zeroinit = true;
    size = slab;
  } else {
    zeroinit = false;
    size = slab.length;
  }
  var singleType = typeof types === 'string' ? types : null;
  var ret;
  if (allocator == ALLOC_NONE) {
    ret = ptr;
  } else {
    ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
  }
  if (zeroinit) {
    var ptr = ret, stop;
    assert((ret & 3) == 0);
    stop = ret + (size & ~3);
    for (; ptr < stop; ptr += 4) {
      HEAP32[((ptr)>>2)]=0;
    }
    stop = ret + size;
    while (ptr < stop) {
      HEAP8[((ptr++)|0)]=0;
    }
    return ret;
  }
  if (singleType === 'i8') {
    if (slab.subarray || slab.slice) {
      HEAPU8.set(slab, ret);
    } else {
      HEAPU8.set(new Uint8Array(slab), ret);
    }
    return ret;
  }
  var i = 0, type, typeSize, previousType;
  while (i < size) {
    var curr = slab[i];
    if (typeof curr === 'function') {
      curr = Runtime.getFunctionIndex(curr);
    }
    type = singleType || types[i];
    if (type === 0) {
      i++;
      continue;
    }
    if (type == 'i64') type = 'i32'; // special case: we have one i32 here, and one i32 later
    setValue(ret+i, curr, type);
    // no need to look up size unless type changes, so cache it
    if (previousType !== type) {
      typeSize = Runtime.getNativeTypeSize(type);
      previousType = type;
    }
    i += typeSize;
  }
  return ret;
}
Module['allocate'] = allocate;
function Pointer_stringify(ptr, /* optional */ length) {
  // TODO: use TextDecoder
  // Find the length, and check for UTF while doing so
  var hasUtf = false;
  var t;
  var i = 0;
  while (1) {
    t = HEAPU8[(((ptr)+(i))|0)];
    if (t >= 128) hasUtf = true;
    else if (t == 0 && !length) break;
    i++;
    if (length && i == length) break;
  }
  if (!length) length = i;
  var ret = '';
  if (!hasUtf) {
    var MAX_CHUNK = 1024; // split up into chunks, because .apply on a huge string can overflow the stack
    var curr;
    while (length > 0) {
      curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
      ret = ret ? ret + curr : curr;
      ptr += MAX_CHUNK;
      length -= MAX_CHUNK;
    }
    return ret;
  }
  var utf8 = new Runtime.UTF8Processor();
  for (i = 0; i < length; i++) {
    t = HEAPU8[(((ptr)+(i))|0)];
    ret += utf8.processCChar(t);
  }
  return ret;
}
Module['Pointer_stringify'] = Pointer_stringify;
// Given a pointer 'ptr' to a null-terminated UTF16LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF16ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var codeUnit = HEAP16[(((ptr)+(i*2))>>1)];
    if (codeUnit == 0)
      return str;
    ++i;
    // fromCharCode constructs a character from a UTF-16 code unit, so we can pass the UTF16 string right through.
    str += String.fromCharCode(codeUnit);
  }
}
Module['UTF16ToString'] = UTF16ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF16LE form. The copy will require at most (str.length*2+1)*2 bytes of space in the HEAP.
function stringToUTF16(str, outPtr) {
  for(var i = 0; i < str.length; ++i) {
    // charCodeAt returns a UTF-16 encoded code unit, so it can be directly written to the HEAP.
    var codeUnit = str.charCodeAt(i); // possibly a lead surrogate
    HEAP16[(((outPtr)+(i*2))>>1)]=codeUnit
  }
  // Null-terminate the pointer to the HEAP.
  HEAP16[(((outPtr)+(str.length*2))>>1)]=0
}
Module['stringToUTF16'] = stringToUTF16;
// Given a pointer 'ptr' to a null-terminated UTF32LE-encoded string in the emscripten HEAP, returns
// a copy of that string as a Javascript String object.
function UTF32ToString(ptr) {
  var i = 0;
  var str = '';
  while (1) {
    var utf32 = HEAP32[(((ptr)+(i*4))>>2)];
    if (utf32 == 0)
      return str;
    ++i;
    // Gotcha: fromCharCode constructs a character from a UTF-16 encoded code (pair), not from a Unicode code point! So encode the code point to UTF-16 for constructing.
    if (utf32 >= 0x10000) {
      var ch = utf32 - 0x10000;
      str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
    } else {
      str += String.fromCharCode(utf32);
    }
  }
}
Module['UTF32ToString'] = UTF32ToString;
// Copies the given Javascript String object 'str' to the emscripten HEAP at address 'outPtr', 
// null-terminated and encoded in UTF32LE form. The copy will require at most (str.length+1)*4 bytes of space in the HEAP,
// but can use less, since str.length does not return the number of characters in the string, but the number of UTF-16 code units in the string.
function stringToUTF32(str, outPtr) {
  var iChar = 0;
  for(var iCodeUnit = 0; iCodeUnit < str.length; ++iCodeUnit) {
    // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code unit, not a Unicode code point of the character! We must decode the string to UTF-32 to the heap.
    var codeUnit = str.charCodeAt(iCodeUnit); // possibly a lead surrogate
    if (codeUnit >= 0xD800 && codeUnit <= 0xDFFF) {
      var trailSurrogate = str.charCodeAt(++iCodeUnit);
      codeUnit = 0x10000 + ((codeUnit & 0x3FF) << 10) | (trailSurrogate & 0x3FF);
    }
    HEAP32[(((outPtr)+(iChar*4))>>2)]=codeUnit
    ++iChar;
  }
  // Null-terminate the pointer to the HEAP.
  HEAP32[(((outPtr)+(iChar*4))>>2)]=0
}
Module['stringToUTF32'] = stringToUTF32;
function demangle(func) {
  try {
    if (typeof func === 'number') func = Pointer_stringify(func);
    if (func[0] !== '_') return func;
    if (func[1] !== '_') return func; // C function
    if (func[2] !== 'Z') return func;
    var i = 3;
    // params, etc.
    var basicTypes = {
      'v': 'void',
      'b': 'bool',
      'c': 'char',
      's': 'short',
      'i': 'int',
      'l': 'long',
      'f': 'float',
      'd': 'double',
      'w': 'wchar_t',
      'a': 'signed char',
      'h': 'unsigned char',
      't': 'unsigned short',
      'j': 'unsigned int',
      'm': 'unsigned long',
      'x': 'long long',
      'y': 'unsigned long long',
      'z': '...'
    };
    function dump(x) {
      //return;
      if (x) Module.print(x);
      Module.print(func);
      var pre = '';
      for (var a = 0; a < i; a++) pre += ' ';
      Module.print (pre + '^');
    }
    var subs = [];
    function parseNested() {
      i++;
      if (func[i] === 'K') i++;
      var parts = [];
      while (func[i] !== 'E') {
        if (func[i] === 'S') { // substitution
          i++;
          var next = func.indexOf('_', i);
          var num = func.substring(i, next) || 0;
          parts.push(subs[num] || '?');
          i = next+1;
          continue;
        }
        var size = parseInt(func.substr(i));
        var pre = size.toString().length;
        if (!size || !pre) { i--; break; } // counter i++ below us
        var curr = func.substr(i + pre, size);
        parts.push(curr);
        subs.push(curr);
        i += pre + size;
      }
      i++; // skip E
      return parts;
    }
    function parse(rawList, limit, allowVoid) { // main parser
      limit = limit || Infinity;
      var ret = '', list = [];
      function flushList() {
        return '(' + list.join(', ') + ')';
      }
      var name;
      if (func[i] !== 'N') {
        // not namespaced
        if (func[i] === 'K') i++;
        var size = parseInt(func.substr(i));
        if (size) {
          var pre = size.toString().length;
          name = func.substr(i + pre, size);
          i += pre + size;
        }
      } else {
        // namespaced N-E
        name = parseNested().join('::');
        limit--;
        if (limit === 0) return rawList ? [name] : name;
      }
      if (func[i] === 'I') {
        i++;
        var iList = parse(true);
        var iRet = parse(true, 1, true);
        ret += iRet[0] + ' ' + name + '<' + iList.join(', ') + '>';
      } else {
        ret = name;
      }
      paramLoop: while (i < func.length && limit-- > 0) {
        //dump('paramLoop');
        var c = func[i++];
        if (c in basicTypes) {
          list.push(basicTypes[c]);
        } else {
          switch (c) {
            case 'P': list.push(parse(true, 1, true)[0] + '*'); break; // pointer
            case 'R': list.push(parse(true, 1, true)[0] + '&'); break; // reference
            case 'L': { // literal
              i++; // skip basic type
              var end = func.indexOf('E', i);
              var size = end - i;
              list.push(func.substr(i, size));
              i += size + 2; // size + 'EE'
              break;
            }
            case 'A': { // array
              var size = parseInt(func.substr(i));
              i += size.toString().length;
              if (func[i] !== '_') throw '?';
              i++; // skip _
              list.push(parse(true, 1, true)[0] + ' [' + size + ']');
              break;
            }
            case 'E': break paramLoop;
            default: ret += '?' + c; break paramLoop;
          }
        }
      }
      if (!allowVoid && list.length === 1 && list[0] === 'void') list = []; // avoid (void)
      return rawList ? list : ret + flushList();
    }
    return parse();
  } catch(e) {
    return func;
  }
}
function demangleAll(text) {
  return text.replace(/__Z[\w\d_]+/g, function(x) { var y = demangle(x); return x === y ? x : (x + ' [' + y + ']') });
}
function stackTrace() {
  var stack = new Error().stack;
  return stack ? demangleAll(stack) : '(no stack trace available)'; // Stack trace is not available at least on IE10 and Safari 6.
}
// Memory management
var PAGE_SIZE = 4096;
function alignMemoryPage(x) {
  return (x+4095)&-4096;
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0, STATICTOP = 0, staticSealed = false; // static area
var STACK_BASE = 0, STACKTOP = 0, STACK_MAX = 0; // stack area
var DYNAMIC_BASE = 0, DYNAMICTOP = 0; // dynamic area handled by sbrk
function enlargeMemory() {
  abort('Cannot enlarge memory arrays in asm.js. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value ' + TOTAL_MEMORY + ', or (2) set Module.TOTAL_MEMORY before the program runs.');
}
var TOTAL_STACK = Module['TOTAL_STACK'] || 5242880;
var TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 67108864;
var FAST_MEMORY = Module['FAST_MEMORY'] || 2097152;
// Initialize the runtime's memory
// check for full engine support (use string 'subarray' to avoid closure compiler confusion)
assert(typeof Int32Array !== 'undefined' && typeof Float64Array !== 'undefined' && !!(new Int32Array(1)['subarray']) && !!(new Int32Array(1)['set']),
       'Cannot fallback to non-typed array case: Code is too specialized');
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
// Endianness check (note: assumes compiler arch was little-endian)
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, 'Typed arrays 2 must be run on a little-endian system');
Module['HEAP'] = HEAP;
Module['HEAP8'] = HEAP8;
Module['HEAP16'] = HEAP16;
Module['HEAP32'] = HEAP32;
Module['HEAPU8'] = HEAPU8;
Module['HEAPU16'] = HEAPU16;
Module['HEAPU32'] = HEAPU32;
Module['HEAPF32'] = HEAPF32;
Module['HEAPF64'] = HEAPF64;
function callRuntimeCallbacks(callbacks) {
  while(callbacks.length > 0) {
    var callback = callbacks.shift();
    if (typeof callback == 'function') {
      callback();
      continue;
    }
    var func = callback.func;
    if (typeof func === 'number') {
      if (callback.arg === undefined) {
        Runtime.dynCall('v', func);
      } else {
        Runtime.dynCall('vi', func, [callback.arg]);
      }
    } else {
      func(callback.arg === undefined ? null : callback.arg);
    }
  }
}
var __ATPRERUN__  = []; // functions called before the runtime is initialized
var __ATINIT__    = []; // functions called during startup
var __ATMAIN__    = []; // functions called when main() is to be run
var __ATEXIT__    = []; // functions called during shutdown
var __ATPOSTRUN__ = []; // functions called after the runtime has exited
var runtimeInitialized = false;
function preRun() {
  // compatibility - merge in anything from Module['preRun'] at this time
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
  if (runtimeInitialized) return;
  runtimeInitialized = true;
  callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
  callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
  callRuntimeCallbacks(__ATEXIT__);
}
function postRun() {
  // compatibility - merge in anything from Module['postRun'] at this time
  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
  __ATPRERUN__.unshift(cb);
}
Module['addOnPreRun'] = Module.addOnPreRun = addOnPreRun;
function addOnInit(cb) {
  __ATINIT__.unshift(cb);
}
Module['addOnInit'] = Module.addOnInit = addOnInit;
function addOnPreMain(cb) {
  __ATMAIN__.unshift(cb);
}
Module['addOnPreMain'] = Module.addOnPreMain = addOnPreMain;
function addOnExit(cb) {
  __ATEXIT__.unshift(cb);
}
Module['addOnExit'] = Module.addOnExit = addOnExit;
function addOnPostRun(cb) {
  __ATPOSTRUN__.unshift(cb);
}
Module['addOnPostRun'] = Module.addOnPostRun = addOnPostRun;
// Tools
// This processes a JS string into a C-line array of numbers, 0-terminated.
// For LLVM-originating strings, see parser.js:parseLLVMString function
function intArrayFromString(stringy, dontAddNull, length /* optional */) {
  var ret = (new Runtime.UTF8Processor()).processJSString(stringy);
  if (length) {
    ret.length = length;
  }
  if (!dontAddNull) {
    ret.push(0);
  }
  return ret;
}
Module['intArrayFromString'] = intArrayFromString;
function intArrayToString(array) {
  var ret = [];
  for (var i = 0; i < array.length; i++) {
    var chr = array[i];
    if (chr > 0xFF) {
      chr &= 0xFF;
    }
    ret.push(String.fromCharCode(chr));
  }
  return ret.join('');
}
Module['intArrayToString'] = intArrayToString;
// Write a Javascript array to somewhere in the heap
function writeStringToMemory(string, buffer, dontAddNull) {
  var array = intArrayFromString(string, dontAddNull);
  var i = 0;
  while (i < array.length) {
    var chr = array[i];
    HEAP8[(((buffer)+(i))|0)]=chr
    i = i + 1;
  }
}
Module['writeStringToMemory'] = writeStringToMemory;
function writeArrayToMemory(array, buffer) {
  for (var i = 0; i < array.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=array[i];
  }
}
Module['writeArrayToMemory'] = writeArrayToMemory;
function writeAsciiToMemory(str, buffer, dontAddNull) {
  for (var i = 0; i < str.length; i++) {
    HEAP8[(((buffer)+(i))|0)]=str.charCodeAt(i)
  }
  if (!dontAddNull) HEAP8[(((buffer)+(str.length))|0)]=0
}
Module['writeAsciiToMemory'] = writeAsciiToMemory;
function unSign(value, bits, ignore, sig) {
  if (value >= 0) {
    return value;
  }
  return bits <= 32 ? 2*Math.abs(1 << (bits-1)) + value // Need some trickery, since if bits == 32, we are right at the limit of the bits JS uses in bitshifts
                    : Math.pow(2, bits)         + value;
}
function reSign(value, bits, ignore, sig) {
  if (value <= 0) {
    return value;
  }
  var half = bits <= 32 ? Math.abs(1 << (bits-1)) // abs is needed if bits == 32
                        : Math.pow(2, bits-1);
  if (value >= half && (bits <= 32 || value > half)) { // for huge values, we can hit the precision limit and always get true here. so don't do that
                                                       // but, in general there is no perfect solution here. With 64-bit ints, we get rounding and errors
                                                       // TODO: In i64 mode 1, resign the two parts separately and safely
    value = -2*half + value; // Cannot bitshift half, as it may be at the limit of the bits JS uses in bitshifts
  }
  return value;
}
if (!Math['imul']) Math['imul'] = function(a, b) {
  var ah  = a >>> 16;
  var al = a & 0xffff;
  var bh  = b >>> 16;
  var bl = b & 0xffff;
  return (al*bl + ((ah*bl + al*bh) << 16))|0;
};
Math.imul = Math['imul'];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_toFloat32 = Math.toFloat32;
var Math_min = Math.min;
// A counter of dependencies for calling run(). If we need to
// do asynchronous work before running, increment this and
// decrement it. Incrementing must happen in a place like
// PRE_RUN_ADDITIONS (used by emcc to add file preloading).
// Note that you can add dependencies in preRun, even though
// it happens right before run - run will be postponed until
// the dependencies are met.
var runDependencies = 0;
var runDependencyTracking = {};
var runDependencyWatcher = null;
var dependenciesFulfilled = null; // overridden to take different actions when all run dependencies are fulfilled
function addRunDependency(id) {
  runDependencies++;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(!runDependencyTracking[id]);
    runDependencyTracking[id] = 1;
  } else {
    Module.printErr('warning: run dependency added without ID');
  }
}
Module['addRunDependency'] = addRunDependency;
function removeRunDependency(id) {
  runDependencies--;
  if (Module['monitorRunDependencies']) {
    Module['monitorRunDependencies'](runDependencies);
  }
  if (id) {
    assert(runDependencyTracking[id]);
    delete runDependencyTracking[id];
  } else {
    Module.printErr('warning: run dependency removed without ID');
  }
  if (runDependencies == 0) {
    if (runDependencyWatcher !== null) {
      clearInterval(runDependencyWatcher);
      runDependencyWatcher = null;
    }
    if (dependenciesFulfilled) {
      var callback = dependenciesFulfilled;
      dependenciesFulfilled = null;
      callback(); // can add another dependenciesFulfilled
    }
  }
}
Module['removeRunDependency'] = removeRunDependency;
Module["preloadedImages"] = {}; // maps url to image data
Module["preloadedAudios"] = {}; // maps url to audio data
var memoryInitializer = null;
// === Body ===
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 160312;
/* global initializers */ __ATINIT__.push({ func: function() { runPostSets() } });
var __ZTVN10__cxxabiv120__si_class_type_infoE;
var __ZTVN10__cxxabiv117__class_type_infoE;
var __ZN10RasterizerC1Eii;
/* memory initializer */ allocate([0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,94,169,64,0,0,0,0,0,50,176,64,0,0,0,0,0,84,167,64,0,0,0,0,0,216,172,64,0,0,0,0,0,102,165,64,0,0,0,0,0,236,172,64,0,0,0,0,0,26,168,64,0,0,0,0,0,8,172,64,0,0,0,0,0,66,171,64,0,0,0,0,0,235,177,64,0,0,0,0,0,60,171,64,0,0,0,0,0,6,178,64,0,0,0,0,0,44,171,64,0,0,0,0,0,13,178,64,0,0,0,0,0,166,170,64,0,0,0,0,0,119,177,64,0,0,0,0,0,244,169,64,0,0,0,0,0,179,176,64,0,0,0,0,0,94,169,64,0,0,0,0,0,50,176,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,94,169,64,0,0,0,0,0,50,176,64,0,0,0,0,0,244,169,64,0,0,0,0,0,179,176,64,0,0,0,0,0,166,170,64,0,0,0,0,0,119,177,64,0,0,0,0,0,44,171,64,0,0,0,0,0,13,178,64,0,0,0,0,0,60,171,64,0,0,0,0,0,6,178,64,0,0,0,0,0,66,171,64,0,0,0,0,0,235,177,64,0,0,0,0,0,26,168,64,0,0,0,0,0,8,172,64,0,0,0,0,0,102,165,64,0,0,0,0,0,236,172,64,0,0,0,0,0,84,167,64,0,0,0,0,0,216,172,64,0,0,0,0,0,94,169,64,0,0,0,0,0,50,176,64,0,0,0,0,0,62,165,64,0,0,0,0,0,248,172,64,0,0,0,0,0,60,165,64,0,0,0,0,0,246,172,64,0,0,0,0,0,60,165,64,0,0,0,0,0,242,172,64,0,0,0,0,0,62,165,64,0,0,0,0,0,240,172,64,0,0,0,0,0,10,168,64,0,0,0,0,0,198,171,64,0,0,0,0,0,76,171,64,0,0,0,0,0,233,177,64,0,0,0,0,0,76,171,64,0,0,0,0,0,234,177,64,0,0,0,0,0,70,171,64,0,0,0,0,0,7,178,64,0,0,0,0,0,40,171,64,0,0,0,0,0,18,178,64,0,0,0,0,0,38,171,64,0,0,0,0,0,17,178,64,0,0,0,0,0,36,171,64,0,0,0,0,0,16,178,64,0,0,0,0,0,156,170,64,0,0,0,0,0,121,177,64,0,0,0,0,0,236,169,64,0,0,0,0,0,181,176,64,0,0,0,0,0,86,169,64,0,0,0,0,0,53,176,64,0,0,0,0,0,86,169,64,0,0,0,0,0,52,176,64,0,0,0,0,0,60,167,64,0,0,0,0,0,192,172,64,0,0,0,0,0,66,165,64,0,0,0,0,0,250,172,64,0,0,0,0,0,62,165,64,0,0,0,0,0,248,172,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,52,171,64,0,0,0,0,0,124,175,64,0,0,0,0,0,124,170,64,0,0,0,0,0,114,171,64,0,0,0,0,0,164,168,64,0,0,0,0,0,222,170,64,0,0,0,0,0,126,171,64,0,0,0,0,0,240,170,64,0,0,0,0,0,208,171,64,0,0,0,0,0,173,177,64,0,0,0,0,0,184,171,64,0,0,0,0,0,198,177,64,0,0,0,0,0,174,171,64,0,0,0,0,0,203,177,64,0,0,0,0,0,164,171,64,0,0,0,0,0,202,177,64,0,0,0,0,0,138,171,64,0,0,0,0,0,39,177,64,0,0,0,0,0,108,171,64,0,0,0,0,0,91,176,64,0,0,0,0,0,52,171,64,0,0,0,0,0,124,175,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,52,171,64,0,0,0,0,0,124,175,64,0,0,0,0,0,108,171,64,0,0,0,0,0,91,176,64,0,0,0,0,0,138,171,64,0,0,0,0,0,39,177,64,0,0,0,0,0,164,171,64,0,0,0,0,0,202,177,64,0,0,0,0,0,174,171,64,0,0,0,0,0,203,177,64,0,0,0,0,0,184,171,64,0,0,0,0,0,198,177,64,0,0,0,0,0,208,171,64,0,0,0,0,0,173,177,64,0,0,0,0,0,126,171,64,0,0,0,0,0,240,170,64,0,0,0,0,0,164,168,64,0,0,0,0,0,222,170,64,0,0,0,0,0,124,170,64,0,0,0,0,0,114,171,64,0,0,0,0,0,52,171,64,0,0,0,0,0,124,175,64,0,0,0,0,0,124,168,64,0,0,0,0,0,220,170,64,0,0,0,0,0,124,168,64,0,0,0,0,0,216,170,64,0,0,0,0,0,126,168,64,0,0,0,0,0,212,170,64,0,0,0,0,0,128,168,64,0,0,0,0,0,212,170,64,0,0,0,0,0,130,168,64,0,0,0,0,0,212,170,64,0,0,0,0,0,134,171,64,0,0,0,0,0,178,170,64,0,0,0,0,0,218,171,64,0,0,0,0,0,173,177,64,0,0,0,0,0,218,171,64,0,0,0,0,0,174,177,64,0,0,0,0,0,192,171,64,0,0,0,0,0,201,177,64,0,0,0,0,0,176,171,64,0,0,0,0,0,210,177,64,0,0,0,0,0,156,171,64,0,0,0,0,0,207,177,64,0,0,0,0,0,154,171,64,0,0,0,0,0,206,177,64,0,0,0,0,0,154,171,64,0,0,0,0,0,204,177,64,0,0,0,0,0,128,171,64,0,0,0,0,0,39,177,64,0,0,0,0,0,96,171,64,0,0,0,0,0,91,176,64,0,0,0,0,0,42,171,64,0,0,0,0,0,126,175,64,0,0,0,0,0,110,170,64,0,0,0,0,0,88,171,64,0,0,0,0,0,128,168,64,0,0,0,0,0,222,170,64,0,0,0,0,0,124,168,64,0,0,0,0,0,220,170,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14,176,64,0,0,0,0,0,254,180,64,0,0,0,0,0,43,176,64,0,0,0,0,0,14,181,64,0,0,0,0,0,38,176,64,0,0,0,0,0,26,181,64,0,0,0,0,0,80,174,64,0,0,0,0,0,227,180,64,0,0,0,0,0,52,172,64,0,0,0,0,0,211,180,64,0,0,0,0,0,28,168,64,0,0,0,0,0,180,180,64,0,0,0,0,0,32,167,64,0,0,0,0,0,137,181,64,0,0,0,0,0,122,167,64,0,0,0,0,0,220,180,64,0,0,0,0,0,160,169,64,0,0,0,0,0,183,180,64,0,0,0,0,0,226,171,64,0,0,0,0,0,144,180,64,0,0,0,0,0,15,176,64,0,0,0,0,0,255,180,64,0,0,0,0,0,14,176,64,0,0,0,0,0,254,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,14,176,64,0,0,0,0,0,254,180,64,0,0,0,0,0,15,176,64,0,0,0,0,0,255,180,64,0,0,0,0,0,226,171,64,0,0,0,0,0,144,180,64,0,0,0,0,0,160,169,64,0,0,0,0,0,183,180,64,0,0,0,0,0,122,167,64,0,0,0,0,0,220,180,64,0,0,0,0,0,32,167,64,0,0,0,0,0,137,181,64,0,0,0,0,0,28,168,64,0,0,0,0,0,180,180,64,0,0,0,0,0,52,172,64,0,0,0,0,0,211,180,64,0,0,0,0,0,80,174,64,0,0,0,0,0,227,180,64,0,0,0,0,0,38,176,64,0,0,0,0,0,26,181,64,0,0,0,0,0,43,176,64,0,0,0,0,0,14,181,64,0,0,0,0,0,14,176,64,0,0,0,0,0,254,180,64,0,0,0,0,0,24,167,64,0,0,0,0,0,153,181,64,0,0,0,0,0,24,167,64,0,0,0,0,0,154,181,64,0,0,0,0,0,22,167,64,0,0,0,0,0,154,181,64,0,0,0,0,0,20,167,64,0,0,0,0,0,156,181,64,0,0,0,0,0,16,167,64,0,0,0,0,0,156,181,64,0,0,0,0,0,14,167,64,0,0,0,0,0,154,181,64,0,0,0,0,0,14,167,64,0,0,0,0,0,153,181,64,0,0,0,0,0,86,167,64,0,0,0,0,0,218,180,64,0,0,0,0,0,158,169,64,0,0,0,0,0,179,180,64,0,0,0,0,0,224,171,64,0,0,0,0,0,139,180,64,0,0,0,0,0,16,176,64,0,0,0,0,0,250,180,64,0,0,0,0,0,52,176,64,0,0,0,0,0,15,181,64,0,0,0,0,0,41,176,64,0,0,0,0,0,31,181,64,0,0,0,0,0,40,176,64,0,0,0,0,0,32,181,64,0,0,0,0,0,39,176,64,0,0,0,0,0,32,181,64,0,0,0,0,0,82,174,64,0,0,0,0,0,233,180,64,0,0,0,0,0,52,172,64,0,0,0,0,0,216,180,64,0,0,0,0,0,2,168,64,0,0,0,0,0,184,180,64,0,0,0,0,0,24,167,64,0,0,0,0,0,153,181,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,224,171,64,0,0,0,0,0,63,182,64,0,0,0,0,0,234,167,64,0,0,0,0,0,198,182,64,0,0,0,0,0,124,167,64,0,0,0,0,0,184,183,64,0,0,0,0,0,82,167,64,0,0,0,0,0,76,182,64,0,0,0,0,0,174,175,64,0,0,0,0,0,203,181,64,0,0,0,0,0,236,175,64,0,0,0,0,0,209,181,64,0,0,0,0,0,236,175,64,0,0,0,0,0,222,181,64,0,0,0,0,0,168,174,64,0,0,0,0,0,247,181,64,0,0,0,0,0,6,173,64,0,0,0,0,0,23,182,64,0,0,0,0,0,224,171,64,0,0,0,0,0,63,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,224,171,64,0,0,0,0,0,63,182,64,0,0,0,0,0,6,173,64,0,0,0,0,0,23,182,64,0,0,0,0,0,168,174,64,0,0,0,0,0,247,181,64,0,0,0,0,0,236,175,64,0,0,0,0,0,222,181,64,0,0,0,0,0,236,175,64,0,0,0,0,0,209,181,64,0,0,0,0,0,174,175,64,0,0,0,0,0,203,181,64,0,0,0,0,0,82,167,64,0,0,0,0,0,76,182,64,0,0,0,0,0,124,167,64,0,0,0,0,0,184,183,64,0,0,0,0,0,234,167,64,0,0,0,0,0,198,182,64,0,0,0,0,0,224,171,64,0,0,0,0,0,63,182,64,0,0,0,0,0,126,167,64,0,0,0,0,0,204,183,64,0,0,0,0,0,122,167,64,0,0,0,0,0,205,183,64,0,0,0,0,0,120,167,64,0,0,0,0,0,204,183,64,0,0,0,0,0,118,167,64,0,0,0,0,0,203,183,64,0,0,0,0,0,18,167,64,0,0,0,0,0,75,182,64,0,0,0,0,0,174,175,64,0,0,0,0,0,198,181,64,0,0,0,0,0,176,175,64,0,0,0,0,0,198,181,64,0,0,0,0,0,0,176,64,0,0,0,0,0,206,181,64,0,0,0,0,0,246,175,64,0,0,0,0,0,225,181,64,0,0,0,0,0,244,175,64,0,0,0,0,0,226,181,64,0,0,0,0,0,242,175,64,0,0,0,0,0,227,181,64,0,0,0,0,0,170,174,64,0,0,0,0,0,252,181,64,0,0,0,0,0,10,173,64,0,0,0,0,0,29,182,64,0,0,0,0,0,226,171,64,0,0,0,0,0,68,182,64,0,0,0,0,0,208,167,64,0,0,0,0,0,207,182,64,0,0,0,0,0,128,167,64,0,0,0,0,0,203,183,64,0,0,0,0,0,126,167,64,0,0,0,0,0,204,183,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,168,64,0,0,0,0,0,167,181,64,0,0,0,0,0,180,170,64,0,0,0,0,0,78,181,64,0,0,0,0,0,4,175,64,0,0,0,0,0,93,181,64,0,0,0,0,0,64,175,64,0,0,0,0,0,104,181,64,0,0,0,0,0,60,175,64,0,0,0,0,0,116,181,64,0,0,0,0,0,246,173,64,0,0,0,0,0,116,181,64,0,0,0,0,0,30,171,64,0,0,0,0,0,137,181,64,0,0,0,0,0,12,167,64,0,0,0,0,0,197,181,64,0,0,0,0,0,90,166,64,0,0,0,0,0,172,182,64,0,0,0,0,0,120,166,64,0,0,0,0,0,250,181,64,0,0,0,0,0,136,168,64,0,0,0,0,0,167,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,136,168,64,0,0,0,0,0,167,181,64,0,0,0,0,0,120,166,64,0,0,0,0,0,250,181,64,0,0,0,0,0,90,166,64,0,0,0,0,0,172,182,64,0,0,0,0,0,12,167,64,0,0,0,0,0,197,181,64,0,0,0,0,0,30,171,64,0,0,0,0,0,137,181,64,0,0,0,0,0,246,173,64,0,0,0,0,0,116,181,64,0,0,0,0,0,60,175,64,0,0,0,0,0,116,181,64,0,0,0,0,0,64,175,64,0,0,0,0,0,104,181,64,0,0,0,0,0,4,175,64,0,0,0,0,0,93,181,64,0,0,0,0,0,180,170,64,0,0,0,0,0,78,181,64,0,0,0,0,0,136,168,64,0,0,0,0,0,167,181,64,0,0,0,0,0,86,166,64,0,0,0,0,0,191,182,64,0,0,0,0,0,82,166,64,0,0,0,0,0,192,182,64,0,0,0,0,0,78,166,64,0,0,0,0,0,191,182,64,0,0,0,0,0,78,166,64,0,0,0,0,0,189,182,64,0,0,0,0,0,84,166,64,0,0,0,0,0,251,181,64,0,0,0,0,0,132,168,64,0,0,0,0,0,162,181,64,0,0,0,0,0,178,170,64,0,0,0,0,0,73,181,64,0,0,0,0,0,6,175,64,0,0,0,0,0,88,181,64,0,0,0,0,0,8,175,64,0,0,0,0,0,88,181,64,0,0,0,0,0,84,175,64,0,0,0,0,0,102,181,64,0,0,0,0,0,70,175,64,0,0,0,0,0,119,181,64,0,0,0,0,0,68,175,64,0,0,0,0,0,120,181,64,0,0,0,0,0,64,175,64,0,0,0,0,0,121,181,64,0,0,0,0,0,246,173,64,0,0,0,0,0,121,181,64,0,0,0,0,0,32,171,64,0,0,0,0,0,142,181,64,0,0,0,0,0,240,166,64,0,0,0,0,0,203,181,64,0,0,0,0,0,88,166,64,0,0,0,0,0,190,182,64,0,0,0,0,0,86,166,64,0,0,0,0,0,191,182,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,64,167,64,0,0,0,0,0,199,178,64,0,0,0,0,0,130,169,64,0,0,0,0,0,240,178,64,0,0,0,0,0,86,173,64,0,0,0,0,0,239,179,64,0,0,0,0,0,118,173,64,0,0,0,0,0,6,180,64,0,0,0,0,0,116,173,64,0,0,0,0,0,16,180,64,0,0,0,0,0,74,172,64,0,0,0,0,0,202,179,64,0,0,0,0,0,216,170,64,0,0,0,0,0,113,179,64,0,0,0,0,0,172,169,64,0,0,0,0,0,61,179,64,0,0,0,0,0,206,165,64,0,0,0,0,0,142,178,64,0,0,0,0,0,100,164,64,0,0,0,0,0,57,179,64,0,0,0,0,0,26,165,64,0,0,0,0,0,159,178,64,0,0,0,0,0,64,167,64,0,0,0,0,0,199,178,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,64,167,64,0,0,0,0,0,199,178,64,0,0,0,0,0,26,165,64,0,0,0,0,0,159,178,64,0,0,0,0,0,100,164,64,0,0,0,0,0,57,179,64,0,0,0,0,0,206,165,64,0,0,0,0,0,142,178,64,0,0,0,0,0,172,169,64,0,0,0,0,0,61,179,64,0,0,0,0,0,216,170,64,0,0,0,0,0,113,179,64,0,0,0,0,0,74,172,64,0,0,0,0,0,202,179,64,0,0,0,0,0,116,173,64,0,0,0,0,0,16,180,64,0,0,0,0,0,118,173,64,0,0,0,0,0,6,180,64,0,0,0,0,0,86,173,64,0,0,0,0,0,239,179,64,0,0,0,0,0,130,169,64,0,0,0,0,0,240,178,64,0,0,0,0,0,64,167,64,0,0,0,0,0,199,178,64,0,0,0,0,0,82,164,64,0,0,0,0,0,73,179,64,0,0,0,0,0,78,164,64,0,0,0,0,0,72,179,64,0,0,0,0,0,76,164,64,0,0,0,0,0,71,179,64,0,0,0,0,0,76,164,64,0,0,0,0,0,69,179,64,0,0,0,0,0,78,164,64,0,0,0,0,0,68,179,64,0,0,0,0,0,252,164,64,0,0,0,0,0,152,178,64,0,0,0,0,0,66,167,64,0,0,0,0,0,194,178,64,0,0,0,0,0,132,169,64,0,0,0,0,0,236,178,64,0,0,0,0,0,92,173,64,0,0,0,0,0,235,179,64,0,0,0,0,0,94,173,64,0,0,0,0,0,236,179,64,0,0,0,0,0,128,173,64,0,0,0,0,0,4,180,64,0,0,0,0,0,134,173,64,0,0,0,0,0,15,180,64,0,0,0,0,0,120,173,64,0,0,0,0,0,21,180,64,0,0,0,0,0,118,173,64,0,0,0,0,0,22,180,64,0,0,0,0,0,114,173,64,0,0,0,0,0,22,180,64,0,0,0,0,0,70,172,64,0,0,0,0,0,207,179,64,0,0,0,0,0,212,170,64,0,0,0,0,0,119,179,64,0,0,0,0,0,168,169,64,0,0,0,0,0,66,179,64,0,0,0,0,0,176,165,64,0,0,0,0,0,142,178,64,0,0,0,0,0,84,164,64,0,0,0,0,0,72,179,64,0,0,0,0,0,82,164,64,0,0,0,0,0,73,179,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,218,165,64,0,0,0,0,0,117,179,64,0,0,0,0,0,32,168,64,0,0,0,0,0,126,179,64,0,0,0,0,0,42,172,64,0,0,0,0,0,68,180,64,0,0,0,0,0,78,172,64,0,0,0,0,0,88,180,64,0,0,0,0,0,78,172,64,0,0,0,0,0,98,180,64,0,0,0,0,0,110,170,64,0,0,0,0,0,3,180,64,0,0,0,0,0,94,168,64,0,0,0,0,0,199,179,64,0,0,0,0,0,96,164,64,0,0,0,0,0,81,179,64,0,0,0,0,0,30,163,64,0,0,0,0,0,13,180,64,0,0,0,0,0,178,163,64,0,0,0,0,0,108,179,64,0,0,0,0,0,218,165,64,0,0,0,0,0,117,179,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,218,165,64,0,0,0,0,0,117,179,64,0,0,0,0,0,178,163,64,0,0,0,0,0,108,179,64,0,0,0,0,0,30,163,64,0,0,0,0,0,13,180,64,0,0,0,0,0,96,164,64,0,0,0,0,0,81,179,64,0,0,0,0,0,94,168,64,0,0,0,0,0,199,179,64,0,0,0,0,0,110,170,64,0,0,0,0,0,3,180,64,0,0,0,0,0,78,172,64,0,0,0,0,0,98,180,64,0,0,0,0,0,78,172,64,0,0,0,0,0,88,180,64,0,0,0,0,0,42,172,64,0,0,0,0,0,68,180,64,0,0,0,0,0,32,168,64,0,0,0,0,0,126,179,64,0,0,0,0,0,218,165,64,0,0,0,0,0,117,179,64,0,0,0,0,0,8,163,64,0,0,0,0,0,31,180,64,0,0,0,0,0,6,163,64,0,0,0,0,0,30,180,64,0,0,0,0,0,6,163,64,0,0,0,0,0,28,180,64,0,0,0,0,0,140,163,64,0,0,0,0,0,102,179,64,0,0,0,0,0,218,165,64,0,0,0,0,0,112,179,64,0,0,0,0,0,36,168,64,0,0,0,0,0,120,179,64,0,0,0,0,0,46,172,64,0,0,0,0,0,63,180,64,0,0,0,0,0,48,172,64,0,0,0,0,0,63,180,64,0,0,0,0,0,86,172,64,0,0,0,0,0,86,180,64,0,0,0,0,0,98,172,64,0,0,0,0,0,96,180,64,0,0,0,0,0,84,172,64,0,0,0,0,0,103,180,64,0,0,0,0,0,82,172,64,0,0,0,0,0,104,180,64,0,0,0,0,0,78,172,64,0,0,0,0,0,104,180,64,0,0,0,0,0,108,170,64,0,0,0,0,0,9,180,64,0,0,0,0,0,92,168,64,0,0,0,0,0,204,179,64,0,0,0,0,0,64,164,64,0,0,0,0,0,82,179,64,0,0,0,0,0,16,163,64,0,0,0,0,0,30,180,64,0,0,0,0,0,14,163,64,0,0,0,0,0,31,180,64,0,0,0,0,0,12,163,64,0,0,0,0,0,32,180,64,0,0,0,0,0,8,163,64,0,0,0,0,0,31,180,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,74,165,64,0,0,0,0,0,54,180,64,0,0,0,0,0,142,167,64,0,0,0,0,0,23,180,64,0,0,0,0,0,196,171,64,0,0,0,0,0,150,180,64,0,0,0,0,0,236,171,64,0,0,0,0,0,167,180,64,0,0,0,0,0,238,171,64,0,0,0,0,0,177,180,64,0,0,0,0,0,246,169,64,0,0,0,0,0,115,180,64,0,0,0,0,0,220,167,64,0,0,0,0,0,92,180,64,0,0,0,0,0,198,163,64,0,0,0,0,0,45,180,64,0,0,0,0,0,188,162,64,0,0,0,0,0,254,180,64,0,0,0,0,0,34,163,64,0,0,0,0,0,83,180,64,0,0,0,0,0,74,165,64,0,0,0,0,0,54,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,74,165,64,0,0,0,0,0,54,180,64,0,0,0,0,0,34,163,64,0,0,0,0,0,83,180,64,0,0,0,0,0,188,162,64,0,0,0,0,0,254,180,64,0,0,0,0,0,198,163,64,0,0,0,0,0,45,180,64,0,0,0,0,0,220,167,64,0,0,0,0,0,92,180,64,0,0,0,0,0,246,169,64,0,0,0,0,0,115,180,64,0,0,0,0,0,238,171,64,0,0,0,0,0,177,180,64,0,0,0,0,0,236,171,64,0,0,0,0,0,167,180,64,0,0,0,0,0,196,171,64,0,0,0,0,0,150,180,64,0,0,0,0,0,142,167,64,0,0,0,0,0,23,180,64,0,0,0,0,0,74,165,64,0,0,0,0,0,54,180,64,0,0,0,0,0,180,162,64,0,0,0,0,0,15,181,64,0,0,0,0,0,178,162,64,0,0,0,0,0,15,181,64,0,0,0,0,0,176,162,64,0,0,0,0,0,17,181,64,0,0,0,0,0,172,162,64,0,0,0,0,0,17,181,64,0,0,0,0,0,170,162,64,0,0,0,0,0,15,181,64,0,0,0,0,0,170,162,64,0,0,0,0,0,14,181,64,0,0,0,0,0,254,162,64,0,0,0,0,0,80,180,64,0,0,0,0,0,72,165,64,0,0,0,0,0,50,180,64,0,0,0,0,0,142,167,64,0,0,0,0,0,19,180,64,0,0,0,0,0,198,171,64,0,0,0,0,0,145,180,64,0,0,0,0,0,200,171,64,0,0,0,0,0,145,180,64,0,0,0,0,0,232,171,64,0,0,0,0,0,155,180,64,0,0,0,0,0,244,171,64,0,0,0,0,0,164,180,64,0,0,0,0,0,0,172,64,0,0,0,0,0,174,180,64,0,0,0,0,0,244,171,64,0,0,0,0,0,182,180,64,0,0,0,0,0,242,171,64,0,0,0,0,0,183,180,64,0,0,0,0,0,240,171,64,0,0,0,0,0,183,180,64,0,0,0,0,0,248,169,64,0,0,0,0,0,121,180,64,0,0,0,0,0,220,167,64,0,0,0,0,0,97,180,64,0,0,0,0,0,172,163,64,0,0,0,0,0,49,180,64,0,0,0,0,0,180,162,64,0,0,0,0,0,14,181,64,0,0,0,0,0,180,162,64,0,0,0,0,0,15,181,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,167,64,0,0,0,0,0,23,179,64,0,0,0,0,0,226,169,64,0,0,0,0,0,101,179,64,0,0,0,0,0,110,173,64,0,0,0,0,0,161,180,64,0,0,0,0,0,136,173,64,0,0,0,0,0,185,180,64,0,0,0,0,0,130,173,64,0,0,0,0,0,195,180,64,0,0,0,0,0,112,172,64,0,0,0,0,0,106,180,64,0,0,0,0,0,18,171,64,0,0,0,0,0,250,179,64,0,0,0,0,0,250,169,64,0,0,0,0,0,179,179,64,0,0,0,0,0,82,166,64,0,0,0,0,0,198,178,64,0,0,0,0,0,190,164,64,0,0,0,0,0,87,179,64,0,0,0,0,0,156,165,64,0,0,0,0,0,204,178,64,0,0,0,0,0,176,167,64,0,0,0,0,0,23,179,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,176,167,64,0,0,0,0,0,23,179,64,0,0,0,0,0,156,165,64,0,0,0,0,0,204,178,64,0,0,0,0,0,190,164,64,0,0,0,0,0,87,179,64,0,0,0,0,0,82,166,64,0,0,0,0,0,198,178,64,0,0,0,0,0,250,169,64,0,0,0,0,0,179,179,64,0,0,0,0,0,18,171,64,0,0,0,0,0,250,179,64,0,0,0,0,0,112,172,64,0,0,0,0,0,106,180,64,0,0,0,0,0,130,173,64,0,0,0,0,0,195,180,64,0,0,0,0,0,136,173,64,0,0,0,0,0,185,180,64,0,0,0,0,0,110,173,64,0,0,0,0,0,161,180,64,0,0,0,0,0,226,169,64,0,0,0,0,0,101,179,64,0,0,0,0,0,176,167,64,0,0,0,0,0,23,179,64,0,0,0,0,0,164,164,64,0,0,0,0,0,103,179,64,0,0,0,0,0,162,164,64,0,0,0,0,0,102,179,64,0,0,0,0,0,160,164,64,0,0,0,0,0,101,179,64,0,0,0,0,0,160,164,64,0,0,0,0,0,99,179,64,0,0,0,0,0,124,165,64,0,0,0,0,0,195,178,64,0,0,0,0,0,180,167,64,0,0,0,0,0,18,179,64,0,0,0,0,0,232,169,64,0,0,0,0,0,97,179,64,0,0,0,0,0,118,173,64,0,0,0,0,0,157,180,64,0,0,0,0,0,118,173,64,0,0,0,0,0,158,180,64,0,0,0,0,0,146,173,64,0,0,0,0,0,184,180,64,0,0,0,0,0,150,173,64,0,0,0,0,0,195,180,64,0,0,0,0,0,132,173,64,0,0,0,0,0,200,180,64,0,0,0,0,0,130,173,64,0,0,0,0,0,201,180,64,0,0,0,0,0,128,173,64,0,0,0,0,0,200,180,64,0,0,0,0,0,106,172,64,0,0,0,0,0,110,180,64,0,0,0,0,0,14,171,64,0,0,0,0,0,254,179,64,0,0,0,0,0,246,169,64,0,0,0,0,0,183,179,64,0,0,0,0,0,52,166,64,0,0,0,0,0,196,178,64,0,0,0,0,0,168,164,64,0,0,0,0,0,102,179,64,0,0,0,0,0,164,164,64,0,0,0,0,0,103,179,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,208,165,64,0,0,0,0,0,5,176,64,0,0,0,0,0,182,167,64,0,0,0,0,0,166,176,64,0,0,0,0,0,86,170,64,0,0,0,0,0,93,178,64,0,0,0,0,0,96,170,64,0,0,0,0,0,120,178,64,0,0,0,0,0,84,170,64,0,0,0,0,0,129,178,64,0,0,0,0,0,132,169,64,0,0,0,0,0,4,178,64,0,0,0,0,0,130,168,64,0,0,0,0,0,101,177,64,0,0,0,0,0,158,167,64,0,0,0,0,0,244,176,64,0,0,0,0,0,178,164,64,0,0,0,0,0,8,175,64,0,0,0,0,0,220,162,64,0,0,0,0,0,160,175,64,0,0,0,0,0,2,164,64,0,0,0,0,0,218,174,64,0,0,0,0,0,208,165,64,0,0,0,0,0,5,176,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,208,165,64,0,0,0,0,0,5,176,64,0,0,0,0,0,2,164,64,0,0,0,0,0,218,174,64,0,0,0,0,0,220,162,64,0,0,0,0,0,160,175,64,0,0,0,0,0,178,164,64,0,0,0,0,0,8,175,64,0,0,0,0,0,158,167,64,0,0,0,0,0,244,176,64,0,0,0,0,0,130,168,64,0,0,0,0,0,101,177,64,0,0,0,0,0,132,169,64,0,0,0,0,0,4,178,64,0,0,0,0,0,84,170,64,0,0,0,0,0,129,178,64,0,0,0,0,0,96,170,64,0,0,0,0,0,120,178,64,0,0,0,0,0,86,170,64,0,0,0,0,0,93,178,64,0,0,0,0,0,182,167,64,0,0,0,0,0,166,176,64,0,0,0,0,0,208,165,64,0,0,0,0,0,5,176,64,0,0,0,0,0,184,162,64,0,0,0,0,0,182,175,64,0,0,0,0,0,182,162,64,0,0,0,0,0,178,175,64,0,0,0,0,0,182,162,64,0,0,0,0,0,176,175,64,0,0,0,0,0,184,162,64,0,0,0,0,0,172,175,64,0,0,0,0,0,234,163,64,0,0,0,0,0,190,174,64,0,0,0,0,0,214,165,64,0,0,0,0,0,1,176,64,0,0,0,0,0,190,167,64,0,0,0,0,0,162,176,64,0,0,0,0,0,94,170,64,0,0,0,0,0,91,178,64,0,0,0,0,0,96,170,64,0,0,0,0,0,91,178,64,0,0,0,0,0,106,170,64,0,0,0,0,0,121,178,64,0,0,0,0,0,102,170,64,0,0,0,0,0,132,178,64,0,0,0,0,0,84,170,64,0,0,0,0,0,135,178,64,0,0,0,0,0,80,170,64,0,0,0,0,0,135,178,64,0,0,0,0,0,78,170,64,0,0,0,0,0,134,178,64,0,0,0,0,0,124,169,64,0,0,0,0,0,7,178,64,0,0,0,0,0,122,168,64,0,0,0,0,0,105,177,64,0,0,0,0,0,150,167,64,0,0,0,0,0,248,176,64,0,0,0,0,0,150,164,64,0,0,0,0,0,250,174,64,0,0,0,0,0,188,162,64,0,0,0,0,0,182,175,64,0,0,0,0,0,184,162,64,0,0,0,0,0,182,175,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,165,64,0,0,0,0,0,28,177,64,0,0,0,0,0,38,167,64,0,0,0,0,0,133,177,64,0,0,0,0,0,114,170,64,0,0,0,0,0,234,178,64,0,0,0,0,0,136,170,64,0,0,0,0,0,3,179,64,0,0,0,0,0,130,170,64,0,0,0,0,0,13,179,64,0,0,0,0,0,126,169,64,0,0,0,0,0,167,178,64,0,0,0,0,0,58,168,64,0,0,0,0,0,40,178,64,0,0,0,0,0,46,167,64,0,0,0,0,0,211,177,64,0,0,0,0,0,182,163,64,0,0,0,0,0,188,176,64,0,0,0,0,0,10,162,64,0,0,0,0,0,58,177,64,0,0,0,0,0,0,163,64,0,0,0,0,0,185,176,64,0,0,0,0,0,4,165,64,0,0,0,0,0,28,177,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,4,165,64,0,0,0,0,0,28,177,64,0,0,0,0,0,0,163,64,0,0,0,0,0,185,176,64,0,0,0,0,0,10,162,64,0,0,0,0,0,58,177,64,0,0,0,0,0,182,163,64,0,0,0,0,0,188,176,64,0,0,0,0,0,46,167,64,0,0,0,0,0,211,177,64,0,0,0,0,0,58,168,64,0,0,0,0,0,40,178,64,0,0,0,0,0,126,169,64,0,0,0,0,0,167,178,64,0,0,0,0,0,130,170,64,0,0,0,0,0,13,179,64,0,0,0,0,0,136,170,64,0,0,0,0,0,3,179,64,0,0,0,0,0,114,170,64,0,0,0,0,0,234,178,64,0,0,0,0,0,38,167,64,0,0,0,0,0,133,177,64,0,0,0,0,0,4,165,64,0,0,0,0,0,28,177,64,0,0,0,0,0,238,161,64,0,0,0,0,0,72,177,64,0,0,0,0,0,234,161,64,0,0,0,0,0,71,177,64,0,0,0,0,0,234,161,64,0,0,0,0,0,69,177,64,0,0,0,0,0,234,161,64,0,0,0,0,0,68,177,64,0,0,0,0,0,236,161,64,0,0,0,0,0,67,177,64,0,0,0,0,0,226,162,64,0,0,0,0,0,174,176,64,0,0,0,0,0,8,165,64,0,0,0,0,0,24,177,64,0,0,0,0,0,42,167,64,0,0,0,0,0,128,177,64,0,0,0,0,0,122,170,64,0,0,0,0,0,230,178,64,0,0,0,0,0,122,170,64,0,0,0,0,0,231,178,64,0,0,0,0,0,144,170,64,0,0,0,0,0,2,179,64,0,0,0,0,0,146,170,64,0,0,0,0,0,13,179,64,0,0,0,0,0,130,170,64,0,0,0,0,0,18,179,64,0,0,0,0,0,128,170,64,0,0,0,0,0,19,179,64,0,0,0,0,0,126,170,64,0,0,0,0,0,18,179,64,0,0,0,0,0,120,169,64,0,0,0,0,0,171,178,64,0,0,0,0,0,54,168,64,0,0,0,0,0,44,178,64,0,0,0,0,0,40,167,64,0,0,0,0,0,215,177,64,0,0,0,0,0,150,163,64,0,0,0,0,0,184,176,64,0,0,0,0,0,242,161,64,0,0,0,0,0,71,177,64,0,0,0,0,0,238,161,64,0,0,0,0,0,72,177,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,176,164,64,0,0,0,0,0,183,177,64,0,0,0,0,0,226,166,64,0,0,0,0,0,5,178,64,0,0,0,0,0,110,170,64,0,0,0,0,0,65,179,64,0,0,0,0,0,136,170,64,0,0,0,0,0,89,179,64,0,0,0,0,0,130,170,64,0,0,0,0,0,99,179,64,0,0,0,0,0,112,169,64,0,0,0,0,0,10,179,64,0,0,0,0,0,18,168,64,0,0,0,0,0,154,178,64,0,0,0,0,0,250,166,64,0,0,0,0,0,83,178,64,0,0,0,0,0,82,163,64,0,0,0,0,0,102,177,64,0,0,0,0,0,190,161,64,0,0,0,0,0,247,177,64,0,0,0,0,0,156,162,64,0,0,0,0,0,108,177,64,0,0,0,0,0,176,164,64,0,0,0,0,0,183,177,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,176,164,64,0,0,0,0,0,183,177,64,0,0,0,0,0,156,162,64,0,0,0,0,0,108,177,64,0,0,0,0,0,190,161,64,0,0,0,0,0,247,177,64,0,0,0,0,0,82,163,64,0,0,0,0,0,102,177,64,0,0,0,0,0,250,166,64,0,0,0,0,0,83,178,64,0,0,0,0,0,18,168,64,0,0,0,0,0,154,178,64,0,0,0,0,0,112,169,64,0,0,0,0,0,10,179,64,0,0,0,0,0,130,170,64,0,0,0,0,0,99,179,64,0,0,0,0,0,136,170,64,0,0,0,0,0,89,179,64,0,0,0,0,0,110,170,64,0,0,0,0,0,65,179,64,0,0,0,0,0,226,166,64,0,0,0,0,0,5,178,64,0,0,0,0,0,176,164,64,0,0,0,0,0,183,177,64,0,0,0,0,0,164,161,64,0,0,0,0,0,7,178,64,0,0,0,0,0,162,161,64,0,0,0,0,0,6,178,64,0,0,0,0,0,160,161,64,0,0,0,0,0,5,178,64,0,0,0,0,0,160,161,64,0,0,0,0,0,3,178,64,0,0,0,0,0,124,162,64,0,0,0,0,0,99,177,64,0,0,0,0,0,180,164,64,0,0,0,0,0,178,177,64,0,0,0,0,0,232,166,64,0,0,0,0,0,1,178,64,0,0,0,0,0,118,170,64,0,0,0,0,0,61,179,64,0,0,0,0,0,118,170,64,0,0,0,0,0,62,179,64,0,0,0,0,0,146,170,64,0,0,0,0,0,88,179,64,0,0,0,0,0,150,170,64,0,0,0,0,0,99,179,64,0,0,0,0,0,132,170,64,0,0,0,0,0,104,179,64,0,0,0,0,0,130,170,64,0,0,0,0,0,105,179,64,0,0,0,0,0,128,170,64,0,0,0,0,0,104,179,64,0,0,0,0,0,106,169,64,0,0,0,0,0,14,179,64,0,0,0,0,0,14,168,64,0,0,0,0,0,158,178,64,0,0,0,0,0,246,166,64,0,0,0,0,0,87,178,64,0,0,0,0,0,52,163,64,0,0,0,0,0,100,177,64,0,0,0,0,0,168,161,64,0,0,0,0,0,6,178,64,0,0,0,0,0,164,161,64,0,0,0,0,0,7,178,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,156,199,64,0,0,0,0,0,206,179,64,0,0,0,0,128,187,199,64,0,0,0,0,0,171,180,64,0,0,0,0,0,175,199,64,0,0,0,0,0,216,180,64,0,0,0,0,0,173,199,64,0,0,0,0,0,223,180,64,0,0,0,0,0,170,199,64,0,0,0,0,0,223,180,64,0,0,0,0,0,157,199,64,0,0,0,0,0,214,180,64,0,0,0,0,0,139,199,64,0,0,0,0,0,192,180,64,0,0,0,0,128,110,199,64,0,0,0,0,0,126,180,64,0,0,0,0,128,110,199,64,0,0,0,0,0,125,180,64,0,0,0,0,0,58,199,64,0,0,0,0,0,12,180,64,0,0,0,0,0,32,199,64,0,0,0,0,0,255,179,64,0,0,0,0,0,16,199,64,0,0,0,0,0,245,179,64,0,0,0,0,128,8,199,64,0,0,0,0,0,13,180,64,0,0,0,0,128,1,199,64,0,0,0,0,0,31,180,64,0,0,0,0,128,2,199,64,0,0,0,0,0,77,180,64,0,0,0,0,128,5,199,64,0,0,0,0,0,241,180,64,0,0,0,0,0,114,199,64,0,0,0,0,0,24,183,64,0,0,0,0,128,114,199,64,0,0,0,0,0,26,183,64,0,0,0,0,0,142,199,64,0,0,0,0,0,95,183,64,0,0,0,0,128,148,199,64,0,0,0,0,0,127,183,64,0,0,0,0,128,120,199,64,0,0,0,0,0,146,183,64,0,0,0,0,0,49,199,64,0,0,0,0,0,67,183,64,0,0,0,0,0,46,199,64,0,0,0,0,0,66,183,64,0,0,0,0,0,44,199,64,0,0,0,0,0,66,183,64,0,0,0,0,0,43,199,64,0,0,0,0,0,69,183,64,0,0,0,0,128,41,199,64,0,0,0,0,0,74,183,64,0,0,0,0,0,42,199,64,0,0,0,0,0,81,183,64,0,0,0,0,0,80,199,64,0,0,0,0,0,240,183,64,0,0,0,0,128,55,199,64,0,0,0,0,0,29,184,64,0,0,0,0,0,54,199,64,0,0,0,0,0,34,184,64,0,0,0,0,0,54,199,64,0,0,0,0,0,40,184,64,0,0,0,0,128,113,199,64,0,0,0,0,0,75,185,64,0,0,0,0,128,127,199,64,0,0,0,0,0,212,185,64,0,0,0,0,0,134,199,64,0,0,0,0,0,22,186,64,0,0,0,0,128,130,199,64,0,0,0,0,0,51,186,64,0,0,0,0,0,127,199,64,0,0,0,0,0,72,186,64,0,0,0,0,0,116,199,64,0,0,0,0,0,67,186,64,0,0,0,0,128,112,199,64,0,0,0,0,0,67,186,64,0,0,0,0,0,110,199,64,0,0,0,0,0,72,186,64,0,0,0,0,0,110,199,64,0,0,0,0,0,79,186,64,0,0,0,0,128,135,199,64,0,0,0,0,0,41,187,64,0,0,0,0,128,136,199,64,0,0,0,0,0,130,187,64,0,0,0,0,0,137,199,64,0,0,0,0,0,169,187,64,0,0,0,0,128,132,199,64,0,0,0,0,0,181,187,64,0,0,0,0,128,129,199,64,0,0,0,0,0,185,187,64,0,0,0,0,0,122,199,64,0,0,0,0,0,173,187,64,0,0,0,0,0,121,199,64,0,0,0,0,0,171,187,64,0,0,0,0,0,103,199,64,0,0,0,0,0,153,187,64,0,0,0,0,128,99,199,64,0,0,0,0,0,154,187,64,0,0,0,0,0,97,199,64,0,0,0,0,0,154,187,64,0,0,0,0,0,96,199,64,0,0,0,0,0,156,187,64,0,0,0,0,128,93,199,64,0,0,0,0,0,159,187,64,0,0,0,0,0,94,199,64,0,0,0,0,0,166,187,64,0,0,0,0,0,96,199,64,0,0,0,0,0,175,187,64,0,0,0,0,128,103,199,64,0,0,0,0,0,188,187,64,0,0,0,0,0,120,199,64,0,0,0,0,0,215,187,64,0,0,0,0,128,114,199,64,0,0,0,0,0,19,188,64,0,0,0,0,0,96,199,64,0,0,0,0,0,23,188,64,0,0,0,0,0,93,199,64,0,0,0,0,0,39,188,64,0,0,0,0,0,89,199,64,0,0,0,0,0,54,188,64,0,0,0,0,128,96,199,64,0,0,0,0,0,101,188,64,0,0,0,0,128,129,199,64,0,0,0,0,0,65,189,64,0,0,0,0,128,141,199,64,0,0,0,0,0,190,189,64,0,0,0,0,0,159,199,64,0,0,0,0,0,117,190,64,0,0,0,0,0,151,199,64,0,0,0,0,0,156,190,64,0,0,0,0,0,149,199,64,0,0,0,0,0,161,190,64,0,0,0,0,0,143,199,64,0,0,0,0,0,155,190,64,0,0,0,0,0,132,199,64,0,0,0,0,0,139,190,64,0,0,0,0,0,115,199,64,0,0,0,0,0,87,190,64,0,0,0,0,0,114,199,64,0,0,0,0,0,85,190,64].concat([0,0,0,0,0,67,199,64,0,0,0,0,0,243,189,64,0,0,0,0,0,40,199,64,0,0,0,0,0,215,189,64,0,0,0,0,0,25,199,64,0,0,0,0,0,199,189,64,0,0,0,0,0,15,199,64,0,0,0,0,0,203,189,64,0,0,0,0,128,3,199,64,0,0,0,0,0,207,189,64,0,0,0,0,0,255,198,64,0,0,0,0,0,233,189,64,0,0,0,0,0,240,198,64,0,0,0,0,0,51,190,64,0,0,0,0,0,36,199,64,0,0,0,0,0,101,191,64,0,0,0,0,0,25,199,64,0,0,0,0,0,94,191,64,0,0,0,0,128,7,199,64,0,0,0,0,0,89,191,64,0,0,0,0,128,239,198,64,0,0,0,0,0,133,191,64,0,0,0,0,0,238,198,64,0,0,0,0,0,136,191,64,0,0,0,0,128,237,198,64,0,0,0,0,0,140,191,64,0,0,0,0,0,237,198,64,0,0,0,0,0,156,191,64,0,0,0,0,128,223,198,64,0,0,0,0,0,162,191,64,0,0,0,0,0,206,198,64,0,0,0,0,0,170,191,64,0,0,0,0,0,171,198,64,0,0,0,0,0,162,191,64,0,0,0,0,128,168,198,64,0,0,0,0,0,163,191,64,0,0,0,0,128,166,198,64,0,0,0,0,0,167,191,64,0,0,0,0,128,165,198,64,0,0,0,0,0,172,191,64,0,0,0,0,128,165,198,64,0,0,0,0,128,10,192,64,0,0,0,0,0,149,198,64,0,0,0,0,0,237,191,64,0,0,0,0,128,113,198,64,0,0,0,0,0,250,191,64,0,0,0,0,0,111,198,64,0,0,0,0,0,254,191,64,0,0,0,0,128,109,198,64,0,0,0,0,0,2,192,64,0,0,0,0,128,110,198,64,0,0,0,0,0,5,192,64,0,0,0,0,128,154,198,64,0,0,0,0,128,61,192,64,0,0,0,0,128,121,198,64,0,0,0,0,128,14,193,64,0,0,0,0,0,108,198,64,0,0,0,0,128,243,192,64,0,0,0,0,128,67,198,64,0,0,0,0,0,237,192,64,0,0,0,0,0,64,198,64,0,0,0,0,0,238,192,64,0,0,0,0,0,62,198,64,0,0,0,0,128,240,192,64,0,0,0,0,0,62,198,64,0,0,0,0,0,244,192,64,0,0,0,0,0,76,198,64,0,0,0,0,0,25,193,64,0,0,0,0,128,23,198,64,0,0,0,0,128,157,193,64,0,0,0,0,128,7,198,64,0,0,0,0,0,89,193,64,0,0,0,0,0,233,197,64,0,0,0,0,0,212,192,64,0,0,0,0,128,116,197,64,0,0,0,0,128,121,192,64,0,0,0,0,0,79,197,64,0,0,0,0,128,91,192,64,0,0,0,0,0,41,197,64,0,0,0,0,0,74,192,64,0,0,0,0,128,41,197,64,0,0,0,0,0,74,192,64,0,0,0,0,128,20,197,64,0,0,0,0,0,64,192,64,0,0,0,0,128,10,197,64,0,0,0,0,0,65,192,64,0,0,0,0,128,8,197,64,0,0,0,0,0,65,192,64,0,0,0,0,0,7,197,64,0,0,0,0,128,66,192,64,0,0,0,0,128,5,197,64,0,0,0,0,128,69,192,64,0,0,0,0,128,6,197,64,0,0,0,0,0,73,192,64,0,0,0,0,128,12,197,64,0,0,0,0,0,83,192,64,0,0,0,0,0,0,197,64,0,0,0,0,0,146,192,64,0,0,0,0,128,242,196,64,0,0,0,0,0,127,192,64,0,0,0,0,128,239,196,64,0,0,0,0,0,125,192,64,0,0,0,0,128,235,196,64,0,0,0,0,0,126,192,64,0,0,0,0,128,233,196,64,0,0,0,0,128,129,192,64,0,0,0,0,128,213,196,64,0,0,0,0,0,247,192,64,0,0,0,0,128,195,196,64,0,0,0,0,0,198,192,64,0,0,0,0,128,128,196,64,0,0,0,0,128,78,192,64,0,0,0,0,128,127,196,64,0,0,0,0,0,77,192,64,0,0,0,0,128,127,196,64,0,0,0,0,128,76,192,64,0,0,0,0,128,124,196,64,0,0,0,0,128,74,192,64,0,0,0,0,128,120,196,64,0,0,0,0,128,74,192,64,0,0,0,0,128,118,196,64,0,0,0,0,128,77,192,64,0,0,0,0,128,118,196,64,0,0,0,0,128,81,192,64,0,0,0,0,0,121,196,64,0,0,0,0,128,90,192,64,0,0,0,0,128,113,196,64,0,0,0,0,0,93,192,64,0,0,0,0,0,96,196,64,0,0,0,0,128,94,192,64,0,0,0,0,0,52,196,64,0,0,0,0,128,81,192,64,0,0,0,0,0,49,196,64,0,0,0,0,128,81,192,64,0,0,0,0,0,47,196,64,0,0,0,0,0,83,192,64,0,0,0,0,128,45,196,64,0,0,0,0,128,85,192,64,0,0,0,0,128,42,196,64,0,0,0,0,0,93,192,64,0,0,0,0,128,32,196,64,0,0,0,0,128,91,192,64,0,0,0,0,0,15,196,64,0,0,0,0,128,83,192,64,0,0,0,0,0,238,195,64,0,0,0,0,128,50,192,64,0,0,0,0,0,237,195,64,0,0,0,0,0,49,192,64,0,0,0,0,0,235,195,64,0,0,0,0,0,49,192,64,0,0,0,0,0,232,195,64,0,0,0,0,0,50,192,64,0,0,0,0,128,220,195,64,0,0,0,0,0,56,192,64,0,0,0,0,0,92,195,64,0,0,0,0,128,13,192,64,0,0,0,0,0,89,195,64,0,0,0,0,128,13,192,64,0,0,0,0,128,87,195,64,0,0,0,0,128,13,192,64,0,0,0,0,128,86,195,64,0,0,0,0,0,15,192,64,0,0,0,0,128,85,195,64,0,0,0,0,0,18,192,64,0,0,0,0,128,85,195,64,0,0,0,0,128,18,192,64,0,0,0,0,128,79,195,64,0,0,0,0,0,19,192,64,0,0,0,0,128,31,195,64,0,0,0,0,0,13,192,64,0,0,0,0,0,28,195,64,0,0,0,0,128,13,192,64,0,0,0,0,0,26,195,64,0,0,0,0,0,16,192,64,0,0,0,0,0,26,195,64,0,0,0,0,128,19,192,64,0,0,0,0,128,32,195,64,0,0,0,0,128,45,192,64,0,0,0,0,0,254,194,64,0,0,0,0,0,167,192,64,0,0,0,0,128,199,194,64,0,0,0,0,0,38,192,64,0,0,0,0,0,142,194,64,0,0,0,0,0,231,191,64,0,0,0,0,0,79,194,64,0,0,0,0,0,120,191,64,0,0,0,0,128,12,194,64,0,0,0,0,0,187,191,64,0,0,0,0,0,11,194,64,0,0,0,0,0,188,191,64,0,0,0,0,128,10,194,64,0,0,0,0,0,190,191,64,0,0,0,0,0,10,194,64,0,0,0,0,0,194,191,64,0,0,0,0,0,245,193,64,0,0,0,0,0,56,192,64,0,0,0,0,0,220,193,64,0,0,0,0,0,60,192,64,0,0,0,0,128,195,193,64,0,0,0,0,128,61,192,64,0,0,0,0,128,163,193,64,0,0,0,0,0,217,191,64,0,0,0,0,0,162,193,64,0,0,0,0,0,213,191,64,0,0,0,0,128,160,193,64,0,0,0,0,0,211,191,64,0,0,0,0,0,208,192,64,0,0,0,0,0,53,191,64,0,0,0,0,128,82,192,64,0,0,0,0,0,159,191,64,0,0,0,0,0,169,191,64,0,0,0,0,0,4,192,64,0,0,0,0,0,84,191,64,0,0,0,0,0,189,192,64,0,0,0,0,0,84,191,64,0,0,0,0,0,192,192,64,0,0,0,0,0,88,191,64,0,0,0,0,128,194,192,64,0,0,0,0,0,165,191,64,0,0,0,0,128,219,192,64,0,0,0,0,128,38,192,64,0,0,0,0,0,200,193,64,0,0,0,0,0,141,191,64,0,0,0,0,0,59,193,64,0,0,0,0,0,140,191,64,0,0,0,0,128,58,193,64,0,0,0,0,0,173,190,64,0,0,0,0,0,223,192,64,0,0,0,0,0,134,190,64,0,0,0,0,128,218,192,64,0,0,0,0,0,119,190,64,0,0,0,0,0,219,192,64,0,0,0,0,0,111,190,64,0,0,0,0,0,221,192,64,0,0,0,0,0,114,190,64,0,0,0,0,0,227,192,64,0,0,0,0,0,115,190,64,0,0,0,0,128,231,192,64,0,0,0,0,0,131,190,64,0,0,0,0,128,242,192,64,0,0,0,0,0,229,190,64,0,0,0,0,0,45,193,64,0,0,0,0,0,230,190,64,0,0,0,0,128,45,193,64,0,0,0,0,0,33,191,64,0,0,0,0,128,84,193,64,0,0,0,0,0,43,191,64,0,0,0,0,0,97,193,64,0,0,0,0,0,39,191,64,0,0,0,0,128,95,193,64,0,0,0,0,0,235,190,64,0,0,0,0,0,74,193,64,0,0,0,0,0,234,190,64,0,0,0,0,128,73,193,64,0,0,0,0,0,145,190,64,0,0,0,0,128,49,193,64,0,0,0,0,0,99,190,64,0,0,0,0,128,41,193,64,0,0,0,0,0,60,190,64,0,0,0,0,0,37,193,64,0,0,0,0,0,38,190,64,0,0,0,0,0,37,193,64,0,0,0,0,0,36,190,64,0,0,0,0,0,45,193,64,0,0,0,0,0,26,190,64,0,0,0,0,0,59,193,64,0,0,0,0,0,130,190,64,0,0,0,0,128,114,193,64,0,0,0,0,0,5,190,64,0,0,0,0,0,76,193,64,0,0,0,0,0,210,189,64,0,0,0,0,0,73,193,64,0,0,0,0,0,167,189,64,0,0,0,0,128,70,193,64,0,0,0,0,0,164,189,64,0,0,0,0,128,87,193,64,0,0,0,0,0,161,189,64,0,0,0,0,128,97,193,64,0,0,0,0,0,177,189,64,0,0,0,0,128,115,193,64,0,0,0,0,0,145,189,64,0,0,0,0,0,110,193,64,0,0,0,0,0,132,189,64,0,0,0,0,128,115,193,64,0,0,0,0,0,109,189,64,0,0,0,0,0,122,193,64,0,0,0,0,0,124,189,64,0,0,0,0,128,149,193,64,0,0,0,0,0,146,189,64,0,0,0,0,0,193,193,64,0,0,0,0,0,14,190,64,0,0,0,0,0,44,194,64,0,0,0,0,0,216,189,64,0,0,0,0,0,29,194,64,0,0,0,0,0,51,189,64,0,0,0,0,0,226,193,64,0,0,0,0,0,45,189,64,0,0,0,0,0,225,193,64,0,0,0,0,0,42,189,64,0,0,0,0,0,225,193,64,0,0,0,0,0,40,189,64,0,0,0,0,0,226,193,64,0,0,0,0,0,36,189,64,0,0,0,0,128,228,193,64,0,0,0,0,0,36,189,64,0,0,0,0,128,231,193,64,0,0,0,0,0,104,189,64,0,0,0,0,128,111,194,64,0,0,0,0,0,79,189,64,0,0,0,0,0,132,194,64,0,0,0,0,0,70,189,64,0,0,0,0,128,133,194,64,0,0,0,0,0,42,189,64,0,0,0,0,0,123,194,64,0,0,0,0,0,4,189,64,0,0,0,0,0,104,194,64,0,0,0,0,0,198,188,64,0,0,0,0,128,56,194,64,0,0,0,0,0,196,188,64,0,0,0,0,128,55,194,64,0,0,0,0,0,182,188,64,0,0,0,0,128,43,194,64,0,0,0,0,0,176,188,64,0,0,0,0,128,41,194,64,0,0,0,0,0,168,188,64,0,0,0,0,0,42,194,64,0,0,0,0,0,164,188,64,0,0,0,0,0,45,194,64,0,0,0,0,0,165,188,64,0,0,0,0,128,48,194,64,0,0,0,0,0,180,188,64,0,0,0,0,128,60,194,64,0,0,0,0,0,181,188,64,0,0,0,0,0,62,194,64,0,0,0,0,0,183,188,64,0,0,0,0,128,63,194,64,0,0,0,0,0,215,188,64,0,0,0,0,128,92,194,64,0,0,0,0,0,204,188,64,0,0,0,0,0,117,194,64,0,0,0,0,0,205,188,64,0,0,0,0,0,121,194,64,0,0,0,0,0,91,189,64,0,0,0,0,128,235,194,64,0,0,0,0,0,59,189,64,0,0,0,0,128,113,195,64,0,0,0,0,0,59,189,64,0,0,0,0,0,114,195,64,0,0,0,0,0,48,189,64,0,0,0,0,128,222,195,64,0,0,0,0,0,34,189,64,0,0,0,0,128,220,195,64,0,0,0,0,0,14,189,64,0,0,0,0,128,216,195,64,0,0,0,0,0,231,188,64,0,0,0,0,128,101,195,64,0,0,0,0,0,228,188,64,0,0,0,0,128,98,195,64,0,0,0,0,0,223,188,64,0,0,0,0,0,97,195,64,0,0,0,0,0,217,188,64,0,0,0,0,128,97,195,64,0,0,0,0,0,212,188,64,0,0,0,0,0,100,195,64,0,0,0,0,0,205,188,64,0,0,0,0,128,105,195,64,0,0,0,0,0,197,188,64,0,0,0,0,0,100,195,64,0,0,0,0,0,181,188,64,0,0,0,0,0,85,195,64,0,0,0,0,0,163,188,64,0,0,0,0,0,39,195,64,0,0,0,0,0,134,188,64,0,0,0,0,128,224,194,64,0,0,0,0,0,94,188,64,0,0,0,0,128,210,194,64,0,0,0,0,0,70,188,64,0,0,0,0,128,201,194,64,0,0,0,0,0,43,188,64,0,0,0,0,128,210,194,64,0,0,0,0,0,21,188,64,0,0,0,0,128,217,194,64,0,0,0,0,0,253,187,64,0,0,0,0,128,239,194,64,0,0,0,0,0,252,187,64,0,0,0,0,128,243,194,64,0,0,0,0,0,7,188,64,0,0,0,0,0,14,195,64,0,0,0,0,0,143,187,64,0,0,0,0,128,77,195,64,0,0,0,0,0,160,187,64,0,0,0,0,128,28,195,64,0,0,0,0,0,70,187,64,0,0,0,0,0,188,194,64,0,0,0,0,0,66,187,64,0,0,0,0,0,186,194,64,0,0,0,0,0,61,187,64,0,0,0,0,0,185,194,64,0,0,0,0,0,55,187,64,0,0,0,0,0,186,194,64,0,0,0,0,0,52,187,64,0,0,0,0,128,188,194,64,0,0,0,0,0,254,186,64,0,0,0,0,0,22,195,64,0,0,0,0,0,216,186,64,0,0,0,0,0,63,195,64,0,0,0,0,0,198,186,64,0,0,0,0,128,82,195,64,0,0,0,0,0,184,186,64,0,0,0,0,128,90,195,64,0,0,0,0,0,176,186,64,0,0,0,0,0,95,195,64,0,0,0,0,0,171,186,64,0,0,0,0,0,94,195,64,0,0,0,0,0,131,186,64,0,0,0,0,0,78,195,64,0,0,0,0,0,151,186,64,0,0,0,0,128,126,194,64,0,0,0,0,0,150,186,64,0,0,0,0,128,123,194,64,0,0,0,0,0,145,186,64,0,0,0,0,128,121,194,64,0,0,0,0,0,138,186,64,0,0,0,0,128,121,194,64,0,0,0,0,0,133,186,64,0,0,0,0,0,123,194,64,0,0,0,0,0,109,186,64,0,0,0,0,128,138,194,64,0,0,0,0,0,42,185,64,0,0,0,0,128,217,195,64,0,0,0,0,0,37,185,64,0,0,0,0,0,164,195,64,0,0,0,0,0,166,185,64,0,0,0,0,128,28,195,64,0,0,0,0,0,167,185,64,0,0,0,0,128,27,195,64,0,0,0,0,0,184,185,64,0,0,0,0,0,248,194,64,0,0,0,0,0,176,185,64,0,0,0,0,0,237,194,64,0,0,0,0,0,169,185,64,0,0,0,0,128,227,194,64,0,0,0,0,0,153,185,64,0,0,0,0,0,229,194,64,0,0,0,0,0,141,185,64,0,0,0,0,0,229,194,64,0,0,0,0,0,123,185,64,0,0,0,0,0,236,194,64,0,0,0,0,0,69,185,64,0,0,0,0,128,1,195,64,0,0,0,0,0,198,184,64,0,0,0,0,0,95,195,64,0,0,0,0,0,247,184,64,0,0,0,0,0,251,194,64,0,0,0,0,0,208,184,64,0,0,0,0,128,232,194,64,0,0,0,0,0,184,184,64,0,0,0,0,0,219,194,64,0,0,0,0,0,129,184,64,0,0,0,0,128,237,194,64,0,0,0,0,0,81,184,64,0,0,0,0,0,253,194,64,0,0,0,0,0,6,184,64,0,0,0,0,0,39,195,64,0,0,0,0,0,4,184,64,0,0,0,0,128,40,195,64,0,0,0,0,0,3,184,64,0,0,0,0,128,42,195,64,0,0,0,0,0,10,184,64,0,0,0,0,128,88,195,64,0,0,0,0,0,222,183,64,0,0,0,0,0,167,195,64,0,0,0,0,0,151,183,64,0,0,0,0,0,21,195,64,0,0,0,0,0,151,183,64,0,0,0,0,128,20,195,64,0,0,0,0,0,86,183,64,0,0,0,0,128,185,194,64,0,0,0,0,0,39,183,64,0,0,0,0,128,149,194,64,0,0,0,0,0,14,183,64,0,0,0,0,0,130,194,64,0,0,0,0,0,249,182,64,0,0,0,0,128,125,194,64,0,0,0,0,0,223,182,64,0,0,0,0,128,119,194,64,0,0,0,0,0,203,182,64,0,0,0,0,0,132,194,64,0,0,0,0,0,144,182,64,0,0,0,0,128,168,194,64,0,0,0,0,0,155,182,64,0,0,0,0,128,159,195,64,0,0,0,0,0,247,181,64,0,0,0,0,0,91,195,64,0,0,0,0,0,239,181,64,0,0,0,0,0,250,194,64,0,0,0,0,0,237,181,64,0,0,0,0,0,247,194,64,0,0,0,0,0,231,181,64,0,0,0,0,0,245,194,64,0,0,0,0,0,224,181,64,0,0,0,0,0,246,194,64,0,0,0,0,0,220,181,64,0,0,0,0,128,248,194,64,0,0,0,0,0,179,181,64,0,0,0,0,128,44,195,64,0,0,0,0,0,168,181,64,0,0,0,0,0,53,195,64,0,0,0,0,0,152,181,64,0,0,0,0,0,40,195,64,0,0,0,0,0,159,181,64,0,0,0,0,128,206,194,64,0,0,0,0,0,159,181,64,0,0,0,0,0,207,194,64,0,0,0,0,0,189,181,64,0,0,0,0,0,141,194,64,0,0,0,0,0,192,181,64,0,0,0,0,0,111,194,64,0,0,0,0,0,193,181,64,0,0,0,0,0,94,194,64,0,0,0,0,0,186,181,64,0,0,0,0,128,87,194,64,0,0,0,0,0,176,181,64,0,0,0,0,128,76,194,64,0,0,0,0,0,155,181,64,0,0,0,0,128,81,194,64,0,0,0,0,0,103,181,64,0,0,0,0,0,92,194,64,0,0,0,0,0,196,180,64,0,0,0,0,0,248,194,64,0,0,0,0,0,196,180,64,0,0,0,0,128,248,194,64,0,0,0,0,0,158,180,64,0,0,0,0,0,40,195,64,0,0,0,0,0,144,180,64,0,0,0,0,128,46,195,64,0,0,0,0,0,142,180,64,0,0,0,0,0,40,195,64,0,0,0,0,0,139,180,64,0,0,0,0,0,28,195,64,0,0,0,0,0,143,180,64,0,0,0,0,128,2,195,64,0,0,0,0,0,185,180,64,0,0,0,0,128,179,194,64,0,0,0,0,0,151,180,64,0,0,0,0,128,162,194,64,0,0,0,0,0,121,180,64,0,0,0,0,128,145,194,64,0,0,0,0,0,42,180,64,0,0,0,0,0,176,194,64,0,0,0,0,0,60,180,64,0,0,0,0,128,149,194,64,0,0,0,0,0,64,180,64,0,0,0,0,0,139,194,64,0,0,0,0,0,56,180,64,0,0,0,0,0,136,194,64,0,0,0,0,0,48,180,64,0,0,0,0,128,130,194,64,0,0,0,0,0,29,180,64,0,0,0,0,128,134,194,64,0,0,0,0,0,243,179,64,0,0,0,0,128,142,194,64,0,0,0,0,0,103,179,64,0,0,0,0,0,217,194,64,0,0,0,0,0,103,179,64,0,0,0,0,128,63,194,64,0,0,0,0,0,160,179,64,0,0,0,0,128,11,194,64,0,0,0,0,0,180,179,64,0,0,0,0,0,240,193,64,0,0,0,0,0,191,179,64,0,0,0,0,128,216,193,64,0,0,0,0,0,191,179,64,0,0,0,0,128,204,193,64,0,0,0,0,0,175,179,64,0,0,0,0,128,202,193,64,0,0,0,0,0,134,179,64,0,0,0,0,128,193,193,64,0,0,0,0,0,207,178,64,0,0,0,0,128,22,194,64,0,0,0,0,0,211,178,64,0,0,0,0,0,100,193,64,0,0,0,0,0,193,178,64,0,0,0,0,0,61,193,64,0,0,0,0,0,186,178,64,0,0,0,0,0,47,193,64,0,0,0,0,0,175,178,64,0,0,0,0,128,46,193,64,0,0,0,0,0,162,178,64,0,0,0,0,128,43,193,64,0,0,0,0,0,151,178,64,0,0,0,0,0,57,193,64,0,0,0,0,0,142,178,64,0,0,0,0,128,66,193,64,0,0,0,0,0,132,178,64,0,0,0,0,0,88,193,64,0,0,0,0,0,127,178,64,0,0,0,0,128,14,193,64,0,0,0,0,0,145,178,64,0,0,0,0,128,229,192,64,0,0,0,0,0,147,178,64,0,0,0,0,128,209,192,64,0,0,0,0,0,125,178,64,0,0,0,0,0,209,192,64,0,0,0,0,0,99,178,64,0,0,0,0,0,206,192,64,0,0,0,0,0,32,178,64,0,0,0,0,0,244,192,64,0,0,0,0,0,117,178,64,0,0,0,0,0,76,192,64,0,0,0,0,0,250,179,64,0,0,0,0,0,213,191,64,0,0,0,0,0,254,179,64,0,0,0,0,0,209,191,64,0,0,0,0,0,6,180,64,0,0,0,0,0,193,191,64,0,0,0,0,0,250,179,64,0,0,0,0,0,184,191,64,0,0,0,0,0,243,179,64,0,0,0,0,0,177,191,64,0,0,0,0,0,224,179,64,0,0,0,0,0,176,191,64,0,0,0,0,0,127,179,64,0,0,0,0,0,186,191,64,0,0,0,0,0,50,179,64,0,0,0,0,0,138,191,64,0,0,0,0,0,177,178,64,0,0,0,0,0,184,191,64,0,0,0,0,0,46,179,64,0,0,0,0,0,61,191,64,0,0,0,0,0,101,179,64,0,0,0,0,0,249,190,64,0,0,0,0,0,133,179,64,0,0,0,0,0,209,190,64,0,0,0,0,0,141,179,64,0,0,0,0,0,187,190,64,0,0,0,0,0,142,179,64,0,0,0,0,0,165,190,64,0,0,0,0,0,139,179,64,0,0,0,0,0,153,190,64,0,0,0,0,0,125,179,64,0,0,0,0,0,150,190,64,0,0,0,0,0,63,179,64,0,0,0,0,0,136,190,64,0,0,0,0,0,161,177,64,0,0,0,0,0,140,191,64,0,0,0,0,0,214,177,64,0,0,0,0,0,249,190,64,0,0,0,0,0,253,177,64,0,0,0,0,0,197,190,64,0,0,0,0,0,253,177,64,0,0,0,0,0,189,190,64,0,0,0,0,0,251,177,64,0,0,0,0,0,182,190,64,0,0,0,0,0,243,177,64,0,0,0,0,0,182,190,64,0,0,0,0,0,233,177,64,0,0,0,0,0,185,190,64,0,0,0,0,0,209,177,64,0,0,0,0,0,202,190,64,0,0,0,0,0,239,176,64,0,0,0,0,0,150,191,64,0,0,0,0,0,166,177,64,0,0,0,0,0,185,189,64,0,0,0,0,0,14,178,64,0,0,0,0,0,52,189,64,0,0,0,0,0,29,178,64,0,0,0,0,0,17,189,64,0,0,0,0,0,30,178,64,0,0,0,0,0,5,189,64,0,0,0,0,0,20,178,64,0,0,0,0,0,2,189,64,0,0,0,0,0,4,178,64,0,0,0,0,0,3,189,64,0,0,0,0,0,211,177,64,0,0,0,0,0,18,189,64,0,0,0,0,0,230,176,64,0,0,0,0,0,218,189,64,0,0,0,0,0,54,177,64,0,0,0,0,0,128,188,64,0,0,0,0,0,146,177,64,0,0,0,0,0,223,187,64,0,0,0,0,0,142,177,64,0,0,0,0,0,187,187,64,0,0,0,0,0,140,177,64,0,0,0,0,0,169,187,64,0,0,0,0,0,126,177,64,0,0,0,0,0,169,187,64,0,0,0,0,0,117,177,64,0,0,0,0,0,167,187,64,0,0,0,0,0,101,177,64,0,0,0,0,0,176,187,64,0,0,0,0,0,61,177,64,0,0,0,0,0,204,187,64,0,0,0,0,0,90,177,64,0,0,0,0,0,113,187,64,0,0,0,0,0,95,177,64,0,0,0,0,0,164,186,64,0,0,0,0,0,160,177,64,0,0,0,0,0,160,185,64,0,0,0,0,0,69,176,64,0,0,0,0,0,131,184,64,0,0,0,0,0,64,176,64,0,0,0,0,0,128,184,64,0,0,0,0,0,154,175,64,0,0,0,0,0,112,184,64,0,0,0,0,0,102,174,64,0,0,0,0,0,71,184,64,0,0,0,0,0,0,173,64,0,0,0,0,0,27,184,64,0,0,0,0,0,254,172,64,0,0,0,0,0,26,184,64,0,0,0,0,0,70,172,64,0,0,0,0,0,10,184,64,0,0,0,0,0,172,171,64,0,0,0,0,0,104,183,64,0,0,0,0,0,110,171,64,0,0,0,0,0,41,183,64,0,0,0,0,0,126,171,64,0,0,0,0,0,157,182,64,0,0,0,0,0,124,171,64,0,0,0,0,0,151,182,64,0,0,0,0,0,32,170,64,0,0,0,0,0,147,181,64,0,0,0,0,0,174,170,64,0,0,0,0,0,159,180,64,0,0,0,0,0,172,170,64,0,0,0,0,0,151,180,64,0,0,0,0,0,84,170,64,0,0,0,0,0,73,180,64,0,0,0,0,0,46,170,64,0,0,0,0,0,107,179,64,0,0,0,0,0,72,199,64,0,0,0,0,0,160,177,64,0,0,0,0,0,70,199,64,0,0,0,0,0,8,178,64,0,0,0,0,128,156,199,64,0,0,0,0,0,207,179,64,0,0,0,0,128,156,199,64,0,0,0,0,0,206,179,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,128,156,199,64,0,0,0,0,0,206,179,64,0,0,0,0,128,156,199,64,0,0,0,0,0,207,179,64,0,0,0,0,0,70,199,64,0,0,0,0,0,8,178,64,0,0,0,0,0,72,199,64,0,0,0,0,0,160,177,64,0,0,0,0,0,46,170,64,0,0,0,0,0,107,179,64,0,0,0,0,0,84,170,64,0,0,0,0,0,73,180,64,0,0,0,0,0,172,170,64,0,0,0,0,0,151,180,64,0,0,0,0,0,174,170,64,0,0,0,0,0,159,180,64,0,0,0,0,0,32,170,64,0,0,0,0,0,147,181,64,0,0,0,0,0,124,171,64,0,0,0,0,0,151,182,64,0,0,0,0,0,126,171,64,0,0,0,0,0,157,182,64,0,0,0,0,0,110,171,64,0,0,0,0,0,41,183,64,0,0,0,0,0,172,171,64,0,0,0,0,0,104,183,64,0,0,0,0,0,70,172,64,0,0,0,0,0,10,184,64,0,0,0,0,0,254,172,64,0,0,0,0,0,26,184,64,0,0,0,0,0,0,173,64,0,0,0,0,0,27,184,64,0,0,0,0,0,102,174,64,0,0,0,0,0,71,184,64,0,0,0,0,0,154,175,64,0,0,0,0,0,112,184,64,0,0,0,0,0,64,176,64,0,0,0,0,0,128,184,64,0,0,0,0,0,69,176,64,0,0,0,0,0,131,184,64,0,0,0,0,0,160,177,64,0,0,0,0,0,160,185,64,0,0,0,0,0,95,177,64,0,0,0,0,0,164,186,64,0,0,0,0,0,90,177,64,0,0,0,0,0,113,187,64,0,0,0,0,0,61,177,64,0,0,0,0,0,204,187,64,0,0,0,0,0,101,177,64,0,0,0,0,0,176,187,64,0,0,0,0,0,117,177,64,0,0,0,0,0,167,187,64,0,0,0,0,0,126,177,64,0,0,0,0,0,169,187,64,0,0,0,0,0,140,177,64,0,0,0,0,0,169,187,64,0,0,0,0,0,142,177,64,0,0,0,0,0,187,187,64,0,0,0,0,0,146,177,64,0,0,0,0,0,223,187,64,0,0,0,0,0,54,177,64,0,0,0,0,0,128,188,64,0,0,0,0,0,230,176,64,0,0,0,0,0,218,189,64,0,0,0,0,0,211,177,64,0,0,0,0,0,18,189,64,0,0,0,0,0,4,178,64,0,0,0,0,0,3,189,64,0,0,0,0,0,20,178,64,0,0,0,0,0,2,189,64,0,0,0,0,0,30,178,64,0,0,0,0,0,5,189,64,0,0,0,0,0,29,178,64,0,0,0,0,0,17,189,64,0,0,0,0,0,14,178,64,0,0,0,0,0,52,189,64,0,0,0,0,0,166,177,64,0,0,0,0,0,185,189,64,0,0,0,0,0,239,176,64,0,0,0,0,0,150,191,64,0,0,0,0,0,209,177,64,0,0,0,0,0,202,190,64,0,0,0,0,0,233,177,64,0,0,0,0,0,185,190,64,0,0,0,0,0,243,177,64,0,0,0,0,0,182,190,64,0,0,0,0,0,251,177,64,0,0,0,0,0,182,190,64,0,0,0,0,0,253,177,64,0,0,0,0,0,189,190,64,0,0,0,0,0,253,177,64,0,0,0,0,0,197,190,64,0,0,0,0,0,214,177,64,0,0,0,0,0,249,190,64,0,0,0,0,0,161,177,64,0,0,0,0,0,140,191,64,0,0,0,0,0,63,179,64,0,0,0,0,0,136,190,64,0,0,0,0,0,125,179,64,0,0,0,0,0,150,190,64,0,0,0,0,0,139,179,64,0,0,0,0,0,153,190,64,0,0,0,0,0,142,179,64,0,0,0,0,0,165,190,64,0,0,0,0,0,141,179,64,0,0,0,0,0,187,190,64,0,0,0,0,0,133,179,64,0,0,0,0,0,209,190,64,0,0,0,0,0,101,179,64,0,0,0,0,0,249,190,64,0,0,0,0,0,46,179,64,0,0,0,0,0,61,191,64,0,0,0,0,0,177,178,64,0,0,0,0,0,184,191,64,0,0,0,0,0,50,179,64,0,0,0,0,0,138,191,64,0,0,0,0,0,127,179,64,0,0,0,0,0,186,191,64,0,0,0,0,0,224,179,64,0,0,0,0,0,176,191,64,0,0,0,0,0,243,179,64,0,0,0,0,0,177,191,64,0,0,0,0,0,250,179,64,0,0,0,0,0,184,191,64,0,0,0,0,0,6,180,64,0,0,0,0,0,193,191,64,0,0,0,0,0,254,179,64,0,0,0,0,0,209,191,64,0,0,0,0,0,250,179,64,0,0,0,0,0,213,191,64,0,0,0,0,0,117,178,64,0,0,0,0,0,76,192,64,0,0,0,0,0,32,178,64,0,0,0,0,0,244,192,64,0,0,0,0,0,99,178,64,0,0,0,0,0,206,192,64,0,0,0,0,0,125,178,64,0,0,0,0,0,209,192,64,0,0,0,0,0,147,178,64,0,0,0,0,128,209,192,64,0,0,0,0,0,145,178,64,0,0,0,0,128,229,192,64,0,0,0,0,0,127,178,64,0,0,0,0,128,14,193,64,0,0,0,0,0,132,178,64,0,0,0,0,0,88,193,64,0,0,0,0,0,142,178,64,0,0,0,0,128,66,193,64,0,0,0,0,0,151,178,64,0,0,0,0,0,57,193,64,0,0,0,0,0,162,178,64,0,0,0,0,128,43,193,64,0,0,0,0,0,175,178,64,0,0,0,0,128,46,193,64,0,0,0,0,0,186,178,64,0,0,0,0,0,47,193,64,0,0,0,0,0,193,178,64,0,0,0,0,0,61,193,64,0,0,0,0,0,211,178,64,0,0,0,0,0,100,193,64,0,0,0,0,0,207,178,64,0,0,0,0,128,22,194,64,0,0,0,0,0,134,179,64,0,0,0,0,128,193,193,64,0,0,0,0,0,175,179,64,0,0,0,0,128,202,193,64,0,0,0,0,0,191,179,64,0,0,0,0,128,204,193,64,0,0,0,0,0,191,179,64,0,0,0,0,128,216,193,64,0,0,0,0,0,180,179,64,0,0,0,0,0,240,193,64,0,0,0,0,0,160,179,64,0,0,0,0,128,11,194,64,0,0,0,0,0,103,179,64,0,0,0,0,128,63,194,64,0,0,0,0,0,103,179,64,0,0,0,0,0,217,194,64,0,0,0,0,0,243,179,64,0,0,0,0,128,142,194,64,0,0,0,0,0,29,180,64,0,0,0,0,128,134,194,64,0,0,0,0,0,48,180,64,0,0,0,0,128,130,194,64,0,0,0,0,0,56,180,64,0,0,0,0,0,136,194,64,0,0,0,0,0,64,180,64,0,0,0,0,0,139,194,64,0,0,0,0,0,60,180,64,0,0,0,0,128,149,194,64,0,0,0,0,0,42,180,64,0,0,0,0,0,176,194,64,0,0,0,0,0,121,180,64,0,0,0,0,128,145,194,64,0,0,0,0,0,151,180,64,0,0,0,0,128,162,194,64,0,0,0,0,0,185,180,64,0,0,0,0,128,179,194,64,0,0,0,0,0,143,180,64,0,0,0,0,128,2,195,64,0,0,0,0,0,139,180,64,0,0,0,0,0,28,195,64,0,0,0,0,0,142,180,64,0,0,0,0,0,40,195,64,0,0,0,0,0,144,180,64,0,0,0,0,128,46,195,64,0,0,0,0,0,158,180,64,0,0,0,0,0,40,195,64,0,0,0,0,0,196,180,64,0,0,0,0,128,248,194,64,0,0,0,0,0,196,180,64,0,0,0,0,0,248,194,64,0,0,0,0,0,103,181,64,0,0,0,0,0,92,194,64,0,0,0,0,0,155,181,64,0,0,0,0,128,81,194,64,0,0,0,0,0,176,181,64,0,0,0,0,128,76,194,64,0,0,0,0,0,186,181,64,0,0,0,0,128,87,194,64,0,0,0,0,0,193,181,64,0,0,0,0,0,94,194,64,0,0,0,0,0,192,181,64,0,0,0,0,0,111,194,64,0,0,0,0,0,189,181,64,0,0,0,0,0,141,194,64,0,0,0,0,0,159,181,64,0,0,0,0,0,207,194,64,0,0,0,0,0,159,181,64,0,0,0,0,128,206,194,64,0,0,0,0,0,152,181,64,0,0,0,0,0,40,195,64,0,0,0,0,0,168,181,64,0,0,0,0,0,53,195,64,0,0,0,0,0,179,181,64,0,0,0,0,128,44,195,64,0,0,0,0,0,220,181,64,0,0,0,0,128,248,194,64,0,0,0,0,0,224,181,64,0,0,0,0,0,246,194,64,0,0,0,0,0,231,181,64,0,0,0,0,0,245,194,64,0,0,0,0,0,237,181,64,0,0,0,0,0,247,194,64,0,0,0,0,0,239,181,64,0,0,0,0,0,250,194,64,0,0,0,0,0,247,181,64,0,0,0,0,0,91,195,64,0,0,0,0,0,155,182,64,0,0,0,0,128,159,195,64,0,0,0,0,0,144,182,64,0,0,0,0,128,168,194,64,0,0,0,0,0,203,182,64,0,0,0,0,0,132,194,64,0,0,0,0,0,223,182,64,0,0,0,0,128,119,194,64,0,0,0,0,0,249,182,64,0,0,0,0,128,125,194,64,0,0,0,0,0,14,183,64,0,0,0,0,0,130,194,64,0,0,0,0,0,39,183,64,0,0,0,0,128,149,194,64,0,0,0,0,0,86,183,64,0,0,0,0,128,185,194,64,0,0,0,0,0,151,183,64,0,0,0,0,128,20,195,64,0,0,0,0,0,151,183,64,0,0,0,0,0,21,195,64,0,0,0,0,0,222,183,64,0,0,0,0,0,167,195,64,0,0,0,0,0,10,184,64,0,0,0,0,128,88,195,64,0,0,0,0,0,3,184,64,0,0,0,0,128,42,195,64,0,0,0,0,0,4,184,64,0,0,0,0,128,40,195,64,0,0,0,0,0,6,184,64,0,0,0,0,0,39,195,64,0,0,0,0,0,81,184,64,0,0,0,0,0,253,194,64,0,0,0,0,0,129,184,64,0,0,0,0,128,237,194,64,0,0,0,0,0,184,184,64,0,0,0,0,0,219,194,64,0,0,0,0,0,208,184,64,0,0,0,0,128,232,194,64,0,0,0,0,0,247,184,64,0,0,0,0,0,251,194,64,0,0,0,0,0,198,184,64,0,0,0,0,0,95,195,64,0,0,0,0,0,69,185,64,0,0,0,0,128,1,195,64,0,0,0,0,0,123,185,64,0,0,0,0,0,236,194,64,0,0,0,0,0,141,185,64,0,0,0,0,0,229,194,64,0,0,0,0,0,153,185,64,0,0,0,0,0,229,194,64,0,0,0,0,0,169,185,64,0,0,0,0,128,227,194,64,0,0,0,0,0,176,185,64,0,0,0,0,0,237,194,64,0,0,0,0,0,184,185,64,0,0,0,0,0,248,194,64,0,0,0,0,0,167,185,64,0,0,0,0,128,27,195,64,0,0,0,0,0,166,185,64,0,0,0,0,128,28,195,64,0,0,0,0,0,37,185,64,0,0,0,0,0,164,195,64,0,0,0,0,0,42,185,64,0,0,0,0,128,217,195,64,0,0,0,0,0,109,186,64,0,0,0,0,128,138,194,64,0,0,0,0,0,133,186,64,0,0,0,0,0,123,194,64,0,0,0,0,0,138,186,64,0,0,0,0,128,121,194,64,0,0,0,0,0,145,186,64,0,0,0,0,128,121,194,64,0,0,0,0,0,150,186,64,0,0,0,0,128,123,194,64,0,0,0,0,0,151,186,64,0,0,0,0,128,126,194,64,0,0,0,0,0,131,186,64,0,0,0,0,0,78,195,64,0,0,0,0,0,171,186,64,0,0,0,0,0,94,195,64,0,0,0,0,0,176,186,64,0,0,0,0,0,95,195,64,0,0,0,0,0,184,186,64,0,0,0,0,128,90,195,64,0,0,0,0,0,198,186,64,0,0,0,0,128,82,195,64,0,0,0,0,0,216,186,64,0,0,0,0,0,63,195,64,0,0,0,0,0,254,186,64,0,0,0,0,0,22,195,64,0,0,0,0,0,52,187,64,0,0,0,0,128,188,194,64,0,0,0,0,0,55,187,64,0,0,0,0,0,186,194,64,0,0,0,0,0,61,187,64,0,0,0,0,0,185,194,64,0,0,0,0,0,66,187,64,0,0,0,0,0,186,194,64,0,0,0,0,0,70,187,64,0,0,0,0,0,188,194,64,0,0,0,0,0,160,187,64,0,0,0,0,128,28,195,64,0,0,0,0,0,143,187,64,0,0,0,0,128,77,195,64,0,0,0,0,0,7,188,64,0,0,0,0,0,14,195,64,0,0,0,0,0,252,187,64,0,0,0,0,128,243,194,64,0,0,0,0,0,253,187,64,0,0,0,0,128,239,194,64,0,0,0,0,0,21,188,64,0,0,0,0,128,217,194,64,0,0,0,0,0,43,188,64,0,0,0,0,128,210,194,64,0,0,0,0,0,70,188,64,0,0,0,0,128,201,194,64,0,0,0,0,0,94,188,64,0,0,0,0,128,210,194,64,0,0,0,0,0,134,188,64,0,0,0,0,128,224,194,64,0,0,0,0,0,163,188,64,0,0,0,0,0,39,195,64,0,0,0,0,0,181,188,64,0,0,0,0,0,85,195,64,0,0,0,0,0,197,188,64,0,0,0,0,0,100,195,64,0,0,0,0,0,205,188,64,0,0,0,0,128,105,195,64,0,0,0,0,0,212,188,64,0,0,0,0,0,100,195,64,0,0,0,0,0,217,188,64,0,0,0,0,128,97,195,64,0,0,0,0,0,223,188,64,0,0,0,0,0,97,195,64,0,0,0,0,0,228,188,64,0,0,0,0,128,98,195,64,0,0,0,0,0,231,188,64,0,0,0,0,128,101,195,64,0,0,0,0,0,14,189,64,0,0,0,0,128,216,195,64,0,0,0,0,0,34,189,64,0,0,0,0,128,220,195,64,0,0,0,0,0,48,189,64,0,0,0,0,128,222,195,64,0,0,0,0,0,59,189,64,0,0,0,0,0,114,195,64,0,0,0,0,0,59,189,64,0,0,0,0,128,113,195,64,0,0,0,0,0,91,189,64,0,0,0,0,128,235,194,64,0,0,0,0,0,205,188,64,0,0,0,0,0,121,194,64,0,0,0,0,0,204,188,64,0,0,0,0,0,117,194,64,0,0,0,0,0,215,188,64,0,0,0,0,128,92,194,64,0,0,0,0,0,183,188,64,0,0,0,0,128,63,194,64,0,0,0,0,0,181,188,64,0,0,0,0,0,62,194,64,0,0,0,0,0,180,188,64,0,0,0,0,128,60,194,64,0,0,0,0,0,165,188,64,0,0,0,0,128,48,194,64,0,0,0,0,0,164,188,64,0,0,0,0,0,45,194,64,0,0,0,0,0,168,188,64,0,0,0,0,0,42,194,64,0,0,0,0,0,176,188,64,0,0,0,0,128,41,194,64,0,0,0,0,0,182,188,64,0,0,0,0,128,43,194,64,0,0,0,0,0,196,188,64,0,0,0,0,128,55,194,64,0,0,0,0,0,198,188,64,0,0,0,0,128,56,194,64,0,0,0,0,0,4,189,64,0,0,0,0,0,104,194,64,0,0,0,0,0,42,189,64,0,0,0,0,0,123,194,64,0,0,0,0,0,70,189,64,0,0,0,0,128,133,194,64,0,0,0,0,0,79,189,64,0,0,0,0,0,132,194,64,0,0,0,0,0,104,189,64,0,0,0,0,128,111,194,64,0,0,0,0,0,36,189,64,0,0,0,0,128,231,193,64,0,0,0,0,0,36,189,64,0,0,0,0,128,228,193,64,0,0,0,0,0,40,189,64,0,0,0,0,0,226,193,64,0,0,0,0,0,42,189,64,0,0,0,0,0,225,193,64,0,0,0,0,0,45,189,64,0,0,0,0,0,225,193,64,0,0,0,0,0,51,189,64,0,0,0,0,0,226,193,64,0,0,0,0,0,216,189,64,0,0,0,0,0,29,194,64,0,0,0,0,0,14,190,64,0,0,0,0,0,44,194,64,0,0,0,0,0,146,189,64,0,0,0,0,0,193,193,64,0,0,0,0,0,124,189,64,0,0,0,0,128,149,193,64,0,0,0,0,0,109,189,64,0,0,0,0,0,122,193,64,0,0,0,0,0,132,189,64,0,0,0,0,128,115,193,64,0,0,0,0,0,145,189,64,0,0,0,0,0,110,193,64,0,0,0,0,0,177,189,64,0,0,0,0,128,115,193,64,0,0,0,0,0,161,189,64,0,0,0,0,128,97,193,64,0,0,0,0,0,164,189,64,0,0,0,0,128,87,193,64,0,0,0,0,0,167,189,64,0,0,0,0,128,70,193,64,0,0,0,0,0,210,189,64,0,0,0,0,0,73,193,64,0,0,0,0,0,5,190,64,0,0,0,0,0,76,193,64,0,0,0,0,0,130,190,64,0,0,0,0,128,114,193,64,0,0,0,0,0,26,190,64,0,0,0,0,0,59,193,64,0,0,0,0,0,36,190,64,0,0,0,0,0,45,193,64,0,0,0,0,0,38,190,64,0,0,0,0,0,37,193,64,0,0,0,0,0,60,190,64,0,0,0,0,0,37,193,64,0,0,0,0,0,99,190,64,0,0,0,0,128,41,193,64,0,0,0,0,0,145,190,64,0,0,0,0,128,49,193,64,0,0,0,0,0,234,190,64,0,0,0,0,128,73,193,64,0,0,0,0,0,235,190,64,0,0,0,0,0,74,193,64,0,0,0,0,0,39,191,64,0,0,0,0,128,95,193,64,0,0,0,0,0,43,191,64,0,0,0,0,0,97,193,64,0,0,0,0,0,33,191,64,0,0,0,0,128,84,193,64,0,0,0,0,0,230,190,64,0,0,0,0,128,45,193,64,0,0,0,0,0,229,190,64,0,0,0,0,0,45,193,64,0,0,0,0,0,131,190,64,0,0,0,0,128,242,192,64,0,0,0,0,0,115,190,64,0,0,0,0,128,231,192,64,0,0,0,0,0,114,190,64,0,0,0,0,0,227,192,64,0,0,0,0,0,111,190,64,0,0,0,0,0,221,192,64,0,0,0,0,0,119,190,64,0,0,0,0,0,219,192,64,0,0,0,0,0,134,190,64,0,0,0,0,128,218,192,64,0,0,0,0,0,173,190,64,0,0,0,0,0,223,192,64,0,0,0,0,0,140,191,64,0,0,0,0,128,58,193,64,0,0,0,0,0,141,191,64,0,0,0,0,0,59,193,64,0,0,0,0,128,38,192,64,0,0,0,0,0,200,193,64,0,0,0,0,0,165,191,64,0,0,0,0,128,219,192,64,0,0,0,0,0,88,191,64,0,0,0,0,128,194,192,64,0,0,0,0,0,84,191,64,0,0,0,0,0,192,192,64,0,0,0,0,0,84,191,64,0,0,0,0,0,189,192,64,0,0,0,0,0,169,191,64,0,0,0,0,0,4,192,64,0,0,0,0,128,82,192,64,0,0,0,0,0,159,191,64,0,0,0,0,0,208,192,64,0,0,0,0,0,53,191,64,0,0,0,0,128,160,193,64,0,0,0,0,0,211,191,64])
.concat([0,0,0,0,0,162,193,64,0,0,0,0,0,213,191,64,0,0,0,0,128,163,193,64,0,0,0,0,0,217,191,64,0,0,0,0,128,195,193,64,0,0,0,0,128,61,192,64,0,0,0,0,0,220,193,64,0,0,0,0,0,60,192,64,0,0,0,0,0,245,193,64,0,0,0,0,0,56,192,64,0,0,0,0,0,10,194,64,0,0,0,0,0,194,191,64,0,0,0,0,128,10,194,64,0,0,0,0,0,190,191,64,0,0,0,0,0,11,194,64,0,0,0,0,0,188,191,64,0,0,0,0,128,12,194,64,0,0,0,0,0,187,191,64,0,0,0,0,0,79,194,64,0,0,0,0,0,120,191,64,0,0,0,0,0,142,194,64,0,0,0,0,0,231,191,64,0,0,0,0,128,199,194,64,0,0,0,0,0,38,192,64,0,0,0,0,0,254,194,64,0,0,0,0,0,167,192,64,0,0,0,0,128,32,195,64,0,0,0,0,128,45,192,64,0,0,0,0,0,26,195,64,0,0,0,0,128,19,192,64,0,0,0,0,0,26,195,64,0,0,0,0,0,16,192,64,0,0,0,0,0,28,195,64,0,0,0,0,128,13,192,64,0,0,0,0,128,31,195,64,0,0,0,0,0,13,192,64,0,0,0,0,128,79,195,64,0,0,0,0,0,19,192,64,0,0,0,0,128,85,195,64,0,0,0,0,128,18,192,64,0,0,0,0,128,85,195,64,0,0,0,0,0,18,192,64,0,0,0,0,128,86,195,64,0,0,0,0,0,15,192,64,0,0,0,0,128,87,195,64,0,0,0,0,128,13,192,64,0,0,0,0,0,89,195,64,0,0,0,0,128,13,192,64,0,0,0,0,0,92,195,64,0,0,0,0,128,13,192,64,0,0,0,0,128,220,195,64,0,0,0,0,0,56,192,64,0,0,0,0,0,232,195,64,0,0,0,0,0,50,192,64,0,0,0,0,0,235,195,64,0,0,0,0,0,49,192,64,0,0,0,0,0,237,195,64,0,0,0,0,0,49,192,64,0,0,0,0,0,238,195,64,0,0,0,0,128,50,192,64,0,0,0,0,0,15,196,64,0,0,0,0,128,83,192,64,0,0,0,0,128,32,196,64,0,0,0,0,128,91,192,64,0,0,0,0,128,42,196,64,0,0,0,0,0,93,192,64,0,0,0,0,128,45,196,64,0,0,0,0,128,85,192,64,0,0,0,0,0,47,196,64,0,0,0,0,0,83,192,64,0,0,0,0,0,49,196,64,0,0,0,0,128,81,192,64,0,0,0,0,0,52,196,64,0,0,0,0,128,81,192,64,0,0,0,0,0,96,196,64,0,0,0,0,128,94,192,64,0,0,0,0,128,113,196,64,0,0,0,0,0,93,192,64,0,0,0,0,0,121,196,64,0,0,0,0,128,90,192,64,0,0,0,0,128,118,196,64,0,0,0,0,128,81,192,64,0,0,0,0,128,118,196,64,0,0,0,0,128,77,192,64,0,0,0,0,128,120,196,64,0,0,0,0,128,74,192,64,0,0,0,0,128,124,196,64,0,0,0,0,128,74,192,64,0,0,0,0,128,127,196,64,0,0,0,0,128,76,192,64,0,0,0,0,128,127,196,64,0,0,0,0,0,77,192,64,0,0,0,0,128,128,196,64,0,0,0,0,128,78,192,64,0,0,0,0,128,195,196,64,0,0,0,0,0,198,192,64,0,0,0,0,128,213,196,64,0,0,0,0,0,247,192,64,0,0,0,0,128,233,196,64,0,0,0,0,128,129,192,64,0,0,0,0,128,235,196,64,0,0,0,0,0,126,192,64,0,0,0,0,128,239,196,64,0,0,0,0,0,125,192,64,0,0,0,0,128,242,196,64,0,0,0,0,0,127,192,64,0,0,0,0,0,0,197,64,0,0,0,0,0,146,192,64,0,0,0,0,128,12,197,64,0,0,0,0,0,83,192,64,0,0,0,0,128,6,197,64,0,0,0,0,0,73,192,64,0,0,0,0,128,5,197,64,0,0,0,0,128,69,192,64,0,0,0,0,0,7,197,64,0,0,0,0,128,66,192,64,0,0,0,0,128,8,197,64,0,0,0,0,0,65,192,64,0,0,0,0,128,10,197,64,0,0,0,0,0,65,192,64,0,0,0,0,128,20,197,64,0,0,0,0,0,64,192,64,0,0,0,0,128,41,197,64,0,0,0,0,0,74,192,64,0,0,0,0,0,41,197,64,0,0,0,0,0,74,192,64,0,0,0,0,0,79,197,64,0,0,0,0,128,91,192,64,0,0,0,0,128,116,197,64,0,0,0,0,128,121,192,64,0,0,0,0,0,233,197,64,0,0,0,0,0,212,192,64,0,0,0,0,128,7,198,64,0,0,0,0,0,89,193,64,0,0,0,0,128,23,198,64,0,0,0,0,128,157,193,64,0,0,0,0,0,76,198,64,0,0,0,0,0,25,193,64,0,0,0,0,0,62,198,64,0,0,0,0,0,244,192,64,0,0,0,0,0,62,198,64,0,0,0,0,128,240,192,64,0,0,0,0,0,64,198,64,0,0,0,0,0,238,192,64,0,0,0,0,128,67,198,64,0,0,0,0,0,237,192,64,0,0,0,0,0,108,198,64,0,0,0,0,128,243,192,64,0,0,0,0,128,121,198,64,0,0,0,0,128,14,193,64,0,0,0,0,128,154,198,64,0,0,0,0,128,61,192,64,0,0,0,0,128,110,198,64,0,0,0,0,0,5,192,64,0,0,0,0,128,109,198,64,0,0,0,0,0,2,192,64,0,0,0,0,0,111,198,64,0,0,0,0,0,254,191,64,0,0,0,0,128,113,198,64,0,0,0,0,0,250,191,64,0,0,0,0,0,149,198,64,0,0,0,0,0,237,191,64,0,0,0,0,128,165,198,64,0,0,0,0,128,10,192,64,0,0,0,0,128,165,198,64,0,0,0,0,0,172,191,64,0,0,0,0,128,166,198,64,0,0,0,0,0,167,191,64,0,0,0,0,128,168,198,64,0,0,0,0,0,163,191,64,0,0,0,0,0,171,198,64,0,0,0,0,0,162,191,64,0,0,0,0,0,206,198,64,0,0,0,0,0,170,191,64,0,0,0,0,128,223,198,64,0,0,0,0,0,162,191,64,0,0,0,0,0,237,198,64,0,0,0,0,0,156,191,64,0,0,0,0,128,237,198,64,0,0,0,0,0,140,191,64,0,0,0,0,0,238,198,64,0,0,0,0,0,136,191,64,0,0,0,0,128,239,198,64,0,0,0,0,0,133,191,64,0,0,0,0,128,7,199,64,0,0,0,0,0,89,191,64,0,0,0,0,0,25,199,64,0,0,0,0,0,94,191,64,0,0,0,0,0,36,199,64,0,0,0,0,0,101,191,64,0,0,0,0,0,240,198,64,0,0,0,0,0,51,190,64,0,0,0,0,0,255,198,64,0,0,0,0,0,233,189,64,0,0,0,0,128,3,199,64,0,0,0,0,0,207,189,64,0,0,0,0,0,15,199,64,0,0,0,0,0,203,189,64,0,0,0,0,0,25,199,64,0,0,0,0,0,199,189,64,0,0,0,0,0,40,199,64,0,0,0,0,0,215,189,64,0,0,0,0,0,67,199,64,0,0,0,0,0,243,189,64,0,0,0,0,0,114,199,64,0,0,0,0,0,85,190,64,0,0,0,0,0,115,199,64,0,0,0,0,0,87,190,64,0,0,0,0,0,132,199,64,0,0,0,0,0,139,190,64,0,0,0,0,0,143,199,64,0,0,0,0,0,155,190,64,0,0,0,0,0,149,199,64,0,0,0,0,0,161,190,64,0,0,0,0,0,151,199,64,0,0,0,0,0,156,190,64,0,0,0,0,0,159,199,64,0,0,0,0,0,117,190,64,0,0,0,0,128,141,199,64,0,0,0,0,0,190,189,64,0,0,0,0,128,129,199,64,0,0,0,0,0,65,189,64,0,0,0,0,128,96,199,64,0,0,0,0,0,101,188,64,0,0,0,0,0,89,199,64,0,0,0,0,0,54,188,64,0,0,0,0,0,93,199,64,0,0,0,0,0,39,188,64,0,0,0,0,0,96,199,64,0,0,0,0,0,23,188,64,0,0,0,0,128,114,199,64,0,0,0,0,0,19,188,64,0,0,0,0,0,120,199,64,0,0,0,0,0,215,187,64,0,0,0,0,128,103,199,64,0,0,0,0,0,188,187,64,0,0,0,0,0,96,199,64,0,0,0,0,0,175,187,64,0,0,0,0,0,94,199,64,0,0,0,0,0,166,187,64,0,0,0,0,128,93,199,64,0,0,0,0,0,159,187,64,0,0,0,0,0,96,199,64,0,0,0,0,0,156,187,64,0,0,0,0,0,97,199,64,0,0,0,0,0,154,187,64,0,0,0,0,128,99,199,64,0,0,0,0,0,154,187,64,0,0,0,0,0,103,199,64,0,0,0,0,0,153,187,64,0,0,0,0,0,121,199,64,0,0,0,0,0,171,187,64,0,0,0,0,0,122,199,64,0,0,0,0,0,173,187,64,0,0,0,0,128,129,199,64,0,0,0,0,0,185,187,64,0,0,0,0,128,132,199,64,0,0,0,0,0,181,187,64,0,0,0,0,0,137,199,64,0,0,0,0,0,169,187,64,0,0,0,0,128,136,199,64,0,0,0,0,0,130,187,64,0,0,0,0,128,135,199,64,0,0,0,0,0,41,187,64,0,0,0,0,0,110,199,64,0,0,0,0,0,79,186,64,0,0,0,0,0,110,199,64,0,0,0,0,0,72,186,64,0,0,0,0,128,112,199,64,0,0,0,0,0,67,186,64,0,0,0,0,0,116,199,64,0,0,0,0,0,67,186,64,0,0,0,0,0,127,199,64,0,0,0,0,0,72,186,64,0,0,0,0,128,130,199,64,0,0,0,0,0,51,186,64,0,0,0,0,0,134,199,64,0,0,0,0,0,22,186,64,0,0,0,0,128,127,199,64,0,0,0,0,0,212,185,64,0,0,0,0,128,113,199,64,0,0,0,0,0,75,185,64,0,0,0,0,0,54,199,64,0,0,0,0,0,40,184,64,0,0,0,0,0,54,199,64,0,0,0,0,0,34,184,64,0,0,0,0,128,55,199,64,0,0,0,0,0,29,184,64,0,0,0,0,0,80,199,64,0,0,0,0,0,240,183,64,0,0,0,0,0,42,199,64,0,0,0,0,0,81,183,64,0,0,0,0,128,41,199,64,0,0,0,0,0,74,183,64,0,0,0,0,0,43,199,64,0,0,0,0,0,69,183,64,0,0,0,0,0,44,199,64,0,0,0,0,0,66,183,64,0,0,0,0,0,46,199,64,0,0,0,0,0,66,183,64,0,0,0,0,0,49,199,64,0,0,0,0,0,67,183,64,0,0,0,0,128,120,199,64,0,0,0,0,0,146,183,64,0,0,0,0,128,148,199,64,0,0,0,0,0,127,183,64,0,0,0,0,0,142,199,64,0,0,0,0,0,95,183,64,0,0,0,0,128,114,199,64,0,0,0,0,0,26,183,64,0,0,0,0,0,114,199,64,0,0,0,0,0,24,183,64,0,0,0,0,128,5,199,64,0,0,0,0,0,241,180,64,0,0,0,0,128,2,199,64,0,0,0,0,0,77,180,64,0,0,0,0,128,1,199,64,0,0,0,0,0,31,180,64,0,0,0,0,128,8,199,64,0,0,0,0,0,13,180,64,0,0,0,0,0,16,199,64,0,0,0,0,0,245,179,64,0,0,0,0,0,32,199,64,0,0,0,0,0,255,179,64,0,0,0,0,0,58,199,64,0,0,0,0,0,12,180,64,0,0,0,0,128,110,199,64,0,0,0,0,0,125,180,64,0,0,0,0,128,110,199,64,0,0,0,0,0,126,180,64,0,0,0,0,0,139,199,64,0,0,0,0,0,192,180,64,0,0,0,0,0,157,199,64,0,0,0,0,0,214,180,64,0,0,0,0,0,170,199,64,0,0,0,0,0,223,180,64,0,0,0,0,0,173,199,64,0,0,0,0,0,223,180,64,0,0,0,0,0,175,199,64,0,0,0,0,0,216,180,64,0,0,0,0,128,187,199,64,0,0,0,0,0,171,180,64,0,0,0,0,128,156,199,64,0,0,0,0,0,206,179,64,0,0,0,0,128,77,199,64,0,0,0,0,0,139,177,64,0,0,0,0,0,80,199,64,0,0,0,0,0,141,177,64,0,0,0,0,0,82,199,64,0,0,0,0,0,145,177,64,0,0,0,0,128,82,199,64,0,0,0,0,0,151,177,64,0,0,0,0,128,75,199,64,0,0,0,0,0,236,177,64,0,0,0,0,0,166,199,64,0,0,0,0,0,200,179,64,0,0,0,0,0,166,199,64,0,0,0,0,0,201,179,64,0,0,0,0,128,198,199,64,0,0,0,0,0,179,180,64,0,0,0,0,0,184,199,64,0,0,0,0,0,227,180,64,0,0,0,0,0,179,199,64,0,0,0,0,0,243,180,64,0,0,0,0,0,170,199,64,0,0,0,0,0,243,180,64,0,0,0,0,128,162,199,64,0,0,0,0,0,244,180,64,0,0,0,0,0,152,199,64,0,0,0,0,0,231,180,64,0,0,0,0,0,133,199,64,0,0,0,0,0,208,180,64,0,0,0,0,0,103,199,64,0,0,0,0,0,139,180,64,0,0,0,0,0,53,199,64,0,0,0,0,0,32,180,64,0,0,0,0,128,29,199,64,0,0,0,0,0,18,180,64,0,0,0,0,0,21,199,64,0,0,0,0,0,13,180,64,0,0,0,0,0,17,199,64,0,0,0,0,0,24,180,64,0,0,0,0,0,12,199,64,0,0,0,0,0,39,180,64,0,0,0,0,128,12,199,64,0,0,0,0,0,76,180,64,0,0,0,0,128,15,199,64,0,0,0,0,0,239,180,64,0,0,0,0,0,123,199,64,0,0,0,0,0,16,183,64,0,0,0,0,128,155,199,64,0,0,0,0,0,97,183,64,0,0,0,0,128,159,199,64,0,0,0,0,0,130,183,64,0,0,0,0,0,159,199,64,0,0,0,0,0,136,183,64,0,0,0,0,0,157,199,64,0,0,0,0,0,141,183,64,0,0,0,0,0,130,199,64,0,0,0,0,0,174,183,64,0,0,0,0,128,57,199,64,0,0,0,0,0,99,183,64,0,0,0,0,0,89,199,64,0,0,0,0,0,245,183,64,0,0,0,0,128,64,199,64,0,0,0,0,0,39,184,64,0,0,0,0,128,123,199,64,0,0,0,0,0,71,185,64,0,0,0,0,128,137,199,64,0,0,0,0,0,208,185,64,0,0,0,0,0,145,199,64,0,0,0,0,0,24,186,64,0,0,0,0,0,140,199,64,0,0,0,0,0,57,186,64,0,0,0,0,0,135,199,64,0,0,0,0,0,88,186,64,0,0,0,0,0,121,199,64,0,0,0,0,0,88,186,64,0,0,0,0,128,145,199,64,0,0,0,0,0,42,187,64,0,0,0,0,128,146,199,64,0,0,0,0,0,130,187,64,0,0,0,0,0,147,199,64,0,0,0,0,0,181,187,64,0,0,0,0,0,140,199,64,0,0,0,0,0,195,187,64,0,0,0,0,128,119,199,64,0,0,0,0,0,194,187,64,0,0,0,0,0,130,199,64,0,0,0,0,0,228,187,64,0,0,0,0,128,123,199,64,0,0,0,0,0,30,188,64,0,0,0,0,0,122,199,64,0,0,0,0,0,36,188,64,0,0,0,0,0,119,199,64,0,0,0,0,0,38,188,64,0,0,0,0,0,105,199,64,0,0,0,0,0,40,188,64,0,0,0,0,0,102,199,64,0,0,0,0,0,48,188,64,0,0,0,0,0,102,199,64,0,0,0,0,0,47,188,64,0,0,0,0,0,100,199,64,0,0,0,0,0,58,188,64,0,0,0,0,0,106,199,64,0,0,0,0,0,95,188,64,0,0,0,0,128,139,199,64,0,0,0,0,0,61,189,64,0,0,0,0,128,151,199,64,0,0,0,0,0,186,189,64,0,0,0,0,0,170,199,64,0,0,0,0,0,123,190,64,0,0,0,0,0,160,199,64,0,0,0,0,0,164,190,64,0,0,0,0,128,156,199,64,0,0,0,0,0,180,190,64,0,0,0,0,0,150,199,64,0,0,0,0,0,181,190,64,0,0,0,0,128,144,199,64,0,0,0,0,0,182,190,64,0,0,0,0,0,137,199,64,0,0,0,0,0,171,190,64,0,0,0,0,0,125,199,64,0,0,0,0,0,153,190,64,0,0,0,0,128,106,199,64,0,0,0,0,0,98,190,64,0,0,0,0,128,61,199,64,0,0,0,0,0,4,190,64,0,0,0,0,128,35,199,64,0,0,0,0,0,233,189,64,0,0,0,0,0,24,199,64,0,0,0,0,0,221,189,64,0,0,0,0,0,17,199,64,0,0,0,0,0,223,189,64,0,0,0,0,0,11,199,64,0,0,0,0,0,225,189,64,0,0,0,0,128,8,199,64,0,0,0,0,0,240,189,64,0,0,0,0,0,250,198,64,0,0,0,0,0,62,190,64,0,0,0,0,128,55,199,64,0,0,0,0,0,153,191,64,0,0,0,0,0,55,199,64,0,0,0,0,0,160,191,64,0,0,0,0,128,52,199,64,0,0,0,0,0,166,191,64,0,0,0,0,128,48,199,64,0,0,0,0,0,165,191,64,0,0,0,0,0,46,199,64,0,0,0,0,0,160,191,64,0,0,0,0,128,45,199,64,0,0,0,0,0,156,191,64,0,0,0,0,128,36,199,64,0,0,0,0,0,118,191,64,0,0,0,0,0,24,199,64,0,0,0,0,0,114,191,64,0,0,0,0,128,10,199,64,0,0,0,0,0,112,191,64,0,0,0,0,128,247,198,64,0,0,0,0,0,145,191,64,0,0,0,0,128,246,198,64,0,0,0,0,0,173,191,64,0,0,0,0,128,225,198,64,0,0,0,0,0,182,191,64,0,0,0,0,128,208,198,64,0,0,0,0,0,190,191,64,0,0,0,0,128,175,198,64,0,0,0,0,0,183,191,64,0,0,0,0,128,175,198,64,0,0,0,0,0,30,192,64,0,0,0,0,128,174,198,64,0,0,0,0,128,33,192,64,0,0,0,0,128,171,198,64,0,0,0,0,0,35,192,64,0,0,0,0,0,168,198,64,0,0,0,0,128,34,192,64,0,0,0,0,0,166,198,64,0,0,0,0,128,31,192,64,0,0,0,0,0,156,198,64,0,0,0,0,0,3,192,64,0,0,0,0,128,123,198,64,0,0,0,0,0,6,192,64,0,0,0,0,0,166,198,64,0,0,0,0,0,72,192,64,0,0,0,0,128,127,198,64,0,0,0,0,0,39,193,64,0,0,0,0,0,126,198,64,0,0,0,0,0,42,193,64,0,0,0,0,128,122,198,64,0,0,0,0,0,43,193,64,0,0,0,0,0,119,198,64,0,0,0,0,128,41,193,64,0,0,0,0,128,117,198,64,0,0,0,0,128,38,193,64,0,0,0,0,0,114,198,64,0,0,0,0,0,2,193,64,0,0,0,0,0,74,198,64,0,0,0,0,128,248,192,64,0,0,0,0,0,83,198,64,0,0,0,0,0,39,193,64,0,0,0,0,128,27,198,64,0,0,0,0,0,176,193,64,0,0,0,0,128,25,198,64,0,0,0,0,128,178,193,64,0,0,0,0,0,22,198,64,0,0,0,0,0,179,193,64,0,0,0,0,128,19,198,64,0,0,0,0,0,178,193,64,0,0,0,0,0,18,198,64,0,0,0,0,128,175,193,64,0,0,0,0,0,254,197,64,0,0,0,0,128,91,193,64,0,0,0,0,0,254,197,64,0,0,0,0,0,91,193,64,0,0,0,0,0,224,197,64,0,0,0,0,0,218,192,64,0,0,0,0,128,110,197,64,0,0,0,0,128,129,192,64,0,0,0,0,0,74,197,64,0,0,0,0,128,100,192,64,0,0,0,0,0,37,197,64,0,0,0,0,0,83,192,64,0,0,0,0,128,17,197,64,0,0,0,0,0,76,192,64,0,0,0,0,128,20,197,64,0,0,0,0,0,97,192,64,0,0,0,0,128,7,197,64,0,0,0,0,0,159,192,64,0,0,0,0,128,5,197,64,0,0,0,0,128,162,192,64,0,0,0,0,128,1,197,64,0,0,0,0,0,163,192,64,0,0,0,0,128,254,196,64,0,0,0,0,0,161,192,64,0,0,0,0,128,241,196,64,0,0,0,0,0,143,192,64,0,0,0,0,128,219,196,64,0,0,0,0,0,15,193,64,0,0,0,0,0,218,196,64,0,0,0,0,0,18,193,64,0,0,0,0,128,214,196,64,0,0,0,0,0,19,193,64,0,0,0,0,0,211,196,64,0,0,0,0,0,18,193,64,0,0,0,0,128,209,196,64,0,0,0,0,128,14,193,64,0,0,0,0,128,205,196,64,0,0,0,0,0,237,192,64,0,0,0,0,0,128,196,64,0,0,0,0,0,98,192,64,0,0,0,0,0,124,196,64,0,0,0,0,0,102,192,64,0,0,0,0,128,114,196,64,0,0,0,0,0,103,192,64,0,0,0,0,128,96,196,64,0,0,0,0,0,105,192,64,0,0,0,0,128,54,196,64,0,0,0,0,128,92,192,64,0,0,0,0,0,47,196,64,0,0,0,0,0,102,192,64,0,0,0,0,128,28,196,64,0,0,0,0,128,100,192,64,0,0,0,0,128,10,196,64,0,0,0,0,128,92,192,64,0,0,0,0,128,233,195,64,0,0,0,0,0,60,192,64,0,0,0,0,0,211,195,64,0,0,0,0,0,63,192,64,0,0,0,0,0,95,195,64,0,0,0,0,0,25,192,64,0,0,0,0,128,92,195,64,0,0,0,0,0,27,192,64,0,0,0,0,128,79,195,64,0,0,0,0,0,29,192,64,0,0,0,0,128,36,195,64,0,0,0,0,128,24,192,64,0,0,0,0,128,39,195,64,0,0,0,0,0,60,192,64,0,0,0,0,128,3,195,64,0,0,0,0,128,183,192,64,0,0,0,0,128,1,195,64,0,0,0,0,0,186,192,64,0,0,0,0,0,255,194,64,0,0,0,0,0,187,192,64,0,0,0,0,0,252,194,64,0,0,0,0,128,186,192,64,0,0,0,0,0,250,194,64,0,0,0,0,0,184,192,64,0,0,0,0,128,194,194,64,0,0,0,0,128,47,192,64,0,0,0,0,128,135,194,64,0,0,0,0,0,246,191,64,0,0,0,0,0,79,194,64,0,0,0,0,0,146,191,64,0,0,0,0,0,19,194,64,0,0,0,0,0,203,191,64,0,0,0,0,0,252,193,64,0,0,0,0,0,68,192,64,0,0,0,0,0,221,193,64,0,0,0,0,0,70,192,64,0,0,0,0,0,190,193,64,0,0,0,0,128,74,192,64,0,0,0,0,0,155,193,64,0,0,0,0,0,228,191,64,0,0,0,0,128,208,192,64,0,0,0,0,0,76,191,64,0,0,0,0,128,86,192,64,0,0,0,0,0,177,191,64,0,0,0,0,0,188,191,64,0,0,0,0,128,11,192,64,0,0,0,0,0,104,191,64,0,0,0,0,0,188,192,64,0,0,0,0,0,195,191,64,0,0,0,0,128,222,192,64,0,0,0,0,128,66,192,64,0,0,0,0,128,249,193,64,0,0,0,0,128,66,192,64,0,0,0,0,128,250,193,64,0,0,0,0,128,67,192,64,0,0,0,0,128,252,193,64,0,0,0,0,0,67,192,64,0,0,0,0,128,0,194,64,0,0,0,0,0,64,192,64,0,0,0,0,0,3,194,64,0,0,0,0,128,60,192,64,0,0,0,0,128,2,194,64,0,0,0,0,0,58,192,64,0,0,0,0,128,255,193,64,0,0,0,0,0,57,192,64,0,0,0,0,0,253,193,64,0,0,0,0,0,44,192,64,0,0,0,0,128,219,193,64,0,0,0,0,0,126,191,64,0,0,0,0,128,65,193,64,0,0,0,0,0,125,191,64,0,0,0,0,0,65,193,64,0,0,0,0,0,187,190,64,0,0,0,0,0,242,192,64,0,0,0,0,0,138,190,64,0,0,0,0,0,230,192,64,0,0,0,0,0,147,190,64,0,0,0,0,128,236,192,64,0,0,0,0,0,245,190,64,0,0,0,0,0,39,193,64,0,0,0,0,0,69,191,64,0,0,0,0,128,91,193,64,0,0,0,0,0,65,191,64,0,0,0,0,128,101,193,64,0,0,0,0,0,64,191,64,0,0,0,0,0,109,193,64,0,0,0,0,0,48,191,64,0,0,0,0,0,108,193,64,0,0,0,0,0,41,191,64,0,0,0,0,128,107,193,64,0,0,0,0,0,29,191,64,0,0,0,0,0,104,193,64,0,0,0,0,0,223,190,64,0,0,0,0,0,82,193,64,0,0,0,0,0,224,190,64,0,0,0,0,128,82,193,64,0,0,0,0,0,137,190,64,0,0,0,0,128,58,193,64,0,0,0,0,0,92,190,64,0,0,0,0,0,51,193,64,0,0,0,0,0,60,190,64,0,0,0,0,0,47,193,64,0,0,0,0,0,55,190,64,0,0,0,0,128,47,193,64,0,0,0,0,0,50,190,64,0,0,0,0,128,61,193,64,0,0,0,0,0,203,190,64,0,0,0,0,0,138,193,64,0,0,0,0,0,204,190,64,0,0,0,0,128,138,193,64,0,0,0,0,0,207,190,64,0,0,0,0,0,142,193,64,0,0,0,0,0,205,190,64,0,0,0,0,128,145,193,64,0,0,0,0,0,199,190,64,0,0,0,0,0,147,193,64,0,0,0,0,0,192,190,64,0,0,0,0,128,146,193,64,0,0,0,0,0,15,190,64,0,0,0,0,0,87,193,64,0,0,0,0,0,208,189,64,0,0,0,0,0,83,193,64,0,0,0,0,0,187,189,64,0,0,0,0,128,81,193,64,0,0,0,0,0,184,189,64,0,0,0,0,128,88,193,64,0,0,0,0,0,182,189,64,0,0,0,0,128,99,193,64,0,0,0,0,0,206,189,64,0,0,0,0,0,124,193,64,0,0,0,0,0,207,189,64,0,0,0,0,0,127,193,64,0,0,0,0,0,204,189,64,0,0,0,0,128,129,193,64,0,0,0,0,0,199,189,64,0,0,0,0,0,131,193,64,0,0,0,0,0,192,189,64,0,0,0,0,128,130,193,64,0,0,0,0,0,155,189,64,0,0,0,0,128,120,193,64,0,0,0,0,0,143,189,64,0,0,0,0,128,123,193,64,0,0,0,0,0,133,189,64,0,0,0,0,0,128,193,64,0,0,0,0,0,143,189,64,0,0,0,0,0,147,193,64,0,0,0,0,0,167,189,64,0,0,0,0,128,192,193,64,0,0,0,0,0,46,190,64,0,0,0,0,128,51,194,64,0,0,0,0,0,47,190,64,0,0,0,0,0,55,194,64,0,0,0,0,0,44,190,64,0,0,0,0,0,58,194,64,0,0,0,0,0,37,190,64,0,0,0,0,0,59,194,64,0,0,0,0,0,13,190,64,0,0,0,0,128,59,194,64,0,0,0,0,0,61,189,64,0,0,0,0,0,242,193,64,0,0,0,0,0,125,189,64,0,0,0,0,128,116,194,64,0,0,0,0,0,96,189,64,0,0,0,0,128,137,194,64,0,0,0,0,0,85,189,64,0,0,0,0,0,146,194,64,0,0,0,0,0,64,189,64,0,0,0,0,0,143,194,64,0,0,0,0,0,49,189,64,0,0,0,0,128,140,194,64,0,0,0,0,0,28,189,64,0,0,0,0,0,130,194,64,0,0,0,0,0,3,189,64,0,0,0,0,0,118,194,64,0,0,0,0,0,225,188,64,0,0,0,0,128,94,194,64,0,0,0,0,0,224,188,64,0,0,0,0,0,117,194,64,0,0,0,0,0,111,189,64,0,0,0,0,128,233,194,64,0,0,0,0,0,79,189,64,0,0,0,0,128,114,195,64,0,0,0,0,0,66,189,64,0,0,0,0,0,234,195,64,0,0,0,0,0,29,189,64,0,0,0,0,0,230,195,64,0,0,0,0,0,254,188,64,0,0,0,0,128,227,195,64,0,0,0,0,0,215,188,64,0,0,0,0,0,114,195,64,0,0,0,0,0,205,188,64,0,0,0,0,0,115,195,64,0,0,0,0,0,191,188,64,0,0,0,0,0,116,195,64,0,0,0,0,0,179,188,64,0,0,0,0,0,105,195,64,0,0,0,0,0,161,188,64,0,0,0,0,0,89,195,64,0,0,0,0,0,143,188,64,0,0,0,0,0,41,195,64,0,0,0,0,0,116,188,64,0,0,0,0,128,231,194,64,0,0,0,0,0,82,188,64,0,0,0,0,128,218,194,64,0,0,0,0,0,55,188,64,0,0,0,0,0,219,194,64,0,0,0,0,0,36,188,64,0,0,0,0,0,225,194,64,0,0,0,0,0,16,188,64,0,0,0,0,0,243,194,64,0,0,0,0,0,29,188,64,0,0,0,0,0,21,195,64,0,0,0,0,0,126,187,64,0,0,0,0,0,101,195,64,0,0,0,0,0,124,187,64,0,0,0,0,128,101,195,64,0,0,0,0,0,118,187,64,0,0,0,0,0,103,195,64,0,0,0,0,0,111,187,64,0,0,0,0,0,102,195,64,0,0,0,0,0,107,187,64,0,0,0,0,0,99,195,64,0,0,0,0,0,109,187,64,0,0,0,0,128,95,195,64,0,0,0,0,0,158,187,64,0,0,0,0,0,55,195,64,0,0,0,0,0,63,187,64,0,0,0,0,0,204,194,64,0,0,0,0,0,14,187,64,0,0,0,0,0,29,195,64,0,0,0,0,0,234,186,64,0,0,0,0,0,67,195,64,0,0,0,0,0,214,186,64,0,0,0,0,128,88,195,64,0,0,0,0,0,199,186,64,0,0,0,0,0,97,195,64,0,0,0,0,0,176,186,64,0,0,0,0,128,109,195,64,0,0,0,0,0,159,186,64,0,0,0,0,0,102,195,64,0,0,0,0,0,113,186,64,0,0,0,0,128,86,195,64,0,0,0,0,0,129,186,64,0,0,0,0,0,147,194,64,0,0,0,0,0,62,186,64,0,0,0,0,0,210,194,64,0,0,0,0,0,46,185,64,0,0,0,0,128,236,195,64,0,0,0,0,0,41,185,64,0,0,0,0,0,239,195,64,0,0,0,0,0,33,185,64,0,0,0,0,128,238,195,64,0,0,0,0,0,28,185,64,0,0,0,0,128,235,195,64,0,0,0,0,0,249,184,64,0,0,0,0,128,186,195,64,0,0,0,0,0,148,185,64,0,0,0,0,0,24,195,64,0,0,0,0,0,162,185,64,0,0,0,0,128,249,194,64,0,0,0,0,0,157,185,64,0,0,0,0,0,240,194,64,0,0,0,0,0,154,185,64,0,0,0,0,128,238,194,64,0,0,0,0,0,147,185,64,0,0,0,0,0,239,194,64,0,0,0,0,0,135,185,64,0,0,0,0,0,244,194,64,0,0,0,0,0,76,185,64,0,0,0,0,0,12,195,64,0,0,0,0,0,182,184,64,0,0,0,0,0,125,195,64,0,0,0,0,0,176,184,64,0,0,0,0,0,127,195,64,0,0,0,0,0,169,184,64,0,0,0,0,128,126,195,64,0,0,0,0,0,164,184,64,0,0,0,0,0,124,195,64,0,0,0,0,0,164,184,64,0,0,0,0,0,121,195,64,0,0,0,0,0,229,184,64,0,0,0,0,128,2,195,64,0,0,0,0,0,194,184,64,0,0,0,0,128,239,194,64,0,0,0,0,0,178,184,64,0,0,0,0,0,233,194,64,0,0,0,0,0,140,184,64,0,0,0,0,0,246,194,64,0,0,0,0,0,94,184,64,0,0,0,0,128,4,195,64,0,0,0,0,0,24,184,64,0,0,0,0,0,44,195,64,0,0,0,0,0,30,184,64,0,0,0,0,0,96,195,64,0,0,0,0,0,231,183,64,0,0,0,0,128,187,195,64,0,0,0,0,0,227,183,64,0,0,0,0,0,190,195,64,0,0,0,0,0,221,183,64,0,0,0,0,0,191,195,64,0,0,0,0,0,215,183,64,0,0,0,0,0,190,195,64,0,0,0,0,0,212,183,64,0,0,0,0,128,187,195,64,0,0,0,0,0,132,183,64,0,0,0,0,128,23,195,64,0,0,0,0,0,132,183,64,0,0,0,0,0,24,195,64,0,0,0,0,0,68,183,64,0,0,0,0,128,190,194,64,0,0,0,0,0,22,183,64,0,0,0,0,0,155,194,64,0,0,0,0,0,1,183,64,0,0,0,0,128,138,194,64,0,0,0,0,0,240,182,64,0,0,0,0,128,134,194,64,0,0,0,0,0,228,182,64,0,0,0,0,0,132,194,64,0,0,0,0,0,219,182,64,0,0,0,0,0,138,194,64,0,0,0,0,0,163,182,64,0,0,0,0,128,174,194,64,0,0,0,0,0,175,182,64,0,0,0,0,0,170,195,64,0,0,0,0,0,173,182,64,0,0,0,0,128,173,195,64,0,0,0,0,0,166,182,64,0,0,0,0,0,175,195,64,0,0,0,0,0,159,182,64,0,0,0,0,0,174,195,64,0,0,0,0,0,249,181,64,0,0,0,0,0,109,195,64,0,0,0,0,0,223,181,64,0,0,0,0,0,18,195,64,0,0,0,0,0,197,181,64,0,0,0,0,128,49,195,64,0,0,0,0,0,179,181,64,0,0,0,0,128,61,195,64,0,0,0,0,0,154,181,64,0,0,0,0,128,60,195,64,0,0,0,0,0,131,181,64,0,0,0,0,0,49,195,64,0,0,0,0,0,139,181,64,0,0,0,0,0,206,194,64,0,0,0,0,0,140,181,64,0,0,0,0,0,205,194,64,0,0,0,0,0,169,181,64,0,0,0,0,0,140,194,64,0,0,0,0,0,172,181,64,0,0,0,0,128,110,194,64,0,0,0,0,0,168,181,64,0,0,0,0,128,91,194,64,0,0,0,0,0,163,181,64,0,0,0,0,128,90,194,64,0,0,0,0,0,115,181,64,0,0,0,0,128,101,194,64,0,0,0,0,0,215,180,64,0,0,0,0,0,252,194,64,0,0,0,0,0,214,180,64,0,0,0,0,128,252,194,64,0,0,0,0,0,167,180,64,0,0,0,0,128,55,195,64,0,0,0,0,0,145,180,64,0,0,0,0,0,57,195,64,0,0,0,0,0,133,180,64,0,0,0,0,0,59,195,64,0,0,0,0,0,127,180,64,0,0,0,0,0,52,195,64,0,0,0,0,0,123,180,64,0,0,0,0,128,48,195,64,0,0,0,0,0,122,180,64,0,0,0,0,0,41,195,64,0,0,0,0,0,119,180,64,0,0,0,0,0,28,195,64,0,0,0,0,0,123,180,64,0,0,0,0,128,1,195,64,0,0,0,0,0,124,180,64,0,0,0,0,0,1,195,64,0,0,0,0,0,161,180,64,0,0,0,0,128,184,194,64,0,0,0,0,0,136,180,64,0,0,0,0,128,169,194,64,0,0,0,0,0,111,180,64,0,0,0,0,128,157,194,64,0,0,0,0,0,20,180,64,0,0,0,0,0,198,194,64,0,0,0,0,0,14,180,64,0,0,0,0,0,199,194,64,0,0,0,0,0,7,180,64,0,0,0,0,0,198,194,64,0,0,0,0,0,4,180,64,0,0,0,0,0,195,194,64,0,0,0,0,0,4,180,64,0,0,0,0,0,192,194,64,0,0,0,0,0,35,180,64,0,0,0,0,128,160,194,64,0,0,0,0,0,40,180,64,0,0,0,0,128,147,194,64,0,0,0,0,0,41,180,64,0,0,0,0,128,142,194,64,0,0,0,0,0,37,180,64,0,0,0,0,0,144,194,64,0,0,0,0,0,250,179,64,0,0,0,0,0,153,194,64,0,0,0,0,0,101,179,64,0,0,0,0,128,233,194,64,0,0,0,0,0,95,179,64,0,0,0,0,0,235,194,64,0,0,0,0,0,90,179,64,0,0,0,0,0,235,194,64,0,0,0,0,0,85,179,64,0,0,0,0,0,233,194,64,0,0,0,0,0,83,179,64,0,0,0,0,0,230,194,64,0,0,0,0,0,83,179,64,0,0,0,0,0,62,194,64,0,0,0,0,0,85,179,64,0,0,0,0,128,59,194,64,0,0,0,0,0,142,179,64,0,0,0,0,0,8,194,64,0,0,0,0,0,161,179,64,0,0,0,0,128,236,193,64,0,0,0,0,0,171,179,64,0,0,0,0,128,216,193,64,0,0,0,0,0,168,179,64,0,0,0,0,0,212,193,64,0,0,0,0,0,133,179,64,0,0,0,0,0,207,193,64,0,0,0,0,0,204,178,64,0,0,0,0,0,38,194,64,0,0,0,0,0,197,178,64,0,0,0,0,0,39,194,64,0,0,0,0,0,190,178,64,0,0,0,0,128,37,194,64,0,0,0,0,0,187,178,64,0,0,0,0,0,34,194,64,0,0,0,0,0,191,178,64,0,0,0,0,0,103,193,64,0,0,0,0,0,173,178,64,0,0,0,0,0,63,193,64,0,0,0,0,0,171,178,64,0,0,0,0,0,58,193,64,0,0,0,0,0,169,178,64,0,0,0,0,0,61,193,64,0,0,0,0,0,155,178,64,0,0,0,0,0,78,193,64,0,0,0,0,0,135,178,64,0,0,0,0,0,131,193,64,0,0,0,0,0,131,178,64,0,0,0,0,0,134,193,64,0,0,0,0,0,125,178,64,0,0,0,0,0,135,193,64,0,0,0,0,0,118,178,64,0,0,0,0,128,133,193,64,0,0,0,0,0,115,178,64,0,0,0,0,128,130,193,64,0,0,0,0,0,107,178,64,0,0,0,0,128,14,193,64,0,0,0,0,0,108,178,64,0,0,0,0,128,12,193,64,0,0,0,0,0,125,178,64,0,0,0,0,0,229,192,64,0,0,0,0,0,122,178,64,0,0,0,0,0,219,192,64,0,0,0,0,0,99,178,64,0,0,0,0,128,218,192,64,0,0,0,0,0,21,178,64,0,0,0,0,128,9,193,64,0,0,0,0,0,15,178,64,0,0,0,0,0,11,193,64,0,0,0,0,0,9,178,64,0,0,0,0,128,10,193,64,0,0,0,0,0,4,178,64,0,0,0,0,128,8,193,64,0,0,0,0,0,3,178,64,0,0,0,0,0,5,193,64,0,0,0,0,0,75,178,64,0,0,0,0,0,76,192,64,0,0,0,0,0,235,179,64,0,0,0,0,0,198,191,64,0,0,0,0,0,223,179,64,0,0,0,0,0,196,191,64,0,0,0,0,0,127,179,64,0,0,0,0,0,206,191,64,0,0,0,0,0,120,179,64,0,0,0,0,0,205,191,64,0,0,0,0,0,35,179,64,0,0,0,0,0,152,191,64,0,0,0,0,0,137,178,64,0,0,0,0,0,221,191,64,0,0,0,0,0,131,178,64,0,0,0,0,0,222,191,64,0,0,0,0,0,125,178,64,0,0,0,0,0,218,191,64,0,0,0,0,0,123,178,64,0,0,0,0,0,211,191,64,0,0,0,0,0,126,178,64,0,0,0,0,0,205,191,64,0,0,0,0,0,23,179,64,0,0,0,0,0,58,191,64,0,0,0,0,0,85,179,64,0,0,0,0,0,237,190,64,0,0,0,0,0,122,179,64,0,0,0,0,0,181,190,64,0,0,0,0,0,123,179,64,0,0,0,0,0,171,190,64,0,0,0,0,0,121,179,64,0,0,0,0,0,170,190,64,0,0,0,0,0,61,179,64,0,0,0,0,0,160,190,64,0,0,0,0,0,147,177,64,0,0,0,0,0,173,191,64,0,0,0,0,0,141,177,64,0,0,0,0,0,174,191,64,0,0,0,0,0,135,177,64,0,0,0,0,0,172,191,64,0,0,0,0,0,132,177,64,0,0,0,0,0,167,191,64,0,0,0,0,0,132,177,64,0,0,0,0,0,161,191,64,0,0,0,0,0,196,177,64,0,0,0,0,0,241,190,64,0,0,0,0,0,196,177,64,0,0,0,0,0,239,190,64,0,0,0,0,0,220,176,64,0,0,0,0,0,196,191,64,0,0,0,0,0,214,176,64,0,0,0,0,0,198,191,64,0,0,0,0,0,208,176,64,0,0,0,0,0,197,191,64,0,0,0,0,0,204,176,64,0,0,0,0,0,191,191,64,0,0,0,0,0,204,176,64,0,0,0,0,0,185,191,64,0,0,0,0,0,148,177,64,0,0,0,0,0,177,189,64,0,0,0,0,0,150,177,64,0,0,0,0,0,174,189,64,0,0,0,0,0,253,177,64,0,0,0,0,0,41,189,64,0,0,0,0,0,7,178,64,0,0,0,0,0,23,189,64,0,0,0,0,0,209,177,64,0,0,0,0,0,44,189,64,0,0,0,0,0,220,176,64,0,0,0,0,0,252,189,64,0,0,0,0,0,214,176,64,0,0,0,0,0,254,189,64,0,0,0,0,0,208,176,64,0,0,0,0,0,253,189,64,0,0,0,0,0,204,176,64,0,0,0,0,0,248,189,64,0,0,0,0,0,204,176,64,0,0,0,0,0,242,189,64,0,0,0,0,0,36,177,64,0,0,0,0,0,122,188,64,0,0,0,0,0,37,177,64,0,0,0,0,0,119,188,64,0,0,0,0,0,124,177,64,0,0,0,0,0,221,187,64,0,0,0,0,0,122,177,64,0,0,0,0,0,189,187,64,0,0,0,0,0,110,177,64,0,0,0,0,0,193,187,64,0,0,0,0,0,86,177,64,0,0,0,0,0,207,187,64,0,0,0,0,0,39,177,64,0,0,0,0,0,251,187,64,0,0,0,0,0,37,177,64,0,0,0,0,0,252,187,64,0,0,0,0,0,12,177,64,0,0,0,0,0,19,188,64,0,0,0,0,0,5,177,64,0,0,0,0,0,22,188,64,0,0,0,0,0,254,176,64,0,0,0,0,0,19,188,64,0,0,0,0,0,251,176,64,0,0,0,0,0,12,188,64,0,0,0,0,0,254,176,64,0,0,0,0,0,5,188,64,0,0,0,0,0,24,177,64,0,0,0,0,0,238,187,64,0,0,0,0,0,24,177,64,0,0,0,0,0,237,187,64,0,0,0,0,0,69,177,64,0,0,0,0,0,164,187,64,0,0,0,0,0,75,177,64,0,0,0,0,0,164,186,64,0,0,0,0,0,76,177,64,0,0,0,0,0,162,186,64,0,0,0,0,0,136,177,64,0,0,0,0,0,168,185,64,0,0,0,0,0,58,176,64,0,0,0,0,0,148,184,64,0,0,0,0,0,142,175,64,0,0,0,0,0,131,184,64,0,0,0,0,0,92,174,64,0,0,0,0,0,90,184,64,0,0,0,0,0,246,172,64,0,0,0,0,0,46,184,64,0,0,0,0,0,248,172,64,0,0,0,0,0,46,184,64,0,0,0,0,0,46,172,64,0,0,0,0,0,30,184,64,0,0,0,0,0,136,171,64,0,0,0,0,0,113,183,64,0,0,0,0,0,70,171,64,0,0,0,0,0,48,183,64,0,0,0,0,0,86,171,64,0,0,0,0,0,159,182,64,0,0,0,0,0,248,169,64,0,0,0,0,0,150,181,64,0,0,0,0,0,134,170,64,0,0,0,0,0,157,180,64,0,0,0,0,0,42,170,64,0,0,0,0,0,74,180,64,0,0,0,0,0,4,170,64,0,0,0,0,0,98,179,64,0,0,0,0,0,6,170,64,0,0,0,0,0,93,179,64,0,0,0,0,0,14,170,64,0,0,0,0,0,89,179,64,0,0,0,0,0,24,170,64,0,0,0,0,0,87,179,64,0,0,0,0,128,77,199,64,0,0,0,0,0,139,177,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,146,197,64,0,0,0,0,0,176,122,64,0,0,0,0,128,237,197,64,0,0,0,0,0,128,111,64,0,0,0,0,128,46,198,64,0,0,0,0,0,160,117,64,0,0,0,0,128,171,198,64,0,0,0,0,0,204,144,64,0,0,0,0,0,47,197,64,0,0,0,0,0,148,156,64,0,0,0,0,128,45,197,64,0,0,0,0,0,168,156,64,0,0,0,0,0,46,197,64,0,0,0,0,0,192,156,64,0,0,0,0,128,47,197,64,0,0,0,0,0,208,156,64,0,0,0,0,128,127,197,64,0,0,0,0,0,176,158,64,0,0,0,0,128,129,197,64,0,0,0,0,0,184,158,64,0,0,0,0,0,84,198,64,0,0,0,0,0,40,160,64,0,0,0,0,0,20,199,64,0,0,0,0,0,32,166,64,0,0,0,0,128,200,198,64,0,0,0,0,0,166,165,64,0,0,0,0,128,197,198,64,0,0,0,0,0,166,165,64,0,0,0,0,128,195,198,64,0,0,0,0,0,166,165,64,0,0,0,0,128,194,198,64,0,0,0,0,0,172,165,64,0,0,0,0,128,193,198,64,0,0,0,0,0,184,165,64,0,0,0,0,128,194,198,64,0,0,0,0,0,196,165,64,0,0,0,0,0,72,199,64,0,0,0,0,0,216,168,64,0,0,0,0,0,110,199,64,0,0,0,0,0,52,170,64,0,0,0,0,0,128,199,64,0,0,0,0,0,216,170,64,0,0,0,0,0,124,199,64,0,0,0,0,0,20,171,64])
.concat([0,0,0,0,0,122,199,64,0,0,0,0,0,38,171,64,0,0,0,0,0,117,199,64,0,0,0,0,0,40,171,64,0,0,0,0,128,96,199,64,0,0,0,0,0,22,171,64,0,0,0,0,128,92,199,64,0,0,0,0,0,22,171,64,0,0,0,0,128,90,199,64,0,0,0,0,0,24,171,64,0,0,0,0,0,90,199,64,0,0,0,0,0,32,171,64,0,0,0,0,0,90,199,64,0,0,0,0,0,48,171,64,0,0,0,0,128,115,199,64,0,0,0,0,0,44,172,64,0,0,0,0,0,154,199,64,0,0,0,0,0,190,174,64,0,0,0,0,0,169,199,64,0,0,0,0,0,194,175,64,0,0,0,0,0,163,199,64,0,0,0,0,0,0,176,64,0,0,0,0,128,161,199,64,0,0,0,0,0,4,176,64,0,0,0,0,128,157,199,64,0,0,0,0,0,1,176,64,0,0,0,0,128,148,199,64,0,0,0,0,0,238,175,64,0,0,0,0,128,134,199,64,0,0,0,0,0,172,175,64,0,0,0,0,0,111,199,64,0,0,0,0,0,52,175,64,0,0,0,0,0,99,199,64,0,0,0,0,0,42,175,64,0,0,0,0,0,90,199,64,0,0,0,0,0,30,175,64,0,0,0,0,128,85,199,64,0,0,0,0,0,64,175,64,0,0,0,0,128,82,199,64,0,0,0,0,0,86,175,64,0,0,0,0,128,82,199,64,0,0,0,0,0,136,175,64,0,0,0,0,128,83,199,64,0,0,0,0,0,29,176,64,0,0,0,0,0,130,199,64,0,0,0,0,0,63,177,64,0,0,0,0,0,155,199,64,0,0,0,0,0,243,177,64,0,0,0,0,128,151,199,64,0,0,0,0,0,24,178,64,0,0,0,0,128,151,199,64,0,0,0,0,0,25,178,64,0,0,0,0,128,148,199,64,0,0,0,0,0,20,178,64,0,0,0,0,128,139,199,64,0,0,0,0,0,3,178,64,0,0,0,0,0,123,199,64,0,0,0,0,0,207,177,64,0,0,0,0,128,122,199,64,0,0,0,0,0,206,177,64,0,0,0,0,0,105,199,64,0,0,0,0,0,159,177,64,0,0,0,0,0,79,199,64,0,0,0,0,0,144,177,64,0,0,0,0,0,77,199,64,0,0,0,0,0,143,177,64,0,0,0,0,0,77,177,64,0,0,0,0,0,18,180,64,0,0,0,0,0,76,174,64,0,0,0,0,0,2,180,64,0,0,0,0,0,38,172,64,0,0,0,0,0,250,179,64,0,0,0,0,0,26,171,64,0,0,0,0,0,205,179,64,0,0,0,0,0,30,170,64,0,0,0,0,0,162,179,64,0,0,0,0,0,36,170,64,0,0,0,0,0,86,179,64,0,0,0,0,0,36,170,64,0,0,0,0,0,84,179,64,0,0,0,0,0,254,169,64,0,0,0,0,0,139,178,64,0,0,0,0,0,4,170,64,0,0,0,0,0,37,178,64,0,0,0,0,0,26,172,64,0,0,0,0,0,3,177,64,0,0,0,0,0,30,172,64,0,0,0,0,0,254,176,64,0,0,0,0,0,124,172,64,0,0,0,0,0,120,175,64,0,0,0,0,0,30,175,64,0,0,0,0,0,236,174,64,0,0,0,0,0,38,175,64,0,0,0,0,0,232,174,64,0,0,0,0,0,184,175,64,0,0,0,0,0,122,174,64,0,0,0,0,0,140,175,64,0,0,0,0,0,62,174,64,0,0,0,0,0,138,175,64,0,0,0,0,0,62,174,64,0,0,0,0,0,228,174,64,0,0,0,0,0,80,173,64,0,0,0,0,0,180,174,64,0,0,0,0,0,220,172,64,0,0,0,0,0,160,174,64,0,0,0,0,0,170,172,64,0,0,0,0,0,164,174,64,0,0,0,0,0,148,172,64,0,0,0,0,0,168,174,64,0,0,0,0,0,138,172,64,0,0,0,0,0,184,174,64,0,0,0,0,0,140,172,64,0,0,0,0,0,196,174,64,0,0,0,0,0,138,172,64,0,0,0,0,0,64,175,64,0,0,0,0,0,68,172,64,0,0,0,0,0,46,175,64,0,0,0,0,0,118,171,64,0,0,0,0,0,46,175,64,0,0,0,0,0,114,171,64,0,0,0,0,0,224,174,64,0,0,0,0,0,164,170,64,0,0,0,0,0,220,175,64,0,0,0,0,0,194,167,64,0,0,0,0,0,71,176,64,0,0,0,0,0,222,166,64,0,0,0,0,0,55,176,64,0,0,0,0,0,104,166,64,0,0,0,0,0,64,176,64,0,0,0,0,0,42,166,64,0,0,0,0,0,94,176,64,0,0,0,0,0,194,165,64,0,0,0,0,0,95,176,64,0,0,0,0,0,184,165,64,0,0,0,0,0,94,176,64,0,0,0,0,0,174,165,64,0,0,0,0,0,72,176,64,0,0,0,0,0,102,165,64,0,0,0,0,0,73,176,64,0,0,0,0,0,54,165,64,0,0,0,0,0,75,176,64,0,0,0,0,0,14,165,64,0,0,0,0,0,96,176,64,0,0,0,0,0,252,164,64,0,0,0,0,0,133,176,64,0,0,0,0,0,234,164,64,0,0,0,0,0,151,176,64,0,0,0,0,0,34,164,64,0,0,0,0,0,205,176,64,0,0,0,0,0,204,163,64,0,0,0,0,0,69,177,64,0,0,0,0,0,220,163,64,0,0,0,0,0,74,177,64,0,0,0,0,0,218,163,64,0,0,0,0,0,78,177,64,0,0,0,0,0,208,163,64,0,0,0,0,0,79,177,64,0,0,0,0,0,198,163,64,0,0,0,0,0,56,177,64,0,0,0,0,0,186,162,64,0,0,0,0,0,206,177,64,0,0,0,0,0,146,160,64,0,0,0,0,0,207,177,64,0,0,0,0,0,132,160,64,0,0,0,0,0,194,177,64,0,0,0,0,0,30,160,64,0,0,0,0,0,75,178,64,0,0,0,0,0,212,158,64,0,0,0,0,0,78,178,64,0,0,0,0,0,200,158,64,0,0,0,0,0,79,178,64,0,0,0,0,0,184,158,64,0,0,0,0,0,95,178,64,0,0,0,0,0,56,157,64,0,0,0,0,0,127,178,64,0,0,0,0,0,156,155,64,0,0,0,0,0,127,178,64,0,0,0,0,0,140,155,64,0,0,0,0,0,121,178,64,0,0,0,0,0,64,154,64,0,0,0,0,0,35,179,64,0,0,0,0,0,116,152,64,0,0,0,0,0,38,179,64,0,0,0,0,0,104,152,64,0,0,0,0,0,39,179,64,0,0,0,0,0,88,152,64,0,0,0,0,0,54,179,64,0,0,0,0,0,164,150,64,0,0,0,0,0,147,179,64,0,0,0,0,0,144,149,64,0,0,0,0,0,151,179,64,0,0,0,0,0,124,149,64,0,0,0,0,0,190,179,64,0,0,0,0,0,240,146,64,0,0,0,0,0,0,180,64,0,0,0,0,0,152,146,64,0,0,0,0,0,4,180,64,0,0,0,0,0,144,146,64,0,0,0,0,0,6,180,64,0,0,0,0,0,128,146,64,0,0,0,0,0,93,180,64,0,0,0,0,0,224,142,64,0,0,0,0,0,65,181,64,0,0,0,0,0,240,138,64,0,0,0,0,0,164,181,64,0,0,0,0,0,96,138,64,0,0,0,0,0,235,182,64,0,0,0,0,0,104,131,64,0,0,0,0,0,236,182,64,0,0,0,0,0,96,131,64,0,0,0,0,0,187,183,64,0,0,0,0,0,192,123,64,0,0,0,0,0,188,183,64,0,0,0,0,0,192,123,64,0,0,0,0,0,88,184,64,0,0,0,0,0,240,115,64,0,0,0,0,0,173,184,64,0,0,0,0,0,224,115,64,0,0,0,0,0,175,184,64,0,0,0,0,0,224,115,64,0,0,0,0,0,151,185,64,0,0,0,0,0,96,113,64,0,0,0,0,0,153,185,64,0,0,0,0,0,80,113,64,0,0,0,0,0,97,189,64,0,0,0,0,0,224,101,192,0,0,0,0,0,207,190,64,0,0,0,0,0,128,97,64,0,0,0,0,0,211,190,64,0,0,0,0,0,192,97,64,0,0,0,0,0,45,191,64,0,0,0,0,0,224,100,64,0,0,0,0,0,153,191,64,0,0,0,0,0,128,95,64,0,0,0,0,0,152,191,64,0,0,0,0,0,128,95,64,0,0,0,0,128,98,193,64,0,0,0,0,0,64,87,192,0,0,0,0,0,183,194,64,0,0,0,0,0,160,103,64,0,0,0,0,0,31,195,64,0,0,0,0,0,64,113,64,0,0,0,0,128,123,195,64,0,0,0,0,0,80,121,64,0,0,0,0,0,123,195,64,0,0,0,0,0,80,121,64,0,0,0,0,128,199,195,64,0,0,0,0,0,32,128,64,0,0,0,0,0,203,195,64,0,0,0,0,0,48,128,64,0,0,0,0,128,18,197,64,0,0,0,0,0,224,126,64,0,0,0,0,0,80,197,64,0,0,0,0,0,112,128,64,0,0,0,0,128,145,197,64,0,0,0,0,0,192,122,64,0,0,0,0,0,146,197,64,0,0,0,0,0,176,122,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,146,197,64,0,0,0,0,0,176,122,64,0,0,0,0,128,145,197,64,0,0,0,0,0,192,122,64,0,0,0,0,0,80,197,64,0,0,0,0,0,112,128,64,0,0,0,0,128,18,197,64,0,0,0,0,0,224,126,64,0,0,0,0,0,203,195,64,0,0,0,0,0,48,128,64,0,0,0,0,128,199,195,64,0,0,0,0,0,32,128,64,0,0,0,0,0,123,195,64,0,0,0,0,0,80,121,64,0,0,0,0,128,123,195,64,0,0,0,0,0,80,121,64,0,0,0,0,0,31,195,64,0,0,0,0,0,64,113,64,0,0,0,0,0,183,194,64,0,0,0,0,0,160,103,64,0,0,0,0,128,98,193,64,0,0,0,0,0,64,87,192,0,0,0,0,0,152,191,64,0,0,0,0,0,128,95,64,0,0,0,0,0,153,191,64,0,0,0,0,0,128,95,64,0,0,0,0,0,45,191,64,0,0,0,0,0,224,100,64,0,0,0,0,0,211,190,64,0,0,0,0,0,192,97,64,0,0,0,0,0,207,190,64,0,0,0,0,0,128,97,64,0,0,0,0,0,97,189,64,0,0,0,0,0,224,101,192,0,0,0,0,0,153,185,64,0,0,0,0,0,80,113,64,0,0,0,0,0,151,185,64,0,0,0,0,0,96,113,64,0,0,0,0,0,175,184,64,0,0,0,0,0,224,115,64,0,0,0,0,0,173,184,64,0,0,0,0,0,224,115,64,0,0,0,0,0,88,184,64,0,0,0,0,0,240,115,64,0,0,0,0,0,188,183,64,0,0,0,0,0,192,123,64,0,0,0,0,0,187,183,64,0,0,0,0,0,192,123,64,0,0,0,0,0,236,182,64,0,0,0,0,0,96,131,64,0,0,0,0,0,235,182,64,0,0,0,0,0,104,131,64,0,0,0,0,0,164,181,64,0,0,0,0,0,96,138,64,0,0,0,0,0,65,181,64,0,0,0,0,0,240,138,64,0,0,0,0,0,93,180,64,0,0,0,0,0,224,142,64,0,0,0,0,0,6,180,64,0,0,0,0,0,128,146,64,0,0,0,0,0,4,180,64,0,0,0,0,0,144,146,64,0,0,0,0,0,0,180,64,0,0,0,0,0,152,146,64,0,0,0,0,0,190,179,64,0,0,0,0,0,240,146,64,0,0,0,0,0,151,179,64,0,0,0,0,0,124,149,64,0,0,0,0,0,147,179,64,0,0,0,0,0,144,149,64,0,0,0,0,0,54,179,64,0,0,0,0,0,164,150,64,0,0,0,0,0,39,179,64,0,0,0,0,0,88,152,64,0,0,0,0,0,38,179,64,0,0,0,0,0,104,152,64,0,0,0,0,0,35,179,64,0,0,0,0,0,116,152,64,0,0,0,0,0,121,178,64,0,0,0,0,0,64,154,64,0,0,0,0,0,127,178,64,0,0,0,0,0,140,155,64,0,0,0,0,0,127,178,64,0,0,0,0,0,156,155,64,0,0,0,0,0,95,178,64,0,0,0,0,0,56,157,64,0,0,0,0,0,79,178,64,0,0,0,0,0,184,158,64,0,0,0,0,0,78,178,64,0,0,0,0,0,200,158,64,0,0,0,0,0,75,178,64,0,0,0,0,0,212,158,64,0,0,0,0,0,194,177,64,0,0,0,0,0,30,160,64,0,0,0,0,0,207,177,64,0,0,0,0,0,132,160,64,0,0,0,0,0,206,177,64,0,0,0,0,0,146,160,64,0,0,0,0,0,56,177,64,0,0,0,0,0,186,162,64,0,0,0,0,0,79,177,64,0,0,0,0,0,198,163,64,0,0,0,0,0,78,177,64,0,0,0,0,0,208,163,64,0,0,0,0,0,74,177,64,0,0,0,0,0,218,163,64,0,0,0,0,0,69,177,64,0,0,0,0,0,220,163,64,0,0,0,0,0,205,176,64,0,0,0,0,0,204,163,64,0,0,0,0,0,151,176,64,0,0,0,0,0,34,164,64,0,0,0,0,0,133,176,64,0,0,0,0,0,234,164,64,0,0,0,0,0,96,176,64,0,0,0,0,0,252,164,64,0,0,0,0,0,75,176,64,0,0,0,0,0,14,165,64,0,0,0,0,0,73,176,64,0,0,0,0,0,54,165,64,0,0,0,0,0,72,176,64,0,0,0,0,0,102,165,64,0,0,0,0,0,94,176,64,0,0,0,0,0,174,165,64,0,0,0,0,0,95,176,64,0,0,0,0,0,184,165,64,0,0,0,0,0,94,176,64,0,0,0,0,0,194,165,64,0,0,0,0,0,64,176,64,0,0,0,0,0,42,166,64,0,0,0,0,0,55,176,64,0,0,0,0,0,104,166,64,0,0,0,0,0,71,176,64,0,0,0,0,0,222,166,64,0,0,0,0,0,220,175,64,0,0,0,0,0,194,167,64,0,0,0,0,0,224,174,64,0,0,0,0,0,164,170,64,0,0,0,0,0,46,175,64,0,0,0,0,0,114,171,64,0,0,0,0,0,46,175,64,0,0,0,0,0,118,171,64,0,0,0,0,0,64,175,64,0,0,0,0,0,68,172,64,0,0,0,0,0,196,174,64,0,0,0,0,0,138,172,64,0,0,0,0,0,184,174,64,0,0,0,0,0,140,172,64,0,0,0,0,0,168,174,64,0,0,0,0,0,138,172,64,0,0,0,0,0,164,174,64,0,0,0,0,0,148,172,64,0,0,0,0,0,160,174,64,0,0,0,0,0,170,172,64,0,0,0,0,0,180,174,64,0,0,0,0,0,220,172,64,0,0,0,0,0,228,174,64,0,0,0,0,0,80,173,64,0,0,0,0,0,138,175,64,0,0,0,0,0,62,174,64,0,0,0,0,0,140,175,64,0,0,0,0,0,62,174,64,0,0,0,0,0,184,175,64,0,0,0,0,0,122,174,64,0,0,0,0,0,38,175,64,0,0,0,0,0,232,174,64,0,0,0,0,0,30,175,64,0,0,0,0,0,236,174,64,0,0,0,0,0,124,172,64,0,0,0,0,0,120,175,64,0,0,0,0,0,30,172,64,0,0,0,0,0,254,176,64,0,0,0,0,0,26,172,64,0,0,0,0,0,3,177,64,0,0,0,0,0,4,170,64,0,0,0,0,0,37,178,64,0,0,0,0,0,254,169,64,0,0,0,0,0,139,178,64,0,0,0,0,0,36,170,64,0,0,0,0,0,84,179,64,0,0,0,0,0,36,170,64,0,0,0,0,0,86,179,64,0,0,0,0,0,30,170,64,0,0,0,0,0,162,179,64,0,0,0,0,0,26,171,64,0,0,0,0,0,205,179,64,0,0,0,0,0,38,172,64,0,0,0,0,0,250,179,64,0,0,0,0,0,76,174,64,0,0,0,0,0,2,180,64,0,0,0,0,0,77,177,64,0,0,0,0,0,18,180,64,0,0,0,0,0,77,199,64,0,0,0,0,0,143,177,64,0,0,0,0,0,79,199,64,0,0,0,0,0,144,177,64,0,0,0,0,0,105,199,64,0,0,0,0,0,159,177,64,0,0,0,0,128,122,199,64,0,0,0,0,0,206,177,64,0,0,0,0,0,123,199,64,0,0,0,0,0,207,177,64,0,0,0,0,128,139,199,64,0,0,0,0,0,3,178,64,0,0,0,0,128,148,199,64,0,0,0,0,0,20,178,64,0,0,0,0,128,151,199,64,0,0,0,0,0,25,178,64,0,0,0,0,128,151,199,64,0,0,0,0,0,24,178,64,0,0,0,0,0,155,199,64,0,0,0,0,0,243,177,64,0,0,0,0,0,130,199,64,0,0,0,0,0,63,177,64,0,0,0,0,128,83,199,64,0,0,0,0,0,29,176,64,0,0,0,0,128,82,199,64,0,0,0,0,0,136,175,64,0,0,0,0,128,82,199,64,0,0,0,0,0,86,175,64,0,0,0,0,128,85,199,64,0,0,0,0,0,64,175,64,0,0,0,0,0,90,199,64,0,0,0,0,0,30,175,64,0,0,0,0,0,99,199,64,0,0,0,0,0,42,175,64,0,0,0,0,0,111,199,64,0,0,0,0,0,52,175,64,0,0,0,0,128,134,199,64,0,0,0,0,0,172,175,64,0,0,0,0,128,148,199,64,0,0,0,0,0,238,175,64,0,0,0,0,128,157,199,64,0,0,0,0,0,1,176,64,0,0,0,0,128,161,199,64,0,0,0,0,0,4,176,64,0,0,0,0,0,163,199,64,0,0,0,0,0,0,176,64,0,0,0,0,0,169,199,64,0,0,0,0,0,194,175,64,0,0,0,0,0,154,199,64,0,0,0,0,0,190,174,64,0,0,0,0,128,115,199,64,0,0,0,0,0,44,172,64,0,0,0,0,0,90,199,64,0,0,0,0,0,48,171,64,0,0,0,0,0,90,199,64,0,0,0,0,0,32,171,64,0,0,0,0,128,90,199,64,0,0,0,0,0,24,171,64,0,0,0,0,128,92,199,64,0,0,0,0,0,22,171,64,0,0,0,0,128,96,199,64,0,0,0,0,0,22,171,64,0,0,0,0,0,117,199,64,0,0,0,0,0,40,171,64,0,0,0,0,0,122,199,64,0,0,0,0,0,38,171,64,0,0,0,0,0,124,199,64,0,0,0,0,0,20,171,64,0,0,0,0,0,128,199,64,0,0,0,0,0,216,170,64,0,0,0,0,0,110,199,64,0,0,0,0,0,52,170,64,0,0,0,0,0,72,199,64,0,0,0,0,0,216,168,64,0,0,0,0,128,194,198,64,0,0,0,0,0,196,165,64,0,0,0,0,128,193,198,64,0,0,0,0,0,184,165,64,0,0,0,0,128,194,198,64,0,0,0,0,0,172,165,64,0,0,0,0,128,195,198,64,0,0,0,0,0,166,165,64,0,0,0,0,128,197,198,64,0,0,0,0,0,166,165,64,0,0,0,0,128,200,198,64,0,0,0,0,0,166,165,64,0,0,0,0,0,20,199,64,0,0,0,0,0,32,166,64,0,0,0,0,0,84,198,64,0,0,0,0,0,40,160,64,0,0,0,0,128,129,197,64,0,0,0,0,0,184,158,64,0,0,0,0,128,127,197,64,0,0,0,0,0,176,158,64,0,0,0,0,128,47,197,64,0,0,0,0,0,208,156,64,0,0,0,0,0,46,197,64,0,0,0,0,0,192,156,64,0,0,0,0,128,45,197,64,0,0,0,0,0,168,156,64,0,0,0,0,0,47,197,64,0,0,0,0,0,148,156,64,0,0,0,0,128,171,198,64,0,0,0,0,0,204,144,64,0,0,0,0,128,46,198,64,0,0,0,0,0,160,117,64,0,0,0,0,128,237,197,64,0,0,0,0,0,128,111,64,0,0,0,0,0,146,197,64,0,0,0,0,0,176,122,64,0,0,0,0,128,53,198,64,0,0,0,0,0,192,116,64,0,0,0,0,128,55,198,64,0,0,0,0,0,16,117,64,0,0,0,0,0,184,198,64,0,0,0,0,0,200,144,64,0,0,0,0,0,58,197,64,0,0,0,0,0,172,156,64,0,0,0,0,0,133,197,64,0,0,0,0,0,108,158,64,0,0,0,0,0,94,198,64,0,0,0,0,0,8,160,64,0,0,0,0,0,35,199,64,0,0,0,0,0,64,166,64,0,0,0,0,128,35,199,64,0,0,0,0,0,76,166,64,0,0,0,0,128,34,199,64,0,0,0,0,0,86,166,64,0,0,0,0,128,31,199,64,0,0,0,0,0,92,166,64,0,0,0,0,128,28,199,64,0,0,0,0,0,92,166,64,0,0,0,0,0,212,198,64,0,0,0,0,0,230,165,64,0,0,0,0,128,82,199,64,0,0,0,0,0,212,168,64,0,0,0,0,0,119,199,64,0,0,0,0,0,36,170,64,0,0,0,0,0,139,199,64,0,0,0,0,0,220,170,64,0,0,0,0,128,133,199,64,0,0,0,0,0,32,171,64,0,0,0,0,0,130,199,64,0,0,0,0,0,74,171,64,0,0,0,0,0,118,199,64,0,0,0,0,0,80,171,64,0,0,0,0,0,103,199,64,0,0,0,0,0,74,171,64,0,0,0,0,128,127,199,64,0,0,0,0,0,80,172,64,0,0,0,0,128,163,199,64,0,0,0,0,0,180,174,64,0,0,0,0,0,180,199,64,0,0,0,0,0,206,175,64,0,0,0,0,0,172,199,64,0,0,0,0,0,8,176,64,0,0,0,0,0,169,199,64,0,0,0,0,0,21,176,64,0,0,0,0,0,164,199,64,0,0,0,0,0,23,176,64,0,0,0,0,128,152,199,64,0,0,0,0,0,19,176,64,0,0,0,0,128,142,199,64,0,0,0,0,0,9,176,64,0,0,0,0,0,127,199,64,0,0,0,0,0,198,175,64,0,0,0,0,128,126,199,64,0,0,0,0,0,196,175,64,0,0,0,0,0,106,199,64,0,0,0,0,0,92,175,64,0,0,0,0,128,96,199,64,0,0,0,0,0,80,175,64,0,0,0,0,128,94,199,64,0,0,0,0,0,82,175,64,0,0,0,0,128,92,199,64,0,0,0,0,0,98,175,64,0,0,0,0,128,92,199,64,0,0,0,0,0,136,175,64,0,0,0,0,128,93,199,64,0,0,0,0,0,27,176,64,0,0,0,0,128,139,199,64,0,0,0,0,0,57,177,64,0,0,0,0,128,139,199,64,0,0,0,0,0,58,177,64,0,0,0,0,0,166,199,64,0,0,0,0,0,245,177,64,0,0,0,0,128,161,199,64,0,0,0,0,0,28,178,64,0,0,0,0,128,159,199,64,0,0,0,0,0,47,178,64,0,0,0,0,0,153,199,64,0,0,0,0,0,46,178,64,0,0,0,0,128,148,199,64,0,0,0,0,0,48,178,64,0,0,0,0,128,141,199,64,0,0,0,0,0,35,178,64,0,0,0,0,128,131,199,64,0,0,0,0,0,17,178,64,0,0,0,0,128,114,199,64,0,0,0,0,0,218,177,64,0,0,0,0,0,99,199,64,0,0,0,0,0,178,177,64,0,0,0,0,0,77,199,64,0,0,0,0,0,163,177,64,0,0,0,0,0,77,177,64,0,0,0,0,0,38,180,64,0,0,0,0,0,74,174,64,0,0,0,0,0,22,180,64,0,0,0,0,0,30,172,64,0,0,0,0,0,14,180,64,0,0,0,0,0,14,171,64,0,0,0,0,0,224,179,64,0,0,0,0,0,238,169,64,0,0,0,0,0,175,179,64,0,0,0,0,0,252,169,64,0,0,0,0,0,86,179,64,0,0,0,0,0,214,169,64,0,0,0,0,0,141,178,64,0,0,0,0,0,214,169,64,0,0,0,0,0,140,178,64,0,0,0,0,0,212,169,64,0,0,0,0,0,34,178,64,0,0,0,0,0,248,171,64,0,0,0,0,0,247,176,64,0,0,0,0,0,92,172,64,0,0,0,0,0,88,175,64,0,0,0,0,0,18,175,64,0,0,0,0,0,198,174,64,0,0,0,0,0,124,175,64,0,0,0,0,0,116,174,64,0,0,0,0,0,106,175,64,0,0,0,0,0,84,174,64,0,0,0,0,0,192,174,64,0,0,0,0,0,96,173,64,0,0,0,0,0,144,174,64,0,0,0,0,0,236,172,64,0,0,0,0,0,116,174,64,0,0,0,0,0,170,172,64,0,0,0,0,0,124,174,64,0,0,0,0,0,140,172,64,0,0,0,0,0,132,174,64,0,0,0,0,0,96,172,64,0,0,0,0,0,182,174,64,0,0,0,0,0,100,172,64,0,0,0,0,0,20,175,64,0,0,0,0,0,38,172,64,0,0,0,0,0,6,175,64,0,0,0,0,0,126,171,64,0,0,0,0,0,180,174,64,0,0,0,0,0,168,170,64,0,0,0,0,0,184,175,64,0,0,0,0,0,178,167,64,0,0,0,0,0,186,175,64,0,0,0,0,0,172,167,64,0,0,0,0,0,49,176,64,0,0,0,0,0,214,166,64,0,0,0,0,0,36,176,64,0,0,0,0,0,110,166,64,0,0,0,0,0,36,176,64,0,0,0,0,0,100,166,64,0,0,0,0,0,43,176,64,0,0,0,0,0,36,166,64,0,0,0,0,0,74,176,64,0,0,0,0,0,184,165,64,0,0,0,0,0,51,176,64,0,0,0,0,0,104,165,64,0,0,0,0,0,53,176,64,0,0,0,0,0,50,165,64,0,0,0,0,0,55,176,64,0,0,0,0,0,242,164,64,0,0,0,0,0,89,176,64,0,0,0,0,0,214,164,64,0,0,0,0,0,91,176,64,0,0,0,0,0,214,164,64,0,0,0,0,0,116,176,64,0,0,0,0,0,196,164,64,0,0,0,0,0,131,176,64,0,0,0,0,0,22,164,64,0,0,0,0,0,135,176,64,0,0,0,0,0,10,164,64,0,0,0,0,0,190,176,64,0,0,0,0,0,168,163,64,0,0,0,0,0,57,177,64,0,0,0,0,0,180,163,64,0,0,0,0,0,40,177,64,0,0,0,0,0,160,162,64,0,0,0,0,0,187,177,64,0,0,0,0,0,132,160,64,0,0,0,0,0,173,177,64,0,0,0,0,0,12,160,64,0,0,0,0,0,60,178,64,0,0,0,0,0,152,158,64,0,0,0,0,0,76,178,64,0,0,0,0,0,32,157,64,0,0,0,0,0,107,178,64,0,0,0,0,0,140,155,64,0,0,0,0,0,99,178,64,0,0,0,0,0,32,154,64,0,0,0,0,0,20,179,64,0,0,0,0,0,56,152,64,0,0,0,0,0,37,179,64,0,0,0,0,0,124,150,64,0,0,0,0,0,133,179,64,0,0,0,0,0,88,149,64,0,0,0,0,0,172,179,64,0,0,0,0,0,200,146,64,0,0,0,0,0,174,179,64,0,0,0,0,0,184,146,64,0,0,0,0,0,178,179,64,0,0,0,0,0,172,146,64,0,0,0,0,0,246,179,64,0,0,0,0,0,80,146,64,0,0,0,0,0,79,180,64,0,0,0,0,0,96,142,64,0,0,0,0,0,56,181,64,0,0,0,0,0,88,138,64,0,0,0,0,0,60,181,64,0,0,0,0,0,80,138,64,0,0,0,0,0,154,181,64,0,0,0,0,0,208,137,64,0,0,0,0,0,224,182,64,0,0,0,0,0,224,130,64,0,0,0,0,0,175,183,64,0,0,0,0,0,208,122,64,0,0,0,0,0,175,183,64,0,0,0,0,0,192,122,64,0,0,0,0,0,81,184,64,0,0,0,0,0,160,114,64,0,0,0,0,0,172,184,64,0,0,0,0,0,160,114,64,0,0,0,0,0,147,185,64,0,0,0,0,0,32,112,64,0,0,0,0,0,103,189,64,0,0,0,0,0,224,104,192,0,0,0,0,0,218,190,64,0,0,0,0,0,192,94,64,0,0,0,0,0,46,191,64,0,0,0,0,0,32,98,64,0,0,0,0,0,146,191,64,0,0,0,0,0,192,90,64,0,0,0,0,0,147,191,64,0,0,0,0,0,192,90,64,0,0,0,0,128,99,193,64,0,0,0,0,0,64,92,192,0,0,0,0,0,187,194,64,0,0,0,0,0,96,101,64,0,0,0,0,0,36,195,64,0,0,0,0,0,32,112,64,0,0,0,0,0,129,195,64,0,0,0,0,0,80,120,64,0,0,0,0,0,204,195,64,0,0,0,0,0,32,127,64,0,0,0,0,128,18,197,64,0,0,0,0,0,160,125,64,0,0,0,0,0,20,197,64,0,0,0,0,0,176,125,64,0,0,0,0,128,77,197,64,0,0,0,0,0,144,127,64,0,0,0,0,128,139,197,64,0,0,0,0,0,192,121,64,0,0,0,0,0,239,197,64,0,0,0,0,0,192,107,64,0,0,0,0,128,53,198,64,0,0,0,0,0,192,116,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,177,195,64,0,0,0,0,0,224,172,64,0,0,0,0,0,24,196,64,0,0,0,0,0,146,172,64,0,0,0,0,128,98,196,64,0,0,0,0,0,156,172,64,0,0,0,0,0,124,197,64,0,0,0,0,0,194,172,64,0,0,0,0,128,10,199,64,0,0,0,0,0,156,176,64,0,0,0,0,128,66,199,64,0,0,0,0,0,236,177,64,0,0,0,0,128,138,195,64,0,0,0,0,0,108,177,64,0,0,0,0,128,26,195,64,0,0,0,0,0,188,177,64,0,0,0,0,128,170,194,64,0,0,0,0,0,12,178,64,0,0,0,0,0,37,184,64,0,0,0,0,0,108,180,64,0,0,0,0,0,10,172,64,0,0,0,0,0,92,183,64,0,0,0,0,0,170,170,64,0,0,0,0,0,172,180,64,0,0,0,0,0,106,168,64,0,0,0,0,0,68,176,64,0,0,0,0,0,82,172,64,0,0,0,0,0,88,179,64,0,0,0,0,0,194,172,64,0,0,0,0,0,112,178,64,0,0,0,0,0,234,174,64,0,0,0,0,0,40,180,64,0,0,0,0,0,5,177,64,0,0,0,0,0,220,178,64,0,0,0,0,0,159,178,64,0,0,0,0,0,136,177,64,0,0,0,0,0,124,179,64,0,0,0,0,0,198,177,64,0,0,0,0,0,16,180,64,0,0,0,0,0,240,177,64,0,0,0,0,0,37,180,64,0,0,0,0,0,156,178,64,0,0,0,0,0,47,180,64,0,0,0,0,0,238,178,64,0,0,0,0,0,107,180,64,0,0,0,0,0,234,178,64,0,0,0,0,0,213,180,64,0,0,0,0,0,204,178,64,0,0,0,0,0,79,181,64,0,0,0,0,0,118,178,64,0,0,0,0,0,211,181,64,0,0,0,0,0,25,178,64,0,0,0,0,0,83,182,64,0,0,0,0,0,222,177,64,0,0,0,0,0,249,183,64,0,0,0,0,0,29,177,64,0,0,0,0,0,165,185,64,0,0,0,0,0,188,177,64,0,0,0,0,0,85,188,64,0,0,0,0,0,12,179,64,0,0,0,0,0,229,186,64,0,0,0,0,0,124,177,64,0,0,0,0,0,5,185,64,0,0,0,0,0,88,174,64,0,0,0,0,0,85,186,64,0,0,0,0,0,12,176,64,0,0,0,0,0,211,186,64,0,0,0,0,0,96,176,64,0,0,0,0,0,250,187,64,0,0,0,0,0,114,176,64,0,0,0,0,0,37,189,64,0,0,0,0,0,132,176,64,0,0,0,0,0,59,190,64,0,0,0,0,0,71,176,64,0,0,0,0,0,115,191,64,0,0,0,0,0,1,176,64,0,0,0,0,0,0,192,64,0,0,0,0,0,226,174,64,0,0,0,0,128,82,192,64,0,0,0,0,0,148,173,64,0,0,0,0,128,26,192,64,0,0,0,0,0,184,171,64,0,0,0,0,0,126,191,64,0,0,0,0,0,176,168,64,0,0,0,0,0,30,192,64,0,0,0,0,0,54,169,64,0,0,0,0,0,120,192,64,0,0,0,0,0,232,169,64,0,0,0,0,0,176,192,64,0,0,0,0,0,98,170,64,0,0,0,0,128,194,192,64,0,0,0,0,0,88,170,64,0,0,0,0,0,230,192,64,0,0,0,0,0,70,170,64,0,0,0,0,128,194,193,64,0,0,0,0,0,40,172,64,0,0,0,0,0,157,194,64,0,0,0,0,0,6,174,64,0,0,0,0,128,170,194,64,0,0,0,0,0,248,173,64,0,0,0,0,0,180,194,64,0,0,0,0,0,238,173,64,0,0,0,0,0,187,194,64,0,0,0,0,0,172,173,64,0,0,0,0,128,203,194,64,0,0,0,0,0,48,173,64,0,0,0,0,0,232,194,64,0,0,0,0,0,152,172,64,0,0,0,0,128,58,195,64,0,0,0,0,0,248,172,64,0,0,0,0,0,93,195,64,0,0,0,0,0,32,173,64,0,0,0,0,0,177,195,64,0,0,0,0,0,224,172,64,29,29,29,29,29,29,237,63,224,223,223,223,223,223,223,63,29,29,29,29,29,29,205,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,189,195,64,0,0,0,0,0,34,173,64,0,0,0,0,0,36,196,64,0,0,0,0,0,206,172,64,0,0,0,0,128,107,196,64,0,0,0,0,0,214,172,64,0,0,0,0,0,129,197,64,0,0,0,0,0,242,172,64,0,0,0,0,128,15,199,64,0,0,0,0,0,179,176,64,0,0,0,0,0,71,199,64,0,0,0,0,0,13,178,64,0,0,0,0,128,151,195,64,0,0,0,0,0,143,177,64,0,0,0,0,128,39,195,64,0,0,0,0,0,223,177,64,0,0,0,0,128,183,194,64,0,0,0,0,0,47,178,64,0,0,0,0,0,63,184,64,0,0,0,0,0,143,180,64,0,0,0,0,0,36,172,64,0,0,0,0,0,153,183,64,0,0,0,0,0,196,170,64,0,0,0,0,0,233,180,64,0,0,0,0,0,106,168,64,0,0,0,0,0,91,176,64,0,0,0,0,0,82,172,64,0,0,0,0,0,119,179,64,0,0,0,0,0,210,172,64,0,0,0,0,0,173,178,64,0,0,0,0,0,236,174,64,0,0,0,0,0,90,180,64,0,0,0,0,0,31,177,64,0,0,0,0,0,255,178,64,0,0,0,0,0,186,178,64,0,0,0,0,0,172,177,64,0,0,0,0,0,151,179,64,0,0,0,0,0,234,177,64,0,0,0,0,0,42,180,64,0,0,0,0,0,20,178,64,0,0,0,0,0,63,180,64,0,0,0,0,0,191,178,64,0,0,0,0,0,73,180,64,0,0,0,0,0,17,179,64,0,0,0,0,0,133,180,64,0,0,0,0,0,13,179,64,0,0,0,0,0,239,180,64,0,0,0,0,0,239,178,64,0,0,0,0,0,105,181,64,0,0,0,0,0,153,178,64,0,0,0,0,0,237,181,64,0,0,0,0,0,60,178,64,0,0,0,0,0,109,182,64,0,0,0,0,0,1,178,64,0,0,0,0,0,19,184,64,0,0,0,0,0,64,177,64,0,0,0,0,0,191,185,64,0,0,0,0,0,223,177,64,0,0,0,0,0,111,188,64,0,0,0,0,0,47,179,64,0,0,0,0,0,255,186,64,0,0,0,0,0,159,177,64,0,0,0,0,0,31,185,64,0,0,0,0,0,158,174,64,0,0,0,0,0,111,186,64,0,0,0,0,0,47,176,64,0,0,0,0,0,238,186,64,0,0,0,0,0,132,176,64,0,0,0,0,0,21,188,64,0,0,0,0,0,153,176,64,0,0,0,0,0,66,189,64,0,0,0,0,0,174,176,64,0,0,0,0,0,89,190,64,0,0,0,0,0,115,176,64,0,0,0,0,0,148,191,64,0,0,0,0,0,48,176,64,0,0,0,0,128,15,192,64,0,0,0,0,0,62,175,64,0,0,0,0,128,97,192,64,0,0,0,0,0,234,173,64,0,0,0,0,128,39,192,64,0,0,0,0,0,254,171,64,0,0,0,0,0,152,191,64,0,0,0,0,0,246,168,64,0,0,0,0,0,43,192,64,0,0,0,0,0,124,169,64,0,0,0,0,0,133,192,64,0,0,0,0,0,46,170,64,0,0,0,0,0,189,192,64,0,0,0,0,0,168,170,64,0,0,0,0,128,207,192,64,0,0,0,0,0,158,170,64,0,0,0,0,0,243,192,64,0,0,0,0,0,140,170,64,0,0,0,0,128,207,193,64,0,0,0,0,0,110,172,64,0,0,0,0,0,170,194,64,0,0,0,0,0,76,174,64,0,0,0,0,128,183,194,64,0,0,0,0,0,62,174,64,0,0,0,0,0,193,194,64,0,0,0,0,0,52,174,64,0,0,0,0,0,200,194,64,0,0,0,0,0,242,173,64,0,0,0,0,128,216,194,64,0,0,0,0,0,118,173,64,0,0,0,0,0,245,194,64,0,0,0,0,0,222,172,64,0,0,0,0,128,71,195,64,0,0,0,0,0,62,173,64,0,0,0,0,128,105,195,64,0,0,0,0,0,102,173,64,0,0,0,0,0,189,195,64,0,0,0,0,0,34,173,64,93,93,93,93,93,93,237,63,146,145,145,145,145,145,225,63,148,147,147,147,147,147,211,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,84,195,64,0,0,0,0,0,132,173,64,0,0,0,0,128,118,195,64,0,0,0,0,0,172,173,64,0,0,0,0,128,200,195,64,0,0,0,0,0,100,173,64,0,0,0,0,128,45,196,64,0,0,0,0,0,12,173,64,0,0,0,0,128,116,196,64,0,0,0,0,0,16,173,64,0,0,0,0,128,133,197,64,0,0,0,0,0,32,173,64,0,0,0,0,128,20,199,64,0,0,0,0,0,203,176,64,0,0,0,0,0,75,199,64,0,0,0,0,0,47,178,64,0,0,0,0,128,164,195,64,0,0,0,0,0,178,177,64,0,0,0,0,128,52,195,64,0,0,0,0,0,2,178,64,0,0,0,0,128,196,194,64,0,0,0,0,0,82,178,64,0,0,0,0,0,89,184,64,0,0,0,0,0,178,180,64,0,0,0,0,0,62,172,64,0,0,0,0,0,214,183,64,0,0,0,0,0,222,170,64,0,0,0,0,0,38,181,64,0,0,0,0,0,152,168,64,0,0,0,0,0,138,176,64,0,0,0,0,0,80,172,64,0,0,0,0,0,150,179,64,0,0,0,0,0,224,172,64,0,0,0,0,0,233,178,64,0,0,0,0,0,240,174,64,0,0,0,0,0,140,180,64,0,0,0,0,0,57,177,64,0,0,0,0,0,34,179,64,0,0,0,0,0,214,178,64,0,0,0,0,0,209,177,64,0,0,0,0,0,178,179,64,0,0,0,0,0,15,178,64,0,0,0,0,0,68,180,64,0,0,0,0,0,56,178,64,0,0,0,0,0,89,180,64,0,0,0,0,0,226,178,64,0,0,0,0,0,99,180,64,0,0,0,0,0,52,179,64,0,0,0,0,0,159,180,64,0,0,0,0,0,48,179,64,0,0,0,0,0,9,181,64,0,0,0,0,0,18,179,64,0,0,0,0,0,131,181,64,0,0,0,0,0,188,178,64,0,0,0,0,0,7,182,64,0,0,0,0,0,95,178,64,0,0,0,0,0,135,182,64,0,0,0,0,0,36,178,64,0,0,0,0,0,45,184,64,0,0,0,0,0,99,177,64,0,0,0,0,0,217,185,64,0,0,0,0,0,2,178,64,0,0,0,0,0,137,188,64,0,0,0,0,0,82,179,64,0,0,0,0,0,25,187,64,0,0,0,0,0,194,177,64,0,0,0,0,0,57,185,64,0,0,0,0,0,228,174,64,0,0,0,0,0,137,186,64,0,0,0,0,0,82,176,64,0,0,0,0,0,9,187,64,0,0,0,0,0,167,176,64,0,0,0,0,0,47,188,64,0,0,0,0,0,190,176,64,0,0,0,0,0,91,189,64,0,0,0,0,0,215,176,64,0,0,0,0,0,112,190,64,0,0,0,0,0,157,176,64,0,0,0,0,0,171,191,64,0,0,0,0,0,91,176,64,0,0,0,0,128,26,192,64,0,0,0,0,0,148,175,64,0,0,0,0,0,109,192,64,0,0,0,0,0,60,174,64,0,0,0,0,128,52,192,64,0,0,0,0,0,68,172,64,0,0,0,0,0,186,191,64,0,0,0,0,0,52,169,64,0,0,0,0,128,58,192,64,0,0,0,0,0,190,169,64,0,0,0,0,0,147,192,64,0,0,0,0,0,114,170,64,0,0,0,0,0,203,192,64,0,0,0,0,0,236,170,64,0,0,0,0,128,220,192,64,0,0,0,0,0,228,170,64,0,0,0,0,0,0,193,64,0,0,0,0,0,210,170,64,0,0,0,0,128,220,193,64,0,0,0,0,0,180,172,64,0,0,0,0,0,183,194,64,0,0,0,0,0,146,174,64,0,0,0,0,128,196,194,64,0,0,0,0,0,132,174,64,0,0,0,0,0,206,194,64,0,0,0,0,0,122,174,64,0,0,0,0,0,213,194,64,0,0,0,0,0,56,174,64,0,0,0,0,128,229,194,64,0,0,0,0,0,188,173,64,0,0,0,0,0,2,195,64,0,0,0,0,0,36,173,64,0,0,0,0,128,84,195,64,0,0,0,0,0,132,173,64,190,189,189,189,189,189,237,63,51,51,51,51,51,51,227,63,88,88,88,88,88,88,216,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,195,64,0,0,0,0,0,202,173,64,0,0,0,0,0,132,195,64,0,0,0,0,0,242,173,64,0,0,0,0,0,213,195,64,0,0,0,0,0,166,173,64,0,0,0,0,128,57,196,64,0,0,0,0,0,72,173,64,0,0,0,0,0,126,196,64,0,0,0,0,0,74,173,64,0,0,0,0,128,139,197,64,0,0,0,0,0,78,173,64,0,0,0,0,0,26,199,64,0,0,0,0,0,226,176,64,0,0,0,0,128,79,199,64,0,0,0,0,0,80,178,64,0,0,0,0,0,178,195,64,0,0,0,0,0,213,177,64,0,0,0,0,0,66,195,64,0,0,0,0,0,37,178,64,0,0,0,0,0,210,194,64,0,0,0,0,0,117,178,64,0,0,0,0,0,116,184,64,0,0,0,0,0,213,180,64,0,0,0,0,0,88,172,64,0,0,0,0,0,19,184,64,0,0,0,0,0,248,170,64,0,0,0,0,0,99,181,64,0,0,0,0,0,232,168,64,0,0,0,0,0,213,176,64,0,0,0,0,0,80,172,64,0,0,0,0,0,181,179,64,0,0,0,0,0,240,172,64,0,0,0,0,0,38,179,64,0,0,0,0,0,242,174,64,0,0,0,0,0,189,180,64,0,0,0,0,0,84,177,64,0,0,0,0,0,69,179,64,0,0,0,0,0,242,178,64,0,0,0,0,0,247,177,64,0,0,0,0,0,206,179,64,0,0,0,0,0,51,178,64,0,0,0,0,0,95,180,64,0,0,0,0,0,92,178,64,0,0,0,0,0,116,180,64,0,0,0,0,0,5,179,64,0,0,0,0,0,126,180,64,0,0,0,0,0,87,179,64,0,0,0,0,0,186,180,64,0,0,0,0,0,83,179,64,0,0,0,0,0,36,181,64,0,0,0,0,0,53,179,64,0,0,0,0,0,158,181,64,0,0,0,0,0,223,178,64,0,0,0,0,0,34,182,64,0,0,0,0,0,130,178,64,0,0,0,0,0,162,182,64,0,0,0,0,0,71,178,64,0,0,0,0,0,72,184,64,0,0,0,0,0,134,177,64,0,0,0,0,0,244,185,64,0,0,0,0,0,37,178,64,0,0,0,0,0,164,188,64,0,0,0,0,0,117,179,64,0,0,0,0,0,52,187,64,0,0,0,0,0,229,177,64,0,0,0,0,0,84,185,64,0,0,0,0,0,42,175,64,0,0,0,0,0,164,186,64,0,0,0,0,0,117,176,64,0,0,0,0,0,33,187,64,0,0,0,0,0,200,176,64,0,0,0,0,0,70,188,64,0,0,0,0,0,226,176,64,0,0,0,0,0,120,189,64,0,0,0,0,0,253,176,64,0,0,0,0,0,139,190,64,0,0,0,0,0,199,176,64,0,0,0,0,0,200,191,64,0,0,0,0,0,137,176,64,0,0,0,0,0,42,192,64,0,0,0,0,0,236,175,64,0,0,0,0,128,124,192,64,0,0,0,0,0,148,174,64,0,0,0,0,0,66,192,64,0,0,0,0,0,138,172,64,0,0,0,0,0,212,191,64,0,0,0,0,0,122,169,64,0,0,0,0,0,72,192,64,0,0,0,0,0,4,170,64,0,0,0,0,128,160,192,64,0,0,0,0,0,184,170,64,0,0,0,0,128,216,192,64,0,0,0,0,0,50,171,64,0,0,0,0,0,234,192,64,0,0,0,0,0,42,171,64])
.concat([0,0,0,0,128,13,193,64,0,0,0,0,0,24,171,64,0,0,0,0,0,234,193,64,0,0,0,0,0,250,172,64,0,0,0,0,128,196,194,64,0,0,0,0,0,216,174,64,0,0,0,0,0,210,194,64,0,0,0,0,0,202,174,64,0,0,0,0,128,219,194,64,0,0,0,0,0,192,174,64,0,0,0,0,128,226,194,64,0,0,0,0,0,126,174,64,0,0,0,0,0,243,194,64,0,0,0,0,0,2,174,64,0,0,0,0,128,15,195,64,0,0,0,0,0,106,173,64,0,0,0,0,0,98,195,64,0,0,0,0,0,202,173,64,254,253,253,253,253,253,237,63,213,212,212,212,212,212,228,63,93,93,93,93,93,93,221,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,195,64,0,0,0,0,0,16,174,64,0,0,0,0,128,146,195,64,0,0,0,0,0,58,174,64,0,0,0,0,128,224,195,64,0,0,0,0,0,232,173,64,0,0,0,0,128,67,196,64,0,0,0,0,0,134,173,64,0,0,0,0,0,135,196,64,0,0,0,0,0,132,173,64,0,0,0,0,128,144,197,64,0,0,0,0,0,124,173,64,0,0,0,0,0,31,199,64,0,0,0,0,0,249,176,64,0,0,0,0,0,84,199,64,0,0,0,0,0,114,178,64,0,0,0,0,0,191,195,64,0,0,0,0,0,248,177,64,0,0,0,0,0,79,195,64,0,0,0,0,0,72,178,64,0,0,0,0,0,223,194,64,0,0,0,0,0,152,178,64,0,0,0,0,0,142,184,64,0,0,0,0,0,248,180,64,0,0,0,0,0,114,172,64,0,0,0,0,0,80,184,64,0,0,0,0,0,18,171,64,0,0,0,0,0,160,181,64,0,0,0,0,0,56,169,64,0,0,0,0,0,28,177,64,0,0,0,0,0,80,172,64,0,0,0,0,0,212,179,64,0,0,0,0,0,0,173,64,0,0,0,0,0,99,179,64,0,0,0,0,0,246,174,64,0,0,0,0,0,239,180,64,0,0,0,0,0,110,177,64,0,0,0,0,0,104,179,64,0,0,0,0,0,15,179,64,0,0,0,0,0,27,178,64,0,0,0,0,0,233,179,64,0,0,0,0,0,87,178,64,0,0,0,0,0,121,180,64,0,0,0,0,0,126,178,64,0,0,0,0,0,142,180,64,0,0,0,0,0,40,179,64,0,0,0,0,0,152,180,64,0,0,0,0,0,122,179,64,0,0,0,0,0,212,180,64,0,0,0,0,0,118,179,64,0,0,0,0,0,62,181,64,0,0,0,0,0,88,179,64,0,0,0,0,0,184,181,64,0,0,0,0,0,2,179,64,0,0,0,0,0,60,182,64,0,0,0,0,0,165,178,64,0,0,0,0,0,188,182,64,0,0,0,0,0,106,178,64,0,0,0,0,0,98,184,64,0,0,0,0,0,169,177,64,0,0,0,0,0,14,186,64,0,0,0,0,0,72,178,64,0,0,0,0,0,190,188,64,0,0,0,0,0,152,179,64,0,0,0,0,0,78,187,64,0,0,0,0,0,8,178,64,0,0,0,0,0,110,185,64,0,0,0,0,0,112,175,64,0,0,0,0,0,190,186,64,0,0,0,0,0,152,176,64,0,0,0,0,0,64,187,64,0,0,0,0,0,238,176,64,0,0,0,0,0,102,188,64,0,0,0,0,0,13,177,64,0,0,0,0,0,153,189,64,0,0,0,0,0,45,177,64,0,0,0,0,0,170,190,64,0,0,0,0,0,250,176,64,0,0,0,0,0,229,191,64,0,0,0,0,0,191,176,64,0,0,0,0,0,56,192,64,0,0,0,0,0,41,176,64,0,0,0,0,128,137,192,64,0,0,0,0,0,244,174,64,0,0,0,0,0,79,192,64,0,0,0,0,0,208,172,64,0,0,0,0,0,245,191,64,0,0,0,0,0,188,169,64,0,0,0,0,128,86,192,64,0,0,0,0,0,70,170,64,0,0,0,0,128,173,192,64,0,0,0,0,0,252,170,64,0,0,0,0,128,228,192,64,0,0,0,0,0,122,171,64,0,0,0,0,0,247,192,64,0,0,0,0,0,112,171,64,0,0,0,0,128,26,193,64,0,0,0,0,0,94,171,64,0,0,0,0,0,247,193,64,0,0,0,0,0,64,173,64,0,0,0,0,128,209,194,64,0,0,0,0,0,30,175,64,0,0,0,0,0,223,194,64,0,0,0,0,0,16,175,64,0,0,0,0,128,232,194,64,0,0,0,0,0,6,175,64,0,0,0,0,128,239,194,64,0,0,0,0,0,196,174,64,0,0,0,0,0,0,195,64,0,0,0,0,0,72,174,64,0,0,0,0,128,28,195,64,0,0,0,0,0,176,173,64,0,0,0,0,0,111,195,64,0,0,0,0,0,16,174,64,62,62,62,62,62,62,238,63,118,118,118,118,118,118,230,63,49,49,49,49,49,49,225,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,176,195,64,0,0,0,0,0,96,174,64,0,0,0,0,128,236,195,64,0,0,0,0,0,42,174,64,0,0,0,0,0,79,196,64,0,0,0,0,0,194,173,64,0,0,0,0,0,144,196,64,0,0,0,0,0,190,173,64,0,0,0,0,128,149,197,64,0,0,0,0,0,170,173,64,0,0,0,0,0,36,199,64,0,0,0,0,0,16,177,64,0,0,0,0,128,88,199,64,0,0,0,0,0,147,178,64,0,0,0,0,0,204,195,64,0,0,0,0,0,27,178,64,0,0,0,0,0,92,195,64,0,0,0,0,0,107,178,64,0,0,0,0,0,236,194,64,0,0,0,0,0,187,178,64,0,0,0,0,0,168,184,64,0,0,0,0,0,27,181,64,0,0,0,0,0,140,172,64,0,0,0,0,0,141,184,64,0,0,0,0,0,44,171,64,0,0,0,0,0,221,181,64,0,0,0,0,0,126,169,64,0,0,0,0,0,91,177,64,0,0,0,0,0,78,172,64,0,0,0,0,0,243,179,64,0,0,0,0,0,14,173,64,0,0,0,0,0,160,179,64,0,0,0,0,0,248,174,64,0,0,0,0,0,33,181,64,0,0,0,0,0,136,177,64,0,0,0,0,0,139,179,64,0,0,0,0,0,42,179,64,0,0,0,0,0,65,178,64,0,0,0,0,0,4,180,64,0,0,0,0,0,123,178,64,0,0,0,0,0,147,180,64,0,0,0,0,0,162,178,64,0,0,0,0,0,168,180,64,0,0,0,0,0,75,179,64,0,0,0,0,0,178,180,64,0,0,0,0,0,157,179,64,0,0,0,0,0,238,180,64,0,0,0,0,0,153,179,64,0,0,0,0,0,88,181,64,0,0,0,0,0,123,179,64,0,0,0,0,0,210,181,64,0,0,0,0,0,37,179,64,0,0,0,0,0,86,182,64,0,0,0,0,0,200,178,64,0,0,0,0,0,214,182,64,0,0,0,0,0,141,178,64,0,0,0,0,0,124,184,64,0,0,0,0,0,204,177,64,0,0,0,0,0,40,186,64,0,0,0,0,0,107,178,64,0,0,0,0,0,216,188,64,0,0,0,0,0,187,179,64,0,0,0,0,0,104,187,64,0,0,0,0,0,43,178,64,0,0,0,0,0,136,185,64,0,0,0,0,0,182,175,64,0,0,0,0,0,216,186,64,0,0,0,0,0,187,176,64,0,0,0,0,0,89,187,64,0,0,0,0,0,17,177,64,0,0,0,0,0,134,188,64,0,0,0,0,0,46,177,64,0,0,0,0,0,189,189,64,0,0,0,0,0,78,177,64,0,0,0,0,0,214,190,64,0,0,0,0,0,26,177,64,0,0,0,0,0,11,192,64,0,0,0,0,0,222,176,64,0,0,0,0,0,79,192,64,0,0,0,0,0,73,176,64,0,0,0,0,0,159,192,64,0,0,0,0,0,52,175,64,0,0,0,0,0,92,192,64,0,0,0,0,0,22,173,64,0,0,0,0,0,250,191,64,0,0,0,0,0,22,170,64,0,0,0,0,128,93,192,64,0,0,0,0,0,152,170,64,0,0,0,0,128,184,192,64,0,0,0,0,0,72,171,64,0,0,0,0,0,242,192,64,0,0,0,0,0,190,171,64,0,0,0,0,0,4,193,64,0,0,0,0,0,182,171,64,0,0,0,0,128,39,193,64,0,0,0,0,0,164,171,64,0,0,0,0,0,4,194,64,0,0,0,0,0,134,173,64,0,0,0,0,128,222,194,64,0,0,0,0,0,100,175,64,0,0,0,0,0,236,194,64,0,0,0,0,0,86,175,64,0,0,0,0,128,245,194,64,0,0,0,0,0,76,175,64,0,0,0,0,128,252,194,64,0,0,0,0,0,10,175,64,0,0,0,0,0,13,195,64,0,0,0,0,0,142,174,64,0,0,0,0,128,41,195,64,0,0,0,0,0,246,173,64,0,0,0,0,0,124,195,64,0,0,0,0,0,86,174,64,0,0,0,0,128,176,195,64,0,0,0,0,0,96,174,64,159,158,158,158,158,158,238,63,248,247,247,247,247,247,231,63,180,179,179,179,179,179,227,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,137,195,64,0,0,0,0,0,154,174,64,0,0,0,0,0,172,195,64,0,0,0,0,0,196,174,64,0,0,0,0,0,248,195,64,0,0,0,0,0,106,174,64,0,0,0,0,0,89,196,64,0,0,0,0,0,254,173,64,0,0,0,0,0,153,196,64,0,0,0,0,0,248,173,64,0,0,0,0,128,155,197,64,0,0,0,0,0,222,173,64,0,0,0,0,0,41,199,64,0,0,0,0,0,40,177,64,0,0,0,0,128,92,199,64,0,0,0,0,0,181,178,64,0,0,0,0,0,217,195,64,0,0,0,0,0,61,178,64,0,0,0,0,0,105,195,64,0,0,0,0,0,141,178,64,0,0,0,0,0,249,194,64,0,0,0,0,0,221,178,64,0,0,0,0,0,194,184,64,0,0,0,0,0,61,181,64,0,0,0,0,0,168,172,64,0,0,0,0,0,203,184,64,0,0,0,0,0,72,171,64,0,0,0,0,0,27,182,64,0,0,0,0,0,206,169,64,0,0,0,0,0,181,177,64,0,0,0,0,0,78,172,64,0,0,0,0,0,17,180,64,0,0,0,0,0,30,173,64,0,0,0,0,0,220,179,64,0,0,0,0,0,252,174,64,0,0,0,0,0,83,181,64,0,0,0,0,0,162,177,64,0,0,0,0,0,173,179,64,0,0,0,0,0,71,179,64,0,0,0,0,0,101,178,64,0,0,0,0,0,31,180,64,0,0,0,0,0,159,178,64,0,0,0,0,0,173,180,64,0,0,0,0,0,197,178,64,0,0,0,0,0,194,180,64,0,0,0,0,0,109,179,64,0,0,0,0,0,204,180,64,0,0,0,0,0,191,179,64,0,0,0,0,0,8,181,64,0,0,0,0,0,187,179,64,0,0,0,0,0,114,181,64,0,0,0,0,0,157,179,64,0,0,0,0,0,236,181,64,0,0,0,0,0,71,179,64,0,0,0,0,0,112,182,64,0,0,0,0,0,234,178,64,0,0,0,0,0,240,182,64,0,0,0,0,0,175,178,64,0,0,0,0,0,150,184,64,0,0,0,0,0,238,177,64,0,0,0,0,0,66,186,64,0,0,0,0,0,141,178,64,0,0,0,0,0,242,188,64,0,0,0,0,0,221,179,64,0,0,0,0,0,130,187,64,0,0,0,0,0,77,178,64,0,0,0,0,0,162,185,64,0,0,0,0,0,250,175,64,0,0,0,0,0,242,186,64,0,0,0,0,0,221,176,64,0,0,0,0,0,116,187,64,0,0,0,0,0,52,177,64,0,0,0,0,0,163,188,64,0,0,0,0,0,84,177,64,0,0,0,0,0,222,189,64,0,0,0,0,0,119,177,64,0,0,0,0,0,249,190,64,0,0,0,0,0,69,177,64,0,0,0,0,0,30,192,64,0,0,0,0,0,12,177,64,0,0,0,0,0,97,192,64,0,0,0,0,0,117,176,64,0,0,0,0,0,176,192,64,0,0,0,0,0,136,175,64,0,0,0,0,0,105,192,64,0,0,0,0,0,90,173,64,0,0,0,0,128,7,192,64,0,0,0,0,0,94,170,64,0,0,0,0,0,105,192,64,0,0,0,0,0,224,170,64,0,0,0,0,0,197,192,64,0,0,0,0,0,140,171,64,0,0,0,0,128,255,192,64,0,0,0,0,0,2,172,64,0,0,0,0,0,17,193,64,0,0,0,0,0,250,171,64,0,0,0,0,128,52,193,64,0,0,0,0,0,232,171,64,0,0,0,0,0,17,194,64,0,0,0,0,0,202,173,64,0,0,0,0,128,235,194,64,0,0,0,0,0,168,175,64,0,0,0,0,0,249,194,64,0,0,0,0,0,154,175,64,0,0,0,0,128,2,195,64,0,0,0,0,0,144,175,64,0,0,0,0,128,9,195,64,0,0,0,0,0,78,175,64,0,0,0,0,0,26,195,64,0,0,0,0,0,210,174,64,0,0,0,0,128,54,195,64,0,0,0,0,0,58,174,64,0,0,0,0,0,137,195,64,0,0,0,0,0,154,174,64,223,222,222,222,222,222,238,63,154,153,153,153,153,153,233,63,22,22,22,22,22,22,230,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,150,195,64,0,0,0,0,0,224,174,64,0,0,0,0,0,185,195,64,0,0,0,0,0,10,175,64,0,0,0,0,0,4,196,64,0,0,0,0,0,172,174,64,0,0,0,0,128,98,196,64,0,0,0,0,0,60,174,64,0,0,0,0,0,162,196,64,0,0,0,0,0,50,174,64,0,0,0,0,128,160,197,64,0,0,0,0,0,12,174,64,0,0,0,0,0,46,199,64,0,0,0,0,0,63,177,64,0,0,0,0,0,97,199,64,0,0,0,0,0,214,178,64,0,0,0,0,0,230,195,64,0,0,0,0,0,96,178,64,0,0,0,0,0,118,195,64,0,0,0,0,0,176,178,64,0,0,0,0,0,6,195,64,0,0,0,0,0,0,179,64,0,0,0,0,0,220,184,64,0,0,0,0,0,96,181,64,0,0,0,0,0,194,172,64,0,0,0,0,0,8,185,64,0,0,0,0,0,98,171,64,0,0,0,0,0,88,182,64,0,0,0,0,0,12,170,64,0,0,0,0,0,248,177,64,0,0,0,0,0,76,172,64,0,0,0,0,0,48,180,64,0,0,0,0,0,44,173,64,0,0,0,0,0,25,180,64,0,0,0,0,0,254,174,64,0,0,0,0,0,133,181,64,0,0,0,0,0,188,177,64,0,0,0,0,0,208,179,64,0,0,0,0,0,98,179,64,0,0,0,0,0,139,178,64,0,0,0,0,0,58,180,64,0,0,0,0,0,195,178,64,0,0,0,0,0,199,180,64,0,0,0,0,0,232,178,64,0,0,0,0,0,220,180,64,0,0,0,0,0,144,179,64,0,0,0,0,0,230,180,64,0,0,0,0,0,226,179,64,0,0,0,0,0,34,181,64,0,0,0,0,0,222,179,64,0,0,0,0,0,140,181,64,0,0,0,0,0,192,179,64,0,0,0,0,0,6,182,64,0,0,0,0,0,106,179,64,0,0,0,0,0,138,182,64,0,0,0,0,0,13,179,64,0,0,0,0,0,10,183,64,0,0,0,0,0,210,178,64,0,0,0,0,0,176,184,64,0,0,0,0,0,17,178,64,0,0,0,0,0,92,186,64,0,0,0,0,0,176,178,64,0,0,0,0,0,12,189,64,0,0,0,0,0,0,180,64,0,0,0,0,0,156,187,64,0,0,0,0,0,112,178,64,0,0,0,0,0,188,185,64,0,0,0,0,0,32,176,64,0,0,0,0,0,12,187,64,0,0,0,0,0,0,177,64,0,0,0,0,0,140,187,64,0,0,0,0,0,86,177,64,0,0,0,0,0,194,188,64,0,0,0,0,0,118,177,64,0,0,0,0,0,255,189,64,0,0,0,0,0,151,177,64,0,0,0,0,0,31,191,64,0,0,0,0,0,101,177,64,0,0,0,0,0,51,192,64,0,0,0,0,0,42,177,64,0,0,0,0,128,116,192,64,0,0,0,0,0,149,176,64,0,0,0,0,0,195,192,64,0,0,0,0,0,202,175,64,0,0,0,0,0,118,192,64,0,0,0,0,0,160,173,64,0,0,0,0,128,13,192,64,0,0,0,0,0,178,170,64,0,0,0,0,128,113,192,64,0,0,0,0,0,46,171,64,0,0,0,0,0,208,192,64,0,0,0,0,0,214,171,64,0,0,0,0,0,12,193,64,0,0,0,0,0,72,172,64,0,0,0,0,0,30,193,64,0,0,0,0,0,64,172,64,0,0,0,0,128,65,193,64,0,0,0,0,0,46,172,64,0,0,0,0,0,30,194,64,0,0,0,0,0,16,174,64,0,0,0,0,128,248,194,64,0,0,0,0,0,238,175,64,0,0,0,0,0,6,195,64,0,0,0,0,0,224,175,64,0,0,0,0,128,15,195,64,0,0,0,0,0,214,175,64,0,0,0,0,128,22,195,64,0,0,0,0,0,148,175,64,0,0,0,0,0,39,195,64,0,0,0,0,0,24,175,64,0,0,0,0,128,67,195,64,0,0,0,0,0,128,174,64,0,0,0,0,0,150,195,64,0,0,0,0,0,224,174,64,31,31,31,31,31,31,239,63,59,59,59,59,59,59,235,63,153,152,152,152,152,152,232,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,221,192,64,0,0,0,0,0,28,172,64,0,0,0,0,0,25,193,64,0,0,0,0,0,144,172,64,0,0,0,0,0,43,193,64,0,0,0,0,0,134,172,64,0,0,0,0,128,78,193,64,0,0,0,0,0,116,172,64,0,0,0,0,0,43,194,64,0,0,0,0,0,86,174,64,0,0,0,0,128,5,195,64,0,0,0,0,0,26,176,64,0,0,0,0,0,19,195,64,0,0,0,0,0,19,176,64,0,0,0,0,128,28,195,64,0,0,0,0,0,14,176,64,0,0,0,0,128,35,195,64,0,0,0,0,0,218,175,64,0,0,0,0,0,52,195,64,0,0,0,0,0,94,175,64,0,0,0,0,128,80,195,64,0,0,0,0,0,198,174,64,0,0,0,0,0,163,195,64,0,0,0,0,0,38,175,64,0,0,0,0,128,198,195,64,0,0,0,0,0,80,175,64,0,0,0,0,128,15,196,64,0,0,0,0,0,240,174,64,0,0,0,0,0,108,196,64,0,0,0,0,0,120,174,64,0,0,0,0,0,171,196,64,0,0,0,0,0,108,174,64,0,0,0,0,128,165,197,64,0,0,0,0,0,58,174,64,0,0,0,0,0,51,199,64,0,0,0,0,0,86,177,64,0,0,0,0,128,101,199,64,0,0,0,0,0,248,178,64,0,0,0,0,0,243,195,64,0,0,0,0,0,131,178,64,0,0,0,0,0,131,195,64,0,0,0,0,0,211,178,64,0,0,0,0,0,19,195,64,0,0,0,0,0,35,179,64,0,0,0,0,0,246,184,64,0,0,0,0,0,131,181,64,0,0,0,0,0,220,172,64,0,0,0,0,0,69,185,64,0,0,0,0,0,124,171,64,0,0,0,0,0,149,182,64,0,0,0,0,0,44,170,64,0,0,0,0,0,63,178,64,0,0,0,0,0,76,172,64,0,0,0,0,0,79,180,64,0,0,0,0,0,60,173,64,0,0,0,0,0,86,180,64,0,0,0,0,0,2,175,64,0,0,0,0,0,183,181,64,0,0,0,0,0,214,177,64,0,0,0,0,0,243,179,64,0,0,0,0,0,125,179,64,0,0,0,0,0,175,178,64,0,0,0,0,0,85,180,64,0,0,0,0,0,231,178,64,0,0,0,0,0,225,180,64,0,0,0,0,0,12,179,64,0,0,0,0,0,246,180,64,0,0,0,0,0,179,179,64,0,0,0,0,0,0,181,64,0,0,0,0,0,5,180,64,0,0,0,0,0,60,181,64,0,0,0,0,0,1,180,64,0,0,0,0,0,166,181,64,0,0,0,0,0,227,179,64,0,0,0,0,0,32,182,64,0,0,0,0,0,141,179,64,0,0,0,0,0,164,182,64,0,0,0,0,0,48,179,64,0,0,0,0,0,36,183,64,0,0,0,0,0,245,178,64,0,0,0,0,0,202,184,64,0,0,0,0,0,52,178,64,0,0,0,0,0,118,186,64,0,0,0,0,0,211,178,64,0,0,0,0,0,38,189,64,0,0,0,0,0,35,180,64,0,0,0,0,0,182,187,64,0,0,0,0,0,147,178,64,0,0,0,0,0,214,185,64,0,0,0,0,0,67,176,64,0,0,0,0,0,38,187,64,0,0,0,0,0,35,177,64,0,0,0,0,0,166,187,64,0,0,0,0,0,121,177,64,0,0,0,0,0,220,188,64,0,0,0,0,0,153,177,64,0,0,0,0,0,25,190,64,0,0,0,0,0,186,177,64,0,0,0,0,0,57,191,64,0,0,0,0,0,136,177,64,0,0,0,0,0,64,192,64,0,0,0,0,0,77,177,64,0,0,0,0,128,129,192,64,0,0,0,0,0,184,176,64,0,0,0,0,0,208,192,64,0,0,0,0,0,8,176,64,0,0,0,0,0,131,192,64,0,0,0,0,0,230,173,64,0,0,0,0,128,27,192,64,0,0,0,0,0,248,170,64,0,0,0,0,0,127,192,64,0,0,0,0,0,116,171,64,0,0,0,0,128,148,192,64,0,0,0,0,0,142,171,64,0,0,0,0,128,221,192,64,0,0,0,0,0,28,172,64,95,95,95,95,95,95,239,63,221,220,220,220,220,220,236,63,27,27,27,27,27,27,235,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,235,192,64,0,0,0,0,0,96,172,64,0,0,0,0,0,38,193,64,0,0,0,0,0,214,172,64,0,0,0,0,128,56,193,64,0,0,0,0,0,204,172,64,0,0,0,0,0,92,193,64,0,0,0,0,0,186,172,64,0,0,0,0,128,56,194,64,0,0,0,0,0,156,174,64,0,0,0,0,0,19,195,64,0,0,0,0,0,61,176,64,0,0,0,0,128,32,195,64,0,0,0,0,0,54,176,64,0,0,0,0,0,42,195,64,0,0,0,0,0,49,176,64,0,0,0,0,0,49,195,64,0,0,0,0,0,16,176,64,0,0,0,0,128,65,195,64,0,0,0,0,0,164,175,64,0,0,0,0,0,94,195,64,0,0,0,0,0,12,175,64,0,0,0,0,128,176,195,64,0,0,0,0,0,108,175,64,0,0,0,0,0,212,195,64,0,0,0,0,0,150,175,64,0,0,0,0,0,28,196,64,0,0,0,0,0,50,175,64,0,0,0,0,0,118,196,64,0,0,0,0,0,182,174,64,0,0,0,0,128,180,196,64,0,0,0,0,0,166,174,64,0,0,0,0,128,171,197,64,0,0,0,0,0,104,174,64,0,0,0,0,128,56,199,64,0,0,0,0,0,109,177,64,0,0,0,0,0,106,199,64,0,0,0,0,0,25,179,64,0,0,0,0,128,0,196,64,0,0,0,0,0,166,178,64,0,0,0,0,128,144,195,64,0,0,0,0,0,246,178,64,0,0,0,0,128,32,195,64,0,0,0,0,0,70,179,64,0,0,0,0,0,17,185,64,0,0,0,0,0,166,181,64,0,0,0,0,0,246,172,64,0,0,0,0,0,130,185,64,0,0,0,0,0,150,171,64,0,0,0,0,0,210,182,64,0,0,0,0,0,68,170,64,0,0,0,0,0,142,178,64,0,0,0,0,0,76,172,64,0,0,0,0,0,110,180,64,0,0,0,0,0,76,173,64,0,0,0,0,0,147,180,64,0,0,0,0,0,4,175,64,0,0,0,0,0,232,181,64,0,0,0,0,0,241,177,64,0,0,0,0,0,22,180,64,0,0,0,0,0,154,179,64,0,0,0,0,0,212,178,64,0,0,0,0,0,113,180,64,0,0,0,0,0,12,179,64,0,0,0,0,0,252,180,64,0,0,0,0,0,48,179,64,0,0,0,0,0,17,181,64,0,0,0,0,0,214,179,64,0,0,0,0,0,27,181,64,0,0,0,0,0,40,180,64,0,0,0,0,0,87,181,64,0,0,0,0,0,36,180,64,0,0,0,0,0,193,181,64,0,0,0,0,0,6,180,64,0,0,0,0,0,59,182,64,0,0,0,0,0,176,179,64,0,0,0,0,0,191,182,64,0,0,0,0,0,83,179,64,0,0,0,0,0,63,183,64,0,0,0,0,0,24,179,64,0,0,0,0,0,229,184,64,0,0,0,0,0,87,178,64,0,0,0,0,0,145,186,64,0,0,0,0,0,246,178,64,0,0,0,0,0,65,189,64,0,0,0,0,0,70,180,64,0,0,0,0,0,209,187,64,0,0,0,0,0,182,178,64,0,0,0,0,0,241,185,64,0,0,0,0,0,102,176,64,0,0,0,0,0,65,187,64,0,0,0,0,0,70,177,64,0,0,0,0,0,196,187,64,0,0,0,0,0,157,177,64,0,0,0,0,0,247,188,64,0,0,0,0,0,191,177,64,0,0,0,0,0,56,190,64,0,0,0,0,0,228,177,64,0,0,0,0,0,84,191,64,0,0,0,0,0,180,177,64,0,0,0,0,0,77,192,64,0,0,0,0,0,125,177,64,0,0,0,0,0,143,192,64,0,0,0,0,0,229,176,64,0,0,0,0,128,221,192,64,0,0,0,0,0,51,176,64,0,0,0,0,128,144,192,64,0,0,0,0,0,44,174,64,0,0,0,0,128,42,192,64,0,0,0,0,0,56,171,64,0,0,0,0,128,141,192,64,0,0,0,0,0,184,171,64,0,0,0,0,128,235,192,64,0,0,0,0,0,96,172,64,192,191,191,191,191,191,239,63,94,94,94,94,94,94,238,63,125,125,125,125,125,125,237,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,250,192,64,0,0,0,0,0,164,172,64,0,0,0,0,128,51,193,64,0,0,0,0,0,26,173,64,0,0,0,0,128,69,193,64,0,0,0,0,0,18,173,64,0,0,0,0,0,105,193,64,0,0,0,0,0,0,173,64,0,0,0,0,128,69,194,64,0,0,0,0,0,226,174,64,0,0,0,0,0,32,195,64,0,0,0,0,0,96,176,64,0,0,0,0,128,45,195,64,0,0,0,0,0,89,176,64,0,0,0,0,0,55,195,64,0,0,0,0,0,84,176,64,0,0,0,0,0,62,195,64,0,0,0,0,0,51,176,64,0,0,0,0,128,78,195,64,0,0,0,0,0,234,175,64,0,0,0,0,0,107,195,64,0,0,0,0,0,82,175,64,0,0,0,0,128,189,195,64,0,0,0,0,0,178,175,64,0,0,0,0,0,225,195,64,0,0,0,0,0,220,175,64,0,0,0,0,128,39,196,64,0,0,0,0,0,116,175,64,0,0,0,0,0,132,196,64,0,0,0,0,0,242,174,64,0,0,0,0,128,189,196,64,0,0,0,0,0,226,174,64,0,0,0,0,128,176,197,64,0,0,0,0,0,152,174,64,0,0,0,0,128,61,199,64,0,0,0,0,0,133,177,64,0,0,0,0,0,110,199,64,0,0,0,0,0,59,179,64,0,0,0,0,128,13,196,64,0,0,0,0,0,201,178,64,0,0,0,0,128,157,195,64,0,0,0,0,0,25,179,64,0,0,0,0,128,45,195,64,0,0,0,0,0,105,179,64,0,0,0,0,0,43,185,64,0,0,0,0,0,201,181,64,0,0,0,0,0,16,173,64,0,0,0,0,0,191,185,64,0,0,0,0,0,176,171,64,0,0,0,0,0,15,183,64,0,0,0,0,0,74,170,64,0,0,0,0,0,189,178,64,0,0,0,0,0,74,172,64,0,0,0,0,0,141,180,64,0,0,0,0,0,90,173,64,0,0,0,0,0,207,180,64,0,0,0,0,0,8,175,64,0,0,0,0,0,26,182,64,0,0,0,0,0,11,178,64,0,0,0,0,0,57,180,64,0,0,0,0,0,183,179,64,0,0,0,0,0,250,178,64,0,0,0,0,0,140,180,64,0,0,0,0,0,48,179,64,0,0,0,0,0,22,181,64,0,0,0,0,0,84,179,64,0,0,0,0,0,43,181,64,0,0,0,0,0,249,179,64,0,0,0,0,0,53,181,64,0,0,0,0,0,75,180,64,0,0,0,0,0,113,181,64,0,0,0,0,0,71,180,64,0,0,0,0,0,219,181,64,0,0,0,0,0,41,180,64,0,0,0,0,0,85,182,64,0,0,0,0,0,211,179,64,0,0,0,0,0,217,182,64,0,0,0,0,0,118,179,64,0,0,0,0,0,89,183,64,0,0,0,0,0,59,179,64,0,0,0,0,0,255,184,64,0,0,0,0,0,122,178,64,0,0,0,0,0,171,186,64,0,0,0,0,0,25,179,64,0,0,0,0,0,91,189,64,0,0,0,0,0,105,180,64,0,0,0,0,0,235,187,64,0,0,0,0,0,217,178,64,0,0,0,0,0,11,186,64,0,0,0,0,0,137,176,64,0,0,0,0,0,91,187,64,0,0,0,0,0,105,177,64,0,0,0,0,0,221,187,64,0,0,0,0,0,192,177,64,0,0,0,0,0,15,189,64,0,0,0,0,0,232,177,64,0,0,0,0,0,77,190,64,0,0,0,0,0,18,178,64,0,0,0,0,0,104,191,64,0,0,0,0,0,230,177,64,0,0,0,0,0,87,192,64,0,0,0,0,0,178,177,64,0,0,0,0,0,153,192,64,0,0,0,0,0,25,177,64,0,0,0,0,128,231,192,64,0,0,0,0,0,99,176,64,0,0,0,0,128,157,192,64,0,0,0,0,0,114,174,64,0,0,0,0,128,62,192,64,0,0,0,0,0,114,171,64,0,0,0,0,0,159,192,64,0,0,0,0,0,244,171,64,0,0,0,0,0,250,192,64,0,0,0,0,0,164,172,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,175,192,64,0,0,0,0,0,54,172,64,0,0,0,0,0,8,193,64,0,0,0,0,0,232,172,64,0,0,0,0,0,64,193,64,0,0,0,0,0,98,173,64,0,0,0,0,128,82,193,64,0,0,0,0,0,88,173,64,0,0,0,0,0,118,193,64,0,0,0,0,0,70,173,64,0,0,0,0,128,82,194,64,0,0,0,0,0,40,175,64,0,0,0,0,0,45,195,64,0,0,0,0,0,131,176,64,0,0,0,0,128,58,195,64,0,0,0,0,0,124,176,64,0,0,0,0,0,68,195,64,0,0,0,0,0,119,176,64,0,0,0,0,0,75,195,64,0,0,0,0,0,86,176,64,0,0,0,0,128,91,195,64,0,0,0,0,0,24,176,64,0,0,0,0,0,120,195,64,0,0,0,0,0,152,175,64,0,0,0,0,128,202,195,64,0,0,0,0,0,248,175,64,0,0,0,0,128,238,195,64,0,0,0,0,0,17,176,64,0,0,0,0,128,51,196,64,0,0,0,0,0,184,175,64,0,0,0,0,0,139,196,64,0,0,0,0,0,50,175,64,0,0,0,0,128,198,196,64,0,0,0,0,0,28,175,64,0,0,0,0,128,181,197,64,0,0,0,0,0,200,174,64,0,0,0,0,128,66,199,64,0,0,0,0,0,156,177,64,0,0,0,0,128,114,199,64,0,0,0,0,0,92,179,64,0,0,0,0,128,26,196,64,0,0,0,0,0,236,178,64,0,0,0,0,128,170,195,64,0,0,0,0,0,60,179,64,0,0,0,0,128,58,195,64,0,0,0,0,0,140,179,64,0,0,0,0,0,69,185,64,0,0,0,0,0,236,181,64,0,0,0,0,0,42,173,64,0,0,0,0,0,252,185,64,0,0,0,0,0,202,171,64,0,0,0,0,0,76,183,64,0,0,0,0,0,74,170,64,0,0,0,0,0,244,178,64,0,0,0,0,0,74,172,64,0,0,0,0,0,172,180,64,0,0,0,0,0,106,173,64,0,0,0,0,0,12,181,64,0,0,0,0,0,10,175,64,0,0,0,0,0,76,182,64,0,0,0,0,0,37,178,64,0,0,0,0,0,92,180,64,0,0,0,0,0,210,179,64,0,0,0,0,0,30,179,64,0,0,0,0,0,167,180,64,0,0,0,0,0,84,179,64,0,0,0,0,0,48,181,64,0,0,0,0,0,119,179,64,0,0,0,0,0,69,181,64,0,0,0,0,0,28,180,64,0,0,0,0,0,79,181,64,0,0,0,0,0,110,180,64,0,0,0,0,0,139,181,64,0,0,0,0,0,106,180,64,0,0,0,0,0,245,181,64,0,0,0,0,0,76,180,64,0,0,0,0,0,111,182,64,0,0,0,0,0,246,179,64,0,0,0,0,0,243,182,64,0,0,0,0,0,153,179,64,0,0,0,0,0,115,183,64,0,0,0,0,0,94,179,64,0,0,0,0,0,25,185,64,0,0,0,0,0,157,178,64,0,0,0,0,0,197,186,64,0,0,0,0,0,60,179,64,0,0,0,0,0,117,189,64,0,0,0,0,0,140,180,64,0,0,0,0,0,5,188,64,0,0,0,0,0,252,178,64,0,0,0,0,0,37,186,64,0,0,0,0,0,172,176,64,0,0,0,0,0,117,187,64,0,0,0,0,0,140,177,64,0,0,0,0,0,233,187,64,0,0,0,0,0,218,177,64,0,0,0,0,0,23,189,64,0,0,0,0,0,11,178,64,0,0,0,0,0,93,190,64,0,0,0,0,0,64,178,64,0,0,0,0,0,119,191,64,0,0,0,0,0,33,178,64,0,0,0,0,128,99,192,64,0,0,0,0,0,252,177,64,0,0,0,0,128,166,192,64,0,0,0,0,0,96,177,64,0,0,0,0,128,247,192,64,0,0,0,0,0,167,176,64,0,0,0,0,128,170,192,64,0,0,0,0,0,184,174,64,0,0,0,0,128,80,192,64,0,0,0,0,0,176,171,64,0,0,0,0,0,175,192,64,0,0,0,0,0,54,172,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,101,177,64,0,0,0,0,0,4,183,64,0,0,0,0,0,213,176,64,0,0,0,0,0,236,183,64,0,0,0,0,0,117,178,64,0,0,0,0,0,244,184,64,0,0,0,0,0,145,178,64,0,0,0,0,0,16,185,64,0,0,0,0,0,41,177,64,0,0,0,0,0,188,184,64,0,0,0,0,0,173,176,64,0,0,0,0,0,148,184,64,0,0,0,0,0,141,176,64,0,0,0,0,0,196,183,64,0,0,0,0,0,45,176,64,0,0,0,0,0,108,183,64,0,0,0,0,0,154,175,64,0,0,0,0,0,252,182,64,0,0,0,0,0,218,174,64,0,0,0,0,0,140,182,64,0,0,0,0,0,101,177,64,0,0,0,0,0,4,183,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,171,189,64,0,0,0,0,0,196,181,64,0,0,0,0,0,183,189,64,0,0,0,0,0,100,181,64,0,0,0,0,0,85,188,64,0,0,0,0,0,76,179,64,0,0,0,0,0,69,188,64,0,0,0,0,0,188,178,64,0,0,0,0,0,5,191,64,0,0,0,0,0,252,180,64,0,0,0,0,128,74,192,64,0,0,0,0,0,108,182,64,0,0,0,0,0,173,191,64,0,0,0,0,0,172,183,64,0,0,0,0,0,189,190,64,0,0,0,0,0,140,186,64,0,0,0,0,0,13,190,64,0,0,0,0,0,244,183,64,0,0,0,0,0,205,189,64,0,0,0,0,0,164,183,64,0,0,0,0,0,124,189,64,0,0,0,0,0,62,183,64,0,0,0,0,0,171,189,64,0,0,0,0,0,196,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,69,179,64,0,0,0,0,0,92,187,64,0,0,0,0,0,229,179,64,0,0,0,0,0,44,187,64,0,0,0,0,0,229,179,64,0,0,0,0,0,172,187,64,0,0,0,0,0,117,179,64,0,0,0,0,0,92,188,64,0,0,0,0,0,37,180,64,0,0,0,0,0,28,188,64,0,0,0,0,0,27,180,64,0,0,0,0,0,252,188,64,0,0,0,0,0,105,180,64,0,0,0,0,0,70,189,64,0,0,0,0,0,176,180,64,0,0,0,0,0,120,189,64,0,0,0,0,0,222,180,64,0,0,0,0,0,151,189,64,0,0,0,0,0,245,180,64,0,0,0,0,0,188,189,64,0,0,0,0,0,69,181,64,0,0,0,0,0,60,190,64,0,0,0,0,0,197,180,64,0,0,0,0,0,220,190,64,0,0,0,0,0,213,180,64,0,0,0,0,0,92,190,64,0,0,0,0,0,133,179,64,0,0,0,0,0,188,189,64,0,0,0,0,0,213,179,64,0,0,0,0,0,92,189,64,0,0,0,0,0,117,179,64,0,0,0,0,0,188,188,64,0,0,0,0,0,229,178,64,0,0,0,0,0,252,188,64,0,0,0,0,0,37,179,64,0,0,0,0,0,204,188,64,0,0,0,0,0,53,179,64,0,0,0,0,0,236,187,64,0,0,0,0,0,181,178,64,0,0,0,0,0,28,188,64,0,0,0,0,0,213,179,64,0,0,0,0,0,172,185,64,0,0,0,0,0,245,178,64,0,0,0,0,0,28,185,64,0,0,0,0,0,165,179,64,0,0,0,0,0,44,185,64,0,0,0,0,0,122,180,64,0,0,0,0,0,72,185,64,0,0,0,0,0,69,179,64,0,0,0,0,0,92,187,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,125,181,64,0,0,0,0,0,36,186,64,0,0,0,0,0,181,181,64,0,0,0,0,0,20,186,64,0,0,0,0,0,125,181,64,0,0,0,0,0,108,186,64,0,0,0,0,0,13,181,64,0,0,0,0,0,52,186,64,0,0,0,0,0,93,178,64,0,0,0,0,0,28,188,64,0,0,0,0,0,170,178,64,0,0,0,0,0,161,187,64,0,0,0,0,0,5,180,64,0,0,0,0,0,222,186,64,0,0,0,0,0,34,181,64,0,0,0,0,0,62,186,64,0,0,0,0,0,125,181,64,0,0,0,0,0,36,186,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,77,182,64,0,0,0,0,0,196,186,64,0,0,0,0,0,133,182,64,0,0,0,0,0,180,186,64,0,0,0,0,0,77,182,64,0,0,0,0,0,12,187,64,0,0,0,0,0,221,181,64,0,0,0,0,0,212,186,64,0,0,0,0,0,45,179,64,0,0,0,0,0,188,188,64,0,0,0,0,0,122,179,64,0,0,0,0,0,65,188,64,0,0,0,0,0,213,180,64,0,0,0,0,0,126,187,64,0,0,0,0,0,242,181,64,0,0,0,0,0,222,186,64,0,0,0,0,0,77,182,64,0,0,0,0,0,196,186,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,85,183,64,0,0,0,0,0,148,185,64,0,0,0,0,0,141,183,64,0,0,0,0,0,132,185,64,0,0,0,0,0,85,183,64,0,0,0,0,0,220,185,64,0,0,0,0,0,229,182,64,0,0,0,0,0,164,185,64,0,0,0,0,0,53,180,64,0,0,0,0,0,140,187,64,0,0,0,0,0,130,180,64,0,0,0,0,0,17,187,64,0,0,0,0,0,221,181,64,0,0,0,0,0,78,186,64,0,0,0,0,0,250,182,64,0,0,0,0,0,174,185,64,0,0,0,0,0,85,183,64,0,0,0,0,0,148,185,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,77,181,64,0,0,0,0,0,220,188,64,0,0,0,0,0,133,181,64,0,0,0,0,0,204,188,64,0,0,0,0,0,133,181,64,0,0,0,0,0,68,189,64,0,0,0,0,0,21,181,64,0,0,0,0,0,12,189,64,0,0,0,0,0,205,177,64,0,0,0,0,0,12,191,64,0,0,0,0,0,26,178,64,0,0,0,0,0,145,190,64,0,0,0,0,0,165,179,64,0,0,0,0,0,178,189,64,0,0,0,0,0,242,180,64,0,0,0,0,0,246,188,64,0,0,0,0,0,77,181,64,0,0,0,0,0,220,188,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,125,181,64,0,0,0,0,0,28,188,64,0,0,0,0,0,181,181,64,0,0,0,0,0,12,188,64,0,0,0,0,0,157,181,64,0,0,0,0,0,108,188,64,0,0,0,0,0,29,181,64,0,0,0,0,0,20,188,64,0,0,0,0,0,205,178,64,0,0,0,0,0,196,189,64,0,0,0,0,0,27,179,64,0,0,0,0,0,72,189,64,0,0,0,0,0,67,180,64,0,0,0,0,0,168,188,64,0,0,0,0,0,71,181,64,0,0,0,0,0,28,188,64,0,0,0,0,0,125,181,64,0,0,0,0,0,28,188,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,189,182,64,0,0,0,0,0,214,192,64,0,0,0,0,0,213,182,64,0,0,0,0,0,146,192,64,0,0,0,0,0,189,182,64,0,0,0,0,0,82,192,64,0,0,0,0,0,125,182,64,0,0,0,0,0,78,192,64,0,0,0,0,0,13,182,64,0,0,0,0,0,182,192,64,0,0,0,0,0,13,182,64,0,0,0,0,0,74,192,64,0,0,0,0,0,117,181,64,0,0,0,0,0,70,192,64,0,0,0,0,0,5,181,64,0,0,0,0,0,66,192,64,0,0,0,0,0,53,180,64,0,0,0,0,0,194,192,64,0,0,0,0,0,69,180,64,0,0,0,0,0,142,192,64,0,0,0,0,0,205,180,64,0,0,0,0,0,30,192,64,0,0,0,0,0,133,180,64,0,0,0,0,0,18,192,64,0,0,0,0,0,181,179,64,0,0,0,0,0,94,192,64,0,0,0,0,0,125,180,64,0,0,0,0,0,18,192,64,0,0,0,0,0,45,190,64,0,0,0,0,0,124,188,64,0,0,0,0,0,5,190,64,0,0,0,0,0,242,192,64,0,0,0,0,0,69,189,64,0,0,0,0,0,186,192,64,0,0,0,0,0,229,188,64,0,0,0,0,0,200,192,64,0,0,0,0,0,120,188,64,0,0,0,0,0,156,192,64,0,0,0,0,0,248,187,64,0,0,0,0,128,104,192,64,0,0,0,0,0,213,187,64,0,0,0,0,0,102,192,64,0,0,0,0,0,101,187,64,0,0,0,0,0,94,192,64,0,0,0,0,0,165,187,64,0,0,0,0,0,234,192,64,0,0,0,0,0,61,187,64,0,0,0,0,0,86,192,64,0,0,0,0,0,101,187,64,0,0,0,0,0,206,192,64,0,0,0,0,0,69,187,64,0,0,0,0,0,206,192,64,0,0,0,0,0,221,187,64,0,0,0,0,0,166,193,64,0,0,0,0,0,181,187,64,0,0,0,0,0,150,193,64,0,0,0,0,0,13,187,64,0,0,0,0,0,194,192,64,0,0,0,0,0,245,186,64,0,0,0,0,0,130,192,64])
.concat([0,0,0,0,0,109,186,64,0,0,0,0,0,130,192,64,0,0,0,0,0,4,186,64,0,0,0,0,0,100,192,64,0,0,0,0,0,117,186,64,0,0,0,0,128,203,192,64,0,0,0,0,0,45,186,64,0,0,0,0,0,148,192,64,0,0,0,0,0,109,185,64,0,0,0,0,0,134,192,64,0,0,0,0,0,15,185,64,0,0,0,0,128,114,192,64,0,0,0,0,0,91,185,64,0,0,0,0,0,188,192,64,0,0,0,0,0,251,184,64,0,0,0,0,0,102,192,64,0,0,0,0,0,93,184,64,0,0,0,0,0,114,192,64,0,0,0,0,0,46,184,64,0,0,0,0,0,118,192,64,0,0,0,0,0,194,183,64,0,0,0,0,128,114,193,64,0,0,0,0,0,205,183,64,0,0,0,0,128,80,193,64,0,0,0,0,0,205,183,64,0,0,0,0,0,250,192,64,0,0,0,0,0,221,183,64,0,0,0,0,0,134,192,64,0,0,0,0,0,93,183,64,0,0,0,0,0,154,192,64,0,0,0,0,0,13,183,64,0,0,0,0,0,138,192,64,0,0,0,0,0,189,182,64,0,0,0,0,0,214,192,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,45,190,64,0,0,0,0,0,188,183,64,0,0,0,0,0,37,191,64,0,0,0,0,0,140,184,64,0,0,0,0,0,45,191,64,0,0,0,0,0,36,185,64,0,0,0,0,0,52,191,64,0,0,0,0,0,160,185,64,0,0,0,0,0,136,190,64,0,0,0,0,0,177,187,64,0,0,0,0,0,213,189,64,0,0,0,0,0,218,189,64,0,0,0,0,0,77,189,64,0,0,0,0,0,188,190,64,0,0,0,0,0,162,188,64,0,0,0,0,0,217,191,64,0,0,0,0,0,21,188,64,0,0,0,0,0,37,192,64,0,0,0,0,0,83,187,64,0,0,0,0,128,114,192,64,0,0,0,0,0,77,186,64,0,0,0,0,0,98,192,64,0,0,0,0,0,173,184,64,0,0,0,0,0,58,192,64,0,0,0,0,0,173,182,64,0,0,0,0,0,98,192,64,0,0,0,0,0,101,180,64,0,0,0,0,0,82,192,64,0,0,0,0,0,45,180,64,0,0,0,0,0,2,192,64,0,0,0,0,0,245,179,64,0,0,0,0,0,100,191,64,0,0,0,0,0,13,181,64,0,0,0,0,0,52,190,64,0,0,0,0,0,101,181,64,0,0,0,0,0,140,189,64,0,0,0,0,0,77,181,64,0,0,0,0,0,108,188,64,0,0,0,0,0,48,181,64,0,0,0,0,0,81,186,64,0,0,0,0,0,25,181,64,0,0,0,0,0,7,185,64,0,0,0,0,0,221,180,64,0,0,0,0,0,228,184,64,0,0,0,0,0,5,182,64,0,0,0,0,0,108,184,64,0,0,0,0,0,37,185,64,0,0,0,0,0,228,184,64,0,0,0,0,0,181,185,64,0,0,0,0,0,236,184,64,0,0,0,0,0,61,186,64,0,0,0,0,0,60,184,64,0,0,0,0,0,156,186,64,0,0,0,0,0,193,183,64,0,0,0,0,0,208,187,64,0,0,0,0,0,95,183,64,0,0,0,0,0,243,188,64,0,0,0,0,0,3,183,64,0,0,0,0,0,93,189,64,0,0,0,0,0,36,183,64,0,0,0,0,0,29,190,64,0,0,0,0,0,164,183,64,0,0,0,0,0,45,190,64,0,0,0,0,0,188,183,64,221,220,220,220,220,220,236,63,154,153,153,153,153,153,217,63,146,145,145,145,145,145,225,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,188,64,0,0,0,0,0,76,185,64,0,0,0,0,0,93,190,64,0,0,0,0,0,140,185,64,0,0,0,0,0,141,189,64,0,0,0,0,0,108,187,64,0,0,0,0,0,141,188,64,0,0,0,0,0,228,190,64,0,0,0,0,0,181,186,64,0,0,0,0,0,14,192,64,0,0,0,0,0,144,183,64,0,0,0,0,0,199,191,64,0,0,0,0,0,181,182,64,0,0,0,0,0,252,191,64,0,0,0,0,0,43,182,64,0,0,0,0,0,14,192,64,0,0,0,0,0,117,181,64,0,0,0,0,0,230,191,64,0,0,0,0,0,200,180,64,0,0,0,0,0,178,191,64,0,0,0,0,0,237,180,64,0,0,0,0,0,148,191,64,0,0,0,0,0,61,183,64,0,0,0,0,0,124,186,64,0,0,0,0,0,149,182,64,0,0,0,0,0,12,185,64,0,0,0,0,0,157,187,64,0,0,0,0,0,12,185,64,0,0,0,0,0,253,188,64,0,0,0,0,0,76,185,64,118,118,118,118,118,118,230,63,154,153,153,153,153,153,201,63,86,86,86,86,86,86,214,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,201,189,64,0,0,0,0,0,116,186,64,0,0,0,0,0,221,184,64,0,0,0,0,0,148,187,64,0,0,0,0,0,181,183,64,0,0,0,0,0,180,186,64,0,0,0,0,0,108,182,64,0,0,0,0,0,118,187,64,0,0,0,0,0,226,182,64,0,0,0,0,0,179,185,64,0,0,0,0,0,149,182,64,0,0,0,0,0,12,185,64,0,0,0,0,0,117,187,64,0,0,0,0,0,140,185,64,0,0,0,0,0,85,188,64,0,0,0,0,0,236,183,64,0,0,0,0,0,144,188,64,0,0,0,0,0,124,183,64,0,0,0,0,0,49,189,64,0,0,0,0,0,172,184,64,0,0,0,0,0,208,189,64,0,0,0,0,0,214,185,64,0,0,0,0,0,201,189,64,0,0,0,0,0,116,186,64,213,212,212,212,212,212,228,63,19,19,19,19,19,19,195,63,19,19,19,19,19,19,211,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,157,186,64,0,0,0,0,0,124,190,64,0,0,0,0,0,237,185,64,0,0,0,0,0,52,190,64,0,0,0,0,0,125,185,64,0,0,0,0,0,116,190,64,0,0,0,0,0,77,184,64,0,0,0,0,0,220,190,64,0,0,0,0,0,30,184,64,0,0,0,0,0,234,190,64,0,0,0,0,0,209,183,64,0,0,0,0,0,184,190,64,0,0,0,0,0,109,183,64,0,0,0,0,0,124,190,64,0,0,0,0,0,61,183,64,0,0,0,0,0,116,190,64,0,0,0,0,0,21,183,64,0,0,0,0,0,28,190,64,0,0,0,0,0,157,182,64,0,0,0,0,0,252,189,64,0,0,0,0,0,133,182,64,0,0,0,0,0,180,189,64,0,0,0,0,0,189,182,64,0,0,0,0,0,156,189,64,0,0,0,0,0,237,182,64,0,0,0,0,0,76,189,64,0,0,0,0,0,197,182,64,0,0,0,0,0,188,188,64,0,0,0,0,0,253,187,64,0,0,0,0,0,20,188,64,0,0,0,0,0,21,188,64,0,0,0,0,0,28,188,64,0,0,0,0,0,37,188,64,0,0,0,0,0,33,188,64,0,0,0,0,0,197,187,64,0,0,0,0,0,168,188,64,0,0,0,0,0,69,187,64,0,0,0,0,0,76,189,64,0,0,0,0,0,224,186,64,0,0,0,0,0,177,189,64,0,0,0,0,0,213,186,64,0,0,0,0,0,28,190,64,0,0,0,0,0,204,186,64,0,0,0,0,0,108,190,64,0,0,0,0,0,157,186,64,0,0,0,0,0,124,190,64,0,0,0,0,0,0,240,63,221,220,220,220,220,220,220,63,224,223,223,223,223,223,223,63,0,0,0,0,0,0,240,63,0,0,0,0,0,191,188,64,0,0,0,0,0,109,186,64,0,0,0,0,0,110,188,64,0,0,0,0,0,33,188,64,0,0,0,0,0,10,188,64,0,0,0,0,0,75,188,64,0,0,0,0,0,119,187,64,0,0,0,0,0,132,188,64,0,0,0,0,0,21,187,64,0,0,0,0,0,6,189,64,0,0,0,0,0,20,187,64,0,0,0,0,0,10,189,64,0,0,0,0,0,210,186,64,0,0,0,0,0,42,190,64,0,0,0,0,0,39,186,64,0,0,0,0,0,18,190,64,0,0,0,0,0,109,185,64,0,0,0,0,0,218,189,64,0,0,0,0,0,62,184,64,0,0,0,0,0,34,190,64,0,0,0,0,0,82,183,64,0,0,0,0,0,3,190,64,0,0,0,0,0,2,183,64,0,0,0,0,0,171,189,64,0,0,0,0,0,202,182,64,0,0,0,0,0,49,189,64,0,0,0,0,0,148,182,64,0,0,0,0,0,185,188,64,0,0,0,0,0,159,182,64,0,0,0,0,0,126,188,64,0,0,0,0,0,175,182,64,0,0,0,0,0,46,188,64,0,0,0,0,0,173,182,64,0,0,0,0,0,13,188,64,0,0,0,0,0,170,182,64,0,0,0,0,0,202,187,64,0,0,0,0,0,127,182,64,0,0,0,0,0,89,187,64,0,0,0,0,0,64,182,64,0,0,0,0,0,179,186,64,0,0,0,0,0,118,182,64,0,0,0,0,0,252,184,64,0,0,0,0,0,51,183,64,0,0,0,0,0,207,184,64,0,0,0,0,0,211,183,64,0,0,0,0,0,218,184,64,0,0,0,0,0,27,184,64,0,0,0,0,0,223,184,64,0,0,0,0,0,180,184,64,0,0,0,0,0,1,185,64,0,0,0,0,0,182,184,64,0,0,0,0,0,1,185,64,0,0,0,0,0,100,185,64,0,0,0,0,0,7,185,64,0,0,0,0,0,103,185,64,0,0,0,0,0,7,185,64,0,0,0,0,0,196,185,64,0,0,0,0,0,240,184,64,0,0,0,0,0,52,186,64,0,0,0,0,0,131,184,64,0,0,0,0,0,12,187,64,0,0,0,0,0,177,183,64,0,0,0,0,0,223,187,64,0,0,0,0,0,181,183,64,0,0,0,0,0,144,188,64,0,0,0,0,0,186,183,64,0,0,0,0,0,212,188,64,0,0,0,0,0,65,184,64,0,0,0,0,0,16,189,64,0,0,0,0,0,187,184,64,0,0,0,0,0,191,188,64,0,0,0,0,0,109,186,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,230,188,64,0,0,0,0,0,56,184,64,0,0,0,0,0,38,189,64,0,0,0,0,0,181,184,64,0,0,0,0,0,211,188,64,0,0,0,0,0,113,186,64,0,0,0,0,0,126,188,64,0,0,0,0,0,53,188,64,0,0,0,0,0,17,188,64,0,0,0,0,0,94,188,64,0,0,0,0,0,132,187,64,0,0,0,0,0,148,188,64,0,0,0,0,0,39,187,64,0,0,0,0,0,16,189,64,0,0,0,0,0,224,186,64,0,0,0,0,0,68,190,64,0,0,0,0,0,36,186,64,0,0,0,0,0,38,190,64,0,0,0,0,0,34,186,64,0,0,0,0,0,38,190,64,0,0,0,0,0,108,185,64,0,0,0,0,0,238,189,64,0,0,0,0,0,64,184,64,0,0,0,0,0,54,190,64,0,0,0,0,0,60,184,64,0,0,0,0,0,54,190,64,0,0,0,0,0,76,183,64,0,0,0,0,0,22,190,64,0,0,0,0,0,70,183,64,0,0,0,0,0,19,190,64,0,0,0,0,0,242,182,64,0,0,0,0,0,185,189,64,0,0,0,0,0,184,182,64,0,0,0,0,0,57,189,64,0,0,0,0,0,126,182,64,0,0,0,0,0,185,188,64,0,0,0,0,0,139,182,64,0,0,0,0,0,122,188,64,0,0,0,0,0,155,182,64,0,0,0,0,0,46,188,64,0,0,0,0,0,153,182,64,0,0,0,0,0,14,188,64,0,0,0,0,0,150,182,64,0,0,0,0,0,206,187,64,0,0,0,0,0,108,182,64,0,0,0,0,0,96,187,64,0,0,0,0,0,43,182,64,0,0,0,0,0,182,186,64,0,0,0,0,0,99,182,64,0,0,0,0,0,243,184,64,0,0,0,0,0,99,182,64,0,0,0,0,0,240,184,64,0,0,0,0,0,102,182,64,0,0,0,0,0,238,184,64,0,0,0,0,0,104,182,64,0,0,0,0,0,235,184,64,0,0,0,0,0,107,182,64,0,0,0,0,0,235,184,64,0,0,0,0,0,46,183,64,0,0,0,0,0,187,184,64,0,0,0,0,0,212,183,64,0,0,0,0,0,198,184,64,0,0,0,0,0,29,184,64,0,0,0,0,0,203,184,64,0,0,0,0,0,184,184,64,0,0,0,0,0,237,184,64,0,0,0,0,0,100,185,64,0,0,0,0,0,243,184,64,0,0,0,0,0,188,185,64,0,0,0,0,0,220,184,64,0,0,0,0,0,38,186,64,0,0,0,0,0,117,184,64,0,0,0,0,0,5,187,64,0,0,0,0,0,155,183,64,0,0,0,0,0,223,187,64,0,0,0,0,0,161,183,64,0,0,0,0,0,224,187,64,0,0,0,0,0,161,183,64,0,0,0,0,0,158,188,64,0,0,0,0,0,166,183,64,0,0,0,0,0,230,188,64,0,0,0,0,0,56,184,64,0,0,0,0,0,191,188,64,0,0,0,0,0,109,186,64,0,0,0,0,0,16,189,64,0,0,0,0,0,187,184,64,0,0,0,0,0,212,188,64,0,0,0,0,0,65,184,64,0,0,0,0,0,144,188,64,0,0,0,0,0,186,183,64,0,0,0,0,0,223,187,64,0,0,0,0,0,181,183,64,0,0,0,0,0,12,187,64,0,0,0,0,0,177,183,64,0,0,0,0,0,52,186,64,0,0,0,0,0,131,184,64,0,0,0,0,0,196,185,64,0,0,0,0,0,240,184,64,0,0,0,0,0,103,185,64,0,0,0,0,0,7,185,64,0,0,0,0,0,100,185,64,0,0,0,0,0,7,185,64,0,0,0,0,0,182,184,64,0,0,0,0,0,1,185,64,0,0,0,0,0,180,184,64,0,0,0,0,0,1,185,64,0,0,0,0,0,27,184,64,0,0,0,0,0,223,184,64,0,0,0,0,0,211,183,64,0,0,0,0,0,218,184,64,0,0,0,0,0,51,183,64,0,0,0,0,0,207,184,64,0,0,0,0,0,118,182,64,0,0,0,0,0,252,184,64,0,0,0,0,0,64,182,64,0,0,0,0,0,179,186,64,0,0,0,0,0,127,182,64,0,0,0,0,0,89,187,64,0,0,0,0,0,170,182,64,0,0,0,0,0,202,187,64,0,0,0,0,0,173,182,64,0,0,0,0,0,13,188,64,0,0,0,0,0,175,182,64,0,0,0,0,0,46,188,64,0,0,0,0,0,159,182,64,0,0,0,0,0,126,188,64,0,0,0,0,0,148,182,64,0,0,0,0,0,185,188,64,0,0,0,0,0,202,182,64,0,0,0,0,0,49,189,64,0,0,0,0,0,2,183,64,0,0,0,0,0,171,189,64,0,0,0,0,0,82,183,64,0,0,0,0,0,3,190,64,0,0,0,0,0,62,184,64,0,0,0,0,0,34,190,64,0,0,0,0,0,109,185,64,0,0,0,0,0,218,189,64,0,0,0,0,0,39,186,64,0,0,0,0,0,18,190,64,0,0,0,0,0,210,186,64,0,0,0,0,0,42,190,64,0,0,0,0,0,20,187,64,0,0,0,0,0,10,189,64,0,0,0,0,0,21,187,64,0,0,0,0,0,6,189,64,0,0,0,0,0,119,187,64,0,0,0,0,0,132,188,64,0,0,0,0,0,10,188,64,0,0,0,0,0,75,188,64,0,0,0,0,0,110,188,64,0,0,0,0,0,33,188,64,0,0,0,0,0,191,188,64,0,0,0,0,0,109,186,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,186,179,64,0,0,0,0,0,96,189,64,0,0,0,0,0,98,180,64,0,0,0,0,0,89,190,64,0,0,0,0,0,36,182,64,0,0,0,0,0,161,190,64,0,0,0,0,0,37,182,64,0,0,0,0,0,161,190,64,0,0,0,0,0,118,182,64,0,0,0,0,0,168,190,64,0,0,0,0,0,136,182,64,0,0,0,0,0,204,190,64,0,0,0,0,0,40,182,64,0,0,0,0,0,238,191,64,0,0,0,0,0,230,180,64,0,0,0,0,0,159,191,64,0,0,0,0,0,96,180,64,0,0,0,0,0,102,191,64,0,0,0,0,0,146,179,64,0,0,0,0,0,210,189,64,0,0,0,0,0,103,179,64,0,0,0,0,0,97,189,64,0,0,0,0,0,114,179,64,0,0,0,0,0,68,189,64,0,0,0,0,0,118,179,64,0,0,0,0,0,58,189,64,0,0,0,0,0,134,179,64,0,0,0,0,0,63,189,64,0,0,0,0,0,153,179,64,0,0,0,0,0,69,189,64,0,0,0,0,0,185,179,64,0,0,0,0,0,95,189,64,0,0,0,0,0,186,179,64,0,0,0,0,0,96,189,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,186,179,64,0,0,0,0,0,96,189,64,0,0,0,0,0,185,179,64,0,0,0,0,0,95,189,64,0,0,0,0,0,153,179,64,0,0,0,0,0,69,189,64,0,0,0,0,0,134,179,64,0,0,0,0,0,63,189,64,0,0,0,0,0,118,179,64,0,0,0,0,0,58,189,64,0,0,0,0,0,114,179,64,0,0,0,0,0,68,189,64,0,0,0,0,0,103,179,64,0,0,0,0,0,97,189,64,0,0,0,0,0,146,179,64,0,0,0,0,0,210,189,64,0,0,0,0,0,96,180,64,0,0,0,0,0,102,191,64,0,0,0,0,0,230,180,64,0,0,0,0,0,159,191,64,0,0,0,0,0,40,182,64,0,0,0,0,0,238,191,64,0,0,0,0,0,136,182,64,0,0,0,0,0,204,190,64,0,0,0,0,0,118,182,64,0,0,0,0,0,168,190,64,0,0,0,0,0,37,182,64,0,0,0,0,0,161,190,64,0,0,0,0,0,36,182,64,0,0,0,0,0,161,190,64,0,0,0,0,0,98,180,64,0,0,0,0,0,89,190,64,0,0,0,0,0,186,179,64,0,0,0,0,0,96,189,64,0,0,0,0,0,192,179,64,0,0,0,0,0,88,189,64,0,0,0,0,0,193,179,64,0,0,0,0,0,89,189,64,0,0,0,0,0,104,180,64,0,0,0,0,0,79,190,64,0,0,0,0,0,38,182,64,0,0,0,0,0,151,190,64,0,0,0,0,0,129,182,64,0,0,0,0,0,159,190,64,0,0,0,0,0,146,182,64,0,0,0,0,0,202,190,64,0,0,0,0,0,146,182,64,0,0,0,0,0,206,190,64,0,0,0,0,0,49,182,64,0,0,0,0,0,250,191,64,0,0,0,0,0,228,180,64,0,0,0,0,0,169,191,64,0,0,0,0,0,227,180,64,0,0,0,0,0,169,191,64,0,0,0,0,0,90,180,64,0,0,0,0,0,113,191,64,0,0,0,0,0,137,179,64,0,0,0,0,0,215,189,64,0,0,0,0,0,137,179,64,0,0,0,0,0,214,189,64,0,0,0,0,0,91,179,64,0,0,0,0,0,95,189,64,0,0,0,0,0,105,179,64,0,0,0,0,0,64,189,64,0,0,0,0,0,112,179,64,0,0,0,0,0,44,189,64,0,0,0,0,0,137,179,64,0,0,0,0,0,53,189,64,0,0,0,0,0,157,179,64,0,0,0,0,0,59,189,64,0,0,0,0,0,192,179,64,0,0,0,0,0,88,189,64,154,153,153,153,153,153,233,63,16,16,16,16,16,16,208,63,19,19,19,19,19,19,211,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,230,188,64,0,0,0,0,0,226,184,64,0,0,0,0,0,204,188,64,0,0,0,0,0,205,185,64,0,0,0,0,0,183,188,64,0,0,0,0,0,241,185,64,0,0,0,0,0,181,187,64,0,0,0,0,0,9,186,64,0,0,0,0,0,45,186,64,0,0,0,0,0,28,186,64,0,0,0,0,0,117,185,64,0,0,0,0,0,28,186,64,0,0,0,0,0,85,185,64,0,0,0,0,0,92,186,64,0,0,0,0,0,69,185,64,0,0,0,0,0,236,185,64,0,0,0,0,0,91,182,64,0,0,0,0,0,212,186,64,0,0,0,0,0,74,182,64,0,0,0,0,0,11,186,64,0,0,0,0,0,109,182,64,0,0,0,0,0,244,184,64,0,0,0,0,0,47,183,64,0,0,0,0,0,197,184,64,0,0,0,0,0,211,183,64,0,0,0,0,0,208,184,64,0,0,0,0,0,28,184,64,0,0,0,0,0,213,184,64,0,0,0,0,0,182,184,64,0,0,0,0,0,247,184,64,0,0,0,0,0,100,185,64,0,0,0,0,0,253,184,64,0,0,0,0,0,191,185,64,0,0,0,0,0,231,184,64,0,0,0,0,0,45,186,64,0,0,0,0,0,124,184,64,0,0,0,0,0,226,186,64,0,0,0,0,0,204,183,64,0,0,0,0,0,166,187,64,0,0,0,0,0,170,183,64,0,0,0,0,0,129,188,64,0,0,0,0,0,134,183,64,0,0,0,0,0,221,188,64,0,0,0,0,0,60,184,64,0,0,0,0,0,242,188,64,0,0,0,0,0,103,184,64,0,0,0,0,0,230,188,64,0,0,0,0,0,226,184,64,213,212,212,212,212,212,228,63,26,26,26,26,26,26,186,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,95,185,64,0,0,0,0,0,18,185,64,0,0,0,0,0,89,185,64,0,0,0,0,0,12,185,64,0,0,0,0,0,89,185,64,0,0,0,0,0,4,185,64,0,0,0,0,0,89,185,64,0,0,0,0,0,252,184,64,0,0,0,0,0,95,185,64,0,0,0,0,0,246,184,64,0,0,0,0,0,101,185,64,0,0,0,0,0,240,184,64,0,0,0,0,0,109,185,64,0,0,0,0,0,240,184,64,0,0,0,0,0,117,185,64,0,0,0,0,0,240,184,64,0,0,0,0,0,123,185,64,0,0,0,0,0,246,184,64,0,0,0,0,0,229,185,64,0,0,0,0,0,93,185,64,0,0,0,0,0,152,185,64,0,0,0,0,0,43,186,64,0,0,0,0,0,148,185,64,0,0,0,0,0,50,186,64,0,0,0,0,0,124,184,64,0,0,0,0,0,105,187,64,0,0,0,0,0,161,184,64,0,0,0,0,0,121,188,64,0,0,0,0,0,157,184,64,0,0,0,0,0,136,188,64,0,0,0,0,0,144,184,64,0,0,0,0,0,144,188,64,0,0,0,0,0,129,184,64,0,0,0,0,0,140,188,64,0,0,0,0,0,122,184,64,0,0,0,0,0,135,188,64,0,0,0,0,0,121,184,64,0,0,0,0,0,127,188,64,0,0,0,0,0,79,184,64,0,0,0,0,0,96,187,64,0,0,0,0,0,116,185,64,0,0,0,0,0,25,186,64,0,0,0,0,0,180,185,64,0,0,0,0,0,106,185,64,0,0,0,0,0,95,185,64,0,0,0,0,0,18,185,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,73,182,64,0,0,0,0,0,113,191,64,0,0,0,0,0,48,182,64,0,0,0,0,0,147,191,64,0,0,0,0,0,251,181,64,0,0,0,0,0,172,191,64,0,0,0,0,0,221,181,64,0,0,0,0,0,186,191,64,0,0,0,0,0,202,181,64,0,0,0,0,0,183,191,64,0,0,0,0,0,184,181,64,0,0,0,0,0,180,191,64,0,0,0,0,0,178,181,64,0,0,0,0,0,162,191,64,0,0,0,0,0,178,181,64,0,0,0,0,0,163,191,64,0,0,0,0,0,135,181,64,0,0,0,0,0,38,191,64,0,0,0,0,0,155,181,64,0,0,0,0,0,9,191,64,0,0,0,0,0,165,181,64,0,0,0,0,0,253,190,64,0,0,0,0,0,188,181,64,0,0,0,0,0,5,191,64,0,0,0,0,0,215,181,64,0,0,0,0,0,15,191,64,0,0,0,0,0,2,182,64,0,0,0,0,0,48,191,64,0,0,0,0,0,3,182,64,0,0,0,0,0,49,191,64,0,0,0,0,0,50,182,64,0,0,0,0,0,68,191,64,0,0,0,0,0,68,182,64,0,0,0,0,0,86,191,64,0,0,0,0,0,82,182,64,0,0,0,0,0,100,191,64,0,0,0,0,0,73,182,64,0,0,0,0,0,113,191,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,73,182,64,0,0,0,0,0,113,191,64,0,0,0,0,0,82,182,64,0,0,0,0,0,100,191,64,0,0,0,0,0,68,182,64,0,0,0,0,0,86,191,64,0,0,0,0,0,50,182,64,0,0,0,0,0,68,191,64,0,0,0,0,0,3,182,64,0,0,0,0,0,49,191,64,0,0,0,0,0,2,182,64,0,0,0,0,0,48,191,64,0,0,0,0,0,215,181,64,0,0,0,0,0,15,191,64,0,0,0,0,0,188,181,64,0,0,0,0,0,5,191,64,0,0,0,0,0,165,181,64,0,0,0,0,0,253,190,64,0,0,0,0,0,155,181,64,0,0,0,0,0,9,191,64,0,0,0,0,0,135,181,64,0,0,0,0,0,38,191,64,0,0,0,0,0,178,181,64,0,0,0,0,0,163,191,64,0,0,0,0,0,178,181,64,0,0,0,0,0,162,191,64,0,0,0,0,0,184,181,64,0,0,0,0,0,180,191,64,0,0,0,0,0,202,181,64,0,0,0,0,0,183,191,64,0,0,0,0,0,221,181,64,0,0,0,0,0,186,191,64,0,0,0,0,0,251,181,64,0,0,0,0,0,172,191,64,0,0,0,0,0,48,182,64,0,0,0,0,0,147,191,64,0,0,0,0,0,73,182,64,0,0,0,0,0,113,191,64,0,0,0,0,0,75,182,64,0,0,0,0,0,79,191,64,0,0,0,0,0,96,182,64,0,0,0,0,0,100,191,64,0,0,0,0,0,81,182,64,0,0,0,0,0,119,191,64,0,0,0,0,0,54,182,64,0,0,0,0,0,155,191,64,0,0,0,0,0,255,181,64,0,0,0,0,0,181,191,64,0,0,0,0,0,221,181,64,0,0,0,0,0,196,191,64,0,0,0,0,0,201,181,64,0,0,0,0,0,193,191,64,0,0,0,0,0,178,181,64,0,0,0,0,0,190,191,64,0,0,0,0,0,169,181,64,0,0,0,0,0,166,191,64,0,0,0,0,0,123,181,64,0,0,0,0,0,34,191,64,0,0,0,0,0,147,181,64,0,0,0,0,0,3,191,64,0,0,0,0,0,159,181,64,0,0,0,0,0,241,190,64,0,0,0,0,0,191,181,64,0,0,0,0,0,252,190,64,0,0,0,0,0,219,181,64,0,0,0,0,0,5,191,64,0,0,0,0,0,8,182,64,0,0,0,0,0,40,191,64,0,0,0,0,0,56,182,64,0,0,0,0,0,60,191,64,0,0,0,0,0,75,182,64,0,0,0,0,0,79,191,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,86,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,129,182,64,0,0,0,0,0,120,191,64,0,0,0,0,0,144,182,64,0,0,0,0,0,135,191,64,0,0,0,0,0,149,182,64,0,0,0,0,0,143,191,64,0,0,0,0,0,145,182,64,0,0,0,0,0,145,191,64,0,0,0,0,0,108,182,64,0,0,0,0,0,154,191,64,0,0,0,0,0,92,182,64,0,0,0,0,0,187,191,64,0,0,0,0,0,22,182,64,0,0,0,0,0,183,191,64,0,0,0,0,0,245,181,64,0,0,0,0,0,87,191,64,0,0,0,0,0,4,182,64,0,0,0,0,0,65,191,64,0,0,0,0,0,11,182,64,0,0,0,0,0,56,191,64,0,0,0,0,0,29,182,64,0,0,0,0,0,62,191,64,0,0,0,0,0,51,182,64,0,0,0,0,0,69,191,64,0,0,0,0,0,85,182,64,0,0,0,0,0,96,191,64,0,0,0,0,0,86,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,100,182,64,0,0,0,0,0,194,191,64,0,0,0,0,0,98,182,64,0,0,0,0,0,197,191,64,0,0,0,0,0,95,182,64,0,0,0,0,0,197,191,64,0,0,0,0,0,18,182,64,0,0,0,0,0,193,191,64,0,0,0,0,0,15,182,64,0,0,0,0,0,192,191,64,0,0,0,0,0,14,182,64,0,0,0,0,0,190,191,64,0,0,0,0,0,233,181,64,0,0,0,0,0,83,191,64,0,0,0,0,0,252,181,64,0,0,0,0,0,59,191,64,0,0,0,0,0,6,182,64,0,0,0,0,0,43,191,64,0,0,0,0,0,33,182,64,0,0,0,0,0,53,191,64,0,0,0,0,0,91,182,64,0,0,0,0,0,88,191,64,0,0,0,0,0,136,182,64,0,0,0,0,0,113,191,64,0,0,0,0,0,151,182,64,0,0,0,0,0,128,191,64,0,0,0,0,0,159,182,64,0,0,0,0,0,144,191,64,0,0,0,0,0,148,182,64,0,0,0,0,0,155,191,64,0,0,0,0,0,147,182,64,0,0,0,0,0,155,191,64,0,0,0,0,0,113,182,64,0,0,0,0,0,163,191,64,0,0,0,0,0,100,182,64,0,0,0,0,0,194,191,64,0,0,0,0,0,86,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,85,182,64,0,0,0,0,0,96,191,64,0,0,0,0,0,51,182,64,0,0,0,0,0,69,191,64,0,0,0,0,0,29,182,64,0,0,0,0,0,62,191,64,0,0,0,0,0,11,182,64,0,0,0,0,0,56,191,64,0,0,0,0,0,4,182,64,0,0,0,0,0,65,191,64,0,0,0,0,0,245,181,64,0,0,0,0,0,87,191,64,0,0,0,0,0,22,182,64,0,0,0,0,0,183,191,64,0,0,0,0,0,92,182,64,0,0,0,0,0,187,191,64,0,0,0,0,0,108,182,64,0,0,0,0,0,154,191,64,0,0,0,0,0,145,182,64,0,0,0,0,0,145,191,64,0,0,0,0,0,149,182,64,0,0,0,0,0,143,191,64,0,0,0,0,0,144,182,64,0,0,0,0,0,135,191,64,0,0,0,0,0,129,182,64,0,0,0,0,0,120,191,64,0,0,0,0,0,86,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,182,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,225,182,64,0,0,0,0,0,119,191,64,0,0,0,0,0,239,182,64,0,0,0,0,0,133,191,64,0,0,0,0,0,245,182,64,0,0,0,0,0,142,191,64,0,0,0,0,0,240,182,64,0,0,0,0,0,146,191,64,0,0,0,0,0,241,182,64,0,0,0,0,0,146,191,64,0,0,0,0,0,225,182,64,0,0,0,0,0,150,191,64,0,0,0,0,0,198,182,64,0,0,0,0,0,187,191,64,0,0,0,0,0,118,182,64,0,0,0,0,0,183,191,64,0,0,0,0,0,85,182,64,0,0,0,0,0,87,191,64,0,0,0,0,0,100,182,64,0,0,0,0,0,65,191,64,0,0,0,0,0,107,182,64,0,0,0,0,0,56,191,64,0,0,0,0,0,125,182,64,0,0,0,0,0,62,191,64,0,0,0,0,0,147,182,64,0,0,0,0,0,69,191,64,0,0,0,0,0,181,182,64,0,0,0,0,0,96,191,64,0,0,0,0,0,182,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,182,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,181,182,64,0,0,0,0,0,96,191,64,0,0,0,0,0,147,182,64,0,0,0,0,0,69,191,64,0,0,0,0,0,125,182,64,0,0,0,0,0,62,191,64,0,0,0,0,0,107,182,64,0,0,0,0,0,56,191,64,0,0,0,0,0,100,182,64,0,0,0,0,0,65,191,64,0,0,0,0,0,85,182,64,0,0,0,0,0,87,191,64,0,0,0,0,0,118,182,64,0,0,0,0,0,183,191,64,0,0,0,0,0,198,182,64,0,0,0,0,0,187,191,64,0,0,0,0,0,225,182,64,0,0,0,0,0,150,191,64,0,0,0,0,0,241,182,64,0,0,0,0,0,146,191,64,0,0,0,0,0,240,182,64,0,0,0,0,0,146,191,64,0,0,0,0,0,245,182,64,0,0,0,0,0,142,191,64,0,0,0,0,0,239,182,64,0,0,0,0,0,133,191,64,0,0,0,0,0,225,182,64,0,0,0,0,0,119,191,64,0,0,0,0,0,182,182,64,0,0,0,0,0,97,191,64,0,0,0,0,0,244,182,64,0,0,0,0,0,155,191,64,0,0,0,0,0,230,182,64,0,0,0,0,0,160,191,64,0,0,0,0,0,204,182,64,0,0,0,0,0,195,191,64,0,0,0,0,0,202,182,64,0,0,0,0,0,197,191,64,0,0,0,0,0,200,182,64,0,0,0,0,0,197,191,64,0,0,0,0,0,114,182,64,0,0,0,0,0,193,191,64,0,0,0,0,0,111,182,64,0,0,0,0,0,192,191,64,0,0,0,0,0,110,182,64,0,0,0,0,0,190,191,64,0,0,0,0,0,73,182,64,0,0,0,0,0,83,191,64,0,0,0,0,0,92,182,64,0,0,0,0,0,59,191,64,0,0,0,0,0,102,182,64,0,0,0,0,0,43,191,64,0,0,0,0,0,129,182,64,0,0,0,0,0,53,191,64,0,0,0,0,0,187,182,64,0,0,0,0,0,88,191,64,0,0,0,0,0,231,182,64,0,0,0,0,0,111,191,64,0,0,0,0,0,246,182,64,0,0,0,0,0,126,191,64,0,0,0,0,0,255,182,64,0,0,0,0,0,142,191,64,0,0,0,0,0,255,182,64,0,0,0,0,0,150,191,64,0,0,0,0,0,244,182,64,0,0,0,0,0,155,191,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,58,183,64,0,0,0,0,0,101,191,64,0,0,0,0,0,101,183,64,0,0,0,0,0,123,191,64,0,0,0,0,0,115,183,64,0,0,0,0,0,138,191,64,0,0,0,0,0,121,183,64,0,0,0,0,0,146,191,64,0,0,0,0,0,117,183,64,0,0,0,0,0,150,191,64,0,0,0,0,0,107,183,64,0,0,0,0,0,152,191,64,0,0,0,0,0,77,183,64,0,0,0,0,0,189,191,64,0,0,0,0,0,250,182,64,0,0,0,0,0,187,191,64,0,0,0,0,0,217,182,64,0,0,0,0,0,91,191,64,0,0,0,0,0,232,182,64,0,0,0,0,0,69,191,64,0,0,0,0,0,239,182,64,0,0,0,0,0,60,191,64,0,0,0,0,0,1,183,64,0,0,0,0,0,66,191,64,0,0,0,0,0,23,183,64,0,0,0,0,0,73,191,64,0,0,0,0,0,57,183,64,0,0,0,0,0,100,191,64,0,0,0,0,0,58,183,64,0,0,0,0,0,101,191,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,183,64,0,0,0,0,0,57,191,64,0,0,0,0,0,27,183,64,0,0,0,0,0,64,191,64,0,0,0,0,0,63,183,64,0,0,0,0,0,92,191,64,0,0,0,0,0,122,183,64,0,0,0,0,0,131,191,64,0,0,0,0,0,131,183,64,0,0,0,0,0,147,191,64,0,0,0,0,0,131,183,64,0,0,0,0,0,155,191,64,0,0,0,0,0,120,183,64,0,0,0,0,0,159,191,64,0,0,0,0,0,83,183,64,0,0,0,0,0,197,191,64,0,0,0,0,0,81,183,64,0,0,0,0,0,199,191,64,0,0,0,0,0,79,183,64,0,0,0,0,0,199,191,64,0,0,0,0,0,246,182,64,0,0,0,0,0,197,191,64,0,0,0,0,0,243,182,64,0,0,0,0,0,196,191,64,0,0,0,0,0,242,182,64,0,0,0,0,0,194,191,64,0,0,0,0,0,205,182,64,0,0,0,0,0,87,191,64,0,0,0,0,0,224,182,64,0,0,0,0,0,63,191,64,0,0,0,0,0,234,182,64,0,0,0,0,0,47,191,64,0,0,0,0,0,5,183,64,0,0,0,0,0,57,191,64,0,0,0,0,0,58,183,64,0,0,0,0,0,101,191,64,0,0,0,0,0,57,183,64,0,0,0,0,0,100,191,64,0,0,0,0,0,23,183,64,0,0,0,0,0,73,191,64,0,0,0,0,0,1,183,64,0,0,0,0,0,66,191,64,0,0,0,0,0,239,182,64,0,0,0,0,0,60,191,64,0,0,0,0,0,232,182,64,0,0,0,0,0,69,191,64,0,0,0,0,0,217,182,64,0,0,0,0,0,91,191,64,0,0,0,0,0,250,182,64,0,0,0,0,0,187,191,64,0,0,0,0,0,77,183,64,0,0,0,0,0,189,191,64,0,0,0,0,0,107,183,64,0,0,0,0,0,152,191,64,0,0,0,0,0,117,183,64,0,0,0,0,0,150,191,64,0,0,0,0,0,121,183,64,0,0,0,0,0,146,191,64,0,0,0,0,0,115,183,64,0,0,0,0,0,138,191,64,0,0,0,0,0,101,183,64,0,0,0,0,0,123,191,64,0,0,0,0,0,58,183,64,0,0,0,0,0,101,191,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,188,183,64,0,0,0,0,0,99,191,64,0,0,0,0,0,225,183,64,0,0,0,0,0,114,191,64,0,0,0,0,0,239,183,64,0,0,0,0,0,128,191,64,0,0,0,0,0,250,183,64,0,0,0,0,0,139,191,64,0,0,0,0,0,243,183,64,0,0,0,0,0,149,191,64,0,0,0,0,0,243,183,64,0,0,0,0,0,150,191,64,0,0,0,0,0,220,183,64,0,0,0,0,0,190,191,64,0,0,0,0,0,123,183,64,0,0,0,0,0,185,191,64,0,0,0,0,0,90,183,64,0,0,0,0,0,90,191,64,0,0,0,0,0,106,183,64,0,0,0,0,0,67,191,64,0,0,0,0,0,113,183,64,0,0,0,0,0,58,191,64,0,0,0,0,0,131,183,64,0,0,0,0,0,64,191,64,0,0,0,0,0,153,183,64,0,0,0,0,0,72,191,64,0,0,0,0,0,187,183,64,0,0,0,0,0,98,191,64,0,0,0,0,0,188,183,64,0,0,0,0,0,99,191,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,252,183,64,0,0,0,0,0,155,191,64,0,0,0,0,0,228,183,64,0,0,0,0,0,198,191,64,0,0,0,0,0,226,183,64,0,0,0,0,0,200,191,64,0,0,0,0,0,223,183,64,0,0,0,0,0,200,191,64,0,0,0,0,0,119,183,64,0,0,0,0,0,195,191,64,0,0,0,0,0,116,183,64,0,0,0,0,0,194,191,64,0,0,0,0,0,115,183,64,0,0,0,0,0,192,191,64,0,0,0,0,0,78,183,64,0,0,0,0,0,86,191,64,0,0,0,0,0,98,183,64,0,0,0,0,0,61,191,64,0,0,0,0,0,108,183,64,0,0,0,0,0,46,191,64,0,0,0,0,0,135,183,64,0,0,0,0,0,55,191,64,0,0,0,0,0,193,183,64,0,0,0,0,0,90,191,64,0,0,0,0,0,232,183,64,0,0,0,0,0,106,191,64,0,0,0,0,0,247,183,64,0,0,0,0,0,121,191,64,0,0,0,0,0,8,184,64,0,0,0,0,0,139,191,64,0,0,0,0,0,252,183,64,0,0,0,0,0,155,191,64,0,0,0,0,0,188,183,64,0,0,0,0,0,99,191,64,0,0,0,0,0,187,183,64,0,0,0,0,0,98,191,64,0,0,0,0,0,153,183,64,0,0,0,0,0,72,191,64,0,0,0,0,0,131,183,64,0,0,0,0,0,64,191,64,0,0,0,0,0,113,183,64,0,0,0,0,0,58,191,64,0,0,0,0,0,106,183,64,0,0,0,0,0,67,191,64,0,0,0,0,0,90,183,64,0,0,0,0,0,90,191,64,0,0,0,0,0,123,183,64,0,0,0,0,0,185,191,64,0,0,0,0,0,220,183,64,0,0,0,0,0,190,191,64,0,0,0,0,0,243,183,64,0,0,0,0,0,150,191,64,0,0,0,0,0,243,183,64,0,0,0,0,0,149,191,64,0,0,0,0,0,250,183,64,0,0,0,0,0,139,191,64,0,0,0,0,0,239,183,64,0,0,0,0,0,128,191,64,0,0,0,0,0,225,183,64,0,0,0,0,0,114,191,64,0,0,0,0,0,188,183,64,0,0,0,0,0,99,191,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,153,184,64,0,0,0,0,0,154,191,64,0,0,0,0,0,124,184,64,0,0,0,0,0,207,191,64,0,0,0,0,0,95,184,64,0,0,0,0,0,227,191,64,0,0,0,0,0,1,184,64,0,0,0,0,0,200,191,64,0,0,0,0,0,211,183,64,0,0,0,0,0,81,191,64,0,0,0,0,0,231,183,64,0,0,0,0,0,53,191,64,0,0,0,0,0,251,183,64,0,0,0,0,0,27,191,64,0,0,0,0,0,82,184,64,0,0,0,0,0,88,191,64,0,0,0,0,0,83,184,64,0,0,0,0,0,89,191,64,0,0,0,0,0,130,184,64,0,0,0,0,0,108,191,64,0,0,0,0,0,148,184,64,0,0,0,0,0,126,191,64,0,0,0,0,0,162,184,64,0,0,0,0,0,140,191,64,0,0,0,0,0,153,184,64,0,0,0,0,0,153,191,64,0,0,0,0,0,153,184,64,0,0,0,0,0,154,191,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,155,184,64,0,0,0,0,0,119,191,64,0,0,0,0,0,176,184,64,0,0,0,0,0,140,191,64,0,0,0,0,0,162,184,64,0,0,0,0,0,159,191,64,0,0,0,0,0,133,184,64,0,0,0,0,0,213,191,64,0,0,0,0,0,131,184,64,0,0,0,0,0,214,191,64,0,0,0,0,0,252,183,64,0,0,0,0,0,209,191,64,0,0,0,0,0,250,183,64,0,0,0,0,0,208,191,64,0,0,0,0,0,249,183,64,0,0,0,0,0,206,191,64,0,0,0,0,0,199,183,64,0,0,0,0,0,78,191,64,0,0,0,0,0,223,183,64,0,0,0,0,0,47,191,64])
.concat([0,0,0,0,0,247,183,64,0,0,0,0,0,13,191,64,0,0,0,0,0,88,184,64,0,0,0,0,0,80,191,64,0,0,0,0,0,136,184,64,0,0,0,0,0,100,191,64,0,0,0,0,0,155,184,64,0,0,0,0,0,119,191,64,0,0,0,0,0,153,184,64,0,0,0,0,0,154,191,64,0,0,0,0,0,153,184,64,0,0,0,0,0,153,191,64,0,0,0,0,0,162,184,64,0,0,0,0,0,140,191,64,0,0,0,0,0,148,184,64,0,0,0,0,0,126,191,64,0,0,0,0,0,130,184,64,0,0,0,0,0,108,191,64,0,0,0,0,0,83,184,64,0,0,0,0,0,89,191,64,0,0,0,0,0,82,184,64,0,0,0,0,0,88,191,64,0,0,0,0,0,251,183,64,0,0,0,0,0,27,191,64,0,0,0,0,0,231,183,64,0,0,0,0,0,53,191,64,0,0,0,0,0,211,183,64,0,0,0,0,0,81,191,64,0,0,0,0,0,1,184,64,0,0,0,0,0,200,191,64,0,0,0,0,0,95,184,64,0,0,0,0,0,227,191,64,0,0,0,0,0,124,184,64,0,0,0,0,0,207,191,64,0,0,0,0,0,153,184,64,0,0,0,0,0,154,191,64,213,212,212,212,212,212,228,63,19,19,19,19,19,19,195,63,19,19,19,19,19,19,211,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,201,181,64,0,0,0,0,0,136,190,64,0,0,0,0,0,186,181,64,0,0,0,0,0,133,190,64,0,0,0,0,0,179,181,64,0,0,0,0,0,128,190,64,0,0,0,0,0,178,181,64,0,0,0,0,0,120,190,64,0,0,0,0,0,176,181,64,0,0,0,0,0,112,190,64,0,0,0,0,0,181,181,64,0,0,0,0,0,105,190,64,0,0,0,0,0,185,181,64,0,0,0,0,0,98,190,64,0,0,0,0,0,193,181,64,0,0,0,0,0,97,190,64,0,0,0,0,0,207,182,64,0,0,0,0,0,39,190,64,0,0,0,0,0,76,183,64,0,0,0,0,0,105,190,64,0,0,0,0,0,185,183,64,0,0,0,0,0,127,190,64,0,0,0,0,0,207,183,64,0,0,0,0,0,121,190,64,0,0,0,0,0,210,183,64,0,0,0,0,0,121,190,64,0,0,0,0,0,42,184,64,0,0,0,0,0,105,190,64,0,0,0,0,0,57,184,64,0,0,0,0,0,108,190,64,0,0,0,0,0,65,184,64,0,0,0,0,0,121,190,64,0,0,0,0,0,62,184,64,0,0,0,0,0,136,190,64,0,0,0,0,0,57,184,64,0,0,0,0,0,142,190,64,0,0,0,0,0,49,184,64,0,0,0,0,0,144,190,64,0,0,0,0,0,220,183,64,0,0,0,0,0,159,190,64,0,0,0,0,0,194,183,64,0,0,0,0,0,169,190,64,0,0,0,0,0,65,183,64,0,0,0,0,0,144,190,64,0,0,0,0,0,60,183,64,0,0,0,0,0,142,190,64,0,0,0,0,0,200,182,64,0,0,0,0,0,81,190,64,0,0,0,0,0,201,181,64,0,0,0,0,0,136,190,64,213,212,212,212,212,212,228,63,19,19,19,19,19,19,195,63,19,19,19,19,19,19,211,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,222,186,64,0,0,0,0,0,188,189,64,0,0,0,0,0,223,186,64,0,0,0,0,0,185,189,64,0,0,0,0,0,254,186,64,0,0,0,0,0,116,189,64,0,0,0,0,0,67,187,64,0,0,0,0,0,75,189,64,0,0,0,0,0,82,187,64,0,0,0,0,0,73,189,64,0,0,0,0,0,90,187,64,0,0,0,0,0,74,189,64,0,0,0,0,0,94,187,64,0,0,0,0,0,82,189,64,0,0,0,0,0,97,187,64,0,0,0,0,0,97,189,64,0,0,0,0,0,88,187,64,0,0,0,0,0,109,189,64,0,0,0,0,0,30,187,64,0,0,0,0,0,144,189,64,0,0,0,0,0,4,187,64,0,0,0,0,0,201,189,64,0,0,0,0,0,210,186,64,0,0,0,0,0,117,190,64,0,0,0,0,0,203,186,64,0,0,0,0,0,127,190,64,0,0,0,0,0,191,186,64,0,0,0,0,0,131,190,64,0,0,0,0,0,77,186,64,0,0,0,0,0,128,190,64,0,0,0,0,0,70,186,64,0,0,0,0,0,127,190,64,0,0,0,0,0,97,185,64,0,0,0,0,0,45,190,64,0,0,0,0,0,124,184,64,0,0,0,0,0,49,191,64,0,0,0,0,0,111,184,64,0,0,0,0,0,56,191,64,0,0,0,0,0,102,184,64,0,0,0,0,0,57,191,64,0,0,0,0,0,96,184,64,0,0,0,0,0,51,191,64,0,0,0,0,0,89,184,64,0,0,0,0,0,38,191,64,0,0,0,0,0,89,184,64,0,0,0,0,0,29,191,64,0,0,0,0,0,94,184,64,0,0,0,0,0,23,191,64,0,0,0,0,0,87,185,64,0,0,0,0,0,252,189,64,0,0,0,0,0,82,186,64,0,0,0,0,0,88,190,64,0,0,0,0,0,177,186,64,0,0,0,0,0,91,190,64,0,0,0,0,0,222,186,64,0,0,0,0,0,188,189,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,193,185,64,0,0,0,0,0,230,189,64,0,0,0,0,0,246,185,64,0,0,0,0,0,88,190,64,0,0,0,0,0,21,186,64,0,0,0,0,0,243,190,64,0,0,0,0,0,47,186,64,0,0,0,0,0,120,191,64,0,0,0,0,0,40,186,64,0,0,0,0,0,172,191,64,0,0,0,0,0,32,186,64,0,0,0,0,0,223,191,64,0,0,0,0,0,77,185,64,0,0,0,0,0,231,191,64,0,0,0,0,0,251,184,64,0,0,0,0,0,235,191,64,0,0,0,0,0,210,184,64,0,0,0,0,0,212,191,64,0,0,0,0,0,171,184,64,0,0,0,0,0,189,191,64,0,0,0,0,0,170,184,64,0,0,0,0,0,142,191,64,0,0,0,0,0,237,184,64,0,0,0,0,0,26,191,64,0,0,0,0,0,237,184,64,0,0,0,0,0,25,191,64,0,0,0,0,0,30,185,64,0,0,0,0,0,177,190,64,0,0,0,0,0,66,185,64,0,0,0,0,0,13,190,64,0,0,0,0,0,93,185,64,0,0,0,0,0,145,189,64,0,0,0,0,0,125,185,64,0,0,0,0,0,135,189,64,0,0,0,0,0,154,185,64,0,0,0,0,0,127,189,64,0,0,0,0,0,193,185,64,0,0,0,0,0,230,189,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,202,185,64,0,0,0,0,0,227,189,64,0,0,0,0,0,202,185,64,0,0,0,0,0,226,189,64,0,0,0,0,0,0,186,64,0,0,0,0,0,84,190,64,0,0,0,0,0,31,186,64,0,0,0,0,0,241,190,64,0,0,0,0,0,57,186,64,0,0,0,0,0,120,191,64,0,0,0,0,0,50,186,64,0,0,0,0,0,173,191,64,0,0,0,0,0,42,186,64,0,0,0,0,0,233,191,64,0,0,0,0,0,77,185,64,0,0,0,0,0,241,191,64,0,0,0,0,0,247,184,64,0,0,0,0,0,245,191,64,0,0,0,0,0,205,184,64,0,0,0,0,0,221,191,64,0,0,0,0,0,160,184,64,0,0,0,0,0,195,191,64,0,0,0,0,0,160,184,64,0,0,0,0,0,140,191,64,0,0,0,0,0,161,184,64,0,0,0,0,0,138,191,64,0,0,0,0,0,228,184,64,0,0,0,0,0,21,191,64,0,0,0,0,0,20,185,64,0,0,0,0,0,173,190,64,0,0,0,0,0,56,185,64,0,0,0,0,0,11,190,64,0,0,0,0,0,85,185,64,0,0,0,0,0,135,189,64,0,0,0,0,0,122,185,64,0,0,0,0,0,125,189,64,0,0,0,0,0,160,185,64,0,0,0,0,0,113,189,64,0,0,0,0,0,202,185,64,0,0,0,0,0,227,189,64,0,0,0,0,0,193,185,64,0,0,0,0,0,230,189,64,0,0,0,0,0,154,185,64,0,0,0,0,0,127,189,64,0,0,0,0,0,125,185,64,0,0,0,0,0,135,189,64,0,0,0,0,0,93,185,64,0,0,0,0,0,145,189,64,0,0,0,0,0,66,185,64,0,0,0,0,0,13,190,64,0,0,0,0,0,30,185,64,0,0,0,0,0,177,190,64,0,0,0,0,0,237,184,64,0,0,0,0,0,25,191,64,0,0,0,0,0,237,184,64,0,0,0,0,0,26,191,64,0,0,0,0,0,170,184,64,0,0,0,0,0,142,191,64,0,0,0,0,0,171,184,64,0,0,0,0,0,189,191,64,0,0,0,0,0,210,184,64,0,0,0,0,0,212,191,64,0,0,0,0,0,251,184,64,0,0,0,0,0,235,191,64,0,0,0,0,0,77,185,64,0,0,0,0,0,231,191,64,0,0,0,0,0,32,186,64,0,0,0,0,0,223,191,64,0,0,0,0,0,40,186,64,0,0,0,0,0,172,191,64,0,0,0,0,0,47,186,64,0,0,0,0,0,120,191,64,0,0,0,0,0,21,186,64,0,0,0,0,0,243,190,64,0,0,0,0,0,246,185,64,0,0,0,0,0,88,190,64,0,0,0,0,0,193,185,64,0,0,0,0,0,230,189,64,213,212,212,212,212,212,228,63,19,19,19,19,19,19,195,63,19,19,19,19,19,19,211,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,202,186,64,0,0,0,0,0,112,190,64,0,0,0,0,0,203,186,64,0,0,0,0,0,104,190,64,0,0,0,0,0,210,186,64,0,0,0,0,0,100,190,64,0,0,0,0,0,38,187,64,0,0,0,0,0,44,190,64,0,0,0,0,0,94,187,64,0,0,0,0,0,74,190,64,0,0,0,0,0,104,187,64,0,0,0,0,0,86,190,64,0,0,0,0,0,103,187,64,0,0,0,0,0,101,190,64,0,0,0,0,0,92,187,64,0,0,0,0,0,111,190,64,0,0,0,0,0,76,187,64,0,0,0,0,0,110,190,64,0,0,0,0,0,36,187,64,0,0,0,0,0,92,190,64,0,0,0,0,0,232,186,64,0,0,0,0,0,133,190,64,0,0,0,0,0,217,186,64,0,0,0,0,0,136,190,64,0,0,0,0,0,205,186,64,0,0,0,0,0,127,190,64,0,0,0,0,0,200,186,64,0,0,0,0,0,120,190,64,0,0,0,0,0,202,186,64,0,0,0,0,0,112,190,64,213,212,212,212,212,212,228,63,19,19,19,19,19,19,195,63,19,19,19,19,19,19,211,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,188,64,0,0,0,0,0,198,188,64,0,0,0,0,0,253,187,64,0,0,0,0,0,206,188,64,0,0,0,0,0,165,187,64,0,0,0,0,0,221,188,64,0,0,0,0,0,112,187,64,0,0,0,0,0,54,189,64,0,0,0,0,0,100,187,64,0,0,0,0,0,64,189,64,0,0,0,0,0,85,187,64,0,0,0,0,0,61,189,64,0,0,0,0,0,76,187,64,0,0,0,0,0,49,189,64,0,0,0,0,0,74,187,64,0,0,0,0,0,41,189,64,0,0,0,0,0,78,187,64,0,0,0,0,0,34,189,64,0,0,0,0,0,141,187,64,0,0,0,0,0,183,188,64,0,0,0,0,0,246,187,64,0,0,0,0,0,167,188,64,0,0,0,0,0,5,188,64,0,0,0,0,0,170,188,64,0,0,0,0,0,11,188,64,0,0,0,0,0,175,188,64,0,0,0,0,0,13,188,64,0,0,0,0,0,183,188,64,0,0,0,0,0,9,188,64,0,0,0,0,0,198,188,64,86,86,86,86,86,86,230,63,86,86,86,86,86,86,230,63,86,86,86,86,86,86,230,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,245,182,64,0,0,0,0,0,42,192,64,0,0,0,0,0,85,181,64,0,0,0,0,0,30,192,64,0,0,0,0,0,109,180,64,0,0,0,0,0,204,191,64,0,0,0,0,0,45,181,64,0,0,0,0,0,6,192,64,0,0,0,0,0,149,182,64,0,0,0,0,0,38,192,64,0,0,0,0,0,237,182,64,0,0,0,0,0,22,192,64,0,0,0,0,0,157,183,64,0,0,0,0,0,22,192,64,0,0,0,0,0,245,182,64,0,0,0,0,0,42,192,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,201,183,64,0,0,0,0,0,217,184,64,0,0,0,0,0,87,184,64,0,0,0,0,0,59,187,64,0,0,0,0,0,17,184,64,0,0,0,0,0,210,187,64,0,0,0,0,0,5,184,64,0,0,0,0,0,225,187,64,0,0,0,0,0,248,183,64,0,0,0,0,0,222,187,64,0,0,0,0,0,229,183,64,0,0,0,0,0,208,187,64,0,0,0,0,0,202,183,64,0,0,0,0,0,154,187,64,0,0,0,0,0,88,182,64,0,0,0,0,0,8,185,64,0,0,0,0,0,24,182,64,0,0,0,0,0,224,184,64,0,0,0,0,0,9,182,64,0,0,0,0,0,212,184,64,0,0,0,0,0,11,182,64,0,0,0,0,0,208,184,64,0,0,0,0,0,69,182,64,0,0,0,0,0,201,184,64,0,0,0,0,0,201,183,64,0,0,0,0,0,217,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,201,183,64,0,0,0,0,0,217,184,64,0,0,0,0,0,69,182,64,0,0,0,0,0,201,184,64,0,0,0,0,0,11,182,64,0,0,0,0,0,208,184,64,0,0,0,0,0,9,182,64,0,0,0,0,0,212,184,64,0,0,0,0,0,24,182,64,0,0,0,0,0,224,184,64,0,0,0,0,0,88,182,64,0,0,0,0,0,8,185,64,0,0,0,0,0,202,183,64,0,0,0,0,0,154,187,64,0,0,0,0,0,229,183,64,0,0,0,0,0,208,187,64,0,0,0,0,0,248,183,64,0,0,0,0,0,222,187,64,0,0,0,0,0,5,184,64,0,0,0,0,0,225,187,64,0,0,0,0,0,17,184,64,0,0,0,0,0,210,187,64,0,0,0,0,0,87,184,64,0,0,0,0,0,59,187,64,0,0,0,0,0,201,183,64,0,0,0,0,0,217,184,64,0,0,0,0,0,205,183,64,0,0,0,0,0,207,184,64,0,0,0,0,0,208,183,64,0,0,0,0,0,208,184,64,0,0,0,0,0,210,183,64,0,0,0,0,0,211,184,64,0,0,0,0,0,99,184,64,0,0,0,0,0,61,187,64,0,0,0,0,0,26,184,64,0,0,0,0,0,214,187,64,0,0,0,0,0,19,184,64,0,0,0,0,0,230,187,64,0,0,0,0,0,9,184,64,0,0,0,0,0,234,187,64,0,0,0,0,0,255,183,64,0,0,0,0,0,239,187,64,0,0,0,0,0,242,183,64,0,0,0,0,0,230,187,64,0,0,0,0,0,221,183,64,0,0,0,0,0,216,187,64,0,0,0,0,0,193,183,64,0,0,0,0,0,158,187,64,0,0,0,0,0,193,183,64,0,0,0,0,0,159,187,64,0,0,0,0,0,82,182,64,0,0,0,0,0,16,185,64,0,0,0,0,0,19,182,64,0,0,0,0,0,232,184,64,0,0,0,0,0,1,182,64,0,0,0,0,0,217,184,64,0,0,0,0,0,251,181,64,0,0,0,0,0,207,184,64,0,0,0,0,0,5,182,64,0,0,0,0,0,200,184,64,0,0,0,0,0,17,182,64,0,0,0,0,0,191,184,64,0,0,0,0,0,69,182,64,0,0,0,0,0,191,184,64,0,0,0,0,0,205,183,64,0,0,0,0,0,207,184,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,233,177,64,0,0,0,0,0,233,184,64,0,0,0,0,0,73,178,64,0,0,0,0,0,167,186,64,0,0,0,0,0,137,178,64,0,0,0,0,0,7,187,64,0,0,0,0,0,159,178,64,0,0,0,0,0,40,187,64,0,0,0,0,0,162,178,64,0,0,0,0,0,58,187,64,0,0,0,0,0,163,178,64,0,0,0,0,0,73,187,64,0,0,0,0,0,151,178,64,0,0,0,0,0,76,187,64,0,0,0,0,0,120,178,64,0,0,0,0,0,84,187,64,0,0,0,0,0,65,178,64,0,0,0,0,0,41,187,64,0,0,0,0,0,105,177,64,0,0,0,0,0,97,186,64,0,0,0,0,0,196,176,64,0,0,0,0,0,189,185,64,0,0,0,0,0,170,176,64,0,0,0,0,0,130,185,64,0,0,0,0,0,71,176,64,0,0,0,0,0,149,184,64,0,0,0,0,0,233,177,64,0,0,0,0,0,233,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,233,177,64,0,0,0,0,0,233,184,64,0,0,0,0,0,71,176,64,0,0,0,0,0,149,184,64,0,0,0,0,0,170,176,64,0,0,0,0,0,130,185,64,0,0,0,0,0,196,176,64,0,0,0,0,0,189,185,64,0,0,0,0,0,105,177,64,0,0,0,0,0,97,186,64,0,0,0,0,0,65,178,64,0,0,0,0,0,41,187,64,0,0,0,0,0,120,178,64,0,0,0,0,0,84,187,64,0,0,0,0,0,151,178,64,0,0,0,0,0,76,187,64,0,0,0,0,0,163,178,64,0,0,0,0,0,73,187,64,0,0,0,0,0,162,178,64,0,0,0,0,0,58,187,64,0,0,0,0,0,159,178,64,0,0,0,0,0,40,187,64,0,0,0,0,0,137,178,64,0,0,0,0,0,7,187,64,0,0,0,0,0,73,178,64,0,0,0,0,0,167,186,64,0,0,0,0,0,233,177,64,0,0,0,0,0,233,184,64,0,0,0,0,0,238,177,64,0,0,0,0,0,223,184,64,0,0,0,0,0,241,177,64,0,0,0,0,0,225,184,64,0,0,0,0,0,242,177,64,0,0,0,0,0,227,184,64,0,0,0,0,0,82,178,64,0,0,0,0,0,161,186,64,0,0,0,0,0,145,178,64,0,0,0,0,0,1,187,64,0,0,0,0,0,168,178,64,0,0,0,0,0,36,187,64,0,0,0,0,0,171,178,64,0,0,0,0,0,57,187,64,0,0,0,0,0,175,178,64,0,0,0,0,0,80,187,64,0,0,0,0,0,154,178,64,0,0,0,0,0,86,187,64,0,0,0,0,0,120,178,64,0,0,0,0,0,96,187,64,0,0,0,0,0,58,178,64,0,0,0,0,0,48,187,64,0,0,0,0,0,98,177,64,0,0,0,0,0,104,186,64,0,0,0,0,0,188,176,64,0,0,0,0,0,193,185,64,0,0,0,0,0,161,176,64,0,0,0,0,0,134,185,64,0,0,0,0,0,59,176,64,0,0,0,0,0,144,184,64,0,0,0,0,0,59,176,64,0,0,0,0,0,141,184,64,0,0,0,0,0,61,176,64,0,0,0,0,0,138,184,64,0,0,0,0,0,64,176,64,0,0,0,0,0,137,184,64,0,0,0,0,0,238,177,64,0,0,0,0,0,223,184,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,61,178,64,0,0,0,0,0,183,185,64,0,0,0,0,0,12,178,64,0,0,0,0,0,66,185,64,0,0,0,0,0,12,178,64,0,0,0,0,0,67,185,64,0,0,0,0,0,244,177,64,0,0,0,0,0,252,184,64,0,0,0,0,0,247,177,64,0,0,0,0,0,238,184,64,0,0,0,0,0,100,178,64,0,0,0,0,0,12,185,64,0,0,0,0,0,120,178,64,0,0,0,0,0,54,185,64,0,0,0,0,0,139,178,64,0,0,0,0,0,96,185,64,0,0,0,0,0,96,178,64,0,0,0,0,0,159,185,64,0,0,0,0,0,95,178,64,0,0,0,0,0,161,185,64,0,0,0,0,0,86,178,64,0,0,0,0,0,191,185,64,0,0,0,0,0,77,178,64,0,0,0,0,0,197,185,64,0,0,0,0,0,70,178,64,0,0,0,0,0,199,185,64,0,0,0,0,0,61,178,64,0,0,0,0,0,183,185,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,61,178,64,0,0,0,0,0,183,185,64,0,0,0,0,0,70,178,64,0,0,0,0,0,199,185,64,0,0,0,0,0,77,178,64,0,0,0,0,0,197,185,64,0,0,0,0,0,86,178,64,0,0,0,0,0,191,185,64,0,0,0,0,0,95,178,64,0,0,0,0,0,161,185,64,0,0,0,0,0,96,178,64,0,0,0,0,0,159,185,64,0,0,0,0,0,139,178,64,0,0,0,0,0,96,185,64,0,0,0,0,0,120,178,64,0,0,0,0,0,54,185,64,0,0,0,0,0,100,178,64,0,0,0,0,0,12,185,64,0,0,0,0,0,247,177,64,0,0,0,0,0,238,184,64,0,0,0,0,0,244,177,64,0,0,0,0,0,252,184,64,0,0,0,0,0,12,178,64,0,0,0,0,0,67,185,64,0,0,0,0,0,12,178,64,0,0,0,0,0,66,185,64,0,0,0,0,0,61,178,64,0,0,0,0,0,183,185,64,0,0,0,0,0,243,177,64,0,0,0,0,0,227,184,64,0,0,0,0,0,246,177,64,0,0,0,0,0,227,184,64,0,0,0,0,0,109,178,64,0,0,0,0,0,3,185,64,0,0,0,0,0,129,178,64,0,0,0,0,0,50,185,64,0,0,0,0,0,151,178,64,0,0,0,0,0,96,185,64,0,0,0,0,0,105,178,64,0,0,0,0,0,164,185,64,0,0,0,0,0,94,178,64,0,0,0,0,0,199,185,64,0,0,0,0,0,82,178,64,0,0,0,0,0,205,185,64,0,0,0,0,0,67,178,64,0,0,0,0,0,214,185,64,0,0,0,0,0,52,178,64,0,0,0,0,0,188,185,64,0,0,0,0,0,52,178,64,0,0,0,0,0,187,185,64,0,0,0,0,0,3,178,64,0,0,0,0,0,70,185,64,0,0,0,0,0,229,177,64,0,0,0,0,0,237,184,64,0,0,0,0,0,241,177,64,0,0,0,0,0,229,184,64,0,0,0,0,0,243,177,64,0,0,0,0,0,227,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,133,178,64,0,0,0,0,0,76,185,64,0,0,0,0,0,61,178,64,0,0,0,0,0,76,185,64,0,0,0,0,0,245,177,64,0,0,0,0,0,228,184,64,0,0,0,0,0,149,178,64,0,0,0,0,0,20,185,64,0,0,0,0,0,85,180,64,0,0,0,0,0,252,184,64,0,0,0,0,0,141,180,64,0,0,0,0,0,236,184,64,0,0,0,0,0,141,181,64,0,0,0,0,0,200,184,64,0,0,0,0,0,45,181,64,0,0,0,0,0,28,185,64,0,0,0,0,0,21,181,64,0,0,0,0,0,68,185,64,0,0,0,0,0,3,181,64,0,0,0,0,0,98,185,64,0,0,0,0,0,217,180,64,0,0,0,0,0,108,185,64,0,0,0,0,0,175,180,64,0,0,0,0,0,118,185,64,0,0,0,0,0,133,180,64,0,0,0,0,0,100,185,64,0,0,0,0,0,100,180,64,0,0,0,0,0,86,185,64,0,0,0,0,0,51,180,64,0,0,0,0,0,86,185,64,0,0,0,0,0,106,179,64,0,0,0,0,0,80,185,64,0,0,0,0,0,57,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,13,179,64,0,0,0,0,0,80,185,64,0,0,0,0,0,133,178,64,0,0,0,0,0,76,185,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,181,64,0,0,0,0,0,13,186,64,0,0,0,0,0,112,181,64,0,0,0,0,0,2,186,64,0,0,0,0,0,86,181,64,0,0,0,0,0,214,185,64,0,0,0,0,0,84,181,64,0,0,0,0,0,212,185,64,0,0,0,0,0,230,180,64,0,0,0,0,0,140,185,64,0,0,0,0,0,237,180,64,0,0,0,0,0,95,185,64,0,0,0,0,0,245,180,64,0,0,0,0,0,49,185,64,0,0,0,0,0,113,181,64,0,0,0,0,0,238,184,64,0,0,0,0,0,122,181,64,0,0,0,0,0,252,184,64,0,0,0,0,0,135,181,64,0,0,0,0,0,104,185,64,0,0,0,0,0,152,181,64,0,0,0,0,0,223,185,64,0,0,0,0,0,143,181,64,0,0,0,0,0,3,186,64,0,0,0,0,0,137,181,64,0,0,0,0,0,15,186,64,0,0,0,0,0,128,181,64,0,0,0,0,0,13,186,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,128,181,64,0,0,0,0,0,13,186,64,0,0,0,0,0,137,181,64,0,0,0,0,0,15,186,64,0,0,0,0,0,143,181,64,0,0,0,0,0,3,186,64,0,0,0,0,0,152,181,64,0,0,0,0,0,223,185,64,0,0,0,0,0,135,181,64,0,0,0,0,0,104,185,64,0,0,0,0,0,122,181,64,0,0,0,0,0,252,184,64,0,0,0,0,0,113,181,64,0,0,0,0,0,238,184,64,0,0,0,0,0,245,180,64,0,0,0,0,0,49,185,64,0,0,0,0,0,237,180,64,0,0,0,0,0,95,185,64,0,0,0,0,0,230,180,64,0,0,0,0,0,140,185,64,0,0,0,0,0,84,181,64,0,0,0,0,0,212,185,64,0,0,0,0,0,86,181,64,0,0,0,0,0,214,185,64,0,0,0,0,0,112,181,64,0,0,0,0,0,2,186,64,0,0,0,0,0,128,181,64,0,0,0,0,0,13,186,64,0,0,0,0,0,113,181,64,0,0,0,0,0,227,184,64,0,0,0,0,0,115,181,64,0,0,0,0,0,228,184,64,0,0,0,0,0,129,181,64,0,0,0,0,0,233,184,64,0,0,0,0,0,145,181,64,0,0,0,0,0,103,185,64,0,0,0,0,0,162,181,64,0,0,0,0,0,225,185,64,0,0,0,0,0,153,181,64,0,0,0,0,0,5,186,64,0,0,0,0,0,149,181,64,0,0,0,0,0,20,186,64,0,0,0,0,0,142,181,64,0,0,0,0,0,24,186,64,0,0,0,0,0,123,181,64,0,0,0,0,0,21,186,64,0,0,0,0,0,105,181,64,0,0,0,0,0,10,186,64,0,0,0,0,0,77,181,64,0,0,0,0,0,219,185,64,0,0,0,0,0,218,180,64,0,0,0,0,0,143,185,64,0,0,0,0,0,227,180,64,0,0,0,0,0,93,185,64,0,0,0,0,0,234,180,64,0,0,0,0,0,43,185,64,0,0,0,0,0,111,181,64,0,0,0,0,0,228,184,64,0,0,0,0,0,113,181,64,0,0,0,0,0,227,184,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,150,178,64,0,0,0,0,0,44,185,64,0,0,0,0,0,155,178,64,0,0,0,0,0,35,185,64,0,0,0,0,0,203,178,64,0,0,0,0,0,63,185,64,0,0,0,0,0,252,178,64,0,0,0,0,0,64,185,64,0,0,0,0,0,11,179,64,0,0,0,0,0,64,185,64,0,0,0,0,0,16,179,64,0,0,0,0,0,70,185,64,0,0,0,0,0,16,179,64,0,0,0,0,0,83,185,64,0,0,0,0,0,15,179,64,0,0,0,0,0,85,185,64,0,0,0,0,0,13,179,64,0,0,0,0,0,191,185,64,0,0,0,0,0,238,178,64,0,0,0,0,0,192,185,64,0,0,0,0,0,204,178,64,0,0,0,0,0,191,185,64,0,0,0,0,0,137,178,64,0,0,0,0,0,85,185,64,0,0,0,0,0,144,178,64,0,0,0,0,0,57,185,64,0,0,0,0,0,150,178,64,0,0,0,0,0,44,185,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,150,178,64,0,0,0,0,0,44,185,64,0,0,0,0,0,144,178,64,0,0,0,0,0,57,185,64,0,0,0,0,0,137,178,64,0,0,0,0,0,85,185,64,0,0,0,0,0,204,178,64,0,0,0,0,0,191,185,64,0,0,0,0,0,238,178,64,0,0,0,0,0,192,185,64,0,0,0,0,0,13,179,64,0,0,0,0,0,191,185,64,0,0,0,0,0,15,179,64,0,0,0,0,0,85,185,64,0,0,0,0,0,16,179,64,0,0,0,0,0,83,185,64,0,0,0,0,0,16,179,64,0,0,0,0,0,70,185,64,0,0,0,0,0,11,179,64,0,0,0,0,0,64,185,64,0,0,0,0,0,252,178,64,0,0,0,0,0,64,185,64,0,0,0,0,0,203,178,64,0,0,0,0,0,63,185,64,0,0,0,0,0,155,178,64,0,0,0,0,0,35,185,64,0,0,0,0,0,150,178,64,0,0,0,0,0,44,185,64,0,0,0,0,0,148,178,64,0,0,0,0,0,28,185,64,0,0,0,0,0,159,178,64,0,0,0,0,0,26,185,64,0,0,0,0,0,205,178,64,0,0,0,0,0,53,185,64,0,0,0,0,0,252,178,64,0,0,0,0,0,54,185,64,0,0,0,0,0,16,179,64,0,0,0,0,0,55,185,64,0,0,0,0,0,23,179,64,0,0,0,0,0,63,185,64,0,0,0,0,0,31,179,64,0,0,0,0,0,71,185,64,0,0,0,0,0,25,179,64,0,0,0,0,0,86,185,64,0,0,0,0,0,22,179,64,0,0,0,0,0,203,185,64,0,0,0,0,0,238,178,64,0,0,0,0,0,202,185,64,0,0,0,0,0,199,178,64,0,0,0,0,0,203,185,64,0,0,0,0,0,127,178,64,0,0,0,0,0,88,185,64,0,0,0,0,0,126,178,64,0,0,0,0,0,86,185,64,0,0,0,0,0,126,178,64,0,0,0,0,0,84,185,64,0,0,0,0,0,134,178,64,0,0,0,0,0,53,185,64,0,0,0,0,0,141,178,64,0,0,0,0,0,39,185,64,0,0,0,0,0,148,178,64,0,0,0,0,0,28,185,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,160,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,163,179,64,0,0,0,0,0,144,185,64,0,0,0,0,0,156,179,64,0,0,0,0,0,172,185,64,0,0,0,0,0,149,179,64,0,0,0,0,0,196,185,64,0,0,0,0,0,135,179,64,0,0,0,0,0,197,185,64,0,0,0,0,0,100,179,64,0,0,0,0,0,196,185,64,0,0,0,0,0,25,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,30,179,64,0,0,0,0,0,61,185,64,0,0,0,0,0,37,179,64,0,0,0,0,0,49,185,64,0,0,0,0,0,42,179,64,0,0,0,0,0,43,185,64,0,0,0,0,0,44,179,64,0,0,0,0,0,43,185,64,0,0,0,0,0,92,179,64,0,0,0,0,0,80,185,64,0,0,0,0,0,130,179,64,0,0,0,0,0,84,185,64,0,0,0,0,0,160,179,64,0,0,0,0,0,88,185,64,0,0,0,0,0,160,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131,179,64,0,0,0,0,0,74,185,64,0,0,0,0,0,170,179,64,0,0,0,0,0,77,185,64,0,0,0,0,0,170,179,64,0,0,0,0,0,88,185,64,0,0,0,0,0,173,179,64,0,0,0,0,0,145,185,64,0,0,0,0,0,165,179,64,0,0,0,0,0,174,185,64,0,0,0,0,0,156,179,64,0,0,0,0,0,207,185,64,0,0,0,0,0,135,179,64,0,0,0,0,0,207,185,64,0,0,0,0,0,96,179,64,0,0,0,0,0,208,185,64,0,0,0,0,0,15,179,64,0,0,0,0,0,93,185,64,0,0,0,0,0,14,179,64,0,0,0,0,0,91,185,64,0,0,0,0,0,14,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,20,179,64,0,0,0,0,0,57,185,64,0,0,0,0,0,28,179,64,0,0,0,0,0,44,185,64,0,0,0,0,0,37,179,64,0,0,0,0,0,34,185,64,0,0,0,0,0,50,179,64,0,0,0,0,0,35,185,64,0,0,0,0,0,96,179,64,0,0,0,0,0,70,185,64,0,0,0,0,0,131,179,64,0,0,0,0,0,74,185,64,0,0,0,0,0,160,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,160,179,64,0,0,0,0,0,88,185,64,0,0,0,0,0,130,179,64,0,0,0,0,0,84,185,64,0,0,0,0,0,92,179,64,0,0,0,0,0,80,185,64,0,0,0,0,0,44,179,64,0,0,0,0,0,43,185,64,0,0,0,0,0,42,179,64,0,0,0,0,0,43,185,64,0,0,0,0,0,37,179,64,0,0,0,0,0,49,185,64,0,0,0,0,0,30,179,64,0,0,0,0,0,61,185,64,0,0,0,0,0,25,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,100,179,64,0,0,0,0,0,196,185,64,0,0,0,0,0,135,179,64,0,0,0,0,0,197,185,64,0,0,0,0,0,149,179,64,0,0,0,0,0,196,185,64,0,0,0,0,0,156,179,64,0,0,0,0,0,172,185,64,0,0,0,0,0,163,179,64,0,0,0,0,0,144,185,64,0,0,0,0,0,160,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,48,180,64,0,0,0,0,0,111,185,64,0,0,0,0,0,51,180,64,0,0,0,0,0,157,185,64,0,0,0,0,0,44,180,64,0,0,0,0,0,180,185,64,0,0,0,0,0,38,180,64,0,0,0,0,0,198,185,64,0,0,0,0,0,24,180,64,0,0,0,0,0,197,185,64,0,0,0,0,0,245,179,64,0,0,0,0,0,191,185,64,0,0,0,0,0,169,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,177,179,64,0,0,0,0,0,65,185,64,0,0,0,0,0,186,179,64,0,0,0,0,0,55,185,64,0,0,0,0,0,193,179,64,0,0,0,0,0,46,185,64,0,0,0,0,0,201,179,64,0,0,0,0,0,50,185,64,0,0,0,0,0,20,180,64,0,0,0,0,0,84,185,64,0,0,0,0,0,21,180,64,0,0,0,0,0,84,185,64,0,0,0,0,0,49,180,64,0,0,0,0,0,89,185,64,0,0,0,0,0,48,180,64,0,0,0,0,0,110,185,64,0,0,0,0,0,48,180,64,0,0,0,0,0,111,185,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,180,64,0,0,0,0,0,110,185,64,0,0,0,0,0,58,180,64,0,0,0,0,0,111,185,64,0,0,0,0,0,61,180,64,0,0,0,0,0,159,185,64,0,0,0,0,0,54,180,64,0,0,0,0,0,183,185,64,0,0,0,0,0,45,180,64,0,0,0,0,0,210,185,64,0,0,0,0,0,23,180,64,0,0,0,0,0,207,185,64,0,0,0,0,0,240,179,64,0,0,0,0,0,202,185,64,0,0,0,0,0,159,179,64,0,0,0,0,0,93,185,64,0,0,0,0,0,158,179,64,0,0,0,0,0,91,185,64,0,0,0,0,0,159,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,168,179,64,0,0,0,0,0,60,185,64,0,0,0,0,0,179,179,64,0,0,0,0,0,48,185,64,0,0,0,0,0,192,179,64,0,0,0,0,0,34,185,64,0,0,0,0,0,205,179,64,0,0,0,0,0,41,185,64,0,0,0,0,0,23,180,64,0,0,0,0,0,74,185,64,0,0,0,0,0,60,180,64,0,0,0,0,0,81,185,64,0,0,0,0,0,58,180,64,0,0,0,0,0,110,185,64,0,0,0,0,0,48,180,64,0,0,0,0,0,111,185,64,0,0,0,0,0,48,180,64,0,0,0,0,0,110,185,64,0,0,0,0,0,49,180,64,0,0,0,0,0,89,185,64,0,0,0,0,0,21,180,64,0,0,0,0,0,84,185,64,0,0,0,0,0,20,180,64,0,0,0,0,0,84,185,64,0,0,0,0,0,201,179,64,0,0,0,0,0,50,185,64,0,0,0,0,0,193,179,64,0,0,0,0,0,46,185,64,0,0,0,0,0,186,179,64,0,0,0,0,0,55,185,64,0,0,0,0,0,177,179,64,0,0,0,0,0,65,185,64,0,0,0,0,0,169,179,64,0,0,0,0,0,89,185,64,0,0,0,0,0,245,179,64,0,0,0,0,0,191,185,64,0,0,0,0,0,24,180,64,0,0,0,0,0,197,185,64,0,0,0,0,0,38,180,64,0,0,0,0,0,198,185,64,0,0,0,0,0,44,180,64,0,0,0,0,0,180,185,64,0,0,0,0,0,51,180,64,0,0,0,0,0,157,185,64,0,0,0,0,0,48,180,64,0,0,0,0,0,111,185,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,103,180,64,0,0,0,0,0,54,185,64,0,0,0,0,0,169,180,64,0,0,0,0,0,96,185,64,0,0,0,0,0,208,180,64,0,0,0,0,0,101,185,64,0,0,0,0,0,219,180,64,0,0,0,0,0,102,185,64,0,0,0,0,0,221,180,64,0,0,0,0,0,107,185,64,0,0,0,0,0,207,180,64,0,0,0,0,0,124,185,64,0,0,0,0,0,206,180,64,0,0,0,0,0,126,185,64,0,0,0,0,0,205,180,64,0,0,0,0,0,128,185,64,0,0,0,0,0,203,180,64,0,0,0,0,0,175,185,64,0,0,0,0,0,193,180,64,0,0,0,0,0,197,185,64,0,0,0,0,0,183,180,64,0,0,0,0,0,215,185,64,0,0,0,0,0,167,180,64,0,0,0,0,0,212,185,64,0,0,0,0,0,127,180,64,0,0,0,0,0,202,185,64,0,0,0,0,0,51,180,64,0,0,0,0,0,92,185,64,0,0,0,0,0,82,180,64,0,0,0,0,0,43,185,64,0,0,0,0,0,103,180,64,0,0,0,0,0,55,185,64,0,0,0,0,0,103,180,64,0,0,0,0,0,54,185,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,103,180,64,0,0,0,0,0,54,185,64,0,0,0,0,0,103,180,64,0,0,0,0,0,55,185,64,0,0,0,0,0,82,180,64,0,0,0,0,0,43,185,64,0,0,0,0,0,51,180,64,0,0,0,0,0,92,185,64,0,0,0,0,0,127,180,64,0,0,0,0,0,202,185,64,0,0,0,0,0,167,180,64,0,0,0,0,0,212,185,64,0,0,0,0,0,183,180,64,0,0,0,0,0,215,185,64,0,0,0,0,0,193,180,64,0,0,0,0,0,197,185,64,0,0,0,0,0,203,180,64,0,0,0,0,0,175,185,64,0,0,0,0,0,205,180,64,0,0,0,0,0,128,185,64,0,0,0,0,0,206,180,64,0,0,0,0,0,126,185,64,0,0,0,0,0,207,180,64,0,0,0,0,0,124,185,64,0,0,0,0,0,221,180,64,0,0,0,0,0,107,185,64,0,0,0,0,0,219,180,64,0,0,0,0,0,102,185,64,0,0,0,0,0,208,180,64,0,0,0,0,0,101,185,64,0,0,0,0,0,169,180,64,0,0,0,0,0,96,185,64,0,0,0,0,0,103,180,64,0,0,0,0,0,54,185,64,0,0,0,0,0,41,180,64,0,0,0,0,0,90,185,64,0,0,0,0,0,79,180,64,0,0,0,0,0,27,185,64,0,0,0,0,0,108,180,64,0,0,0,0,0,46,185,64,0,0,0,0,0,171,180,64,0,0,0,0,0,86,185,64,0,0,0,0,0,209,180,64,0,0,0,0,0,91,185,64,0,0,0,0,0,231,180,64,0,0,0,0,0,94,185,64,0,0,0,0,0,231,180,64,0,0,0,0,0,106,185,64,0,0,0,0,0,232,180,64,0,0,0,0,0,115,185,64,0,0,0,0,0,215,180,64,0,0,0,0,0,131,185,64,0,0,0,0,0,213,180,64,0,0,0,0,0,179,185,64,0,0,0,0,0,202,180,64,0,0,0,0,0,201,185,64,0,0,0,0,0,188,180,64,0,0,0,0,0,227,185,64,0,0,0,0,0,164,180,64,0,0,0,0,0,222,185,64,0,0,0,0,0,121,180,64,0,0,0,0,0,213,185,64,0,0,0,0,0,41,180,64,0,0,0,0,0,95,185,64,0,0,0,0,0,40,180,64,0,0,0,0,0,92,185,64,0,0,0,0,0,41,180,64,0,0,0,0,0,90,185,64,221,220,220,220,220,220,236,63,221,220,220,220,220,220,236,63,118,118,118,118,118,118,230,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,192,176,64,0,0,0,0,0,132,185,64,0,0,0,0,0,140,176,64,0,0,0,0,0,32,185,64,0,0,0,0,0,98,176,64,0,0,0,0,0,165,184,64,0,0,0,0,0,219,177,64,0,0,0,0,0,241,184,64,0,0,0,0,0,10,178,64,0,0,0,0,0,167,185,64,0,0,0,0,0,89,177,64,0,0,0,0,0,163,185,64,0,0,0,0,0,192,176,64,0,0,0,0,0,132,185,64,221,220,220,220,220,220,236,63,221,220,220,220,220,220,236,63,118,118,118,118,118,118,230,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,182,64,0,0,0,0,0,232,184,64,0,0,0,0,0,247,181,64,0,0,0,0,0,202,184,64,0,0,0,0,0,83,182,64,0,0,0,0,0,202,184,64,0,0,0,0,0,196,183,64,0,0,0,0,0,217,184,64,0,0,0,0,0,220,183,64,0,0,0,0,0,74,185,64,0,0,0,0,0,19,183,64,0,0,0,0,0,33,185,64])
.concat([0,0,0,0,0,111,182,64,0,0,0,0,0,69,185,64,0,0,0,0,0,38,182,64,0,0,0,0,0,232,184,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,141,186,64,0,0,0,0,0,28,155,64,0,0,0,0,0,107,188,64,0,0,0,0,0,148,155,64,0,0,0,0,0,79,189,64,0,0,0,0,0,32,156,64,0,0,0,0,0,147,189,64,0,0,0,0,0,0,158,64,0,0,0,0,0,226,189,64,0,0,0,0,0,20,160,64,0,0,0,0,0,28,190,64,0,0,0,0,0,106,161,64,0,0,0,0,0,86,190,64,0,0,0,0,0,198,162,64,0,0,0,0,0,67,190,64,0,0,0,0,0,32,163,64,0,0,0,0,0,14,191,64,0,0,0,0,0,252,164,64,0,0,0,0,0,235,190,64,0,0,0,0,0,126,166,64,0,0,0,0,0,220,190,64,0,0,0,0,0,30,167,64,0,0,0,0,0,125,190,64,0,0,0,0,0,56,168,64,0,0,0,0,0,18,190,64,0,0,0,0,0,122,169,64,0,0,0,0,0,135,189,64,0,0,0,0,0,132,170,64,0,0,0,0,0,11,188,64,0,0,0,0,0,94,173,64,0,0,0,0,0,159,186,64,0,0,0,0,0,244,172,64,0,0,0,0,0,137,185,64,0,0,0,0,0,164,172,64,0,0,0,0,0,146,185,64,0,0,0,0,0,118,172,64,0,0,0,0,0,123,185,64,0,0,0,0,0,204,172,64,0,0,0,0,0,37,184,64,0,0,0,0,0,130,173,64,0,0,0,0,0,90,184,64,0,0,0,0,0,98,169,64,0,0,0,0,0,63,184,64,0,0,0,0,0,124,168,64,0,0,0,0,0,237,183,64,0,0,0,0,0,172,164,64,0,0,0,0,0,179,183,64,0,0,0,0,0,130,161,64,0,0,0,0,0,196,183,64,0,0,0,0,0,86,161,64,0,0,0,0,0,28,184,64,0,0,0,0,0,98,160,64,0,0,0,0,0,187,184,64,0,0,0,0,0,148,158,64,0,0,0,0,0,196,185,64,0,0,0,0,0,240,154,64,0,0,0,0,0,141,186,64,0,0,0,0,0,28,155,64,125,125,125,125,125,125,237,63,242,241,241,241,241,241,225,63,149,148,148,148,148,148,212,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,143,186,64,0,0,0,0,0,116,155,64,0,0,0,0,0,101,188,64,0,0,0,0,0,232,155,64,0,0,0,0,0,67,189,64,0,0,0,0,0,108,156,64,0,0,0,0,0,135,189,64,0,0,0,0,0,72,158,64,0,0,0,0,0,213,189,64,0,0,0,0,0,54,160,64,0,0,0,0,0,13,190,64,0,0,0,0,0,132,161,64,0,0,0,0,0,71,190,64,0,0,0,0,0,216,162,64,0,0,0,0,0,52,190,64,0,0,0,0,0,50,163,64,0,0,0,0,0,250,190,64,0,0,0,0,0,4,165,64,0,0,0,0,0,216,190,64,0,0,0,0,0,128,166,64,0,0,0,0,0,201,190,64,0,0,0,0,0,28,167,64,0,0,0,0,0,108,190,64,0,0,0,0,0,50,168,64,0,0,0,0,0,6,190,64,0,0,0,0,0,104,169,64,0,0,0,0,0,122,189,64,0,0,0,0,0,116,170,64,0,0,0,0,0,6,188,64,0,0,0,0,0,62,173,64,0,0,0,0,0,160,186,64,0,0,0,0,0,216,172,64,0,0,0,0,0,144,185,64,0,0,0,0,0,138,172,64,0,0,0,0,0,145,185,64,0,0,0,0,0,92,172,64,0,0,0,0,0,120,185,64,0,0,0,0,0,176,172,64,0,0,0,0,0,50,184,64,0,0,0,0,0,98,173,64,0,0,0,0,0,102,184,64,0,0,0,0,0,86,169,64,0,0,0,0,0,76,184,64,0,0,0,0,0,118,168,64,0,0,0,0,0,251,183,64,0,0,0,0,0,182,164,64,0,0,0,0,0,193,183,64,0,0,0,0,0,158,161,64,0,0,0,0,0,211,183,64,0,0,0,0,0,112,161,64,0,0,0,0,0,56,184,64,0,0,0,0,0,104,160,64,0,0,0,0,0,197,184,64,0,0,0,0,0,220,158,64,0,0,0,0,0,202,185,64,0,0,0,0,0,72,155,64,0,0,0,0,0,143,186,64,0,0,0,0,0,116,155,64,30,30,30,30,30,30,238,63,117,117,117,117,117,117,229,63,95,95,95,95,95,95,223,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,144,186,64,0,0,0,0,0,204,155,64,0,0,0,0,0,93,188,64,0,0,0,0,0,64,156,64,0,0,0,0,0,56,189,64,0,0,0,0,0,196,156,64,0,0,0,0,0,122,189,64,0,0,0,0,0,148,158,64,0,0,0,0,0,197,189,64,0,0,0,0,0,82,160,64,0,0,0,0,0,254,189,64,0,0,0,0,0,158,161,64,0,0,0,0,0,54,190,64,0,0,0,0,0,234,162,64,0,0,0,0,0,36,190,64,0,0,0,0,0,68,163,64,0,0,0,0,0,231,190,64,0,0,0,0,0,14,165,64,0,0,0,0,0,197,190,64,0,0,0,0,0,130,166,64,0,0,0,0,0,182,190,64,0,0,0,0,0,32,167,64,0,0,0,0,0,91,190,64,0,0,0,0,0,44,168,64,0,0,0,0,0,246,189,64,0,0,0,0,0,94,169,64,0,0,0,0,0,110,189,64,0,0,0,0,0,98,170,64,0,0,0,0,0,0,188,64,0,0,0,0,0,32,173,64,0,0,0,0,0,161,186,64,0,0,0,0,0,188,172,64,0,0,0,0,0,251,185,64,0,0,0,0,0,142,172,64,0,0,0,0,0,184,185,64,0,0,0,0,0,92,172,64,0,0,0,0,0,147,185,64,0,0,0,0,0,60,172,64,0,0,0,0,0,136,185,64,0,0,0,0,0,84,172,64,0,0,0,0,0,91,185,64,0,0,0,0,0,126,172,64,0,0,0,0,0,5,185,64,0,0,0,0,0,208,172,64,0,0,0,0,0,63,184,64,0,0,0,0,0,68,173,64,0,0,0,0,0,113,184,64,0,0,0,0,0,74,169,64,0,0,0,0,0,88,184,64,0,0,0,0,0,110,168,64,0,0,0,0,0,9,184,64,0,0,0,0,0,194,164,64,0,0,0,0,0,207,183,64,0,0,0,0,0,184,161,64,0,0,0,0,0,225,183,64,0,0,0,0,0,138,161,64,0,0,0,0,0,69,184,64,0,0,0,0,0,132,160,64,0,0,0,0,0,207,184,64,0,0,0,0,0,32,159,64,0,0,0,0,0,209,185,64,0,0,0,0,0,160,155,64,0,0,0,0,0,144,186,64,0,0,0,0,0,204,155,64,191,190,190,190,190,190,238,63,249,248,248,248,248,248,232,63,21,21,21,21,21,21,229,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,146,186,64,0,0,0,0,0,32,156,64,0,0,0,0,0,86,188,64,0,0,0,0,0,144,156,64,0,0,0,0,0,45,189,64,0,0,0,0,0,20,157,64,0,0,0,0,0,110,189,64,0,0,0,0,0,220,158,64,0,0,0,0,0,185,189,64,0,0,0,0,0,114,160,64,0,0,0,0,0,239,189,64,0,0,0,0,0,184,161,64,0,0,0,0,0,38,190,64,0,0,0,0,0,0,163,64,0,0,0,0,0,20,190,64,0,0,0,0,0,84,163,64,0,0,0,0,0,212,190,64,0,0,0,0,0,22,165,64,0,0,0,0,0,178,190,64,0,0,0,0,0,132,166,64,0,0,0,0,0,163,190,64,0,0,0,0,0,24,167,64,0,0,0,0,0,74,190,64,0,0,0,0,0,38,168,64,0,0,0,0,0,230,189,64,0,0,0,0,0,84,169,64,0,0,0,0,0,98,189,64,0,0,0,0,0,82,170,64,0,0,0,0,0,251,187,64,0,0,0,0,0,2,173,64,0,0,0,0,0,162,186,64,0,0,0,0,0,160,172,64,0,0,0,0,0,1,186,64,0,0,0,0,0,114,172,64,0,0,0,0,0,185,185,64,0,0,0,0,0,64,172,64,0,0,0,0,0,142,185,64,0,0,0,0,0,32,172,64,0,0,0,0,0,86,185,64,0,0,0,0,0,96,172,64,0,0,0,0,0,3,185,64,0,0,0,0,0,178,172,64,0,0,0,0,0,75,184,64,0,0,0,0,0,38,173,64,0,0,0,0,0,125,184,64,0,0,0,0,0,64,169,64,0,0,0,0,0,100,184,64,0,0,0,0,0,102,168,64,0,0,0,0,0,23,184,64,0,0,0,0,0,204,164,64,0,0,0,0,0,223,183,64,0,0,0,0,0,206,161,64,0,0,0,0,0,240,183,64,0,0,0,0,0,164,161,64,0,0,0,0,0,65,184,64,0,0,0,0,0,190,160,64,0,0,0,0,0,217,184,64,0,0,0,0,0,104,159,64,0,0,0,0,0,213,185,64,0,0,0,0,0,248,155,64,0,0,0,0,0,146,186,64,0,0,0,0,0,32,156,64,95,95,95,95,95,95,239,63,124,124,124,124,124,124,236,63,155,154,154,154,154,154,234,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,147,186,64,0,0,0,0,0,120,156,64,0,0,0,0,0,79,188,64,0,0,0,0,0,232,156,64,0,0,0,0,0,33,189,64,0,0,0,0,0,100,157,64,0,0,0,0,0,97,189,64,0,0,0,0,0,40,159,64,0,0,0,0,0,172,189,64,0,0,0,0,0,152,160,64,0,0,0,0,0,224,189,64,0,0,0,0,0,208,161,64,0,0,0,0,0,23,190,64,0,0,0,0,0,16,163,64,0,0,0,0,0,5,190,64,0,0,0,0,0,102,163,64,0,0,0,0,0,192,190,64,0,0,0,0,0,32,165,64,0,0,0,0,0,160,190,64,0,0,0,0,0,134,166,64,0,0,0,0,0,145,190,64,0,0,0,0,0,30,167,64,0,0,0,0,0,57,190,64,0,0,0,0,0,34,168,64,0,0,0,0,0,215,189,64,0,0,0,0,0,72,169,64,0,0,0,0,0,85,189,64,0,0,0,0,0,66,170,64,0,0,0,0,0,246,187,64,0,0,0,0,0,230,172,64,0,0,0,0,0,164,186,64,0,0,0,0,0,132,172,64,0,0,0,0,0,189,185,64,0,0,0,0,0,38,172,64,0,0,0,0,0,142,185,64,0,0,0,0,0,8,172,64,0,0,0,0,0,86,185,64,0,0,0,0,0,68,172,64,0,0,0,0,0,8,185,64,0,0,0,0,0,148,172,64,0,0,0,0,0,88,184,64,0,0,0,0,0,6,173,64,0,0,0,0,0,137,184,64,0,0,0,0,0,52,169,64,0,0,0,0,0,113,184,64,0,0,0,0,0,96,168,64,0,0,0,0,0,36,184,64,0,0,0,0,0,216,164,64,0,0,0,0,0,238,183,64,0,0,0,0,0,232,161,64,0,0,0,0,0,254,183,64,0,0,0,0,0,190,161,64,0,0,0,0,0,75,184,64,0,0,0,0,0,226,160,64,0,0,0,0,0,227,184,64,0,0,0,0,0,176,159,64,0,0,0,0,0,218,185,64,0,0,0,0,0,80,156,64,0,0,0,0,0,147,186,64,0,0,0,0,0,120,156,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,149,186,64,0,0,0,0,0,208,156,64,0,0,0,0,0,72,188,64,0,0,0,0,0,60,157,64,0,0,0,0,0,23,189,64,0,0,0,0,0,188,157,64,0,0,0,0,0,85,189,64,0,0,0,0,0,112,159,64,0,0,0,0,0,158,189,64,0,0,0,0,0,184,160,64,0,0,0,0,0,210,189,64,0,0,0,0,0,236,161,64,0,0,0,0,0,7,190,64,0,0,0,0,0,38,163,64,0,0,0,0,0,245,189,64,0,0,0,0,0,120,163,64,0,0,0,0,0,173,190,64,0,0,0,0,0,40,165,64,0,0,0,0,0,141,190,64,0,0,0,0,0,136,166,64,0,0,0,0,0,128,190,64,0,0,0,0,0,24,167,64,0,0,0,0,0,42,190,64,0,0,0,0,0,26,168,64,0,0,0,0,0,205,189,64,0,0,0,0,0,54,169,64,0,0,0,0,0,74,189,64,0,0,0,0,0,50,170,64,0,0,0,0,0,241,187,64,0,0,0,0,0,198,172,64,0,0,0,0,0,165,186,64,0,0,0,0,0,104,172,64,0,0,0,0,0,189,185,64,0,0,0,0,0,14,172,64,0,0,0,0,0,135,185,64,0,0,0,0,0,240,171,64,0,0,0,0,0,78,185,64,0,0,0,0,0,46,172,64,0,0,0,0,0,3,185,64,0,0,0,0,0,126,172,64,0,0,0,0,0,101,184,64,0,0,0,0,0,232,172,64,0,0,0,0,0,149,184,64,0,0,0,0,0,40,169,64,0,0,0,0,0,125,184,64,0,0,0,0,0,88,168,64,0,0,0,0,0,51,184,64,0,0,0,0,0,226,164,64,0,0,0,0,0,253,183,64,0,0,0,0,0,2,162,64,0,0,0,0,0,13,184,64,0,0,0,0,0,216,161,64,0,0,0,0,0,102,184,64,0,0,0,0,0,236,160,64,0,0,0,0,0,238,184,64,0,0,0,0,0,248,159,64,0,0,0,0,0,224,185,64,0,0,0,0,0,168,156,64,0,0,0,0,0,149,186,64,0,0,0,0,0,208,156,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,49,187,64,0,0,0,0,0,8,168,64,0,0,0,0,0,25,188,64,0,0,0,0,0,72,168,64,0,0,0,0,0,69,190,64,0,0,0,0,0,24,167,64,0,0,0,0,0,173,184,64,0,0,0,0,0,40,172,64,0,0,0,0,0,213,184,64,0,0,0,0,0,216,171,64,0,0,0,0,0,253,184,64,0,0,0,0,0,136,171,64,0,0,0,0,0,69,185,64,0,0,0,0,0,104,170,64,0,0,0,0,0,245,185,64,0,0,0,0,0,0,167,64,0,0,0,0,0,49,187,64,0,0,0,0,0,8,168,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,149,185,64,0,0,0,0,0,40,170,64,0,0,0,0,0,61,186,64,0,0,0,0,0,224,167,64,0,0,0,0,0,133,187,64,0,0,0,0,0,152,168,64,0,0,0,0,0,77,188,64,0,0,0,0,0,168,168,64,0,0,0,0,0,145,190,64,0,0,0,0,0,192,166,64,0,0,0,0,0,150,190,64,0,0,0,0,0,20,167,64,0,0,0,0,0,82,190,64,0,0,0,0,0,134,167,64,0,0,0,0,0,24,190,64,0,0,0,0,0,230,167,64,0,0,0,0,0,245,189,64,0,0,0,0,0,248,167,64,0,0,0,0,0,5,189,64,0,0,0,0,0,128,168,64,0,0,0,0,0,45,188,64,0,0,0,0,0,6,169,64,0,0,0,0,0,45,188,64,0,0,0,0,0,56,169,64,0,0,0,0,0,45,188,64,0,0,0,0,0,136,169,64,0,0,0,0,0,221,187,64,0,0,0,0,0,72,171,64,0,0,0,0,0,29,187,64,0,0,0,0,0,200,173,64,0,0,0,0,0,245,185,64,0,0,0,0,0,72,172,64,0,0,0,0,0,37,185,64,0,0,0,0,0,120,171,64,0,0,0,0,0,165,184,64,0,0,0,0,0,24,172,64,0,0,0,0,0,173,184,64,0,0,0,0,0,216,171,64,0,0,0,0,0,237,184,64,0,0,0,0,0,152,171,64,0,0,0,0,0,149,185,64,0,0,0,0,0,40,170,64,51,51,51,51,51,51,227,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,201,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,186,64,0,0,0,0,0,238,171,64,0,0,0,0,0,172,185,64,0,0,0,0,0,118,171,64,0,0,0,0,0,172,185,64,0,0,0,0,0,200,170,64,0,0,0,0,0,172,185,64,0,0,0,0,0,14,170,64,0,0,0,0,0,17,186,64,0,0,0,0,0,110,169,64,0,0,0,0,0,116,186,64,0,0,0,0,0,212,168,64,0,0,0,0,0,221,186,64,0,0,0,0,0,212,168,64,0,0,0,0,0,67,187,64,0,0,0,0,0,212,168,64,0,0,0,0,0,140,187,64,0,0,0,0,0,86,169,64,0,0,0,0,0,214,187,64,0,0,0,0,0,218,169,64,0,0,0,0,0,214,187,64,0,0,0,0,0,152,170,64,0,0,0,0,0,214,187,64,0,0,0,0,0,82,171,64,0,0,0,0,0,140,187,64,0,0,0,0,0,214,171,64,0,0,0,0,0,66,187,64,0,0,0,0,0,92,172,64,0,0,0,0,0,221,186,64,0,0,0,0,0,92,172,64,0,0,0,0,0,110,186,64,0,0,0,0,0,92,172,64,0,0,0,0,0,17,186,64,0,0,0,0,0,238,171,64,154,153,153,153,153,153,217,63,51,51,51,51,51,51,227,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,207,185,64,0,0,0,0,0,18,170,64,0,0,0,0,0,229,185,64,0,0,0,0,0,136,169,64,0,0,0,0,0,55,186,64,0,0,0,0,0,44,169,64,0,0,0,0,0,134,186,64,0,0,0,0,0,212,168,64,0,0,0,0,0,221,186,64,0,0,0,0,0,212,168,64,0,0,0,0,0,98,187,64,0,0,0,0,0,212,168,64,0,0,0,0,0,171,187,64,0,0,0,0,0,154,169,64,0,0,0,0,0,65,187,64,0,0,0,0,0,142,169,64,0,0,0,0,0,149,186,64,0,0,0,0,0,194,169,64,0,0,0,0,0,52,186,64,0,0,0,0,0,222,169,64,0,0,0,0,0,207,185,64,0,0,0,0,0,18,170,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,45,187,64,0,0,0,0,0,144,169,64,0,0,0,0,0,45,187,64,0,0,0,0,0,56,169,64,0,0,0,0,0,133,187,64,0,0,0,0,0,184,169,64,0,0,0,0,0,117,187,64,0,0,0,0,0,64,170,64,0,0,0,0,0,45,187,64,0,0,0,0,0,144,169,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,125,186,64,0,0,0,0,0,198,170,64,0,0,0,0,0,99,186,64,0,0,0,0,0,146,170,64,0,0,0,0,0,99,186,64,0,0,0,0,0,72,170,64,0,0,0,0,0,99,186,64,0,0,0,0,0,252,169,64,0,0,0,0,0,125,186,64,0,0,0,0,0,200,169,64,0,0,0,0,0,151,186,64,0,0,0,0,0,148,169,64,0,0,0,0,0,189,186,64,0,0,0,0,0,148,169,64,0,0,0,0,0,226,186,64,0,0,0,0,0,148,169,64,0,0,0,0,0,252,186,64,0,0,0,0,0,200,169,64,0,0,0,0,0,24,187,64,0,0,0,0,0,252,169,64,0,0,0,0,0,24,187,64,0,0,0,0,0,72,170,64,0,0,0,0,0,24,187,64,0,0,0,0,0,146,170,64,0,0,0,0,0,252,186,64,0,0,0,0,0,198,170,64,0,0,0,0,0,226,186,64,0,0,0,0,0,254,170,64,0,0,0,0,0,189,186,64,0,0,0,0,0,254,170,64,0,0,0,0,0,151,186,64,0,0,0,0,0,254,170,64,0,0,0,0,0,125,186,64,0,0,0,0,0,198,170,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,85,177,64,0,0,0,0,0,232,163,64,0,0,0,0,0,85,177,64,0,0,0,0,0,152,163,64,0,0,0,0,0,69,177,64,0,0,0,0,0,152,162,64,0,0,0,0,0,21,178,64,0,0,0,0,0,144,159,64,0,0,0,0,0,130,178,64,0,0,0,0,0,188,157,64,0,0,0,0,0,61,179,64,0,0,0,0,0,176,159,64,0,0,0,0,0,85,179,64,0,0,0,0,0,240,159,64,0,0,0,0,0,93,179,64,0,0,0,0,0,200,162,64,0,0,0,0,0,101,179,64,0,0,0,0,0,88,163,64,0,0,0,0,0,141,178,64,0,0,0,0,0,232,164,64,0,0,0,0,0,93,178,64,0,0,0,0,0,152,165,64,0,0,0,0,0,157,178,64,0,0,0,0,0,232,168,64,0,0,0,0,0,69,178,64,0,0,0,0,0,246,170,64,0,0,0,0,0,213,177,64,0,0,0,0,0,136,170,64,0,0,0,0,0,253,176,64,0,0,0,0,0,184,169,64,0,0,0,0,0,213,176,64,0,0,0,0,0,120,167,64,0,0,0,0,0,61,176,64,0,0,0,0,0,216,166,64,0,0,0,0,0,53,176,64,0,0,0,0,0,56,166,64,0,0,0,0,0,93,176,64,0,0,0,0,0,216,165,64,0,0,0,0,0,53,176,64,0,0,0,0,0,104,165,64,0,0,0,0,0,109,176,64,0,0,0,0,0,8,165,64,0,0,0,0,0,133,176,64,0,0,0,0,0,248,164,64,0,0,0,0,0,157,176,64,0,0,0,0,0,40,164,64,0,0,0,0,0,189,176,64,0,0,0,0,0,216,163,64,0,0,0,0,0,85,177,64,0,0,0,0,0,232,163,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,177,64,0,0,0,0,0,214,163,64,0,0,0,0,0,83,177,64,0,0,0,0,0,240,162,64,0,0,0,0,0,15,178,64,0,0,0,0,0,104,160,64,0,0,0,0,0,110,178,64,0,0,0,0,0,56,159,64,0,0,0,0,0,25,179,64,0,0,0,0,0,118,160,64,0,0,0,0,0,47,179,64,0,0,0,0,0,148,160,64,0,0,0,0,0,54,179,64,0,0,0,0,0,28,163,64,0,0,0,0,0,61,179,64,0,0,0,0,0,156,163,64,0,0,0,0,0,123,178,64,0,0,0,0,0,4,165,64,0,0,0,0,0,79,178,64,0,0,0,0,0,164,165,64,0,0,0,0,0,137,178,64,0,0,0,0,0,158,168,64,0,0,0,0,0,58,178,64,0,0,0,0,0,118,170,64,0,0,0,0,0,213,177,64,0,0,0,0,0,20,170,64,0,0,0,0,0,19,177,64,0,0,0,0,0,90,169,64,0,0,0,0,0,239,176,64,0,0,0,0,0,84,167,64,0,0,0,0,0,102,176,64,0,0,0,0,0,196,166,64,0,0,0,0,0,95,176,64,0,0,0,0,0,52,166,64,0,0,0,0,0,131,176,64,0,0,0,0,0,220,165,64,0,0,0,0,0,95,176,64,0,0,0,0,0,120,165,64,0,0,0,0,0,145,176,64,0,0,0,0,0,34,165,64,0,0,0,0,0,167,176,64,0,0,0,0,0,20,165,64,0,0,0,0,0,188,176,64,0,0,0,0,0,88,164,64,0,0,0,0,0,217,176,64,0,0,0,0,0,16,164,64,0,0,0,0,0,98,177,64,0,0,0,0,0,30,164,64,0,0,0,0,0,98,177,64,0,0,0,0,0,214,163,64,158,157,157,157,157,157,237,63,211,210,210,210,210,210,226,63,87,87,87,87,87,87,215,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,88,177,64,0,0,0,0,0,246,163,64,0,0,0,0,0,88,177,64,0,0,0,0,0,168,163,64,0,0,0,0,0,73,177,64,0,0,0,0,0,174,162,64,0,0,0,0,0,19,178,64,0,0,0,0,0,224,159,64,0,0,0,0,0,136,178,64,0,0,0,0,0,236,157,64,0,0,0,0,0,52,179,64,0,0,0,0,0,0,160,64,0,0,0,0,0,75,179,64,0,0,0,0,0,30,160,64,0,0,0,0,0,83,179,64,0,0,0,0,0,220,162,64,0,0,0,0,0,91,179,64,0,0,0,0,0,106,163,64,0,0,0,0,0,136,178,64,0,0,0,0,0,240,164,64,0,0,0,0,0,90,178,64,0,0,0,0,0,154,165,64,0,0,0,0,0,152,178,64,0,0,0,0,0,214,168,64,0,0,0,0,0,67,178,64,0,0,0,0,0,214,170,64,0,0,0,0,0,213,177,64,0,0,0,0,0,108,170,64,0,0,0,0,0,2,177,64,0,0,0,0,0,160,169,64,0,0,0,0,0,219,176,64,0,0,0,0,0,110,167,64,0,0,0,0,0,71,176,64,0,0,0,0,0,210,166,64,0,0,0,0,0,63,176,64,0,0,0,0,0,54,166,64,0,0,0,0,0,102,176,64,0,0,0,0,0,218,165,64,0,0,0,0,0,63,176,64,0,0,0,0,0,108,165,64,0,0,0,0,0,118,176,64,0,0,0,0,0,14,165,64,0,0,0,0,0,141,176,64,0,0,0,0,0,254,164,64,0,0,0,0,0,165,176,64,0,0,0,0,0,52,164,64,0,0,0,0,0,196,176,64,0,0,0,0,0,230,163,64,0,0,0,0,0,88,177,64,0,0,0,0,0,246,163,64,94,94,94,94,94,94,238,63,55,55,55,55,55,55,231,63,114,114,114,114,114,114,226,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,91,177,64,0,0,0,0,0,4,164,64,0,0,0,0,0,91,177,64,0,0,0,0,0,184,163,64,0,0,0,0,0,76,177,64,0,0,0,0,0,196,162,64,0,0,0,0,0,18,178,64,0,0,0,0,0,24,160,64,0,0,0,0,0,90,178,64,0,0,0,0,0,252,158,64,0,0,0,0,0,193,178,64,0,0,0,0,0,104,159,64,0,0,0,0,0,3,179,64,0,0,0,0,0,176,159,64,0,0,0,0,0,43,179,64,0,0,0,0,0,40,160,64,0,0,0,0,0,66,179,64,0,0,0,0,0,70,160,64,0,0,0,0,0,73,179,64,0,0,0,0,0,242,162,64,0,0,0,0,0,81,179,64,0,0,0,0,0,122,163,64,0,0,0,0,0,132,178,64,0,0,0,0,0,246,164,64,0,0,0,0,0,86,178,64,0,0,0,0,0,158,165,64,0,0,0,0,0,147,178,64,0,0,0,0,0,196,168,64,0,0,0,0,0,64,178,64,0,0,0,0,0,180,170,64,0,0,0,0,0,213,177,64,0,0,0,0,0,78,170,64,0,0,0,0,0,8,177,64,0,0,0,0,0,136,169,64,0,0,0,0,0,226,176,64,0,0,0,0,0,102,167,64,0,0,0,0,0,81,176,64,0,0,0,0,0,206,166,64,0,0,0,0,0,74,176,64,0,0,0,0,0,54,166,64,0,0,0,0,0,112,176,64,0,0,0,0,0,218,165,64,0,0,0,0,0,74,176,64,0,0,0,0,0,112,165,64,0,0,0,0,0,127,176,64,0,0,0,0,0,20,165,64,0,0,0,0,0,150,176,64,0,0,0,0,0,6,165,64,0,0,0,0,0,173,176,64,0,0,0,0,0,64,164,64,0,0,0,0,0,203,176,64,0,0,0,0,0,244,163,64,0,0,0,0,0,91,177,64,0,0,0,0,0,4,164,64,63,63,63,63,63,63,239,63,156,155,155,155,155,155,235,63,57,57,57,57,57,57,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,95,177,64,0,0,0,0,0,198,163,64,0,0,0,0,0,80,177,64,0,0,0,0,0,218,162,64,0,0,0,0,0,16,178,64,0,0,0,0,0,64,160,64,0,0,0,0,0,86,178,64,0,0,0,0,0,84,159,64,0,0,0,0,0,187,178,64,0,0,0,0,0,192,159,64,0,0,0,0,0,1,179,64,0,0,0,0,0,6,160,64,0,0,0,0,0,34,179,64,0,0,0,0,0,78,160,64,0,0,0,0,0,56,179,64,0,0,0,0,0,108,160,64,0,0,0,0,0,64,179,64,0,0,0,0,0,6,163,64,0,0,0,0,0,71,179,64,0,0,0,0,0,140,163,64,0,0,0,0,0,127,178,64,0,0,0,0,0,254,164,64,0,0,0,0,0,83,178,64,0,0,0,0,0,160,165,64,0,0,0,0,0,142,178,64,0,0,0,0,0,176,168,64,0,0,0,0,0,61,178,64,0,0,0,0,0,150,170,64,0,0,0,0,0,213,177,64,0,0,0,0,0,50,170,64,0,0,0,0,0,13,177,64,0,0,0,0,0,114,169,64,0,0,0,0,0,232,176,64,0,0,0,0,0,92,167,64,0,0,0,0,0,92,176,64,0,0,0,0,0,200,166,64,0,0,0,0,0,84,176,64,0,0,0,0,0,52,166,64,0,0,0,0,0,121,176,64,0,0,0,0,0,220,165,64,0,0,0,0,0,84,176,64,0,0,0,0,0,116,165,64,0,0,0,0,0,136,176,64,0,0,0,0,0,28,165,64,0,0,0,0,0,158,176,64,0,0,0,0,0,12,165,64,0,0,0,0,0,180,176,64,0,0,0,0,0,76,164,64,0,0,0,0,0,210,176,64,0,0,0,0,0,2,164,64,0,0,0,0,0,95,177,64,0,0,0,0,0,16,164,64,0,0,0,0,0,95,177,64,0,0,0,0,0,198,163,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,98,177,64,0,0,0,0,0,214,163,64,0,0,0,0,0,83,177,64,0,0,0,0,0,240,162,64,0,0,0,0,0,15,178,64,0,0,0,0,0,104,160,64,0,0,0,0,0,84,178,64,0,0,0,0,0,168,159,64,0,0,0,0,0,182,178,64,0,0,0,0,0,6,160,64,0,0,0,0,0,255,178,64,0,0,0,0,0,46,160,64,0,0,0,0,0,25,179,64,0,0,0,0,0,118,160,64,0,0,0,0,0,47,179,64,0,0,0,0,0,148,160,64,0,0,0,0,0,54,179,64,0,0,0,0,0,28,163,64,0,0,0,0,0,61,179,64,0,0,0,0,0,156,163,64,0,0,0,0,0,123,178,64,0,0,0,0,0,4,165,64,0,0,0,0,0,79,178,64,0,0,0,0,0,164,165,64,0,0,0,0,0,137,178,64,0,0,0,0,0,154,168,64,0,0,0,0,0,58,178,64,0,0,0,0,0,118,170,64,0,0,0,0,0,213,177,64,0,0,0,0,0,20,170,64,0,0,0,0,0,19,177,64,0,0,0,0,0,90,169,64,0,0,0,0,0,239,176,64,0,0,0,0,0,84,167,64,0,0,0,0,0,102,176,64,0,0,0,0,0,196,166,64,0,0,0,0,0,95,176,64,0,0,0,0,0,52,166,64,0,0,0,0,0,131,176,64,0,0,0,0,0,220,165,64,0,0,0,0,0,95,176,64,0,0,0,0,0,120,165,64,0,0,0,0,0,145,176,64,0,0,0,0,0,34,165,64,0,0,0,0,0,167,176,64,0,0,0,0,0,20,165,64,0,0,0,0,0,188,176,64,0,0,0,0,0,88,164,64,0,0,0,0,0,217,176,64,0,0,0,0,0,16,164,64,0,0,0,0,0,98,177,64,0,0,0,0,0,30,164,64,0,0,0,0,0,98,177,64,0,0,0,0,0,214,163,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,79,177,64,0,0,0,0,0,48,167,64,0,0,0,0,0,63,177,64,0,0,0,0,0,48,167,64,0,0,0,0,0,137,176,64,0,0,0,0,0,232,165,64,0,0,0,0,0,157,176,64,0,0,0,0,0,10,166,64,0,0,0,0,0,75,178,64,0,0,0,0,0,160,167,64,0,0,0,0,0,79,177,64,0,0,0,0,0,48,167,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,245,177,64,0,0,0,0,0,56,170,64,0,0,0,0,0,158,177,64,0,0,0,0,0,6,170,64,0,0,0,0,0,114,177,64,0,0,0,0,0,166,168,64,0,0,0,0,0,65,177,64,0,0,0,0,0,26,167,64,0,0,0,0,0,245,176,64,0,0,0,0,0,168,166,64,0,0,0,0,0,101,178,64,0,0,0,0,0,56,167,64,0,0,0,0,0,101,178,64,0,0,0,0,0,232,167,64,0,0,0,0,0,101,178,64,0,0,0,0,0,120,170,64,0,0,0,0,0,245,177,64,0,0,0,0,0,56,170,64,51,51,51,51,51,51,227,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,201,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,178,64,0,0,0,0,0,202,168,64,0,0,0,0,0,87,178,64,0,0,0,0,0,132,169,64,0,0,0,0,0,17,178,64,0,0,0,0,0,160,169,64,0,0,0,0,0,209,177,64,0,0,0,0,0,186,169,64,0,0,0,0,0,173,177,64,0,0,0,0,0,212,168,64,0,0,0,0,0,140,177,64,0,0,0,0,0,6,168,64,0,0,0,0,0,157,177,64,0,0,0,0,0,64,167,64,0,0,0,0,0,81,178,64,0,0,0,0,0,122,167,64,0,0,0,0,0,101,178,64,0,0,0,0,0,232,167,64,0,0,0,0,0,117,178,64,0,0,0,0,0,62,168,64,0,0,0,0,0,104,178,64,0,0,0,0,0,202,168,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,177,190,64,0,0,0,0,0,192,166,64,0,0,0,0,0,245,190,64,0,0,0,0,0,248,166,64,0,0,0,0,0,45,191,64,0,0,0,0,0,176,166,64,0,0,0,0,0,165,191,64,0,0,0,0,0,112,166,64,0,0,0,0,0,209,191,64,0,0,0,0,0,232,165,64,0,0,0,0,128,68,192,64,0,0,0,0,0,88,164,64,0,0,0,0,128,80,192,64,0,0,0,0,0,160,164,64,0,0,0,0,128,102,192,64,0,0,0,0,0,88,164,64,0,0,0,0,128,84,192,64,0,0,0,0,0,128,166,64,0,0,0,0,128,60,192,64,0,0,0,0,0,152,167,64,0,0,0,0,128,90,192,64,0,0,0,0,0,32,168,64,0,0,0,0,128,108,192,64,0,0,0,0,0,168,168,64,0,0,0,0,128,108,192,64,0,0,0,0,0,216,168,64,0,0,0,0,128,134,192,64,0,0,0,0,0,192,169,64,0,0,0,0,128,168,192,64,0,0,0,0,0,136,172,64,0,0,0,0,128,88,192,64,0,0,0,0,0,200,170,64,0,0,0,0,128,80,192,64,0,0,0,0,0,0,170,64,0,0,0,0,128,54,192,64,0,0,0,0,0,88,169,64,0,0,0,0,0,221,191,64,0,0,0,0,0,88,168,64,0,0,0,0,0,217,191,64,0,0,0,0,0,240,168,64,0,0,0,0,0,153,191,64,0,0,0,0,0,120,169,64,0,0,0,0,0,213,191,64,0,0,0,0,0,224,170,64,0,0,0,0,128,38,192,64,0,0,0,0,0,144,173,64,0,0,0,0,0,189,190,64,0,0,0,0,0,152,174,64,0,0,0,0,0,197,189,64,0,0,0,0,0,184,175,64,0,0,0,0,0,161,188,64,0,0,0,0,0,32,174,64,0,0,0,0,0,93,188,64,0,0,0,0,0,176,173,64,0,0,0,0,0,45,188,64,0,0,0,0,0,136,173,64,0,0,0,0,0,169,187,64,0,0,0,0,0,120,173,64,0,0,0,0,0,73,187,64,0,0,0,0,0,72,173,64,0,0,0,0,0,205,186,64,0,0,0,0,0,192,172,64,0,0,0,0,0,197,185,64,0,0,0,0,0,16,172,64,0,0,0,0,0,181,185,64,0,0,0,0,0,120,172,64,0,0,0,0,0,164,185,64,0,0,0,0,0,230,172,64,0,0,0,0,0,137,184,64,0,0,0,0,0,144,173,64,0,0,0,0,0,93,184,64,0,0,0,0,0,168,173,64,0,0,0,0,0,79,184,64,0,0,0,0,0,184,173,64,0,0,0,0,0,85,184,64,0,0,0,0,0,230,173,64,0,0,0,0,0,117,184,64,0,0,0,0,0,198,174,64,0,0,0,0,0,9,184,64,0,0,0,0,0,114,173,64,0,0,0,0,0,31,184,64,0,0,0,0,0,154,173,64,0,0,0,0,0,60,184,64,0,0,0,0,0,86,173,64,0,0,0,0,0,126,184,64,0,0,0,0,0,168,172,64,0,0,0,0,0,232,184,64,0,0,0,0,0,140,171,64,0,0,0,0,0,109,185,64,0,0,0,0,0,168,171,64,0,0,0,0,0,9,187,64,0,0,0,0,0,16,173,64,0,0,0,0,0,89,187,64,0,0,0,0,0,136,172,64,0,0,0,0,0,128,187,64,0,0,0,0,0,70,172,64,0,0,0,0,0,145,187,64,0,0,0,0,0,136,172,64,0,0,0,0,0,164,187,64,0,0,0,0,0,206,172,64,0,0,0,0,0,213,187,64,0,0,0,0,0,136,172,64,0,0,0,0,0,49,189,64,0,0,0,0,0,48,170,64,0,0,0,0,0,93,189,64,0,0,0,0,0,56,169,64,0,0,0,0,0,209,189,64,0,0,0,0,0,8,168,64,0,0,0,0,0,77,190,64,0,0,0,0,0,216,168,64,0,0,0,0,0,133,190,64,0,0,0,0,0,24,169,64,0,0,0,0,0,201,189,64,0,0,0,0,0,72,169,64,0,0,0,0,0,65,189,64,0,0,0,0,0,40,170,64,0,0,0,0,0,41,189,64,0,0,0,0,0,168,170,64,0,0,0,0,0,21,189,64,0,0,0,0,0,88,171,64,0,0,0,0,0,33,189,64,0,0,0,0,0,160,171,64,0,0,0,0,0,193,189,64,0,0,0,0,0,64,172,64,0,0,0,0,0,149,189,64,0,0,0,0,0,128,172,64,0,0,0,0,0,181,188,64,0,0,0,0,0,40,172,64,0,0,0,0,0,145,188,64,0,0,0,0,0,128,172,64,0,0,0,0,0,97,188,64,0,0,0,0,0,208,172,64,0,0,0,0,0,233,188,64,0,0,0,0,0,32,173,64,0,0,0,0,0,69,189,64,0,0,0,0,0,120,173,64,0,0,0,0,0,93,189,64,0,0,0,0,0,40,173,64,0,0,0,0,0,213,189,64,0,0,0,0,0,64,172,64,0,0,0,0,0,217,189,64,0,0,0,0,0,32,173,64,0,0,0,0,0,241,189,64,0,0,0,0,0,152,173,64,0,0,0,0,0,17,190,64,0,0,0,0,0,112,172,64,0,0,0,0,0,101,190,64,0,0,0,0,0,96,172,64,0,0,0,0,0,121,190,64,0,0,0,0,0,168,171,64,0,0,0,0,0,158,190,64,0,0,0,0,0,86,170,64,0,0,0,0,0,225,190,64,0,0,0,0,0,112,170,64,0,0,0,0,0,1,191,64,0,0,0,0,0,176,170,64,0,0,0,0,0,9,191,64,0,0,0,0,0,248,169,64,0,0,0,0,0,121,191,64,0,0,0,0,0,56,169,64,0,0,0,0,0,113,191,64,0,0,0,0,0,208,168,64,0,0,0,0,0,57,191,64,0,0,0,0,0,232,167,64,0,0,0,0,0,25,191,64,0,0,0,0,0,0,168,64,0,0,0,0,0,229,190,64,0,0,0,0,0,72,168,64,0,0,0,0,0,193,190,64,0,0,0,0,0,124,168,64,0,0,0,0,0,165,190,64,0,0,0,0,0,120,168,64,0,0,0,0,0,143,190,64,0,0,0,0,0,116,168,64,0,0,0,0,0,92,190,64,0,0,0,0,0,26,168,64,0,0,0,0,0,43,190,64,0,0,0,0,0,196,167,64,0,0,0,0,0,13,190,64,0,0,0,0,0,200,167,64,0,0,0,0,0,125,190,64,0,0,0,0,0,176,166,64,0,0,0,0,0,177,190,64,0,0,0,0,0,192,166,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,38,197,64,0,0,0,0,0,192,125,64,0,0,0,0,128,62,197,64,0,0,0,0,0,64,126,64,0,0,0,0,128,130,197,64,0,0,0,0,0,64,122,64,0,0,0,0,128,202,197,64,0,0,0,0,0,192,112,64,0,0,0,0,128,30,198,64,0,0,0,0,0,192,114,64,0,0,0,0,128,90,198,64,0,0,0,0,0,64,115,64,0,0,0,0,128,78,198,64,0,0,0,0,0,160,128,64,0,0,0,0,128,101,198,64,0,0,0,0,0,160,138,64,0,0,0,0,128,27,198,64,0,0,0,0,0,124,146,64,0,0,0,0,0,4,198,64,0,0,0,0,0,36,148,64,0,0,0,0,128,219,197,64,0,0,0,0,0,44,150,64,0,0,0,0,128,166,197,64,0,0,0,0,0,208,152,64,0,0,0,0,128,114,197,64,0,0,0,0,0,144,155,64,0,0,0,0,128,50,197,64,0,0,0,0,0,80,156,64,0,0,0,0,128,34,196,64,0,0,0,0,0,240,158,64,0,0,0,0,128,102,195,64,0,0,0,0,0,168,160,64,0,0,0,0,128,118,195,64,0,0,0,0,0,208,159,64,0,0,0,0,128,98,195,64,0,0,0,0,0,208,158,64,0,0,0,0,128,94,195,64,0,0,0,0,0,208,156,64,0,0,0,0,128,146,194,64,0,0,0,0,0,80,151,64,0,0,0,0,128,170,194,64,0,0,0,0,0,48,144,64,0,0,0,0,128,198,194,64,0,0,0,0,0,160,132,64,0,0,0,0,128,198,195,64,0,0,0,0,0,64,127,64,0,0,0,0,128,38,197,64,0,0,0,0,0,192,125,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,205,197,64,0,0,0,0,0,224,120,64,0,0,0,0,128,253,197,64,0,0,0,0,0,224,114,64,0,0,0,0,128,232,197,64,0,0,0,0,0,0,126,64,0,0,0,0,128,247,197,64,0,0,0,0,0,208,132,64,0,0,0,0,0,165,197,64,0,0,0,0,0,52,144,64,0,0,0,0,128,90,197,64,0,0,0,0,0,124,149,64,0,0,0,0,128,29,197,64,0,0,0,0,0,72,151,64])
.concat([0,0,0,0,0,215,196,64,0,0,0,0,0,88,153,64,0,0,0,0,128,166,196,64,0,0,0,0,0,0,151,64,0,0,0,0,128,87,196,64,0,0,0,0,0,56,149,64,0,0,0,0,0,127,196,64,0,0,0,0,0,168,137,64,0,0,0,0,0,171,196,64,0,0,0,0,0,104,129,64,0,0,0,0,0,60,197,64,0,0,0,0,0,8,128,64,0,0,0,0,0,135,197,64,0,0,0,0,0,8,128,64,0,0,0,0,128,205,197,64,0,0,0,0,0,224,120,64,154,153,153,153,153,153,201,63,154,153,153,153,153,153,201,63,154,153,153,153,153,153,201,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,202,197,64,0,0,0,0,0,128,121,64,0,0,0,0,0,250,197,64,0,0,0,0,0,128,115,64,0,0,0,0,0,229,197,64,0,0,0,0,0,112,126,64,0,0,0,0,128,243,197,64,0,0,0,0,0,0,133,64,0,0,0,0,0,163,197,64,0,0,0,0,0,40,144,64,0,0,0,0,128,89,197,64,0,0,0,0,0,88,149,64,0,0,0,0,128,29,197,64,0,0,0,0,0,28,151,64,0,0,0,0,128,216,196,64,0,0,0,0,0,32,153,64,0,0,0,0,0,169,196,64,0,0,0,0,0,216,150,64,0,0,0,0,0,91,196,64,0,0,0,0,0,20,149,64,0,0,0,0,0,130,196,64,0,0,0,0,0,176,137,64,0,0,0,0,0,173,196,64,0,0,0,0,0,152,129,64,0,0,0,0,0,60,197,64,0,0,0,0,0,64,128,64,0,0,0,0,0,133,197,64,0,0,0,0,0,64,128,64,0,0,0,0,128,202,197,64,0,0,0,0,0,128,121,64,154,153,153,153,153,153,217,63,154,153,153,153,153,153,217,63,154,153,153,153,153,153,217,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,199,197,64,0,0,0,0,0,16,122,64,0,0,0,0,0,246,197,64,0,0,0,0,0,48,116,64,0,0,0,0,0,225,197,64,0,0,0,0,0,240,126,64,0,0,0,0,128,239,197,64,0,0,0,0,0,24,133,64,0,0,0,0,128,160,197,64,0,0,0,0,0,28,144,64,0,0,0,0,0,89,197,64,0,0,0,0,0,44,149,64,0,0,0,0,0,30,197,64,0,0,0,0,0,240,150,64,0,0,0,0,0,218,196,64,0,0,0,0,0,236,152,64,0,0,0,0,128,171,196,64,0,0,0,0,0,172,150,64,0,0,0,0,0,95,196,64,0,0,0,0,0,244,148,64,0,0,0,0,0,133,196,64,0,0,0,0,0,192,137,64,0,0,0,0,128,175,196,64,0,0,0,0,0,200,129,64,0,0,0,0,128,59,197,64,0,0,0,0,0,120,128,64,0,0,0,0,128,131,197,64,0,0,0,0,0,120,128,64,0,0,0,0,128,199,197,64,0,0,0,0,0,16,122,64,51,51,51,51,51,51,227,63,51,51,51,51,51,51,227,63,51,51,51,51,51,51,227,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,196,197,64,0,0,0,0,0,160,122,64,0,0,0,0,0,242,197,64,0,0,0,0,0,224,116,64,0,0,0,0,128,221,197,64,0,0,0,0,0,96,127,64,0,0,0,0,0,236,197,64,0,0,0,0,0,56,133,64,0,0,0,0,0,158,197,64,0,0,0,0,0,20,144,64,0,0,0,0,128,87,197,64,0,0,0,0,0,20,149,64,0,0,0,0,0,30,197,64,0,0,0,0,0,196,150,64,0,0,0,0,128,219,196,64,0,0,0,0,0,184,152,64,0,0,0,0,128,173,196,64,0,0,0,0,0,132,150,64,0,0,0,0,0,99,196,64,0,0,0,0,0,212,148,64,0,0,0,0,128,136,196,64,0,0,0,0,0,200,137,64,0,0,0,0,0,178,196,64,0,0,0,0,0,0,130,64,0,0,0,0,0,59,197,64,0,0,0,0,0,176,128,64,0,0,0,0,0,130,197,64,0,0,0,0,0,176,128,64,0,0,0,0,128,196,197,64,0,0,0,0,0,160,122,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,193,197,64,0,0,0,0,0,48,123,64,0,0,0,0,128,238,197,64,0,0,0,0,0,144,117,64,0,0,0,0,0,218,197,64,0,0,0,0,0,208,127,64,0,0,0,0,0,232,197,64,0,0,0,0,0,80,133,64,0,0,0,0,128,155,197,64,0,0,0,0,0,8,144,64,0,0,0,0,128,87,197,64,0,0,0,0,0,236,148,64,0,0,0,0,128,30,197,64,0,0,0,0,0,156,150,64,0,0,0,0,0,221,196,64,0,0,0,0,0,132,152,64,0,0,0,0,0,176,196,64,0,0,0,0,0,88,150,64,0,0,0,0,128,102,196,64,0,0,0,0,0,176,148,64,0,0,0,0,128,139,196,64,0,0,0,0,0,216,137,64,0,0,0,0,0,180,196,64,0,0,0,0,0,48,130,64,0,0,0,0,0,59,197,64,0,0,0,0,0,232,128,64,0,0,0,0,0,128,197,64,0,0,0,0,0,232,128,64,0,0,0,0,128,193,197,64,0,0,0,0,0,48,123,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,190,197,64,0,0,0,0,0,192,123,64,0,0,0,0,128,234,197,64,0,0,0,0,0,64,118,64,0,0,0,0,0,214,197,64,0,0,0,0,0,32,128,64,0,0,0,0,0,228,197,64,0,0,0,0,0,120,133,64,0,0,0,0,128,153,197,64,0,0,0,0,0,0,144,64,0,0,0,0,128,85,197,64,0,0,0,0,0,212,148,64,0,0,0,0,128,30,197,64,0,0,0,0,0,112,150,64,0,0,0,0,128,222,196,64,0,0,0,0,0,80,152,64,0,0,0,0,128,178,196,64,0,0,0,0,0,48,150,64,0,0,0,0,128,106,196,64,0,0,0,0,0,144,148,64,0,0,0,0,128,142,196,64,0,0,0,0,0,224,137,64,0,0,0,0,128,182,196,64,0,0,0,0,0,96,130,64,0,0,0,0,128,58,197,64,0,0,0,0,0,32,129,64,0,0,0,0,128,126,197,64,0,0,0,0,0,32,129,64,0,0,0,0,128,190,197,64,0,0,0,0,0,192,123,64,83,83,83,83,83,83,227,63,148,147,147,147,147,147,195,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,249,186,64,0,0,0,0,0,182,177,64,0,0,0,0,0,37,187,64,0,0,0,0,0,228,177,64,0,0,0,0,0,141,185,64,0,0,0,0,0,100,176,64,0,0,0,0,0,237,184,64,0,0,0,0,0,84,176,64,0,0,0,0,0,135,182,64,0,0,0,0,0,13,176,64,0,0,0,0,0,89,181,64,0,0,0,0,0,36,177,64,0,0,0,0,0,151,182,64,0,0,0,0,0,224,175,64,0,0,0,0,0,104,184,64,0,0,0,0,0,58,176,64,0,0,0,0,0,222,182,64,0,0,0,0,0,224,175,64,0,0,0,0,0,245,181,64,0,0,0,0,0,44,176,64,0,0,0,0,0,165,180,64,0,0,0,0,0,44,176,64,0,0,0,0,0,229,179,64,0,0,0,0,0,68,177,64,0,0,0,0,0,173,179,64,0,0,0,0,0,164,177,64,0,0,0,0,0,253,179,64,0,0,0,0,0,124,176,64,0,0,0,0,0,109,181,64,0,0,0,0,0,4,176,64,0,0,0,0,0,199,182,64,0,0,0,0,0,118,175,64,0,0,0,0,0,151,183,64,0,0,0,0,0,194,175,64,0,0,0,0,0,65,182,64,0,0,0,0,0,4,175,64,0,0,0,0,0,149,181,64,0,0,0,0,0,72,175,64,0,0,0,0,0,53,179,64,0,0,0,0,0,232,174,64,0,0,0,0,0,53,178,64,0,0,0,0,0,132,177,64,0,0,0,0,0,133,178,64,0,0,0,0,0,100,176,64,0,0,0,0,0,173,179,64,0,0,0,0,0,168,175,64,0,0,0,0,0,189,180,64,0,0,0,0,0,72,174,64,0,0,0,0,0,85,182,64,0,0,0,0,0,184,174,64,0,0,0,0,0,117,183,64,0,0,0,0,0,56,175,64,0,0,0,0,0,221,183,64,0,0,0,0,0,152,175,64,0,0,0,0,0,49,184,64,0,0,0,0,0,230,175,64,0,0,0,0,0,23,184,64,0,0,0,0,0,156,175,64,0,0,0,0,0,253,183,64,0,0,0,0,0,80,175,64,0,0,0,0,0,133,183,64,0,0,0,0,0,200,174,64,0,0,0,0,0,21,183,64,0,0,0,0,0,56,173,64,0,0,0,0,0,253,181,64,0,0,0,0,0,72,173,64,0,0,0,0,0,117,179,64,0,0,0,0,0,180,173,64,0,0,0,0,0,97,178,64,0,0,0,0,0,226,174,64,0,0,0,0,0,213,177,64,0,0,0,0,0,184,175,64,0,0,0,0,0,8,178,64,0,0,0,0,0,68,175,64,0,0,0,0,0,97,178,64,0,0,0,0,0,226,174,64,0,0,0,0,0,28,179,64,0,0,0,0,0,218,173,64,0,0,0,0,0,181,179,64,0,0,0,0,0,136,173,64,0,0,0,0,0,117,181,64,0,0,0,0,0,72,172,64,0,0,0,0,0,29,182,64,0,0,0,0,0,104,172,64,0,0,0,0,0,230,183,64,0,0,0,0,0,140,172,64,0,0,0,0,0,139,184,64,0,0,0,0,0,8,172,64,0,0,0,0,0,201,183,64,0,0,0,0,0,192,172,64,0,0,0,0,0,5,184,64,0,0,0,0,0,56,173,64,0,0,0,0,0,205,184,64,0,0,0,0,0,200,174,64,0,0,0,0,0,205,184,64,0,0,0,0,0,24,175,64,0,0,0,0,0,205,184,64,0,0,0,0,0,50,175,64,0,0,0,0,0,200,185,64,0,0,0,0,0,136,176,64,0,0,0,0,0,216,186,64,0,0,0,0,0,141,177,64,0,0,0,0,0,249,186,64,0,0,0,0,0,182,177,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,250,194,64,0,0,0,0,0,134,192,64,0,0,0,0,128,95,194,64,0,0,0,0,0,50,190,64,0,0,0,0,128,226,193,64,0,0,0,0,0,116,189,64,0,0,0,0,128,230,194,64,0,0,0,0,0,180,190,64,0,0,0,0,128,9,195,64,0,0,0,0,0,14,192,64,0,0,0,0,128,9,195,64,0,0,0,0,0,114,192,64,0,0,0,0,128,250,194,64,0,0,0,0,0,134,192,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,248,196,64,0,0,0,0,0,114,192,64,0,0,0,0,128,218,196,64,0,0,0,0,0,89,192,64,0,0,0,0,128,213,196,64,0,0,0,0,0,179,192,64,0,0,0,0,128,208,196,64,0,0,0,0,0,209,192,64,0,0,0,0,128,199,195,64,0,0,0,0,0,86,189,64,0,0,0,0,128,14,195,64,0,0,0,0,0,118,187,64,0,0,0,0,128,193,196,64,0,0,0,0,0,100,190,64,0,0,0,0,128,243,196,64,0,0,0,0,0,59,192,64,0,0,0,0,128,248,196,64,0,0,0,0,0,114,192,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,5,199,64,0,0,0,0,0,216,189,64,0,0,0,0,128,236,198,64,0,0,0,0,0,10,190,64,0,0,0,0,128,0,199,64,0,0,0,0,0,190,190,64,0,0,0,0,0,227,198,64,0,0,0,0,0,43,190,64,0,0,0,0,0,159,196,64,0,0,0,0,0,55,185,64,0,0,0,0,0,5,197,64,0,0,0,0,0,8,186,64,0,0,0,0,128,5,199,64,0,0,0,0,0,216,189,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,186,193,64,0,0,0,0,0,244,191,64,0,0,0,0,128,146,193,64,0,0,0,0,0,114,191,64,0,0,0,0,128,222,192,64,0,0,0,0,0,124,191,64,0,0,0,0,128,32,192,64,0,0,0,0,0,64,191,64,0,0,0,0,0,81,191,64,0,0,0,0,0,159,192,64,0,0,0,0,128,107,192,64,0,0,0,0,0,46,189,64,0,0,0,0,128,41,193,64,0,0,0,0,0,240,190,64,0,0,0,0,128,191,193,64,0,0,0,0,0,184,191,64,0,0,0,0,128,186,193,64,0,0,0,0,0,244,191,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,40,197,64,0,0,0,0,0,57,181,64,0,0,0,0,128,229,196,64,0,0,0,0,0,224,180,64,0,0,0,0,128,12,197,64,0,0,0,0,0,240,180,64,0,0,0,0,128,87,197,64,0,0,0,0,0,14,181,64,0,0,0,0,128,25,199,64,0,0,0,0,0,72,183,64,0,0,0,0,128,65,199,64,0,0,0,0,0,212,183,64,0,0,0,0,128,45,199,64,0,0,0,0,0,6,184,64,0,0,0,0,0,18,199,64,0,0,0,0,0,147,183,64,0,0,0,0,128,221,197,64,0,0,0,0,0,26,182,64,0,0,0,0,128,40,197,64,0,0,0,0,0,57,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,0,196,64,0,0,0,0,0,20,158,64,0,0,0,0,128,49,196,64,0,0,0,0,0,20,157,64,0,0,0,0,128,98,196,64,0,0,0,0,0,144,157,64,0,0,0,0,128,162,196,64,0,0,0,0,0,48,158,64,0,0,0,0,128,62,197,64,0,0,0,0,0,72,160,64,0,0,0,0,0,172,197,64,0,0,0,0,0,202,162,64,0,0,0,0,0,217,197,64,0,0,0,0,0,52,163,64,0,0,0,0,128,32,197,64,0,0,0,0,0,36,162,64,0,0,0,0,128,90,197,64,0,0,0,0,0,88,163,64,0,0,0,0,128,234,197,64,0,0,0,0,0,136,165,64,0,0,0,0,128,162,197,64,0,0,0,0,0,120,165,64,0,0,0,0,128,102,197,64,0,0,0,0,0,152,166,64,0,0,0,0,128,150,197,64,0,0,0,0,0,248,167,64,0,0,0,0,0,222,196,64,0,0,0,0,0,24,165,64,0,0,0,0,128,114,197,64,0,0,0,0,0,24,169,64,0,0,0,0,128,182,197,64,0,0,0,0,0,168,171,64,0,0,0,0,128,194,196,64,0,0,0,0,0,200,167,64,0,0,0,0,128,50,197,64,0,0,0,0,0,56,171,64,0,0,0,0,128,222,197,64,0,0,0,0,0,232,174,64,0,0,0,0,128,242,197,64,0,0,0,0,0,248,174,64,0,0,0,0,128,6,198,64,0,0,0,0,0,8,175,64,0,0,0,0,128,50,198,64,0,0,0,0,0,52,176,64,0,0,0,0,128,6,198,64,0,0,0,0,0,12,176,64,0,0,0,0,128,58,198,64,0,0,0,0,0,188,176,64,0,0,0,0,128,202,197,64,0,0,0,0,0,152,175,64,0,0,0,0,128,6,198,64,0,0,0,0,0,212,176,64,0,0,0,0,128,62,198,64,0,0,0,0,0,244,177,64,0,0,0,0,128,114,197,64,0,0,0,0,0,60,176,64,0,0,0,0,128,250,197,64,0,0,0,0,0,140,178,64,0,0,0,0,128,86,197,64,0,0,0,0,0,36,178,64,0,0,0,0,128,174,197,64,0,0,0,0,0,124,179,64,0,0,0,0,128,158,197,64,0,0,0,0,0,188,180,64,0,0,0,0,128,162,197,64,0,0,0,0,0,36,181,64,0,0,0,0,0,169,197,64,0,0,0,0,0,207,181,64,0,0,0,0,128,166,197,64,0,0,0,0,0,175,182,64,0,0,0,0,128,162,197,64,0,0,0,0,0,254,183,64,0,0,0,0,128,134,197,64,0,0,0,0,0,100,184,64,0,0,0,0,128,94,197,64,0,0,0,0,0,245,184,64,0,0,0,0,128,214,197,64,0,0,0,0,0,212,186,64,0,0,0,0,128,238,197,64,0,0,0,0,0,51,187,64,0,0,0,0,0,239,197,64,0,0,0,0,0,111,187,64,0,0,0,0,0,240,197,64,0,0,0,0,0,188,187,64,0,0,0,0,128,182,197,64,0,0,0,0,0,68,187,64,0,0,0,0,0,127,197,64,0,0,0,0,0,208,186,64,0,0,0,0,0,130,197,64,0,0,0,0,0,241,186,64,0,0,0,0,0,205,197,64,0,0,0,0,0,240,188,64,0,0,0,0,128,235,197,64,0,0,0,0,0,193,189,64,0,0,0,0,128,230,197,64,0,0,0,0,0,4,190,64,0,0,0,0,128,218,197,64,0,0,0,0,0,28,190,64,0,0,0,0,128,186,197,64,0,0,0,0,0,212,189,64,0,0,0,0,128,38,197,64,0,0,0,0,0,12,188,64,0,0,0,0,128,54,197,64,0,0,0,0,0,44,189,64,0,0,0,0,128,42,197,64,0,0,0,0,0,204,189,64,0,0,0,0,128,10,197,64,0,0,0,0,0,124,190,64,0,0,0,0,128,234,196,64,0,0,0,0,0,84,191,64,0,0,0,0,128,234,196,64,0,0,0,0,0,164,190,64,0,0,0,0,128,202,196,64,0,0,0,0,0,84,189,64,0,0,0,0,128,174,196,64,0,0,0,0,0,236,189,64,0,0,0,0,0,131,196,64,0,0,0,0,0,217,190,64,0,0,0,0,128,82,196,64,0,0,0,0,0,44,191,64,0,0,0,0,0,70,196,64,0,0,0,0,0,65,191,64,0,0,0,0,128,30,196,64,0,0,0,0,0,140,190,64,0,0,0,0,0,253,195,64,0,0,0,0,0,243,189,64,0,0,0,0,128,246,195,64,0,0,0,0,0,100,190,64,0,0,0,0,128,126,195,64,0,0,0,0,0,108,189,64,0,0,0,0,128,78,195,64,0,0,0,0,0,180,190,64,0,0,0,0,128,218,194,64,0,0,0,0,0,252,191,64,0,0,0,0,128,214,194,64,0,0,0,0,0,4,191,64,0,0,0,0,128,202,194,64,0,0,0,0,0,124,191,64,0,0,0,0,128,158,193,64,0,0,0,0,0,244,191,64,0,0,0,0,128,54,193,64,0,0,0,0,0,156,191,64,0,0,0,0,128,2,194,64,0,0,0,0,0,116,191,64,0,0,0,0,128,70,194,64,0,0,0,0,0,236,190,64,0,0,0,0,128,114,194,64,0,0,0,0,0,52,191,64,0,0,0,0,128,34,195,64,0,0,0,0,0,52,188,64,0,0,0,0,128,70,195,64,0,0,0,0,0,156,188,64,0,0,0,0,128,214,195,64,0,0,0,0,0,116,187,64,0,0,0,0,128,206,195,64,0,0,0,0,0,212,186,64,0,0,0,0,128,198,195,64,0,0,0,0,0,52,186,64,0,0,0,0,128,78,196,64,0,0,0,0,0,76,187,64,0,0,0,0,128,70,196,64,0,0,0,0,0,100,186,64,0,0,0,0,128,142,196,64,0,0,0,0,0,236,186,64,0,0,0,0,128,118,196,64,0,0,0,0,0,180,185,64,0,0,0,0,128,202,196,64,0,0,0,0,0,84,186,64,0,0,0,0,0,97,196,64,0,0,0,0,0,249,183,64,0,0,0,0,128,66,197,64,0,0,0,0,0,252,185,64,0,0,0,0,128,122,197,64,0,0,0,0,0,124,186,64,0,0,0,0,128,78,197,64,0,0,0,0,0,244,185,64,0,0,0,0,128,74,196,64,0,0,0,0,0,52,182,64,0,0,0,0,128,34,197,64,0,0,0,0,0,84,183,64,0,0,0,0,128,54,197,64,0,0,0,0,0,140,181,64,0,0,0,0,128,42,197,64,0,0,0,0,0,52,181,64,0,0,0,0,0,16,197,64,0,0,0,0,0,250,179,64,0,0,0,0,0,248,196,64,0,0,0,0,0,244,178,64,0,0,0,0,128,218,196,64,0,0,0,0,0,180,178,64,0,0,0,0,128,182,196,64,0,0,0,0,0,102,178,64,0,0,0,0,128,209,196,64,0,0,0,0,0,86,178,64,0,0,0,0,128,236,196,64,0,0,0,0,0,70,178,64,0,0,0,0,128,22,197,64,0,0,0,0,0,148,178,64,0,0,0,0,128,166,196,64,0,0,0,0,0,180,176,64,0,0,0,0,128,42,197,64,0,0,0,0,0,164,177,64,0,0,0,0,128,6,197,64,0,0,0,0,0,116,176,64,0,0,0,0,128,218,196,64,0,0,0,0,0,60,176,64,0,0,0,0,128,162,196,64,0,0,0,0,0,200,173,64,0,0,0,0,128,58,197,64,0,0,0,0,0,120,175,64,0,0,0,0,128,14,197,64,0,0,0,0,0,136,173,64,0,0,0,0,128,238,196,64,0,0,0,0,0,8,173,64,0,0,0,0,128,122,196,64,0,0,0,0,0,184,168,64,0,0,0,0,128,194,196,64,0,0,0,0,0,120,169,64,0,0,0,0,128,238,196,64,0,0,0,0,0,8,170,64,0,0,0,0,128,170,196,64,0,0,0,0,0,216,167,64,0,0,0,0,128,234,196,64,0,0,0,0,0,136,168,64,0,0,0,0,128,42,197,64,0,0,0,0,0,56,169,64,0,0,0,0,128,42,197,64,0,0,0,0,0,40,169,64,0,0,0,0,128,86,196,64,0,0,0,0,0,248,163,64,0,0,0,0,128,34,197,64,0,0,0,0,0,184,166,64,0,0,0,0,0,209,196,64,0,0,0,0,0,140,164,64,0,0,0,0,128,174,196,64,0,0,0,0,0,120,163,64,0,0,0,0,128,242,195,64,0,0,0,0,0,72,160,64,0,0,0,0,128,130,196,64,0,0,0,0,0,72,161,64,0,0,0,0,128,178,196,64,0,0,0,0,0,136,161,64,0,0,0,0,128,90,196,64,0,0,0,0,0,240,159,64,0,0,0,0,128,10,196,64,0,0,0,0,0,112,159,64,0,0,0,0,128,238,195,64,0,0,0,0,0,68,159,64,0,0,0,0,128,237,195,64,0,0,0,0,0,216,158,64,0,0,0,0,128,236,195,64,0,0,0,0,0,120,158,64,0,0,0,0,128,0,196,64,0,0,0,0,0,20,158,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,169,195,64,0,0,0,0,0,24,128,64,0,0,0,0,0,127,195,64,0,0,0,0,0,176,128,64,0,0,0,0,0,35,195,64,0,0,0,0,0,48,133,64,0,0,0,0,128,186,194,64,0,0,0,0,0,96,138,64,0,0,0,0,128,172,194,64,0,0,0,0,0,152,138,64,0,0,0,0,128,153,194,64,0,0,0,0,0,8,140,64,0,0,0,0,0,132,194,64,0,0,0,0,0,168,141,64,0,0,0,0,128,126,194,64,0,0,0,0,0,96,143,64,0,0,0,0,128,119,194,64,0,0,0,0,0,192,144,64,0,0,0,0,128,147,194,64,0,0,0,0,0,216,143,64,0,0,0,0,128,114,194,64,0,0,0,0,0,108,145,64,0,0,0,0,128,166,194,64,0,0,0,0,0,80,150,64,0,0,0,0,128,194,194,64,0,0,0,0,0,240,152,64,0,0,0,0,128,246,194,64,0,0,0,0,0,144,153,64,0,0,0,0,128,50,195,64,0,0,0,0,0,48,155,64,0,0,0,0,128,114,195,64,0,0,0,0,0,112,157,64,0,0,0,0,128,126,195,64,0,0,0,0,0,176,158,64,0,0,0,0,128,102,195,64,0,0,0,0,0,112,157,64,0,0,0,0,128,78,195,64,0,0,0,0,0,48,156,64,0,0,0,0,128,226,194,64,0,0,0,0,0,240,154,64,0,0,0,0,128,26,195,64,0,0,0,0,0,176,157,64,0,0,0,0,128,98,194,64,0,0,0,0,0,144,155,64,0,0,0,0,128,242,193,64,0,0,0,0,0,16,152,64,0,0,0,0,128,74,194,64,0,0,0,0,0,16,149,64,0,0,0,0,128,102,194,64,0,0,0,0,0,240,147,64,0,0,0,0,128,70,194,64,0,0,0,0,0,48,147,64,0,0,0,0,128,34,194,64,0,0,0,0,0,80,147,64,0,0,0,0,128,242,193,64,0,0,0,0,0,112,146,64,0,0,0,0,128,242,192,64,0,0,0,0,0,40,138,64,0,0,0,0,0,226,191,64,0,0,0,0,0,160,136,64,0,0,0,0,0,71,191,64,0,0,0,0,0,40,136,64,0,0,0,0,0,198,190,64,0,0,0,0,0,160,136,64,0,0,0,0,0,135,190,64,0,0,0,0,0,248,136,64,0,0,0,0,0,117,190,64,0,0,0,0,0,48,137,64,0,0,0,0,0,133,190,64,0,0,0,0,0,32,137,64,0,0,0,0,0,213,190,64,0,0,0,0,0,224,136,64,0,0,0,0,0,189,191,64,0,0,0,0,0,224,141,64,0,0,0,0,0,109,191,64,0,0,0,0,0,160,142,64,0,0,0,0,0,93,191,64,0,0,0,0,0,96,141,64,0,0,0,0,0,77,191,64,0,0,0,0,0,32,140,64,0,0,0,0,0,101,185,64,0,0,0,0,0,224,130,64,0,0,0,0,0,179,185,64,0,0,0,0,0,160,130,64,0,0,0,0,0,100,185,64,0,0,0,0,0,104,130,64,0,0,0,0,0,77,185,64,0,0,0,0,0,0,130,64,0,0,0,0,0,111,184,64,0,0,0,0,0,56,130,64,0,0,0,0,0,180,183,64,0,0,0,0,0,40,131,64,0,0,0,0,0,145,183,64,0,0,0,0,0,64,132,64,0,0,0,0,0,97,183,64,0,0,0,0,0,192,133,64,0,0,0,0,0,117,181,64,0,0,0,0,0,224,137,64,0,0,0,0,0,145,182,64,0,0,0,0,0,96,132,64,0,0,0,0,0,185,182,64,0,0,0,0,0,224,131,64,0,0,0,0,0,45,184,64,0,0,0,0,0,128,117,64,0,0,0,0,0,117,184,64,0,0,0,0,0,128,113,64,0,0,0,0,0,165,185,64,0,0,0,0,0,0,112,64,0,0,0,0,0,81,186,64,0,0,0,0,0,0,100,64,0,0,0,0,0,165,187,64,0,0,0,0,0,0,81,64,0,0,0,0,0,255,188,64,0,0,0,0,0,0,52,192,0,0,0,0,0,255,189,64,0,0,0,0,0,0,66,64,0,0,0,0,0,129,190,64,0,0,0,0,0,64,80,64,0,0,0,0,0,197,190,64,0,0,0,0,0,0,93,64,0,0,0,0,0,5,191,64,0,0,0,0,0,0,97,64,0,0,0,0,0,161,191,64,0,0,0,0,0,0,89,64,0,0,0,0,128,130,192,64,0,0,0,0,0,0,66,64,0,0,0,0,128,226,193,64,0,0,0,0,0,0,80,192,0,0,0,0,128,192,194,64,0,0,0,0,0,128,103,64,0,0,0,0,128,120,195,64,0,0,0,0,0,128,116,64,0,0,0,0,128,192,195,64,0,0,0,0,0,0,127,64,0,0,0,0,128,10,195,64,0,0,0,0,0,0,109,64,0,0,0,0,128,164,193,64,0,0,0,0,0,128,99,64,0,0,0,0,128,44,193,64,0,0,0,0,0,0,93,64,0,0,0,0,128,212,193,64,0,0,0,0,0,0,111,64,0,0,0,0,0,248,193,64,0,0,0,0,0,96,112,64,0,0,0,0,128,145,194,64,0,0,0,0,0,16,120,64,0,0,0,0,128,56,195,64,0,0,0,0,0,64,128,64,0,0,0,0,0,85,195,64,0,0,0,0,0,216,128,64,0,0,0,0,128,169,195,64,0,0,0,0,0,24,128,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,46,194,64,0,0,0,0,0,128,131,64,0,0,0,0,128,40,194,64,0,0,0,0,0,128,131,64,0,0,0,0,128,217,193,64,0,0,0,0,0,88,128,64,0,0,0,0,0,141,193,64,0,0,0,0,0,112,122,64,0,0,0,0,128,116,193,64,0,0,0,0,0,192,122,64,0,0,0,0,128,105,193,64,0,0,0,0,0,224,122,64,0,0,0,0,128,68,193,64,0,0,0,0,0,48,121,64,0,0,0,0,0,20,193,64,0,0,0,0,0,16,119,64,0,0,0,0,128,240,192,64,0,0,0,0,0,48,118,64,0,0,0,0,0,102,192,64,0,0,0,0,0,192,114,64,0,0,0,0,0,125,191,64,0,0,0,0,0,0,121,64,0,0,0,0,0,113,191,64,0,0,0,0,0,128,118,64,0,0,0,0,0,185,191,64,0,0,0,0,0,128,117,64,0,0,0,0,128,28,192,64,0,0,0,0,0,192,114,64,0,0,0,0,128,32,192,64,0,0,0,0,0,0,114,64,0,0,0,0,128,234,192,64,0,0,0,0,0,128,105,64,0,0,0,0,128,50,193,64,0,0,0,0,0,64,113,64,0,0,0,0,128,142,193,64,0,0,0,0,0,128,116,64,0,0,0,0,128,204,193,64,0,0,0,0,0,64,124,64,0,0,0,0,128,60,194,64,0,0,0,0,0,32,128,64,0,0,0,0,128,92,194,64,0,0,0,0,0,0,127,64,0,0,0,0,128,180,194,64,0,0,0,0,0,224,128,64,0,0,0,0,128,184,194,64,0,0,0,0,0,0,130,64,0,0,0,0,128,242,194,64,0,0,0,0,0,224,131,64,0,0,0,0,128,224,194,64,0,0,0,0,0,128,133,64,0,0,0,0,128,228,194,64,0,0,0,0,0,128,134,64,0,0,0,0,128,168,194,64,0,0,0,0,0,32,136,64,0,0,0,0,128,66,194,64,0,0,0,0,0,128,131,64,0,0,0,0,128,46,194,64,0,0,0,0,0,128,131,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,136,193,64,0,0,0,0,0,8,130,64,0,0,0,0,128,161,193,64,0,0,0,0,0,168,130,64,0,0,0,0,128,164,193,64,0,0,0,0,0,0,131,64,0,0,0,0,128,168,193,64,0,0,0,0,0,200,130,64,0,0,0,0,128,56,194,64,0,0,0,0,0,56,135,64,0,0,0,0,0,68,194,64,0,0,0,0,0,200,135,64,0,0,0,0,128,64,194,64,0,0,0,0,0,56,136,64,0,0,0,0,0,48,194,64,0,0,0,0,0,64,136,64,0,0,0,0,0,32,194,64,0,0,0,0,0,112,136,64,0,0,0,0,0,16,194,64,0,0,0,0,0,96,136,64,0,0,0,0,128,220,193,64,0,0,0,0,0,128,136,64,0,0,0,0,128,209,193,64,0,0,0,0,0,24,136,64,0,0,0,0,128,188,193,64,0,0,0,0,0,248,135,64,0,0,0,0,0,156,193,64,0,0,0,0,0,136,135,64,0,0,0,0,128,152,193,64,0,0,0,0,0,184,135,64,0,0,0,0,0,104,193,64,0,0,0,0,0,0,135,64,0,0,0,0,128,74,193,64,0,0,0,0,0,152,134,64,0,0,0,0,128,60,193,64,0,0,0,0,0,192,133,64,0,0,0,0,128,244,192,64,0,0,0,0,0,200,132,64,0,0,0,0,0,196,192,64,0,0,0,0,0,80,131,64,0,0,0,0,0,152,192,64,0,0,0,0,0,80,130,64,0,0,0,0,128,96,192,64,0,0,0,0,0,200,129,64,0,0,0,0,128,92,192,64,0,0,0,0,0,248,129,64,0,0,0,0,0,85,192,64,0,0,0,0,0,144,129,64,0,0,0,0,128,36,192,64,0,0,0,0,0,128,129,64,0,0,0,0,0,240,191,64,0,0,0,0,0,160,128,64,0,0,0,0,0,57,191,64,0,0,0,0,0,64,128,64,0,0,0,0,0,95,191,64,0,0,0,0,0,96,127,64,0,0,0,0,0,185,191,64,0,0,0,0,0,224,126,64,0,0,0,0,128,7,192,64,0,0,0,0,0,128,126,64,0,0,0,0,0,29,192,64,0,0,0,0,0,32,125,64,0,0,0,0,128,40,192,64,0,0,0,0,0,96,124,64,0,0,0,0,128,65,192,64,0,0,0,0,0,96,124,64,0,0,0,0,128,104,192,64,0,0,0,0,0,32,124,64,0,0,0,0,128,116,192,64,0,0,0,0,0,176,123,64,0,0,0,0,128,120,192,64,0,0,0,0,0,128,124,64,0,0,0,0,0,124,192,64,0,0,0,0,0,16,124,64,0,0,0,0,128,196,192,64,0,0,0,0,0,56,128,64,0,0,0,0,0,208,192,64,0,0,0,0,0,72,128,64,0,0,0,0,128,0,193,64,0,0,0,0,0,192,129,64,0,0,0,0,128,52,193,64,0,0,0,0,0,72,129,64,0,0,0,0,0,56,193,64,0,0,0,0,0,120,129,64,0,0,0,0,0,69,193,64,0,0,0,0,0,240,128,64,0,0,0,0,0,88,193,64,0,0,0,0,0,88,129,64,0,0,0,0,128,132,193,64,0,0,0,0,0,56,130,64,0,0,0,0,128,136,193,64,0,0,0,0,0,8,130,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,200,190,64,0,0,0,0,0,128,116,64,0,0,0,0,0,200,190,64,0,0,0,0,0,128,117,64,0,0,0,0,0,185,190,64,0,0,0,0,0,16,118,64,0,0,0,0,0,171,190,64,0,0,0,0,0,48,118,64,0,0,0,0,0,175,190,64,0,0,0,0,0,112,117,64,0,0,0,0,0,185,190,64,0,0,0,0,0,208,116,64,0,0,0,0,0,178,190,64,0,0,0,0,0,32,117,64,0,0,0,0,0,163,190,64,0,0,0,0,0,176,117,64,0,0,0,0,0,161,190,64,0,0,0,0,0,16,119,64,0,0,0,0,0,153,190,64,0,0,0,0,0,128,121,64,0,0,0,0,0,143,190,64,0,0,0,0,0,0,121,64,0,0,0,0,0,145,190,64,0,0,0,0,0,128,120,64,0,0,0,0,0,134,190,64,0,0,0,0,0,240,121,64,0,0,0,0,0,112,190,64,0,0,0,0,0,176,124,64,0,0,0,0,0,91,190,64,0,0,0,0,0,208,123,64,0,0,0,0,0,200,189,64,0,0,0,0,0,16,118,64,0,0,0,0,0,186,189,64,0,0,0,0,0,240,117,64,0,0,0,0,0,128,189,64,0,0,0,0,0,144,115,64,0,0,0,0,0,193,188,64,0,0,0,0,0,0,110,64,0,0,0,0,0,241,188,64,0,0,0,0,0,0,107,64,0,0,0,0,0,250,188,64,0,0,0,0,0,96,108,64,0,0,0,0,0,1,189,64,0,0,0,0,0,224,107,64,0,0,0,0,0,43,189,64,0,0,0,0,0,0,105,64,0,0,0,0,0,105,189,64,0,0,0,0,0,128,105,64,0,0,0,0,0,209,189,64,0,0,0,0,0,32,107,64,0,0,0,0,0,225,189,64,0,0,0,0,0,224,108,64,0,0,0,0,0,37,190,64,0,0,0,0,0,224,109,64,0,0,0,0,0,80,190,64,0,0,0,0,0,32,110,64,0,0,0,0,0,104,190,64,0,0,0,0,0,64,111,64,0,0,0,0,0,162,190,64,0,0,0,0,0,16,113,64,0,0,0,0,0,192,190,64,0,0,0,0,0,16,115,64,0,0,0,0,0,185,190,64,0,0,0,0,0,0,116,64,0,0,0,0,0,193,190,64,0,0,0,0,0,224,115,64,0,0,0,0,0,200,190,64,0,0,0,0,0,128,116,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,145,188,64,0,0,0,0,0,64,130,64,0,0,0,0,0,160,188,64,0,0,0,0,0,72,130,64,0,0,0,0,0,206,188,64,0,0,0,0,0,64,131,64,0,0,0,0,0,216,188,64,0,0,0,0,0,192,131,64,0,0,0,0,0,221,188,64,0,0,0,0,0,248,131,64,0,0,0,0,0,209,188,64,0,0,0,0,0,48,132,64,0,0,0,0,0,25,187,64,0,0,0,0,0,72,129,64,0,0,0,0,0,17,187,64,0,0,0,0,0,120,129,64,0,0,0,0,0,250,186,64,0,0,0,0,0,40,129,64,0,0,0,0,0,206,186,64,0,0,0,0,0,176,127,64,0,0,0,0,0,170,186,64,0,0,0,0,0,208,126,64,0,0,0,0,0,129,186,64,0,0,0,0,0,112,126,64,0,0,0,0,0,113,186,64,0,0,0,0,0,160,125,64,0,0,0,0,0,79,186,64,0,0,0,0,0,176,124,64,0,0,0,0,0,49,186,64,0,0,0,0,0,128,123,64,0,0,0,0,0,193,186,64,0,0,0,0,0,16,122,64,0,0,0,0,0,201,186,64,0,0,0,0,0,112,122,64,0,0,0,0,0,209,186,64,0,0,0,0,0,0,122,64,0,0,0,0,0,219,186,64,0,0,0,0,0,192,122,64,0,0,0,0,0,224,186,64,0,0,0,0,0,112,122,64,0,0,0,0,0,232,186,64,0,0,0,0,0,240,121,64,0,0,0,0,0,1,187,64,0,0,0,0,0,16,122,64,0,0,0,0,0,9,187,64,0,0,0,0,0,112,122,64,0,0,0,0,0,17,187,64,0,0,0,0,0,16,122,64,0,0,0,0,0,25,187,64,0,0,0,0,0,112,122,64,0,0,0,0,0,33,187,64,0,0,0,0,0,0,122,64,0,0,0,0,0,42,187,64,0,0,0,0,0,160,122,64,0,0,0,0,0,56,187,64,0,0,0,0,0,128,122,64,0,0,0,0,0,81,187,64,0,0,0,0,0,128,122,64,0,0,0,0,0,129,187,64,0,0,0,0,0,160,124,64,0,0,0,0,0,203,187,64,0,0,0,0,0,224,125,64,0,0,0,0,0,137,188,64,0,0,0,0,0,192,129,64,0,0,0,0,0,147,188,64,0,0,0,0,0,0,130,64,0,0,0,0,0,145,188,64,0,0,0,0,0,64,130,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,86,187,64,0,0,0,0,0,236,150,64,0,0,0,0,0,134,187,64,0,0,0,0,0,100,151,64,0,0,0,0,0,134,187,64,0,0,0,0,0,0,152,64,0,0,0,0,0,134,187,64,0,0,0,0,0,36,152,64,0,0,0,0,0,118,187,64,0,0,0,0,0,28,152,64,0,0,0,0,0,101,187,64,0,0,0,0,0,28,152,64,0,0,0,0,0,97,187,64,0,0,0,0,0,64,152,64,0,0,0,0,0,209,186,64,0,0,0,0,0,132,151,64,0,0,0,0,0,122,186,64,0,0,0,0,0,128,149,64,0,0,0,0,0,117,186,64,0,0,0,0,0,100,149,64,0,0,0,0,0,129,186,64,0,0,0,0,0,68,149,64,0,0,0,0,0,159,186,64,0,0,0,0,0,108,149,64,0,0,0,0,0,9,187,64,0,0,0,0,0,32,150,64,0,0,0,0,0,86,187,64,0,0,0,0,0,236,150,64,154,153,153,153,153,153,233,63,221,220,220,220,220,220,220,63,19,19,19,19,19,19,195,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,229,183,64,0,0,0,0,0,64,127,64,0,0,0,0,0,149,184,64,0,0,0,0,0,144,122,64,0,0,0,0,0,36,185,64,0,0,0,0,0,0,123,64,0,0,0,0,0,129,184,64,0,0,0,0,0,128,124,64,0,0,0,0,0,229,183,64,0,0,0,0,0,64,127,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,68,186,64,0,0,0,0,0,208,139,64,0,0,0,0,0,79,186,64,0,0,0,0,0,184,139,64,0,0,0,0,0,145,186,64,0,0,0,0,0,64,141,64,0,0,0,0,0,253,186,64,0,0,0,0,0,192,143,64,0,0,0,0,0,65,187,64,0,0,0,0,0,0,141,64,0,0,0,0,0,193,186,64,0,0,0,0,0,192,138,64,0,0,0,0,0,53,187,64,0,0,0,0,0,0,138,64,0,0,0,0,0,109,187,64,0,0,0,0,0,224,137,64,0,0,0,0,0,245,185,64,0,0,0,0,0,32,135,64,0,0,0,0,0,9,186,64,0,0,0,0,0,224,133,64,0,0,0,0,0,89,184,64,0,0,0,0,0,192,136,64,0,0,0,0,0,129,184,64,0,0,0,0,0,192,134,64,0,0,0,0,0,153,182,64,0,0,0,0,0,192,141,64,0,0,0,0,0,165,182,64,0,0,0,0,0,96,140,64,0,0,0,0,0,177,181,64,0,0,0,0,0,224,144,64,0,0,0,0,0,181,181,64,0,0,0,0,0,16,144,64,0,0,0,0,0,165,180,64,0,0,0,0,0,0,148,64,0,0,0,0,0,121,180,64,0,0,0,0,0,224,148,64,0,0,0,0,0,225,179,64,0,0,0,0,0,240,149,64,0,0,0,0,0,53,181,64,0,0,0,0,0,96,143,64,0,0,0,0,0,65,182,64,0,0,0,0,0,0,140,64,0,0,0,0,0,108,182,64,0,0,0,0,0,24,139,64,0,0,0,0,0,58,183,64,0,0,0,0,0,112,136,64,0,0,0,0,0,73,184,64,0,0,0,0,0,64,133,64,0,0,0,0,0,161,184,64,0,0,0,0,0,128,132,64,0,0,0,0,0,201,185,64,0,0,0,0,0,96,131,64,0,0,0,0,0,141,190,64,0,0,0,0,0,128,138,64,0,0,0,0,0,225,191,64,0,0,0,0,0,192,142,64,0,0,0,0,0,121,188,64,0,0,0,0,0,112,144,64,0,0,0,0,0,133,186,64,0,0,0,0,0,192,147,64,0,0,0,0,0,49,186,64,0,0,0,0,0,96,154,64,0,0,0,0,0,21,186,64,0,0,0,0,0,240,153,64,0,0,0,0,0,249,185,64,0,0,0,0,0,128,153,64,0,0,0,0,0,185,185,64,0,0,0,0,0,16,154,64,0,0,0,0,0,33,185,64,0,0,0,0,0,96,152,64,0,0,0,0,0,37,185,64,0,0,0,0,0,144,151,64,0,0,0,0,0,39,185,64,0,0,0,0,0,24,151,64,0,0,0,0,0,17,185,64,0,0,0,0,0,72,151,64])
.concat([0,0,0,0,0,233,184,64,0,0,0,0,0,144,151,64,0,0,0,0,0,216,184,64,0,0,0,0,0,132,151,64,0,0,0,0,0,165,184,64,0,0,0,0,0,120,152,64,0,0,0,0,0,116,184,64,0,0,0,0,0,112,153,64,0,0,0,0,0,113,184,64,0,0,0,0,0,208,153,64,0,0,0,0,0,109,184,64,0,0,0,0,0,80,154,64,0,0,0,0,0,37,184,64,0,0,0,0,0,160,153,64,0,0,0,0,0,13,183,64,0,0,0,0,0,32,157,64,0,0,0,0,0,29,183,64,0,0,0,0,0,0,156,64,0,0,0,0,0,121,183,64,0,0,0,0,0,136,154,64,0,0,0,0,0,214,183,64,0,0,0,0,0,12,153,64,0,0,0,0,0,217,183,64,0,0,0,0,0,224,152,64,0,0,0,0,0,229,183,64,0,0,0,0,0,48,152,64,0,0,0,0,0,129,183,64,0,0,0,0,0,0,154,64,0,0,0,0,0,141,183,64,0,0,0,0,0,240,152,64,0,0,0,0,0,147,183,64,0,0,0,0,0,156,152,64,0,0,0,0,0,110,183,64,0,0,0,0,0,200,152,64,0,0,0,0,0,74,183,64,0,0,0,0,0,244,152,64,0,0,0,0,0,53,183,64,0,0,0,0,0,96,153,64,0,0,0,0,0,36,183,64,0,0,0,0,0,184,153,64,0,0,0,0,0,216,182,64,0,0,0,0,0,168,153,64,0,0,0,0,0,81,182,64,0,0,0,0,0,160,153,64,0,0,0,0,0,5,182,64,0,0,0,0,0,200,153,64,0,0,0,0,0,25,182,64,0,0,0,0,0,144,153,64,0,0,0,0,0,57,181,64,0,0,0,0,0,80,154,64,0,0,0,0,0,41,181,64,0,0,0,0,0,208,153,64,0,0,0,0,0,241,180,64,0,0,0,0,0,196,153,64,0,0,0,0,0,120,180,64,0,0,0,0,0,196,154,64,0,0,0,0,0,1,180,64,0,0,0,0,0,196,155,64,0,0,0,0,0,197,179,64,0,0,0,0,0,192,156,64,0,0,0,0,0,117,179,64,0,0,0,0,0,16,158,64,0,0,0,0,0,13,180,64,0,0,0,0,0,112,157,64,0,0,0,0,0,73,180,64,0,0,0,0,0,112,157,64,0,0,0,0,0,153,180,64,0,0,0,0,0,240,156,64,0,0,0,0,0,13,181,64,0,0,0,0,0,112,156,64,0,0,0,0,0,149,180,64,0,0,0,0,0,192,157,64,0,0,0,0,0,177,180,64,0,0,0,0,0,160,157,64,0,0,0,0,0,145,180,64,0,0,0,0,0,240,157,64,0,0,0,0,0,113,180,64,0,0,0,0,0,64,158,64,0,0,0,0,0,229,179,64,0,0,0,0,0,112,160,64,0,0,0,0,0,193,179,64,0,0,0,0,0,216,160,64,0,0,0,0,0,213,179,64,0,0,0,0,0,184,161,64,0,0,0,0,0,169,179,64,0,0,0,0,0,16,162,64,0,0,0,0,0,225,179,64,0,0,0,0,0,120,162,64,0,0,0,0,0,157,179,64,0,0,0,0,0,16,162,64,0,0,0,0,0,140,179,64,0,0,0,0,0,210,161,64,0,0,0,0,0,131,179,64,0,0,0,0,0,44,162,64,0,0,0,0,0,121,179,64,0,0,0,0,0,176,162,64,0,0,0,0,0,45,179,64,0,0,0,0,0,232,163,64,0,0,0,0,0,17,179,64,0,0,0,0,0,104,164,64,0,0,0,0,0,1,179,64,0,0,0,0,0,56,165,64,0,0,0,0,0,246,178,64,0,0,0,0,0,188,165,64,0,0,0,0,0,255,178,64,0,0,0,0,0,220,165,64,0,0,0,0,0,221,178,64,0,0,0,0,0,128,165,64,0,0,0,0,0,212,178,64,0,0,0,0,0,184,165,64,0,0,0,0,0,249,178,64,0,0,0,0,0,108,166,64,0,0,0,0,0,37,179,64,0,0,0,0,0,72,167,64,0,0,0,0,0,73,179,64,0,0,0,0,0,68,168,64,0,0,0,0,0,43,179,64,0,0,0,0,0,228,167,64,0,0,0,0,0,189,178,64,0,0,0,0,0,88,167,64,0,0,0,0,0,151,178,64,0,0,0,0,0,40,167,64,0,0,0,0,0,135,178,64,0,0,0,0,0,44,167,64,0,0,0,0,0,133,178,64,0,0,0,0,0,56,167,64,0,0,0,0,0,101,178,64,0,0,0,0,0,56,165,64,0,0,0,0,0,101,178,64,0,0,0,0,0,216,164,64,0,0,0,0,0,1,179,64,0,0,0,0,0,216,162,64,0,0,0,0,0,17,179,64,0,0,0,0,0,152,162,64,0,0,0,0,0,29,179,64,0,0,0,0,0,200,161,64,0,0,0,0,0,253,178,64,0,0,0,0,0,240,160,64,0,0,0,0,0,69,179,64,0,0,0,0,0,128,159,64,0,0,0,0,0,145,179,64,0,0,0,0,0,96,158,64,0,0,0,0,0,65,179,64,0,0,0,0,0,32,159,64,0,0,0,0,0,141,178,64,0,0,0,0,0,32,159,64,0,0,0,0,0,201,177,64,0,0,0,0,0,120,160,64,0,0,0,0,0,65,178,64,0,0,0,0,0,160,158,64,0,0,0,0,0,181,178,64,0,0,0,0,0,96,158,64,0,0,0,0,0,33,179,64,0,0,0,0,0,0,158,64,0,0,0,0,0,161,179,64,0,0,0,0,0,64,155,64,0,0,0,0,0,89,180,64,0,0,0,0,0,0,152,64,0,0,0,0,0,173,182,64,0,0,0,0,0,192,148,64,0,0,0,0,0,245,183,64,0,0,0,0,0,96,146,64,0,0,0,0,0,237,184,64,0,0,0,0,0,48,146,64,0,0,0,0,0,217,185,64,0,0,0,0,0,32,146,64,0,0,0,0,0,49,186,64,0,0,0,0,0,240,144,64,0,0,0,0,0,89,186,64,0,0,0,0,0,48,144,64,0,0,0,0,0,9,186,64,0,0,0,0,0,64,144,64,0,0,0,0,0,169,185,64,0,0,0,0,0,224,144,64,0,0,0,0,0,101,185,64,0,0,0,0,0,128,143,64,0,0,0,0,0,81,185,64,0,0,0,0,0,32,141,64,0,0,0,0,0,49,185,64,0,0,0,0,0,64,142,64,0,0,0,0,0,65,185,64,0,0,0,0,0,160,143,64,0,0,0,0,0,1,185,64,0,0,0,0,0,160,144,64,0,0,0,0,0,145,184,64,0,0,0,0,0,64,144,64,0,0,0,0,0,29,184,64,0,0,0,0,0,208,144,64,0,0,0,0,0,237,183,64,0,0,0,0,0,0,147,64,0,0,0,0,0,53,183,64,0,0,0,0,0,96,145,64,0,0,0,0,0,225,182,64,0,0,0,0,0,96,145,64,0,0,0,0,0,193,181,64,0,0,0,0,0,64,148,64,0,0,0,0,0,177,181,64,0,0,0,0,0,176,148,64,0,0,0,0,0,89,181,64,0,0,0,0,0,160,149,64,0,0,0,0,0,237,180,64,0,0,0,0,0,224,149,64,0,0,0,0,0,213,179,64,0,0,0,0,0,0,153,64,0,0,0,0,0,173,179,64,0,0,0,0,0,160,153,64,0,0,0,0,0,47,179,64,0,0,0,0,0,204,154,64,0,0,0,0,0,64,179,64,0,0,0,0,0,156,154,64,0,0,0,0,0,129,179,64,0,0,0,0,0,16,153,64,0,0,0,0,0,153,180,64,0,0,0,0,0,0,149,64,0,0,0,0,0,213,180,64,0,0,0,0,0,144,148,64,0,0,0,0,0,73,181,64,0,0,0,0,0,48,147,64,0,0,0,0,0,121,181,64,0,0,0,0,0,16,146,64,0,0,0,0,0,193,181,64,0,0,0,0,0,48,145,64,0,0,0,0,0,233,181,64,0,0,0,0,0,0,145,64,0,0,0,0,0,77,184,64,0,0,0,0,0,32,138,64,0,0,0,0,0,253,184,64,0,0,0,0,0,224,135,64,0,0,0,0,0,109,185,64,0,0,0,0,0,192,138,64,0,0,0,0,0,201,185,64,0,0,0,0,0,64,141,64,0,0,0,0,0,253,185,64,0,0,0,0,0,192,140,64,0,0,0,0,0,47,186,64,0,0,0,0,0,48,140,64,0,0,0,0,0,68,186,64,0,0,0,0,0,208,139,64,19,19,19,19,19,19,211,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,68,187,64,0,0,0,0,0,235,177,64,0,0,0,0,0,73,187,64,0,0,0,0,0,249,177,64,0,0,0,0,0,67,187,64,0,0,0,0,0,7,178,64,0,0,0,0,0,52,187,64,0,0,0,0,0,12,178,64,0,0,0,0,0,44,187,64,0,0,0,0,0,12,178,64,0,0,0,0,0,38,187,64,0,0,0,0,0,6,178,64,0,0,0,0,0,255,185,64,0,0,0,0,0,187,176,64,0,0,0,0,0,91,185,64,0,0,0,0,0,135,176,64,0,0,0,0,0,88,185,64,0,0,0,0,0,134,176,64,0,0,0,0,0,81,184,64,0,0,0,0,0,2,176,64,0,0,0,0,0,111,182,64,0,0,0,0,0,155,176,64,0,0,0,0,0,96,182,64,0,0,0,0,0,154,176,64,0,0,0,0,0,86,182,64,0,0,0,0,0,142,176,64,0,0,0,0,0,84,182,64,0,0,0,0,0,134,176,64,0,0,0,0,0,88,182,64,0,0,0,0,0,127,176,64,0,0,0,0,0,91,182,64,0,0,0,0,0,120,176,64,0,0,0,0,0,99,182,64,0,0,0,0,0,117,176,64,0,0,0,0,0,89,184,64,0,0,0,0,0,172,175,64,0,0,0,0,0,106,185,64,0,0,0,0,0,98,176,64,0,0,0,0,0,21,186,64,0,0,0,0,0,152,176,64,0,0,0,0,0,68,187,64,0,0,0,0,0,235,177,64,19,19,19,19,19,19,211,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,39,185,64,0,0,0,0,0,69,176,64,0,0,0,0,0,51,185,64,0,0,0,0,0,79,176,64,0,0,0,0,0,52,185,64,0,0,0,0,0,94,176,64,0,0,0,0,0,42,185,64,0,0,0,0,0,106,176,64,0,0,0,0,0,27,185,64,0,0,0,0,0,107,176,64,0,0,0,0,0,42,183,64,0,0,0,0,0,154,175,64,0,0,0,0,0,251,181,64,0,0,0,0,0,32,176,64,0,0,0,0,0,247,181,64,0,0,0,0,0,32,176,64,0,0,0,0,0,145,180,64,0,0,0,0,0,71,176,64,0,0,0,0,0,238,179,64,0,0,0,0,0,83,177,64,0,0,0,0,0,226,179,64,0,0,0,0,0,92,177,64,0,0,0,0,0,211,179,64,0,0,0,0,0,89,177,64,0,0,0,0,0,203,179,64,0,0,0,0,0,85,177,64,0,0,0,0,0,202,179,64,0,0,0,0,0,77,177,64,0,0,0,0,0,200,179,64,0,0,0,0,0,69,177,64,0,0,0,0,0,204,179,64,0,0,0,0,0,62,177,64,0,0,0,0,0,120,180,64,0,0,0,0,0,34,176,64,0,0,0,0,0,240,181,64,0,0,0,0,0,242,175,64,0,0,0,0,0,40,183,64,0,0,0,0,0,70,175,64,0,0,0,0,0,39,185,64,0,0,0,0,0,69,176,64,19,19,19,19,19,19,211,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,225,184,64,0,0,0,0,0,46,176,64,0,0,0,0,0,236,184,64,0,0,0,0,0,57,176,64,0,0,0,0,0,236,184,64,0,0,0,0,0,72,176,64,0,0,0,0,0,225,184,64,0,0,0,0,0,83,176,64,0,0,0,0,0,209,184,64,0,0,0,0,0,83,176,64,0,0,0,0,0,128,183,64,0,0,0,0,0,136,175,64,0,0,0,0,0,90,182,64,0,0,0,0,0,48,175,64,0,0,0,0,0,20,181,64,0,0,0,0,0,202,174,64,0,0,0,0,0,206,179,64,0,0,0,0,0,228,175,64,0,0,0,0,0,205,179,64,0,0,0,0,0,230,175,64,0,0,0,0,0,224,178,64,0,0,0,0,0,103,176,64,0,0,0,0,0,119,178,64,0,0,0,0,0,46,177,64,0,0,0,0,0,107,178,64,0,0,0,0,0,55,177,64,0,0,0,0,0,92,178,64,0,0,0,0,0,54,177,64,0,0,0,0,0,84,178,64,0,0,0,0,0,50,177,64,0,0,0,0,0,82,178,64,0,0,0,0,0,42,177,64,0,0,0,0,0,80,178,64,0,0,0,0,0,34,177,64,0,0,0,0,0,84,178,64,0,0,0,0,0,27,177,64,0,0,0,0,0,194,178,64,0,0,0,0,0,73,176,64,0,0,0,0,0,188,179,64,0,0,0,0,0,156,175,64,0,0,0,0,0,189,179,64,0,0,0,0,0,156,175,64,0,0,0,0,0,14,181,64,0,0,0,0,0,118,174,64,0,0,0,0,0,96,182,64,0,0,0,0,0,224,174,64,0,0,0,0,0,138,183,64,0,0,0,0,0,56,175,64,0,0,0,0,0,225,184,64,0,0,0,0,0,46,176,64,19,19,19,19,19,19,211,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,26,179,64,0,0,0,0,0,92,174,64,0,0,0,0,0,10,179,64,0,0,0,0,0,94,174,64,0,0,0,0,0,255,178,64,0,0,0,0,0,74,174,64,0,0,0,0,0,251,178,64,0,0,0,0,0,58,174,64,0,0,0,0,0,254,178,64,0,0,0,0,0,42,174,64,0,0,0,0,0,1,179,64,0,0,0,0,0,26,174,64,0,0,0,0,0,9,179,64,0,0,0,0,0,20,174,64,0,0,0,0,0,100,180,64,0,0,0,0,0,208,172,64,0,0,0,0,0,21,182,64,0,0,0,0,0,176,172,64,0,0,0,0,0,22,182,64,0,0,0,0,0,176,172,64,0,0,0,0,0,36,183,64,0,0,0,0,0,192,172,64,0,0,0,0,0,182,183,64,0,0,0,0,0,138,174,64,0,0,0,0,0,202,183,64,0,0,0,0,0,190,174,64,0,0,0,0,0,249,184,64,0,0,0,0,0,56,176,64,0,0,0,0,0,1,185,64,0,0,0,0,0,69,176,64,0,0,0,0,0,253,184,64,0,0,0,0,0,84,176,64,0,0,0,0,0,241,184,64,0,0,0,0,0,92,176,64,0,0,0,0,0,226,184,64,0,0,0,0,0,89,176,64,0,0,0,0,0,168,183,64,0,0,0,0,0,242,174,64,0,0,0,0,0,149,183,64,0,0,0,0,0,184,174,64,0,0,0,0,0,148,183,64,0,0,0,0,0,182,174,64,0,0,0,0,0,14,183,64,0,0,0,0,0,16,173,64,0,0,0,0,0,22,182,64,0,0,0,0,0,0,173,64,0,0,0,0,0,110,180,64,0,0,0,0,0,32,173,64,0,0,0,0,0,26,179,64,0,0,0,0,0,92,174,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,194,195,64,0,0,0,0,0,104,165,64,0,0,0,0,128,54,196,64,0,0,0,0,0,232,165,64,0,0,0,0,128,178,195,64,0,0,0,0,0,120,166,64,0,0,0,0,128,82,195,64,0,0,0,0,0,72,167,64,0,0,0,0,128,106,195,64,0,0,0,0,0,216,167,64,0,0,0,0,128,189,195,64,0,0,0,0,0,108,169,64,0,0,0,0,0,244,195,64,0,0,0,0,0,138,170,64,0,0,0,0,128,194,195,64,0,0,0,0,0,88,170,64,0,0,0,0,128,190,195,64,0,0,0,0,0,248,170,64,0,0,0,0,128,242,195,64,0,0,0,0,0,168,171,64,0,0,0,0,128,122,196,64,0,0,0,0,0,152,171,64,0,0,0,0,128,78,196,64,0,0,0,0,0,8,172,64,0,0,0,0,128,2,196,64,0,0,0,0,0,200,172,64,0,0,0,0,128,70,196,64,0,0,0,0,0,200,173,64,0,0,0,0,0,115,196,64,0,0,0,0,0,112,174,64,0,0,0,0,128,86,196,64,0,0,0,0,0,130,174,64,0,0,0,0,0,64,196,64,0,0,0,0,0,146,174,64,0,0,0,0,128,30,196,64,0,0,0,0,0,88,174,64,0,0,0,0,128,22,196,64,0,0,0,0,0,72,174,64,0,0,0,0,128,30,196,64,0,0,0,0,0,88,175,64,0,0,0,0,128,226,195,64,0,0,0,0,0,140,176,64,0,0,0,0,128,226,195,64,0,0,0,0,0,204,176,64,0,0,0,0,128,70,196,64,0,0,0,0,0,252,177,64,0,0,0,0,128,254,195,64,0,0,0,0,0,180,177,64,0,0,0,0,128,50,196,64,0,0,0,0,0,76,179,64,0,0,0,0,128,94,196,64,0,0,0,0,0,132,179,64,0,0,0,0,128,194,196,64,0,0,0,0,0,124,180,64,0,0,0,0,128,186,196,64,0,0,0,0,0,164,180,64,0,0,0,0,128,142,196,64,0,0,0,0,0,132,180,64,0,0,0,0,128,102,196,64,0,0,0,0,0,84,180,64,0,0,0,0,0,84,196,64,0,0,0,0,0,62,180,64,0,0,0,0,0,110,196,64,0,0,0,0,0,219,180,64,0,0,0,0,0,141,196,64,0,0,0,0,0,150,181,64,0,0,0,0,128,126,196,64,0,0,0,0,0,188,181,64,0,0,0,0,128,30,196,64,0,0,0,0,0,68,181,64,0,0,0,0,128,250,195,64,0,0,0,0,0,76,181,64,0,0,0,0,128,30,196,64,0,0,0,0,0,92,182,64,0,0,0,0,128,250,195,64,0,0,0,0,0,44,183,64,0,0,0,0,128,238,195,64,0,0,0,0,0,180,183,64,0,0,0,0,128,198,195,64,0,0,0,0,0,156,183,64,0,0,0,0,128,74,195,64,0,0,0,0,0,124,182,64,0,0,0,0,128,38,195,64,0,0,0,0,0,100,184,64,0,0,0,0,128,234,194,64,0,0,0,0,0,4,185,64,0,0,0,0,128,206,194,64,0,0,0,0,0,132,184,64,0,0,0,0,128,122,194,64,0,0,0,0,0,252,184,64,0,0,0,0,128,138,194,64,0,0,0,0,0,92,185,64,0,0,0,0,128,102,194,64,0,0,0,0,0,140,185,64,0,0,0,0,128,250,193,64,0,0,0,0,0,36,185,64,0,0,0,0,128,222,193,64,0,0,0,0,0,180,184,64,0,0,0,0,128,82,193,64,0,0,0,0,0,12,184,64,0,0,0,0,128,182,193,64,0,0,0,0,0,172,186,64,0,0,0,0,128,66,194,64,0,0,0,0,0,44,187,64,0,0,0,0,128,6,194,64,0,0,0,0,0,220,188,64,0,0,0,0,128,22,194,64,0,0,0,0,0,84,189,64,0,0,0,0,128,10,194,64,0,0,0,0,0,156,189,64,0,0,0,0,128,6,194,64,0,0,0,0,0,84,190,64,0,0,0,0,128,186,193,64,0,0,0,0,0,116,189,64,0,0,0,0,128,98,193,64,0,0,0,0,0,220,188,64,0,0,0,0,128,78,193,64,0,0,0,0,0,212,188,64,0,0,0,0,128,70,193,64,0,0,0,0,0,60,189,64,0,0,0,0,128,30,193,64,0,0,0,0,0,92,189,64,0,0,0,0,0,229,190,64,0,0,0,0,0,156,190,64,0,0,0,0,0,69,191,64,0,0,0,0,0,212,191,64,0,0,0,0,0,85,191,64,0,0,0,0,0,102,192,64,0,0,0,0,0,237,190,64,0,0,0,0,0,122,192,64,0,0,0,0,0,171,190,64,0,0,0,0,0,135,192,64,0,0,0,0,0,172,190,64,0,0,0,0,128,110,192,64,0,0,0,0,0,197,190,64,0,0,0,0,0,6,192,64,0,0,0,0,0,245,190,64,0,0,0,0,0,204,190,64,0,0,0,0,0,149,191,64,0,0,0,0,0,84,190,64,0,0,0,0,0,93,191,64,0,0,0,0,0,204,189,64,0,0,0,0,128,2,192,64,0,0,0,0,0,172,189,64,0,0,0,0,128,106,192,64,0,0,0,0,0,60,189,64,0,0,0,0,128,82,192,64,0,0,0,0,0,220,188,64,0,0,0,0,128,146,192,64,0,0,0,0,0,108,188,64,0,0,0,0,128,194,192,64,0,0,0,0,0,108,188,64,0,0,0,0,128,242,192,64,0,0,0,0,0,124,187,64,0,0,0,0,128,206,192,64,0,0,0,0,0,36,187,64,0,0,0,0,128,50,193,64,0,0,0,0,0,28,187,64,0,0,0,0,128,238,192,64,0,0,0,0,0,124,186,64,0,0,0,0,128,250,192,64,0,0,0,0,0,44,186,64,0,0,0,0,128,54,193,64,0,0,0,0,0,20,186,64,0,0,0,0,128,82,193,64,0,0,0,0,0,180,185,64,0,0,0,0,128,34,193,64,0,0,0,0,0,100,185,64,0,0,0,0,128,50,193,64,0,0,0,0,0,252,184,64,0,0,0,0,128,78,193,64,0,0,0,0,0,20,185,64,0,0,0,0,128,246,192,64,0,0,0,0,0,132,184,64,0,0,0,0,128,214,192,64,0,0,0,0,0,92,184,64,0,0,0,0,128,66,192,64,0,0,0,0,0,196,183,64,0,0,0,0,128,222,192,64,0,0,0,0,0,204,183,64,0,0,0,0,128,62,193,64,0,0,0,0,0,244,183,64,0,0,0,0,128,150,192,64,0,0,0,0,0,36,182,64,0,0,0,0,128,146,192,64,0,0,0,0,0,76,181,64,0,0,0,0,128,170,192,64,0,0,0,0,0,44,181,64,0,0,0,0,128,122,192,64,0,0,0,0,0,52,180,64,0,0,0,0,128,106,192,64,0,0,0,0,0,204,179,64,0,0,0,0,0,98,192,64,0,0,0,0,0,149,179,64,0,0,0,0,0,118,192,64,0,0,0,0,0,41,179,64,0,0,0,0,128,135,192,64,0,0,0,0,0,203,178,64,0,0,0,0,128,126,192,64,0,0,0,0,0,188,178,64,0,0,0,0,128,22,192,64,0,0,0,0,0,36,178,64,0,0,0,0,0,197,190,64,0,0,0,0,0,212,178,64,0,0,0,0,0,157,190,64,0,0,0,0,0,252,178,64,0,0,0,0,0,205,189,64,0,0,0,0,0,68,178,64,0,0,0,0,0,21,189,64,0,0,0,0,0,188,177,64,0,0,0,0,0,229,188,64,0,0,0,0,0,188,177,64,0,0,0,0,0,29,190,64,0,0,0,0,0,220,178,64,0,0,0,0,0,117,189,64,0,0,0,0,0,180,178,64,0,0,0,0,0,197,188,64,0,0,0,0,0,132,178,64,0,0,0,0,0,245,188,64,0,0,0,0,0,180,178,64,0,0,0,0,0,125,189,64,0,0,0,0,0,244,179,64,0,0,0,0,0,213,191,64,0,0,0,0,0,188,179,64,0,0,0,0,128,142,192,64,0,0,0,0,0,140,179,64,0,0,0,0,128,30,192,64,0,0,0,0,0,220,180,64,0,0,0,0,0,205,191,64,0,0,0,0,0,196,181,64,0,0,0,0,0,157,191,64,0,0,0,0,0,60,181,64,0,0,0,0,128,14,192,64,0,0,0,0,0,52,180,64,0,0,0,0,0,5,191,64,0,0,0,0,0,156,180,64,0,0,0,0,0,181,190,64,0,0,0,0,0,124,180,64,0,0,0,0,0,109,190,64,0,0,0,0,0,44,180,64,0,0,0,0,0,157,188,64,0,0,0,0,0,204,178,64,0,0,0,0,0,61,188,64,0,0,0,0,0,60,178,64,0,0,0,0,0,197,188,64,0,0,0,0,0,108,178,64,0,0,0,0,0,181,187,64,0,0,0,0,0,236,176,64,0,0,0,0,0,101,187,64,0,0,0,0,0,220,176,64,0,0,0,0,0,53,186,64,0,0,0,0,0,20,176,64,0,0,0,0,0,77,186,64,0,0,0,0,0,76,176,64,0,0,0,0,0,5,187,64,0,0,0,0,0,196,177,64,0,0,0,0,0,157,187,64,0,0,0,0,0,36,178,64,0,0,0,0,0,205,189,64,0,0,0,0,0,208,180,64,0,0,0,0,0,13,187,64,0,0,0,0,0,244,177,64,0,0,0,0,0,220,184,64,0,0,0,0,0,60,175,64,0,0,0,0,0,31,185,64,0,0,0,0,0,194,175,64,0,0,0,0,0,85,185,64,0,0,0,0,0,232,175,64,0,0,0,0,0,241,185,64,0,0,0,0,0,96,176,64,0,0,0,0,0,1,186,64,0,0,0,0,0,128,176,64,0,0,0,0,0,29,186,64,0,0,0,0,0,108,176,64,0,0,0,0,0,5,186,64,0,0,0,0,0,80,176,64,0,0,0,0,0,33,185,64,0,0,0,0,0,96,174,64,0,0,0,0,0,233,185,64,0,0,0,0,0,176,174,64,0,0,0,0,0,29,186,64,0,0,0,0,0,32,175,64,0,0,0,0,0,69,186,64,0,0,0,0,0,88,175,64,0,0,0,0,0,29,187,64,0,0,0,0,0,121,176,64,0,0,0,0,0,209,188,64,0,0,0,0,0,88,176,64,0,0,0,0,0,113,189,64,0,0,0,0,0,76,176,64,0,0,0,0,0,253,188,64,0,0,0,0,0,184,176,64,0,0,0,0,0,77,188,64,0,0,0,0,0,12,177,64,0,0,0,0,0,165,188,64,0,0,0,0,0,20,177,64,0,0,0,0,0,69,189,64,0,0,0,0,0,220,176,64,0,0,0,0,0,221,189,64,0,0,0,0,0,224,176,64,0,0,0,0,0,117,190,64,0,0,0,0,0,228,176,64,0,0,0,0,0,197,190,64,0,0,0,0,0,192,176,64,0,0,0,0,0,77,191,64,0,0,0,0,0,192,176,64,0,0,0,0,0,193,191,64,0,0,0,0,0,236,176,64,0,0,0,0,128,6,192,64,0,0,0,0,0,9,177,64,0,0,0,0,0,77,192,64,0,0,0,0,0,26,177,64,0,0,0,0,128,154,192,64,0,0,0,0,0,36,177,64,0,0,0,0,128,170,192,64,0,0,0,0,0,32,177,64,0,0,0,0,128,68,193,64,0,0,0,0,0,116,177,64,0,0,0,0,128,62,193,64,0,0,0,0,0,180,176,64,0,0,0,0,128,102,193,64,0,0,0,0,0,176,176,64,0,0,0,0,128,94,193,64,0,0,0,0,0,136,176,64,0,0,0,0,128,54,193,64,0,0,0,0,0,208,175,64,0,0,0,0,128,54,193,64,0,0,0,0,0,198,175,64,0,0,0,0,128,60,193,64,0,0,0,0,0,216,175,64,0,0,0,0,0,53,193,64,0,0,0,0,0,142,175,64,0,0,0,0,128,54,193,64,0,0,0,0,0,198,175,64,0,0,0,0,0,193,192,64,0,0,0,0,0,102,174,64,0,0,0,0,128,36,193,64,0,0,0,0,0,64,174,64,0,0,0,0,128,66,193,64,0,0,0,0,0,208,173,64,0,0,0,0,128,214,192,64,0,0,0,0,0,208,171,64,0,0,0,0,128,132,192,64,0,0,0,0,0,56,170,64,0,0,0,0,128,242,192,64,0,0,0,0,0,128,170,64,0,0,0,0,128,84,193,64,0,0,0,0,0,120,170,64,0,0,0,0,128,24,193,64,0,0,0,0,0,112,169,64,0,0,0,0,128,188,192,64,0,0,0,0,0,208,168,64,0,0,0,0,128,44,193,64,0,0,0,0,0,216,167,64,0,0,0,0,128,133,193,64,0,0,0,0,0,222,166,64,0,0,0,0,128,140,193,64,0,0,0,0,0,160,165,64,0,0,0,0,128,148,193,64,0,0,0,0,0,216,164,64,0,0,0,0,128,164,193,64,0,0,0,0,0,176,164,64,0,0,0,0,128,158,193,64,0,0,0,0,0,224,163,64,0,0,0,0,128,236,193,64,0,0,0,0,0,24,164,64,0,0,0,0,128,58,194,64,0,0,0,0,0,208,163,64,0,0,0,0,128,80,194,64,0,0,0,0,0,72,164,64,0,0,0,0,128,93,194,64,0,0,0,0,0,142,164,64,0,0,0,0,0,52,194,64,0,0,0,0,0,38,165,64,0,0,0,0,128,242,193,64,0,0,0,0,0,40,166,64,0,0,0,0,128,168,193,64,0,0,0,0,0,32,168,64,0,0,0,0,128,146,193,64,0,0,0,0,0,240,168,64,0,0,0,0,128,176,193,64,0,0,0,0,0,16,171,64,0,0,0,0,128,196,193,64,0,0,0,0,0,8,172,64,0,0,0,0,128,182,193,64,0,0,0,0,0,248,175,64,0,0,0,0,0,206,193,64,0,0,0,0,0,203,176,64,0,0,0,0,128,214,193,64,0,0,0,0,0,122,177,64,0,0,0,0,128,136,193,64,0,0,0,0,0,224,177,64,0,0,0,0,128,146,193,64,0,0,0,0,0,84,178,64,0,0,0,0,128,254,193,64,0,0,0,0,0,236,178,64,0,0,0,0,128,114,194,64,0,0,0,0,0,48,180,64,0,0,0,0,128,254,193,64,0,0,0,0,0,64,180,64,0,0,0,0,128,224,193,64,0,0,0,0,0,176,180,64,0,0,0,0,128,230,193,64,0,0,0,0,0,0,181,64,0,0,0,0,128,18,194,64,0,0,0,0,0,48,181,64,0,0,0,0,128,194,193,64,0,0,0,0,0,88,181,64,0,0,0,0,128,136,193,64,0,0,0,0,0,116,181,64,0,0,0,0,128,134,193,64,0,0,0,0,0,140,181,64,0,0,0,0,0,134,193,64,0,0,0,0,0,148,181,64,0,0,0,0,128,183,193,64,0,0,0,0,0,192,181,64,0,0,0,0,128,227,193,64,0,0,0,0,0,232,181,64,0,0,0,0,128,204,193,64,0,0,0,0,0,248,181,64,0,0,0,0,128,230,193,64,0,0,0,0,0,208,182,64,0,0,0,0,128,160,193,64,0,0,0,0,0,4,183,64,0,0,0,0,128,112,193,64,0,0,0,0,0,124,183,64,0,0,0,0,128,116,193,64,0,0,0,0,0,168,183,64,0,0,0,0,128,96,193,64,0,0,0,0,0,236,183,64,0,0,0,0,128,162,193,64,0,0,0,0,0,168,183,64,0,0,0,0,128,86,194,64,0,0,0,0,0,56,184,64,0,0,0,0,128,106,194,64,0,0,0,0,0,172,183,64,0,0,0,0,128,208,194,64,0,0,0,0,0,188,182,64,0,0,0,0,128,226,194,64,0,0,0,0,0,136,182,64,0,0,0,0,128,44,195,64,0,0,0,0,0,116,181,64,0,0,0,0,128,86,195,64,0,0,0,0,0,112,181,64,0,0,0,0,128,92,195,64,0,0,0,0,0,96,181,64,0,0,0,0,128,104,195,64,0,0,0,0,0,188,180,64,0,0,0,0,128,126,195,64,0,0,0,0,0,120,180,64,0,0,0,0,128,122,195,64,0,0,0,0,0,40,180,64,0,0,0,0,128,152,195,64,0,0,0,0,0,196,179,64,0,0,0,0,128,148,195,64,0,0,0,0,0,120,179,64,0,0,0,0,128,200,194,64,0,0,0,0,0,204,178,64,0,0,0,0,128,168,194,64,0,0,0,0,0,68,178,64,0,0,0,0,128,214,194,64,0,0,0,0,0,104,178,64,0,0,0,0,128,72,195,64,0,0,0,0,0,192,178,64,0,0,0,0,128,242,194,64,0,0,0,0,0,48,178,64,0,0,0,0,128,126,194,64,0,0,0,0,0,160,177,64,0,0,0,0,128,218,194,64,0,0,0,0,0,172,177,64,0,0,0,0,128,52,195,64,0,0,0,0,0,8,178,64,0,0,0,0,128,40,195,64,0,0,0,0,0,228,177,64,0,0,0,0,128,226,194,64,0,0,0,0,0,32,177,64,0,0,0,0,128,30,195,64,0,0,0,0,0,64,177,64,0,0,0,0,128,94,195,64,0,0,0,0,0,124,177,64,0,0,0,0,128,42,195,64,0,0,0,0,0,4,177,64,0,0,0,0,128,6,195,64,0,0,0,0,0,188,176,64,0,0,0,0,128,24,195,64,0,0,0,0,0,192,176,64,0,0,0,0,128,212,194,64,0,0,0,0,0,112,175,64,0,0,0,0,128,202,194,64,0,0,0,0,0,64,175,64,0,0,0,0,128,188,194,64,0,0,0,0,0,32,175,64,0,0,0,0,128,208,194,64,0,0,0,0,0,200,174,64,0,0,0,0,128,250,194,64,0,0,0,0,0,240,171,64,0,0,0,0,128,230,194,64,0,0,0,0,0,88,171,64,0,0,0,0,128,170,194,64,0,0,0,0,0,176,169,64,0,0,0,0,128,174,194,64,0,0,0,0,0,80,168,64,0,0,0,0,128,182,194,64,0,0,0,0,0,136,164,64,0,0,0,0,128,120,194,64,0,0,0,0,0,152,163,64,0,0,0,0,0,32,194,64,0,0,0,0,0,66,162,64,0,0,0,0,128,242,193,64,0,0,0,0,0,120,161,64,0,0,0,0,128,220,193,64,0,0,0,0,0,112,160,64,0,0,0,0,0,198,193,64,0,0,0,0,0,196,158,64,0,0,0,0,0,124,193,64,0,0,0,0,0,188,155,64,0,0,0,0,128,57,193,64,0,0,0,0,0,0,153,64,0,0,0,0,128,42,193,64,0,0,0,0,0,240,152,64,0,0,0,0,0,32,193,64,0,0,0,0,0,228,152,64,0,0,0,0,0,41,193,64,0,0,0,0,0,140,152,64,0,0,0,0,0,51,193,64,0,0,0,0,0,52,152,64,0,0,0,0,128,62,193,64,0,0,0,0,0,64,152,64,0,0,0,0,0,75,193,64,0,0,0,0,0,76,152,64,0,0,0,0,128,68,193,64,0,0,0,0,0,232,151,64,0,0,0,0,0,63,193,64,0,0,0,0,0,132,151,64,0,0,0,0,128,46,193,64,0,0,0,0,0,48,151,64,0,0,0,0,0,229,192,64,0,0,0,0,0,200,148,64,0,0,0,0,128,175,192,64,0,0,0,0,0,4,147,64,0,0,0,0,128,188,192,64,0,0,0,0,0,64,148,64,0,0,0,0,128,14,193,64,0,0,0,0,0,32,152,64,0,0,0,0,128,206,192,64,0,0,0,0,0,96,152,64,0,0,0,0,128,196,193,64,0,0,0,0,0,232,162,64,0,0,0,0,128,162,193,64,0,0,0,0,0,0,163,64,0,0,0,0,0,131,193,64,0,0,0,0,0,22,163,64,0,0,0,0,128,114,193,64,0,0,0,0,0,192,163,64,0,0,0,0,128,32,193,64,0,0,0,0,0,208,163,64,0,0,0,0,128,18,193,64,0,0,0,0,0,48,164,64,0,0,0,0,128,212,192,64,0,0,0,0,0,224,163,64,0,0,0,0,128,196,192,64,0,0,0,0,0,120,164,64,0,0,0,0,128,172,192,64,0,0,0,0,0,144,164,64,0,0,0,0,128,154,192,64,0,0,0,0,0,64,164,64,0,0,0,0,128,120,192,64,0,0,0,0,0,64,164,64,0,0,0,0,128,94,192,64,0,0,0,0,0,232,163,64,0,0,0,0,128,6,192,64,0,0,0,0,0,248,163,64,0,0,0,0,128,20,192,64,0,0,0,0,0,240,162,64,0,0,0,0,0,229,191,64,0,0,0,0,0,64,162,64,0,0,0,0,128,42,192,64,0,0,0,0,0,16,161,64,0,0,0,0,128,80,192,64,0,0,0,0,0,66,160,64,0,0,0,0,128,87,192,64,0,0,0,0,0,248,159,64,0,0,0,0,128,92,192,64,0,0,0,0,0,240,158,64,0,0,0,0,128,152,192,64,0,0,0,0,0,144,156,64,0,0,0,0,128,138,192,64,0,0,0,0,0,192,155,64,0,0,0,0,128,92,192,64,0,0,0,0,0,208,152,64,0,0,0,0,128,56,192,64,0,0,0,0,0,32,155,64,0,0,0,0,128,28,192,64,0,0,0,0,0,16,151,64,0,0,0,0,0,237,191,64,0,0,0,0,0,144,148,64,0,0,0,0,0,233,191,64,0,0,0,0,0,208,147,64,0,0,0,0,0,217,191,64,0,0,0,0,0,0,146,64,0,0,0,0,0,189,191,64,0,0,0,0,0,160,146,64,0,0,0,0,0,25,191,64,0,0,0,0,0,144,144,64,0,0,0,0,0,17,191,64,0,0,0,0,0,48,145,64,0,0,0,0,0,253,191,64,0,0,0,0,0,208,151,64,0,0,0,0,0,197,191,64,0,0,0,0,0,192,154,64,0,0,0,0,0,193,191,64,0,0,0,0,0,80,157,64,0,0,0,0,0,233,190,64,0,0,0,0,0,32,152,64,0,0,0,0,0,21,190,64,0,0,0,0,0,192,148,64,0,0,0,0,0,185,188,64,0,0,0,0,0,16,149,64,0,0,0,0,0,37,188,64,0,0,0,0,0,208,147,64,0,0,0,0,0,61,188,64,0,0,0,0,0,128,147,64,0,0,0,0,0,1,187,64,0,0,0,0,0,176,145,64,0,0,0,0,0,65,187,64,0,0,0,0,0,192,146,64,0,0,0,0,0,153,187,64,0,0,0,0,0,160,149,64,0,0,0,0,0,213,187,64,0,0,0,0,0,0,150,64,0,0,0,0,0,133,188,64,0,0,0,0,0,16,151,64,0,0,0,0,0,137,188,64,0,0,0,0,0,64,151,64,0,0,0,0,0,52,189,64,0,0,0,0,0,144,152,64,0,0,0,0,0,228,189,64,0,0,0,0,0,240,153,64,0,0,0,0,0,1,190,64,0,0,0,0,0,208,154,64,0,0,0,0,0,53,190,64,0,0,0,0,0,240,155,64,0,0,0,0,0,157,188,64,0,0,0,0,0,240,154,64,0,0,0,0,0,181,187,64,0,0,0,0,0,64,154,64,0,0,0,0,0,89,187,64,0,0,0,0,0,48,156,64,0,0,0,0,0,161,186,64,0,0,0,0,0,96,157,64,0,0,0,0,0,33,186,64,0,0,0,0,0,192,154,64,0,0,0,0,0,133,185,64,0,0,0,0,0,48,148,64,0,0,0,0,0,149,187,64,0,0,0,0,0,48,144,64,0,0,0,0,0,181,191,64,0,0,0,0,0,160,141,64,0,0,0,0,128,14,192,64,0,0,0,0,0,32,141,64,0,0,0,0,128,162,192,64,0,0,0,0,0,96,143,64,0,0,0,0,128,218,192,64,0,0,0,0,0,32,143,64,0,0,0,0,128,78,193,64,0,0,0,0,0,208,147,64,0,0,0,0,128,126,193,64,0,0,0,0,0,80,149,64,0,0,0,0,128,130,193,64,0,0,0,0,0,176,150,64,0,0,0,0,128,178,193,64,0,0,0,0,0,208,152,64,0,0,0,0,128,238,193,64,0,0,0,0,0,112,154,64,0,0,0,0,128,14,194,64,0,0,0,0,0,208,156,64,0,0,0,0,128,34,194,64,0,0,0,0,0,80,157,64,0,0,0,0,128,214,194,64,0,0,0,0,0,72,160,64,0,0,0,0,128,134,194,64,0,0,0,0,0,72,160,64,0,0,0,0,128,166,195,64,0,0,0,0,0,8,162,64,0,0,0,0,128,254,194,64,0,0,0,0,0,216,161,64,0,0,0,0,128,218,194,64,0,0,0,0,0,184,161,64,0,0,0,0,128,2,195,64,0,0,0,0,0,72,162,64,0,0,0,0,128,98,195,64,0,0,0,0,0,72,163,64,0,0,0,0,128,150,195,64,0,0,0,0,0,120,163,64,0,0,0,0,128,166,195,64,0,0,0,0,0,216,163,64,0,0,0,0,128,106,195,64,0,0,0,0,0,200,163,64,0,0,0,0,128,254,194,64,0,0,0,0,0,120,165,64,0,0,0,0,128,194,195,64,0,0,0,0,0,104,165,64,19,19,19,19,19,19,211,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,252,182,64,0,0,0,0,0,96,173,64,0,0,0,0,0,222,183,64,0,0,0,0,0,58,174,64,0,0,0,0,0,17,184,64,0,0,0,0,0,168,174,64,0,0,0,0,0,69,184,64,0,0,0,0,0,24,175,64,0,0,0,0,0,93,185,64,0,0,0,0,0,112,176,64,0,0,0,0,0,241,184,64,0,0,0,0,0,72,176,64,0,0,0,0,0,189,184,64,0,0,0,0,0,36,176,64,0,0,0,0,0,177,183,64,0,0,0,0,0,184,174,64,0,0,0,0,0,103,183,64,0,0,0,0,0,208,173,64,0,0,0,0,0,252,182,64,0,0,0,0,0,96,173,64,51,51,51,51,51,51,227,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,201,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,101,178,64,0,0,0,0,0,240,167,64,0,0,0,0,0,123,178,64,0,0,0,0,0,108,168,64,0,0,0,0,0,109,178,64,0,0,0,0,0,120,168,64,0,0,0,0,0,251,177,64,0,0,0,0,0,220,168,64,0,0,0,0,0,153,177,64,0,0,0,0,0,0,168,64,0,0,0,0,0,157,177,64,0,0,0,0,0,72,167,64,0,0,0,0,0,81,178,64,0,0,0,0,0,130,167,64,0,0,0,0,0,101,178,64,0,0,0,0,0,240,167,64,154,153,153,153,153,153,217,63,51,51,51,51,51,51,227,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,104,178,64,0,0,0,0,0,56,168,64,0,0,0,0,0,109,178,64,0,0,0,0,0,112,168,64,0,0,0,0,0,239,177,64,0,0,0,0,0,200,168,64,0,0,0,0,0,153,177,64,0,0,0,0,0,252,167,64,0,0,0,0,0,157,177,64,0,0,0,0,0,68,167,64,0,0,0,0,0,85,178,64,0,0,0,0,0,130,167,64,0,0,0,0,0,105,178,64,0,0,0,0,0,240,167,64,0,0,0,0,0,104,178,64,0,0,0,0,0,56,168,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,254,177,64,0,0,0,0,0,16,168,64,0,0,0,0,0,254,177,64,0,0,0,0,0,170,167,64,0,0,0,0,0,21,178,64,0,0,0,0,0,170,167,64,0,0,0,0,0,44,178,64,0,0,0,0,0,170,167,64,0,0,0,0,0,44,178,64,0,0,0,0,0,16,168,64,0,0,0,0,0,44,178,64,0,0,0,0,0,118,168,64,0,0,0,0,0,21,178,64,0,0,0,0,0,118,168,64,0,0,0,0,0,254,177,64,0,0,0,0,0,118,168,64,0,0,0,0,0,254,177,64,0,0,0,0,0,16,168,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,180,64,0,0,0,0,0,234,178,64,0,0,0,0,0,125,179,64,0,0,0,0,0,180,179,64,0,0,0,0,0,133,179,64,0,0,0,0,0,212,179,64,0,0,0,0,0,29,179,64,0,0,0,0,0,100,181,64,0,0,0,0,0,221,177,64,0,0,0,0,0,116,181,64,0,0,0,0,0,154,176,64,0,0,0,0,0,135,181,64,0,0,0,0,0,181,176,64,0,0,0,0,0,252,181,64,0,0,0,0,0,101,177,64,0,0,0,0,0,204,181,64,0,0,0,0,0,149,177,64,0,0,0,0,0,252,181,64,0,0,0,0,0,109,178,64,0,0,0,0,0,244,181,64,0,0,0,0,0,205,177,64,0,0,0,0,0,116,182,64,0,0,0,0,0,69,177,64,0,0,0,0,0,92,183,64,0,0,0,0,0,72,177,64,0,0,0,0,0,170,183,64,0,0,0,0,0,125,176,64,0,0,0,0,0,100,183,64])
.concat([0,0,0,0,0,114,175,64,0,0,0,0,0,32,183,64,0,0,0,0,0,214,173,64,0,0,0,0,0,30,182,64,0,0,0,0,0,88,171,64,0,0,0,0,0,251,180,64,0,0,0,0,0,10,173,64,0,0,0,0,0,228,179,64,0,0,0,0,0,42,172,64,0,0,0,0,0,172,180,64,0,0,0,0,0,5,176,64,0,0,0,0,0,52,180,64,0,0,0,0,0,29,177,64,0,0,0,0,0,28,180,64,0,0,0,0,0,77,177,64,0,0,0,0,0,236,179,64,0,0,0,0,0,69,178,64,0,0,0,0,0,68,180,64,0,0,0,0,0,205,178,64,0,0,0,0,0,100,180,64,0,0,0,0,0,117,179,64,0,0,0,0,0,156,179,64,0,0,0,0,0,209,179,64,0,0,0,0,0,202,178,64,0,0,0,0,0,9,180,64,0,0,0,0,0,202,178,64,0,0,0,0,0,65,180,64,0,0,0,0,0,202,178,64,0,0,0,0,0,1,180,64,0,0,0,0,0,234,178,64,221,220,220,220,220,220,236,63,51,51,51,51,51,51,227,63,51,51,51,51,51,51,227,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,90,173,64,0,0,0,0,0,145,181,64,0,0,0,0,0,158,172,64,0,0,0,0,0,3,181,64,0,0,0,0,0,170,172,64,0,0,0,0,0,220,180,64,0,0,0,0,0,214,172,64,0,0,0,0,0,65,180,64,0,0,0,0,0,190,172,64,0,0,0,0,0,237,180,64,0,0,0,0,0,37,177,64,0,0,0,0,0,36,180,64,0,0,0,0,0,125,177,64,0,0,0,0,0,36,180,64,0,0,0,0,0,173,177,64,0,0,0,0,0,52,180,64,0,0,0,0,0,84,178,64,0,0,0,0,0,91,180,64,0,0,0,0,0,245,178,64,0,0,0,0,0,100,180,64,0,0,0,0,0,101,178,64,0,0,0,0,0,116,181,64,0,0,0,0,0,125,177,64,0,0,0,0,0,84,181,64,0,0,0,0,0,117,176,64,0,0,0,0,0,116,181,64,0,0,0,0,0,125,176,64,0,0,0,0,0,212,181,64,0,0,0,0,0,205,176,64,0,0,0,0,0,100,182,64,0,0,0,0,0,45,177,64,0,0,0,0,0,148,182,64,0,0,0,0,0,101,177,64,0,0,0,0,0,196,182,64,0,0,0,0,0,93,177,64,0,0,0,0,0,4,183,64,0,0,0,0,0,84,177,64,0,0,0,0,0,78,183,64,0,0,0,0,0,245,176,64,0,0,0,0,0,116,183,64,0,0,0,0,0,222,176,64,0,0,0,0,0,125,183,64,0,0,0,0,0,174,176,64,0,0,0,0,0,98,183,64,0,0,0,0,0,109,176,64,0,0,0,0,0,68,183,64,0,0,0,0,0,84,176,64,0,0,0,0,0,68,183,64,0,0,0,0,0,228,175,64,0,0,0,0,0,248,182,64,0,0,0,0,0,28,175,64,0,0,0,0,0,171,182,64,0,0,0,0,0,154,174,64,0,0,0,0,0,100,182,64,0,0,0,0,0,4,174,64,0,0,0,0,0,18,182,64,0,0,0,0,0,90,173,64,0,0,0,0,0,145,181,64,118,118,118,118,118,118,230,63,154,153,153,153,153,153,217,63,154,153,153,153,153,153,217,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,206,173,64,0,0,0,0,0,229,181,64,0,0,0,0,0,90,173,64,0,0,0,0,0,172,181,64,0,0,0,0,0,90,173,64,0,0,0,0,0,145,181,64,0,0,0,0,0,206,173,64,0,0,0,0,0,229,181,64,0,0,0,0,0,42,174,64,0,0,0,0,0,85,181,64,0,0,0,0,0,138,174,64,0,0,0,0,0,156,181,64,0,0,0,0,0,246,174,64,0,0,0,0,0,7,182,64,0,0,0,0,0,53,176,64,0,0,0,0,0,36,182,64,0,0,0,0,0,157,176,64,0,0,0,0,0,52,182,64,0,0,0,0,0,153,176,64,0,0,0,0,0,1,182,64,0,0,0,0,0,228,176,64,0,0,0,0,0,111,182,64,0,0,0,0,0,45,177,64,0,0,0,0,0,148,182,64,0,0,0,0,0,101,177,64,0,0,0,0,0,196,182,64,0,0,0,0,0,93,177,64,0,0,0,0,0,4,183,64,0,0,0,0,0,84,177,64,0,0,0,0,0,78,183,64,0,0,0,0,0,245,176,64,0,0,0,0,0,116,183,64,0,0,0,0,0,222,176,64,0,0,0,0,0,125,183,64,0,0,0,0,0,174,176,64,0,0,0,0,0,98,183,64,0,0,0,0,0,109,176,64,0,0,0,0,0,68,183,64,0,0,0,0,0,84,176,64,0,0,0,0,0,68,183,64,0,0,0,0,0,228,175,64,0,0,0,0,0,248,182,64,0,0,0,0,0,28,175,64,0,0,0,0,0,171,182,64,0,0,0,0,0,154,174,64,0,0,0,0,0,100,182,64,0,0,0,0,0,56,174,64,0,0,0,0,0,46,182,64,0,0,0,0,0,206,173,64,0,0,0,0,0,229,181,64,0,0,0,0,0,76,174,64,0,0,0,0,0,24,182,64,0,0,0,0,0,218,174,64,0,0,0,0,0,36,182,64,0,0,0,0,0,46,175,64,0,0,0,0,0,30,182,64,0,0,0,0,0,42,175,64,0,0,0,0,0,16,182,64,0,0,0,0,0,10,175,64,0,0,0,0,0,12,182,64,0,0,0,0,0,166,174,64,0,0,0,0,0,255,181,64,0,0,0,0,0,42,174,64,0,0,0,0,0,116,181,64,0,0,0,0,0,252,173,64,0,0,0,0,0,64,181,64,0,0,0,0,0,42,174,64,0,0,0,0,0,85,181,64,83,83,83,83,83,83,227,63,148,147,147,147,147,147,195,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,178,178,64,0,0,0,0,0,168,168,64,0,0,0,0,0,164,178,64,0,0,0,0,0,2,169,64,0,0,0,0,0,134,178,64,0,0,0,0,0,118,169,64,0,0,0,0,0,123,178,64,0,0,0,0,0,238,169,64,0,0,0,0,0,189,178,64,0,0,0,0,0,208,169,64,0,0,0,0,0,163,177,64,0,0,0,0,0,32,171,64,0,0,0,0,0,134,178,64,0,0,0,0,0,158,171,64,0,0,0,0,0,165,177,64,0,0,0,0,0,94,171,64,0,0,0,0,0,45,177,64,0,0,0,0,0,104,173,64,0,0,0,0,0,49,177,64,0,0,0,0,0,72,173,64,0,0,0,0,0,249,176,64,0,0,0,0,0,112,173,64,0,0,0,0,0,224,176,64,0,0,0,0,0,130,173,64,0,0,0,0,0,130,176,64,0,0,0,0,0,70,174,64,0,0,0,0,0,36,176,64,0,0,0,0,0,14,175,64,0,0,0,0,0,242,175,64,0,0,0,0,0,48,175,64,0,0,0,0,0,146,175,64,0,0,0,0,0,86,175,64,0,0,0,0,0,82,175,64,0,0,0,0,0,210,175,64,0,0,0,0,0,170,173,64,0,0,0,0,0,176,177,64,0,0,0,0,0,74,173,64,0,0,0,0,0,4,178,64,0,0,0,0,0,106,173,64,0,0,0,0,0,140,178,64,0,0,0,0,0,58,173,64,0,0,0,0,0,220,178,64,0,0,0,0,0,242,172,64,0,0,0,0,0,236,179,64,0,0,0,0,0,162,172,64,0,0,0,0,0,56,180,64,0,0,0,0,0,178,172,64,0,0,0,0,0,16,180,64,0,0,0,0,0,146,172,64,0,0,0,0,0,148,178,64,0,0,0,0,0,142,172,64,0,0,0,0,0,123,178,64,0,0,0,0,0,178,172,64,0,0,0,0,0,73,178,64,0,0,0,0,0,218,172,64,0,0,0,0,0,4,178,64,0,0,0,0,0,218,172,64,0,0,0,0,0,159,177,64,0,0,0,0,0,26,173,64,0,0,0,0,0,132,177,64,0,0,0,0,0,82,173,64,0,0,0,0,0,108,177,64,0,0,0,0,0,130,173,64,0,0,0,0,0,28,177,64,0,0,0,0,0,156,173,64,0,0,0,0,0,173,176,64,0,0,0,0,0,82,174,64,0,0,0,0,0,100,176,64,0,0,0,0,0,236,174,64,0,0,0,0,0,39,176,64,0,0,0,0,0,82,175,64,0,0,0,0,0,8,175,64,0,0,0,0,0,132,175,64,0,0,0,0,0,108,174,64,0,0,0,0,0,25,177,64,0,0,0,0,0,224,172,64,0,0,0,0,0,129,177,64,0,0,0,0,0,104,172,64,0,0,0,0,0,229,177,64,0,0,0,0,0,16,171,64,0,0,0,0,0,78,178,64,0,0,0,0,0,48,170,64,0,0,0,0,0,134,178,64,0,0,0,0,0,118,169,64,0,0,0,0,0,138,178,64,0,0,0,0,0,60,169,64,0,0,0,0,0,159,178,64,0,0,0,0,0,228,168,64,0,0,0,0,0,178,178,64,0,0,0,0,0,168,168,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,154,170,64,0,0,0,0,0,164,180,64,0,0,0,0,0,74,171,64,0,0,0,0,0,44,180,64,0,0,0,0,0,154,171,64,0,0,0,0,0,72,180,64,0,0,0,0,0,94,171,64,0,0,0,0,0,12,181,64,0,0,0,0,0,130,171,64,0,0,0,0,0,10,182,64,0,0,0,0,0,182,171,64,0,0,0,0,0,154,182,64,0,0,0,0,0,234,171,64,0,0,0,0,0,42,183,64,0,0,0,0,0,190,171,64,0,0,0,0,0,84,183,64,0,0,0,0,0,190,171,64,0,0,0,0,0,56,183,64,0,0,0,0,0,154,170,64,0,0,0,0,0,164,180,64,83,83,83,83,83,83,227,63,148,147,147,147,147,147,195,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,224,171,64,0,0,0,0,0,103,177,64,0,0,0,0,0,234,171,64,0,0,0,0,0,57,177,64,0,0,0,0,0,186,171,64,0,0,0,0,0,92,177,64,0,0,0,0,0,138,169,64,0,0,0,0,0,116,178,64,0,0,0,0,0,202,170,64,0,0,0,0,0,28,180,64,0,0,0,0,0,6,171,64,0,0,0,0,0,94,180,64,0,0,0,0,0,142,170,64,0,0,0,0,0,2,180,64,0,0,0,0,0,214,169,64,0,0,0,0,0,6,179,64,0,0,0,0,0,2,170,64,0,0,0,0,0,134,178,64,0,0,0,0,0,10,170,64,0,0,0,0,0,90,178,64,0,0,0,0,0,86,170,64,0,0,0,0,0,34,178,64,0,0,0,0,0,174,171,64,0,0,0,0,0,56,177,64,0,0,0,0,0,26,172,64,0,0,0,0,0,10,177,64,0,0,0,0,0,98,172,64,0,0,0,0,0,212,175,64,0,0,0,0,0,202,174,64,0,0,0,0,0,4,175,64,0,0,0,0,0,174,175,64,0,0,0,0,0,168,174,64,0,0,0,0,0,250,174,64,0,0,0,0,0,24,175,64,0,0,0,0,0,58,172,64,0,0,0,0,0,152,175,64,0,0,0,0,0,74,172,64,0,0,0,0,0,20,178,64,0,0,0,0,0,42,172,64,0,0,0,0,0,4,180,64,0,0,0,0,0,250,171,64,0,0,0,0,0,4,178,64,0,0,0,0,0,202,171,64,0,0,0,0,0,228,177,64,0,0,0,0,0,180,171,64,0,0,0,0,0,213,177,64,0,0,0,0,0,224,171,64,0,0,0,0,0,103,177,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,58,186,64,0,0,0,0,0,30,161,64,0,0,0,0,0,110,186,64,0,0,0,0,0,178,161,64,0,0,0,0,0,191,186,64,0,0,0,0,0,34,163,64,0,0,0,0,0,201,186,64,0,0,0,0,0,78,163,64,0,0,0,0,0,191,186,64,0,0,0,0,0,126,163,64,0,0,0,0,0,158,186,64,0,0,0,0,0,44,164,64,0,0,0,0,0,132,186,64,0,0,0,0,0,126,164,64,0,0,0,0,0,122,186,64,0,0,0,0,0,132,164,64,0,0,0,0,0,109,186,64,0,0,0,0,0,158,164,64,0,0,0,0,0,97,186,64,0,0,0,0,0,192,164,64,0,0,0,0,0,72,186,64,0,0,0,0,0,218,164,64,0,0,0,0,0,69,186,64,0,0,0,0,0,48,165,64,0,0,0,0,0,65,186,64,0,0,0,0,0,210,165,64,0,0,0,0,0,32,186,64,0,0,0,0,0,254,165,64,0,0,0,0,0,10,186,64,0,0,0,0,0,2,166,64,0,0,0,0,0,194,185,64,0,0,0,0,0,84,166,64,0,0,0,0,0,161,185,64,0,0,0,0,0,96,166,64,0,0,0,0,0,26,185,64,0,0,0,0,0,146,167,64,0,0,0,0,0,24,185,64,0,0,0,0,0,174,167,64,0,0,0,0,0,255,184,64,0,0,0,0,0,254,167,64,0,0,0,0,0,233,184,64,0,0,0,0,0,80,168,64,0,0,0,0,0,211,184,64,0,0,0,0,0,58,168,64,0,0,0,0,0,184,184,64,0,0,0,0,0,28,168,64,0,0,0,0,0,203,184,64,0,0,0,0,0,226,167,64,0,0,0,0,0,61,185,64,0,0,0,0,0,148,166,64,0,0,0,0,0,113,185,64,0,0,0,0,0,64,166,64,0,0,0,0,0,108,185,64,0,0,0,0,0,20,166,64,0,0,0,0,0,124,185,64,0,0,0,0,0,210,165,64,0,0,0,0,0,166,185,64,0,0,0,0,0,92,165,64,0,0,0,0,0,218,185,64,0,0,0,0,0,210,164,64,0,0,0,0,0,0,186,64,0,0,0,0,0,48,164,64,0,0,0,0,0,250,185,64,0,0,0,0,0,32,164,64,0,0,0,0,0,29,186,64,0,0,0,0,0,226,162,64,0,0,0,0,0,19,186,64,0,0,0,0,0,128,162,64,0,0,0,0,0,12,186,64,0,0,0,0,0,54,162,64,0,0,0,0,0,25,186,64,0,0,0,0,0,32,162,64,0,0,0,0,0,242,185,64,0,0,0,0,0,84,161,64,0,0,0,0,0,253,185,64,0,0,0,0,0,242,160,64,0,0,0,0,0,0,186,64,0,0,0,0,0,218,160,64,0,0,0,0,0,49,186,64,0,0,0,0,0,228,160,64,0,0,0,0,0,56,186,64,0,0,0,0,0,230,160,64,0,0,0,0,0,56,186,64,0,0,0,0,0,250,160,64,0,0,0,0,0,58,186,64,0,0,0,0,0,30,161,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,120,185,64,0,0,0,0,0,80,161,64,0,0,0,0,0,113,185,64,0,0,0,0,0,64,161,64,0,0,0,0,0,105,185,64,0,0,0,0,0,20,161,64,0,0,0,0,0,123,185,64,0,0,0,0,0,244,160,64,0,0,0,0,0,160,185,64,0,0,0,0,0,172,160,64,0,0,0,0,0,198,185,64,0,0,0,0,0,36,161,64,0,0,0,0,0,238,185,64,0,0,0,0,0,242,161,64,0,0,0,0,0,1,186,64,0,0,0,0,0,58,162,64,0,0,0,0,0,225,185,64,0,0,0,0,0,96,162,64,0,0,0,0,0,4,186,64,0,0,0,0,0,40,163,64,0,0,0,0,0,194,185,64,0,0,0,0,0,178,163,64,0,0,0,0,0,192,185,64,0,0,0,0,0,208,163,64,0,0,0,0,0,178,185,64,0,0,0,0,0,240,163,64,0,0,0,0,0,176,185,64,0,0,0,0,0,14,164,64,0,0,0,0,0,145,185,64,0,0,0,0,0,62,164,64,0,0,0,0,0,130,185,64,0,0,0,0,0,62,164,64,0,0,0,0,0,106,185,64,0,0,0,0,0,16,164,64,0,0,0,0,0,106,185,64,0,0,0,0,0,242,163,64,0,0,0,0,0,124,185,64,0,0,0,0,0,202,163,64,0,0,0,0,0,128,185,64,0,0,0,0,0,114,163,64,0,0,0,0,0,135,185,64,0,0,0,0,0,18,163,64,0,0,0,0,0,145,185,64,0,0,0,0,0,240,162,64,0,0,0,0,0,100,185,64,0,0,0,0,0,30,162,64,0,0,0,0,0,92,185,64,0,0,0,0,0,252,161,64,0,0,0,0,0,97,185,64,0,0,0,0,0,200,161,64,0,0,0,0,0,107,185,64,0,0,0,0,0,112,161,64,0,0,0,0,0,120,185,64,0,0,0,0,0,80,161,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,146,190,64,0,0,0,0,0,128,156,64,0,0,0,0,0,167,190,64,0,0,0,0,0,212,156,64,0,0,0,0,0,185,190,64,0,0,0,0,0,224,156,64,0,0,0,0,0,1,191,64,0,0,0,0,0,64,160,64,0,0,0,0,0,84,191,64,0,0,0,0,0,124,160,64,0,0,0,0,0,96,191,64,0,0,0,0,0,192,160,64,0,0,0,0,0,98,191,64,0,0,0,0,0,238,160,64,0,0,0,0,0,183,191,64,0,0,0,0,0,194,161,64,0,0,0,0,0,127,191,64,0,0,0,0,0,174,162,64,0,0,0,0,0,73,191,64,0,0,0,0,0,64,163,64,0,0,0,0,0,44,191,64,0,0,0,0,0,76,163,64,0,0,0,0,0,17,191,64,0,0,0,0,0,98,163,64,0,0,0,0,0,7,191,64,0,0,0,0,0,112,163,64,0,0,0,0,0,9,191,64,0,0,0,0,0,128,163,64,0,0,0,0,0,192,190,64,0,0,0,0,0,168,163,64,0,0,0,0,0,151,190,64,0,0,0,0,0,178,163,64,0,0,0,0,0,145,190,64,0,0,0,0,0,96,163,64,0,0,0,0,0,211,190,64,0,0,0,0,0,6,163,64,0,0,0,0,0,152,190,64,0,0,0,0,0,112,162,64,0,0,0,0,0,86,190,64,0,0,0,0,0,198,161,64,0,0,0,0,0,75,190,64,0,0,0,0,0,126,161,64,0,0,0,0,0,63,190,64,0,0,0,0,0,60,161,64,0,0,0,0,0,76,190,64,0,0,0,0,0,20,161,64,0,0,0,0,0,107,190,64,0,0,0,0,0,178,160,64,0,0,0,0,0,94,190,64,0,0,0,0,0,132,160,64,0,0,0,0,0,41,190,64,0,0,0,0,0,132,159,64,0,0,0,0,0,15,190,64,0,0,0,0,0,160,158,64,0,0,0,0,0,28,190,64,0,0,0,0,0,228,157,64,0,0,0,0,0,81,190,64,0,0,0,0,0,32,157,64,0,0,0,0,0,74,190,64,0,0,0,0,0,0,157,64,0,0,0,0,0,81,190,64,0,0,0,0,0,224,156,64,0,0,0,0,0,84,190,64,0,0,0,0,0,196,156,64,0,0,0,0,0,75,190,64,0,0,0,0,0,160,156,64,0,0,0,0,0,72,190,64,0,0,0,0,0,176,155,64,0,0,0,0,0,112,190,64,0,0,0,0,0,8,156,64,0,0,0,0,0,146,190,64,0,0,0,0,0,128,156,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,114,186,64,0,0,0,0,0,232,158,64,0,0,0,0,0,202,186,64,0,0,0,0,0,40,158,64,0,0,0,0,0,242,186,64,0,0,0,0,0,232,157,64,0,0,0,0,0,16,187,64,0,0,0,0,0,228,157,64,0,0,0,0,0,33,187,64,0,0,0,0,0,36,158,64,0,0,0,0,0,49,187,64,0,0,0,0,0,80,158,64,0,0,0,0,0,103,187,64,0,0,0,0,0,4,158,64,0,0,0,0,0,137,187,64,0,0,0,0,0,200,157,64,0,0,0,0,0,160,187,64,0,0,0,0,0,232,157,64,0,0,0,0,0,194,187,64,0,0,0,0,0,20,158,64,0,0,0,0,0,185,187,64,0,0,0,0,0,160,158,64,0,0,0,0,0,207,187,64,0,0,0,0,0,224,158,64,0,0,0,0,0,225,187,64,0,0,0,0,0,64,159,64,0,0,0,0,0,218,187,64,0,0,0,0,0,96,159,64,0,0,0,0,0,224,187,64,0,0,0,0,0,128,159,64,0,0,0,0,0,222,187,64,0,0,0,0,0,72,160,64,0,0,0,0,0,236,187,64,0,0,0,0,0,108,160,64,0,0,0,0,0,27,188,64,0,0,0,0,0,218,160,64,0,0,0,0,0,137,188,64,0,0,0,0,0,224,160,64,0,0,0,0,0,168,188,64,0,0,0,0,0,112,160,64,0,0,0,0,0,207,188,64,0,0,0,0,0,180,160,64,0,0,0,0,0,217,188,64,0,0,0,0,0,196,160,64,0,0,0,0,0,213,188,64,0,0,0,0,0,230,160,64,0,0,0,0,0,212,188,64,0,0,0,0,0,30,161,64,0,0,0,0,0,221,188,64,0,0,0,0,0,80,161,64,0,0,0,0,0,209,188,64,0,0,0,0,0,80,162,64,0,0,0,0,0,81,188,64,0,0,0,0,0,112,163,64,0,0,0,0,0,85,188,64,0,0,0,0,0,140,163,64,0,0,0,0,0,75,188,64,0,0,0,0,0,80,164,64,0,0,0,0,0,88,188,64,0,0,0,0,0,94,164,64,0,0,0,0,0,122,188,64,0,0,0,0,0,34,164,64,0,0,0,0,0,137,188,64,0,0,0,0,0,30,164,64,0,0,0,0,0,186,188,64,0,0,0,0,0,178,163,64,0,0,0,0,0,200,188,64,0,0,0,0,0,174,163,64,0,0,0,0,0,225,188,64,0,0,0,0,0,110,163,64,0,0,0,0,0,33,189,64,0,0,0,0,0,82,163,64,0,0,0,0,0,41,189,64,0,0,0,0,0,96,163,64,0,0,0,0,0,44,189,64,0,0,0,0,0,70,163,64,0,0,0,0,0,66,189,64,0,0,0,0,0,72,163,64,0,0,0,0,0,146,189,64,0,0,0,0,0,22,163,64,0,0,0,0,0,208,189,64,0,0,0,0,0,10,163,64,0,0,0,0,0,221,189,64,0,0,0,0,0,2,163,64,0,0,0,0,0,233,189,64,0,0,0,0,0,240,162,64,0,0,0,0,0,9,190,64,0,0,0,0,0,236,162,64,0,0,0,0,0,42,190,64,0,0,0,0,0,254,162,64,0,0,0,0,0,64,190,64,0,0,0,0,0,66,163,64,0,0,0,0,0,97,190,64,0,0,0,0,0,200,163,64,0,0,0,0,0,26,190,64,0,0,0,0,0,50,164,64,0,0,0,0,0,24,190,64,0,0,0,0,0,80,164,64,0,0,0,0,0,9,190,64,0,0,0,0,0,106,164,64,0,0,0,0,0,1,190,64,0,0,0,0,0,144,164,64,0,0,0,0,0,242,189,64,0,0,0,0,0,146,164,64,0,0,0,0,0,207,189,64,0,0,0,0,0,218,164,64,0,0,0,0,0,168,189,64,0,0,0,0,0,252,164,64,0,0,0,0,0,95,189,64,0,0,0,0,0,56,165,64,0,0,0,0,0,225,188,64,0,0,0,0,0,154,165,64,0,0,0,0,0,137,188,64,0,0,0,0,0,144,165,64,0,0,0,0,0,123,188,64,0,0,0,0,0,174,165,64,0,0,0,0,0,92,188,64,0,0,0,0,0,192,165,64,0,0,0,0,0,41,188,64,0,0,0,0,0,224,165,64,0,0,0,0,0,33,188,64,0,0,0,0,0,230,165,64,0,0,0,0,0,26,188,64,0,0,0,0,0,212,165,64,0,0,0,0,0,209,187,64,0,0,0,0,0,248,165,64,0,0,0,0,0,152,187,64,0,0,0,0,0,78,166,64,0,0,0,0,0,138,187,64,0,0,0,0,0,78,166,64,0,0,0,0,0,100,187,64,0,0,0,0,0,30,166,64,0,0,0,0,0,123,187,64,0,0,0,0,0,204,165,64,0,0,0,0,0,227,187,64,0,0,0,0,0,242,164,64,0,0,0,0,0,248,187,64,0,0,0,0,0,238,164,64,0,0,0,0,0,32,188,64,0,0,0,0,0,188,164,64,0,0,0,0,0,57,188,64,0,0,0,0,0,128,164,64,0,0,0,0,0,48,188,64,0,0,0,0,0,106,164,64,0,0,0,0,0,41,188,64,0,0,0,0,0,114,164,64,0,0,0,0,0,25,188,64,0,0,0,0,0,142,164,64,0,0,0,0,0,10,188,64,0,0,0,0,0,146,164,64,0,0,0,0,0,168,187,64,0,0,0,0,0,30,165,64,0,0,0,0,0,145,187,64,0,0,0,0,0,34,165,64,0,0,0,0,0,129,187,64,0,0,0,0,0,60,165,64,0,0,0,0,0,88,187,64,0,0,0,0,0,56,165,64,0,0,0,0,0,81,187,64,0,0,0,0,0,144,165,64,0,0,0,0,0,249,186,64,0,0,0,0,0,196,165,64,0,0,0,0,0,236,186,64,0,0,0,0,0,170,165,64,0,0,0,0,0,217,186,64,0,0,0,0,0,132,165,64,0,0,0,0,0,236,186,64,0,0,0,0,0,84,165,64,0,0,0,0,0,65,187,64,0,0,0,0,0,160,164,64,0,0,0,0,0,115,187,64,0,0,0,0,0,54,164,64,0,0,0,0,0,121,187,64,0,0,0,0,0,208,163,64,0,0,0,0,0,136,187,64,0,0,0,0,0,192,163,64,0,0,0,0,0,175,187,64,0,0,0,0,0,176,162,64,0,0,0,0,0,161,187,64,0,0,0,0,0,144,162,64,0,0,0,0,0,144,187,64,0,0,0,0,0,218,162,64,0,0,0,0,0,121,187,64,0,0,0,0,0,222,162,64,0,0,0,0,0,72,187,64,0,0,0,0,0,226,162,64,0,0,0,0,0,82,187,64,0,0,0,0,0,128,162,64,0,0,0,0,0,113,187,64,0,0,0,0,0,224,161,64,0,0,0,0,0,91,187,64,0,0,0,0,0,196,161,64,0,0,0,0,0,80,187,64,0,0,0,0,0,116,161,64,0,0,0,0,0,67,187,64,0,0,0,0,0,28,161,64,0,0,0,0,0,55,187,64,0,0,0,0,0,4,161,64,0,0,0,0,0,236,186,64,0,0,0,0,0,202,160,64,0,0,0,0,0,177,186,64,0,0,0,0,0,112,160,64,0,0,0,0,0,161,186,64,0,0,0,0,0,128,160,64,0,0,0,0,0,163,186,64,0,0,0,0,0,112,160,64,0,0,0,0,0,153,186,64,0,0,0,0,0,98,160,64,0,0,0,0,0,133,186,64,0,0,0,0,0,90,160,64,0,0,0,0,0,100,186,64,0,0,0,0,0,136,160,64,0,0,0,0,0,68,186,64,0,0,0,0,0,180,160,64,0,0,0,0,0,51,186,64,0,0,0,0,0,168,160,64,0,0,0,0,0,30,186,64,0,0,0,0,0,154,160,64,0,0,0,0,0,28,186,64,0,0,0,0,0,94,160,64,0,0,0,0,0,44,186,64,0,0,0,0,0,4,160,64,0,0,0,0,0,92,186,64,0,0,0,0,0,24,159,64,0,0,0,0,0,114,186,64,0,0,0,0,0,232,158,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,99,183,64,0,0,0,0,0,120,155,64,0,0,0,0,0,61,183,64,0,0,0,0,0,80,156,64,0,0,0,0,0,173,182,64,0,0,0,0,0,24,160,64,0,0,0,0,0,149,182,64,0,0,0,0,0,232,160,64,0,0,0,0,0,189,183,64,0,0,0,0,0,56,161,64,0,0,0,0,0,117,184,64,0,0,0,0,0,72,162,64,0,0,0,0,0,237,183,64,0,0,0,0,0,136,164,64,0,0,0,0,0,213,183,64,0,0,0,0,0,184,160,64,0,0,0,0,0,205,182,64,0,0,0,0,0,232,161,64,0,0,0,0,0,173,182,64,0,0,0,0,0,232,161,64,0,0,0,0,0,45,182,64,0,0,0,0,0,200,160,64,0,0,0,0,0,53,182,64,0,0,0,0,0,232,160,64,0,0,0,0,0,221,181,64,0,0,0,0,0,248,161,64,0,0,0,0,0,133,181,64,0,0,0,0,0,8,163,64,0,0,0,0,0,205,181,64,0,0,0,0,0,40,163,64,0,0,0,0,0,229,181,64,0,0,0,0,0,120,163,64,0,0,0,0,0,53,182,64,0,0,0,0,0,136,162,64,0,0,0,0,0,224,182,64,0,0,0,0,0,58,163,64,0,0,0,0,0,70,183,64,0,0,0,0,0,166,165,64,0,0,0,0,0,45,183,64,0,0,0,0,0,74,165,64,0,0,0,0,0,235,182,64,0,0,0,0,0,204,164,64,0,0,0,0,0,91,182,64,0,0,0,0,0,182,163,64,0,0,0,0,0,69,182,64,0,0,0,0,0,120,163,64,0,0,0,0,0,245,181,64,0,0,0,0,0,152,162,64,0,0,0,0,0,29,182,64,0,0,0,0,0,56,164,64,0,0,0,0,0,253,181,64,0,0,0,0,0,168,166,64,0,0,0,0,0,45,182,64,0,0,0,0,0,104,168,64,0,0,0,0,0,213,181,64,0,0,0,0,0,136,166,64,0,0,0,0,0,237,181,64,0,0,0,0,0,8,164,64,0,0,0,0,0,189,181,64,0,0,0,0,0,56,163,64,0,0,0,0,0,125,181,64,0,0,0,0,0,200,163,64,0,0,0,0,0,139,181,64,0,0,0,0,0,56,164,64,0,0,0,0,0,21,181,64,0,0,0,0,0,172,166,64,0,0,0,0,0,3,181,64,0,0,0,0,0,88,167,64,0,0,0,0,0,237,180,64,0,0,0,0,0,120,167,64,0,0,0,0,0,21,181,64,0,0,0,0,0,172,166,64,0,0,0,0,0,69,181,64,0,0,0,0,0,8,164,64,0,0,0,0,0,98,181,64,0,0,0,0,0,92,163,64,0,0,0,0,0,21,181,64,0,0,0,0,0,168,163,64,0,0,0,0,0,229,180,64,0,0,0,0,0,216,163,64,0,0,0,0,0,165,179,64,0,0,0,0,0,216,168,64,0,0,0,0,0,37,180,64,0,0,0,0,0,72,166,64,0,0,0,0,0,13,180,64,0,0,0,0,0,216,164,64,0,0,0,0,0,37,181,64,0,0,0,0,0,40,163,64,0,0,0,0,0,101,181,64,0,0,0,0,0,24,162,64,0,0,0,0,0,197,180,64,0,0,0,0,0,104,163,64,0,0,0,0,0,133,180,64,0,0,0,0,0,200,163,64,0,0,0,0,0,93,179,64,0,0,0,0,0,72,166,64,0,0,0,0,0,45,180,64,0,0,0,0,0,200,163,64,0,0,0,0,0,69,180,64,0,0,0,0,0,106,163,64,0,0,0,0,0,198,180,64,0,0,0,0,0,234,162,64,0,0,0,0,0,101,181,64,0,0,0,0,0,72,162,64,0,0,0,0,0,149,181,64,0,0,0,0,0,248,161,64,0,0,0,0,0,197,181,64,0,0,0,0,0,40,161,64,0,0,0,0,0,164,182,64,0,0,0,0,0,76,154,64,0,0,0,0,0,93,183,64,0,0,0,0,0,48,155,64,0,0,0,0,0,99,183,64,0,0,0,0,0,120,155,64,0,0,0,0,0,122,183,64,0,0,0,0,0,0,155,64,0,0,0,0,0,101,183,64,0,0,0,0,0,144,155,64,0,0,0,0,0,99,183,64,0,0,0,0,0,120,155,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,253,179,64,0,0,0,0,0,120,162,64,0,0,0,0,0,141,180,64,0,0,0,0,0,248,160,64,0,0,0,0,0,205,180,64,0,0,0,0,0,40,160,64,0,0,0,0,0,205,181,64,0,0,0,0,0,40,160,64,0,0,0,0,0,245,181,64,0,0,0,0,0,136,160,64,0,0,0,0,0,165,181,64,0,0,0,0,0,184,160,64,0,0,0,0,0,85,181,64,0,0,0,0,0,232,160,64,0,0,0,0,0,253,179,64,0,0,0,0,0,120,162,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,125,178,64,0,0,0,0,0,200,161,64,0,0,0,0,0,133,178,64,0,0,0,0,0,88,161,64,0,0,0,0,0,173,178,64,0,0,0,0,0,40,161,64,0,0,0,0,0,215,178,64,0,0,0,0,0,254,160,64,0,0,0,0,0,211,178,64,0,0,0,0,0,78,161,64,0,0,0,0,0,189,178,64,0,0,0,0,0,200,161,64,0,0,0,0,0,141,178,64,0,0,0,0,0,88,162,64,0,0,0,0,0,141,178,64,0,0,0,0,0,232,162,64,0,0,0,0,0,141,178,64,0,0,0,0,0,86,163,64,0,0,0,0,0,119,178,64,0,0,0,0,0,54,163,64,0,0,0,0,0,99,178,64,0,0,0,0,0,24,163,64,0,0,0,0,0,85,178,64,0,0,0,0,0,184,162,64,0,0,0,0,0,76,178,64,0,0,0,0,0,122,162,64,0,0,0,0,0,96,178,64,0,0,0,0,0,64,162,64,0,0,0,0,0,122,178,64,0,0,0,0,0,244,161,64,0,0,0,0,0,125,178,64,0,0,0,0,0,200,161,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,213,176,64,0,0,0,0,0,110,169,64,0,0,0,0,0,242,176,64,0,0,0,0,0,58,169,64,0,0,0,0,0,21,177,64,0,0,0,0,0,136,169,64,0,0,0,0,0,85,177,64,0,0,0,0,0,24,170,64,0,0,0,0,0,253,177,64,0,0,0,0,0,184,170,64,0,0,0,0,0,141,177,64,0,0,0,0,0,232,171,64,0,0,0,0,0,170,177,64,0,0,0,0,0,236,170,64,0,0,0,0,0,46,177,64,0,0,0,0,0,220,170,64,0,0,0,0,0,224,176,64,0,0,0,0,0,226,170,64,0,0,0,0,0,199,176,64,0,0,0,0,0,232,170,64,0,0,0,0,0,213,176,64,0,0,0,0,0,216,170,64,0,0,0,0,0,244,176,64,0,0,0,0,0,180,170,64,0,0,0,0,0,194,176,64,0,0,0,0,0,148,170,64,0,0,0,0,0,145,176,64,0,0,0,0,0,116,170,64,0,0,0,0,0,157,176,64,0,0,0,0,0,104,170,64,0,0,0,0,0,185,176,64,0,0,0,0,0,76,170,64,0,0,0,0,0,162,176,64,0,0,0,0,0,50,170,64,0,0,0,0,0,85,176,64,0,0,0,0,0,56,170,64,0,0,0,0,0,106,175,64,0,0,0,0,0,152,170,64,0,0,0,0,0,154,175,64,0,0,0,0,0,88,168,64,0,0,0,0,0,29,176,64,0,0,0,0,0,40,167,64,0,0,0,0,0,8,176,64,0,0,0,0,0,166,169,64,0,0,0,0,0,125,176,64,0,0,0,0,0,184,169,64,0,0,0,0,0,168,176,64,0,0,0,0,0,190,169,64,0,0,0,0,0,213,176,64,0,0,0,0,0,110,169,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,162,174,64,0,0,0,0,0,0,173,64,0,0,0,0,0,74,174,64,0,0,0,0,0,136,172,64,0,0,0,0,0,10,175,64,0,0,0,0,0,40,172,64,0,0,0,0,0,154,175,64,0,0,0,0,0,168,173,64,0,0,0,0,0,1,177,64,0,0,0,0,0,248,172,64,0,0,0,0,0,114,175,64,0,0,0,0,0,128,174,64,0,0,0,0,0,234,175,64,0,0,0,0,0,216,173,64,0,0,0,0,0,1,176,64,0,0,0,0,0,184,173,64,0,0,0,0,0,42,175,64,0,0,0,0,0,136,173,64,0,0,0,0,0,250,174,64,0,0,0,0,0,120,173,64,0,0,0,0,0,162,174,64,0,0,0,0,0,0,173,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,75,193,64,0,0,0,0,0,77,179,64,0,0,0,0,128,96,193,64,0,0,0,0,0,46,179,64,0,0,0,0,128,107,193,64,0,0,0,0,0,59,179,64,0,0,0,0,0,140,193,64,0,0,0,0,0,94,179,64,0,0,0,0,0,155,193,64,0,0,0,0,0,138,179,64,0,0,0,0,128,163,193,64,0,0,0,0,0,164,179,64,0,0,0,0,128,162,193,64,0,0,0,0,0,200,179,64,0,0,0,0,128,154,193,64,0,0,0,0,0,209,179,64,0,0,0,0,0,145,193,64,0,0,0,0,0,224,179,64,0,0,0,0,0,141,193,64,0,0,0,0,0,244,179,64,0,0,0,0,0,149,193,64,0,0,0,0,0,6,180,64,0,0,0,0,0,164,193,64,0,0,0,0,0,40,180,64,0,0,0,0,0,166,193,64,0,0,0,0,0,47,180,64,0,0,0,0,128,160,193,64,0,0,0,0,0,55,180,64,0,0,0,0,0,150,193,64,0,0,0,0,0,63,180,64,0,0,0,0,128,159,193,64,0,0,0,0,0,128,180,64,0,0,0,0,128,108,193,64,0,0,0,0,0,152,180,64,0,0,0,0,128,103,193,64,0,0,0,0,0,200,180,64,0,0,0,0,128,68,193,64,0,0,0,0,0,224,180,64,0,0,0,0,0,36,193,64,0,0,0,0,0,181,180,64,0,0,0,0,128,16,193,64,0,0,0,0,0,158,180,64,0,0,0,0,128,4,193,64,0,0,0,0,0,184,180,64,0,0,0,0,128,244,192,64,0,0,0,0,0,160,180,64,0,0,0,0,0,239,192,64,0,0,0,0,0,105,180,64,0,0,0,0,128,226,192,64,0,0,0,0,0,49,180,64,0,0,0,0,128,228,192,64,0,0,0,0,0,24,180,64,0,0,0,0,128,0,193,64,0,0,0,0,0,2,180,64,0,0,0,0,0,248,192,64,0,0,0,0,0,192,179,64,0,0,0,0,0,243,192,64,0,0,0,0,0,183,179,64,0,0,0,0,0,245,192,64,0,0,0,0,0,176,179,64,0,0,0,0,128,252,192,64,0,0,0,0,0,160,179,64,0,0,0,0,128,248,192,64,0,0,0,0,0,167,179,64,0,0,0,0,0,241,192,64,0,0,0,0,0,165,179,64,0,0,0,0,0,245,192,64,0,0,0,0,0,144,179,64,0,0,0,0,128,249,192,64,0,0,0,0,0,118,179,64,0,0,0,0,128,5,193,64,0,0,0,0,0,113,179,64,0,0,0,0,0,18,193,64,0,0,0,0,0,110,179,64,0,0,0,0,128,28,193,64,0,0,0,0,0,128,179,64,0,0,0,0,128,40,193,64,0,0,0,0,0,120,179,64,0,0,0,0,0,46,193,64,0,0,0,0,0,89,179,64,0,0,0,0,128,48,193,64,0,0,0,0,0,77,179,64,0,0,0,0,0,59,193,64,0,0,0,0,0,79,179,64,0,0,0,0,128,75,193,64,0,0,0,0,0,77,179,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,8,193,64,0,0,0,0,0,184,181,64,0,0,0,0,128,12,193,64,0,0,0,0,0,191,181,64,0,0,0,0,128,16,193,64,0,0,0,0,0,184,181,64,0,0,0,0,0,47,193,64,0,0,0,0,0,238,181,64,0,0,0,0,0,67,193,64,0,0,0,0,0,15,182,64,0,0,0,0,128,66,193,64,0,0,0,0,0,48,182,64,0,0,0,0,0,62,193,64,0,0,0,0,0,66,182,64,0,0,0,0,0,59,193,64,0,0,0,0,0,80,182,64,0,0,0,0,128,64,193,64,0,0,0,0,0,88,182,64,0,0,0,0,0,53,193,64,0,0,0,0,0,105,182,64,0,0,0,0,0,47,193,64,0,0,0,0,0,139,182,64,0,0,0,0,128,36,193,64,0,0,0,0,0,200,182,64,0,0,0,0,128,0,193,64,0,0,0,0,0,176,182,64,0,0,0,0,0,11,193,64,0,0,0,0,0,86,182,64,0,0,0,0,128,12,193,64,0,0,0,0,0,32,182,64,0,0,0,0,0,6,193,64,0,0,0,0,0,235,181,64,0,0,0,0,128,1,193,64,0,0,0,0,0,204,181,64,0,0,0,0,128,8,193,64,0,0,0,0,0,184,181,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,181,186,64,0,0,0,0,0,212,178,64,0,0,0,0,0,221,187,64,0,0,0,0,0,124,179,64,0,0,0,0,0,149,186,64,0,0,0,0,0,212,178,64,0,0,0,0,0,77,186,64,0,0,0,0,0,4,179,64,0,0,0,0,0,43,186,64,0,0,0,0,0,27,179,64,0,0,0,0,0,183,185,64,0,0,0,0,0,50,179,64,0,0,0,0,0,59,185,64,0,0,0,0,0,75,179,64,0,0,0,0,0,253,184,64,0,0,0,0,0,108,179,64,0,0,0,0,0,213,183,64,0,0,0,0,0,196,179,64,0,0,0,0,0,149,183,64,0,0,0,0,0,236,179,64,0,0,0,0,0,241,182,64,0,0,0,0,0,129,180,64,0,0,0,0,0,119,182,64,0,0,0,0,0,245,180,64,0,0,0,0,0,101,182,64,0,0,0,0,0,236,180,64,0,0,0,0,0,83,182,64,0,0,0,0,0,227,180,64,0,0,0,0,0,96,182,64,0,0,0,0,0,211,180,64,0,0,0,0,0,133,182,64,0,0,0,0,0,156,180,64,0,0,0,0,0,155,182,64,0,0,0,0,0,105,180,64,0,0,0,0,0,114,182,64,0,0,0,0,0,107,180,64,0,0,0,0,0,66,182,64,0,0,0,0,0,109,180,64,0,0,0,0,0,213,181,64,0,0,0,0,0,196,180,64,0,0,0,0,0,53,181,64,0,0,0,0,0,68,181,64,0,0,0,0,0,29,181,64,0,0,0,0,0,108,181,64,0,0,0,0,0,204,179,64,0,0,0,0,0,55,182,64,0,0,0,0,0,229,180,64,0,0,0,0,0,4,181,64,0,0,0,0,0,149,181,64,0,0,0,0,0,68,180,64,0,0,0,0,0,93,182,64,0,0,0,0,0,212,179,64,0,0,0,0,0,45,183,64,0,0,0,0,0,124,179,64,0,0,0,0,0,117,183,64,0,0,0,0,0,100,179,64,0,0,0,0,0,250,184,64,0,0,0,0,0,226,178,64,0,0,0,0,0,45,185,64,0,0,0,0,0,220,178,64,0,0,0,0,0,214,185,64,0,0,0,0,0,183,178,64,0,0,0,0,0,96,186,64,0,0,0,0,0,162,178,64])
.concat([0,0,0,0,0,181,186,64,0,0,0,0,0,212,178,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,187,64,0,0,0,0,0,60,179,64,0,0,0,0,0,91,188,64,0,0,0,0,0,143,179,64,0,0,0,0,0,141,188,64,0,0,0,0,0,200,179,64,0,0,0,0,0,17,188,64,0,0,0,0,0,142,179,64,0,0,0,0,0,121,187,64,0,0,0,0,0,74,179,64,0,0,0,0,0,255,186,64,0,0,0,0,0,50,179,64,0,0,0,0,0,117,186,64,0,0,0,0,0,23,179,64,0,0,0,0,0,122,185,64,0,0,0,0,0,54,179,64,0,0,0,0,0,104,184,64,0,0,0,0,0,87,179,64,0,0,0,0,0,207,183,64,0,0,0,0,0,166,179,64,0,0,0,0,0,58,183,64,0,0,0,0,0,249,179,64,0,0,0,0,0,203,182,64,0,0,0,0,0,54,180,64,0,0,0,0,0,174,182,64,0,0,0,0,0,53,180,64,0,0,0,0,0,123,182,64,0,0,0,0,0,51,180,64,0,0,0,0,0,177,181,64,0,0,0,0,0,245,180,64,0,0,0,0,0,205,181,64,0,0,0,0,0,240,179,64,0,0,0,0,0,119,182,64,0,0,0,0,0,17,180,64,0,0,0,0,0,27,183,64,0,0,0,0,0,190,179,64,0,0,0,0,0,82,183,64,0,0,0,0,0,150,179,64,0,0,0,0,0,15,184,64,0,0,0,0,0,104,179,64,0,0,0,0,0,239,184,64,0,0,0,0,0,254,178,64,0,0,0,0,0,230,185,64,0,0,0,0,0,250,178,64,0,0,0,0,0,178,186,64,0,0,0,0,0,254,178,64,0,0,0,0,0,187,186,64,0,0,0,0,0,234,178,64,0,0,0,0,0,136,187,64,0,0,0,0,0,60,179,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,29,187,64,0,0,0,0,0,140,180,64,0,0,0,0,0,34,187,64,0,0,0,0,0,107,180,64,0,0,0,0,0,96,187,64,0,0,0,0,0,100,180,64,0,0,0,0,0,152,187,64,0,0,0,0,0,93,180,64,0,0,0,0,0,181,187,64,0,0,0,0,0,108,180,64,0,0,0,0,0,238,187,64,0,0,0,0,0,136,180,64,0,0,0,0,0,141,187,64,0,0,0,0,0,164,180,64,0,0,0,0,0,20,186,64,0,0,0,0,0,89,181,64,0,0,0,0,0,176,184,64,0,0,0,0,0,6,182,64,0,0,0,0,0,101,184,64,0,0,0,0,0,20,182,64,0,0,0,0,0,31,184,64,0,0,0,0,0,33,182,64,0,0,0,0,0,117,183,64,0,0,0,0,0,120,182,64,0,0,0,0,0,197,182,64,0,0,0,0,0,210,182,64,0,0,0,0,0,157,182,64,0,0,0,0,0,220,182,64,0,0,0,0,0,61,182,64,0,0,0,0,0,244,182,64,0,0,0,0,0,101,181,64,0,0,0,0,0,244,182,64,0,0,0,0,0,53,180,64,0,0,0,0,0,196,182,64,0,0,0,0,0,133,181,64,0,0,0,0,0,164,182,64,0,0,0,0,0,237,182,64,0,0,0,0,0,124,182,64,0,0,0,0,0,61,183,64,0,0,0,0,0,20,182,64,0,0,0,0,0,77,184,64,0,0,0,0,0,92,181,64,0,0,0,0,0,133,184,64,0,0,0,0,0,84,181,64,0,0,0,0,0,227,185,64,0,0,0,0,0,255,180,64,0,0,0,0,0,24,187,64,0,0,0,0,0,171,180,64,0,0,0,0,0,29,187,64,0,0,0,0,0,140,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7,187,64,0,0,0,0,0,113,180,64,0,0,0,0,0,112,188,64,0,0,0,0,0,254,179,64,0,0,0,0,0,171,188,64,0,0,0,0,0,40,180,64,0,0,0,0,0,197,188,64,0,0,0,0,0,59,180,64,0,0,0,0,0,98,188,64,0,0,0,0,0,71,180,64,0,0,0,0,0,196,187,64,0,0,0,0,0,90,180,64,0,0,0,0,0,94,187,64,0,0,0,0,0,137,180,64,0,0,0,0,0,235,185,64,0,0,0,0,0,39,181,64,0,0,0,0,0,93,184,64,0,0,0,0,0,197,181,64,0,0,0,0,0,115,183,64,0,0,0,0,0,44,182,64,0,0,0,0,0,66,183,64,0,0,0,0,0,56,182,64,0,0,0,0,0,235,182,64,0,0,0,0,0,96,182,64,0,0,0,0,0,64,182,64,0,0,0,0,0,79,182,64,0,0,0,0,0,236,182,64,0,0,0,0,0,63,182,64,0,0,0,0,0,156,183,64,0,0,0,0,0,251,181,64,0,0,0,0,0,197,183,64,0,0,0,0,0,197,181,64,0,0,0,0,0,80,184,64,0,0,0,0,0,103,181,64,0,0,0,0,0,109,184,64,0,0,0,0,0,99,181,64,0,0,0,0,0,18,185,64,0,0,0,0,0,55,181,64,0,0,0,0,0,162,185,64,0,0,0,0,0,12,181,64,0,0,0,0,0,165,185,64,0,0,0,0,0,253,180,64,0,0,0,0,0,169,185,64,0,0,0,0,0,225,180,64,0,0,0,0,0,7,187,64,0,0,0,0,0,113,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,157,182,64,0,0,0,0,0,164,182,64,0,0,0,0,0,133,182,64,0,0,0,0,0,196,182,64,0,0,0,0,0,85,182,64,0,0,0,0,0,180,182,64,0,0,0,0,0,77,182,64,0,0,0,0,0,140,182,64,0,0,0,0,0,181,182,64,0,0,0,0,0,132,182,64,0,0,0,0,0,157,182,64,0,0,0,0,0,164,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,189,181,64,0,0,0,0,0,172,182,64,0,0,0,0,0,37,182,64,0,0,0,0,0,164,182,64,0,0,0,0,0,13,182,64,0,0,0,0,0,196,182,64,0,0,0,0,0,245,181,64,0,0,0,0,0,228,182,64,0,0,0,0,0,197,181,64,0,0,0,0,0,212,182,64,0,0,0,0,0,189,181,64,0,0,0,0,0,172,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,61,181,64,0,0,0,0,0,228,182,64,0,0,0,0,0,37,181,64,0,0,0,0,0,4,183,64,0,0,0,0,0,245,180,64,0,0,0,0,0,244,182,64,0,0,0,0,0,237,180,64,0,0,0,0,0,204,182,64,0,0,0,0,0,85,181,64,0,0,0,0,0,196,182,64,0,0,0,0,0,61,181,64,0,0,0,0,0,228,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,165,180,64,0,0,0,0,0,244,182,64,0,0,0,0,0,141,180,64,0,0,0,0,0,20,183,64,0,0,0,0,0,93,180,64,0,0,0,0,0,4,183,64,0,0,0,0,0,85,180,64,0,0,0,0,0,220,182,64,0,0,0,0,0,189,180,64,0,0,0,0,0,212,182,64,0,0,0,0,0,165,180,64,0,0,0,0,0,244,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,149,183,64,0,0,0,0,0,228,179,64,0,0,0,0,0,125,183,64,0,0,0,0,0,4,180,64,0,0,0,0,0,61,183,64,0,0,0,0,0,252,179,64,0,0,0,0,0,85,183,64,0,0,0,0,0,196,179,64,0,0,0,0,0,173,183,64,0,0,0,0,0,196,179,64,0,0,0,0,0,149,183,64,0,0,0,0,0,228,179,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,221,182,64,0,0,0,0,0,76,180,64,0,0,0,0,0,197,182,64,0,0,0,0,0,108,180,64,0,0,0,0,0,149,182,64,0,0,0,0,0,92,180,64,0,0,0,0,0,141,182,64,0,0,0,0,0,52,180,64,0,0,0,0,0,15,183,64,0,0,0,0,0,9,180,64,0,0,0,0,0,221,182,64,0,0,0,0,0,76,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,173,181,64,0,0,0,0,0,148,180,64,0,0,0,0,0,21,182,64,0,0,0,0,0,140,180,64,0,0,0,0,0,253,181,64,0,0,0,0,0,172,180,64,0,0,0,0,0,229,181,64,0,0,0,0,0,204,180,64,0,0,0,0,0,181,181,64,0,0,0,0,0,188,180,64,0,0,0,0,0,173,181,64,0,0,0,0,0,148,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,101,181,64,0,0,0,0,0,36,181,64,0,0,0,0,0,77,181,64,0,0,0,0,0,68,181,64,0,0,0,0,0,29,181,64,0,0,0,0,0,52,181,64,0,0,0,0,0,21,181,64,0,0,0,0,0,12,181,64,0,0,0,0,0,125,181,64,0,0,0,0,0,4,181,64,0,0,0,0,0,101,181,64,0,0,0,0,0,36,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,221,180,64,0,0,0,0,0,132,181,64,0,0,0,0,0,197,180,64,0,0,0,0,0,164,181,64,0,0,0,0,0,149,180,64,0,0,0,0,0,148,181,64,0,0,0,0,0,141,180,64,0,0,0,0,0,108,181,64,0,0,0,0,0,245,180,64,0,0,0,0,0,100,181,64,0,0,0,0,0,221,180,64,0,0,0,0,0,132,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,184,64,0,0,0,0,0,12,182,64,0,0,0,0,0,229,183,64,0,0,0,0,0,55,182,64,0,0,0,0,0,165,183,64,0,0,0,0,0,33,182,64,0,0,0,0,0,155,183,64,0,0,0,0,0,236,181,64,0,0,0,0,0,37,184,64,0,0,0,0,0,225,181,64,0,0,0,0,0,5,184,64,0,0,0,0,0,12,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,213,184,64,0,0,0,0,0,172,181,64,0,0,0,0,0,181,184,64,0,0,0,0,0,215,181,64,0,0,0,0,0,117,184,64,0,0,0,0,0,193,181,64,0,0,0,0,0,107,184,64,0,0,0,0,0,140,181,64,0,0,0,0,0,245,184,64,0,0,0,0,0,129,181,64,0,0,0,0,0,213,184,64,0,0,0,0,0,172,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,67,185,64,0,0,0,0,0,52,181,64,0,0,0,0,0,205,185,64,0,0,0,0,0,41,181,64,0,0,0,0,0,173,185,64,0,0,0,0,0,84,181,64,0,0,0,0,0,141,185,64,0,0,0,0,0,126,181,64,0,0,0,0,0,77,185,64,0,0,0,0,0,105,181,64,0,0,0,0,0,67,185,64,0,0,0,0,0,52,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,125,186,64,0,0,0,0,0,244,180,64,0,0,0,0,0,93,186,64,0,0,0,0,0,31,181,64,0,0,0,0,0,29,186,64,0,0,0,0,0,9,181,64,0,0,0,0,0,19,186,64,0,0,0,0,0,212,180,64,0,0,0,0,0,157,186,64,0,0,0,0,0,201,180,64,0,0,0,0,0,125,186,64,0,0,0,0,0,244,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,85,184,64,0,0,0,0,0,140,179,64,0,0,0,0,0,53,184,64,0,0,0,0,0,183,179,64,0,0,0,0,0,229,183,64,0,0,0,0,0,177,179,64,0,0,0,0,0,235,183,64,0,0,0,0,0,108,179,64,0,0,0,0,0,117,184,64,0,0,0,0,0,97,179,64,0,0,0,0,0,85,184,64,0,0,0,0,0,140,179,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,29,185,64,0,0,0,0,0,76,179,64,0,0,0,0,0,253,184,64,0,0,0,0,0,118,179,64,0,0,0,0,0,165,184,64,0,0,0,0,0,113,179,64,0,0,0,0,0,179,184,64,0,0,0,0,0,44,179,64,0,0,0,0,0,61,185,64,0,0,0,0,0,33,179,64,0,0,0,0,0,29,185,64,0,0,0,0,0,76,179,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,61,183,64,0,0,0,0,0,100,182,64,0,0,0,0,0,37,183,64,0,0,0,0,0,132,182,64,0,0,0,0,0,245,182,64,0,0,0,0,0,116,182,64,0,0,0,0,0,237,182,64,0,0,0,0,0,76,182,64,0,0,0,0,0,85,183,64,0,0,0,0,0,68,182,64,0,0,0,0,0,61,183,64,0,0,0,0,0,100,182,64,83,83,83,83,83,83,227,63,148,147,147,147,147,147,195,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,53,177,64,0,0,0,0,0,24,173,64,0,0,0,0,0,221,176,64,0,0,0,0,0,120,174,64,0,0,0,0,0,213,176,64,0,0,0,0,0,248,174,64,0,0,0,0,0,229,176,64,0,0,0,0,0,152,173,64,0,0,0,0,0,253,176,64,0,0,0,0,0,72,173,64,0,0,0,0,0,21,177,64,0,0,0,0,0,248,172,64,0,0,0,0,0,53,177,64,0,0,0,0,0,24,173,64,83,83,83,83,83,83,227,63,148,147,147,147,147,147,195,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,250,174,64,0,0,0,0,0,248,175,64,0,0,0,0,0,10,175,64,0,0,0,0,0,200,175,64,0,0,0,0,0,138,175,64,0,0,0,0,0,72,175,64,0,0,0,0,0,16,175,64,0,0,0,0,0,183,176,64,0,0,0,0,0,26,175,64,0,0,0,0,0,247,176,64,0,0,0,0,0,234,174,64,0,0,0,0,0,20,176,64,0,0,0,0,0,250,174,64,0,0,0,0,0,248,175,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,97,177,64,0,0,0,0,0,32,164,64,0,0,0,0,0,101,177,64,0,0,0,0,0,160,163,64,0,0,0,0,0,109,178,64,0,0,0,0,0,8,166,64,0,0,0,0,0,93,178,64,0,0,0,0,0,80,167,64,0,0,0,0,0,81,178,64,0,0,0,0,0,32,166,64,0,0,0,0,0,53,177,64,0,0,0,0,0,40,164,64,0,0,0,0,0,97,177,64,0,0,0,0,0,32,164,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,108,178,64,0,0,0,0,0,16,161,64,0,0,0,0,0,106,178,64,0,0,0,0,0,98,161,64,0,0,0,0,0,54,178,64,0,0,0,0,0,236,161,64,0,0,0,0,0,60,178,64,0,0,0,0,0,2,162,64,0,0,0,0,0,48,178,64,0,0,0,0,0,56,162,64,0,0,0,0,0,30,178,64,0,0,0,0,0,126,162,64,0,0,0,0,0,21,178,64,0,0,0,0,0,132,163,64,0,0,0,0,0,15,178,64,0,0,0,0,0,142,163,64,0,0,0,0,0,71,178,64,0,0,0,0,0,10,165,64,0,0,0,0,0,75,178,64,0,0,0,0,0,72,165,64,0,0,0,0,0,67,178,64,0,0,0,0,0,100,165,64,0,0,0,0,0,90,178,64,0,0,0,0,0,166,165,64,0,0,0,0,0,92,178,64,0,0,0,0,0,12,166,64,0,0,0,0,0,97,178,64,0,0,0,0,0,156,166,64,0,0,0,0,0,105,178,64,0,0,0,0,0,206,166,64,0,0,0,0,0,134,178,64,0,0,0,0,0,46,167,64,0,0,0,0,0,84,178,64,0,0,0,0,0,10,167,64,0,0,0,0,0,78,178,64,0,0,0,0,0,220,166,64,0,0,0,0,0,57,178,64,0,0,0,0,0,30,166,64,0,0,0,0,0,40,178,64,0,0,0,0,0,194,165,64,0,0,0,0,0,40,178,64,0,0,0,0,0,150,165,64,0,0,0,0,0,27,178,64,0,0,0,0,0,102,165,64,0,0,0,0,0,0,178,64,0,0,0,0,0,78,165,64,0,0,0,0,0,213,177,64,0,0,0,0,0,240,164,64,0,0,0,0,0,232,177,64,0,0,0,0,0,204,164,64,0,0,0,0,0,228,177,64,0,0,0,0,0,196,164,64,0,0,0,0,0,185,177,64,0,0,0,0,0,94,164,64,0,0,0,0,0,190,177,64,0,0,0,0,0,54,164,64,0,0,0,0,0,197,177,64,0,0,0,0,0,242,163,64,0,0,0,0,0,181,177,64,0,0,0,0,0,210,163,64,0,0,0,0,0,168,177,64,0,0,0,0,0,154,163,64,0,0,0,0,0,160,177,64,0,0,0,0,0,144,163,64,0,0,0,0,0,174,177,64,0,0,0,0,0,130,163,64,0,0,0,0,0,192,177,64,0,0,0,0,0,116,163,64,0,0,0,0,0,190,177,64,0,0,0,0,0,102,163,64,0,0,0,0,0,183,177,64,0,0,0,0,0,2,163,64,0,0,0,0,0,202,177,64,0,0,0,0,0,154,162,64,0,0,0,0,0,215,177,64,0,0,0,0,0,122,162,64,0,0,0,0,0,217,177,64,0,0,0,0,0,28,162,64,0,0,0,0,0,219,177,64,0,0,0,0,0,198,161,64,0,0,0,0,0,237,177,64,0,0,0,0,0,166,161,64,0,0,0,0,0,0,178,64,0,0,0,0,0,116,161,64,0,0,0,0,0,25,178,64,0,0,0,0,0,66,161,64,0,0,0,0,0,56,178,64,0,0,0,0,0,24,161,64,0,0,0,0,0,58,178,64,0,0,0,0,0,236,160,64,0,0,0,0,0,70,178,64,0,0,0,0,0,240,160,64,0,0,0,0,0,109,178,64,0,0,0,0,0,252,160,64,0,0,0,0,0,108,178,64,0,0,0,0,0,16,161,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,79,177,64,0,0,0,0,0,216,163,64,0,0,0,0,0,107,177,64,0,0,0,0,0,244,163,64,0,0,0,0,0,109,177,64,0,0,0,0,0,24,164,64,0,0,0,0,0,117,177,64,0,0,0,0,0,40,165,64,0,0,0,0,0,165,177,64,0,0,0,0,0,104,165,64,0,0,0,0,0,187,177,64,0,0,0,0,0,138,165,64,0,0,0,0,0,125,177,64,0,0,0,0,0,88,165,64,0,0,0,0,0,61,177,64,0,0,0,0,0,40,165,64,0,0,0,0,0,85,177,64,0,0,0,0,0,8,165,64,0,0,0,0,0,29,177,64,0,0,0,0,0,24,165,64,0,0,0,0,0,77,177,64,0,0,0,0,0,104,165,64,0,0,0,0,0,183,177,64,0,0,0,0,0,24,166,64,0,0,0,0,0,165,177,64,0,0,0,0,0,24,166,64,0,0,0,0,0,134,177,64,0,0,0,0,0,24,166,64,0,0,0,0,0,61,177,64,0,0,0,0,0,186,165,64,0,0,0,0,0,237,176,64,0,0,0,0,0,84,165,64,0,0,0,0,0,237,176,64,0,0,0,0,0,8,165,64,0,0,0,0,0,237,176,64,0,0,0,0,0,152,164,64,0,0,0,0,0,217,176,64,0,0,0,0,0,244,163,64,0,0,0,0,0,239,176,64,0,0,0,0,0,212,163,64,0,0,0,0,0,79,177,64,0,0,0,0,0,216,163,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,93,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,193,177,64,0,0,0,0,0,46,167,64,0,0,0,0,0,186,177,64,0,0,0,0,0,44,167,64,0,0,0,0,0,110,177,64,0,0,0,0,0,28,167,64,0,0,0,0,0,72,175,64,0,0,0,0,0,254,166,64,0,0,0,0,0,202,176,64,0,0,0,0,0,166,166,64,0,0,0,0,0,92,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,93,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,94,177,64,0,0,0,0,0,252,166,64,0,0,0,0,0,210,177,64,0,0,0,0,0,46,167,64,0,0,0,0,0,210,177,64,0,0,0,0,0,54,167,64,0,0,0,0,0,208,177,64,0,0,0,0,0,56,167,64,0,0,0,0,0,204,177,64,0,0,0,0,0,56,167,64,0,0,0,0,0,185,177,64,0,0,0,0,0,54,167,64,0,0,0,0,0,109,177,64,0,0,0,0,0,38,167,64,0,0,0,0,0,18,175,64,0,0,0,0,0,6,167,64,0,0,0,0,0,132,174,64,0,0,0,0,0,30,167,64,0,0,0,0,0,128,174,64,0,0,0,0,0,28,167,64,0,0,0,0,0,126,174,64,0,0,0,0,0,26,167,64,0,0,0,0,0,126,174,64,0,0,0,0,0,22,167,64,0,0,0,0,0,130,174,64,0,0,0,0,0,20,167,64,0,0,0,0,0,18,175,64,0,0,0,0,0,252,166,64,0,0,0,0,0,197,176,64,0,0,0,0,0,150,166,64,0,0,0,0,0,94,177,64,0,0,0,0,0,252,166,64,0,0,0,0,0,93,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,92,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,202,176,64,0,0,0,0,0,166,166,64,0,0,0,0,0,72,175,64,0,0,0,0,0,254,166,64,0,0,0,0,0,110,177,64,0,0,0,0,0,28,167,64,0,0,0,0,0,186,177,64,0,0,0,0,0,44,167,64,0,0,0,0,0,193,177,64,0,0,0,0,0,46,167,64,0,0,0,0,0,93,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,2,176,64,0,0,0,0,0,168,166,64,0,0,0,0,0,5,177,64,0,0,0,0,0,148,166,64,0,0,0,0,0,134,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,135,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,233,177,64,0,0,0,0,0,60,167,64,0,0,0,0,0,226,177,64,0,0,0,0,0,58,167,64,0,0,0,0,0,151,177,64,0,0,0,0,0,28,167,64,0,0,0,0,0,164,176,64,0,0,0,0,0,182,166,64,0,0,0,0,0,2,176,64,0,0,0,0,0,168,166,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,136,177,64,0,0,0,0,0,250,166,64,0,0,0,0,0,246,177,64,0,0,0,0,0,54,167,64,0,0,0,0,0,250,177,64,0,0,0,0,0,64,167,64,0,0,0,0,0,250,177,64,0,0,0,0,0,72,167,64,0,0,0,0,0,248,177,64,0,0,0,0,0,74,167,64,0,0,0,0,0,243,177,64,0,0,0,0,0,74,167,64,0,0,0,0,0,225,177,64,0,0,0,0,0,68,167,64,0,0,0,0,0,150,177,64,0,0,0,0,0,38,167,64,0,0,0,0,0,100,176,64,0,0,0,0,0,166,166,64,0,0,0,0,0,100,175,64,0,0,0,0,0,178,166,64,0,0,0,0,0,104,175,64,0,0,0,0,0,176,166,64,0,0,0,0,0,106,175,64,0,0,0,0,0,172,166,64,0,0,0,0,0,104,175,64,0,0,0,0,0,168,166,64,0,0,0,0,0,102,175,64,0,0,0,0,0,168,166,64,0,0,0,0,0,243,176,64,0,0,0,0,0,120,166,64,0,0,0,0,0,136,177,64,0,0,0,0,0,250,166,64,0,0,0,0,0,2,176,64,0,0,0,0,0,168,166,64,0,0,0,0,0,164,176,64,0,0,0,0,0,182,166,64,0,0,0,0,0,151,177,64,0,0,0,0,0,28,167,64,0,0,0,0,0,226,177,64,0,0,0,0,0,58,167,64,0,0,0,0,0,233,177,64,0,0,0,0,0,60,167,64,0,0,0,0,0,135,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,134,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,5,177,64,0,0,0,0,0,148,166,64,0,0,0,0,0,2,176,64,0,0,0,0,0,168,166,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,170,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,170,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,12,178,64,0,0,0,0,0,78,167,64,0,0,0,0,0,3,178,64,0,0,0,0,0,74,167,64,0,0,0,0,0,185,177,64,0,0,0,0,0,34,167,64,0,0,0,0,0,203,176,64,0,0,0,0,0,152,166,64,0,0,0,0,0,42,176,64,0,0,0,0,0,116,166,64,0,0,0,0,0,44,177,64,0,0,0,0,0,132,166,64,0,0,0,0,0,170,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,178,175,64,0,0,0,0,0,104,166,64,0,0,0,0,0,27,177,64,0,0,0,0,0,104,166,64,0,0,0,0,0,172,177,64,0,0,0,0,0,252,166,64,0,0,0,0,0,23,178,64,0,0,0,0,0,74,167,64,0,0,0,0,0,27,178,64,0,0,0,0,0,84,167,64,0,0,0,0,0,26,178,64,0,0,0,0,0,92,167,64,0,0,0,0,0,24,178,64,0,0,0,0,0,94,167,64,0,0,0,0,0,19,178,64,0,0,0,0,0,92,167,64,0,0,0,0,0,1,178,64,0,0,0,0,0,84,167,64,0,0,0,0,0,184,177,64,0,0,0,0,0,44,167,64,0,0,0,0,0,138,176,64,0,0,0,0,0,126,166,64,0,0,0,0,0,178,175,64,0,0,0,0,0,114,166,64,0,0,0,0,0,40,175,64,0,0,0,0,0,114,166,64,0,0,0,0,0,36,175,64,0,0,0,0,0,112,166,64,0,0,0,0,0,36,175,64,0,0,0,0,0,108,166,64,0,0,0,0,0,36,175,64,0,0,0,0,0,104,166,64,0,0,0,0,0,40,175,64,0,0,0,0,0,104,166,64,0,0,0,0,0,178,175,64,0,0,0,0,0,104,166,64,0,0,0,0,0,170,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,44,177,64,0,0,0,0,0,132,166,64,0,0,0,0,0,42,176,64,0,0,0,0,0,116,166,64,0,0,0,0,0,203,176,64,0,0,0,0,0,152,166,64,0,0,0,0,0,185,177,64,0,0,0,0,0,34,167,64,0,0,0,0,0,3,178,64,0,0,0,0,0,74,167,64,0,0,0,0,0,12,178,64,0,0,0,0,0,78,167,64,0,0,0,0,0,170,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,170,177,64,0,0,0,0,0,4,167,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,195,177,64,0,0,0,0,0,16,167,64,0,0,0,0,0,17,178,64,0,0,0,0,0,88,167,64,0,0,0,0,0,208,177,64,0,0,0,0,0,40,167,64,0,0,0,0,0,9,177,64,0,0,0,0,0,142,166,64,0,0,0,0,0,125,176,64,0,0,0,0,0,82,166,64,0,0,0,0,0,91,177,64,0,0,0,0,0,140,166,64,0,0,0,0,0,195,177,64,0,0,0,0,0,14,167,64,0,0,0,0,0,195,177,64,0,0,0,0,0,16,167,64,0,0,0,0,0,48,176,64,0,0,0,0,0,62,166,64,0,0,0,0,0,45,176,64,0,0,0,0,0,60,166,64,0,0,0,0,0,48,176,64,0,0,0,0,0,60,166,64,0,0,0,0,0,48,176,64,0,0,0,0,0,62,166,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,195,177,64,0,0,0,0,0,16,167,64,0,0,0,0,0,195,177,64,0,0,0,0,0,14,167,64,0,0,0,0,0,91,177,64,0,0,0,0,0,140,166,64,0,0,0,0,0,125,176,64,0,0,0,0,0,82,166,64,0,0,0,0,0,9,177,64,0,0,0,0,0,142,166,64,0,0,0,0,0,208,177,64,0,0,0,0,0,40,167,64,0,0,0,0,0,17,178,64,0,0,0,0,0,88,167,64,0,0,0,0,0,195,177,64,0,0,0,0,0,16,167,64,0,0,0,0,0,48,176,64,0,0,0,0,0,60,166,64,0,0,0,0,0,47,176,64,0,0,0,0,0,58,166,64,0,0,0,0,0,46,176,64,0,0,0,0,0,56,166,64,0,0,0,0,0,75,177,64,0,0,0,0,0,108,166,64,0,0,0,0,0,198,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,197,177,64,0,0,0,0,0,6,167,64,0,0,0,0,0,35,178,64,0,0,0,0,0,90,167,64,0,0,0,0,0,38,178,64,0,0,0,0,0,100,167,64,0,0,0,0,0,37,178,64,0,0,0,0,0,108,167,64,0,0,0,0,0,35,178,64,0,0,0,0,0,108,167,64,0,0,0,0,0,31,178,64,0,0,0,0,0,108,167,64,0,0,0,0,0,15,178,64,0,0,0,0,0,98,167,64,0,0,0,0,0,206,177,64,0,0,0,0,0,50,167,64,0,0,0,0,0,203,176,64,0,0,0,0,0,106,166,64,0,0,0,0,0,45,176,64,0,0,0,0,0,66,166,64,0,0,0,0,0,47,176,64,0,0,0,0,0,64,166,64,0,0,0,0,0,48,176,64,0,0,0,0,0,62,166,64,0,0,0,0,0,48,176,64,0,0,0,0,0,60,166,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,186,186,64,0,0,0,0,0,154,168,64,0,0,0,0,0,189,186,64,0,0,0,0,0,114,168,64,0,0,0,0,0,223,187,64,0,0,0,0,0,110,167,64,0,0,0,0,0,229,188,64,0,0,0,0,0,130,166,64,0,0,0,0,0,41,189,64,0,0,0,0,0,108,166,64,0,0,0,0,0,222,186,64,0,0,0,0,0,110,168,64,0,0,0,0,0,197,186,64,0,0,0,0,0,170,168,64,0,0,0,0,0,186,186,64,0,0,0,0,0,178,168,64,0,0,0,0,0,186,186,64,0,0,0,0,0,154,168,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,186,186,64,0,0,0,0,0,154,168,64,0,0,0,0,0,186,186,64,0,0,0,0,0,178,168,64,0,0,0,0,0,197,186,64,0,0,0,0,0,170,168,64,0,0,0,0,0,222,186,64,0,0,0,0,0,110,168,64,0,0,0,0,0,41,189,64,0,0,0,0,0,108,166,64,0,0,0,0,0,229,188,64,0,0,0,0,0,130,166,64,0,0,0,0,0,223,187,64,0,0,0,0,0,110,167,64,0,0,0,0,0,189,186,64,0,0,0,0,0,114,168,64,0,0,0,0,0,186,186,64,0,0,0,0,0,154,168,64,0,0,0,0,0,56,189,64,0,0,0,0,0,96,166,64,0,0,0,0,0,58,189,64,0,0,0,0,0,96,166,64,0,0,0,0,0,59,189,64,0,0,0,0,0,100,166,64,0,0,0,0,0,58,189,64,0,0,0,0,0,102,166,64,0,0,0,0,0,57,189,64,0,0,0,0,0,106,166,64,0,0,0,0,0,221,186,64,0,0,0,0,0,122,168,64,0,0,0,0,0,200,186,64,0,0,0,0,0,178,168,64,0,0,0,0,0,188,186,64,0,0,0,0,0,194,168,64,0,0,0,0,0,184,186,64,0,0,0,0,0,186,168,64,0,0,0,0,0,178,186,64,0,0,0,0,0,180,168,64,0,0,0,0,0,181,186,64,0,0,0,0,0,152,168,64,0,0,0,0,0,183,186,64,0,0,0,0,0,106,168,64,0,0,0,0,0,221,187,64,0,0,0,0,0,100,167,64,0,0,0,0,0,5,189,64,0,0,0,0,0,90,166,64,0,0,0,0,0,55,189,64,0,0,0,0,0,96,166,64,0,0,0,0,0,56,189,64,0,0,0,0,0,96,166,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,118,186,64,0,0,0,0,0,182,168,64,0,0,0,0,0,120,186,64,0,0,0,0,0,142,168,64,0,0,0,0,0,141,187,64,0,0,0,0,0,90,167,64,0,0,0,0,0,141,188,64,0,0,0,0,0,68,166,64,0,0,0,0,0,207,188,64,0,0,0,0,0,38,166,64,0,0,0,0,0,147,186,64,0,0,0,0,0,138,168,64,0,0,0,0,0,128,186,64,0,0,0,0,0,198,168,64,0,0,0,0,0,119,186,64,0,0,0,0,0,206,168,64,0,0,0,0,0,116,186,64,0,0,0,0,0,200,168,64,0,0,0,0,0,118,186,64,0,0,0,0,0,182,168,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,118,186,64,0,0,0,0,0,182,168,64,0,0,0,0,0,116,186,64,0,0,0,0,0,200,168,64,0,0,0,0,0,119,186,64,0,0,0,0,0,206,168,64,0,0,0,0,0,128,186,64,0,0,0,0,0,198,168,64,0,0,0,0,0,147,186,64,0,0,0,0,0,138,168,64,0,0,0,0,0,207,188,64,0,0,0,0,0,38,166,64,0,0,0,0,0,141,188,64,0,0,0,0,0,68,166,64,0,0,0,0,0,141,187,64,0,0,0,0,0,90,167,64,0,0,0,0,0,120,186,64,0,0,0,0,0,142,168,64,0,0,0,0,0,118,186,64,0,0,0,0,0,182,168,64,0,0,0,0,0,219,188,64,0,0,0,0,0,26,166,64,0,0,0,0,0,221,188,64,0,0,0,0,0,26,166,64,0,0,0,0,0,222,188,64,0,0,0,0,0,30,166,64,0,0,0,0,0,222,188,64,0,0,0,0,0,32,166,64,0,0,0,0,0,220,188,64,0,0,0,0,0,34,166,64,0,0,0,0,0,219,188,64,0,0,0,0,0,36,166,64,0,0,0,0,0,151,186,64,0,0,0,0,0,144,168,64,0,0,0,0,0,132,186,64,0,0,0,0,0,204,168,64,0,0,0,0,0,116,186,64,0,0,0,0,0,214,168,64,0,0,0,0,0,111,186,64,0,0,0,0,0,208,168,64,0,0,0,0,0,113,186,64,0,0,0,0,0,180,168,64,0,0,0,0,0,117,186,64,0,0,0,0,0,134,168,64,0,0,0,0,0,139,187,64,0,0,0,0,0,82,167,64,0,0,0,0,0,170,188,64,0,0,0,0,0,24,166,64,0,0,0,0,0,219,188,64,0,0,0,0,0,26,166,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,51,186,64,0,0,0,0,0,238,168,64,0,0,0,0,0,51,186,64,0,0,0,0,0,184,168,64,0,0,0,0,0,17,187,64,0,0,0,0,0,136,167,64,0,0,0,0,0,236,187,64,0,0,0,0,0,92,166,64,0,0,0,0,0,105,188,64,0,0,0,0,0,26,166,64,0,0,0,0,0,16,187,64,0,0,0,0,0,86,167,64,0,0,0,0,0,62,186,64,0,0,0,0,0,252,168,64,0,0,0,0,0,63,186,64,0,0,0,0,0,252,168,64,0,0,0,0,0,56,186,64,0,0,0,0,0,8,169,64,0,0,0,0,0,53,186,64,0,0,0,0,0,6,169,64,0,0,0,0,0,51,186,64,0,0,0,0,0,238,168,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,51,186,64,0,0,0,0,0,238,168,64,0,0,0,0,0,53,186,64,0,0,0,0,0,6,169,64,0,0,0,0,0,56,186,64,0,0,0,0,0,8,169,64,0,0,0,0,0,63,186,64,0,0,0,0,0,252,168,64,0,0,0,0,0,62,186,64,0,0,0,0,0,252,168,64,0,0,0,0,0,16,187,64,0,0,0,0,0,86,167,64,0,0,0,0,0,105,188,64,0,0,0,0,0,26,166,64,0,0,0,0,0,236,187,64,0,0,0,0,0,92,166,64,0,0,0,0,0,17,187,64,0,0,0,0,0,136,167,64,0,0,0,0,0,51,186,64,0,0,0,0,0,184,168,64,0,0,0,0,0,51,186,64,0,0,0,0,0,238,168,64,0,0,0,0,0,130,188,64,0,0,0,0,0,4,166,64,0,0,0,0,0,132,188,64,0,0,0,0,0,4,166,64,0,0,0,0,0,133,188,64,0,0,0,0,0,8,166,64,0,0,0,0,0,133,188,64,0,0,0,0,0,10,166,64,0,0,0,0,0,131,188,64,0,0,0,0,0,14,166,64,0,0,0,0,0,27,187,64,0,0,0,0,0,80,167,64,0,0,0,0,0,66,186,64,0,0,0,0,0,4,169,64,0,0,0,0,0,56,186,64,0,0,0,0,0,22,169,64,0,0,0,0,0,51,186,64,0,0,0,0,0,16,169,64,0,0,0,0,0,46,186,64,0,0,0,0,0,10,169,64,0,0,0,0,0,46,186,64,0,0,0,0,0,238,168,64,0,0,0,0,0,45,186,64,0,0,0,0,0,180,168,64,0,0,0,0,0,14,187,64,0,0,0,0,0,128,167,64,0,0,0,0,0,1,188,64,0,0,0,0,0,52,166,64,0,0,0,0,0,129,188,64,0,0,0,0,0,4,166,64,0,0,0,0,0,130,188,64,0,0,0,0,0,4,166,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,186,64,0,0,0,0,0,70,169,64,0,0,0,0,0,253,185,64,0,0,0,0,0,80,169,64,0,0,0,0,0,251,185,64,0,0,0,0,0,76,169,64,0,0,0,0,0,252,185,64,0,0,0,0,0,58,169,64,0,0,0,0,0,252,185,64,0,0,0,0,0,12,169,64,0,0,0,0,0,195,186,64,0,0,0,0,0,248,167,64,0,0,0,0,0,132,187,64,0,0,0,0,0,238,166,64,0,0,0,0,0,246,187,64,0,0,0,0,0,176,166,64,0,0,0,0,0,193,186,64,0,0,0,0,0,204,167,64,0,0,0,0,0,5,186,64,0,0,0,0,0,70,169,64,0,0,0,0,0,6,186,64,0,0,0,0,0,70,169,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,6,186,64,0,0,0,0,0,70,169,64,0,0,0,0,0,5,186,64,0,0,0,0,0,70,169,64,0,0,0,0,0,193,186,64,0,0,0,0,0,204,167,64,0,0,0,0,0,246,187,64,0,0,0,0,0,176,166,64,0,0,0,0,0,132,187,64,0,0,0,0,0,238,166,64,0,0,0,0,0,195,186,64,0,0,0,0,0,248,167,64,0,0,0,0,0,252,185,64,0,0,0,0,0,12,169,64,0,0,0,0,0,252,185,64,0,0,0,0,0,58,169,64,0,0,0,0,0,251,185,64,0,0,0,0,0,76,169,64,0,0,0,0,0,253,185,64,0,0,0,0,0,80,169,64])
.concat([0,0,0,0,0,6,186,64,0,0,0,0,0,70,169,64,0,0,0,0,0,15,188,64,0,0,0,0,0,154,166,64,0,0,0,0,0,17,188,64,0,0,0,0,0,154,166,64,0,0,0,0,0,18,188,64,0,0,0,0,0,158,166,64,0,0,0,0,0,18,188,64,0,0,0,0,0,160,166,64,0,0,0,0,0,16,188,64,0,0,0,0,0,164,166,64,0,0,0,0,0,204,186,64,0,0,0,0,0,198,167,64,0,0,0,0,0,9,186,64,0,0,0,0,0,78,169,64,0,0,0,0,0,255,185,64,0,0,0,0,0,94,169,64,0,0,0,0,0,251,185,64,0,0,0,0,0,88,169,64,0,0,0,0,0,246,185,64,0,0,0,0,0,84,169,64,0,0,0,0,0,247,185,64,0,0,0,0,0,58,169,64,0,0,0,0,0,246,185,64,0,0,0,0,0,8,169,64,0,0,0,0,0,192,186,64,0,0,0,0,0,240,167,64,0,0,0,0,0,153,187,64,0,0,0,0,0,198,166,64,0,0,0,0,0,14,188,64,0,0,0,0,0,154,166,64,0,0,0,0,0,15,188,64,0,0,0,0,0,154,166,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131,187,64,0,0,0,0,0,99,182,64,0,0,0,0,0,48,188,64,0,0,0,0,0,51,182,64,0,0,0,0,0,53,188,64,0,0,0,0,0,20,182,64,0,0,0,0,0,59,188,64,0,0,0,0,0,242,181,64,0,0,0,0,0,124,188,64,0,0,0,0,0,212,181,64,0,0,0,0,0,187,188,64,0,0,0,0,0,183,181,64,0,0,0,0,0,213,188,64,0,0,0,0,0,196,181,64,0,0,0,0,0,240,188,64,0,0,0,0,0,209,181,64,0,0,0,0,0,234,188,64,0,0,0,0,0,48,182,64,0,0,0,0,0,228,188,64,0,0,0,0,0,145,182,64,0,0,0,0,0,189,188,64,0,0,0,0,0,156,182,64,0,0,0,0,0,192,187,64,0,0,0,0,0,245,182,64,0,0,0,0,0,218,186,64,0,0,0,0,0,70,183,64,0,0,0,0,0,141,186,64,0,0,0,0,0,84,183,64,0,0,0,0,0,71,186,64,0,0,0,0,0,97,183,64,0,0,0,0,0,157,185,64,0,0,0,0,0,184,183,64,0,0,0,0,0,237,184,64,0,0,0,0,0,18,184,64,0,0,0,0,0,197,184,64,0,0,0,0,0,28,184,64,0,0,0,0,0,101,184,64,0,0,0,0,0,52,184,64,0,0,0,0,0,141,183,64,0,0,0,0,0,52,184,64,0,0,0,0,0,93,182,64,0,0,0,0,0,4,184,64,0,0,0,0,0,173,183,64,0,0,0,0,0,228,183,64,0,0,0,0,0,21,185,64,0,0,0,0,0,188,183,64,0,0,0,0,0,101,185,64,0,0,0,0,0,84,183,64,0,0,0,0,0,117,186,64,0,0,0,0,0,156,182,64,0,0,0,0,0,173,186,64,0,0,0,0,0,148,182,64,0,0,0,0,0,131,187,64,0,0,0,0,0,99,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,117,187,64,0,0,0,0,0,183,182,64,0,0,0,0,0,164,186,64,0,0,0,0,0,2,183,64,0,0,0,0,0,133,186,64,0,0,0,0,0,28,183,64,0,0,0,0,0,73,186,64,0,0,0,0,0,80,183,64,0,0,0,0,0,17,185,64,0,0,0,0,0,184,183,64,0,0,0,0,0,205,184,64,0,0,0,0,0,220,183,64,0,0,0,0,0,57,183,64,0,0,0,0,0,4,184,64,0,0,0,0,0,189,182,64,0,0,0,0,0,228,183,64,0,0,0,0,0,73,183,64,0,0,0,0,0,224,183,64,0,0,0,0,0,221,183,64,0,0,0,0,0,240,183,64,0,0,0,0,0,233,184,64,0,0,0,0,0,140,183,64,0,0,0,0,0,133,185,64,0,0,0,0,0,100,183,64,0,0,0,0,0,81,187,64,0,0,0,0,0,176,182,64,0,0,0,0,0,109,188,64,0,0,0,0,0,112,182,64,0,0,0,0,0,237,188,64,0,0,0,0,0,156,181,64,0,0,0,0,0,5,189,64,0,0,0,0,0,104,181,64,0,0,0,0,0,65,189,64,0,0,0,0,0,72,181,64,0,0,0,0,0,72,189,64,0,0,0,0,0,131,181,64,0,0,0,0,0,89,188,64,0,0,0,0,0,92,182,64,0,0,0,0,0,68,188,64,0,0,0,0,0,112,182,64,0,0,0,0,0,117,187,64,0,0,0,0,0,183,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,252,184,64,0,0,0,0,0,217,183,64,0,0,0,0,0,229,184,64,0,0,0,0,0,248,183,64,0,0,0,0,0,180,184,64,0,0,0,0,0,230,183,64,0,0,0,0,0,171,184,64,0,0,0,0,0,190,183,64,0,0,0,0,0,19,185,64,0,0,0,0,0,186,183,64,0,0,0,0,0,252,184,64,0,0,0,0,0,217,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,108,184,64,0,0,0,0,0,244,183,64,0,0,0,0,0,85,184,64,0,0,0,0,0,19,184,64,0,0,0,0,0,36,184,64,0,0,0,0,0,1,184,64,0,0,0,0,0,27,184,64,0,0,0,0,0,217,183,64,0,0,0,0,0,131,184,64,0,0,0,0,0,213,183,64,0,0,0,0,0,108,184,64,0,0,0,0,0,244,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,156,183,64,0,0,0,0,0,13,184,64,0,0,0,0,0,132,183,64,0,0,0,0,0,44,184,64,0,0,0,0,0,84,183,64,0,0,0,0,0,26,184,64,0,0,0,0,0,74,183,64,0,0,0,0,0,242,183,64,0,0,0,0,0,179,183,64,0,0,0,0,0,238,183,64,0,0,0,0,0,156,183,64,0,0,0,0,0,13,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,183,64,0,0,0,0,0,24,184,64,0,0,0,0,0,236,182,64,0,0,0,0,0,55,184,64,0,0,0,0,0,187,182,64,0,0,0,0,0,37,184,64,0,0,0,0,0,177,182,64,0,0,0,0,0,253,183,64,0,0,0,0,0,26,183,64,0,0,0,0,0,249,183,64,0,0,0,0,0,3,183,64,0,0,0,0,0,24,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,186,64,0,0,0,0,0,95,183,64,0,0,0,0,0,245,185,64,0,0,0,0,0,42,183,64,0,0,0,0,0,129,186,64,0,0,0,0,0,36,183,64,0,0,0,0,0,98,186,64,0,0,0,0,0,77,183,64,0,0,0,0,0,67,186,64,0,0,0,0,0,119,183,64,0,0,0,0,0,2,186,64,0,0,0,0,0,95,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,48,187,64,0,0,0,0,0,245,182,64,0,0,0,0,0,43,187,64,0,0,0,0,0,40,183,64,0,0,0,0,0,208,186,64,0,0,0,0,0,7,183,64,0,0,0,0,0,196,186,64,0,0,0,0,0,210,182,64,0,0,0,0,0,59,187,64,0,0,0,0,0,144,182,64,0,0,0,0,0,48,187,64,0,0,0,0,0,245,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,231,187,64,0,0,0,0,0,189,182,64,0,0,0,0,0,215,187,64,0,0,0,0,0,238,182,64,0,0,0,0,0,135,187,64,0,0,0,0,0,207,182,64,0,0,0,0,0,122,187,64,0,0,0,0,0,153,182,64,0,0,0,0,0,9,188,64,0,0,0,0,0,79,182,64,0,0,0,0,0,231,187,64,0,0,0,0,0,189,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,57,188,64,0,0,0,0,0,57,182,64,0,0,0,0,0,144,188,64,0,0,0,0,0,215,181,64,0,0,0,0,0,165,188,64,0,0,0,0,0,92,182,64,0,0,0,0,0,173,188,64,0,0,0,0,0,143,182,64,0,0,0,0,0,69,188,64,0,0,0,0,0,110,182,64,0,0,0,0,0,57,188,64,0,0,0,0,0,57,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,185,64,0,0,0,0,0,172,183,64,0,0,0,0,0,74,185,64,0,0,0,0,0,132,183,64,0,0,0,0,0,178,185,64,0,0,0,0,0,127,183,64,0,0,0,0,0,155,185,64,0,0,0,0,0,158,183,64,0,0,0,0,0,132,185,64,0,0,0,0,0,189,183,64,0,0,0,0,0,83,185,64,0,0,0,0,0,172,183,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,188,64,0,0,0,0,0,12,172,64,0,0,0,0,0,8,188,64,0,0,0,0,0,22,172,64,0,0,0,0,0,6,188,64,0,0,0,0,0,0,172,64,0,0,0,0,0,6,188,64,0,0,0,0,0,208,171,64,0,0,0,0,0,201,188,64,0,0,0,0,0,204,170,64,0,0,0,0,0,138,189,64,0,0,0,0,0,208,169,64,0,0,0,0,0,250,189,64,0,0,0,0,0,156,169,64,0,0,0,0,0,199,188,64,0,0,0,0,0,162,170,64,0,0,0,0,0,16,188,64,0,0,0,0,0,12,172,64,0,0,0,0,0,17,188,64,0,0,0,0,0,12,172,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,17,188,64,0,0,0,0,0,12,172,64,0,0,0,0,0,16,188,64,0,0,0,0,0,12,172,64,0,0,0,0,0,199,188,64,0,0,0,0,0,162,170,64,0,0,0,0,0,250,189,64,0,0,0,0,0,156,169,64,0,0,0,0,0,138,189,64,0,0,0,0,0,208,169,64,0,0,0,0,0,201,188,64,0,0,0,0,0,204,170,64,0,0,0,0,0,6,188,64,0,0,0,0,0,208,171,64,0,0,0,0,0,6,188,64,0,0,0,0,0,0,172,64,0,0,0,0,0,8,188,64,0,0,0,0,0,22,172,64,0,0,0,0,0,17,188,64,0,0,0,0,0,12,172,64,0,0,0,0,0,20,188,64,0,0,0,0,0,20,172,64,0,0,0,0,0,10,188,64,0,0,0,0,0,36,172,64,0,0,0,0,0,6,188,64,0,0,0,0,0,30,172,64,0,0,0,0,0,0,188,64,0,0,0,0,0,24,172,64,0,0,0,0,0,1,188,64,0,0,0,0,0,0,172,64,0,0,0,0,0,0,188,64,0,0,0,0,0,204,171,64,0,0,0,0,0,198,188,64,0,0,0,0,0,196,170,64,0,0,0,0,0,158,189,64,0,0,0,0,0,170,169,64,0,0,0,0,0,17,190,64,0,0,0,0,0,136,169,64,0,0,0,0,0,18,190,64,0,0,0,0,0,136,169,64,0,0,0,0,0,20,190,64,0,0,0,0,0,136,169,64,0,0,0,0,0,21,190,64,0,0,0,0,0,140,169,64,0,0,0,0,0,20,190,64,0,0,0,0,0,142,169,64,0,0,0,0,0,19,190,64,0,0,0,0,0,146,169,64,0,0,0,0,0,210,188,64,0,0,0,0,0,156,170,64,0,0,0,0,0,20,188,64,0,0,0,0,0,20,172,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,77,188,64,0,0,0,0,0,4,179,64,0,0,0,0,0,5,190,64,0,0,0,0,0,196,180,64,0,0,0,0,0,189,190,64,0,0,0,0,0,12,181,64,0,0,0,0,0,117,191,64,0,0,0,0,0,236,181,64,0,0,0,0,0,37,191,64,0,0,0,0,0,244,183,64,0,0,0,0,0,229,190,64,0,0,0,0,0,140,184,64,0,0,0,0,0,165,190,64,0,0,0,0,0,236,182,64,0,0,0,0,0,229,190,64,0,0,0,0,0,244,180,64,0,0,0,0,0,5,190,64,0,0,0,0,0,52,182,64,0,0,0,0,0,93,189,64,0,0,0,0,0,110,181,64,0,0,0,0,0,221,189,64,0,0,0,0,0,116,181,64,0,0,0,0,0,29,190,64,0,0,0,0,0,156,181,64,0,0,0,0,0,37,190,64,0,0,0,0,0,124,181,64,0,0,0,0,0,46,190,64,0,0,0,0,0,88,181,64,0,0,0,0,0,177,189,64,0,0,0,0,0,180,180,64,0,0,0,0,0,23,189,64,0,0,0,0,0,233,179,64,0,0,0,0,0,53,188,64,0,0,0,0,0,44,179,64,0,0,0,0,0,221,186,64,0,0,0,0,0,12,178,64,0,0,0,0,0,77,188,64,0,0,0,0,0,4,179,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,223,192,64,0,0,0,0,0,86,184,64,0,0,0,0,0,56,190,64,0,0,0,0,0,144,182,64,0,0,0,0,0,192,183,64,0,0,0,0,0,10,182,64,0,0,0,0,0,190,183,64,0,0,0,0,0,251,181,64,0,0,0,0,0,197,183,64,0,0,0,0,0,247,181,64,0,0,0,0,0,220,183,64,0,0,0,0,0,251,181,64,0,0,0,0,0,221,183,64,0,0,0,0,0,251,181,64,0,0,0,0,0,33,185,64,0,0,0,0,0,30,182,64,0,0,0,0,0,185,186,64,0,0,0,0,0,77,182,64,0,0,0,0,0,249,187,64,0,0,0,0,0,131,182,64,0,0,0,0,128,22,192,64,0,0,0,0,0,54,183,64,0,0,0,0,0,223,192,64,0,0,0,0,0,86,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,223,192,64,0,0,0,0,0,86,184,64,0,0,0,0,128,22,192,64,0,0,0,0,0,54,183,64,0,0,0,0,0,249,187,64,0,0,0,0,0,131,182,64,0,0,0,0,0,185,186,64,0,0,0,0,0,77,182,64,0,0,0,0,0,33,185,64,0,0,0,0,0,30,182,64,0,0,0,0,0,221,183,64,0,0,0,0,0,251,181,64,0,0,0,0,0,220,183,64,0,0,0,0,0,251,181,64,0,0,0,0,0,197,183,64,0,0,0,0,0,247,181,64,0,0,0,0,0,190,183,64,0,0,0,0,0,251,181,64,0,0,0,0,0,192,183,64,0,0,0,0,0,10,182,64,0,0,0,0,0,56,190,64,0,0,0,0,0,144,182,64,0,0,0,0,0,223,192,64,0,0,0,0,0,86,184,64,0,0,0,0,128,235,192,64,0,0,0,0,0,98,184,64,0,0,0,0,0,236,192,64,0,0,0,0,0,100,184,64,0,0,0,0,128,235,192,64,0,0,0,0,0,102,184,64,0,0,0,0,0,235,192,64,0,0,0,0,0,103,184,64,0,0,0,0,0,234,192,64,0,0,0,0,0,102,184,64,0,0,0,0,128,233,192,64,0,0,0,0,0,101,184,64,0,0,0,0,0,75,190,64,0,0,0,0,0,150,182,64,0,0,0,0,0,189,183,64,0,0,0,0,0,15,182,64,0,0,0,0,0,188,183,64,0,0,0,0,0,14,182,64,0,0,0,0,0,187,183,64,0,0,0,0,0,13,182,64,0,0,0,0,0,184,183,64,0,0,0,0,0,248,181,64,0,0,0,0,0,194,183,64,0,0,0,0,0,243,181,64,0,0,0,0,0,222,183,64,0,0,0,0,0,246,181,64,0,0,0,0,0,34,185,64,0,0,0,0,0,25,182,64,0,0,0,0,0,187,186,64,0,0,0,0,0,71,182,64,0,0,0,0,0,250,187,64,0,0,0,0,0,126,182,64,0,0,0,0,128,38,192,64,0,0,0,0,0,55,183,64,0,0,0,0,128,235,192,64,0,0,0,0,0,98,184,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,93,190,64,0,0,0,0,0,248,181,64,0,0,0,0,0,237,193,64,0,0,0,0,0,139,182,64,0,0,0,0,128,151,194,64,0,0,0,0,0,250,183,64,0,0,0,0,0,149,193,64,0,0,0,0,0,37,182,64,0,0,0,0,0,144,184,64,0,0,0,0,0,178,181,64,0,0,0,0,0,142,184,64,0,0,0,0,0,163,181,64,0,0,0,0,0,149,184,64,0,0,0,0,0,159,181,64,0,0,0,0,0,172,184,64,0,0,0,0,0,163,181,64,0,0,0,0,0,115,186,64,0,0,0,0,0,178,181,64,0,0,0,0,0,149,188,64,0,0,0,0,0,200,181,64,0,0,0,0,0,93,190,64,0,0,0,0,0,248,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,93,190,64,0,0,0,0,0,248,181,64,0,0,0,0,0,149,188,64,0,0,0,0,0,200,181,64,0,0,0,0,0,115,186,64,0,0,0,0,0,178,181,64,0,0,0,0,0,172,184,64,0,0,0,0,0,163,181,64,0,0,0,0,0,149,184,64,0,0,0,0,0,159,181,64,0,0,0,0,0,142,184,64,0,0,0,0,0,163,181,64,0,0,0,0,0,144,184,64,0,0,0,0,0,178,181,64,0,0,0,0,0,149,193,64,0,0,0,0,0,37,182,64,0,0,0,0,128,151,194,64,0,0,0,0,0,250,183,64,0,0,0,0,0,237,193,64,0,0,0,0,0,139,182,64,0,0,0,0,0,93,190,64,0,0,0,0,0,248,181,64,0,0,0,0,0,115,186,64,0,0,0,0,0,173,181,64,0,0,0,0,0,149,188,64,0,0,0,0,0,194,181,64,0,0,0,0,0,94,190,64,0,0,0,0,0,243,181,64,0,0,0,0,128,24,194,64,0,0,0,0,0,143,182,64,0,0,0,0,128,171,194,64,0,0,0,0,0,35,184,64,0,0,0,0,0,172,194,64,0,0,0,0,0,37,184,64,0,0,0,0,128,171,194,64,0,0,0,0,0,38,184,64,0,0,0,0,128,170,194,64,0,0,0,0,0,39,184,64,0,0,0,0,128,169,194,64,0,0,0,0,0,38,184,64,0,0,0,0,128,205,193,64,0,0,0,0,0,46,182,64,0,0,0,0,0,141,184,64,0,0,0,0,0,183,181,64,0,0,0,0,0,140,184,64,0,0,0,0,0,182,181,64,0,0,0,0,0,139,184,64,0,0,0,0,0,181,181,64,0,0,0,0,0,136,184,64,0,0,0,0,0,160,181,64,0,0,0,0,0,146,184,64,0,0,0,0,0,155,181,64,0,0,0,0,0,174,184,64,0,0,0,0,0,158,181,64,0,0,0,0,0,115,186,64,0,0,0,0,0,173,181,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,241,195,64,0,0,0,0,0,17,182,64,0,0,0,0,0,107,196,64,0,0,0,0,0,97,182,64,0,0,0,0,0,137,196,64,0,0,0,0,0,209,182,64,0,0,0,0,0,91,196,64,0,0,0,0,0,99,182,64,0,0,0,0,0,241,195,64,0,0,0,0,0,17,182,64,0,0,0,0,0,148,185,64,0,0,0,0,0,83,181,64,0,0,0,0,0,206,187,64,0,0,0,0,0,61,181,64,0,0,0,0,0,118,190,64,0,0,0,0,0,37,181,64,0,0,0,0,128,90,192,64,0,0,0,0,0,48,181,64,0,0,0,0,128,117,194,64,0,0,0,0,0,68,181,64,0,0,0,0,128,137,195,64,0,0,0,0,0,213,181,64,0,0,0,0,0,184,193,64,0,0,0,0,0,12,181,64,0,0,0,0,0,120,185,64,0,0,0,0,0,98,181,64,0,0,0,0,0,118,185,64,0,0,0,0,0,83,181,64,0,0,0,0,0,125,185,64,0,0,0,0,0,79,181,64,0,0,0,0,0,148,185,64,0,0,0,0,0,83,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,241,195,64,0,0,0,0,0,17,182,64,0,0,0,0,0,91,196,64,0,0,0,0,0,99,182,64,0,0,0,0,0,137,196,64,0,0,0,0,0,209,182,64,0,0,0,0,0,107,196,64,0,0,0,0,0,97,182,64,0,0,0,0,0,241,195,64,0,0,0,0,0,17,182,64,0,0,0,0,0,148,185,64,0,0,0,0,0,83,181,64,0,0,0,0,0,125,185,64,0,0,0,0,0,79,181,64,0,0,0,0,0,118,185,64,0,0,0,0,0,83,181,64,0,0,0,0,0,120,185,64,0,0,0,0,0,98,181,64,0,0,0,0,0,184,193,64,0,0,0,0,0,12,181,64,0,0,0,0,128,137,195,64,0,0,0,0,0,213,181,64,0,0,0,0,128,117,194,64,0,0,0,0,0,68,181,64,0,0,0,0,128,90,192,64,0,0,0,0,0,48,181,64,0,0,0,0,0,118,190,64,0,0,0,0,0,37,181,64,0,0,0,0,0,206,187,64,0,0,0,0,0,61,181,64,0,0,0,0,0,148,185,64,0,0,0,0,0,83,181,64,0,0,0,0,0,117,185,64,0,0,0,0,0,103,181,64,0,0,0,0,0,116,185,64,0,0,0,0,0,102,181,64,0,0,0,0,0,115,185,64,0,0,0,0,0,101,181,64,0,0,0,0,0,112,185,64,0,0,0,0,0,80,181,64,0,0,0,0,0,122,185,64,0,0,0,0,0,75,181,64,0,0,0,0,0,150,185,64,0,0,0,0,0,78,181,64,0,0,0,0,0,206,187,64,0,0,0,0,0,56,181,64,0,0,0,0,0,118,190,64,0,0,0,0,0,31,181,64,0,0,0,0,128,90,192,64,0,0,0,0,0,43,181,64,0,0,0,0,0,173,194,64,0,0,0,0,0,65,181,64,0,0,0,0,128,191,195,64,0,0,0,0,0,239,181,64,0,0,0,0,0,193,195,64,0,0,0,0,0,240,181,64,0,0,0,0,0,116,196,64,0,0,0,0,0,79,182,64,0,0,0,0,0,144,196,64,0,0,0,0,0,227,182,64,0,0,0,0,0,144,196,64,0,0,0,0,0,229,182,64,0,0,0,0,0,143,196,64,0,0,0,0,0,230,182,64,0,0,0,0,128,142,196,64,0,0,0,0,0,231,182,64,0,0,0,0,128,141,196,64,0,0,0,0,0,230,182,64,0,0,0,0,128,141,196,64,0,0,0,0,0,229,182,64,0,0,0,0,128,88,196,64,0,0,0,0,0,85,182,64,0,0,0,0,128,190,195,64,0,0,0,0,0,244,181,64,0,0,0,0,128,4,194,64,0,0,0,0,0,12,181,64,0,0,0,0,0,117,185,64,0,0,0,0,0,103,181,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,94,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,247,187,64,0,0,0,0,0,141,180,64,0,0,0,0,0,225,189,64,0,0,0,0,0,19,180,64,0,0,0,0,0,126,191,64,0,0,0,0,0,208,179,64,0,0,0,0,128,196,193,64,0,0,0,0,0,39,179,64,0,0,0,0,128,146,194,64,0,0,0,0,0,238,179,64,0,0,0,0,128,104,193,64,0,0,0,0,0,12,179,64,0,0,0,0,0,64,186,64,0,0,0,0,0,1,181,64,0,0,0,0,0,62,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,69,186,64,0,0,0,0,0,239,180,64,0,0,0,0,0,92,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,94,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,237,194,64,0,0,0,0,0,113,180,64,0,0,0,0,128,224,194,64,0,0,0,0,0,86,180,64,0,0,0,0,128,216,194,64,0,0,0,0,0,68,180,64,0,0,0,0,128,206,194,64,0,0,0,0,0,52,180,64,0,0,0,0,0,188,194,64,0,0,0,0,0,24,180,64,0,0,0,0,128,219,194,64,0,0,0,0,0,61,180,64,0,0,0,0,0,237,194,64,0,0,0,0,0,113,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,94,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,92,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,69,186,64,0,0,0,0,0,239,180,64,0,0,0,0,0,62,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,64,186,64,0,0,0,0,0,1,181,64,0,0,0,0,128,104,193,64,0,0,0,0,0,12,179,64,0,0,0,0,128,146,194,64,0,0,0,0,0,238,179,64,0,0,0,0,128,196,193,64,0,0,0,0,0,39,179,64,0,0,0,0,0,126,191,64,0,0,0,0,0,208,179,64,0,0,0,0,0,225,189,64,0,0,0,0,0,19,180,64,0,0,0,0,0,247,187,64,0,0,0,0,0,141,180,64,0,0,0,0,0,94,186,64,0,0,0,0,0,243,180,64,0,0,0,0,0,237,194,64,0,0,0,0,0,113,180,64,0,0,0,0,0,243,194,64,0,0,0,0,0,129,180,64,0,0,0,0,128,243,194,64,0,0,0,0,0,131,180,64,0,0,0,0,0,244,194,64,0,0,0,0,0,133,180,64,0,0,0,0,128,243,194,64,0,0,0,0,0,134,180,64,0,0,0,0,128,242,194,64,0,0,0,0,0,135,180,64,0,0,0,0,128,241,194,64,0,0,0,0,0,134,180,64,0,0,0,0,0,215,194,64,0,0,0,0,0,61,180,64,0,0,0,0,0,172,194,64,0,0,0,0,0,9,180,64,0,0,0,0,128,170,194,64,0,0,0,0,0,8,180,64,0,0,0,0,0,152,193,64,0,0,0,0,0,251,178,64,0,0,0,0,0,62,186,64,0,0,0,0,0,7,181,64,0,0,0,0,0,60,186,64,0,0,0,0,0,7,181,64,0,0,0,0,0,59,186,64,0,0,0,0,0,6,181,64,0,0,0,0,0,59,186,64,0,0,0,0,0,5,181,64,0,0,0,0,0,56,186,64,0,0,0,0,0,240,180,64,0,0,0,0,0,66,186,64,0,0,0,0,0,235,180,64,0,0,0,0,0,74,186,64,0,0,0,0,0,229,180,64,0,0,0,0,0,94,186,64,0,0,0,0,0,238,180,64,0,0,0,0,0,246,187,64,0,0,0,0,0,136,180,64,0,0,0,0,0,225,189,64,0,0,0,0,0,13,180,64,0,0,0,0,0,125,191,64,0,0,0,0,0,203,179,64,0,0,0,0,128,230,193,64,0,0,0,0,0,23,179,64,0,0,0,0,128,173,194,64,0,0,0,0,0,5,180,64,0,0,0,0,128,174,194,64,0,0,0,0,0,7,180,64,0,0,0,0,0,188,194,64,0,0,0,0,0,24,180,64,0,0,0,0,128,206,194,64,0,0,0,0,0,52,180,64,0,0,0,0,128,216,194,64,0,0,0,0,0,68,180,64,0,0,0,0,128,224,194,64,0,0,0,0,0,86,180,64,0,0,0,0,0,237,194,64,0,0,0,0,0,113,180,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,182,64,0,0,0,0,0,213,182,64,0,0,0,0,0,107,182,64,0,0,0,0,0,250,182,64,0,0,0,0,0,169,182,64,0,0,0,0,0,63,183,64,0,0,0,0,0,97,183,64,0,0,0,0,0,10,184,64,0,0,0,0,0,128,183,64,0,0,0,0,0,209,185,64,0,0,0,0,0,239,182,64,0,0,0,0,0,180,182,64,0,0,0,0,0,184,181,64,0,0,0,0,0,202,182,64,0,0,0,0,0,182,181,64,0,0,0,0,0,187,182,64,0,0,0,0,0,189,181,64,0,0,0,0,0,183,182,64,0,0,0,0,0,212,181,64,0,0,0,0,0,187,182,64,0,0,0,0,0,33,182,64,0,0,0,0,0,214,182,64,0,0,0,0,0,33,182,64,0,0,0,0,0,213,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,33,182,64,0,0,0,0,0,213,182,64,0,0,0,0,0,33,182,64,0,0,0,0,0,214,182,64,0,0,0,0,0,212,181,64,0,0,0,0,0,187,182,64,0,0,0,0,0,189,181,64,0,0,0,0,0,183,182,64,0,0,0,0,0,182,181,64,0,0,0,0,0,187,182,64,0,0,0,0,0,184,181,64,0,0,0,0,0,202,182,64,0,0,0,0,0,239,182,64,0,0,0,0,0,180,182,64,0,0,0,0,0,128,183,64,0,0,0,0,0,209,185,64,0,0,0,0,0,97,183,64,0,0,0,0,0,10,184,64,0,0,0,0,0,169,182,64,0,0,0,0,0,63,183,64,0,0,0,0,0,107,182,64,0,0,0,0,0,250,182,64,0,0,0,0,0,33,182,64,0,0,0,0,0,213,182,64,0,0,0,0,0,180,181,64,0,0,0,0,0,206,182,64,0,0,0,0,0,179,181,64,0,0,0,0,0,205,182,64,0,0,0,0,0,176,181,64,0,0,0,0,0,184,182,64,0,0,0,0,0,186,181,64,0,0,0,0,0,179,182,64,0,0,0,0,0,214,181,64,0,0,0,0,0,182,182,64,0,0,0,0,0,35,182,64,0,0,0,0,0,209,182,64,0,0,0,0,0,111,182,64,0,0,0,0,0,246,182,64,0,0,0,0,0,173,182,64,0,0,0,0,0,60,183,64,0,0,0,0,0,110,183,64,0,0,0,0,0,18,184,64,0,0,0,0,0,136,183,64,0,0,0,0,0,252,185,64,0,0,0,0,0,135,183,64,0,0,0,0,0,254,185,64,0,0,0,0,0,134,183,64,0,0,0,0,0,255,185,64,0,0,0,0,0,132,183,64,0,0,0,0,0,254,185,64,0,0,0,0,0,131,183,64,0,0,0,0,0,253,185,64,0,0,0,0,0,131,183,64,0,0,0,0,0,252,185,64,0,0,0,0,0,243,182,64,0,0,0,0,0,183,182,64,0,0,0,0,0,181,181,64,0,0,0,0,0,207,182,64,0,0,0,0,0,180,181,64,0,0,0,0,0,206,182,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,101,181,64,0,0,0,0,0,225,182,64,0,0,0,0,0,160,181,64,0,0,0,0,0,236,182,64,0,0,0,0,0,201,181,64,0,0,0,0,0,27,183,64,0,0,0,0,0,59,182,64,0,0,0,0,0,153,183,64,0,0,0,0,0,49,182,64,0,0,0,0,0,19,185,64,0,0,0,0,0,45,182,64,0,0,0,0,0,18,184,64,0,0,0,0,0,242,181,64,0,0,0,0,0,137,183,64,0,0,0,0,0,167,181,64,0,0,0,0,0,222,182,64,0,0,0,0,0,8,181,64,0,0,0,0,0,234,182,64,0,0,0,0,0,6,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,13,181,64,0,0,0,0,0,215,182,64,0,0,0,0,0,36,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,37,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,37,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,36,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,13,181,64,0,0,0,0,0,215,182,64,0,0,0,0,0,6,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,8,181,64,0,0,0,0,0,234,182,64,0,0,0,0,0,167,181,64,0,0,0,0,0,222,182,64,0,0,0,0,0,242,181,64,0,0,0,0,0,137,183,64,0,0,0,0,0,45,182,64,0,0,0,0,0,18,184,64,0,0,0,0,0,49,182,64,0,0,0,0,0,19,185,64,0,0,0,0,0,59,182,64,0,0,0,0,0,153,183,64,0,0,0,0,0,201,181,64,0,0,0,0,0,27,183,64,0,0,0,0,0,160,181,64,0,0,0,0,0,236,182,64,0,0,0,0,0,101,181,64,0,0,0,0,0,225,182,64,0,0,0,0,0,37,181,64,0,0,0,0,0,219,182,64,0,0,0,0,0,4,181,64,0,0,0,0,0,238,182,64,0,0,0,0,0,3,181,64,0,0,0,0,0,237,182,64,0,0,0,0,0,0,181,64,0,0,0,0,0,216,182,64,0,0,0,0,0,10,181,64,0,0,0,0,0,211,182,64,0,0,0,0,0,38,181,64,0,0,0,0,0,214,182,64,0,0,0,0,0,101,181,64,0,0,0,0,0,220,182,64,0,0,0,0,0,102,181,64,0,0,0,0,0,220,182,64,0,0,0,0,0,162,181,64,0,0,0,0,0,232,182,64,0,0,0,0,0,205,181,64,0,0,0,0,0,24,183,64,0,0,0,0,0,83,182,64,0,0,0,0,0,171,183,64,0,0,0,0,0,48,182,64,0,0,0,0,0,148,185,64,0,0,0,0,0,47,182,64,0,0,0,0,0,150,185,64,0,0,0,0,0,45,182,64,0,0,0,0,0,151,185,64,0,0,0,0,0,43,182,64,0,0,0,0,0,150,185,64,0,0,0,0,0,43,182,64,0,0,0,0,0,148,185,64,0,0,0,0,0,54,182,64,0,0,0,0,0,53,184,64,0,0,0,0,0,237,181,64,0,0,0,0,0,139,183,64,0,0,0,0,0,163,181,64,0,0,0,0,0,227,182,64,0,0,0,0,0,5,181,64,0,0,0,0,0,239,182,64,0,0,0,0,0,4,181,64,0,0,0,0,0,238,182,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,109,180,64,0,0,0,0,0,223,182,64,0,0,0,0,0,132,180,64,0,0,0,0,0,227,182,64,0,0,0,0,0,133,180,64,0,0,0,0,0,227,182,64,0,0,0,0,0,198,180,64,0,0,0,0,0,244,182,64,0,0,0,0,0,197,180,64,0,0,0,0,0,244,182,64,0,0,0,0,0,255,180,64,0,0,0,0,0,9,183,64,0,0,0,0,0,29,181,64,0,0,0,0,0,46,183,64,0,0,0,0,0,119,181,64,0,0,0,0,0,155,183,64,0,0,0,0,0,246,180,64,0,0,0,0,0,151,184,64,0,0,0,0,0,69,181,64,0,0,0,0,0,195,183,64,0,0,0,0,0,40,181,64,0,0,0,0,0,90,183,64,0,0,0,0,0,8,181,64,0,0,0,0,0,230,182,64,0,0,0,0,0,104,180,64,0,0,0,0,0,242,182,64,0,0,0,0,0,102,180,64,0,0,0,0,0,227,182,64,0,0,0,0,0,109,180,64,0,0,0,0,0,223,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,109,180,64,0,0,0,0,0,223,182,64,0,0,0,0,0,102,180,64,0,0,0,0,0,227,182,64,0,0,0,0,0,104,180,64,0,0,0,0,0,242,182,64,0,0,0,0,0,8,181,64,0,0,0,0,0,230,182,64,0,0,0,0,0,40,181,64,0,0,0,0,0,90,183,64,0,0,0,0,0,69,181,64,0,0,0,0,0,195,183,64,0,0,0,0,0,246,180,64,0,0,0,0,0,151,184,64,0,0,0,0,0,119,181,64,0,0,0,0,0,155,183,64,0,0,0,0,0,29,181,64,0,0,0,0,0,46,183,64,0,0,0,0,0,255,180,64,0,0,0,0,0,9,183,64,0,0,0,0,0,197,180,64,0,0,0,0,0,244,182,64,0,0,0,0,0,198,180,64,0,0,0,0,0,244,182,64,0,0,0,0,0,133,180,64,0,0,0,0,0,227,182,64,0,0,0,0,0,132,180,64,0,0,0,0,0,227,182,64,0,0,0,0,0,109,180,64,0,0,0,0,0,223,182,64,0,0,0,0,0,101,180,64,0,0,0,0,0,247,182,64,0,0,0,0,0,100,180,64,0,0,0,0,0,246,182,64,0,0,0,0,0,99,180,64,0,0,0,0,0,245,182,64,0,0,0,0,0,96,180,64,0,0,0,0,0,224,182,64,0,0,0,0,0,106,180,64,0,0,0,0,0,219,182,64,0,0,0,0,0,134,180,64,0,0,0,0,0,222,182,64,0,0,0,0,0,199,180,64,0,0,0,0,0,239,182,64,0,0,0,0,0,3,181,64,0,0,0,0,0,5,183,64,0,0,0,0,0,33,181,64,0,0,0,0,0,43,183,64,0,0,0,0,0,132,181,64,0,0,0,0,0,161,183,64,0,0,0,0,0,233,180,64,0,0,0,0,0,186,184,64,0,0,0,0,0,232,180,64,0,0,0,0,0,189,184,64,0,0,0,0,0,231,180,64,0,0,0,0,0,189,184,64,0,0,0,0,0,230,180,64,0,0,0,0,0,191,184,64,0,0,0,0,0,228,180,64,0,0,0,0,0,191,184,64,0,0,0,0,0,227,180,64,0,0,0,0,0,189,184,64,0,0,0,0,0,227,180,64,0,0,0,0,0,187,184,64,0,0,0,0,0,66,181,64,0,0,0,0,0,204,183,64,0,0,0,0,0,35,181,64,0,0,0,0,0,91,183,64,0,0,0,0,0,3,181,64,0,0,0,0,0,235,182,64,0,0,0,0,0,101,180,64,0,0,0,0,0,247,182,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,91,185,64,0,0,0,0,0,63,178,64,0,0,0,0,0,122,184,64,0,0,0,0,0,76,179,64,0,0,0,0,0,45,184,64,0,0,0,0,0,139,179,64,0,0,0,0,0,31,184,64,0,0,0,0,0,150,179,64,0,0,0,0,0,27,184,64,0,0,0,0,0,147,179,64,0,0,0,0,0,23,184,64,0,0,0,0,0,143,179,64,0,0,0,0,0,27,184,64,0,0,0,0,0,126,179,64,0,0,0,0,0,73,189,64,0,0,0,0,0,74,169,64,0,0,0,0,128,34,192,64,0,0,0,0,0,10,171,64,0,0,0,0,0,156,189,64,0,0,0,0,0,158,171,64,0,0,0,0,0,20,187,64,0,0,0,0,0,82,176,64,0,0,0,0,0,104,186,64,0,0,0,0,0,253,176,64,0,0,0,0,0,91,185,64,0,0,0,0,0,63,178,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,91,185,64,0,0,0,0,0,63,178,64,0,0,0,0,0,104,186,64,0,0,0,0,0,253,176,64,0,0,0,0,0,20,187,64,0,0,0,0,0,82,176,64,0,0,0,0,0,156,189,64,0,0,0,0,0,158,171,64,0,0,0,0,128,34,192,64,0,0,0,0,0,10,171,64,0,0,0,0,0,73,189,64,0,0,0,0,0,74,169,64,0,0,0,0,0,27,184,64,0,0,0,0,0,126,179,64,0,0,0,0,0,23,184,64,0,0,0,0,0,143,179,64,0,0,0,0,0,27,184,64,0,0,0,0,0,147,179,64,0,0,0,0,0,31,184,64,0,0,0,0,0,150,179,64,0,0,0,0,0,45,184,64,0,0,0,0,0,139,179,64,0,0,0,0,0,122,184,64,0,0,0,0,0,76,179,64,0,0,0,0,0,91,185,64,0,0,0,0,0,63,178,64,0,0,0,0,128,41,192,64,0,0,0,0,0,8,171,64,0,0,0,0,0,42,192,64,0,0,0,0,0,10,171,64,0,0,0,0,128,42,192,64,0,0,0,0,0,14,171,64,0,0,0,0,0,42,192,64,0,0,0,0,0,16,171,64,0,0,0,0,128,41,192,64,0,0,0,0,0,18,171,64,0,0,0,0,0,164,189,64,0,0,0,0,0,156,171,64,0,0,0,0,0,24,187,64,0,0,0,0,0,86,176,64,0,0,0,0,0,108,186,64,0,0,0,0,0,1,177,64,0,0,0,0,0,95,185,64,0,0,0,0,0,66,178,64,0,0,0,0,0,126,184,64,0,0,0,0,0,80,179,64,0,0,0,0,0,48,184,64,0,0,0,0,0,143,179,64,0,0,0,0,0,30,184,64,0,0,0,0,0,156,179,64,0,0,0,0,0,24,184,64,0,0,0,0,0,151,179,64,0,0,0,0,0,17,184,64,0,0,0,0,0,147,179,64,0,0,0,0,0,22,184,64,0,0,0,0,0,125,179,64,0,0,0,0,0,22,184,64,0,0,0,0,0,124,179,64,0,0,0,0,0,83,189,64,0,0,0,0,0,34,169,64,0,0,0,0,128,41,192,64,0,0,0,0,0,8,171,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
.concat([0,0,0,0,0,233,189,64,0,0,0,0,0,106,176,64,0,0,0,0,128,243,192,64,0,0,0,0,0,180,172,64,0,0,0,0,128,250,193,64,0,0,0,0,0,58,172,64,0,0,0,0,0,134,192,64,0,0,0,0,0,50,173,64,0,0,0,0,0,249,184,64,0,0,0,0,0,86,179,64,0,0,0,0,0,237,184,64,0,0,0,0,0,76,179,64,0,0,0,0,0,239,184,64,0,0,0,0,0,69,179,64,0,0,0,0,0,242,184,64,0,0,0,0,0,61,179,64,0,0,0,0,0,3,185,64,0,0,0,0,0,56,179,64,0,0,0,0,0,4,185,64,0,0,0,0,0,55,179,64,0,0,0,0,0,132,186,64,0,0,0,0,0,78,178,64,0,0,0,0,0,77,188,64,0,0,0,0,0,63,177,64,0,0,0,0,0,233,189,64,0,0,0,0,0,106,176,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,233,189,64,0,0,0,0,0,106,176,64,0,0,0,0,0,77,188,64,0,0,0,0,0,63,177,64,0,0,0,0,0,132,186,64,0,0,0,0,0,78,178,64,0,0,0,0,0,4,185,64,0,0,0,0,0,55,179,64,0,0,0,0,0,3,185,64,0,0,0,0,0,56,179,64,0,0,0,0,0,242,184,64,0,0,0,0,0,61,179,64,0,0,0,0,0,239,184,64,0,0,0,0,0,69,179,64,0,0,0,0,0,237,184,64,0,0,0,0,0,76,179,64,0,0,0,0,0,249,184,64,0,0,0,0,0,86,179,64,0,0,0,0,0,134,192,64,0,0,0,0,0,50,173,64,0,0,0,0,128,250,193,64,0,0,0,0,0,58,172,64,0,0,0,0,128,243,192,64,0,0,0,0,0,180,172,64,0,0,0,0,0,233,189,64,0,0,0,0,0,106,176,64,0,0,0,0,0,129,194,64,0,0,0,0,0,66,172,64,0,0,0,0,0,51,194,64,0,0,0,0,0,42,172,64,0,0,0,0,128,219,192,64,0,0,0,0,0,118,172,64,0,0,0,0,0,250,184,64,0,0,0,0,0,91,179,64,0,0,0,0,0,248,184,64,0,0,0,0,0,92,179,64,0,0,0,0,0,247,184,64,0,0,0,0,0,91,179,64,0,0,0,0,0,231,184,64,0,0,0,0,0,78,179,64,0,0,0,0,0,234,184,64,0,0,0,0,0,68,179,64,0,0,0,0,0,236,184,64,0,0,0,0,0,57,179,64,0,0,0,0,0,1,185,64,0,0,0,0,0,51,179,64,0,0,0,0,0,129,186,64,0,0,0,0,0,74,178,64,0,0,0,0,0,75,188,64,0,0,0,0,0,59,177,64,0,0,0,0,0,231,189,64,0,0,0,0,0,102,176,64,0,0,0,0,0,45,193,64,0,0,0,0,0,52,172,64,0,0,0,0,0,51,194,64,0,0,0,0,0,32,172,64,0,0,0,0,128,51,194,64,0,0,0,0,0,32,172,64,0,0,0,0,0,129,194,64,0,0,0,0,0,56,172,64,0,0,0,0,0,130,194,64,0,0,0,0,0,58,172,64,0,0,0,0,128,130,194,64,0,0,0,0,0,60,172,64,0,0,0,0,0,130,194,64,0,0,0,0,0,64,172,64,0,0,0,0,0,129,194,64,0,0,0,0,0,66,172,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,199,187,64,0,0,0,0,0,204,173,64,0,0,0,0,0,189,185,64,0,0,0,0,0,246,173,64,0,0,0,0,0,154,184,64,0,0,0,0,0,69,177,64,0,0,0,0,0,98,184,64,0,0,0,0,0,181,177,64,0,0,0,0,0,236,183,64,0,0,0,0,0,239,178,64,0,0,0,0,0,159,183,64,0,0,0,0,0,192,179,64,0,0,0,0,0,110,183,64,0,0,0,0,0,222,179,64,0,0,0,0,0,89,183,64,0,0,0,0,0,228,179,64,0,0,0,0,0,85,183,64,0,0,0,0,0,225,179,64,0,0,0,0,0,90,183,64,0,0,0,0,0,212,179,64,0,0,0,0,0,83,184,64,0,0,0,0,0,204,176,64,0,0,0,0,0,113,185,64,0,0,0,0,0,36,175,64,0,0,0,0,0,138,186,64,0,0,0,0,0,186,172,64,0,0,0,0,0,199,187,64,0,0,0,0,0,204,173,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,199,187,64,0,0,0,0,0,204,173,64,0,0,0,0,0,138,186,64,0,0,0,0,0,186,172,64,0,0,0,0,0,113,185,64,0,0,0,0,0,36,175,64,0,0,0,0,0,83,184,64,0,0,0,0,0,204,176,64,0,0,0,0,0,90,183,64,0,0,0,0,0,212,179,64,0,0,0,0,0,85,183,64,0,0,0,0,0,225,179,64,0,0,0,0,0,89,183,64,0,0,0,0,0,228,179,64,0,0,0,0,0,110,183,64,0,0,0,0,0,222,179,64,0,0,0,0,0,159,183,64,0,0,0,0,0,192,179,64,0,0,0,0,0,236,183,64,0,0,0,0,0,239,178,64,0,0,0,0,0,98,184,64,0,0,0,0,0,181,177,64,0,0,0,0,0,154,184,64,0,0,0,0,0,69,177,64,0,0,0,0,0,189,185,64,0,0,0,0,0,246,173,64,0,0,0,0,0,199,187,64,0,0,0,0,0,204,173,64,0,0,0,0,0,211,187,64,0,0,0,0,0,204,173,64,0,0,0,0,0,212,187,64,0,0,0,0,0,206,173,64,0,0,0,0,0,213,187,64,0,0,0,0,0,210,173,64,0,0,0,0,0,212,187,64,0,0,0,0,0,212,173,64,0,0,0,0,0,210,187,64,0,0,0,0,0,214,173,64,0,0,0,0,0,209,187,64,0,0,0,0,0,214,173,64,0,0,0,0,0,195,185,64,0,0,0,0,0,244,173,64,0,0,0,0,0,158,184,64,0,0,0,0,0,71,177,64,0,0,0,0,0,102,184,64,0,0,0,0,0,183,177,64,0,0,0,0,0,241,183,64,0,0,0,0,0,241,178,64,0,0,0,0,0,163,183,64,0,0,0,0,0,196,179,64,0,0,0,0,0,113,183,64,0,0,0,0,0,226,179,64,0,0,0,0,0,112,183,64,0,0,0,0,0,226,179,64,0,0,0,0,0,94,183,64,0,0,0,0,0,237,179,64,0,0,0,0,0,87,183,64,0,0,0,0,0,233,179,64,0,0,0,0,0,79,183,64,0,0,0,0,0,229,179,64,0,0,0,0,0,85,183,64,0,0,0,0,0,211,179,64,0,0,0,0,0,85,183,64,0,0,0,0,0,210,179,64,0,0,0,0,0,78,184,64,0,0,0,0,0,201,176,64,0,0,0,0,0,110,185,64,0,0,0,0,0,28,175,64,0,0,0,0,0,142,186,64,0,0,0,0,0,164,172,64,0,0,0,0,0,211,187,64,0,0,0,0,0,204,173,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,202,181,64,0,0,0,0,0,178,180,64,0,0,0,0,0,65,185,64,0,0,0,0,0,199,176,64,0,0,0,0,0,187,187,64,0,0,0,0,0,210,177,64,0,0,0,0,0,171,185,64,0,0,0,0,0,157,177,64,0,0,0,0,0,209,183,64,0,0,0,0,0,27,179,64,0,0,0,0,0,116,183,64,0,0,0,0,0,102,179,64,0,0,0,0,0,159,182,64,0,0,0,0,0,51,180,64,0,0,0,0,0,20,182,64,0,0,0,0,0,186,180,64,0,0,0,0,0,218,181,64,0,0,0,0,0,195,180,64,0,0,0,0,0,196,181,64,0,0,0,0,0,193,180,64,0,0,0,0,0,193,181,64,0,0,0,0,0,188,180,64,0,0,0,0,0,202,181,64,0,0,0,0,0,178,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,202,181,64,0,0,0,0,0,178,180,64,0,0,0,0,0,193,181,64,0,0,0,0,0,188,180,64,0,0,0,0,0,196,181,64,0,0,0,0,0,193,180,64,0,0,0,0,0,218,181,64,0,0,0,0,0,195,180,64,0,0,0,0,0,20,182,64,0,0,0,0,0,186,180,64,0,0,0,0,0,159,182,64,0,0,0,0,0,51,180,64,0,0,0,0,0,116,183,64,0,0,0,0,0,102,179,64,0,0,0,0,0,209,183,64,0,0,0,0,0,27,179,64,0,0,0,0,0,171,185,64,0,0,0,0,0,157,177,64,0,0,0,0,0,187,187,64,0,0,0,0,0,210,177,64,0,0,0,0,0,65,185,64,0,0,0,0,0,199,176,64,0,0,0,0,0,202,181,64,0,0,0,0,0,178,180,64,0,0,0,0,0,205,187,64,0,0,0,0,0,212,177,64,0,0,0,0,0,207,187,64,0,0,0,0,0,213,177,64,0,0,0,0,0,207,187,64,0,0,0,0,0,215,177,64,0,0,0,0,0,206,187,64,0,0,0,0,0,216,177,64,0,0,0,0,0,204,187,64,0,0,0,0,0,217,177,64,0,0,0,0,0,203,187,64,0,0,0,0,0,217,177,64,0,0,0,0,0,179,185,64,0,0,0,0,0,156,177,64,0,0,0,0,0,212,183,64,0,0,0,0,0,31,179,64,0,0,0,0,0,118,183,64,0,0,0,0,0,106,179,64,0,0,0,0,0,162,182,64,0,0,0,0,0,55,180,64,0,0,0,0,0,22,182,64,0,0,0,0,0,192,180,64,0,0,0,0,0,219,181,64,0,0,0,0,0,200,180,64,0,0,0,0,0,192,181,64,0,0,0,0,0,196,180,64,0,0,0,0,0,186,181,64,0,0,0,0,0,190,180,64,0,0,0,0,0,198,181,64,0,0,0,0,0,175,180,64,0,0,0,0,0,76,185,64,0,0,0,0,0,180,176,64,0,0,0,0,0,205,187,64,0,0,0,0,0,212,177,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,171,182,64,0,0,0,0,0,55,180,64,0,0,0,0,0,82,185,64,0,0,0,0,0,104,175,64,0,0,0,0,0,243,187,64,0,0,0,0,0,65,176,64,0,0,0,0,0,226,185,64,0,0,0,0,0,113,176,64,0,0,0,0,0,89,184,64,0,0,0,0,0,68,178,64,0,0,0,0,0,20,184,64,0,0,0,0,0,149,178,64,0,0,0,0,0,99,183,64,0,0,0,0,0,146,179,64,0,0,0,0,0,246,182,64,0,0,0,0,0,47,180,64,0,0,0,0,0,189,182,64,0,0,0,0,0,68,180,64,0,0,0,0,0,168,182,64,0,0,0,0,0,71,180,64,0,0,0,0,0,164,182,64,0,0,0,0,0,67,180,64,0,0,0,0,0,171,182,64,0,0,0,0,0,54,180,64,0,0,0,0,0,171,182,64,0,0,0,0,0,55,180,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,171,182,64,0,0,0,0,0,55,180,64,0,0,0,0,0,171,182,64,0,0,0,0,0,54,180,64,0,0,0,0,0,164,182,64,0,0,0,0,0,67,180,64,0,0,0,0,0,168,182,64,0,0,0,0,0,71,180,64,0,0,0,0,0,189,182,64,0,0,0,0,0,68,180,64,0,0,0,0,0,246,182,64,0,0,0,0,0,47,180,64,0,0,0,0,0,99,183,64,0,0,0,0,0,146,179,64,0,0,0,0,0,20,184,64,0,0,0,0,0,149,178,64,0,0,0,0,0,89,184,64,0,0,0,0,0,68,178,64,0,0,0,0,0,226,185,64,0,0,0,0,0,113,176,64,0,0,0,0,0,243,187,64,0,0,0,0,0,65,176,64,0,0,0,0,0,82,185,64,0,0,0,0,0,104,175,64,0,0,0,0,0,171,182,64,0,0,0,0,0,55,180,64,0,0,0,0,0,4,188,64,0,0,0,0,0,69,176,64,0,0,0,0,0,234,185,64,0,0,0,0,0,111,176,64,0,0,0,0,0,93,184,64,0,0,0,0,0,71,178,64,0,0,0,0,0,24,184,64,0,0,0,0,0,153,178,64,0,0,0,0,0,103,183,64,0,0,0,0,0,149,179,64,0,0,0,0,0,248,182,64,0,0,0,0,0,53,180,64,0,0,0,0,0,191,182,64,0,0,0,0,0,73,180,64,0,0,0,0,0,165,182,64,0,0,0,0,0,74,180,64,0,0,0,0,0,158,182,64,0,0,0,0,0,69,180,64,0,0,0,0,0,167,182,64,0,0,0,0,0,52,180,64,0,0,0,0,0,88,185,64,0,0,0,0,0,64,175,64,0,0,0,0,0,4,188,64,0,0,0,0,0,64,176,64,0,0,0,0,0,5,188,64,0,0,0,0,0,64,176,64,0,0,0,0,0,6,188,64,0,0,0,0,0,65,176,64,0,0,0,0,0,7,188,64,0,0,0,0,0,66,176,64,0,0,0,0,0,6,188,64,0,0,0,0,0,68,176,64,0,0,0,0,0,4,188,64,0,0,0,0,0,69,176,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,74,181,64,0,0,0,0,0,37,181,64,0,0,0,0,0,56,181,64,0,0,0,0,0,35,181,64,0,0,0,0,0,54,181,64,0,0,0,0,0,32,181,64,0,0,0,0,0,61,181,64,0,0,0,0,0,24,181,64,0,0,0,0,0,9,184,64,0,0,0,0,0,239,177,64,0,0,0,0,0,9,186,64,0,0,0,0,0,195,178,64,0,0,0,0,0,95,184,64,0,0,0,0,0,153,178,64,0,0,0,0,0,225,182,64,0,0,0,0,0,205,179,64,0,0,0,0,0,164,182,64,0,0,0,0,0,254,179,64,0,0,0,0,0,234,181,64,0,0,0,0,0,176,180,64,0,0,0,0,0,121,181,64,0,0,0,0,0,29,181,64,0,0,0,0,0,74,181,64,0,0,0,0,0,37,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,74,181,64,0,0,0,0,0,37,181,64,0,0,0,0,0,121,181,64,0,0,0,0,0,29,181,64,0,0,0,0,0,234,181,64,0,0,0,0,0,176,180,64,0,0,0,0,0,164,182,64,0,0,0,0,0,254,179,64,0,0,0,0,0,225,182,64,0,0,0,0,0,205,179,64,0,0,0,0,0,95,184,64,0,0,0,0,0,153,178,64,0,0,0,0,0,9,186,64,0,0,0,0,0,195,178,64,0,0,0,0,0,9,184,64,0,0,0,0,0,239,177,64,0,0,0,0,0,61,181,64,0,0,0,0,0,24,181,64,0,0,0,0,0,54,181,64,0,0,0,0,0,32,181,64,0,0,0,0,0,56,181,64,0,0,0,0,0,35,181,64,0,0,0,0,0,74,181,64,0,0,0,0,0,37,181,64,0,0,0,0,0,27,186,64,0,0,0,0,0,197,178,64,0,0,0,0,0,29,186,64,0,0,0,0,0,198,178,64,0,0,0,0,0,29,186,64,0,0,0,0,0,200,178,64,0,0,0,0,0,28,186,64,0,0,0,0,0,201,178,64,0,0,0,0,0,26,186,64,0,0,0,0,0,202,178,64,0,0,0,0,0,25,186,64,0,0,0,0,0,202,178,64,0,0,0,0,0,103,184,64,0,0,0,0,0,152,178,64,0,0,0,0,0,228,182,64,0,0,0,0,0,209,179,64,0,0,0,0,0,166,182,64,0,0,0,0,0,2,180,64,0,0,0,0,0,237,181,64,0,0,0,0,0,180,180,64,0,0,0,0,0,123,181,64,0,0,0,0,0,35,181,64,0,0,0,0,0,75,181,64,0,0,0,0,0,42,181,64,0,0,0,0,0,53,181,64,0,0,0,0,0,39,181,64,0,0,0,0,0,47,181,64,0,0,0,0,0,33,181,64,0,0,0,0,0,57,181,64,0,0,0,0,0,21,181,64,0,0,0,0,0,20,184,64,0,0,0,0,0,220,177,64,0,0,0,0,0,27,186,64,0,0,0,0,0,197,178,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,158,180,64,0,0,0,0,0,154,181,64,0,0,0,0,0,165,180,64,0,0,0,0,0,142,181,64,0,0,0,0,0,71,182,64,0,0,0,0,0,42,180,64,0,0,0,0,0,84,183,64,0,0,0,0,0,213,179,64,0,0,0,0,0,85,184,64,0,0,0,0,0,132,179,64,0,0,0,0,0,206,184,64,0,0,0,0,0,45,180,64,0,0,0,0,0,235,183,64,0,0,0,0,0,127,179,64,0,0,0,0,0,87,182,64,0,0,0,0,0,115,180,64,0,0,0,0,0,230,181,64,0,0,0,0,0,184,180,64,0,0,0,0,0,67,181,64,0,0,0,0,0,54,181,64,0,0,0,0,0,195,180,64,0,0,0,0,0,154,181,64,0,0,0,0,0,175,180,64,0,0,0,0,0,157,181,64,0,0,0,0,0,158,180,64,0,0,0,0,0,154,181,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,158,180,64,0,0,0,0,0,154,181,64,0,0,0,0,0,175,180,64,0,0,0,0,0,157,181,64,0,0,0,0,0,195,180,64,0,0,0,0,0,154,181,64,0,0,0,0,0,67,181,64,0,0,0,0,0,54,181,64,0,0,0,0,0,230,181,64,0,0,0,0,0,184,180,64,0,0,0,0,0,87,182,64,0,0,0,0,0,115,180,64,0,0,0,0,0,235,183,64,0,0,0,0,0,127,179,64,0,0,0,0,0,206,184,64,0,0,0,0,0,45,180,64,0,0,0,0,0,85,184,64,0,0,0,0,0,132,179,64,0,0,0,0,0,84,183,64,0,0,0,0,0,213,179,64,0,0,0,0,0,71,182,64,0,0,0,0,0,42,180,64,0,0,0,0,0,165,180,64,0,0,0,0,0,142,181,64,0,0,0,0,0,158,180,64,0,0,0,0,0,154,181,64,0,0,0,0,0,175,180,64,0,0,0,0,0,162,181,64,0,0,0,0,0,157,180,64,0,0,0,0,0,163,181,64,0,0,0,0,0,154,180,64,0,0,0,0,0,157,181,64,0,0,0,0,0,149,180,64,0,0,0,0,0,151,181,64,0,0,0,0,0,161,180,64,0,0,0,0,0,139,181,64,0,0,0,0,0,162,180,64,0,0,0,0,0,138,181,64,0,0,0,0,0,69,182,64,0,0,0,0,0,37,180,64,0,0,0,0,0,83,183,64,0,0,0,0,0,209,179,64,0,0,0,0,0,98,184,64,0,0,0,0,0,123,179,64,0,0,0,0,0,219,184,64,0,0,0,0,0,56,180,64,0,0,0,0,0,220,184,64,0,0,0,0,0,58,180,64,0,0,0,0,0,219,184,64,0,0,0,0,0,59,180,64,0,0,0,0,0,217,184,64,0,0,0,0,0,60,180,64,0,0,0,0,0,216,184,64,0,0,0,0,0,59,180,64,0,0,0,0,0,215,184,64,0,0,0,0,0,59,180,64,0,0,0,0,0,245,183,64,0,0,0,0,0,127,179,64,0,0,0,0,0,90,182,64,0,0,0,0,0,119,180,64,0,0,0,0,0,232,181,64,0,0,0,0,0,188,180,64,0,0,0,0,0,70,181,64,0,0,0,0,0,58,181,64,0,0,0,0,0,196,180,64,0,0,0,0,0,160,181,64,0,0,0,0,0,176,180,64,0,0,0,0,0,162,181,64,0,0,0,0,0,175,180,64,0,0,0,0,0,162,181,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,186,64,0,0,0,0,0,249,178,64,0,0,0,0,0,16,186,64,0,0,0,0,0,241,178,64,0,0,0,0,0,34,186,64,0,0,0,0,0,238,178,64,0,0,0,0,0,188,187,64,0,0,0,0,0,56,178,64,0,0,0,0,0,180,189,64,0,0,0,0,0,95,177,64,0,0,0,0,0,89,191,64,0,0,0,0,0,198,176,64,0,0,0,0,128,198,193,64,0,0,0,0,0,120,174,64,0,0,0,0,128,207,194,64,0,0,0,0,0,128,174,64,0,0,0,0,0,86,193,64,0,0,0,0,0,190,174,64,0,0,0,0,0,19,186,64,0,0,0,0,0,11,179,64,0,0,0,0,0,9,186,64,0,0,0,0,0,0,179,64,0,0,0,0,0,12,186,64,0,0,0,0,0,249,178,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,12,186,64,0,0,0,0,0,249,178,64,0,0,0,0,0,9,186,64,0,0,0,0,0,0,179,64,0,0,0,0,0,19,186,64,0,0,0,0,0,11,179,64,0,0,0,0,0,86,193,64,0,0,0,0,0,190,174,64,0,0,0,0,128,207,194,64,0,0,0,0,0,128,174,64,0,0,0,0,128,198,193,64,0,0,0,0,0,120,174,64,0,0,0,0,0,89,191,64,0,0,0,0,0,198,176,64,0,0,0,0,0,180,189,64,0,0,0,0,0,95,177,64,0,0,0,0,0,188,187,64,0,0,0,0,0,56,178,64,0,0,0,0,0,34,186,64,0,0,0,0,0,238,178,64,0,0,0,0,0,16,186,64,0,0,0,0,0,241,178,64,0,0,0,0,0,12,186,64,0,0,0,0,0,249,178,64,0,0,0,0,0,7,195,64,0,0,0,0,0,130,174,64,0,0,0,0,128,6,195,64,0,0,0,0,0,134,174,64,0,0,0,0,128,6,195,64,0,0,0,0,0,138,174,64,0,0,0,0,128,7,195,64,0,0,0,0,0,140,174,64,0,0,0,0,0,174,193,64,0,0,0,0,0,50,174,64,0,0,0,0,0,19,186,64,0,0,0,0,0,17,179,64,0,0,0,0,0,18,186,64,0,0,0,0,0,17,179,64,0,0,0,0,0,16,186,64,0,0,0,0,0,16,179,64,0,0,0,0,0,3,186,64,0,0,0,0,0,1,179,64,0,0,0,0,0,8,186,64,0,0,0,0,0,247,178,64,0,0,0,0,0,11,186,64,0,0,0,0,0,237,178,64,0,0,0,0,0,32,186,64,0,0,0,0,0,233,178,64,0,0,0,0,0,186,187,64,0,0,0,0,0,51,178,64,0,0,0,0,0,178,189,64,0,0,0,0,0,89,177,64,0,0,0,0,0,87,191,64,0,0,0,0,0,193,176,64,0,0,0,0,128,2,194,64,0,0,0,0,0,20,174,64,0,0,0,0,128,7,195,64,0,0,0,0,0,130,174,64,0,0,0,0,0,7,195,64,0,0,0,0,0,130,174,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,45,184,64,0,0,0,0,0,78,184,64,0,0,0,0,0,135,184,64,0,0,0,0,0,187,184,64,0,0,0,0,0,6,184,64,0,0,0,0,0,183,185,64,0,0,0,0,0,85,184,64,0,0,0,0,0,227,184,64,0,0,0,0,0,56,184,64,0,0,0,0,0,122,184,64,0,0,0,0,0,24,184,64,0,0,0,0,0,6,184,64,0,0,0,0,0,120,183,64,0,0,0,0,0,18,184,64,0,0,0,0,0,118,183,64,0,0,0,0,0,3,184,64,0,0,0,0,0,125,183,64,0,0,0,0,0,255,183,64,0,0,0,0,0,148,183,64,0,0,0,0,0,3,184,64,0,0,0,0,0,149,183,64,0,0,0,0,0,3,184,64,0,0,0,0,0,213,183,64,0,0,0,0,0,20,184,64,0,0,0,0,0,15,184,64,0,0,0,0,0,41,184,64,0,0,0,0,0,45,184,64,0,0,0,0,0,78,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,45,184,64,0,0,0,0,0,78,184,64,0,0,0,0,0,15,184,64,0,0,0,0,0,41,184,64,0,0,0,0,0,213,183,64,0,0,0,0,0,20,184,64,0,0,0,0,0,149,183,64,0,0,0,0,0,3,184,64,0,0,0,0,0,148,183,64,0,0,0,0,0,3,184,64,0,0,0,0,0,125,183,64,0,0,0,0,0,255,183,64,0,0,0,0,0,118,183,64,0,0,0,0,0,3,184,64,0,0,0,0,0,120,183,64,0,0,0,0,0,18,184,64,0,0,0,0,0,24,184,64,0,0,0,0,0,6,184,64,0,0,0,0,0,56,184,64,0,0,0,0,0,122,184,64,0,0,0,0,0,85,184,64,0,0,0,0,0,227,184,64,0,0,0,0,0,6,184,64,0,0,0,0,0,183,185,64,0,0,0,0,0,135,184,64,0,0,0,0,0,187,184,64,0,0,0,0,0,45,184,64,0,0,0,0,0,78,184,64,0,0,0,0,0,215,183,64,0,0,0,0,0,15,184,64,0,0,0,0,0,19,184,64,0,0,0,0,0,37,184,64,0,0,0,0,0,49,184,64,0,0,0,0,0,75,184,64,0,0,0,0,0,148,184,64,0,0,0,0,0,193,184,64,0,0,0,0,0,249,183,64,0,0,0,0,0,218,185,64,0,0,0,0,0,248,183,64,0,0,0,0,0,221,185,64,0,0,0,0,0,247,183,64,0,0,0,0,0,221,185,64,0,0,0,0,0,246,183,64,0,0,0,0,0,223,185,64,0,0,0,0,0,244,183,64,0,0,0,0,0,223,185,64,0,0,0,0,0,243,183,64,0,0,0,0,0,221,185,64,0,0,0,0,0,243,183,64,0,0,0,0,0,219,185,64,0,0,0,0,0,82,184,64,0,0,0,0,0,236,184,64,0,0,0,0,0,51,184,64,0,0,0,0,0,123,184,64,0,0,0,0,0,19,184,64,0,0,0,0,0,11,184,64,0,0,0,0,0,117,183,64,0,0,0,0,0,23,184,64,0,0,0,0,0,116,183,64,0,0,0,0,0,22,184,64,0,0,0,0,0,115,183,64,0,0,0,0,0,21,184,64,0,0,0,0,0,112,183,64,0,0,0,0,0,0,184,64,0,0,0,0,0,122,183,64,0,0,0,0,0,251,183,64,0,0,0,0,0,150,183,64,0,0,0,0,0,254,183,64,0,0,0,0,0,215,183,64,0,0,0,0,0,15,184,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,177,184,64,0,0,0,0,0,253,183,64,0,0,0,0,0,251,184,64,0,0,0,0,0,34,184,64,0,0,0,0,0,57,185,64,0,0,0,0,0,103,184,64,0,0,0,0,0,241,185,64,0,0,0,0,0,50,185,64,0,0,0,0,0,16,186,64,0,0,0,0,0,249,186,64,0,0,0,0,0,127,185,64,0,0,0,0,0,220,183,64,0,0,0,0,0,72,184,64,0,0,0,0,0,242,183,64,0,0,0,0,0,70,184,64,0,0,0,0,0,227,183,64,0,0,0,0,0,77,184,64,0,0,0,0,0,223,183,64,0,0,0,0,0,100,184,64,0,0,0,0,0,227,183,64,0,0,0,0,0,177,184,64,0,0,0,0,0,254,183,64,0,0,0,0,0,177,184,64,0,0,0,0,0,253,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,177,184,64,0,0,0,0,0,253,183,64,0,0,0,0,0,177,184,64,0,0,0,0,0,254,183,64,0,0,0,0,0,100,184,64,0,0,0,0,0,227,183,64,0,0,0,0,0,77,184,64,0,0,0,0,0,223,183,64,0,0,0,0,0,70,184,64,0,0,0,0,0,227,183,64,0,0,0,0,0,72,184,64,0,0,0,0,0,242,183,64,0,0,0,0,0,127,185,64,0,0,0,0,0,220,183,64,0,0,0,0,0,16,186,64,0,0,0,0,0,249,186,64,0,0,0,0,0,241,185,64,0,0,0,0,0,50,185,64,0,0,0,0,0,57,185,64,0,0,0,0,0,103,184,64,0,0,0,0,0,251,184,64,0,0,0,0,0,34,184,64,0,0,0,0,0,177,184,64,0,0,0,0,0,253,183,64,0,0,0,0,0,24,186,64,0,0,0,0,0,36,187,64,0,0,0,0,0,23,186,64,0,0,0,0,0,38,187,64,0,0,0,0,0,22,186,64,0,0,0,0,0,39,187,64,0,0,0,0,0,20,186,64,0,0,0,0,0,38,187,64,0,0,0,0,0,19,186,64,0,0,0,0,0,37,187,64,0,0,0,0,0,19,186,64,0,0,0,0,0,36,187,64,0,0,0,0,0,131,185,64,0,0,0,0,0,223,183,64,0,0,0,0,0,69,184,64,0,0,0,0,0,247,183,64,0,0,0,0,0,68,184,64,0,0,0,0,0,246,183,64,0,0,0,0,0,67,184,64,0,0,0,0,0,245,183,64,0,0,0,0,0,64,184,64,0,0,0,0,0,224,183,64,0,0,0,0,0,74,184,64,0,0,0,0,0,219,183,64,0,0,0,0,0,82,184,64,0,0,0,0,0,213,183,64,0,0,0,0,0,102,184,64,0,0,0,0,0,222,183,64,0,0,0,0,0,179,184,64,0,0,0,0,0,249,183,64,0,0,0,0,0,255,184,64,0,0,0,0,0,30,184,64,0,0,0,0,0,61,185,64,0,0,0,0,0,100,184,64,0,0,0,0,0,254,185,64,0,0,0,0,0,58,185,64,0,0,0,0,0,24,186,64,0,0,0,0,0,36,187,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,84,185,64,0,0,0,0,0,224,183,64,0,0,0,0,0,199,185,64,0,0,0,0,0,4,184,64,0,0,0,0,0,60,186,64,0,0,0,0,0,67,184,64,0,0,0,0,0,158,187,64,0,0,0,0,0,1,185,64,0,0,0,0,0,189,188,64,0,0,0,0,0,128,186,64,0,0,0,0,0,10,186,64,0,0,0,0,0,188,183,64,0,0,0,0,0,208,184,64,0,0,0,0,0,210,183,64,0,0,0,0,0,206,184,64,0,0,0,0,0,195,183,64,0,0,0,0,0,213,184,64,0,0,0,0,0,191,183,64,0,0,0,0,0,236,184,64,0,0,0,0,0,195,183,64,0,0,0,0,0,237,184,64,0,0,0,0,0,195,183,64,0,0,0,0,0,85,185,64,0,0,0,0,0,224,183,64,0,0,0,0,0,84,185,64,0,0,0,0,0,224,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,84,185,64,0,0,0,0,0,224,183,64,0,0,0,0,0,85,185,64,0,0,0,0,0,224,183,64,0,0,0,0,0,237,184,64,0,0,0,0,0,195,183,64,0,0,0,0,0,236,184,64,0,0,0,0,0,195,183,64,0,0,0,0,0,213,184,64,0,0,0,0,0,191,183,64,0,0,0,0,0,206,184,64,0,0,0,0,0,195,183,64,0,0,0,0,0,208,184,64,0,0,0,0,0,210,183,64,0,0,0,0,0,10,186,64,0,0,0,0,0,188,183,64,0,0,0,0,0,189,188,64,0,0,0,0,0,128,186,64,0,0,0,0,0,158,187,64,0,0,0,0,0,1,185,64,0,0,0,0,0,60,186,64,0,0,0,0,0,67,184,64,0,0,0,0,0,199,185,64,0,0,0,0,0,4,184,64,0,0,0,0,0,84,185,64,0,0,0,0,0,224,183,64,0,0,0,0,0,215,188,64,0,0,0,0,0,155,186,64,0,0,0,0,0,216,188,64,0,0,0,0,0,157,186,64,0,0,0,0,0,215,188,64,0,0,0,0,0,158,186,64,0,0,0,0,0,213,188,64,0,0,0,0,0,159,186,64,0,0,0,0,0,211,188,64,0,0,0,0,0,158,186,64,0,0,0,0,0,12,186,64,0,0,0,0,0,191,183,64,0,0,0,0,0,205,184,64,0,0,0,0,0,215,183,64,0,0,0,0,0,204,184,64,0,0,0,0,0,214,183,64,0,0,0,0,0,203,184,64,0,0,0,0,0,213,183,64,0,0,0,0,0,200,184,64,0,0,0,0,0,192,183,64,0,0,0,0,0,210,184,64,0,0,0,0,0,187,183,64,0,0,0,0,0,238,184,64,0,0,0,0,0,190,183,64,0,0,0,0,0,86,185,64,0,0,0,0,0,219,183,64,0,0,0,0,0,201,185,64,0,0,0,0,0,0,184,64,0,0,0,0,0,62,186,64,0,0,0,0,0,63,184,64,0,0,0,0,0,175,187,64,0,0,0,0,0,4,185,64,0,0,0,0,0,215,188,64,0,0,0,0,0,155,186,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131,185,64,0,0,0,0,0,150,183,64,0,0,0,0,0,227,185,64,0,0,0,0,0,159,183,64,0,0,0,0,0,81,186,64,0,0,0,0,0,177,183,64,0,0,0,0,0,205,186,64,0,0,0,0,0,225,183,64,0,0,0,0,0,73,188,64,0,0,0,0,0,115,184,64,0,0,0,0,0,11,190,64,0,0,0,0,0,253,185,64,0,0,0,0,0,154,186,64,0,0,0,0,0,106,183,64,0,0,0,0,0,103,185,64,0,0,0,0,0,168,183,64,0,0,0,0,0,100,185,64,0,0,0,0,0,154,183,64,0,0,0,0,0,106,185,64,0,0,0,0,0,150,183,64,0,0,0,0,0,113,185,64,0,0,0,0,0,144,183,64,0,0,0,0,0,131,185,64,0,0,0,0,0,150,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,131,185,64,0,0,0,0,0,150,183,64,0,0,0,0,0,113,185,64,0,0,0,0,0,144,183,64,0,0,0,0,0,106,185,64,0,0,0,0,0,150,183,64,0,0,0,0,0,100,185,64,0,0,0,0,0,154,183,64,0,0,0,0,0,103,185,64,0,0,0,0,0,168,183,64,0,0,0,0,0,154,186,64,0,0,0,0,0,106,183,64,0,0,0,0,0,11,190,64,0,0,0,0,0,253,185,64,0,0,0,0,0,73,188,64,0,0,0,0,0,115,184,64,0,0,0,0,0,205,186,64,0,0,0,0,0,225,183,64,0,0,0,0,0,81,186,64,0,0,0,0,0,177,183,64,0,0,0,0,0,227,185,64,0,0,0,0,0,159,183,64,0,0,0,0,0,131,185,64,0,0,0,0,0,150,183,64,0,0,0,0,0,61,190,64,0,0,0,0,0,34,186,64,0,0,0,0,0,62,190,64,0,0,0,0,0,36,186,64,0,0,0,0,0,61,190,64,0,0,0,0,0,38,186,64,0,0,0,0,0,60,190,64,0,0,0,0,0,39,186,64,0,0,0,0,0,58,190,64,0,0,0,0,0,38,186,64,0,0,0,0,0,159,186,64,0,0,0,0,0,108,183,64,0,0,0,0,0,102,185,64,0,0,0,0,0,174,183,64,0,0,0,0,0,100,185,64,0,0,0,0,0,173,183,64,0,0,0,0,0,99,185,64,0,0,0,0,0,172,183,64,0,0,0,0,0,94,185,64,0,0,0,0,0,152,183,64,0,0,0,0,0,103,185,64,0,0,0,0,0,146,183,64,0,0,0,0,0,132,185,64,0,0,0,0,0,145,183,64,0,0,0,0,0,228,185,64,0,0,0,0,0,154,183,64,0,0,0,0,0,83,186,64,0,0,0,0,0,171,183,64,0,0,0,0,0,207,186,64,0,0,0,0,0,220,183,64,0,0,0,0,0,95,188,64,0,0,0,0,0,118,184,64,0,0,0,0,0,61,190,64,0,0,0,0,0,34,186,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,83,186,64,0,0,0,0,0,62,183,64,0,0,0,0,0,186,186,64,0,0,0,0,0,83,183,64,0,0,0,0,0,106,186,64,0,0,0,0,0,70,183,64,0,0,0,0,0,56,186,64,0,0,0,0,0,80,183,64,0,0,0,0,0,53,186,64,0,0,0,0,0,66,183,64,0,0,0,0,0,59,186,64,0,0,0,0,0,62,183,64,0,0,0,0,0,65,186,64,0,0,0,0,0,56,183,64,0,0,0,0,0,83,186,64,0,0,0,0,0,62,183,64,0,0,0,0,0,79,188,64,0,0,0,0,0,203,183,64,0,0,0,0,0,154,190,64,0,0,0,0,0,160,184,64,0,0,0,0,0,132,192,64,0,0,0,0,0,61,186,64,0,0,0,0,0,45,189,64,0,0,0,0,0,15,184,64,0,0,0,0,0,102,187,64,0,0,0,0,0,126,183,64,0,0,0,0,0,216,187,64,0,0,0,0,0,159,183,64,0,0,0,0,0,79,188,64,0,0,0,0,0,203,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,55,186,64,0,0,0,0,0,86,183,64,0,0,0,0,0,53,186,64,0,0,0,0,0,85,183,64,0,0,0,0,0,52,186,64,0,0,0,0,0,84,183,64,0,0,0,0,0,46,186,64,0,0,0,0,0,64,183,64,0,0,0,0,0,55,186,64,0,0,0,0,0,58,183,64,0,0,0,0,0,84,186,64,0,0,0,0,0,57,183,64,0,0,0,0,0,229,186,64,0,0,0,0,0,87,183,64,0,0,0,0,0,148,187,64,0,0,0,0,0,128,183,64,0,0,0,0,0,81,188,64,0,0,0,0,0,198,183,64,0,0,0,0,0,180,190,64,0,0,0,0,0,164,184,64,0,0,0,0,128,158,192,64,0,0,0,0,0,90,186,64,0,0,0,0,0,159,192,64,0,0,0,0,0,92,186,64,0,0,0,0,128,158,192,64,0,0,0,0,0,94,186,64,0,0,0,0,0,158,192,64,0,0,0,0,0,95,186,64,0,0,0,0,0,157,192,64,0,0,0,0,0,94,186,64,0,0,0,0,128,155,192,64,0,0,0,0,0,92,186,64,0,0,0,0,0,111,187,64,0,0,0,0,0,20,183,64,0,0,0,0,0,55,186,64,0,0,0,0,0,86,183,64,0,0,0,0,0,83,186,64,0,0,0,0,0,62,183,64,0,0,0,0,0,65,186,64,0,0,0,0,0,56,183,64,0,0,0,0,0,59,186,64,0,0,0,0,0,62,183,64,0,0,0,0,0,53,186,64,0,0,0,0,0,66,183,64,0,0,0,0,0,56,186,64,0,0,0,0,0,80,183,64,0,0,0,0,0,106,186,64,0,0,0,0,0,70,183,64,0,0,0,0,0,186,186,64,0,0,0,0,0,83,183,64,0,0,0,0,0,83,186,64,0,0,0,0,0,62,183,64,0,0,0,0,0,79,188,64,0,0,0,0,0,203,183,64,0,0,0,0,0,216,187,64,0,0,0,0,0,159,183,64,0,0,0,0,0,102,187,64,0,0,0,0,0,126,183,64,0,0,0,0,0,45,189,64,0,0,0,0,0,15,184,64,0,0,0,0,0,132,192,64,0,0,0,0,0,61,186,64,0,0,0,0,0,154,190,64,0,0,0,0,0,160,184,64,0,0,0,0,0,79,188,64,0,0,0,0,0,203,183,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,181,189,64,0,0,0,0,0,149,184,64,0,0,0,0,0,6,187,64,0,0,0,0,0,192,182,64,0,0,0,0,0,16,183,64,0,0,0,0,0,106,182,64,0,0,0,0,0,14,183,64,0,0,0,0,0,91,182,64,0,0,0,0,0,21,183,64,0,0,0,0,0,87,182,64,0,0,0,0,0,44,183,64,0,0,0,0,0,91,182,64,0,0,0,0,0,45,183,64,0,0,0,0,0,91,182,64,0,0,0,0,0,241,183,64,0,0,0,0,0,116,182,64,0,0,0,0,0,221,184,64,0,0,0,0,0,149,182,64,0,0,0,0,0,174,185,64,0,0,0,0,0,198,182,64,0,0,0,0,0,62,188,64,0,0,0,0,0,96,183,64,0,0,0,0,0,181,189,64,0,0,0,0,0,149,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,181,189,64,0,0,0,0,0,149,184,64,0,0,0,0,0,62,188,64,0,0,0,0,0,96,183,64,0,0,0,0,0,174,185,64,0,0,0,0,0,198,182,64,0,0,0,0,0,221,184,64,0,0,0,0,0,149,182,64,0,0,0,0,0,241,183,64,0,0,0,0,0,116,182,64,0,0,0,0,0,45,183,64,0,0,0,0,0,91,182,64,0,0,0,0,0,44,183,64,0,0,0,0,0,91,182,64,0,0,0,0,0,21,183,64,0,0,0,0,0,87,182,64,0,0,0,0,0,14,183,64,0,0,0,0,0,91,182,64,0,0,0,0,0,16,183,64,0,0,0,0,0,106,182,64,0,0,0,0,0,6,187,64,0,0,0,0,0,192,182,64,0,0,0,0,0,181,189,64,0,0,0,0,0,149,184,64,0,0,0,0,0,223,189,64,0,0,0,0,0,178,184,64,0,0,0,0,0,224,189,64,0,0,0,0,0,180,184,64,0,0,0,0,0,223,189,64,0,0,0,0,0,182,184,64,0,0,0,0,0,222,189,64,0,0,0,0,0,183,184,64,0,0,0,0,0,220,189,64,0,0,0,0,0,182,184,64,0,0,0,0,0,34,187,64,0,0,0,0,0,199,182,64,0,0,0,0,0,13,183,64,0,0,0,0,0,111,182,64,0,0,0,0,0,12,183,64,0,0,0,0,0,110,182,64,0,0,0,0,0,11,183,64,0,0,0,0,0,109,182,64,0,0,0,0,0,8,183,64,0,0,0,0,0,88,182,64,0,0,0,0,0,18,183,64,0,0,0,0,0,83,182,64,0,0,0,0,0,46,183,64,0,0,0,0,0,86,182,64,0,0,0,0,0,242,183,64,0,0,0,0,0,111,182,64,0,0,0,0,0,223,184,64,0,0,0,0,0,143,182,64,0,0,0,0,0,175,185,64,0,0,0,0,0,193,182,64,0,0,0,0,0,99,188,64,0,0,0,0,0,100,183,64,0,0,0,0,0,223,189,64,0,0,0,0,0,178,184,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63])
.concat([0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,101,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,205,182,64,0,0,0,0,0,200,182,64,0,0,0,0,0,204,182,64,0,0,0,0,0,200,182,64,0,0,0,0,0,63,183,64,0,0,0,0,0,236,182,64,0,0,0,0,0,180,183,64,0,0,0,0,0,43,183,64,0,0,0,0,0,22,185,64,0,0,0,0,0,233,183,64,0,0,0,0,0,53,186,64,0,0,0,0,0,104,185,64,0,0,0,0,0,130,183,64,0,0,0,0,0,164,182,64,0,0,0,0,0,72,182,64,0,0,0,0,0,186,182,64,0,0,0,0,0,70,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,77,182,64,0,0,0,0,0,167,182,64,0,0,0,0,0,100,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,101,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,101,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,100,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,77,182,64,0,0,0,0,0,167,182,64,0,0,0,0,0,70,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,72,182,64,0,0,0,0,0,186,182,64,0,0,0,0,0,130,183,64,0,0,0,0,0,164,182,64,0,0,0,0,0,53,186,64,0,0,0,0,0,104,185,64,0,0,0,0,0,22,185,64,0,0,0,0,0,233,183,64,0,0,0,0,0,180,183,64,0,0,0,0,0,43,183,64,0,0,0,0,0,63,183,64,0,0,0,0,0,236,182,64,0,0,0,0,0,204,182,64,0,0,0,0,0,200,182,64,0,0,0,0,0,205,182,64,0,0,0,0,0,200,182,64,0,0,0,0,0,101,182,64,0,0,0,0,0,171,182,64,0,0,0,0,0,79,186,64,0,0,0,0,0,131,185,64,0,0,0,0,0,80,186,64,0,0,0,0,0,133,185,64,0,0,0,0,0,79,186,64,0,0,0,0,0,134,185,64,0,0,0,0,0,77,186,64,0,0,0,0,0,135,185,64,0,0,0,0,0,75,186,64,0,0,0,0,0,134,185,64,0,0,0,0,0,132,183,64,0,0,0,0,0,167,182,64,0,0,0,0,0,69,182,64,0,0,0,0,0,191,182,64,0,0,0,0,0,68,182,64,0,0,0,0,0,190,182,64,0,0,0,0,0,67,182,64,0,0,0,0,0,189,182,64,0,0,0,0,0,64,182,64,0,0,0,0,0,168,182,64,0,0,0,0,0,74,182,64,0,0,0,0,0,163,182,64,0,0,0,0,0,102,182,64,0,0,0,0,0,166,182,64,0,0,0,0,0,206,182,64,0,0,0,0,0,195,182,64,0,0,0,0,0,65,183,64,0,0,0,0,0,232,182,64,0,0,0,0,0,182,183,64,0,0,0,0,0,39,183,64,0,0,0,0,0,39,185,64,0,0,0,0,0,236,183,64,0,0,0,0,0,79,186,64,0,0,0,0,0,131,185,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,18,187,64,0,0,0,0,0,226,182,64,0,0,0,0,0,42,187,64,0,0,0,0,0,224,182,64,0,0,0,0,0,190,187,64,0,0,0,0,0,243,182,64,0,0,0,0,0,113,188,64,0,0,0,0,0,17,183,64,0,0,0,0,0,49,189,64,0,0,0,0,0,71,183,64,0,0,0,0,0,141,191,64,0,0,0,0,0,241,183,64,0,0,0,0,0,15,193,64,0,0,0,0,0,100,185,64,0,0,0,0,0,57,188,64,0,0,0,0,0,203,182,64,0,0,0,0,0,17,187,64,0,0,0,0,0,244,182,64,0,0,0,0,0,13,187,64,0,0,0,0,0,231,182,64,0,0,0,0,0,18,187,64,0,0,0,0,0,226,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,187,64,0,0,0,0,0,250,182,64,0,0,0,0,0,14,187,64,0,0,0,0,0,249,182,64,0,0,0,0,0,13,187,64,0,0,0,0,0,248,182,64,0,0,0,0,0,6,187,64,0,0,0,0,0,229,182,64,0,0,0,0,0,15,187,64,0,0,0,0,0,222,182,64,0,0,0,0,0,43,187,64,0,0,0,0,0,219,182,64,0,0,0,0,0,191,187,64,0,0,0,0,0,238,182,64,0,0,0,0,0,113,188,64,0,0,0,0,0,11,183,64,0,0,0,0,0,50,189,64,0,0,0,0,0,66,183,64,0,0,0,0,0,160,191,64,0,0,0,0,0,241,183,64,0,0,0,0,0,35,193,64,0,0,0,0,0,118,185,64,0,0,0,0,0,37,193,64,0,0,0,0,0,120,185,64,0,0,0,0,0,38,193,64,0,0,0,0,0,122,185,64,0,0,0,0,128,37,193,64,0,0,0,0,0,123,185,64,0,0,0,0,0,37,193,64,0,0,0,0,0,125,185,64,0,0,0,0,0,36,193,64,0,0,0,0,0,125,185,64,0,0,0,0,0,55,188,64,0,0,0,0,0,205,182,64,0,0,0,0,0,16,187,64,0,0,0,0,0,250,182,64,0,0,0,0,0,18,187,64,0,0,0,0,0,226,182,64,0,0,0,0,0,13,187,64,0,0,0,0,0,231,182,64,0,0,0,0,0,17,187,64,0,0,0,0,0,244,182,64,0,0,0,0,0,57,188,64,0,0,0,0,0,203,182,64,0,0,0,0,0,15,193,64,0,0,0,0,0,100,185,64,0,0,0,0,0,141,191,64,0,0,0,0,0,241,183,64,0,0,0,0,0,49,189,64,0,0,0,0,0,71,183,64,0,0,0,0,0,113,188,64,0,0,0,0,0,17,183,64,0,0,0,0,0,190,187,64,0,0,0,0,0,243,182,64,0,0,0,0,0,42,187,64,0,0,0,0,0,224,182,64,0,0,0,0,0,18,187,64,0,0,0,0,0,226,182,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,210,187,64,0,0,0,0,0,176,182,64,0,0,0,0,0,102,188,64,0,0,0,0,0,195,182,64,0,0,0,0,0,25,189,64,0,0,0,0,0,225,182,64,0,0,0,0,0,217,189,64,0,0,0,0,0,23,183,64,0,0,0,0,128,25,192,64,0,0,0,0,0,192,183,64,0,0,0,0,128,97,193,64,0,0,0,0,0,50,185,64,0,0,0,0,0,236,188,64,0,0,0,0,0,147,182,64,0,0,0,0,0,185,187,64,0,0,0,0,0,196,182,64,0,0,0,0,0,181,187,64,0,0,0,0,0,183,182,64,0,0,0,0,0,186,187,64,0,0,0,0,0,178,182,64,0,0,0,0,0,210,187,64,0,0,0,0,0,176,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,183,187,64,0,0,0,0,0,174,182,64,0,0,0,0,0,211,187,64,0,0,0,0,0,171,182,64,0,0,0,0,0,103,188,64,0,0,0,0,0,190,182,64,0,0,0,0,0,25,189,64,0,0,0,0,0,219,182,64,0,0,0,0,0,218,189,64,0,0,0,0,0,18,183,64,0,0,0,0,0,36,192,64,0,0,0,0,0,193,183,64,0,0,0,0,0,119,193,64,0,0,0,0,0,70,185,64,0,0,0,0,0,121,193,64,0,0,0,0,0,72,185,64,0,0,0,0,0,122,193,64,0,0,0,0,0,74,185,64,0,0,0,0,128,121,193,64,0,0,0,0,0,75,185,64,0,0,0,0,0,121,193,64,0,0,0,0,0,77,185,64,0,0,0,0,0,120,193,64,0,0,0,0,0,77,185,64,0,0,0,0,0,235,188,64,0,0,0,0,0,149,182,64,0,0,0,0,0,184,187,64,0,0,0,0,0,202,182,64,0,0,0,0,0,182,187,64,0,0,0,0,0,201,182,64,0,0,0,0,0,181,187,64,0,0,0,0,0,200,182,64,0,0,0,0,0,174,187,64,0,0,0,0,0,181,182,64,0,0,0,0,0,183,187,64,0,0,0,0,0,174,182,64,0,0,0,0,0,210,187,64,0,0,0,0,0,176,182,64,0,0,0,0,0,186,187,64,0,0,0,0,0,178,182,64,0,0,0,0,0,181,187,64,0,0,0,0,0,183,182,64,0,0,0,0,0,185,187,64,0,0,0,0,0,196,182,64,0,0,0,0,0,236,188,64,0,0,0,0,0,147,182,64,0,0,0,0,128,97,193,64,0,0,0,0,0,50,185,64,0,0,0,0,128,25,192,64,0,0,0,0,0,192,183,64,0,0,0,0,0,217,189,64,0,0,0,0,0,23,183,64,0,0,0,0,0,25,189,64,0,0,0,0,0,225,182,64,0,0,0,0,0,102,188,64,0,0,0,0,0,195,182,64,0,0,0,0,0,210,187,64,0,0,0,0,0,176,182,64,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,66,191,64,0,0,0,0,0,211,182,64,0,0,0,0,0,64,193,64,0,0,0,0,0,158,183,64,0,0,0,0,0,77,195,64,0,0,0,0,0,41,185,64,0,0,0,0,0,172,189,64,0,0,0,0,0,48,182,64,0,0,0,0,0,121,188,64,0,0,0,0,0,96,182,64,0,0,0,0,0,117,188,64,0,0,0,0,0,83,182,64,0,0,0,0,0,122,188,64,0,0,0,0,0,78,182,64,0,0,0,0,0,146,188,64,0,0,0,0,0,76,182,64,0,0,0,0,0,74,189,64,0,0,0,0,0,104,182,64,0,0,0,0,0,66,191,64,0,0,0,0,0,211,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,66,191,64,0,0,0,0,0,211,182,64,0,0,0,0,0,74,189,64,0,0,0,0,0,104,182,64,0,0,0,0,0,146,188,64,0,0,0,0,0,76,182,64,0,0,0,0,0,122,188,64,0,0,0,0,0,78,182,64,0,0,0,0,0,117,188,64,0,0,0,0,0,83,182,64,0,0,0,0,0,121,188,64,0,0,0,0,0,96,182,64,0,0,0,0,0,172,189,64,0,0,0,0,0,48,182,64,0,0,0,0,0,77,195,64,0,0,0,0,0,41,185,64,0,0,0,0,0,64,193,64,0,0,0,0,0,158,183,64,0,0,0,0,0,66,191,64,0,0,0,0,0,211,182,64,0,0,0,0,0,120,188,64,0,0,0,0,0,102,182,64,0,0,0,0,0,118,188,64,0,0,0,0,0,101,182,64,0,0,0,0,0,117,188,64,0,0,0,0,0,100,182,64,0,0,0,0,0,110,188,64,0,0,0,0,0,81,182,64,0,0,0,0,0,119,188,64,0,0,0,0,0,74,182,64,0,0,0,0,0,147,188,64,0,0,0,0,0,71,182,64,0,0,0,0,0,75,189,64,0,0,0,0,0,99,182,64,0,0,0,0,0,67,191,64,0,0,0,0,0,206,182,64,0,0,0,0,128,89,193,64,0,0,0,0,0,165,183,64,0,0,0,0,0,141,195,64,0,0,0,0,0,84,185,64,0,0,0,0,0,142,195,64,0,0,0,0,0,85,185,64,0,0,0,0,0,142,195,64,0,0,0,0,0,87,185,64,0,0,0,0,0,141,195,64,0,0,0,0,0,88,185,64,0,0,0,0,0,140,195,64,0,0,0,0,0,89,185,64,0,0,0,0,0,171,189,64,0,0,0,0,0,49,182,64,0,0,0,0,0,120,188,64,0,0,0,0,0,102,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21,180,64,0,0,0,0,0,4,183,64,0,0,0,0,0,253,179,64,0,0,0,0,0,36,183,64,0,0,0,0,0,205,179,64,0,0,0,0,0,20,183,64,0,0,0,0,0,197,179,64,0,0,0,0,0,236,182,64,0,0,0,0,0,45,180,64,0,0,0,0,0,228,182,64,0,0,0,0,0,21,180,64,0,0,0,0,0,4,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,125,182,64,0,0,0,0,0,28,184,64,0,0,0,0,0,101,182,64,0,0,0,0,0,60,184,64,0,0,0,0,0,53,182,64,0,0,0,0,0,44,184,64,0,0,0,0,0,45,182,64,0,0,0,0,0,4,184,64,0,0,0,0,0,149,182,64,0,0,0,0,0,252,183,64,0,0,0,0,0,125,182,64,0,0,0,0,0,28,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,205,181,64,0,0,0,0,0,20,184,64,0,0,0,0,0,181,181,64,0,0,0,0,0,52,184,64,0,0,0,0,0,133,181,64,0,0,0,0,0,36,184,64,0,0,0,0,0,125,181,64,0,0,0,0,0,252,183,64,0,0,0,0,0,229,181,64,0,0,0,0,0,244,183,64,0,0,0,0,0,205,181,64,0,0,0,0,0,20,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,172,64,0,0,0,0,0,56,183,64,0,0,0,0,0,20,172,64,0,0,0,0,0,16,183,64,0,0,0,0,0,222,172,64,0,0,0,0,0,42,183,64,0,0,0,0,0,154,172,64,0,0,0,0,0,64,183,64,0,0,0,0,0,88,172,64,0,0,0,0,0,87,183,64,0,0,0,0,0,8,172,64,0,0,0,0,0,56,183,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,234,172,64,0,0,0,0,0,128,182,64,0,0,0,0,0,168,172,64,0,0,0,0,0,151,182,64,0,0,0,0,0,88,172,64,0,0,0,0,0,120,182,64,0,0,0,0,0,100,172,64,0,0,0,0,0,80,182,64,0,0,0,0,0,46,173,64,0,0,0,0,0,106,182,64,0,0,0,0,0,234,172,64,0,0,0,0,0,128,182,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,202,171,64,0,0,0,0,0,40,182,64,0,0,0,0,0,136,171,64,0,0,0,0,0,63,182,64,0,0,0,0,0,56,171,64,0,0,0,0,0,32,182,64,0,0,0,0,0,68,171,64,0,0,0,0,0,248,181,64,0,0,0,0,0,14,172,64,0,0,0,0,0,18,182,64,0,0,0,0,0,202,171,64,0,0,0,0,0,40,182,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,245,177,64,0,0,0,0,0,12,189,64,0,0,0,0,0,61,178,64,0,0,0,0,0,139,188,64,0,0,0,0,0,204,178,64,0,0,0,0,0,57,188,64,0,0,0,0,0,54,179,64,0,0,0,0,0,252,187,64,0,0,0,0,0,109,179,64,0,0,0,0,0,252,187,64,0,0,0,0,0,189,179,64,0,0,0,0,0,212,187,64,0,0,0,0,0,221,179,64,0,0,0,0,0,212,187,64,0,0,0,0,0,237,178,64,0,0,0,0,0,76,188,64,0,0,0,0,0,245,177,64,0,0,0,0,0,12,189,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,85,186,64,0,0,0,0,0,30,193,64,0,0,0,0,0,111,186,64,0,0,0,0,0,30,193,64,0,0,0,0,0,191,186,64,0,0,0,0,128,47,193,64,0,0,0,0,0,228,186,64,0,0,0,0,128,140,193,64,0,0,0,0,0,230,186,64,0,0,0,0,0,145,193,64,0,0,0,0,0,193,186,64,0,0,0,0,128,143,193,64,0,0,0,0,0,187,186,64,0,0,0,0,128,143,193,64,0,0,0,0,0,183,186,64,0,0,0,0,128,136,193,64,0,0,0,0,0,137,186,64,0,0,0,0,0,84,193,64,0,0,0,0,0,123,186,64,0,0,0,0,0,95,193,64,0,0,0,0,0,98,186,64,0,0,0,0,0,94,193,64,0,0,0,0,0,73,186,64,0,0,0,0,0,94,193,64,0,0,0,0,0,69,186,64,0,0,0,0,128,83,193,64,0,0,0,0,0,64,186,64,0,0,0,0,128,71,193,64,0,0,0,0,0,68,186,64,0,0,0,0,0,40,193,64,0,0,0,0,0,85,186,64,0,0,0,0,0,30,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,46,186,64,0,0,0,0,128,204,193,64,0,0,0,0,0,52,186,64,0,0,0,0,0,212,193,64,0,0,0,0,0,32,186,64,0,0,0,0,0,218,193,64,0,0,0,0,0,2,186,64,0,0,0,0,0,222,193,64,0,0,0,0,0,241,185,64,0,0,0,0,128,218,193,64,0,0,0,0,0,232,185,64,0,0,0,0,0,206,193,64,0,0,0,0,0,218,185,64,0,0,0,0,0,184,193,64,0,0,0,0,0,216,185,64,0,0,0,0,128,176,193,64,0,0,0,0,0,158,185,64,0,0,0,0,128,143,193,64,0,0,0,0,0,185,185,64,0,0,0,0,0,116,193,64,0,0,0,0,0,227,185,64,0,0,0,0,128,110,193,64,0,0,0,0,0,248,185,64,0,0,0,0,128,132,193,64,0,0,0,0,0,250,185,64,0,0,0,0,128,143,193,64,0,0,0,0,0,46,186,64,0,0,0,0,128,204,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,172,182,64,0,0,0,0,128,85,193,64,0,0,0,0,0,203,182,64,0,0,0,0,128,72,193,64,0,0,0,0,0,214,182,64,0,0,0,0,128,88,193,64,0,0,0,0,0,219,182,64,0,0,0,0,128,96,193,64,0,0,0,0,0,194,182,64,0,0,0,0,128,120,193,64,0,0,0,0,0,194,182,64,0,0,0,0,0,132,193,64,0,0,0,0,0,190,182,64,0,0,0,0,0,142,193,64,0,0,0,0,0,108,182,64,0,0,0,0,128,9,194,64,0,0,0,0,0,103,182,64,0,0,0,0,0,12,194,64,0,0,0,0,0,106,182,64,0,0,0,0,0,166,193,64,0,0,0,0,0,101,182,64,0,0,0,0,128,150,193,64,0,0,0,0,0,122,182,64,0,0,0,0,0,141,193,64,0,0,0,0,0,149,182,64,0,0,0,0,0,105,193,64,0,0,0,0,0,172,182,64,0,0,0,0,128,85,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,37,181,64,0,0,0,0,128,228,192,64,0,0,0,0,0,46,181,64,0,0,0,0,128,12,193,64,0,0,0,0,0,193,180,64,0,0,0,0,0,64,193,64,0,0,0,0,0,57,180,64,0,0,0,0,0,152,193,64,0,0,0,0,0,84,180,64,0,0,0,0,0,113,193,64,0,0,0,0,0,116,180,64,0,0,0,0,128,75,193,64,0,0,0,0,0,143,180,64,0,0,0,0,0,63,193,64,0,0,0,0,0,231,180,64,0,0,0,0,128,21,193,64,0,0,0,0,0,251,180,64,0,0,0,0,0,232,192,64,0,0,0,0,0,15,181,64,0,0,0,0,0,223,192,64,0,0,0,0,0,34,181,64,0,0,0,0,0,221,192,64,0,0,0,0,0,37,181,64,0,0,0,0,128,228,192,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,105,179,64,0,0,0,0,0,28,193,64,0,0,0,0,0,161,179,64,0,0,0,0,128,230,192,64,0,0,0,0,0,203,179,64,0,0,0,0,0,205,192,64,0,0,0,0,0,217,179,64,0,0,0,0,128,200,192,64,0,0,0,0,0,224,179,64,0,0,0,0,0,198,192,64,0,0,0,0,0,232,179,64,0,0,0,0,0,204,192,64,0,0,0,0,0,231,179,64,0,0,0,0,0,214,192,64,0,0,0,0,0,186,179,64,0,0,0,0,128,248,192,64,0,0,0,0,0,188,179,64,0,0,0,0,128,0,193,64,0,0,0,0,0,177,179,64,0,0,0,0,128,4,193,64,0,0,0,0,0,129,179,64,0,0,0,0,128,35,193,64,0,0,0,0,0,85,179,64,0,0,0,0,128,77,193,64,0,0,0,0,0,105,179,64,0,0,0,0,0,28,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,38,181,64,0,0,0,0,0,170,193,64,0,0,0,0,0,23,181,64,0,0,0,0,128,184,193,64,0,0,0,0,0,213,180,64,0,0,0,0,0,224,193,64,0,0,0,0,0,184,180,64,0,0,0,0,128,234,193,64,0,0,0,0,0,187,180,64,0,0,0,0,128,197,193,64,0,0,0,0,0,225,180,64,0,0,0,0,128,175,193,64,0,0,0,0,0,27,181,64,0,0,0,0,128,153,193,64,0,0,0,0,0,34,181,64,0,0,0,0,0,151,193,64,0,0,0,0,0,38,181,64,0,0,0,0,0,170,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,118,182,64,0,0,0,0,0,199,192,64,0,0,0,0,0,153,182,64,0,0,0,0,0,200,192,64,0,0,0,0,0,95,182,64,0,0,0,0,128,7,193,64,0,0,0,0,0,88,182,64,0,0,0,0,0,16,193,64,0,0,0,0,0,64,182,64,0,0,0,0,128,23,193,64,0,0,0,0,0,47,182,64,0,0,0,0,0,24,193,64,0,0,0,0,0,33,182,64,0,0,0,0,0,28,193,64,0,0,0,0,0,249,181,64,0,0,0,0,0,20,193,64,0,0,0,0,0,232,181,64,0,0,0,0,0,37,193,64,0,0,0,0,0,210,181,64,0,0,0,0,0,53,193,64,0,0,0,0,0,209,181,64,0,0,0,0,0,64,193,64,0,0,0,0,0,193,181,64,0,0,0,0,0,68,193,64,0,0,0,0,0,186,181,64,0,0,0,0,128,64,193,64,0,0,0,0,0,173,181,64,0,0,0,0,128,67,193,64,0,0,0,0,0,160,181,64,0,0,0,0,0,57,193,64,0,0,0,0,0,149,181,64,0,0,0,0,128,48,193,64,0,0,0,0,0,141,181,64,0,0,0,0,128,54,193,64,0,0,0,0,0,90,181,64,0,0,0,0,0,97,193,64,0,0,0,0,0,45,181,64,0,0,0,0,0,133,193,64,0,0,0,0,0,41,181,64,0,0,0,0,0,128,193,64,0,0,0,0,0,64,181,64,0,0,0,0,128,82,193,64,0,0,0,0,0,108,181,64,0,0,0,0,0,48,193,64,0,0,0,0,0,164,181,64,0,0,0,0,128,4,193,64,0,0,0,0,0,179,181,64,0,0,0,0,0,252,192,64,0,0,0,0,0,202,181,64,0,0,0,0,128,244,192,64,0,0,0,0,0,216,181,64,0,0,0,0,128,243,192,64,0,0,0,0,0,243,181,64,0,0,0,0,128,230,192,64,0,0,0,0,0,17,182,64,0,0,0,0,128,220,192,64,0,0,0,0,0,25,182,64,0,0,0,0,128,223,192,64,0,0,0,0,0,60,182,64,0,0,0,0,128,211,192,64,0,0,0,0,0,81,182,64,0,0,0,0,128,205,192,64,0,0,0,0,0,97,182,64,0,0,0,0,0,216,192,64,0,0,0,0,0,118,182,64,0,0,0,0,0,199,192,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,187,64,0,0,0,0,0,0,194,64,0,0,0,0,0,237,187,64,0,0,0,0,0,216,194,64,0,0,0,0,0,145,187,64,0,0,0,0,0,72,195,64,0,0,0,0,0,137,187,64,0,0,0,0,0,224,194,64,0,0,0,0,0,57,187,64,0,0,0,0,0,174,194,64,0,0,0,0,0,233,186,64,0,0,0,0,0,46,195,64,0,0,0,0,0,205,186,64,0,0,0,0,0,60,195,64,0,0,0,0,0,97,187,64,0,0,0,0,0,112,194,64,0,0,0,0,0,9,187,64,0,0,0,0,0,0,194,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,113,185,64,0,0,0,0,0,18,194,64,0,0,0,0,0,17,186,64,0,0,0,0,0,202,194,64,0,0,0,0,0,165,185,64,0,0,0,0,0,34,195,64,0,0,0,0,0,245,185,64,0,0,0,0,0,130,194,64,0,0,0,0,0,217,184,64,0,0,0,0,0,76,195,64,0,0,0,0,0,97,185,64,0,0,0,0,0,222,194,64,0,0,0,0,0,113,185,64,0,0,0,0,0,18,194,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,201,183,64,0,0,0,0,0,46,195,64,0,0,0,0,0,149,184,64,0,0,0,0,0,206,194,64,0,0,0,0,0,225,184,64,0,0,0,0,0,40,194,64,0,0,0,0,0,217,184,64,0,0,0,0,0,69,194,64,0,0,0,0,0,221,184,64,0,0,0,0,0,0,195,64,0,0,0,0,0,207,184,64,0,0,0,0,0,193,194,64,0,0,0,0,0,201,183,64,0,0,0,0,0,46,195,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,29,184,64,0,0,0,0,0,206,193,64,0,0,0,0,0,144,184,64,0,0,0,0,128,80,194,64,0,0,0,0,0,221,183,64,0,0,0,0,0,255,194,64,0,0,0,0,0,71,184,64,0,0,0,0,128,143,194,64,0,0,0,0,0,237,183,64,0,0,0,0,0,78,194,64,0,0,0,0,0,33,184,64,0,0,0,0,0,44,194,64,0,0,0,0,0,29,184,64,0,0,0,0,0,206,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,173,182,64,0,0,0,0,0,88,194,64,0,0,0,0,0,177,182,64,0,0,0,0,0,24,194,64,0,0,0,0,0,169,182,64,0,0,0,0,0,14,194,64,0,0,0,0,0,249,182,64,0,0,0,0,0,208,193,64,0,0,0,0,0,253,182,64,0,0,0,0,0,26,194,64,0,0,0,0,0,25,183,64,0,0,0,0,0,104,194,64,0,0,0,0,0,81,183,64,0,0,0,0,0,150,194,64,0,0,0,0,0,153,183,64,0,0,0,0,0,204,194,64,0,0,0,0,0,149,183,64,0,0,0,0,0,12,195,64,0,0,0,0,0,205,182,64,0,0,0,0,0,222,193,64,0,0,0,0,0,157,182,64,0,0,0,0,0,10,195,64,0,0,0,0,0,137,182,64,0,0,0,0,0,110,194,64,0,0,0,0,0,173,182,64,0,0,0,0,0,88,194,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,221,181,64,0,0,0,0,0,82,194,64,0,0,0,0,0,49,182,64,0,0,0,0,0,184,193,64,0,0,0,0,0,85,182,64,0,0,0,0,0,246,193,64,0,0,0,0,0,209,181,64,0,0,0,0,0,98,194,64,0,0,0,0,0,173,181,64,0,0,0,0,0,32,195,64,0,0,0,0,0,145,181,64,0,0,0,0,0,226,194,64,0,0,0,0,0,221,181,64,0,0,0,0,0,82,194,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,33,181,64,0,0,0,0,0,84,194,64,0,0,0,0,0,5,181,64,0,0,0,0,0,134,194,64,0,0,0,0,0,161,180,64,0,0,0,0,0,188,194,64,0,0,0,0,0,169,180,64,0,0,0,0,0,142,194,64,0,0,0,0,0,73,180,64,0,0,0,0,0,166,194,64,0,0,0,0,0,237,180,64,0,0,0,0,0,92,194,64,0,0,0,0,0,233,180,64,0,0,0,0,0,12,194,64,0,0,0,0,0,105,181,64,0,0,0,0,0,182,193,64,0,0,0,0,0,33,181,64,0,0,0,0,0,84,194,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,129,180,64,0,0,0,0,0,212,193,64,0,0,0,0,0,113,180,64,0,0,0,0,0,220,193,64,0,0,0,0,0,45,180,64,0,0,0,0,0,138,194,64,0,0,0,0,0,13,180,64,0,0,0,0,0,120,194,64,0,0,0,0,0,109,179,64,0,0,0,0,0,212,194,64,0,0,0,0,0,189,179,64,0,0,0,0,0,146,194,64,0,0,0,0,0,109,180,64,0,0,0,0,0,210,193,64,0,0,0,0,0,165,180,64,0,0,0,0,0,178,193,64,0,0,0,0,0,129,180,64,0,0,0,0,0,212,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,185,179,64,0,0,0,0,0,228,193,64,0,0,0,0,0,201,179,64,0,0,0,0,0,164,193,64,0,0,0,0,0,237,178,64,0,0,0,0,0,6,194,64,0,0,0,0,0,161,180,64,0,0,0,0,0,4,193,64,0,0,0,0,0,185,179,64,0,0,0,0,0,228,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,57,179,64,0,0,0,0,0,168,192,64,0,0,0,0,0,197,178,64,0,0,0,0,0,5,193,64,0,0,0,0,0,205,178,64,0,0,0,0,128,100,193,64,0,0,0,0,0,191,178,64,0,0,0,0,128,12,193,64,0,0,0,0,0,133,178,64,0,0,0,0,0,82,193,64,0,0,0,0,0,229,178,64,0,0,0,0,0,150,192,64,0,0,0,0,0,25,179,64,0,0,0,0,0,152,192,64,0,0,0,0,0,189,179,64,0,0,0,0,0,62,192,64,0,0,0,0,0,57,179,64,0,0,0,0,0,168,192,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,31,198,64,0,0,0,0,0,88,193,64,0,0,0,0,128,31,198,64,0,0,0,0,128,18,193,64,0,0,0,0,128,155,197,64,0,0,0,0,0,93,192,64,0,0,0,0,128,183,197,64,0,0,0,0,0,129,192,64,0,0,0,0,128,41,198,64,0,0,0,0,0,224,192,64,0,0,0,0,128,56,198,64,0,0,0,0,0,13,193,64,0,0,0,0,128,31,198,64,0,0,0,0,0,88,193,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,205,197,64,0,0,0,0,0,36,191,64,0,0,0,0,128,127,197,64,0,0,0,0,0,156,190,64,0,0,0,0,128,107,197,64,0,0,0,0,0,70,190,64,0,0,0,0,128,205,197,64,0,0,0,0,0,36,191,64,0,0,0,0,128,96,198,64,0,0,0,0,0,4,192,64,0,0,0,0,128,121,198,64,0,0,0,0,0,29,192,64,0,0,0,0,128,116,198,64,0,0,0,0,0,119,192,64,0,0,0,0,128,116,198,64,0,0,0,0,128,83,192,64,0,0,0,0,128,205,197,64,0,0,0,0,0,36,191,64,0,0,0,0,0,7,198,64,0,0,0,0,0,136,191,64,0,0,0,0,128,96,198,64,0,0,0,0,0,4,192,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,10,199,64,0,0,0,0,0,0,180,64,0,0,0,0,128,246,198,64,0,0,0,0,0,0,180,64,0,0,0,0,128,5,199,64,0,0,0,0,0,180,180,64,0,0,0,0,128,236,198,64,0,0,0,0,0,10,180,64,0,0,0,0,128,131,198,64,0,0,0,0,0,136,179,64,0,0,0,0,128,146,198,64,0,0,0,0,0,96,179,64,0,0,0,0,128,10,199,64,0,0,0,0,0,0,180,64,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,154,153,153,153,153,153,233,63,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,128,176,198,64,0,0,0,0,0,90,185,64,0,0,0,0,128,95,199,64,0,0,0,0,0,74,186,64,0,0,0,0,128,114,199,64,0,0,0,0,0,246,186,64,0,0,0,0,0,101,199,64,0,0,0,0,0,157,186,64,0,0,0,0,128,176,198,64,0,0,0,0,0,90,185,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,246,177,64,0,0,0,0,0,240,184,64,0,0,0,0,0,238,177,64,0,0,0,0,0,241,184,64,0,0,0,0,0,54,176,64,0,0,0,0,0,146,184,64,0,0,0,0,0,48,176,64,0,0,0,0,0,142,184,64,0,0,0,0,0,46,176,64,0,0,0,0,0,134,184,64,0,0,0,0,0,51,176,64,0,0,0,0,0,128,184,64,0,0,0,0,0,58,176,64,0,0,0,0,0,126,184,64,0,0,0,0,0,242,177,64,0,0,0,0,0,221,184,64,0,0,0,0,0,246,177,64,0,0,0,0,0,222,184,64,0,0,0,0,0,249,177,64,0,0,0,0,0,226,184,64,0,0,0,0,0,250,177,64,0,0,0,0,0,233,184,64,0,0,0,0,0,246,177,64,0,0,0,0,0,240,184,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,47,180,64,0,0,0,0,128,151,194,64,0,0,0,0,0,45,180,64,0,0,0,0,0,155,194,64,0,0,0,0,0,39,180,64,0,0,0,0,0,157,194,64,0,0,0,0,0,31,180,64,0,0,0,0,0,156,194,64,0,0,0,0,0,27,180,64,0,0,0,0,0,153,194,64,0,0,0,0,0,22,180,64,0,0,0,0,128,148,194,64,0,0,0,0,0,11,180,64,0,0,0,0,128,148,194,64,0,0,0,0,0,247,179,64,0,0,0,0,0,156,194,64,0,0,0,0,0,200,179,64,0,0,0,0,128,173,194,64,0,0,0,0,0,111,179,64,0,0,0,0,128,225,194,64,0,0,0,0,0,104,179,64,0,0,0,0,0,227,194,64,0,0,0,0,0,97,179,64,0,0,0,0,0,226,194,64,0,0,0,0,0,93,179,64,0,0,0,0,128,222,194,64,0,0,0,0,0,96,179,64,0,0,0,0,0,219,194,64,0,0,0,0,0,186,179,64,0,0,0,0,128,165,194,64,0,0,0,0,0,235,179,64,0,0,0,0,0,148,194,64,0,0,0,0,0,6,180,64,0,0,0,0,0,138,194,64,0,0,0,0,0,22,180,64,0,0,0,0,128,138,194,64,0,0,0,0,0,43,180,64,0,0,0,0,128,137,194,64,0,0,0,0,0,47,180,64,0,0,0,0,128,151,194,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,144,180,64,0,0,0,0,0,207,194,64,0,0,0,0,0,138,180,64,0,0,0,0,128,204,194,64,0,0,0,0,0,138,180,64,0,0,0,0,128,200,194,64,0,0,0,0,0,154,180,64,0,0,0,0,0,173,194,64,0,0,0,0,0,141,180,64,0,0,0,0,0,169,194,64,0,0,0,0,0,121,180,64,0,0,0,0,0,166,194,64,0,0,0,0,0,63,180,64,0,0,0,0,0,186,194,64,0,0,0,0,0,55,180,64,0,0,0,0,0,187,194,64,0,0,0,0,0,49,180,64,0,0,0,0,0,185,194,64,0,0,0,0,0,47,180,64,0,0,0,0,0,181,194,64,0,0,0,0,0,52,180,64,0,0,0,0,0,178,194,64,0,0,0,0,0,123,180,64,0,0,0,0,0,153,194,64,0,0,0,0,0,149,180,64,0,0,0,0,0,160,194,64,0,0,0,0,0,180,180,64,0,0,0,0,128,165,194,64,0,0,0,0,0,157,180,64,0,0,0,0,128,203,194,64,0,0,0,0,0,152,180,64,0,0,0,0,128,206,194,64,0,0,0,0,0,144,180,64,0,0,0,0,0,207,194,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,240,63,0,0,0,0,0,11,184,64,0,0,0,0,128,54,195,64,0,0,0,0,0,4,184,64,0,0,0,0,0,56,195,64,0,0,0,0,0,253,183,64,0,0,0,0,0,55,195,64,0,0,0,0,0,249,183,64,0,0,0,0,128,51,195,64,0,0,0,0,0,252,183,64,0,0,0,0,0,48,195,64,0,0,0,0,0,114,184,64,0,0,0,0,0,237,194,64,0,0,0,0,0,166,184,64,0,0,0,0,0,232,194,64,0,0,0,0,0,199,184,64,0,0,0,0,128,228,194,64,0,0,0,0,0,211,184,64,0,0,0,0,128,245,194,64,0,0,0,0,0,221,184,64,0,0,0,0,128,2,195,64,0,0,0,0,0,213,184,64,0,0,0,0,0,32,195,64,0,0,0,0,0,209,184,64,0,0,0,0,0,35,195,64,0,0,0,0,0,202,184,64,0,0,0,0,0,36,195,64,0,0,0,0,0,195,184,64,0,0,0,0,0,34,195,64,0,0,0,0,0,193,184,64,0,0,0,0,128,30,195,64,0,0,0,0,0,200,184,64,0,0,0,0,128,4,195,64,0,0,0,0,0,193,184,64,0,0,0,0,0,249,194,64,0,0,0,0,0,187,184,64,0,0,0,0,128,240,194,64,0,0,0,0,0,170,184,64,0,0,0,0,0,242,194,64,0,0,0,0,0,122,184,64,0,0,0,0,0,247,194,64,0,0,0,0,0,11,184,64,0,0,0,0,128,54,195,64,102,109,109,99,99,108,108,108,99,102,109,99,108,108,108,99,99,109,108,108,108,99,108,108,108,108,108,108,99,108,99,108,102,109,109,99,99,108,99,108,99,102,109,99,108,99,108,99,99,109,108,108,108,108,99,108,108,99,108,108,108,99,99,108,102,109,109,99,99,99,99,99,108,102,109,108,99,99,99,99,99,109,108,108,108,108,108,108,99,99,99,108,108,99,99,102,109,109,99,99,99,108,99,102,109,99,108,99,99,99,109,108,108,108,99,108,99,108,108,108,99,99,108,102,109,109,99,99,108,108,99,99,102,109,99,99,108,108,99,99,109,108,108,108,99,99,108,99,108,108,108,108,99,108,102,109,109,99,108,108,108,99,99,99,102,109,99,99,99,108,108,108,99,109,108,108,108,108,99,99,108,108,99,108,108,108,99,99,108,102,109,109,99,108,108,99,99,99,102,109,99,99,99,108,108,99,109,108,108,99,99,108,108,99,108,108,99,99,108,108,108,102,109,109,99,108,108,99,99,99,102,109,99,99,99,108,108,99,109,108,108,108,108,108,99,99,108,99,99,108,108,99,99,108,102,109,109,99,108,108,108,99,99,99,102,109,99,99,99,108,108,108,99,109,108,108,108,99,99,108,108,99,108,108,108,99,99,108,102,109,109,99,108,108,108,99,99,99,102,109,99,99,99,108,108,108,99,109,108,108,108,99,99,108,108,99,108,108,108,99,99,108,102,109,109,99,108,108,108,99,99,99,102,109,99,99,99,108,108,108,99,109,108,108,108,108,99,99,108,108,99,108,108,108,99,99,108,102,109,109,99,108,108,108,99,99,99,102,109,99,99,99,108,108,108,99,109,108,108,108,99,99,108,108,99,108,108,108,99,99,108,102,109,109,99,99,108,99,108,99,99,99,99,108,99,99,108,99,108,108,99,108,108,99,99,99,108,108,108,99,99,99,108,99,99,99,108,108,99,99,99,99,99,108,108,99,108,99,99,99,99,108,99,108,108,99,99,108,108,108,108,99,108,108,108,99,99,108,108,108,99,108,99,99])
.concat([108,99,99,108,108,99,108,108,108,108,108,99,108,108,108,108,108,108,108,108,99,108,108,108,108,108,99,99,108,99,108,99,108,108,108,108,108,108,108,99,99,99,99,108,99,99,108,108,99,99,108,108,99,108,108,99,108,99,99,108,108,99,108,108,108,99,108,99,99,99,99,99,99,99,99,99,108,99,108,108,99,108,108,99,108,108,108,108,108,108,108,108,108,99,108,99,108,99,99,108,108,108,108,108,108,99,99,99,99,108,99,99,108,108,108,108,99,99,99,99,108,108,108,108,99,99,108,99,99,99,99,99,99,99,108,108,99,108,108,99,99,99,99,99,108,108,108,108,108,108,99,108,99,99,99,99,108,99,108,99,99,99,108,99,99,99,108,99,108,99,99,99,99,99,99,108,108,99,99,99,108,99,99,108,99,99,99,108,99,99,108,108,108,99,108,108,108,108,108,108,99,108,99,108,99,99,99,108,99,99,108,99,108,108,99,99,108,99,108,99,108,99,108,102,109,108,99,108,99,108,99,108,99,99,108,108,99,108,99,99,108,99,99,99,108,99,108,99,108,108,108,108,108,108,99,108,108,108,99,99,108,99,99,99,108,99,99,108,99,99,99,108,108,99,99,99,99,99,99,108,99,108,99,99,99,108,99,99,99,108,99,108,99,99,99,99,108,99,108,108,108,108,108,108,99,99,99,99,99,108,108,99,108,108,99,99,99,99,99,99,99,108,99,99,108,108,108,108,99,99,99,99,108,108,108,108,99,99,108,99,99,99,99,108,108,108,108,108,108,99,99,108,99,108,99,108,108,108,108,108,108,108,108,108,99,108,108,99,108,108,99,108,99,99,99,99,99,99,99,99,99,108,99,108,108,108,99,108,108,99,99,108,99,108,108,99,108,108,99,99,108,108,99,99,108,99,99,99,99,108,108,108,108,108,108,108,99,108,99,108,99,99,108,108,108,108,108,99,108,108,108,108,108,108,108,108,99,108,108,108,108,108,99,108,108,99,99,108,99,99,108,99,108,108,108,99,99,108,108,108,99,108,108,108,108,99,99,108,108,99,108,99,99,99,99,108,99,108,108,99,99,99,99,99,108,108,99,99,99,108,99,99,99,108,108,108,99,99,99,108,108,99,108,108,99,108,99,99,108,99,99,99,99,108,99,108,99,99,109,108,108,108,99,108,99,99,99,99,99,99,99,99,99,108,108,99,99,99,99,99,99,99,108,99,108,108,99,108,99,99,99,99,99,99,99,99,99,99,108,108,108,108,108,99,99,99,99,108,108,108,108,108,99,99,108,108,108,108,99,99,108,108,108,108,108,108,99,99,108,99,108,108,108,108,108,108,108,108,108,99,99,99,108,108,99,99,108,108,108,99,108,108,108,108,99,99,99,99,99,99,99,108,108,108,108,108,108,108,99,108,99,108,108,99,99,99,108,108,99,108,108,99,108,108,108,108,108,99,99,99,108,108,108,108,99,99,99,108,108,108,99,99,99,99,99,108,99,99,99,108,99,99,99,108,99,99,108,108,108,108,108,99,99,99,99,99,99,108,108,108,99,99,108,99,99,108,108,108,108,99,99,99,99,108,108,108,108,108,108,99,99,99,99,108,108,108,99,108,108,108,99,108,99,108,108,99,108,99,99,99,99,108,99,99,108,108,108,108,99,108,108,99,108,108,108,108,108,108,99,108,108,99,108,108,108,99,108,108,99,108,108,108,108,108,108,108,108,99,108,108,108,108,99,108,108,108,99,108,108,108,108,99,108,108,108,99,108,108,108,108,108,108,108,108,108,108,108,108,108,108,108,99,108,108,108,108,108,108,99,108,99,108,108,108,108,108,108,108,108,99,108,99,99,108,108,99,99,99,99,108,108,108,108,102,109,109,99,99,108,108,108,108,108,99,108,108,99,108,108,99,99,99,108,108,99,108,99,99,108,108,99,99,99,99,99,99,108,108,99,108,99,108,99,99,99,108,108,99,108,99,108,99,108,99,99,99,108,99,108,99,99,99,108,108,99,99,99,99,108,108,108,99,108,99,108,108,99,108,99,108,108,99,108,108,108,108,108,99,99,108,108,108,99,108,108,108,99,108,99,108,99,99,108,108,108,108,99,108,102,109,108,99,108,108,108,108,99,99,108,99,108,99,108,108,108,99,108,108,108,99,99,108,108,108,108,108,99,108,108,99,108,99,108,108,99,108,99,108,108,108,99,99,99,99,108,108,99,99,99,108,99,108,99,99,99,108,99,108,99,108,99,108,108,99,99,99,108,99,108,99,108,108,99,99,99,99,99,99,108,108,99,99,108,99,108,108,99,99,99,108,108,99,108,108,99,108,108,108,108,108,99,99,109,108,99,108,99,108,108,108,108,108,99,99,99,108,99,99,99,108,99,108,99,108,99,99,108,99,99,99,99,99,99,99,99,108,108,99,99,99,99,99,99,99,99,108,99,108,99,99,99,108,99,108,99,99,99,99,99,99,108,108,108,108,99,108,99,108,108,99,108,99,99,108,99,99,108,108,108,99,99,102,109,109,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,99,102,109,109,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,99,102,109,109,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,102,109,109,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,102,109,109,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,102,109,109,108,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,108,102,109,109,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,102,109,109,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,102,109,109,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,99,102,109,109,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,102,109,109,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,108,102,109,109,108,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,102,109,109,99,99,99,108,99,99,102,109,109,108,99,108,99,108,99,99,99,99,108,99,108,99,108,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,99,99,108,108,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,108,108,102,109,109,99,99,99,99,99,99,99,102,109,109,99,108,99,99,99,99,102,109,109,99,108,99,108,99,99,108,99,99,99,108,99,99,102,109,99,99,108,99,99,108,99,99,99,99,99,99,99,108,108,108,99,99,99,99,102,109,109,99,99,99,99,108,99,108,108,108,99,99,99,99,99,99,99,99,99,108,99,99,108,99,109,99,99,99,99,108,108,108,99,99,99,99,99,99,99,108,99,99,108,99,99,102,109,109,99,108,99,99,99,99,99,99,108,102,109,108,99,99,99,99,99,99,108,99,109,108,99,99,108,99,108,99,108,99,99,99,102,109,109,108,99,108,99,99,99,99,99,108,99,99,99,99,102,109,109,99,99,99,99,99,108,99,108,108,108,99,99,99,102,109,109,99,99,99,108,99,99,99,108,99,99,102,109,99,99,108,99,99,99,108,99,99,99,109,99,99,99,99,99,99,99,99,102,109,99,108,108,99,108,99,99,99,108,102,109,109,108,108,108,108,108,99,99,108,99,108,108,108,99,109,108,99,99,99,108,99,108,108,99,102,109,109,99,108,108,108,99,108,99,99,99,108,102,109,108,99,99,99,108,99,108,108,108,99,109,99,108,108,108,108,108,99,99,108,99,108,99,102,109,99,108,108,99,108,99,99,99,108,102,109,109,99,108,108,99,108,108,108,108,108,108,99,99,109,108,99,99,99,108,99,108,108,99,102,109,99,99,108,108,108,99,99,99,108,102,109,109,108,108,108,108,108,108,99,99,108,99,99,109,108,99,99,99,108,108,108,99,99,102,109,108,99,99,99,108,99,99,108,102,109,109,99,108,108,108,108,108,99,99,99,109,108,99,99,108,99,99,99,108,102,109,109,108,99,99,99,99,99,108,108,108,108,108,99,108,99,108,99,102,109,109,108,99,108,99,108,108,99,108,108,108,108,108,99,108,99,108,99,99,108,108,102,109,99,99,99,99,99,108,108,99,99,99,102,109,109,108,99,99,99,99,99,108,108,99,99,99,109,99,99,99,108,108,99,99,99,99,99,102,109,109,99,99,108,108,108,108,99,108,108,99,102,109,109,108,99,108,108,108,99,99,108,99,108,102,109,109,108,99,99,99,102,109,109,99,108,108,99,99,108,108,108,108,102,109,108,108,108,108,99,99,108,108,99,109,108,108,99,99,99,99,108,99,108,99,99,108,102,109,109,99,99,99,99,108,99,108,108,102,109,108,108,99,108,99,99,99,99,109,108,108,99,99,99,99,108,99,108,108,108,108,108,102,109,109,108,108,99,99,99,108,99,99,102,109,99,99,108,99,99,99,108,108,109,108,99,99,99,99,108,108,99,108,102,109,109,99,99,99,99,99,99,99,108,99,108,102,109,109,99,108,99,99,99,99,108,108,102,109,108,108,99,99,99,99,108,99,109,108,99,99,99,108,99,99,99,108,102,109,109,108,99,99,108,108,99,99,99,102,109,99,99,99,108,108,99,99,108,109,108,99,99,99,99,99,108,108,99,108,102,109,99,99,99,99,108,108,99,108,108,102,109,109,99,99,99,99,108,108,99,108,108,99,109,108,108,99,108,108,99,99,99,99,102,109,99,99,99,99,99,108,108,99,108,102,109,109,108,99,99,99,108,108,99,99,108,99,109,108,99,108,108,99,99,99,99,99,102,109,109,99,99,108,108,108,99,99,99,99,108,102,109,108,99,99,99,99,108,108,108,99,99,109,99,99,99,99,99,99,99,108,108,102,109,109,99,108,108,108,108,102,109,109,99,108,108,99,108,102,109,109,108,99,99,99,99,99,99,99,99,99,99,108,99,99,99,102,109,109,108,99,99,99,99,99,99,99,99,99,99,108,99,99,99,102,109,109,108,99,99,99,99,99,99,99,99,108,99,99,99,108,99,99,99,102,109,109,108,99,99,99,99,99,99,99,99,108,108,99,99,108,99,99,99,102,109,109,108,99,99,99,99,99,99,99,108,108,108,99,99,108,99,99,99,102,109,109,108,99,99,99,99,99,99,99,108,108,108,99,99,108,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,108,99,99,99,108,99,99,102,109,109,99,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,102,109,109,99,99,102,109,109,99,99,99,99,99,99,99,99,102,109,109,108,99,99,99,99,99,99,99,108,99,99,99,99,102,109,109,99,99,99,99,99,99,99,108,99,99,99,99,108,102,109,109,108,99,99,99,99,99,99,99,108,99,99,99,99,102,109,109,108,99,99,99,99,99,99,99,99,108,99,99,99,99,102,109,109,99,99,99,99,99,99,99,99,108,99,99,99,99,108,102,109,109,99,99,99,99,99,99,99,99,108,99,99,99,99,108,102,109,109,99,99,108,102,109,109,99,99,99,99,102,109,109,99,99,99,99,99,102,109,109,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,108,99,99,108,99,99,99,108,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,102,109,109,99,99,99,99,99,108,99,108,99,99,99,99,108,102,109,109,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,99,99,102,109,109,99,99,99,99,99,99,99,102,109,109,108,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,102,109,109,99,99,99,102,109,109,108,99,99,99,108,102,109,109,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,108,102,109,109,99,99,99,99,99,99,99,108,99,99,99,108,108,99,108,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,108,99,99,99,108,108,108,99,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,108,99,99,99,99,99,108,99,99,99,102,109,109,99,108,99,99,99,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,108,99,108,99,99,108,99,99,99,99,99,108,99,99,99,99,99,99,108,99,102,109,109,99,99,99,99,99,99,99,99,99,99,99,99,99,99,102,109,109,99,108,108,108,108,108,108,108,108,99,108,108,108,99,108,108,108,108,108,108,108,108,108,99,99,99,108,99,108,108,108,108,108,108,99,108,108,102,109,109,108,108,99,99,99,108,99,108,99,108,108,108,108,108,99,99,108,108,108,99,99,108,99,102,109,109,108,99,99,108,108,99,108,108,108,108,108,108,108,108,99,99,108,108,108,108,99,108,108,99,99,102,109,109,99,99,99,108,108,99,108,108,108,102,109,109,108,108,108,108,102,109,109,99,99,99,99,99,99,99,99,99,99,99,108,99,108,108,108,108,99,99,99,99,108,99,99,99,108,99,99,99,108,99,99,99,108,108,108,108,108,99,99,99,99,99,99,99,99,99,108,99,108,108,99,99,108,99,108,108,99,99,108,108,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,108,108,102,109,109,108,108,108,99,99,108,99,108,108,99,99,99,99,102,109,109,108,108,108,108,99,108,99,108,108,99,99,99,99,102,109,109,108,108,108,108,99,99,108,99,108,108,99,99,99,108,99,99,102,109,109,108,108,99,99,99,108,99,99,108,108,108,108,99,108,99,99,102,109,109,99,99,108,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,99,99,108,108,99,99,108,108,108,99,99,99,99,99,99,99,99,99,99,99,108,99,99,108,108,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,99,108,99,108,99,99,99,99,99,99,99,99,99,99,99,108,99,99,99,99,99,108,99,99,99,99,99,99,99,99,99,99,99,102,109,109,99,99,99,108,99,102,109,109,99,99,108,99,102,109,109,108,99,108,99,108,102,109,109,99,99,99,99,102,109,109,99,99,99,99,99,108,99,99,99,99,99,108,99,99,99,102,109,109,99,108,99,99,108,108,99,99,99,99,99,99,108,99,99,99,102,109,109,108,108,108,109,108,99,99,99,99,99,99,108,99,99,99,99,108,99,99,99,102,109,109,108,108,99,99,99,99,99,99,99,108,99,99,108,99,99,108,99,99,99,99,99,99,99,99,108,102,109,109,99,108,99,99,99,102,109,109,108,108,99,99,99,99,99,99,99,99,108,99,99,102,109,109,108,108,99,108,99,108,108,99,99,108,99,108,108,108,99,99,99,99,108,99,108,99,99,99,99,99,108,102,109,109,108,99,99,108,99,99,108,108,108,108,108,108,108,99,99,108,99,108,108,102,109,109,99,108,99,108,99,108,108,108,99,108,99,99,99,99,99,108,99,108,108,108,99,99,108,102,109,109,108,108,108,108,108,108,99,99,108,108,108,108,99,108,108,99,99,108,108,108,108,99,108,108,108,108,108,99,108,99,108,108,108,108,108,108,108,99,108,108,108,108,99,108,99,99,108,99,99,108,99,108,108,108,108,99,108,108,108,108,108,99,99,99,108,99,108,108,108,99,99,108,99,99,108,108,108,99,99,99,99,108,99,102,109,109,108,108,99,99,99,99,99,99,108,108,99,99,99,99,99,108,108,99,99,99,108,108,99,99,108,99,99,99,108,99,108,99,99,108,99,108,102,109,109,108,99,99,99,102,109,109,99,99,108,99,99,99,99,99,102,109,109,99,99,108,99,108,99,99,99,99,108,99,108,99,99,102,109,109,99,99,108,108,99,99,102,109,109,99,99,99,108,108,99,108,99,108,99,99,108,99,108,108,99,99,99,108,108,99,99,99,108,108,99,108,102,109,109,108,108,108,99,108,99,99,108,108,108,108,108,99,102,109,109,108,99,99,99,99,108,99,99,108,99,99,99,99,99,99,99,108,99,102,109,109,99,108,99,99,99,108,99,99,99,99,108,99,108,99,102,109,109,99,99,99,108,99,99,99,99,99,99,99,108,99,102,109,109,99,99,99,108,108,108,99,99,99,99,108,99,99,102,109,109,99,108,99,102,109,109,99,99,108,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,99,108,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,99,108,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,99,99,102,109,109,99,99,99,102,109,109,108,99,99,108,102,109,109,99,99,99,108,108,99,99,99,108,99,108,108,99,99,99,99,99,108,99,99,108,108,99,99,108,108,108,99,99,102,109,109,99,99,108,108,99,99,99,99,99,99,99,102,109,108,108,108,108,99,108,102,109,109,108,108,108,108,108,108,108,108,108,108,108,108,108,99,109,108,99,108,108,108,108,102,109,99,108,108,108,108,99,102,109,109,99,108,108,108,108,108,99,108,108,108,108,99,109,99,108,108,108,108,99,102,109,108,108,108,108,99,99,102,109,109,99,99,108,108,108,108,108,99,108,108,108,108,108,108,109,99,99,108,108,108,108,102,109,109,108,108,99,99,108,109,108,108,108,102,109,108,99,99,108,108,109,108,108,99,108,99,108,108,108,108,108,99,108,108,108,102,109,109,99,99,99,108,108,102,109,108,108,99,99,99,109,108,108,108,108,99,99,99,99,99,108,102,109,109,99,99,99,108,99,102,109,99,108,99,99,99,109,108,108,108,108,108,99,108,99,99,99,102,109,109,99,99,99,108,99,108,102,109,108,99,108,99,99,99,109,108,108,108,108,99,99,99,99,99,108,102,109,109,108,99,99,99,99,108,102,109,108,99,99,99,99,108,109,108,108,108,108,99,99,99,99,99,108,102,109,109,99,99,99,99,99,108,99,99,99,99,99,99,99,108,102,109,109,99,99,99,99,99,99,99,99,99,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,108,99,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,99,108,102,109,109,108,99,99,102,109,109,108,108,99,99,99,108,102,109,108,99,99,99,108,108,109,99,99,99,99,108,108,108,108,108,99,102,109,109,99,99,99,99,99,99,99,99,99,102,109,109,99,99,108,108,108,99,99,102,109,99,99,108,108,108,99,99,109,108,108,108,108,108,99,108,108,99,108,108,99,99,102,109,109,99,99,99,108,108,99,102,109,99,108,108,99,99,99,109,99,99,108,108,108,108,99,108,108,99,108,108,102,109,109,99,99,109,108,99,99,99,99,108,102,109,99,99,109,108,99,99,99,99,108,109,108,108,99,108,108,99,99,108,99,108,108,108,108,108,99,99,102,109,109,108,99,99,99,99,108,108,109,108,99,108,99,102,109,108,108,99,99,99,99,108,109,108,108,108,108,108,108,99,108,99,108,108,108,99,99,108,99,99,108,108,108,99,108,102,109,109,99,99,99,99,108,108,108,102,109,108,108,108,99,99,99,99,109,108,99,108,108,99,99,108,108,108,108,108,99,108,102,109,109,108,99,99,99,99,99,108,108,102,109,108,108,99,99,99,99,99,108,109,108,99,108,108,108,99,99,108,108,108,108,99,99,108,102,109,109,108,108,108,108,99,99,99,99,99,102,109,99,99,99,99,99,108,108,108,108,109,108,108,99,108,108,99,99,108,108,108,108,108,108,99,99,102,109,109,99,99,99,99,99,99,102,109,99,99,99,99,99,99,109,108,108,108,108,99,99,99,99,99,108,99,102,109,109,99,99,99,99,108,108,99,102,109,99,108,108,99,99,99,99,109,108,99,108,108,99,99,108,99,99,108,108,108,108,108,108,102,109,109,99,99,99,108,99,99,99,102,109,99,99,99,108,99,99,99,109,108,108,108,108,108,99,99,99,108,99,99,108,99,99,102,109,109,99,99,99,99,108,99,102,109,99,108,99,99,99,99,109,108,108,108,108,108,99,99,99,108,99,99,102,109,109,99,99,99,99,108,99,108,102,109,108,99,108,99,99,99,99,109,99,99,99,108,99,99,108,108,108,108,108,102,109,109,108,99,99,99,99,99,102,109,99,99,99,99,99,108,109,108,108,108,108,108,99,99,99,108,99,99,102,109,109,108,99,99,99,99,99,108,102,109,108,99,99,99,99,99,108,109,99,99,108,99,99,108,108,108,108,108,99,99,99,108,102,109,109,99,108,99,99,99,99,102,109,99,99,99,99,108,99,109,108,108,108,99,108,108,99,99,108,99,99,108,102,109,109,99,99,99,99,108,108,108,99,102,109,99,108,108,108,99,99,99,99,109,99,99,108,108,108,108,108,108,99,99,108,108,99,108,108,102,109,109,99,99,99,99,108,108,108,102,109,108,108,108,99,99,99,99,109,108,108,108,108,108,99,108,108,99,99,108,99,99,102,109,109,99,99,99,99,108,108,108,108,102,109,108,108,108,108,99,99,99,99,109,108,108,108,108,99,108,108,99,108,108,99,99,102,109,109,108,99,99,99,99,99,102,109,99,99,99,99,99,108,109,108,108,108,108,99,108,108,99,108,108,99,99,102,109,108,99,99,99,109,99,99,99,102,109,109,108,108,99,108,108,99,99,108,108,108,108,108,99,109,99,99,99,108,109,99,99,99,102,109,109,99,99,108,108,108,99,99,102,109,99,99,108,108,108,99,99,109,108,108,108,108,99,108,108,99,108,108,99,99,102,109,109,108,108,99,99,99,99,108,108,102,109,108,108,99,99,99,99,108,108,109,108,108,108,108,99,108,108,99,108,108,99,99,102,109,108,108,99,99,99,99,102,109,109,108,108,99,108,108,99,99,108,108,108,108,108,99,109,99,99,99,99,108,108,102,109,108,99,99,99,99,108,102,109,109,108,108,99,99,108,108,108,108,108,99,108,108,99,109,108,99,99,99,99,108,102,109,109,99,99,99,108,108,108,102,109,108,108,108,99,99,99,109,108,108,99,108,108,108,99,108,108,108,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,108,99,99,102,109,109,99,108,99,102,109,109,99,108,99,102,109,109,99,99,99,99,102,109,109,108,99,99,99,108,99,99,99,108,102,109,109,99,108,99,108,108,99,99,108,108,102,109,109,99,99,108,108,108,99,99,108,108,102,109,109,99,108,108,99,99,108,99,102,109,109,99,108,99,99,99,108,108,108,102,109,109,108,108,108,99,108,99,102,109,109,108,108,99,108,108,108,108,108,108,108,108,99,99,108,99,99,108,108,108,108,108,108,108,108,99,108,102,109,109,99,99,99,99,102,109,109,99,99,99,102,109,109,99,99,99,102,109,109,99,99,99,102,109,109,99,99,99,99,99,99,102,109,109,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,99,102,109,109,99,99,102,109,109,99,99,99,99,102,109,109,99,99,99,102,109,109,99,108,109,99,99,99,102,109,109,99,99,99,102,109,109,108,108,99,102,109,109,108,108,108,108,108,108,108,99,108,108,102,109,109,108,108,108,108,108,99,99,108,108,108,108,99,99,99,102,109,109,108,108,99,99,108,108,108,108,99,99,108,108,102,109,108,108,108,108,99,99,99,108,108,108,108,99,99,99,0,0,0,0,0,0,0,116,32,62,61,32,48,32,38,38,32,116,32,60,61,32,49,46,48,0,0,0,0,0,0,115,104,105,102,116,32,62,61,32,48,0,0,0,0,0,0,114,32,62,61,32,48,32,38,38,32,114,32,60,32,49,46,48,0,0,0,0,0,0,0,115,104,97,112,101,95,99,111,117,110,116,32,60,32,83,80,65,78,95,67,79,76,79,82,83,0,0,0,0,0,0,0,115,116,100,58,58,98,97,100,95,97,108,108,111,99,0,0,100,115,116,0,0,0,0,0,48,0,0,0,0,0,0,0,101,100,103,101,45,62,102,117,108,108,120,32,60,61,32,101,100,103,101,45,62,110,101,120,116,45,62,102,117,108,108,120,0,0,0,0,0,0,0,0,115,114,99,0,0,0,0,0,115,45,62,119,105,110,100,105,110,103,32,61,61,32,48,0,116,32,62,32,48,32,38,38,32,116,32,60,32,49,46,48,0,0,0,0,0,0,0,0,114,97,115,116,101,114,105,122,101,114,46,99,99,0,0,0,115,107,105,97,45,117,116,105,108,115,46,99,99,0,0,0,97,100,100,95,99,111,108,111,114,0,0,0,0,0,0,0,99,104,101,99,107,95,119,105,110,100,105,110,103,115,0,0,112,97,105,110,116,95,115,112,97,110,115,0,0,0,0,0,115,99,97,110,95,101,100,103,101,115,0,0,0,0,0,0,99,111,109,112,117,116,101,95,99,117,114,118,101,95,115,116,101,112,115,0,0,0,0,0,118,97,108,105,100,95,117,110,105,116,95,100,105,118,105,100,101,0,0,0,0,0,0,0,83,107,50,83,99,97,108,97,114,73,110,116,101,114,112,0,83,107,50,67,104,111,112,81,117,97,100,65,116,89,69,120,116,114,101,109,97,0,0,0,83,107,50,67,104,111,112,81,117,97,100,65,116,0,0,0,0,0,0,0,32,112,2,0,4,0,0,0,2,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,83,116,57,101,120,99,101,112,116,105,111,110,0,0,0,0,83,116,57,98,97,100,95,97,108,108,111,99,0,0,0,0,0,0,0,0,248,111,2,0,0,0,0,0,8,112,2,0,24,112,2,0,0,0,0,0])
, "i8", ALLOC_NONE, Runtime.GLOBAL_BASE)
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);
function copyTempFloat(ptr) { // functions, because inlining this code increases code size too much
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
}
function copyTempDouble(ptr) {
  HEAP8[tempDoublePtr] = HEAP8[ptr];
  HEAP8[tempDoublePtr+1] = HEAP8[ptr+1];
  HEAP8[tempDoublePtr+2] = HEAP8[ptr+2];
  HEAP8[tempDoublePtr+3] = HEAP8[ptr+3];
  HEAP8[tempDoublePtr+4] = HEAP8[ptr+4];
  HEAP8[tempDoublePtr+5] = HEAP8[ptr+5];
  HEAP8[tempDoublePtr+6] = HEAP8[ptr+6];
  HEAP8[tempDoublePtr+7] = HEAP8[ptr+7];
}
  Module["_memcpy"] = _memcpy;var _llvm_memcpy_p0i8_p0i8_i32=_memcpy;
  function ___assert_fail(condition, filename, line, func) {
      ABORT = true;
      throw 'Assertion failed: ' + Pointer_stringify(condition) + ', at: ' + [filename ? Pointer_stringify(filename) : 'unknown filename', line, func ? Pointer_stringify(func) : 'unknown function'] + ' at ' + stackTrace();
    }
  function _canvas_begin_time(x1, y1, x2, y2) {
  		Module.canvas_startTime = window.performance.now();
  	}
  function ___gxx_personality_v0() {
    }
  function _canvas_end_time(x1, y1, x2, y2) {
  		window.console.log(window.performance.now() - Module.canvas_startTime);
  	}
  function _webgl_put_image(ptr, width, height) {
  		var pixels = HEAPU8.subarray((ptr),(ptr+width*height*4))
  		var gl = Module.ctx;
  		gl.activeTexture(gl.TEXTURE0); // so we're being explicit with texture units. But here, texUnit is set to 0 so this is just pedantic.
  		gl.bindTexture(gl.TEXTURE_2D, texture);
  		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  		gl.clearColor(0.0, 0.0, 0.0, 1.0);
  		gl.clear(gl.COLOR_BUFFER_BIT);
  		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  	//gl.bindTexture(gl.TEXTURE_2D, texture);
  	//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  	//gl.drawArrays(gl.TRIANGLES, 0, 6);
  	//putImageData(imageData, 0, 0);
  	//Module.imageData = Module.ctx.createImageData(Module.canvas.width, Module.canvas.height);
  	}
  function _emscripten_set_canvas_size(width, height) {
      Browser.setCanvasSize(width, height);
    }
  function _webgl_init() {
  		var vertexShaderString = 
  		'attribute vec2 vertexPosition;                              \n\
  			varying vec2 texCoord;                                      \n\
  			void main(void) {                                           \n\
  				texCoord = vec2(vertexPosition.x, 1.0 - vertexPosition.y);                                \n\
  			gl_Position = vec4(2.0 * vertexPosition - 1.0, 0.0, 1.0); \n\
  			}                                                           \n';
  		var fragmentShaderString =
  		'precision mediump float;                          \n\
  			uniform sampler2D texSampler;                     \n\
  			varying vec2 texCoord;                            \n\
  			void main(void) {                                 \n\
  			        /* the rasterizer writes out data in bgra format */ \n\
  				gl_FragColor = texture2D(texSampler, texCoord).bgra;  \n\
  			}                                                 \n';
  		var gl, texarray, program;
  		var texUnit = 0; // we will use texture unit 0 only
  		gl = Module.canvas.getContext("experimental-webgl");
  		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  		gl.shaderSource(vertexShader, vertexShaderString);
  		gl.compileShader(vertexShader);
  		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  		gl.shaderSource(fragmentShader, fragmentShaderString);
  		gl.compileShader(fragmentShader);
  		program = gl.createProgram();
  		gl.attachShader(program, vertexShader);
  		gl.attachShader(program, fragmentShader);
  		gl.linkProgram(program);
  		gl.useProgram(program);
  		var vertexPositionAttrLoc = gl.getAttribLocation(program, "vertexPosition");
  		gl.enableVertexAttribArray(vertexPositionAttrLoc);
  		var texSamplerLoc = gl.getUniformLocation(program, "texSampler");
  		gl.uniform1i(texSamplerLoc, texUnit);
  		var vertexPositionBuffer = gl.createBuffer();
  		gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  		var vertices = [ 0.0,  0.0,
  			0.0,  1.0,
  			1.0,  0.0,
  			1.0,  1.0 ];
  		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  		gl.vertexAttribPointer(vertexPositionAttrLoc, 2, gl.FLOAT, false, 0, 0);
  		texarray = new Uint8Array([0, 0, 0, 0,       0, 0, 0, 0,       255, 0, 0, 255,   0, 0, 0, 0,       0, 0, 0, 0,
  			0, 0, 0, 0,       255, 128, 0, 255,   0, 0, 0, 0,       255, 128, 0, 255,   0, 0, 0, 0,
  			255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255, 255, 255, 0, 255,
  			0, 255, 0, 255,   0, 0, 0, 0,       0, 0, 0, 0,       0, 0, 0, 0,       0, 255, 0, 255,
  		0, 0, 255, 255,   0, 0, 0, 0,       0, 0, 0, 0,       0, 0, 0, 0,       0, 0, 255, 255]);
  		texture = gl.createTexture();
  		gl.bindTexture(gl.TEXTURE_2D, texture);
  		//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // so we can have the above array upright. Otherwise, it helps performance NOT to flip.
  		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4); // 4 is the default. added for explicitness. common pitfall.
  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // so it works with this non-power-of-two texture
  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  		gl.bindTexture(gl.TEXTURE_2D, null);
  		Module.ctx = gl;
  	}
  Module["_memset"] = _memset;var _llvm_memset_p0i8_i64=_memset;
  function _llvm_lifetime_start() {}
  function _llvm_lifetime_end() {}
  function _llvm_umul_with_overflow_i32(x, y) {
      x = x>>>0;
      y = y>>>0;
      return ((asm["setTempRet0"](x*y > 4294967295),(x*y)>>>0)|0);
    }
  var _llvm_memset_p0i8_i32=_memset;
  function _abort() {
      Module['abort']();
    }
  var ___errno_state=0;function ___setErrNo(value) {
      // For convenient setting and returning of errno.
      HEAP32[((___errno_state)>>2)]=value
      return value;
    }function ___errno_location() {
      return ___errno_state;
    }
  function _sbrk(bytes) {
      // Implement a Linux-like 'memory area' for our 'process'.
      // Changes the size of the memory area by |bytes|; returns the
      // address of the previous top ('break') of the memory area
      // We control the "dynamic" memory - DYNAMIC_BASE to DYNAMICTOP
      var self = _sbrk;
      if (!self.called) {
        DYNAMICTOP = alignMemoryPage(DYNAMICTOP); // make sure we start out aligned
        self.called = true;
        assert(Runtime.dynamicAlloc);
        self.alloc = Runtime.dynamicAlloc;
        Runtime.dynamicAlloc = function() { abort('cannot dynamically allocate, sbrk now has control') };
      }
      var ret = DYNAMICTOP;
      if (bytes != 0) self.alloc(bytes);
      return ret;  // Previous break location.
    }
  var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name) {
      // long sysconf(int name);
      // http://pubs.opengroup.org/onlinepubs/009695399/functions/sysconf.html
      switch(name) {
        case 30: return PAGE_SIZE;
        case 132:
        case 133:
        case 12:
        case 137:
        case 138:
        case 15:
        case 235:
        case 16:
        case 17:
        case 18:
        case 19:
        case 20:
        case 149:
        case 13:
        case 10:
        case 236:
        case 153:
        case 9:
        case 21:
        case 22:
        case 159:
        case 154:
        case 14:
        case 77:
        case 78:
        case 139:
        case 80:
        case 81:
        case 79:
        case 82:
        case 68:
        case 67:
        case 164:
        case 11:
        case 29:
        case 47:
        case 48:
        case 95:
        case 52:
        case 51:
        case 46:
          return 200809;
        case 27:
        case 246:
        case 127:
        case 128:
        case 23:
        case 24:
        case 160:
        case 161:
        case 181:
        case 182:
        case 242:
        case 183:
        case 184:
        case 243:
        case 244:
        case 245:
        case 165:
        case 178:
        case 179:
        case 49:
        case 50:
        case 168:
        case 169:
        case 175:
        case 170:
        case 171:
        case 172:
        case 97:
        case 76:
        case 32:
        case 173:
        case 35:
          return -1;
        case 176:
        case 177:
        case 7:
        case 155:
        case 8:
        case 157:
        case 125:
        case 126:
        case 92:
        case 93:
        case 129:
        case 130:
        case 131:
        case 94:
        case 91:
          return 1;
        case 74:
        case 60:
        case 69:
        case 70:
        case 4:
          return 1024;
        case 31:
        case 42:
        case 72:
          return 32;
        case 87:
        case 26:
        case 33:
          return 2147483647;
        case 34:
        case 1:
          return 47839;
        case 38:
        case 36:
          return 99;
        case 43:
        case 37:
          return 2048;
        case 0: return 2097152;
        case 3: return 65536;
        case 28: return 32768;
        case 44: return 32767;
        case 75: return 16384;
        case 39: return 1000;
        case 89: return 700;
        case 71: return 256;
        case 40: return 255;
        case 2: return 100;
        case 180: return 64;
        case 25: return 20;
        case 5: return 16;
        case 6: return 6;
        case 73: return 4;
        case 84: return 1;
      }
      ___setErrNo(ERRNO_CODES.EINVAL);
      return -1;
    }
  function _time(ptr) {
      var ret = Math.floor(Date.now()/1000);
      if (ptr) {
        HEAP32[((ptr)>>2)]=ret
      }
      return ret;
    }
  function ___cxa_allocate_exception(size) {
      return _malloc(size);
    }
  function _llvm_eh_exception() {
      return HEAP32[((_llvm_eh_exception.buf)>>2)];
    }
  function __ZSt18uncaught_exceptionv() { // std::uncaught_exception()
      return !!__ZSt18uncaught_exceptionv.uncaught_exception;
    }
  function ___cxa_is_number_type(type) {
      var isNumber = false;
      try { if (type == __ZTIi) isNumber = true } catch(e){}
      try { if (type == __ZTIj) isNumber = true } catch(e){}
      try { if (type == __ZTIl) isNumber = true } catch(e){}
      try { if (type == __ZTIm) isNumber = true } catch(e){}
      try { if (type == __ZTIx) isNumber = true } catch(e){}
      try { if (type == __ZTIy) isNumber = true } catch(e){}
      try { if (type == __ZTIf) isNumber = true } catch(e){}
      try { if (type == __ZTId) isNumber = true } catch(e){}
      try { if (type == __ZTIe) isNumber = true } catch(e){}
      try { if (type == __ZTIc) isNumber = true } catch(e){}
      try { if (type == __ZTIa) isNumber = true } catch(e){}
      try { if (type == __ZTIh) isNumber = true } catch(e){}
      try { if (type == __ZTIs) isNumber = true } catch(e){}
      try { if (type == __ZTIt) isNumber = true } catch(e){}
      return isNumber;
    }function ___cxa_does_inherit(definiteType, possibilityType, possibility) {
      if (possibility == 0) return false;
      if (possibilityType == 0 || possibilityType == definiteType)
        return true;
      var possibility_type_info;
      if (___cxa_is_number_type(possibilityType)) {
        possibility_type_info = possibilityType;
      } else {
        var possibility_type_infoAddr = HEAP32[((possibilityType)>>2)] - 8;
        possibility_type_info = HEAP32[((possibility_type_infoAddr)>>2)];
      }
      switch (possibility_type_info) {
      case 0: // possibility is a pointer
        // See if definite type is a pointer
        var definite_type_infoAddr = HEAP32[((definiteType)>>2)] - 8;
        var definite_type_info = HEAP32[((definite_type_infoAddr)>>2)];
        if (definite_type_info == 0) {
          // Also a pointer; compare base types of pointers
          var defPointerBaseAddr = definiteType+8;
          var defPointerBaseType = HEAP32[((defPointerBaseAddr)>>2)];
          var possPointerBaseAddr = possibilityType+8;
          var possPointerBaseType = HEAP32[((possPointerBaseAddr)>>2)];
          return ___cxa_does_inherit(defPointerBaseType, possPointerBaseType, possibility);
        } else
          return false; // one pointer and one non-pointer
      case 1: // class with no base class
        return false;
      case 2: // class with base class
        var parentTypeAddr = possibilityType + 8;
        var parentType = HEAP32[((parentTypeAddr)>>2)];
        return ___cxa_does_inherit(definiteType, parentType, possibility);
      default:
        return false; // some unencountered type
      }
    }
  function ___resumeException(ptr) {
      if (HEAP32[((_llvm_eh_exception.buf)>>2)] == 0) HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr;
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }function ___cxa_find_matching_catch(thrown, throwntype) {
      if (thrown == -1) thrown = HEAP32[((_llvm_eh_exception.buf)>>2)];
      if (throwntype == -1) throwntype = HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)];
      var typeArray = Array.prototype.slice.call(arguments, 2);
      // If throwntype is a pointer, this means a pointer has been
      // thrown. When a pointer is thrown, actually what's thrown
      // is a pointer to the pointer. We'll dereference it.
      if (throwntype != 0 && !___cxa_is_number_type(throwntype)) {
        var throwntypeInfoAddr= HEAP32[((throwntype)>>2)] - 8;
        var throwntypeInfo= HEAP32[((throwntypeInfoAddr)>>2)];
        if (throwntypeInfo == 0)
          thrown = HEAP32[((thrown)>>2)];
      }
      // The different catch blocks are denoted by different types.
      // Due to inheritance, those types may not precisely match the
      // type of the thrown object. Find one which matches, and
      // return the type of the catch block which should be called.
      for (var i = 0; i < typeArray.length; i++) {
        if (___cxa_does_inherit(typeArray[i], throwntype, thrown))
          return ((asm["setTempRet0"](typeArray[i]),thrown)|0);
      }
      // Shouldn't happen unless we have bogus data in typeArray
      // or encounter a type for which emscripten doesn't have suitable
      // typeinfo defined. Best-efforts match just in case.
      return ((asm["setTempRet0"](throwntype),thrown)|0);
    }function ___cxa_throw(ptr, type, destructor) {
      if (!___cxa_throw.initialized) {
        try {
          HEAP32[((__ZTVN10__cxxabiv119__pointer_type_infoE)>>2)]=0; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv117__class_type_infoE)>>2)]=1; // Workaround for libcxxabi integration bug
        } catch(e){}
        try {
          HEAP32[((__ZTVN10__cxxabiv120__si_class_type_infoE)>>2)]=2; // Workaround for libcxxabi integration bug
        } catch(e){}
        ___cxa_throw.initialized = true;
      }
      HEAP32[((_llvm_eh_exception.buf)>>2)]=ptr
      HEAP32[(((_llvm_eh_exception.buf)+(4))>>2)]=type
      HEAP32[(((_llvm_eh_exception.buf)+(8))>>2)]=destructor
      if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
        __ZSt18uncaught_exceptionv.uncaught_exception = 1;
      } else {
        __ZSt18uncaught_exceptionv.uncaught_exception++;
      }
      throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch.";;
    }
  function ___cxa_call_unexpected(exception) {
      Module.printErr('Unexpected exception thrown, this is not properly supported - aborting');
      ABORT = true;
      throw exception;
    }
  Module["_strlen"] = _strlen;
  var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can't send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};
  var TTY={ttys:[],init:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process['stdin']['setEncoding']('utf8');
        // }
      },shutdown:function () {
        // https://github.com/kripken/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process['stdin']['pause']();
        // }
      },register:function (dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },stream_ops:{open:function (stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          stream.tty = tty;
          stream.seekable = false;
        },close:function (stream) {
          // flush any pending line data
          if (stream.tty.output.length) {
            stream.tty.ops.put_char(stream.tty, 10);
          }
        },read:function (stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.timestamp = Date.now();
          }
          return bytesRead;
        },write:function (stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(ERRNO_CODES.ENXIO);
          }
          for (var i = 0; i < length; i++) {
            try {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            } catch (e) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
          }
          if (length) {
            stream.node.timestamp = Date.now();
          }
          return i;
        }},default_tty_ops:{get_char:function (tty) {
          if (!tty.input.length) {
            var result = null;
            if (ENVIRONMENT_IS_NODE) {
              result = process['stdin']['read']();
              if (!result) {
                if (process['stdin']['_readableState'] && process['stdin']['_readableState']['ended']) {
                  return null;  // EOF
                }
                return undefined;  // no data available
              }
            } else if (typeof window != 'undefined' &&
              typeof window.prompt == 'function') {
              // Browser.
              result = window.prompt('Input: ');  // returns null on cancel
              if (result !== null) {
                result += '\n';
              }
            } else if (typeof readline == 'function') {
              // Command line.
              result = readline();
              if (result !== null) {
                result += '\n';
              }
            }
            if (!result) {
              return null;
            }
            tty.input = intArrayFromString(result, true);
          }
          return tty.input.shift();
        },put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['print'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }},default_tty1_ops:{put_char:function (tty, val) {
          if (val === null || val === 10) {
            Module['printErr'](tty.output.join(''));
            tty.output = [];
          } else {
            tty.output.push(TTY.utf8.processCChar(val));
          }
        }}};
  var MEMFS={CONTENT_OWNING:1,CONTENT_FLEXIBLE:2,CONTENT_FIXED:3,mount:function (mount) {
        return MEMFS.createNode(null, '/', 16384 | 0777, 0);
      },createNode:function (parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // no supported
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            lookup: MEMFS.node_ops.lookup,
            mknod: MEMFS.node_ops.mknod,
            mknod: MEMFS.node_ops.mknod,
            rename: MEMFS.node_ops.rename,
            unlink: MEMFS.node_ops.unlink,
            rmdir: MEMFS.node_ops.rmdir,
            readdir: MEMFS.node_ops.readdir,
            symlink: MEMFS.node_ops.symlink
          };
          node.stream_ops = {
            llseek: MEMFS.stream_ops.llseek
          };
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          };
          node.stream_ops = {
            llseek: MEMFS.stream_ops.llseek,
            read: MEMFS.stream_ops.read,
            write: MEMFS.stream_ops.write,
            allocate: MEMFS.stream_ops.allocate,
            mmap: MEMFS.stream_ops.mmap
          };
          node.contents = [];
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        } else if (FS.isLink(node.mode)) {
          node.node_ops = {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr,
            readlink: MEMFS.node_ops.readlink
          };
          node.stream_ops = {};
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = {
            getattr: MEMFS.node_ops.getattr,
            setattr: MEMFS.node_ops.setattr
          };
          node.stream_ops = FS.chrdev_stream_ops;
        }
        node.timestamp = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
        }
        return node;
      },ensureFlexible:function (node) {
        if (node.contentMode !== MEMFS.CONTENT_FLEXIBLE) {
          var contents = node.contents;
          node.contents = Array.prototype.slice.call(contents);
          node.contentMode = MEMFS.CONTENT_FLEXIBLE;
        }
      },node_ops:{getattr:function (node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.contents.length;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.timestamp);
          attr.mtime = new Date(node.timestamp);
          attr.ctime = new Date(node.timestamp);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },setattr:function (node, attr) {
          if (attr.mode !== undefined) {
            node.mode = attr.mode;
          }
          if (attr.timestamp !== undefined) {
            node.timestamp = attr.timestamp;
          }
          if (attr.size !== undefined) {
            MEMFS.ensureFlexible(node);
            var contents = node.contents;
            if (attr.size < contents.length) contents.length = attr.size;
            else while (attr.size > contents.length) contents.push(0);
          }
        },lookup:function (parent, name) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        },mknod:function (parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },rename:function (old_node, new_dir, new_name) {
          // if we're overwriting a directory at new_name, make sure it's empty.
          if (FS.isDir(old_node.mode)) {
            var new_node;
            try {
              new_node = FS.lookupNode(new_dir, new_name);
            } catch (e) {
            }
            if (new_node) {
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
              }
            }
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          old_node.name = new_name;
          new_dir.contents[new_name] = old_node;
          old_node.parent = new_dir;
        },unlink:function (parent, name) {
          delete parent.contents[name];
        },rmdir:function (parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
          }
          delete parent.contents[name];
        },readdir:function (node) {
          var entries = ['.', '..']
          for (var key in node.contents) {
            if (!node.contents.hasOwnProperty(key)) {
              continue;
            }
            entries.push(key);
          }
          return entries;
        },symlink:function (parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0777 | 40960, 0);
          node.link = oldpath;
          return node;
        },readlink:function (node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          return node.link;
        }},stream_ops:{read:function (stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (size > 8 && contents.subarray) { // non-trivial, and typed array
            buffer.set(contents.subarray(position, position + size), offset);
          } else
          {
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          }
          return size;
        },write:function (stream, buffer, offset, length, position, canOwn) {
          var node = stream.node;
          node.timestamp = Date.now();
          var contents = node.contents;
          if (length && contents.length === 0 && position === 0 && buffer.subarray) {
            // just replace it with the new data
            assert(buffer.length);
            if (canOwn && buffer.buffer === HEAP8.buffer && offset === 0) {
              node.contents = buffer; // this is a subarray of the heap, and we can own it
              node.contentMode = MEMFS.CONTENT_OWNING;
            } else {
              node.contents = new Uint8Array(buffer.subarray(offset, offset+length));
              node.contentMode = MEMFS.CONTENT_FIXED;
            }
            return length;
          }
          MEMFS.ensureFlexible(node);
          var contents = node.contents;
          while (contents.length < position) contents.push(0);
          for (var i = 0; i < length; i++) {
            contents[position + i] = buffer[offset + i];
          }
          return length;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.contents.length;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.ungotten = [];
          stream.position = position;
          return position;
        },allocate:function (stream, offset, length) {
          MEMFS.ensureFlexible(stream.node);
          var contents = stream.node.contents;
          var limit = offset + length;
          while (limit > contents.length) contents.push(0);
        },mmap:function (stream, buffer, offset, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if ( !(flags & 2) &&
                (contents.buffer === buffer || contents.buffer === buffer.buffer) ) {
            // We can't emulate MAP_SHARED when the file is not backed by the buffer
            // we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            // Try to avoid unnecessary slices.
            if (position > 0 || position + length < contents.length) {
              if (contents.subarray) {
                contents = contents.subarray(position, position + length);
              } else {
                contents = Array.prototype.slice.call(contents, position, position + length);
              }
            }
            allocated = true;
            ptr = _malloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(ERRNO_CODES.ENOMEM);
            }
            buffer.set(contents, ptr);
          }
          return { ptr: ptr, allocated: allocated };
        }}};
  var IDBFS={dbs:{},indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",mount:function (mount) {
        return MEMFS.mount.apply(null, arguments);
      },syncfs:function (mount, populate, callback) {
        IDBFS.getLocalSet(mount, function(err, local) {
          if (err) return callback(err);
          IDBFS.getRemoteSet(mount, function(err, remote) {
            if (err) return callback(err);
            var src = populate ? remote : local;
            var dst = populate ? local : remote;
            IDBFS.reconcile(src, dst, callback);
          });
        });
      },reconcile:function (src, dst, callback) {
        var total = 0;
        var create = {};
        for (var key in src.files) {
          if (!src.files.hasOwnProperty(key)) continue;
          var e = src.files[key];
          var e2 = dst.files[key];
          if (!e2 || e.timestamp > e2.timestamp) {
            create[key] = e;
            total++;
          }
        }
        var remove = {};
        for (var key in dst.files) {
          if (!dst.files.hasOwnProperty(key)) continue;
          var e = dst.files[key];
          var e2 = src.files[key];
          if (!e2) {
            remove[key] = e;
            total++;
          }
        }
        if (!total) {
          // early out
          return callback(null);
        }
        var completed = 0;
        var done = function(err) {
          if (err) return callback(err);
          if (++completed >= total) {
            return callback(null);
          }
        };
        // create a single transaction to handle and IDB reads / writes we'll need to do
        var db = src.type === 'remote' ? src.db : dst.db;
        var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readwrite');
        transaction.onerror = function() { callback(this.error); };
        var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
        for (var path in create) {
          if (!create.hasOwnProperty(path)) continue;
          var entry = create[path];
          if (dst.type === 'local') {
            // save file to local
            try {
              if (FS.isDir(entry.mode)) {
                FS.mkdir(path, entry.mode);
              } else if (FS.isFile(entry.mode)) {
                var stream = FS.open(path, 'w+', 0666);
                FS.write(stream, entry.contents, 0, entry.contents.length, 0, true /* canOwn */);
                FS.close(stream);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // save file to IDB
            var req = store.put(entry, path);
            req.onsuccess = function() { done(null); };
            req.onerror = function() { done(this.error); };
          }
        }
        for (var path in remove) {
          if (!remove.hasOwnProperty(path)) continue;
          var entry = remove[path];
          if (dst.type === 'local') {
            // delete file from local
            try {
              if (FS.isDir(entry.mode)) {
                // TODO recursive delete?
                FS.rmdir(path);
              } else if (FS.isFile(entry.mode)) {
                FS.unlink(path);
              }
              done(null);
            } catch (e) {
              return done(e);
            }
          } else {
            // delete file from IDB
            var req = store.delete(path);
            req.onsuccess = function() { done(null); };
            req.onerror = function() { done(this.error); };
          }
        }
      },getLocalSet:function (mount, callback) {
        var files = {};
        var isRealDir = function(p) {
          return p !== '.' && p !== '..';
        };
        var toAbsolute = function(root) {
          return function(p) {
            return PATH.join(root, p);
          }
        };
        var check = FS.readdir(mount.mountpoint)
          .filter(isRealDir)
          .map(toAbsolute(mount.mountpoint));
        while (check.length) {
          var path = check.pop();
          var stat, node;
          try {
            var lookup = FS.lookupPath(path);
            node = lookup.node;
            stat = FS.stat(path);
          } catch (e) {
            return callback(e);
          }
          if (FS.isDir(stat.mode)) {
            check.push.apply(check, FS.readdir(path)
              .filter(isRealDir)
              .map(toAbsolute(path)));
            files[path] = { mode: stat.mode, timestamp: stat.mtime };
          } else if (FS.isFile(stat.mode)) {
            files[path] = { contents: node.contents, mode: stat.mode, timestamp: stat.mtime };
          } else {
            return callback(new Error('node type not supported'));
          }
        }
        return callback(null, { type: 'local', files: files });
      },getDB:function (name, callback) {
        // look it up in the cache
        var db = IDBFS.dbs[name];
        if (db) {
          return callback(null, db);
        }
        var req;
        try {
          req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        req.onupgradeneeded = function() {
          db = req.result;
          db.createObjectStore(IDBFS.DB_STORE_NAME);
        };
        req.onsuccess = function() {
          db = req.result;
          // add to the cache
          IDBFS.dbs[name] = db;
          callback(null, db);
        };
        req.onerror = function() {
          callback(this.error);
        };
      },getRemoteSet:function (mount, callback) {
        var files = {};
        IDBFS.getDB(mount.mountpoint, function(err, db) {
          if (err) return callback(err);
          var transaction = db.transaction([IDBFS.DB_STORE_NAME], 'readonly');
          transaction.onerror = function() { callback(this.error); };
          var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
          store.openCursor().onsuccess = function(event) {
            var cursor = event.target.result;
            if (!cursor) {
              return callback(null, { type: 'remote', db: db, files: files });
            }
            files[cursor.key] = cursor.value;
            cursor.continue();
          };
        });
      }};
  var NODEFS={isWindows:false,staticInit:function () {
        NODEFS.isWindows = !!process.platform.match(/^win/);
      },mount:function (mount) {
        assert(ENVIRONMENT_IS_NODE);
        return NODEFS.createNode(null, '/', NODEFS.getMode(mount.opts.root), 0);
      },createNode:function (parent, name, mode, dev) {
        if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node = FS.createNode(parent, name, mode);
        node.node_ops = NODEFS.node_ops;
        node.stream_ops = NODEFS.stream_ops;
        return node;
      },getMode:function (path) {
        var stat;
        try {
          stat = fs.lstatSync(path);
          if (NODEFS.isWindows) {
            // On Windows, directories return permission bits 'rw-rw-rw-', even though they have 'rwxrwxrwx', so 
            // propagate write bits to execute bits.
            stat.mode = stat.mode | ((stat.mode & 146) >> 1);
          }
        } catch (e) {
          if (!e.code) throw e;
          throw new FS.ErrnoError(ERRNO_CODES[e.code]);
        }
        return stat.mode;
      },realPath:function (node) {
        var parts = [];
        while (node.parent !== node) {
          parts.push(node.name);
          node = node.parent;
        }
        parts.push(node.mount.opts.root);
        parts.reverse();
        return PATH.join.apply(null, parts);
      },flagsToPermissionStringMap:{0:"r",1:"r+",2:"r+",64:"r",65:"r+",66:"r+",129:"rx+",193:"rx+",514:"w+",577:"w",578:"w+",705:"wx",706:"wx+",1024:"a",1025:"a",1026:"a+",1089:"a",1090:"a+",1153:"ax",1154:"ax+",1217:"ax",1218:"ax+",4096:"rs",4098:"rs+"},flagsToPermissionString:function (flags) {
        if (flags in NODEFS.flagsToPermissionStringMap) {
          return NODEFS.flagsToPermissionStringMap[flags];
        } else {
          return flags;
        }
      },node_ops:{getattr:function (node) {
          var path = NODEFS.realPath(node);
          var stat;
          try {
            stat = fs.lstatSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          // node.js v0.10.20 doesn't report blksize and blocks on Windows. Fake them with default blksize of 4096.
          // See http://support.microsoft.com/kb/140365
          if (NODEFS.isWindows && !stat.blksize) {
            stat.blksize = 4096;
          }
          if (NODEFS.isWindows && !stat.blocks) {
            stat.blocks = (stat.size+stat.blksize-1)/stat.blksize|0;
          }
          return {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode,
            nlink: stat.nlink,
            uid: stat.uid,
            gid: stat.gid,
            rdev: stat.rdev,
            size: stat.size,
            atime: stat.atime,
            mtime: stat.mtime,
            ctime: stat.ctime,
            blksize: stat.blksize,
            blocks: stat.blocks
          };
        },setattr:function (node, attr) {
          var path = NODEFS.realPath(node);
          try {
            if (attr.mode !== undefined) {
              fs.chmodSync(path, attr.mode);
              // update the common node structure mode as well
              node.mode = attr.mode;
            }
            if (attr.timestamp !== undefined) {
              var date = new Date(attr.timestamp);
              fs.utimesSync(path, date, date);
            }
            if (attr.size !== undefined) {
              fs.truncateSync(path, attr.size);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },lookup:function (parent, name) {
          var path = PATH.join(NODEFS.realPath(parent), name);
          var mode = NODEFS.getMode(path);
          return NODEFS.createNode(parent, name, mode);
        },mknod:function (parent, name, mode, dev) {
          var node = NODEFS.createNode(parent, name, mode, dev);
          // create the backing node for this in the fs root as well
          var path = NODEFS.realPath(node);
          try {
            if (FS.isDir(node.mode)) {
              fs.mkdirSync(path, node.mode);
            } else {
              fs.writeFileSync(path, '', { mode: node.mode });
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return node;
        },rename:function (oldNode, newDir, newName) {
          var oldPath = NODEFS.realPath(oldNode);
          var newPath = PATH.join(NODEFS.realPath(newDir), newName);
          try {
            fs.renameSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },unlink:function (parent, name) {
          var path = PATH.join(NODEFS.realPath(parent), name);
          try {
            fs.unlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },rmdir:function (parent, name) {
          var path = PATH.join(NODEFS.realPath(parent), name);
          try {
            fs.rmdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readdir:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readdirSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },symlink:function (parent, newName, oldPath) {
          var newPath = PATH.join(NODEFS.realPath(parent), newName);
          try {
            fs.symlinkSync(oldPath, newPath);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },readlink:function (node) {
          var path = NODEFS.realPath(node);
          try {
            return fs.readlinkSync(path);
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        }},stream_ops:{open:function (stream) {
          var path = NODEFS.realPath(stream.node);
          try {
            if (FS.isFile(stream.node.mode)) {
              stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags));
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },close:function (stream) {
          try {
            if (FS.isFile(stream.node.mode) && stream.nfd) {
              fs.closeSync(stream.nfd);
            }
          } catch (e) {
            if (!e.code) throw e;
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
        },read:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(length);
          var res;
          try {
            res = fs.readSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          if (res > 0) {
            for (var i = 0; i < res; i++) {
              buffer[offset + i] = nbuffer[i];
            }
          }
          return res;
        },write:function (stream, buffer, offset, length, position) {
          // FIXME this is terrible.
          var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
          var res;
          try {
            res = fs.writeSync(stream.nfd, nbuffer, 0, length, position);
          } catch (e) {
            throw new FS.ErrnoError(ERRNO_CODES[e.code]);
          }
          return res;
        },llseek:function (stream, offset, whence) {
          var position = offset;
          if (whence === 1) {  // SEEK_CUR.
            position += stream.position;
          } else if (whence === 2) {  // SEEK_END.
            if (FS.isFile(stream.node.mode)) {
              try {
                var stat = fs.fstatSync(stream.nfd);
                position += stat.size;
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES[e.code]);
              }
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
          }
          stream.position = position;
          return position;
        }}};
  var _stdin=allocate(1, "i32*", ALLOC_STATIC);
  var _stdout=allocate(1, "i32*", ALLOC_STATIC);
  var _stderr=allocate(1, "i32*", ALLOC_STATIC);
  function _fflush(stream) {
      // int fflush(FILE *stream);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/fflush.html
      // we don't currently perform any user-space buffering of data
    }var FS={root:null,mounts:[],devices:[null],streams:[null],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,ErrnoError:null,handleFSError:function (e) {
        if (!(e instanceof FS.ErrnoError)) throw e + ' : ' + stackTrace();
        return ___setErrNo(e.errno);
      },lookupPath:function (path, opts) {
        path = PATH.resolve(FS.cwd(), path);
        opts = opts || { recurse_count: 0 };
        if (opts.recurse_count > 8) {  // max recursive lookup of 8
          throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
        }
        // split the path
        var parts = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), false);
        // start at the root
        var current = FS.root;
        var current_path = '/';
        for (var i = 0; i < parts.length; i++) {
          var islast = (i === parts.length-1);
          if (islast && opts.parent) {
            // stop resolving
            break;
          }
          current = FS.lookupNode(current, parts[i]);
          current_path = PATH.join(current_path, parts[i]);
          // jump to the mount's root node if this is a mountpoint
          if (FS.isMountpoint(current)) {
            current = current.mount.root;
          }
          // follow symlinks
          // by default, lookupPath will not follow a symlink if it is the final path component.
          // setting opts.follow = true will override this behavior.
          if (!islast || opts.follow) {
            var count = 0;
            while (FS.isLink(current.mode)) {
              var link = FS.readlink(current_path);
              current_path = PATH.resolve(PATH.dirname(current_path), link);
              var lookup = FS.lookupPath(current_path, { recurse_count: opts.recurse_count });
              current = lookup.node;
              if (count++ > 40) {  // limit max consecutive symlinks to 40 (SYMLOOP_MAX).
                throw new FS.ErrnoError(ERRNO_CODES.ELOOP);
              }
            }
          }
        }
        return { path: current_path, node: current };
      },getPath:function (node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            return path ? PATH.join(node.mount.mountpoint, path) : node.mount.mountpoint;
          }
          path = path ? PATH.join(node.name, path) : node.name;
          node = node.parent;
        }
      },hashName:function (parentid, name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },hashAddNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },hashRemoveNode:function (node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },lookupNode:function (parent, name) {
        var err = FS.mayLookup(parent);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },createNode:function (parent, name, mode, rdev) {
        var node = {
          id: FS.nextInode++,
          name: name,
          mode: mode,
          node_ops: {},
          stream_ops: {},
          rdev: rdev,
          parent: null,
          mount: null
        };
        if (!parent) {
          parent = node;  // root node sets parent to itself
        }
        node.parent = parent;
        node.mount = parent.mount;
        // compatibility
        var readMode = 292 | 73;
        var writeMode = 146;
        // NOTE we must use Object.defineProperties instead of individual calls to
        // Object.defineProperty in order to make closure compiler happy
        Object.defineProperties(node, {
          read: {
            get: function() { return (node.mode & readMode) === readMode; },
            set: function(val) { val ? node.mode |= readMode : node.mode &= ~readMode; }
          },
          write: {
            get: function() { return (node.mode & writeMode) === writeMode; },
            set: function(val) { val ? node.mode |= writeMode : node.mode &= ~writeMode; }
          },
          isFolder: {
            get: function() { return FS.isDir(node.mode); },
          },
          isDevice: {
            get: function() { return FS.isChrdev(node.mode); },
          },
        });
        FS.hashAddNode(node);
        return node;
      },destroyNode:function (node) {
        FS.hashRemoveNode(node);
      },isRoot:function (node) {
        return node === node.parent;
      },isMountpoint:function (node) {
        return node.mounted;
      },isFile:function (mode) {
        return (mode & 61440) === 32768;
      },isDir:function (mode) {
        return (mode & 61440) === 16384;
      },isLink:function (mode) {
        return (mode & 61440) === 40960;
      },isChrdev:function (mode) {
        return (mode & 61440) === 8192;
      },isBlkdev:function (mode) {
        return (mode & 61440) === 24576;
      },isFIFO:function (mode) {
        return (mode & 61440) === 4096;
      },isSocket:function (mode) {
        return (mode & 49152) === 49152;
      },flagModes:{"r":0,"rs":1052672,"r+":2,"w":577,"wx":705,"xw":705,"w+":578,"wx+":706,"xw+":706,"a":1089,"ax":1217,"xa":1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function (str) {
        var flags = FS.flagModes[str];
        if (typeof flags === 'undefined') {
          throw new Error('Unknown file open mode: ' + str);
        }
        return flags;
      },flagsToPermissionString:function (flag) {
        var accmode = flag & 2097155;
        var perms = ['r', 'w', 'rw'][accmode];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },nodePermissions:function (node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.indexOf('r') !== -1 && !(node.mode & 292)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('w') !== -1 && !(node.mode & 146)) {
          return ERRNO_CODES.EACCES;
        } else if (perms.indexOf('x') !== -1 && !(node.mode & 73)) {
          return ERRNO_CODES.EACCES;
        }
        return 0;
      },mayLookup:function (dir) {
        return FS.nodePermissions(dir, 'x');
      },mayCreate:function (dir, name) {
        try {
          var node = FS.lookupNode(dir, name);
          return ERRNO_CODES.EEXIST;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },mayDelete:function (dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var err = FS.nodePermissions(dir, 'wx');
        if (err) {
          return err;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return ERRNO_CODES.ENOTDIR;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return ERRNO_CODES.EBUSY;
          }
        } else {
          if (FS.isDir(node.mode)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return 0;
      },mayOpen:function (node, flags) {
        if (!node) {
          return ERRNO_CODES.ENOENT;
        }
        if (FS.isLink(node.mode)) {
          return ERRNO_CODES.ELOOP;
        } else if (FS.isDir(node.mode)) {
          if ((flags & 2097155) !== 0 ||  // opening for write
              (flags & 512)) {
            return ERRNO_CODES.EISDIR;
          }
        }
        return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
      },MAX_OPEN_FDS:4096,nextfd:function (fd_start, fd_end) {
        fd_start = fd_start || 1;
        fd_end = fd_end || FS.MAX_OPEN_FDS;
        for (var fd = fd_start; fd <= fd_end; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(ERRNO_CODES.EMFILE);
      },getStream:function (fd) {
        return FS.streams[fd];
      },createStream:function (stream, fd_start, fd_end) {
        var fd = FS.nextfd(fd_start, fd_end);
        stream.fd = fd;
        // compatibility
        Object.defineProperties(stream, {
          object: {
            get: function() { return stream.node; },
            set: function(val) { stream.node = val; }
          },
          isRead: {
            get: function() { return (stream.flags & 2097155) !== 1; }
          },
          isWrite: {
            get: function() { return (stream.flags & 2097155) !== 0; }
          },
          isAppend: {
            get: function() { return (stream.flags & 1024); }
          }
        });
        FS.streams[fd] = stream;
        return stream;
      },closeStream:function (fd) {
        FS.streams[fd] = null;
      },chrdev_stream_ops:{open:function (stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          if (stream.stream_ops.open) {
            stream.stream_ops.open(stream);
          }
        },llseek:function () {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }},major:function (dev) {
        return ((dev) >> 8);
      },minor:function (dev) {
        return ((dev) & 0xff);
      },makedev:function (ma, mi) {
        return ((ma) << 8 | (mi));
      },registerDevice:function (dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },getDevice:function (dev) {
        return FS.devices[dev];
      },syncfs:function (populate, callback) {
        if (typeof(populate) === 'function') {
          callback = populate;
          populate = false;
        }
        var completed = 0;
        var total = FS.mounts.length;
        var done = function(err) {
          if (err) {
            return callback(err);
          }
          if (++completed >= total) {
            callback(null);
          }
        };
        // sync all mounts
        for (var i = 0; i < FS.mounts.length; i++) {
          var mount = FS.mounts[i];
          if (!mount.type.syncfs) {
            done(null);
            continue;
          }
          mount.type.syncfs(mount, populate, done);
        }
      },mount:function (type, opts, mountpoint) {
        var lookup;
        if (mountpoint) {
          lookup = FS.lookupPath(mountpoint, { follow: false });
          mountpoint = lookup.path;  // use the absolute path
        }
        var mount = {
          type: type,
          opts: opts,
          mountpoint: mountpoint,
          root: null
        };
        // create a root node for the fs
        var root = type.mount(mount);
        root.mount = mount;
        mount.root = root;
        // assign the mount info to the mountpoint's node
        if (lookup) {
          lookup.node.mount = mount;
          lookup.node.mounted = true;
          // compatibility update FS.root if we mount to /
          if (mountpoint === '/') {
            FS.root = mount.root;
          }
        }
        // add to our cached list of mounts
        FS.mounts.push(mount);
        return root;
      },lookup:function (parent, name) {
        return parent.node_ops.lookup(parent, name);
      },mknod:function (path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var err = FS.mayCreate(parent, name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },create:function (path, mode) {
        mode = mode !== undefined ? mode : 0666;
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },mkdir:function (path, mode) {
        mode = mode !== undefined ? mode : 0777;
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },mkdev:function (path, mode, dev) {
        if (typeof(dev) === 'undefined') {
          dev = mode;
          mode = 0666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },symlink:function (oldpath, newpath) {
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        var newname = PATH.basename(newpath);
        var err = FS.mayCreate(parent, newname);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },rename:function (old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
        try {
          lookup = FS.lookupPath(old_path, { parent: true });
          old_dir = lookup.node;
          lookup = FS.lookupPath(new_path, { parent: true });
          new_dir = lookup.node;
        } catch (e) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(ERRNO_CODES.EXDEV);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        // new path should not be an ancestor of the old path
        relative = PATH.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var err = FS.mayDelete(old_dir, old_name, isdir);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        err = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          err = FS.nodePermissions(old_dir, 'w');
          if (err) {
            throw new FS.ErrnoError(err);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },rmdir:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, true);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },readdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        if (!node.node_ops.readdir) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        return node.node_ops.readdir(node);
      },unlink:function (path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var err = FS.mayDelete(parent, name, false);
        if (err) {
          // POSIX says unlink should set EPERM, not EISDIR
          if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
          throw new FS.ErrnoError(err);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(ERRNO_CODES.EBUSY);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },readlink:function (path) {
        var lookup = FS.lookupPath(path, { follow: false });
        var link = lookup.node;
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        return link.node_ops.readlink(link);
      },stat:function (path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        if (!node.node_ops.getattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        return node.node_ops.getattr(node);
      },lstat:function (path) {
        return FS.stat(path, true);
      },chmod:function (path, mode, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          timestamp: Date.now()
        });
      },lchmod:function (path, mode) {
        FS.chmod(path, mode, true);
      },fchmod:function (fd, mode) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chmod(stream.node, mode);
      },chown:function (path, uid, gid, dontFollow) {
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        node.node_ops.setattr(node, {
          timestamp: Date.now()
          // we ignore the uid / gid for now
        });
      },lchown:function (path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },fchown:function (fd, uid, gid) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        FS.chown(stream.node, uid, gid);
      },truncate:function (path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var node;
        if (typeof path === 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        if (!node.node_ops.setattr) {
          throw new FS.ErrnoError(ERRNO_CODES.EPERM);
        }
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var err = FS.nodePermissions(node, 'w');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        node.node_ops.setattr(node, {
          size: len,
          timestamp: Date.now()
        });
      },ftruncate:function (fd, len) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        FS.truncate(stream.node, len);
      },utime:function (path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        node.node_ops.setattr(node, {
          timestamp: Math.max(atime, mtime)
        });
      },open:function (path, flags, mode, fd_start, fd_end) {
        path = PATH.normalize(path);
        flags = typeof flags === 'string' ? FS.modeStringToFlags(flags) : flags;
        mode = typeof mode === 'undefined' ? 0666 : mode;
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        try {
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072)
          });
          node = lookup.node;
        } catch (e) {
          // ignore
        }
        // perhaps we need to create the node
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(ERRNO_CODES.EEXIST);
            }
          } else {
            // node doesn't exist, try to create it
            node = FS.mknod(path, mode, 0);
          }
        }
        if (!node) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // check permissions
        var err = FS.mayOpen(node, flags);
        if (err) {
          throw new FS.ErrnoError(err);
        }
        // do truncation if necessary
        if ((flags & 512)) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512);
        // register the stream with the filesystem
        var stream = FS.createStream({
          node: node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags: flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        }, fd_start, fd_end);
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (Module['logReadFiles'] && !(flags & 1)) {
          if (!FS.readFiles) FS.readFiles = {};
          if (!(path in FS.readFiles)) {
            FS.readFiles[path] = 1;
            Module['printErr']('read file: ' + path);
          }
        }
        return stream;
      },close:function (stream) {
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
      },llseek:function (stream, offset, whence) {
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        return stream.stream_ops.llseek(stream, offset, whence);
      },read:function (stream, buffer, offset, length, position) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },write:function (stream, buffer, offset, length, position, canOwn) {
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.EISDIR);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        var seeking = true;
        if (typeof position === 'undefined') {
          position = stream.position;
          seeking = false;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(ERRNO_CODES.ESPIPE);
        }
        if (stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },allocate:function (stream, offset, length) {
        if (offset < 0 || length <= 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EINVAL);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(ERRNO_CODES.EBADF);
        }
        if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENODEV);
        }
        if (!stream.stream_ops.allocate) {
          throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP);
        }
        stream.stream_ops.allocate(stream, offset, length);
      },mmap:function (stream, buffer, offset, length, position, prot, flags) {
        // TODO if PROT is PROT_WRITE, make sure we have write access
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(ERRNO_CODES.EACCES);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.errnoError(ERRNO_CODES.ENODEV);
        }
        return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags);
      },ioctl:function (stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTTY);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },readFile:function (path, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'r';
        opts.encoding = opts.encoding || 'binary';
        var ret;
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          ret = '';
          var utf8 = new Runtime.UTF8Processor();
          for (var i = 0; i < length; i++) {
            ret += utf8.processCChar(buf[i]);
          }
        } else if (opts.encoding === 'binary') {
          ret = buf;
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
        return ret;
      },writeFile:function (path, data, opts) {
        opts = opts || {};
        opts.flags = opts.flags || 'w';
        opts.encoding = opts.encoding || 'utf8';
        var stream = FS.open(path, opts.flags, opts.mode);
        if (opts.encoding === 'utf8') {
          var utf8 = new Runtime.UTF8Processor();
          var buf = new Uint8Array(utf8.processJSString(data));
          FS.write(stream, buf, 0, buf.length, 0);
        } else if (opts.encoding === 'binary') {
          FS.write(stream, data, 0, data.length, 0);
        } else {
          throw new Error('Invalid encoding type "' + opts.encoding + '"');
        }
        FS.close(stream);
      },cwd:function () {
        return FS.currentPath;
      },chdir:function (path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR);
        }
        var err = FS.nodePermissions(lookup.node, 'x');
        if (err) {
          throw new FS.ErrnoError(err);
        }
        FS.currentPath = lookup.path;
      },createDefaultDirectories:function () {
        FS.mkdir('/tmp');
      },createDefaultDevices:function () {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: function() { return 0; },
          write: function() { return 0; }
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using Module['printErr']
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },createStandardStreams:function () {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (Module['stdin']) {
          FS.createDevice('/dev', 'stdin', Module['stdin']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (Module['stdout']) {
          FS.createDevice('/dev', 'stdout', null, Module['stdout']);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (Module['stderr']) {
          FS.createDevice('/dev', 'stderr', null, Module['stderr']);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 'r');
        HEAP32[((_stdin)>>2)]=stdin.fd;
        assert(stdin.fd === 1, 'invalid handle for stdin (' + stdin.fd + ')');
        var stdout = FS.open('/dev/stdout', 'w');
        HEAP32[((_stdout)>>2)]=stdout.fd;
        assert(stdout.fd === 2, 'invalid handle for stdout (' + stdout.fd + ')');
        var stderr = FS.open('/dev/stderr', 'w');
        HEAP32[((_stderr)>>2)]=stderr.fd;
        assert(stderr.fd === 3, 'invalid handle for stderr (' + stderr.fd + ')');
      },ensureErrnoError:function () {
        if (FS.ErrnoError) return;
        FS.ErrnoError = function ErrnoError(errno) {
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
          this.message = ERRNO_MESSAGES[errno];
          this.stack = stackTrace();
        };
        FS.ErrnoError.prototype = new Error();
        FS.ErrnoError.prototype.constructor = FS.ErrnoError;
      },staticInit:function () {
        FS.ensureErrnoError();
        FS.nameTable = new Array(4096);
        FS.root = FS.createNode(null, '/', 16384 | 0777, 0);
        FS.mount(MEMFS, {}, '/');
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
      },init:function (input, output, error) {
        assert(!FS.init.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.init.initialized = true;
        FS.ensureErrnoError();
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        Module['stdin'] = input || Module['stdin'];
        Module['stdout'] = output || Module['stdout'];
        Module['stderr'] = error || Module['stderr'];
        FS.createStandardStreams();
      },quit:function () {
        FS.init.initialized = false;
        for (var i = 0; i < FS.streams.length; i++) {
          var stream = FS.streams[i];
          if (!stream) {
            continue;
          }
          FS.close(stream);
        }
      },getMode:function (canRead, canWrite) {
        var mode = 0;
        if (canRead) mode |= 292 | 73;
        if (canWrite) mode |= 146;
        return mode;
      },joinPath:function (parts, forceRelative) {
        var path = PATH.join.apply(null, parts);
        if (forceRelative && path[0] == '/') path = path.substr(1);
        return path;
      },absolutePath:function (relative, base) {
        return PATH.resolve(base, relative);
      },standardizePath:function (path) {
        return PATH.normalize(path);
      },findObject:function (path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (ret.exists) {
          return ret.object;
        } else {
          ___setErrNo(ret.error);
          return null;
        }
      },analyzePath:function (path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },createFolder:function (parent, name, canRead, canWrite) {
        var path = PATH.join(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.mkdir(path, mode);
      },createPath:function (parent, path, canRead, canWrite) {
        parent = typeof parent === 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            // ignore EEXIST
          }
          parent = current;
        }
        return current;
      },createFile:function (parent, name, properties, canRead, canWrite) {
        var path = PATH.join(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(canRead, canWrite);
        return FS.create(path, mode);
      },createDataFile:function (parent, name, data, canRead, canWrite, canOwn) {
        var path = name ? PATH.join(typeof parent === 'string' ? parent : FS.getPath(parent), name) : parent;
        var mode = FS.getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          if (typeof data === 'string') {
            var arr = new Array(data.length);
            for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
            data = arr;
          }
          // make sure we can write to the file
          FS.chmod(path, mode | 146);
          var stream = FS.open(path, 'w');
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(path, mode);
        }
        return node;
      },createDevice:function (parent, name, input, output) {
        var path = PATH.join(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        var mode = FS.getMode(!!input, !!output);
        if (!FS.createDevice.major) FS.createDevice.major = 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open: function(stream) {
            stream.seekable = false;
          },
          close: function(stream) {
            // flush any pending line data
            if (output && output.buffer && output.buffer.length) {
              output(10);
            }
          },
          read: function(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(ERRNO_CODES.EAGAIN);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.timestamp = Date.now();
            }
            return bytesRead;
          },
          write: function(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(ERRNO_CODES.EIO);
              }
            }
            if (length) {
              stream.node.timestamp = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },createLink:function (parent, name, target, canRead, canWrite) {
        var path = PATH.join(typeof parent === 'string' ? parent : FS.getPath(parent), name);
        return FS.symlink(target, path);
      },forceLoadFile:function (obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        var success = true;
        if (typeof XMLHttpRequest !== 'undefined') {
          throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else if (Module['read']) {
          // Command-line.
          try {
            // WARNING: Can't read binary files in V8's d8 or tracemonkey's js, as
            //          read() will try to parse UTF8.
            obj.contents = intArrayFromString(Module['read'](obj.url), true);
          } catch (e) {
            success = false;
          }
        } else {
          throw new Error('Cannot load without read() or XMLHttpRequest.');
        }
        if (!success) ___setErrNo(ERRNO_CODES.EIO);
        return success;
      },createLazyFile:function (parent, name, url, canRead, canWrite) {
        if (typeof XMLHttpRequest !== 'undefined') {
          if (!ENVIRONMENT_IS_WORKER) throw 'Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc';
          // Lazy chunked Uint8Array (implements get and length from Uint8Array). Actual getting is abstracted away for eventual reuse.
          var LazyUint8Array = function() {
            this.lengthKnown = false;
            this.chunks = []; // Loaded chunks. Index is the chunk number
          }
          LazyUint8Array.prototype.get = function(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = Math.floor(idx / this.chunkSize);
            return this.getter(chunkNum)[chunkOffset];
          }
          LazyUint8Array.prototype.setDataGetter = function(getter) {
            this.getter = getter;
          }
          LazyUint8Array.prototype.cacheLength = function() {
              // Find length
              var xhr = new XMLHttpRequest();
              xhr.open('HEAD', url, false);
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
              var datalength = Number(xhr.getResponseHeader("Content-length"));
              var header;
              var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
              var chunkSize = 1024*1024; // Chunk size in bytes
              if (!hasByteServing) chunkSize = datalength;
              // Function to get a range from the remote URL.
              var doXHR = (function(from, to) {
                if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
                if (to > datalength-1) throw new Error("only " + datalength + " bytes available! programmer error!");
                // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, false);
                if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
                // Some hints to the browser that we want binary data.
                if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
                if (xhr.overrideMimeType) {
                  xhr.overrideMimeType('text/plain; charset=x-user-defined');
                }
                xhr.send(null);
                if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
                if (xhr.response !== undefined) {
                  return new Uint8Array(xhr.response || []);
                } else {
                  return intArrayFromString(xhr.responseText || '', true);
                }
              });
              var lazyArray = this;
              lazyArray.setDataGetter(function(chunkNum) {
                var start = chunkNum * chunkSize;
                var end = (chunkNum+1) * chunkSize - 1; // including this byte
                end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") {
                  lazyArray.chunks[chunkNum] = doXHR(start, end);
                }
                if (typeof(lazyArray.chunks[chunkNum]) === "undefined") throw new Error("doXHR failed!");
                return lazyArray.chunks[chunkNum];
              });
              this._length = datalength;
              this._chunkSize = chunkSize;
              this.lengthKnown = true;
          }
          var lazyArray = new LazyUint8Array();
          Object.defineProperty(lazyArray, "length", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._length;
              }
          });
          Object.defineProperty(lazyArray, "chunkSize", {
              get: function() {
                  if(!this.lengthKnown) {
                      this.cacheLength();
                  }
                  return this._chunkSize;
              }
          });
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        var keys = Object.keys(node.stream_ops);
        keys.forEach(function(key) {
          var fn = node.stream_ops[key];
          stream_ops[key] = function() {
            if (!FS.forceLoadFile(node)) {
              throw new FS.ErrnoError(ERRNO_CODES.EIO);
            }
            return fn.apply(null, arguments);
          };
        });
        // use a custom read function
        stream_ops.read = function(stream, buffer, offset, length, position) {
          if (!FS.forceLoadFile(node)) {
            throw new FS.ErrnoError(ERRNO_CODES.EIO);
          }
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        };
        node.stream_ops = stream_ops;
        return node;
      },createPreloadedFile:function (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
        Browser.init();
        // TODO we should allow people to just pass in a complete filename instead
        // of parent and name being that we just join them anyways
        var fullname = name ? PATH.resolve(PATH.join(parent, name)) : parent;
        function processData(byteArray) {
          function finish(byteArray) {
            if (!dontCreateFile) {
              FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
            }
            if (onload) onload();
            removeRunDependency('cp ' + fullname);
          }
          var handled = false;
          Module['preloadPlugins'].forEach(function(plugin) {
            if (handled) return;
            if (plugin['canHandle'](fullname)) {
              plugin['handle'](byteArray, fullname, finish, function() {
                if (onerror) onerror();
                removeRunDependency('cp ' + fullname);
              });
              handled = true;
            }
          });
          if (!handled) finish(byteArray);
        }
        addRunDependency('cp ' + fullname);
        if (typeof url == 'string') {
          Browser.asyncLoad(url, function(byteArray) {
            processData(byteArray);
          }, onerror);
        } else {
          processData(url);
        }
      },indexedDB:function () {
        return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
      },DB_NAME:function () {
        return 'EM_FS_' + window.location.pathname;
      },DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = function() {
          console.log('creating db');
          var db = openRequest.result;
          db.createObjectStore(FS.DB_STORE_NAME);
        };
        openRequest.onsuccess = function() {
          var db = openRequest.result;
          var transaction = db.transaction([FS.DB_STORE_NAME], 'readwrite');
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var putRequest = files.put(FS.analyzePath(path).object.contents, path);
            putRequest.onsuccess = function() { ok++; if (ok + fail == total) finish() };
            putRequest.onerror = function() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      },loadFilesFromDB:function (paths, onload, onerror) {
        onload = onload || function(){};
        onerror = onerror || function(){};
        var indexedDB = FS.indexedDB();
        try {
          var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
        } catch (e) {
          return onerror(e);
        }
        openRequest.onupgradeneeded = onerror; // no database to load from
        openRequest.onsuccess = function() {
          var db = openRequest.result;
          try {
            var transaction = db.transaction([FS.DB_STORE_NAME], 'readonly');
          } catch(e) {
            onerror(e);
            return;
          }
          var files = transaction.objectStore(FS.DB_STORE_NAME);
          var ok = 0, fail = 0, total = paths.length;
          function finish() {
            if (fail == 0) onload(); else onerror();
          }
          paths.forEach(function(path) {
            var getRequest = files.get(path);
            getRequest.onsuccess = function() {
              if (FS.analyzePath(path).exists) {
                FS.unlink(path);
              }
              FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
              ok++;
              if (ok + fail == total) finish();
            };
            getRequest.onerror = function() { fail++; if (ok + fail == total) finish() };
          });
          transaction.onerror = onerror;
        };
        openRequest.onerror = onerror;
      }};var PATH={splitPath:function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },normalizeArray:function (parts, allowAboveRoot) {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up--; up) {
            parts.unshift('..');
          }
        }
        return parts;
      },normalize:function (path) {
        var isAbsolute = path.charAt(0) === '/',
            trailingSlash = path.substr(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter(function(p) {
          return !!p;
        }), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },dirname:function (path) {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },basename:function (path, ext) {
        // EMSCRIPTEN return '/'' for '/', not an empty string
        if (path === '/') return '/';
        var f = PATH.splitPath(path)[2];
        if (ext && f.substr(-1 * ext.length) === ext) {
          f = f.substr(0, f.length - ext.length);
        }
        return f;
      },extname:function (path) {
        return PATH.splitPath(path)[3];
      },join:function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.filter(function(p, index) {
          if (typeof p !== 'string') {
            throw new TypeError('Arguments to path.join must be strings');
          }
          return p;
        }).join('/'));
      },resolve:function () {
        var resolvedPath = '',
          resolvedAbsolute = false;
        for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          var path = (i >= 0) ? arguments[i] : FS.cwd();
          // Skip empty and invalid entries
          if (typeof path !== 'string') {
            throw new TypeError('Arguments to path.resolve must be strings');
          } else if (!path) {
            continue;
          }
          resolvedPath = path + '/' + resolvedPath;
          resolvedAbsolute = path.charAt(0) === '/';
        }
        // At this point the path should be resolved to a full absolute path, but
        // handle relative paths to be safe (might happen when process.cwd() fails)
        resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter(function(p) {
          return !!p;
        }), !resolvedAbsolute).join('/');
        return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
      },relative:function (from, to) {
        from = PATH.resolve(from).substr(1);
        to = PATH.resolve(to).substr(1);
        function trim(arr) {
          var start = 0;
          for (; start < arr.length; start++) {
            if (arr[start] !== '') break;
          }
          var end = arr.length - 1;
          for (; end >= 0; end--) {
            if (arr[end] !== '') break;
          }
          if (start > end) return [];
          return arr.slice(start, end - start + 1);
        }
        var fromParts = trim(from.split('/'));
        var toParts = trim(to.split('/'));
        var length = Math.min(fromParts.length, toParts.length);
        var samePartsLength = length;
        for (var i = 0; i < length; i++) {
          if (fromParts[i] !== toParts[i]) {
            samePartsLength = i;
            break;
          }
        }
        var outputParts = [];
        for (var i = samePartsLength; i < fromParts.length; i++) {
          outputParts.push('..');
        }
        outputParts = outputParts.concat(toParts.slice(samePartsLength));
        return outputParts.join('/');
      }};var Browser={mainLoop:{scheduler:null,shouldPause:false,paused:false,queue:[],pause:function () {
          Browser.mainLoop.shouldPause = true;
        },resume:function () {
          if (Browser.mainLoop.paused) {
            Browser.mainLoop.paused = false;
            Browser.mainLoop.scheduler();
          }
          Browser.mainLoop.shouldPause = false;
        },updateStatus:function () {
          if (Module['setStatus']) {
            var message = Module['statusMessage'] || 'Please wait...';
            var remaining = Browser.mainLoop.remainingBlockers;
            var expected = Browser.mainLoop.expectedBlockers;
            if (remaining) {
              if (remaining < expected) {
                Module['setStatus'](message + ' (' + (expected - remaining) + '/' + expected + ')');
              } else {
                Module['setStatus'](message);
              }
            } else {
              Module['setStatus']('');
            }
          }
        }},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function () {
        if (!Module["preloadPlugins"]) Module["preloadPlugins"] = []; // needs to exist even in workers
        if (Browser.initted || ENVIRONMENT_IS_WORKER) return;
        Browser.initted = true;
        try {
          new Blob();
          Browser.hasBlobConstructor = true;
        } catch(e) {
          Browser.hasBlobConstructor = false;
          console.log("warning: no blob constructor, cannot create blobs with mimetypes");
        }
        Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : (typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : (!Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null));
        Browser.URLObject = typeof window != "undefined" ? (window.URL ? window.URL : window.webkitURL) : undefined;
        if (!Module.noImageDecoding && typeof Browser.URLObject === 'undefined') {
          console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
          Module.noImageDecoding = true;
        }
        // Support for plugins that can process preloaded files. You can add more of these to
        // your app by creating and appending to Module.preloadPlugins.
        //
        // Each plugin is asked if it can handle a file based on the file's name. If it can,
        // it is given the file's raw data. When it is done, it calls a callback with the file's
        // (possibly modified) data. For example, a plugin might decompress a file, or it
        // might create some side data structure for use later (like an Image element, etc.).
        var imagePlugin = {};
        imagePlugin['canHandle'] = function(name) {
          return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
        };
        imagePlugin['handle'] = function(byteArray, name, onload, onerror) {
          var b = null;
          if (Browser.hasBlobConstructor) {
            try {
              b = new Blob([byteArray], { type: Browser.getMimetype(name) });
              if (b.size !== byteArray.length) { // Safari bug #118630
                // Safari's Blob can only take an ArrayBuffer
                b = new Blob([(new Uint8Array(byteArray)).buffer], { type: Browser.getMimetype(name) });
              }
            } catch(e) {
              Runtime.warnOnce('Blob constructor present but fails: ' + e + '; falling back to blob builder');
            }
          }
          if (!b) {
            var bb = new Browser.BlobBuilder();
            bb.append((new Uint8Array(byteArray)).buffer); // we need to pass a buffer, and must copy the array to get the right data range
            b = bb.getBlob();
          }
          var url = Browser.URLObject.createObjectURL(b);
          var img = new Image();
          img.onload = function() {
            assert(img.complete, 'Image ' + name + ' could not be decoded');
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            Module["preloadedImages"][name] = canvas;
            Browser.URLObject.revokeObjectURL(url);
            if (onload) onload(byteArray);
          };
          img.onerror = function(event) {
            console.log('Image ' + url + ' could not be decoded');
            if (onerror) onerror();
          };
          img.src = url;
        };
        Module['preloadPlugins'].push(imagePlugin);
        var audioPlugin = {};
        audioPlugin['canHandle'] = function(name) {
          return !Module.noAudioDecoding && name.substr(-4) in { '.ogg': 1, '.wav': 1, '.mp3': 1 };
        };
        audioPlugin['handle'] = function(byteArray, name, onload, onerror) {
          var done = false;
          function finish(audio) {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = audio;
            if (onload) onload(byteArray);
          }
          function fail() {
            if (done) return;
            done = true;
            Module["preloadedAudios"][name] = new Audio(); // empty shim
            if (onerror) onerror();
          }
          if (Browser.hasBlobConstructor) {
            try {
              var b = new Blob([byteArray], { type: Browser.getMimetype(name) });
            } catch(e) {
              return fail();
            }
            var url = Browser.URLObject.createObjectURL(b); // XXX we never revoke this!
            var audio = new Audio();
            audio.addEventListener('canplaythrough', function() { finish(audio) }, false); // use addEventListener due to chromium bug 124926
            audio.onerror = function(event) {
              if (done) return;
              console.log('warning: browser could not fully decode audio ' + name + ', trying slower base64 approach');
              function encode64(data) {
                var BASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
                var PAD = '=';
                var ret = '';
                var leftchar = 0;
                var leftbits = 0;
                for (var i = 0; i < data.length; i++) {
                  leftchar = (leftchar << 8) | data[i];
                  leftbits += 8;
                  while (leftbits >= 6) {
                    var curr = (leftchar >> (leftbits-6)) & 0x3f;
                    leftbits -= 6;
                    ret += BASE[curr];
                  }
                }
                if (leftbits == 2) {
                  ret += BASE[(leftchar&3) << 4];
                  ret += PAD + PAD;
                } else if (leftbits == 4) {
                  ret += BASE[(leftchar&0xf) << 2];
                  ret += PAD;
                }
                return ret;
              }
              audio.src = 'data:audio/x-' + name.substr(-3) + ';base64,' + encode64(byteArray);
              finish(audio); // we don't wait for confirmation this worked - but it's worth trying
            };
            audio.src = url;
            // workaround for chrome bug 124926 - we do not always get oncanplaythrough or onerror
            Browser.safeSetTimeout(function() {
              finish(audio); // try to use it even though it is not necessarily ready to play
            }, 10000);
          } else {
            return fail();
          }
        };
        Module['preloadPlugins'].push(audioPlugin);
        // Canvas event setup
        var canvas = Module['canvas'];
        canvas.requestPointerLock = canvas['requestPointerLock'] ||
                                    canvas['mozRequestPointerLock'] ||
                                    canvas['webkitRequestPointerLock'];
        canvas.exitPointerLock = document['exitPointerLock'] ||
                                 document['mozExitPointerLock'] ||
                                 document['webkitExitPointerLock'] ||
                                 function(){}; // no-op if function does not exist
        canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
        function pointerLockChange() {
          Browser.pointerLock = document['pointerLockElement'] === canvas ||
                                document['mozPointerLockElement'] === canvas ||
                                document['webkitPointerLockElement'] === canvas;
        }
        document.addEventListener('pointerlockchange', pointerLockChange, false);
        document.addEventListener('mozpointerlockchange', pointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', pointerLockChange, false);
        if (Module['elementPointerLock']) {
          canvas.addEventListener("click", function(ev) {
            if (!Browser.pointerLock && canvas.requestPointerLock) {
              canvas.requestPointerLock();
              ev.preventDefault();
            }
          }, false);
        }
      },createContext:function (canvas, useWebGL, setInModule, webGLContextAttributes) {
        var ctx;
        try {
          if (useWebGL) {
            var contextAttributes = {
              antialias: false,
              alpha: false
            };
            if (webGLContextAttributes) {
              for (var attribute in webGLContextAttributes) {
                contextAttributes[attribute] = webGLContextAttributes[attribute];
              }
            }
            ctx = canvas.getContext('experimental-webgl', contextAttributes);
          } else {
            ctx = canvas.getContext('2d');
          }
          if (!ctx) throw ':(';
        } catch (e) {
          Module.print('Could not create canvas - ' + e);
          return null;
        }
        if (useWebGL) {
          // Set the background of the WebGL canvas to black
          canvas.style.backgroundColor = "black";
          // Warn on context loss
          canvas.addEventListener('webglcontextlost', function(event) {
            alert('WebGL context lost. You will need to reload the page.');
          }, false);
        }
        if (setInModule) {
          Module.ctx = ctx;
          Module.useWebGL = useWebGL;
          Browser.moduleContextCreatedCallbacks.forEach(function(callback) { callback() });
          Browser.init();
        }
        return ctx;
      },destroyContext:function (canvas, useWebGL, setInModule) {},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function (lockPointer, resizeCanvas) {
        Browser.lockPointer = lockPointer;
        Browser.resizeCanvas = resizeCanvas;
        if (typeof Browser.lockPointer === 'undefined') Browser.lockPointer = true;
        if (typeof Browser.resizeCanvas === 'undefined') Browser.resizeCanvas = false;
        var canvas = Module['canvas'];
        function fullScreenChange() {
          Browser.isFullScreen = false;
          if ((document['webkitFullScreenElement'] || document['webkitFullscreenElement'] ||
               document['mozFullScreenElement'] || document['mozFullscreenElement'] ||
               document['fullScreenElement'] || document['fullscreenElement']) === canvas) {
            canvas.cancelFullScreen = document['cancelFullScreen'] ||
                                      document['mozCancelFullScreen'] ||
                                      document['webkitCancelFullScreen'];
            canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
            if (Browser.lockPointer) canvas.requestPointerLock();
            Browser.isFullScreen = true;
            if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize();
          } else if (Browser.resizeCanvas){
            Browser.setWindowedCanvasSize();
          }
          if (Module['onFullScreen']) Module['onFullScreen'](Browser.isFullScreen);
        }
        if (!Browser.fullScreenHandlersInstalled) {
          Browser.fullScreenHandlersInstalled = true;
          document.addEventListener('fullscreenchange', fullScreenChange, false);
          document.addEventListener('mozfullscreenchange', fullScreenChange, false);
          document.addEventListener('webkitfullscreenchange', fullScreenChange, false);
        }
        canvas.requestFullScreen = canvas['requestFullScreen'] ||
                                   canvas['mozRequestFullScreen'] ||
                                   (canvas['webkitRequestFullScreen'] ? function() { canvas['webkitRequestFullScreen'](Element['ALLOW_KEYBOARD_INPUT']) } : null);
        canvas.requestFullScreen();
      },requestAnimationFrame:function (func) {
        if (!window.requestAnimationFrame) {
          window.requestAnimationFrame = window['requestAnimationFrame'] ||
                                         window['mozRequestAnimationFrame'] ||
                                         window['webkitRequestAnimationFrame'] ||
                                         window['msRequestAnimationFrame'] ||
                                         window['oRequestAnimationFrame'] ||
                                         window['setTimeout'];
        }
        window.requestAnimationFrame(func);
      },safeCallback:function (func) {
        return function() {
          if (!ABORT) return func.apply(null, arguments);
        };
      },safeRequestAnimationFrame:function (func) {
        return Browser.requestAnimationFrame(function() {
          if (!ABORT) func();
        });
      },safeSetTimeout:function (func, timeout) {
        return setTimeout(function() {
          if (!ABORT) func();
        }, timeout);
      },safeSetInterval:function (func, timeout) {
        return setInterval(function() {
          if (!ABORT) func();
        }, timeout);
      },getMimetype:function (name) {
        return {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'bmp': 'image/bmp',
          'ogg': 'audio/ogg',
          'wav': 'audio/wav',
          'mp3': 'audio/mpeg'
        }[name.substr(name.lastIndexOf('.')+1)];
      },getUserMedia:function (func) {
        if(!window.getUserMedia) {
          window.getUserMedia = navigator['getUserMedia'] ||
                                navigator['mozGetUserMedia'];
        }
        window.getUserMedia(func);
      },getMovementX:function (event) {
        return event['movementX'] ||
               event['mozMovementX'] ||
               event['webkitMovementX'] ||
               0;
      },getMovementY:function (event) {
        return event['movementY'] ||
               event['mozMovementY'] ||
               event['webkitMovementY'] ||
               0;
      },mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,calculateMouseEvent:function (event) { // event should be mousemove, mousedown or mouseup
        if (Browser.pointerLock) {
          // When the pointer is locked, calculate the coordinates
          // based on the movement of the mouse.
          // Workaround for Firefox bug 764498
          if (event.type != 'mousemove' &&
              ('mozMovementX' in event)) {
            Browser.mouseMovementX = Browser.mouseMovementY = 0;
          } else {
            Browser.mouseMovementX = Browser.getMovementX(event);
            Browser.mouseMovementY = Browser.getMovementY(event);
          }
          // check if SDL is available
          if (typeof SDL != "undefined") {
          	Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
          	Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
          } else {
          	// just add the mouse delta to the current absolut mouse position
          	// FIXME: ideally this should be clamped against the canvas size and zero
          	Browser.mouseX += Browser.mouseMovementX;
          	Browser.mouseY += Browser.mouseMovementY;
          }        
        } else {
          // Otherwise, calculate the movement based on the changes
          // in the coordinates.
          var rect = Module["canvas"].getBoundingClientRect();
          var x, y;
          if (event.type == 'touchstart' ||
              event.type == 'touchend' ||
              event.type == 'touchmove') {
            var t = event.touches.item(0);
            if (t) {
              x = t.pageX - (window.scrollX + rect.left);
              y = t.pageY - (window.scrollY + rect.top);
            } else {
              return;
            }
          } else {
            x = event.pageX - (window.scrollX + rect.left);
            y = event.pageY - (window.scrollY + rect.top);
          }
          // the canvas might be CSS-scaled compared to its backbuffer;
          // SDL-using content will want mouse coordinates in terms
          // of backbuffer units.
          var cw = Module["canvas"].width;
          var ch = Module["canvas"].height;
          x = x * (cw / rect.width);
          y = y * (ch / rect.height);
          Browser.mouseMovementX = x - Browser.mouseX;
          Browser.mouseMovementY = y - Browser.mouseY;
          Browser.mouseX = x;
          Browser.mouseY = y;
        }
      },xhrLoad:function (url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            onload(xhr.response);
          } else {
            onerror();
          }
        };
        xhr.onerror = onerror;
        xhr.send(null);
      },asyncLoad:function (url, onload, onerror, noRunDep) {
        Browser.xhrLoad(url, function(arrayBuffer) {
          assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
          onload(new Uint8Array(arrayBuffer));
          if (!noRunDep) removeRunDependency('al ' + url);
        }, function(event) {
          if (onerror) {
            onerror();
          } else {
            throw 'Loading data file "' + url + '" failed.';
          }
        });
        if (!noRunDep) addRunDependency('al ' + url);
      },resizeListeners:[],updateResizeListeners:function () {
        var canvas = Module['canvas'];
        Browser.resizeListeners.forEach(function(listener) {
          listener(canvas.width, canvas.height);
        });
      },setCanvasSize:function (width, height, noUpdates) {
        var canvas = Module['canvas'];
        canvas.width = width;
        canvas.height = height;
        if (!noUpdates) Browser.updateResizeListeners();
      },windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function () {
        var canvas = Module['canvas'];
        this.windowedWidth = canvas.width;
        this.windowedHeight = canvas.height;
        canvas.width = screen.width;
        canvas.height = screen.height;
        // check if SDL is available   
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags | 0x00800000; // set SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      },setWindowedCanvasSize:function () {
        var canvas = Module['canvas'];
        canvas.width = this.windowedWidth;
        canvas.height = this.windowedHeight;
        // check if SDL is available       
        if (typeof SDL != "undefined") {
        	var flags = HEAPU32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)];
        	flags = flags & ~0x00800000; // clear SDL_FULLSCREEN flag
        	HEAP32[((SDL.screen+Runtime.QUANTUM_SIZE*0)>>2)]=flags
        }
        Browser.updateResizeListeners();
      }};
___errno_state = Runtime.staticAlloc(4); HEAP32[((___errno_state)>>2)]=0;
_llvm_eh_exception.buf = allocate(12, "void*", ALLOC_STATIC);
Module["requestFullScreen"] = function(lockPointer, resizeCanvas) { Browser.requestFullScreen(lockPointer, resizeCanvas) };
  Module["requestAnimationFrame"] = function(func) { Browser.requestAnimationFrame(func) };
  Module["setCanvasSize"] = function(width, height, noUpdates) { Browser.setCanvasSize(width, height, noUpdates) };
  Module["pauseMainLoop"] = function() { Browser.mainLoop.pause() };
  Module["resumeMainLoop"] = function() { Browser.mainLoop.resume() };
  Module["getUserMedia"] = function() { Browser.getUserMedia() }
FS.staticInit();__ATINIT__.unshift({ func: function() { if (!Module["noFSInit"] && !FS.init.initialized) FS.init() } });__ATMAIN__.push({ func: function() { FS.ignorePermissions = false } });__ATEXIT__.push({ func: function() { FS.quit() } });Module["FS_createFolder"] = FS.createFolder;Module["FS_createPath"] = FS.createPath;Module["FS_createDataFile"] = FS.createDataFile;Module["FS_createPreloadedFile"] = FS.createPreloadedFile;Module["FS_createLazyFile"] = FS.createLazyFile;Module["FS_createLink"] = FS.createLink;Module["FS_createDevice"] = FS.createDevice;
__ATINIT__.unshift({ func: function() { TTY.init() } });__ATEXIT__.push({ func: function() { TTY.shutdown() } });TTY.utf8 = new Runtime.UTF8Processor();
if (ENVIRONMENT_IS_NODE) { var fs = require("fs"); NODEFS.staticInit(); }
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true; // seal the static portion of memory
STACK_MAX = STACK_BASE + 5242880;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY); // Stack must fit in TOTAL_MEMORY; allocations from here on may enlarge TOTAL_MEMORY
var Math_min = Math.min;
function invoke_vi(index,a1) {
  try {
    Module["dynCall_vi"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_ii(index,a1) {
  try {
    return Module["dynCall_ii"](index,a1);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_viii(index,a1,a2,a3) {
  try {
    Module["dynCall_viii"](index,a1,a2,a3);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_v(index) {
  try {
    Module["dynCall_v"](index);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function invoke_iii(index,a1,a2) {
  try {
    return Module["dynCall_iii"](index,a1,a2);
  } catch(e) {
    if (typeof e !== 'number' && e !== 'longjmp') throw e;
    asm["setThrew"](1, 0);
  }
}
function asmPrintInt(x, y) {
  Module.print('int ' + x + ',' + y);// + ' ' + new Error().stack);
}
function asmPrintFloat(x, y) {
  Module.print('float ' + x + ',' + y);// + ' ' + new Error().stack);
}
// EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=env.__ZTVN10__cxxabiv120__si_class_type_infoE|0;var n=env.__ZTVN10__cxxabiv117__class_type_infoE|0;var o=+env.NaN;var p=+env.Infinity;var q=0;var r=0;var s=0;var t=0;var u=0,v=0,w=0,x=0,y=0.0,z=0,A=0,B=0,C=0.0;var D=0;var E=0;var F=0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=0;var M=0;var N=global.Math.floor;var O=global.Math.abs;var P=global.Math.sqrt;var Q=global.Math.pow;var R=global.Math.cos;var S=global.Math.sin;var T=global.Math.tan;var U=global.Math.acos;var V=global.Math.asin;var W=global.Math.atan;var X=global.Math.atan2;var Y=global.Math.exp;var Z=global.Math.log;var _=global.Math.ceil;var $=global.Math.imul;var aa=env.abort;var ab=env.assert;var ac=env.asmPrintInt;var ad=env.asmPrintFloat;var ae=env.min;var af=env.invoke_vi;var ag=env.invoke_ii;var ah=env.invoke_viii;var ai=env.invoke_v;var aj=env.invoke_iii;var ak=env._llvm_lifetime_end;var al=env._sysconf;var am=env.___cxa_throw;var an=env._abort;var ao=env._fflush;var ap=env._canvas_begin_time;var aq=env.___assert_fail;var ar=env.___setErrNo;var as=env._llvm_eh_exception;var at=env._llvm_umul_with_overflow_i32;var au=env.___cxa_find_matching_catch;var av=env.___cxa_allocate_exception;var aw=env.___resumeException;var ax=env.___cxa_is_number_type;var ay=env.___cxa_does_inherit;var az=env._canvas_end_time;var aA=env._webgl_put_image;var aB=env.__ZSt18uncaught_exceptionv;var aC=env.___cxa_call_unexpected;var aD=env._sbrk;var aE=env.___errno_location;var aF=env.___gxx_personality_v0;var aG=env._webgl_init;var aH=env._emscripten_set_canvas_size;var aI=env._llvm_lifetime_start;var aJ=env._time;
// EMSCRIPTEN_START_FUNCS
function aP(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+7&-8;return b|0}function aQ(){return i|0}function aR(a){a=a|0;i=a}function aS(a,b){a=a|0;b=b|0;if((q|0)==0){q=a;r=b}}function aT(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0]}function aU(b){b=b|0;a[k]=a[b];a[k+1|0]=a[b+1|0];a[k+2|0]=a[b+2|0];a[k+3|0]=a[b+3|0];a[k+4|0]=a[b+4|0];a[k+5|0]=a[b+5|0];a[k+6|0]=a[b+6|0];a[k+7|0]=a[b+7|0]}function aV(a){a=a|0;D=a}function aW(a){a=a|0;E=a}function aX(a){a=a|0;F=a}function aY(a){a=a|0;G=a}function aZ(a){a=a|0;H=a}function a_(a){a=a|0;I=a}function a$(a){a=a|0;J=a}function a0(a){a=a|0;K=a}function a1(a){a=a|0;L=a}function a2(a){a=a|0;M=a}function a3(){c[39942]=n+8;c[39944]=m+8}function a4(b){b=b|0;var d=0,e=0,f=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0.0,E=0.0,F=0.0,G=0.0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0.0,Q=0.0,R=0.0,S=0.0,T=0,U=0.0,V=0.0,W=0;b=i;i=i+72|0;d=b|0;e=b+8|0;f=b+16|0;j=b+24|0;k=b+64|0;l=k;m=i;i=i+8|0;n=m;ap();o=bi(8192)|0;c[o+8>>2]=o+12;c[o+4>>2]=o+8192;c[o>>2]=0;p=j+24|0;c[p>>2]=o;o=j+28|0;c[o>>2]=0;q=j+16|0;c[q>>2]=0;r=j+32|0;c[r>>2]=0;s=j+20|0;c[s>>2]=c[39950];t=j;u=j+8|0;v=d;w=e;x=f|0;y=f+4|0;z=8;A=0;B=153144;L1:while(1){C=a[B]|0;do{}while(C<<24>>24!=102);D=+h[z>>3];E=+h[z+8>>3];F=+h[z+16>>3];G=+h[z+24>>3];C=c[p>>2]|0;H=c[C+8>>2]|0;do{if((H+32|0)>>>0<(c[C+4>>2]|0)>>>0){I=C;J=H}else{K=c[o>>2]|0;if((K|0)!=0){L=K|0;c[o>>2]=c[L>>2];c[L>>2]=C;c[p>>2]=K;L=K+12|0;c[K+8>>2]=L;I=K;J=L;break}L=bi(8192)|0;K=L;M=L+12|0;c[L+8>>2]=M;c[L+4>>2]=L+8192;c[L>>2]=C;c[p>>2]=K;I=K;J=M}}while(0);c[I+8>>2]=J+32;bp(J|0,0,32);c[q>>2]=J;c[J+24>>2]=0;c[J>>2]=0;C=~~(G*255.0);if((C|0)==255){a[J+4|0]=1}c[J+8>>2]=C<<16|~~(E*255.0*G);c[J+12>>2]=~~(D*255.0*G)<<16|~~(F*255.0*G);C=c[r>>2]|0;c[r>>2]=C+1;c[J+20>>2]=C;c[J+16>>2]=0;C=A+1|0;if(C>>>0<6137){N=z+32|0;O=C}else{break}while(1){C=a[153144+O|0]|0;if((C<<24>>24|0)==109){P=+h[N>>3]/20.0;Q=+h[N+8>>3]/20.0;R=+(P+Q*0.0+0.0);S=+(Q+P*0.0+0.0);g[t>>2]=R;g[t+4>>2]=S;g[u>>2]=R;g[u+4>>2]=S;H=O+1|0;if(H>>>0<6137){N=N+16|0;O=H;continue}else{break L1}}else if((C<<24>>24|0)==108){S=+h[N>>3]/20.0;R=+h[N+8>>3]/20.0;P=+(S+R*0.0+0.0);Q=+(R+S*0.0+0.0);H=c[s>>2]|0;M=c[t+4>>2]|0;c[d>>2]=c[t>>2];c[d+4>>2]=M;g[e>>2]=P;g[e+4>>2]=Q;M=c[q>>2]|0;g[x>>2]=0.0;g[y>>2]=0.0;a9(H,v,w,M,0,f);g[t>>2]=P;g[t+4>>2]=Q;T=N+16|0}else if((C<<24>>24|0)==99){Q=+h[N+16>>3]/20.0;P=+h[N+24>>3]/20.0;S=+h[N>>3]/20.0;R=+h[N+8>>3]/20.0;U=+(Q+P*0.0+0.0);V=+(P+Q*0.0+0.0);Q=+(R+S*0.0+0.0);g[k>>2]=S+R*0.0+0.0;g[k+4>>2]=Q;g[m>>2]=U;g[m+4>>2]=V;a5(j,l,n);T=N+32|0}else{break}C=O+1|0;if(C>>>0<6137){N=T;O=C}else{break L1}}if(O>>>0<6137){z=N;A=O;B=153144+O|0}else{break}}bd(c[39950]|0);az();aA(c[(c[39950]|0)+16>>2]|0,c[39948]|0,c[39958]|0);a8(c[39950]|0);O=c[p>>2]|0;if((O|0)!=0){p=O;while(1){O=c[p>>2]|0;bk(p);if((O|0)==0){break}else{p=O}}}p=c[o>>2]|0;if((p|0)==0){i=b;return}else{W=p}while(1){p=c[W>>2]|0;bk(W);if((p|0)==0){break}else{W=p}}i=b;return}function a5(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0.0,C=0.0,D=0.0,E=0.0,F=0.0,G=0.0,H=0.0;e=i;i=i+136|0;f=b;b=i;i=i+8|0;c[b>>2]=c[f>>2];c[b+4>>2]=c[f+4>>2];f=d;d=i;i=i+8|0;c[d>>2]=c[f>>2];c[d+4>>2]=c[f+4>>2];f=e|0;h=e+24|0;j=e+64|0;k=e+72|0;l=e+80|0;m=e+88|0;n=e+96|0;o=e+104|0;p=e+112|0;q=e+120|0;r=e+128|0;g[f>>2]=+g[a>>2];g[f+4>>2]=+g[a+4>>2];g[f+8>>2]=+g[b>>2];g[f+12>>2]=+g[b+4>>2];g[f+16>>2]=+g[d>>2];g[f+20>>2]=+g[d+4>>2];if((bf(f|0,h|0)|0)==0){f=c[a+20>>2]|0;s=a;t=c[s+4>>2]|0;c[j>>2]=c[s>>2];c[j+4>>2]=t;t=d;s=c[t>>2]|0;u=c[t+4>>2]|0;c[k>>2]=s;c[k+4>>2]=u;t=c[a+16>>2]|0;v=b;b=c[v+4>>2]|0;c[l>>2]=c[v>>2];c[l+4>>2]=b;a9(f,j,k,t,1,l);w=u;x=s;y=a;z=y|0;c[z>>2]=x;A=y+4|0;c[A>>2]=w;i=e;return}else{B=+g[h+8>>2];C=+g[h+12>>2];D=+g[h+16>>2];E=+g[h+20>>2];F=+g[h+24>>2];G=+g[h+28>>2];h=a+20|0;s=c[h>>2]|0;u=a;l=c[u+4>>2]|0;c[m>>2]=c[u>>2];c[m+4>>2]=l;H=+D;D=+E;g[n>>2]=H;g[n+4>>2]=D;l=a+16|0;u=c[l>>2]|0;E=+C;g[o>>2]=B;g[o+4>>2]=E;a9(s,m,n,u,1,o);o=c[h>>2]|0;g[p>>2]=H;g[p+4>>2]=D;h=d;d=c[h>>2]|0;u=c[h+4>>2]|0;c[q>>2]=d;c[q+4>>2]=u;h=c[l>>2]|0;D=+G;g[r>>2]=F;g[r+4>>2]=D;a9(o,p,q,h,1,r);w=u;x=d;y=a;z=y|0;c[z>>2]=x;A=y+4|0;c[A>>2]=w;i=e;return}}function a6(){var a=0;c[39948]=720;c[39958]=510;aH(720,510);aG();a=bi(60)|0;a7(a,c[39948]|0,c[39958]|0);c[39950]=a;return}function a7(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0;c[a+4>>2]=b<<2;e=a+8|0;f=d<<2;c[e>>2]=f;g=a+16|0;bp(a+12|0,0,16);h=bi(8192)|0;c[h+8>>2]=h+12;c[h+4>>2]=h+8192;c[h>>2]=0;c[a+44>>2]=h;c[a+48>>2]=0;h=bi(8192)|0;c[h+8>>2]=h+12;c[h+4>>2]=h+8192;c[h>>2]=0;c[a+52>>2]=h;c[a+56>>2]=0;h=at(f|0,4)|0;f=bj(D?-1:h)|0;h=a|0;c[h>>2]=f;L50:do{if((d|0)>0){a=0;i=f;while(1){c[i+(a<<2)>>2]=0;j=a+1|0;if((j|0)>=(c[e>>2]|0)){break L50}a=j;i=c[h>>2]|0}}}while(0);h=$(d,b)|0;b=at(h|0,4)|0;d=bj(D?-1:b)|0;c[g>>2]=d;bp(d|0,0,h<<2|0);return}function a8(a){a=a|0;var b=0,d=0;c[a+12>>2]=0;c[a+24>>2]=0;c[a+20>>2]=0;b=a+8|0;if((c[b>>2]|0)<=0){return}d=a|0;a=0;do{c[(c[d>>2]|0)+(a<<2)>>2]=0;a=a+1|0;}while((a|0)<(c[b>>2]|0));return}function a9(a,b,d,e,f,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;h=h|0;var j=0,l=0,m=0.0,n=0.0,o=0,p=0,q=0,r=0,s=0.0,t=0.0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0;j=i;l=b;b=i;i=i+8|0;c[b>>2]=c[l>>2];c[b+4>>2]=c[l+4>>2];l=d;d=i;i=i+8|0;c[d>>2]=c[l>>2];c[d+4>>2]=c[l+4>>2];l=h;h=i;i=i+8|0;c[h>>2]=c[l>>2];c[h+4>>2]=c[l+4>>2];m=+g[d+4>>2];n=+g[b+4>>2];if(m<n){l=b;o=c[l>>2]|0;p=c[l+4>>2]|0;q=d;r=c[q+4>>2]|0;c[l>>2]=c[q>>2];c[l+4>>2]=r;c[q>>2]=o;c[q+4>>2]=p;s=(c[k>>2]=r,+g[k>>2]);t=(c[k>>2]=p,+g[k>>2])}else{s=n;t=m}p=a+52|0;r=c[p>>2]|0;do{if(((c[r+8>>2]|0)+64|0)>>>0<(c[r+4>>2]|0)>>>0){u=r}else{q=a+56|0;o=c[q>>2]|0;if((o|0)==0){l=bi(8192)|0;v=l;c[l+8>>2]=l+12;c[l+4>>2]=l+8192;c[l>>2]=r;c[p>>2]=v;u=v;break}else{v=o|0;c[q>>2]=c[v>>2];c[v>>2]=r;c[p>>2]=o;c[o+8>>2]=o+12;u=c[p>>2]|0;break}}}while(0);r=u+8|0;c[r>>2]=(c[r>>2]|0)+64;r=c[(c[p>>2]|0)+8>>2]|0;p=r-64|0;u=p;c[r-56>>2]=e;e=~~(+g[b>>2]*4.0);b=~~(s*4.0);o=~~(+g[h>>2]*4.0);v=~~(+g[h+4>>2]*4.0);h=~~(+g[d>>2]*4.0);d=~~(t*4.0);c[p>>2]=h;c[r-60>>2]=d;p=r-52|0;c[p>>2]=0;q=e<<16;l=r-44|0;c[l>>2]=q;if((d|0)<0){i=j;return}if(!((b|0)<=(c[a+8>>2]|0)&(b|0)<(d|0))){i=j;return}if(f){f=h+e+(o*-2|0)<<15;w=(o<<1)-e-h<<4;x=(v<<1)-b-d<<4;y=w>>31;z=(y^w)-y|0;y=x>>31;w=(y^x)-y|0;if((z|0)>(w|0)){A=(w>>1)+z|0}else{A=w+(z>>1)|0}z=A+16>>5;if((z|0)==0){B=32}else{A=((z>>>16)-1|0)>>>31<<4;w=z<<A;z=((w>>>24)-1|0)>>>31<<3;y=w<<z;w=((y>>>28)-1|0)>>>31<<2;x=y<<w;y=((x>>>30)-1|0)>>>31<<1;B=(z|A|w|y|x<<y>>>31)^1}y=32-B>>1;if((y|0)<=-1){aq(159312,159504,240,159600)}c[r-8>>2]=y;B=r-4|0;x=r-32|0;w=(f>>y<<1)+(o-e<<17)|0;o=y-1|0;A=f>>o<<1;c[r-28>>2]=A;f=d+b+(v*-2|0)<<15;z=r-24|0;C=(f>>y<<1)+(v-b<<17)|0;v=f>>o<<1;c[r-20>>2]=v;o=(1<<y)-1|0;c[B>>2]=o;f=(w>>y)+q|0;D=r-40|0;c[D>>2]=f;E=b<<16;F=(C>>y)+E|0;G=r-36|0;c[G>>2]=F;H=w+A|0;c[x>>2]=H;w=C+v|0;c[z>>2]=w;L91:do{if((o|0)>0){C=F;I=H;J=f;K=w;L=o;while(1){if((b|0)<(C>>16|0)){M=L;N=J;O=C;break L91}P=J+(I>>y)|0;c[D>>2]=P;Q=I+A|0;c[x>>2]=Q;R=C+(K>>y)|0;c[G>>2]=R;S=K+v|0;c[z>>2]=S;T=L-1|0;c[B>>2]=T;if((T|0)>0){C=R;I=Q;J=P;K=S;L=T}else{M=T;N=P;O=R;break}}}else{M=o;N=f;O=F}}while(0);if((M|0)==0){M=d<<16;c[G>>2]=M;G=h<<16;c[D>>2]=G;U=G;V=M}else{U=N;V=O}O=(U-q<<2|0)/(V-E>>14|0)|0;c[r-48>>2]=O;W=y;X=O}else{c[r-8>>2]=0;O=(h-e<<16|0)/(d-b|0)|0;c[r-48>>2]=O;W=0;X=O}do{if((b|0)<0){O=r-48|0;e=r-36|0;y=r-12|0;E=r-40|0;V=r-16|0;U=r-4|0;N=r-32|0;M=r-28|0;G=r-24|0;D=r-20|0;if((W|0)==0){F=b;f=q;while(1){o=f+X|0;B=F+1|0;if((B|0)<0){F=B;f=o}else{Y=o;break}}}else{f=b;F=q;o=X;while(1){B=c[e>>2]|0;do{if((f|0)<(B>>16|0)){Z=F;_=o}else{c[y>>2]=B;z=c[E>>2]|0;c[V>>2]=z;v=c[U>>2]|0;L110:do{if((v|0)>0){x=B;A=v;w=z;while(1){if((f|0)<(x>>16|0)){$=A;aa=w;ab=x;break L110}H=c[N>>2]|0;L=w+(H>>W)|0;c[E>>2]=L;c[N>>2]=H+(c[M>>2]|0);H=c[G>>2]|0;K=x+(H>>W)|0;c[e>>2]=K;c[G>>2]=H+(c[D>>2]|0);H=A-1|0;c[U>>2]=H;if((H|0)>0){x=K;A=H;w=L}else{$=H;aa=L;ab=K;break}}}else{$=v;aa=z;ab=B}}while(0);if(($|0)==0){v=d<<16;c[e>>2]=v;w=h<<16;c[E>>2]=w;ac=w;ad=v}else{ac=aa;ad=ab}if((f+1|0)>=(d|0)){Z=z;_=o;break}v=(ac-z<<3|0)/(ad-B>>13|0)|0;c[O>>2]=v;Z=z;_=v}}while(0);B=Z+_|0;v=f+1|0;if((v|0)<0){f=v;F=B;o=_}else{Y=B;break}}}c[l>>2]=Y;if((d|0)>0){ae=0;break}i=j;return}else{ae=b}}while(0);b=a|0;c[p>>2]=c[(c[b>>2]|0)+(ae<<2)>>2];c[(c[b>>2]|0)+(ae<<2)>>2]=u;i=j;return}function ba(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;b=a+24|0;d=c[b>>2]|0;e=c[a+12>>2]|0;if((d|0)==0){return}a=e+1|0;f=d;d=b;L128:while(1){b=f;while(1){g=c[b+56>>2]|0;if((g|0)==0){h=b+20|0;c[h>>2]=(c[h>>2]|0)+(c[b+16>>2]|0)}else{h=b+28|0;i=c[h>>2]|0;do{if((e|0)<(i>>16|0)){j=c[b+20>>2]|0}else{c[b+52>>2]=i;k=b+24|0;l=c[k>>2]|0;c[b+48>>2]=l;c[b+20>>2]=l;m=b+60|0;n=c[m>>2]|0;L138:do{if((n|0)>0){o=b+32|0;p=b+36|0;q=b+40|0;r=b+44|0;s=l;t=i;u=n;while(1){if((e|0)<(t>>16|0)){v=u;w=s;x=t;break L138}y=c[o>>2]|0;z=s+(y>>g)|0;c[k>>2]=z;c[o>>2]=y+(c[p>>2]|0);y=c[q>>2]|0;A=t+(y>>g)|0;c[h>>2]=A;c[q>>2]=y+(c[r>>2]|0);y=u-1|0;c[m>>2]=y;if((y|0)>0){s=z;t=A;u=y}else{v=y;w=z;x=A;break}}}else{v=n;w=l;x=i}}while(0);n=c[b+4>>2]|0;if((v|0)==0){m=n<<16;c[h>>2]=m;u=c[b>>2]<<16;c[k>>2]=u;B=u;C=m}else{B=w;C=x}if((a|0)>=(n|0)){j=l;break}c[b+16>>2]=(B-l<<3|0)/(C-i>>13|0)|0;j=l}}while(0);c[b+20>>2]=j+(c[b+16>>2]|0)}D=b+12|0;E=c[D>>2]|0;if((a|0)<(c[b+4>>2]|0)){break}c[d>>2]=E;if((E|0)==0){F=132;break L128}else{b=E}}if((E|0)==0){F=133;break}else{f=E;d=D}}if((F|0)==132){return}else if((F|0)==133){return}}function bb(b){b=b|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;d=c[b+20>>2]|0;L156:do{if((d|0)!=0){e=d;while(1){if((c[e+16>>2]|0)!=0){break}e=c[e+24>>2]|0;if((e|0)==0){break L156}}aq(159464,159504,465,159552)}}while(0);d=b+44|0;e=c[d>>2]|0;do{if(((c[e+8>>2]|0)+44|0)>>>0<(c[e+4>>2]|0)>>>0){f=e}else{g=b+48|0;h=c[g>>2]|0;if((h|0)==0){i=bi(8192)|0;j=i;c[i+8>>2]=i+12;c[i+4>>2]=i+8192;c[i>>2]=e;c[d>>2]=j;f=j;break}else{j=h|0;c[g>>2]=c[j>>2];c[j>>2]=e;c[d>>2]=h;c[h+8>>2]=h+12;f=c[d>>2]|0;break}}}while(0);e=f+8|0;c[e>>2]=(c[e>>2]|0)+44;e=c[(c[d>>2]|0)+8>>2]|0;f=e-44|0;h=f;c[f>>2]=0;c[e-40>>2]=0;c[e-36>>2]=0;c[b+28+(((c[b+12>>2]|0)%4|0)<<2)>>2]=h;e=c[b+24>>2]|0;if((e|0)==0){k=h;l=b+4|0;m=c[l>>2]|0;n=k|0;c[n>>2]=m;return}else{o=e}while(1){if((c[o+20>>2]|0)>=0){break}e=o+8|0;f=(c[e>>2]|0)+16|0;j=(c[f>>2]|0)+1|0;c[f>>2]=j;if((j&1|0)!=0){c[(c[e>>2]|0)+28>>2]=h}e=c[o+12>>2]|0;if((e|0)==0){k=h;p=207;break}else{o=e}}if((p|0)==207){l=b+4|0;m=c[l>>2]|0;n=k|0;c[n>>2]=m;return}e=b+4|0;j=b+48|0;f=h;h=o;L179:while(1){o=c[h+20>>2]>>16;if((o|0)>=(c[e>>2]|0)){p=150;break}g=f|0;c[g>>2]=o;o=c[d>>2]|0;do{if(((c[o+8>>2]|0)+44|0)>>>0<(c[o+4>>2]|0)>>>0){q=o}else{i=c[j>>2]|0;if((i|0)==0){r=bi(8192)|0;s=r;c[r+8>>2]=r+12;c[r+4>>2]=r+8192;c[r>>2]=o;c[d>>2]=s;q=s;break}else{s=i|0;c[j>>2]=c[s>>2];c[s>>2]=o;c[d>>2]=i;c[i+8>>2]=i+12;q=c[d>>2]|0;break}}}while(0);o=q+8|0;c[o>>2]=(c[o>>2]|0)+44;o=c[(c[d>>2]|0)+8>>2]|0;i=o-44|0;t=i;c[i>>2]=0;c[o-40>>2]=0;c[o-36>>2]=0;o=h;while(1){i=o+8|0;s=(c[i>>2]|0)+16|0;r=(c[s>>2]|0)+1|0;c[s>>2]=r;s=c[i>>2]|0;u=s+28|0;L190:do{if((r&1|0)==0){v=c[u>>2]|0;if((v|0)!=(t|0)&(v|0)!=0){w=v;x=s}else{break}while(1){v=w+4|0;y=c[v>>2]|0;if((y|0)>=8){p=160;break L179}L196:do{if((y|0)==0){c[w+12>>2]=x;c[v>>2]=1}else{z=w+12+(y-1<<2)|0;do{if((a[x+4|0]&1)!=0){if((c[(c[z>>2]|0)+20>>2]|0)>=(c[x+20>>2]|0)){break}c[w+12>>2]=x;c[v>>2]=1;break L196}}while(0);A=c[z>>2]|0;B=c[A+20>>2]|0;C=c[x+20>>2]|0;if((a[A+4|0]&1)!=0&(B|0)>(C|0)){break}if((B|0)<(C|0)){c[v>>2]=y+1;c[w+12+(y<<2)>>2]=x;break}L207:do{if((y|0)>0){B=0;while(1){A=B+1|0;if((c[(c[w+12+(B<<2)>>2]|0)+20>>2]|0)>(C|0)){D=B;break L207}if((A|0)<(y|0)){B=A}else{D=A;break}}}else{D=0}}while(0);if((y|0)>(D|0)){C=y;while(1){z=C-1|0;c[w+12+(C<<2)>>2]=c[w+12+(z<<2)>>2];if((z|0)>(D|0)){C=z}else{break}}}c[w+12+(D<<2)>>2]=x;c[v>>2]=(c[v>>2]|0)+1}}while(0);v=c[w+8>>2]|0;if((v|0)==0){break L190}w=v;x=c[i>>2]|0}}else{c[u>>2]=t}}while(0);E=c[o+12>>2]|0;if((E|0)==0){p=178;break L179}u=c[E+20>>2]|0;if((c[o+20>>2]|0)>(u|0)){p=180;break L179}if((u>>16|0)==(c[g>>2]|0)){o=E}else{break}}c[f+8>>2]=t;if((E|0)==0){k=t;p=210;break}else{f=t;h=E}}if((p|0)==150){if((h|0)==0){k=f;l=b+4|0;m=c[l>>2]|0;n=k|0;c[n>>2]=m;return}else{F=h}L226:while(1){h=F+8|0;E=(c[h>>2]|0)+16|0;x=(c[E>>2]|0)+1|0;c[E>>2]=x;E=c[h>>2]|0;w=E+28|0;L228:do{if((x&1|0)==0){D=c[w>>2]|0;if((D|0)==0){break}else{G=D;H=E}while(1){D=G+4|0;d=c[D>>2]|0;if((d|0)>=8){p=187;break L226}L233:do{if((d|0)==0){c[G+12>>2]=H;c[D>>2]=1}else{q=G+12+(d-1<<2)|0;do{if((a[H+4|0]&1)!=0){if((c[(c[q>>2]|0)+20>>2]|0)>=(c[H+20>>2]|0)){break}c[G+12>>2]=H;c[D>>2]=1;break L233}}while(0);j=c[q>>2]|0;e=c[j+20>>2]|0;o=c[H+20>>2]|0;if((a[j+4|0]&1)!=0&(e|0)>(o|0)){break}if((e|0)<(o|0)){c[D>>2]=d+1;c[G+12+(d<<2)>>2]=H;break}L244:do{if((d|0)>0){e=0;while(1){j=e+1|0;if((c[(c[G+12+(e<<2)>>2]|0)+20>>2]|0)>(o|0)){I=e;break L244}if((j|0)<(d|0)){e=j}else{I=j;break}}}else{I=0}}while(0);if((d|0)>(I|0)){o=d;while(1){q=o-1|0;c[G+12+(o<<2)>>2]=c[G+12+(q<<2)>>2];if((q|0)>(I|0)){o=q}else{break}}}c[G+12+(I<<2)>>2]=H;c[D>>2]=(c[D>>2]|0)+1}}while(0);D=c[G+8>>2]|0;if((D|0)==0){break L228}G=D;H=c[h>>2]|0}}else{c[w>>2]=0}}while(0);w=c[F+12>>2]|0;if((w|0)==0){k=f;p=211;break}else{F=w}}if((p|0)==187){aq(159352,159504,511,159536)}else if((p|0)==211){l=b+4|0;m=c[l>>2]|0;n=k|0;c[n>>2]=m;return}}else if((p|0)==160){aq(159352,159504,511,159536)}else if((p|0)==178){c[f+8>>2]=t;k=t;l=b+4|0;m=c[l>>2]|0;n=k|0;c[n>>2]=m;return}else if((p|0)==180){aq(159416,159504,631,159584)}else if((p|0)==210){l=b+4|0;m=c[l>>2]|0;n=k|0;c[n>>2]=m;return}}function bc(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,al=0,am=0,an=0,ao=0,ap=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aD=0,aE=0,aF=0,aG=0,aH=0;b=($(c[a+4>>2]|0,(c[a+12>>2]|0)/4|0)|0)/4|0;d=0;e=c[a+28>>2]|0;f=a+40|0;g=c[a+36>>2]|0;h=c[a+32>>2]|0;i=(c[a+16>>2]|0)+(b<<2)|0;b=0;a=0;j=0;L266:while(1){k=c[f>>2]|0;l=(k|0)==0;m=k|0;n=k+4|0;o=k+12|0;p=d;q=e;r=g;s=h;t=i;u=b;v=a;w=j;while(1){if((q|0)==0|(r|0)==0|l){x=270;break L266}y=q|0;z=c[y>>2]|0;A=s|0;B=c[A>>2]|0;C=(B|0)<(z|0)?B:z;z=r|0;B=c[z>>2]|0;D=(B|0)<(C|0)?B:C;C=c[m>>2]|0;E=(C|0)<(D|0)?C:D;D=c[q+4>>2]|0;do{if((D|0)==1){if((c[s+4>>2]|0)!=1){F=0;G=0;H=0;x=226;break}if((c[r+4>>2]|0)!=1){F=0;G=0;H=0;x=226;break}if((c[n>>2]|0)!=1){F=0;G=0;H=0;x=226;break}C=c[q+12>>2]|0;if((c[s+12>>2]|0)!=(C|0)){F=0;G=0;H=0;x=226;break}if((c[r+12>>2]|0)!=(C|0)){F=0;G=0;H=0;x=226;break}if((c[o>>2]|0)!=(C|0)){F=0;G=0;H=0;x=226;break}if((c[C>>2]|0)!=0){x=224;break L266}B=C+8|0;C=c[B>>2]|0;I=C<<2;J=(C>>>30|c[B+4>>2]<<2)&-4}else{if((D|0)>0){F=0;G=0;H=0;x=226}else{K=0;L=0;x=230}}}while(0);if((x|0)==226){while(1){x=0;B=c[q+12+(F<<2)>>2]|0;do{if((c[B>>2]|0)==0){C=B+8|0;M=c[C>>2]|0;N=c[C+4>>2]|0;if((M&16711680|0)==16711680){O=M;P=N;break}C=255-(M>>16)|0;Q=(($(C,G)|0)>>>8&16711935)+M|0;O=Q;P=(($(C,H)|0)>>>8&16711935)+N|0}else{O=G;P=H}}while(0);B=F+1|0;if((B|0)<(D|0)){F=B;G=O;H=P;x=226}else{K=O;L=P;x=230;break}}}if((x|0)==230){x=0;D=c[s+4>>2]|0;if((D|0)>0){B=0;N=0;C=0;while(1){Q=c[s+12+(B<<2)>>2]|0;do{if((c[Q>>2]|0)==0){M=Q+8|0;R=c[M>>2]|0;S=c[M+4>>2]|0;if((R&16711680|0)==16711680){T=R;U=S;break}M=255-(R>>16)|0;V=(($(M,N)|0)>>>8&16711935)+R|0;T=V;U=(($(M,C)|0)>>>8&16711935)+S|0}else{T=N;U=C}}while(0);Q=B+1|0;if((Q|0)<(D|0)){B=Q;N=T;C=U}else{W=T;X=U;break}}}else{W=0;X=0}C=W+K|0;N=X+L|0;B=c[r+4>>2]|0;if((B|0)>0){D=0;Q=0;S=0;while(1){M=c[r+12+(D<<2)>>2]|0;do{if((c[M>>2]|0)==0){V=M+8|0;R=c[V>>2]|0;Y=c[V+4>>2]|0;if((R&16711680|0)==16711680){Z=R;_=Y;break}V=255-(R>>16)|0;aa=(($(V,Q)|0)>>>8&16711935)+R|0;Z=aa;_=(($(V,S)|0)>>>8&16711935)+Y|0}else{Z=Q;_=S}}while(0);M=D+1|0;if((M|0)<(B|0)){D=M;Q=Z;S=_}else{ab=Z;ac=_;break}}}else{ab=0;ac=0}S=C+ab|0;Q=N+ac|0;D=c[n>>2]|0;if((D|0)>0){B=0;M=0;Y=0;while(1){V=c[k+12+(B<<2)>>2]|0;do{if((c[V>>2]|0)==0){aa=V+8|0;R=c[aa>>2]|0;ad=c[aa+4>>2]|0;if((R&16711680|0)==16711680){ae=R;af=ad;break}aa=255-(R>>16)|0;ag=(($(aa,M)|0)>>>8&16711935)+R|0;ae=ag;af=(($(aa,Y)|0)>>>8&16711935)+ad|0}else{ae=M;af=Y}}while(0);V=B+1|0;if((V|0)<(D|0)){B=V;M=ae;Y=af}else{ah=ae;ai=af;break}}}else{ah=0;ai=0}I=S+ah|0;J=Q+ai|0}L315:do{if((E|0)==(p|0)){aj=w;ak=v;al=u;am=t}else{Y=w;M=v;B=u;D=t;N=E-p|0;while(1){if((B|0)==0){break}C=Y+I|0;V=M+J|0;if((B|0)==3){c[D>>2]=V>>>4&16711935|C<<4&-16711936;an=D+4|0;ao=0;ap=0;ar=0}else{an=D;ao=B+1|0;ap=V;ar=C}C=N-1|0;if((C|0)==0){aj=ar;ak=ap;al=ao;am=an;break L315}else{Y=ar;M=ap;B=ao;D=an;N=C}}do{if((N|0)>3){B=I<<6&-16711936|J>>>2&16711935;if((N|0)>7){C=N-8|0;V=C>>>3;ad=C-(V<<3)|0;C=V<<1;V=D;aa=N;while(1){c[V>>2]=B;c[V+4>>2]=B;ag=aa-8|0;if((ag|0)>7){V=V+8|0;aa=ag}else{break}}aa=D+(C+2<<2)|0;if((ad|0)>3){as=ad;at=aa}else{au=ad;av=aa;break}}else{as=N;at=D}c[at>>2]=B;au=as-4|0;av=at+4|0}else{au=N;av=D}}while(0);if((au|0)==0){aj=Y;ak=M;al=0;am=av;break}else{aw=Y;ax=M;ay=0;az=av;aA=au}while(1){D=aw+I|0;N=ax+J|0;if((ay|0)==3){c[az>>2]=N>>>4&16711935|D<<4&-16711936;aB=az+4|0;aC=0;aD=0;aE=0}else{aB=az;aC=ay+1|0;aD=N;aE=D}D=aA-1|0;if((D|0)==0){aj=aE;ak=aD;al=aC;am=aB;break}else{aw=aE;ax=aD;ay=aC;az=aB;aA=D}}}}while(0);if((c[y>>2]|0)==(E|0)){aF=c[q+8>>2]|0}else{aF=q}if((c[A>>2]|0)==(E|0)){aG=c[s+8>>2]|0}else{aG=s}if((c[z>>2]|0)==(E|0)){aH=c[r+8>>2]|0}else{aH=r}if((c[m>>2]|0)==(E|0)){break}else{p=E;q=aF;r=aH;s=aG;t=am;u=al;v=ak;w=aj}}d=E;e=aF;f=k+8|0;g=aH;h=aG;i=am;b=al;a=ak;j=aj}if((x|0)==270){return}else if((x|0)==224){aq(159408,159504,789,159568)}}function bd(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;b=i;i=i+8|0;d=b|0;e=a+12|0;c[e>>2]=0;f=a+8|0;if((c[f>>2]|0)>0){g=a|0;h=a+24|0;j=a+48|0;k=a+44|0;l=0;m=0;while(1){c[d>>2]=0;n=c[(c[g>>2]|0)+(m<<2)>>2]|0;do{if((n|0)!=0){o=n;p=0;do{L360:do{if((p|0)==0){q=d;r=0}else{s=c[o+20>>2]|0;t=d;u=p;while(1){v=u+12|0;if((s|0)<=(c[u+20>>2]|0)){q=t;r=u;break L360}w=c[v>>2]|0;if((w|0)==0){q=v;r=0;break}else{t=v;u=w}}}}while(0);c[q>>2]=o;u=o+12|0;o=c[u>>2]|0;c[u>>2]=r;p=c[d>>2]|0}while((o|0)!=0);if((p|0)==0){break}o=p;u=h;t=c[h>>2]|0;while(1){L370:do{if((t|0)==0){x=u;y=0}else{s=c[o+20>>2]|0;w=u;v=t;while(1){if((s|0)<=(c[v+20>>2]|0)){x=w;y=v;break L370}z=v+12|0;A=c[z>>2]|0;if((A|0)==0){x=z;y=0;break}else{w=z;v=A}}}}while(0);c[x>>2]=o;v=o+12|0;w=c[v>>2]|0;c[v>>2]=y;if((w|0)==0){break}else{o=w;u=(c[x>>2]|0)+12|0;t=y}}}}while(0);bb(a);ba(a);n=c[h>>2]|0;L377:do{if((n|0)!=0){t=h;u=n;o=0;while(1){p=t;w=u;while(1){B=w+12|0;C=c[B>>2]|0;if((C|0)==0){break}if((c[w+20>>2]|0)>(c[C+20>>2]|0)){D=290;break}else{p=B;w=C}}if((D|0)==290){D=0;c[p>>2]=C;v=C+12|0;c[B>>2]=c[v>>2];c[v>>2]=w;t=B;u=C;o=1;continue}if(!o){break L377}t=h;u=c[h>>2]|0;o=0}}}while(0);n=c[e>>2]|0;o=n+1|0;c[e>>2]=o;u=l+1|0;if((u|0)<4){l=u;m=o;continue}c[e>>2]=n;bc(a);n=j;while(1){o=c[n>>2]|0;if((o|0)==0){break}else{n=o|0}}c[n>>2]=c[c[k>>2]>>2];c[c[k>>2]>>2]=0;o=c[k>>2]|0;c[o+8>>2]=o+12;o=(c[e>>2]|0)+1|0;c[e>>2]=o;if((o|0)<(c[f>>2]|0)){l=0;m=o}else{break}}}m=a+56|0;while(1){l=c[m>>2]|0;if((l|0)==0){break}else{m=l|0}}l=a+52|0;c[m>>2]=c[c[l>>2]>>2];c[c[l>>2]>>2]=0;m=c[l>>2]|0;c[m+8>>2]=m+12;i=b;return}function be(a,b,c){a=a|0;b=b|0;c=+c;var d=0.0,e=0.0,f=0.0,h=0,i=0.0;if(!(c>0.0&c<1.0)){aq(159480,159520,99,159688)}d=+g[a>>2];e=+g[a+8>>2];if(c<0.0|c>1.0){aq(159288,159520,80,159648)}else{f=c;c=d+f*(e-d);h=a+16|0;i=e+f*(+g[h>>2]-e);g[b>>2]=d;g[b+8>>2]=c;g[b+16>>2]=c+f*(i-c);g[b+24>>2]=i;g[b+32>>2]=+g[h>>2];h=a+4|0;a=b+4|0;i=+g[h>>2];c=+g[h+8>>2];d=i+f*(c-i);b=h+16|0;e=c+f*(+g[b>>2]-c);g[a>>2]=i;g[a+8>>2]=d;g[a+16>>2]=d+f*(e-d);g[a+24>>2]=e;g[a+32>>2]=+g[b>>2];return}}function bf(a,b){a=a|0;b=b|0;var c=0.0,d=0.0,e=0.0,f=0.0,h=0.0,i=0,j=0.0,k=0.0,l=0.0,m=0,n=0,o=0.0,p=0.0,q=0.0;if((a|0)==0){aq(159456,159520,115,159664);return 0}if((b|0)==0){aq(159400,159520,116,159664);return 0}c=+g[a+4>>2];d=+g[a+12>>2];e=+g[a+20>>2];f=c-d;h=d-e;i=f<0.0;if(i){j=-0.0-h}else{j=h}if(f==0.0|j<0.0){j=e+(f-d);if(i){k=-0.0-f;l=-0.0-j}else{k=f;l=j}do{if(k!=0.0&l!=0.0&k<l){j=k/l;if(j!=j|(C=0.0,C!=C)){break}if(!(j>=0.0&j<1.0)){aq(159328,159520,47,159624);return 0}if(j==0.0){break}be(a,b,j);m=b+4|0;j=+g[m+16>>2];g[m+24>>2]=j;g[m+8>>2]=j;n=1;return n|0}}while(0);l=f;if(i){o=-0.0-l}else{o=l}l=h;if(h<0.0){p=-0.0-l}else{p=l}q=o<p?c:e}else{q=d}g[b>>2]=+g[a>>2];g[b+4>>2]=c;g[b+8>>2]=+g[a+8>>2];g[b+12>>2]=q;g[b+16>>2]=+g[a+16>>2];g[b+20>>2]=e;n=0;return n|0}function bg(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ab=0,ac=0,ad=0,ae=0,af=0,ag=0,ah=0,ai=0,aj=0,ak=0,am=0,ao=0,ap=0,aq=0,ar=0,as=0,at=0,au=0,av=0,aw=0,ax=0,ay=0,az=0,aA=0,aB=0,aC=0,aF=0,aG=0,aH=0,aI=0,aK=0,aL=0,aM=0,aN=0,aO=0;do{if(a>>>0<245){if(a>>>0<11){b=16}else{b=a+11&-8}d=b>>>3;e=c[39960]|0;f=e>>>(d>>>0);if((f&3|0)!=0){g=(f&1^1)+d|0;h=g<<1;i=159880+(h<<2)|0;j=159880+(h+2<<2)|0;h=c[j>>2]|0;k=h+8|0;l=c[k>>2]|0;do{if((i|0)==(l|0)){c[39960]=e&~(1<<g)}else{if(l>>>0<(c[39964]|0)>>>0){an();return 0}m=l+12|0;if((c[m>>2]|0)==(h|0)){c[m>>2]=i;c[j>>2]=l;break}else{an();return 0}}}while(0);l=g<<3;c[h+4>>2]=l|3;j=h+(l|4)|0;c[j>>2]=c[j>>2]|1;n=k;return n|0}if(b>>>0<=(c[39962]|0)>>>0){o=b;break}if((f|0)!=0){j=2<<d;l=f<<d&(j|-j);j=(l&-l)-1|0;l=j>>>12&16;i=j>>>(l>>>0);j=i>>>5&8;m=i>>>(j>>>0);i=m>>>2&4;p=m>>>(i>>>0);m=p>>>1&2;q=p>>>(m>>>0);p=q>>>1&1;r=(j|l|i|m|p)+(q>>>(p>>>0))|0;p=r<<1;q=159880+(p<<2)|0;m=159880+(p+2<<2)|0;p=c[m>>2]|0;i=p+8|0;l=c[i>>2]|0;do{if((q|0)==(l|0)){c[39960]=e&~(1<<r)}else{if(l>>>0<(c[39964]|0)>>>0){an();return 0}j=l+12|0;if((c[j>>2]|0)==(p|0)){c[j>>2]=q;c[m>>2]=l;break}else{an();return 0}}}while(0);l=r<<3;m=l-b|0;c[p+4>>2]=b|3;q=p;e=q+b|0;c[q+(b|4)>>2]=m|1;c[q+l>>2]=m;l=c[39962]|0;if((l|0)!=0){q=c[39965]|0;d=l>>>3;l=d<<1;f=159880+(l<<2)|0;k=c[39960]|0;h=1<<d;do{if((k&h|0)==0){c[39960]=k|h;s=f;t=159880+(l+2<<2)|0}else{d=159880+(l+2<<2)|0;g=c[d>>2]|0;if(g>>>0>=(c[39964]|0)>>>0){s=g;t=d;break}an();return 0}}while(0);c[t>>2]=q;c[s+12>>2]=q;c[q+8>>2]=s;c[q+12>>2]=f}c[39962]=m;c[39965]=e;n=i;return n|0}l=c[39961]|0;if((l|0)==0){o=b;break}h=(l&-l)-1|0;l=h>>>12&16;k=h>>>(l>>>0);h=k>>>5&8;p=k>>>(h>>>0);k=p>>>2&4;r=p>>>(k>>>0);p=r>>>1&2;d=r>>>(p>>>0);r=d>>>1&1;g=c[160144+((h|l|k|p|r)+(d>>>(r>>>0))<<2)>>2]|0;r=g;d=g;p=(c[g+4>>2]&-8)-b|0;while(1){g=c[r+16>>2]|0;if((g|0)==0){k=c[r+20>>2]|0;if((k|0)==0){break}else{u=k}}else{u=g}g=(c[u+4>>2]&-8)-b|0;k=g>>>0<p>>>0;r=u;d=k?u:d;p=k?g:p}r=d;i=c[39964]|0;if(r>>>0<i>>>0){an();return 0}e=r+b|0;m=e;if(r>>>0>=e>>>0){an();return 0}e=c[d+24>>2]|0;f=c[d+12>>2]|0;do{if((f|0)==(d|0)){q=d+20|0;g=c[q>>2]|0;if((g|0)==0){k=d+16|0;l=c[k>>2]|0;if((l|0)==0){v=0;break}else{w=l;x=k}}else{w=g;x=q}while(1){q=w+20|0;g=c[q>>2]|0;if((g|0)!=0){w=g;x=q;continue}q=w+16|0;g=c[q>>2]|0;if((g|0)==0){break}else{w=g;x=q}}if(x>>>0<i>>>0){an();return 0}else{c[x>>2]=0;v=w;break}}else{q=c[d+8>>2]|0;if(q>>>0<i>>>0){an();return 0}g=q+12|0;if((c[g>>2]|0)!=(d|0)){an();return 0}k=f+8|0;if((c[k>>2]|0)==(d|0)){c[g>>2]=f;c[k>>2]=q;v=f;break}else{an();return 0}}}while(0);L637:do{if((e|0)!=0){f=d+28|0;i=160144+(c[f>>2]<<2)|0;do{if((d|0)==(c[i>>2]|0)){c[i>>2]=v;if((v|0)!=0){break}c[39961]=c[39961]&~(1<<c[f>>2]);break L637}else{if(e>>>0<(c[39964]|0)>>>0){an();return 0}q=e+16|0;if((c[q>>2]|0)==(d|0)){c[q>>2]=v}else{c[e+20>>2]=v}if((v|0)==0){break L637}}}while(0);if(v>>>0<(c[39964]|0)>>>0){an();return 0}c[v+24>>2]=e;f=c[d+16>>2]|0;do{if((f|0)!=0){if(f>>>0<(c[39964]|0)>>>0){an();return 0}else{c[v+16>>2]=f;c[f+24>>2]=v;break}}}while(0);f=c[d+20>>2]|0;if((f|0)==0){break}if(f>>>0<(c[39964]|0)>>>0){an();return 0}else{c[v+20>>2]=f;c[f+24>>2]=v;break}}}while(0);if(p>>>0<16){e=p+b|0;c[d+4>>2]=e|3;f=r+(e+4)|0;c[f>>2]=c[f>>2]|1}else{c[d+4>>2]=b|3;c[r+(b|4)>>2]=p|1;c[r+(p+b)>>2]=p;f=c[39962]|0;if((f|0)!=0){e=c[39965]|0;i=f>>>3;f=i<<1;q=159880+(f<<2)|0;k=c[39960]|0;g=1<<i;do{if((k&g|0)==0){c[39960]=k|g;y=q;z=159880+(f+2<<2)|0}else{i=159880+(f+2<<2)|0;l=c[i>>2]|0;if(l>>>0>=(c[39964]|0)>>>0){y=l;z=i;break}an();return 0}}while(0);c[z>>2]=e;c[y+12>>2]=e;c[e+8>>2]=y;c[e+12>>2]=q}c[39962]=p;c[39965]=m}n=d+8|0;return n|0}else{if(a>>>0>4294967231){o=-1;break}f=a+11|0;g=f&-8;k=c[39961]|0;if((k|0)==0){o=g;break}r=-g|0;i=f>>>8;do{if((i|0)==0){A=0}else{if(g>>>0>16777215){A=31;break}f=(i+1048320|0)>>>16&8;l=i<<f;h=(l+520192|0)>>>16&4;j=l<<h;l=(j+245760|0)>>>16&2;B=14-(h|f|l)+(j<<l>>>15)|0;A=g>>>((B+7|0)>>>0)&1|B<<1}}while(0);i=c[160144+(A<<2)>>2]|0;L444:do{if((i|0)==0){C=0;D=r;E=0}else{if((A|0)==31){F=0}else{F=25-(A>>>1)|0}d=0;m=r;p=i;q=g<<F;e=0;while(1){B=c[p+4>>2]&-8;l=B-g|0;if(l>>>0<m>>>0){if((B|0)==(g|0)){C=p;D=l;E=p;break L444}else{G=p;H=l}}else{G=d;H=m}l=c[p+20>>2]|0;B=c[p+16+(q>>>31<<2)>>2]|0;j=(l|0)==0|(l|0)==(B|0)?e:l;if((B|0)==0){C=G;D=H;E=j;break}else{d=G;m=H;p=B;q=q<<1;e=j}}}}while(0);if((E|0)==0&(C|0)==0){i=2<<A;r=k&(i|-i);if((r|0)==0){o=g;break}i=(r&-r)-1|0;r=i>>>12&16;e=i>>>(r>>>0);i=e>>>5&8;q=e>>>(i>>>0);e=q>>>2&4;p=q>>>(e>>>0);q=p>>>1&2;m=p>>>(q>>>0);p=m>>>1&1;I=c[160144+((i|r|e|q|p)+(m>>>(p>>>0))<<2)>>2]|0}else{I=E}if((I|0)==0){J=D;K=C}else{p=I;m=D;q=C;while(1){e=(c[p+4>>2]&-8)-g|0;r=e>>>0<m>>>0;i=r?e:m;e=r?p:q;r=c[p+16>>2]|0;if((r|0)!=0){p=r;m=i;q=e;continue}r=c[p+20>>2]|0;if((r|0)==0){J=i;K=e;break}else{p=r;m=i;q=e}}}if((K|0)==0){o=g;break}if(J>>>0>=((c[39962]|0)-g|0)>>>0){o=g;break}q=K;m=c[39964]|0;if(q>>>0<m>>>0){an();return 0}p=q+g|0;k=p;if(q>>>0>=p>>>0){an();return 0}e=c[K+24>>2]|0;i=c[K+12>>2]|0;do{if((i|0)==(K|0)){r=K+20|0;d=c[r>>2]|0;if((d|0)==0){j=K+16|0;B=c[j>>2]|0;if((B|0)==0){L=0;break}else{M=B;N=j}}else{M=d;N=r}while(1){r=M+20|0;d=c[r>>2]|0;if((d|0)!=0){M=d;N=r;continue}r=M+16|0;d=c[r>>2]|0;if((d|0)==0){break}else{M=d;N=r}}if(N>>>0<m>>>0){an();return 0}else{c[N>>2]=0;L=M;break}}else{r=c[K+8>>2]|0;if(r>>>0<m>>>0){an();return 0}d=r+12|0;if((c[d>>2]|0)!=(K|0)){an();return 0}j=i+8|0;if((c[j>>2]|0)==(K|0)){c[d>>2]=i;c[j>>2]=r;L=i;break}else{an();return 0}}}while(0);L494:do{if((e|0)!=0){i=K+28|0;m=160144+(c[i>>2]<<2)|0;do{if((K|0)==(c[m>>2]|0)){c[m>>2]=L;if((L|0)!=0){break}c[39961]=c[39961]&~(1<<c[i>>2]);break L494}else{if(e>>>0<(c[39964]|0)>>>0){an();return 0}r=e+16|0;if((c[r>>2]|0)==(K|0)){c[r>>2]=L}else{c[e+20>>2]=L}if((L|0)==0){break L494}}}while(0);if(L>>>0<(c[39964]|0)>>>0){an();return 0}c[L+24>>2]=e;i=c[K+16>>2]|0;do{if((i|0)!=0){if(i>>>0<(c[39964]|0)>>>0){an();return 0}else{c[L+16>>2]=i;c[i+24>>2]=L;break}}}while(0);i=c[K+20>>2]|0;if((i|0)==0){break}if(i>>>0<(c[39964]|0)>>>0){an();return 0}else{c[L+20>>2]=i;c[i+24>>2]=L;break}}}while(0);L522:do{if(J>>>0<16){e=J+g|0;c[K+4>>2]=e|3;i=q+(e+4)|0;c[i>>2]=c[i>>2]|1}else{c[K+4>>2]=g|3;c[q+(g|4)>>2]=J|1;c[q+(J+g)>>2]=J;i=J>>>3;if(J>>>0<256){e=i<<1;m=159880+(e<<2)|0;r=c[39960]|0;j=1<<i;do{if((r&j|0)==0){c[39960]=r|j;O=m;P=159880+(e+2<<2)|0}else{i=159880+(e+2<<2)|0;d=c[i>>2]|0;if(d>>>0>=(c[39964]|0)>>>0){O=d;P=i;break}an();return 0}}while(0);c[P>>2]=k;c[O+12>>2]=k;c[q+(g+8)>>2]=O;c[q+(g+12)>>2]=m;break}e=p;j=J>>>8;do{if((j|0)==0){Q=0}else{if(J>>>0>16777215){Q=31;break}r=(j+1048320|0)>>>16&8;i=j<<r;d=(i+520192|0)>>>16&4;B=i<<d;i=(B+245760|0)>>>16&2;l=14-(d|r|i)+(B<<i>>>15)|0;Q=J>>>((l+7|0)>>>0)&1|l<<1}}while(0);j=160144+(Q<<2)|0;c[q+(g+28)>>2]=Q;c[q+(g+20)>>2]=0;c[q+(g+16)>>2]=0;m=c[39961]|0;l=1<<Q;if((m&l|0)==0){c[39961]=m|l;c[j>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break}l=c[j>>2]|0;if((Q|0)==31){R=0}else{R=25-(Q>>>1)|0}L543:do{if((c[l+4>>2]&-8|0)==(J|0)){S=l}else{j=l;m=J<<R;while(1){T=j+16+(m>>>31<<2)|0;i=c[T>>2]|0;if((i|0)==0){break}if((c[i+4>>2]&-8|0)==(J|0)){S=i;break L543}else{j=i;m=m<<1}}if(T>>>0<(c[39964]|0)>>>0){an();return 0}else{c[T>>2]=e;c[q+(g+24)>>2]=j;c[q+(g+12)>>2]=e;c[q+(g+8)>>2]=e;break L522}}}while(0);l=S+8|0;m=c[l>>2]|0;i=c[39964]|0;if(S>>>0<i>>>0){an();return 0}if(m>>>0<i>>>0){an();return 0}else{c[m+12>>2]=e;c[l>>2]=e;c[q+(g+8)>>2]=m;c[q+(g+12)>>2]=S;c[q+(g+24)>>2]=0;break}}}while(0);n=K+8|0;return n|0}}while(0);K=c[39962]|0;if(o>>>0<=K>>>0){S=K-o|0;T=c[39965]|0;if(S>>>0>15){J=T;c[39965]=J+o;c[39962]=S;c[J+(o+4)>>2]=S|1;c[J+K>>2]=S;c[T+4>>2]=o|3}else{c[39962]=0;c[39965]=0;c[T+4>>2]=K|3;S=T+(K+4)|0;c[S>>2]=c[S>>2]|1}n=T+8|0;return n|0}T=c[39963]|0;if(o>>>0<T>>>0){S=T-o|0;c[39963]=S;T=c[39966]|0;K=T;c[39966]=K+o;c[K+(o+4)>>2]=S|1;c[T+4>>2]=o|3;n=T+8|0;return n|0}do{if((c[39952]|0)==0){T=al(30)|0;if((T-1&T|0)==0){c[39954]=T;c[39953]=T;c[39955]=-1;c[39956]=-1;c[39957]=0;c[40071]=0;c[39952]=(aJ(0)|0)&-16^1431655768;break}else{an();return 0}}}while(0);T=o+48|0;S=c[39954]|0;K=o+47|0;J=S+K|0;R=-S|0;S=J&R;if(S>>>0<=o>>>0){n=0;return n|0}Q=c[40070]|0;do{if((Q|0)!=0){O=c[40068]|0;P=O+S|0;if(P>>>0<=O>>>0|P>>>0>Q>>>0){n=0}else{break}return n|0}}while(0);L704:do{if((c[40071]&4|0)==0){Q=c[39966]|0;L706:do{if((Q|0)==0){U=510}else{P=Q;O=160288;while(1){V=O|0;L=c[V>>2]|0;if(L>>>0<=P>>>0){W=O+4|0;if((L+(c[W>>2]|0)|0)>>>0>P>>>0){break}}L=c[O+8>>2]|0;if((L|0)==0){U=510;break L706}else{O=L}}if((O|0)==0){U=510;break}P=J-(c[39963]|0)&R;if(P>>>0>=2147483647){X=0;break}e=aD(P|0)|0;L=(e|0)==((c[V>>2]|0)+(c[W>>2]|0)|0);Y=L?e:-1;Z=L?P:0;_=e;$=P;U=519}}while(0);do{if((U|0)==510){Q=aD(0)|0;if((Q|0)==-1){X=0;break}P=Q;e=c[39953]|0;L=e-1|0;if((L&P|0)==0){aa=S}else{aa=S-P+(L+P&-e)|0}e=c[40068]|0;P=e+aa|0;if(!(aa>>>0>o>>>0&aa>>>0<2147483647)){X=0;break}L=c[40070]|0;if((L|0)!=0){if(P>>>0<=e>>>0|P>>>0>L>>>0){X=0;break}}L=aD(aa|0)|0;P=(L|0)==(Q|0);Y=P?Q:-1;Z=P?aa:0;_=L;$=aa;U=519}}while(0);L726:do{if((U|0)==519){L=-$|0;if((Y|0)!=-1){ab=Z;ac=Y;U=530;break L704}do{if((_|0)!=-1&$>>>0<2147483647&$>>>0<T>>>0){P=c[39954]|0;Q=K-$+P&-P;if(Q>>>0>=2147483647){ad=$;break}if((aD(Q|0)|0)==-1){aD(L|0)|0;X=Z;break L726}else{ad=Q+$|0;break}}else{ad=$}}while(0);if((_|0)==-1){X=Z}else{ab=ad;ac=_;U=530;break L704}}}while(0);c[40071]=c[40071]|4;ae=X;U=527}else{ae=0;U=527}}while(0);do{if((U|0)==527){if(S>>>0>=2147483647){break}X=aD(S|0)|0;_=aD(0)|0;if(!((_|0)!=-1&(X|0)!=-1&X>>>0<_>>>0)){break}ad=_-X|0;_=ad>>>0>(o+40|0)>>>0;if(_){ab=_?ad:ae;ac=X;U=530}}}while(0);do{if((U|0)==530){ae=(c[40068]|0)+ab|0;c[40068]=ae;if(ae>>>0>(c[40069]|0)>>>0){c[40069]=ae}ae=c[39966]|0;L746:do{if((ae|0)==0){S=c[39964]|0;if((S|0)==0|ac>>>0<S>>>0){c[39964]=ac}c[40072]=ac;c[40073]=ab;c[40075]=0;c[39969]=c[39952];c[39968]=-1;S=0;do{X=S<<1;ad=159880+(X<<2)|0;c[159880+(X+3<<2)>>2]=ad;c[159880+(X+2<<2)>>2]=ad;S=S+1|0;}while(S>>>0<32);S=ac+8|0;if((S&7|0)==0){af=0}else{af=-S&7}S=ab-40-af|0;c[39966]=ac+af;c[39963]=S;c[ac+(af+4)>>2]=S|1;c[ac+(ab-36)>>2]=40;c[39967]=c[39956]}else{S=160288;while(1){ag=c[S>>2]|0;ah=S+4|0;ai=c[ah>>2]|0;if((ac|0)==(ag+ai|0)){U=542;break}ad=c[S+8>>2]|0;if((ad|0)==0){break}else{S=ad}}do{if((U|0)==542){if((c[S+12>>2]&8|0)!=0){break}ad=ae;if(!(ad>>>0>=ag>>>0&ad>>>0<ac>>>0)){break}c[ah>>2]=ai+ab;ad=c[39966]|0;X=(c[39963]|0)+ab|0;_=ad;Z=ad+8|0;if((Z&7|0)==0){aj=0}else{aj=-Z&7}Z=X-aj|0;c[39966]=_+aj;c[39963]=Z;c[_+(aj+4)>>2]=Z|1;c[_+(X+4)>>2]=40;c[39967]=c[39956];break L746}}while(0);if(ac>>>0<(c[39964]|0)>>>0){c[39964]=ac}S=ac+ab|0;X=160288;while(1){ak=X|0;if((c[ak>>2]|0)==(S|0)){U=552;break}_=c[X+8>>2]|0;if((_|0)==0){break}else{X=_}}do{if((U|0)==552){if((c[X+12>>2]&8|0)!=0){break}c[ak>>2]=ac;S=X+4|0;c[S>>2]=(c[S>>2]|0)+ab;S=ac+8|0;if((S&7|0)==0){am=0}else{am=-S&7}S=ac+(ab+8)|0;if((S&7|0)==0){ao=0}else{ao=-S&7}S=ac+(ao+ab)|0;_=S;Z=am+o|0;ad=ac+Z|0;$=ad;K=S-(ac+am)-o|0;c[ac+(am+4)>>2]=o|3;L783:do{if((_|0)==(c[39966]|0)){T=(c[39963]|0)+K|0;c[39963]=T;c[39966]=$;c[ac+(Z+4)>>2]=T|1}else{if((_|0)==(c[39965]|0)){T=(c[39962]|0)+K|0;c[39962]=T;c[39965]=$;c[ac+(Z+4)>>2]=T|1;c[ac+(T+Z)>>2]=T;break}T=ab+4|0;Y=c[ac+(T+ao)>>2]|0;if((Y&3|0)==1){aa=Y&-8;W=Y>>>3;L791:do{if(Y>>>0<256){V=c[ac+((ao|8)+ab)>>2]|0;R=c[ac+(ab+12+ao)>>2]|0;J=159880+(W<<1<<2)|0;do{if((V|0)!=(J|0)){if(V>>>0<(c[39964]|0)>>>0){an();return 0}if((c[V+12>>2]|0)==(_|0)){break}an();return 0}}while(0);if((R|0)==(V|0)){c[39960]=c[39960]&~(1<<W);break}do{if((R|0)==(J|0)){ap=R+8|0}else{if(R>>>0<(c[39964]|0)>>>0){an();return 0}L=R+8|0;if((c[L>>2]|0)==(_|0)){ap=L;break}an();return 0}}while(0);c[V+12>>2]=R;c[ap>>2]=V}else{J=S;L=c[ac+((ao|24)+ab)>>2]|0;O=c[ac+(ab+12+ao)>>2]|0;do{if((O|0)==(J|0)){Q=ao|16;P=ac+(T+Q)|0;e=c[P>>2]|0;if((e|0)==0){M=ac+(Q+ab)|0;Q=c[M>>2]|0;if((Q|0)==0){aq=0;break}else{ar=Q;as=M}}else{ar=e;as=P}while(1){P=ar+20|0;e=c[P>>2]|0;if((e|0)!=0){ar=e;as=P;continue}P=ar+16|0;e=c[P>>2]|0;if((e|0)==0){break}else{ar=e;as=P}}if(as>>>0<(c[39964]|0)>>>0){an();return 0}else{c[as>>2]=0;aq=ar;break}}else{P=c[ac+((ao|8)+ab)>>2]|0;if(P>>>0<(c[39964]|0)>>>0){an();return 0}e=P+12|0;if((c[e>>2]|0)!=(J|0)){an();return 0}M=O+8|0;if((c[M>>2]|0)==(J|0)){c[e>>2]=O;c[M>>2]=P;aq=O;break}else{an();return 0}}}while(0);if((L|0)==0){break}O=ac+(ab+28+ao)|0;V=160144+(c[O>>2]<<2)|0;do{if((J|0)==(c[V>>2]|0)){c[V>>2]=aq;if((aq|0)!=0){break}c[39961]=c[39961]&~(1<<c[O>>2]);break L791}else{if(L>>>0<(c[39964]|0)>>>0){an();return 0}R=L+16|0;if((c[R>>2]|0)==(J|0)){c[R>>2]=aq}else{c[L+20>>2]=aq}if((aq|0)==0){break L791}}}while(0);if(aq>>>0<(c[39964]|0)>>>0){an();return 0}c[aq+24>>2]=L;J=ao|16;O=c[ac+(J+ab)>>2]|0;do{if((O|0)!=0){if(O>>>0<(c[39964]|0)>>>0){an();return 0}else{c[aq+16>>2]=O;c[O+24>>2]=aq;break}}}while(0);O=c[ac+(T+J)>>2]|0;if((O|0)==0){break}if(O>>>0<(c[39964]|0)>>>0){an();return 0}else{c[aq+20>>2]=O;c[O+24>>2]=aq;break}}}while(0);at=ac+((aa|ao)+ab)|0;au=aa+K|0}else{at=_;au=K}T=at+4|0;c[T>>2]=c[T>>2]&-2;c[ac+(Z+4)>>2]=au|1;c[ac+(au+Z)>>2]=au;T=au>>>3;if(au>>>0<256){W=T<<1;Y=159880+(W<<2)|0;O=c[39960]|0;L=1<<T;do{if((O&L|0)==0){c[39960]=O|L;av=Y;aw=159880+(W+2<<2)|0}else{T=159880+(W+2<<2)|0;V=c[T>>2]|0;if(V>>>0>=(c[39964]|0)>>>0){av=V;aw=T;break}an();return 0}}while(0);c[aw>>2]=$;c[av+12>>2]=$;c[ac+(Z+8)>>2]=av;c[ac+(Z+12)>>2]=Y;break}W=ad;L=au>>>8;do{if((L|0)==0){ax=0}else{if(au>>>0>16777215){ax=31;break}O=(L+1048320|0)>>>16&8;aa=L<<O;T=(aa+520192|0)>>>16&4;V=aa<<T;aa=(V+245760|0)>>>16&2;R=14-(T|O|aa)+(V<<aa>>>15)|0;ax=au>>>((R+7|0)>>>0)&1|R<<1}}while(0);L=160144+(ax<<2)|0;c[ac+(Z+28)>>2]=ax;c[ac+(Z+20)>>2]=0;c[ac+(Z+16)>>2]=0;Y=c[39961]|0;R=1<<ax;if((Y&R|0)==0){c[39961]=Y|R;c[L>>2]=W;c[ac+(Z+24)>>2]=L;c[ac+(Z+12)>>2]=W;c[ac+(Z+8)>>2]=W;break}R=c[L>>2]|0;if((ax|0)==31){ay=0}else{ay=25-(ax>>>1)|0}L880:do{if((c[R+4>>2]&-8|0)==(au|0)){az=R}else{L=R;Y=au<<ay;while(1){aA=L+16+(Y>>>31<<2)|0;aa=c[aA>>2]|0;if((aa|0)==0){break}if((c[aa+4>>2]&-8|0)==(au|0)){az=aa;break L880}else{L=aa;Y=Y<<1}}if(aA>>>0<(c[39964]|0)>>>0){an();return 0}else{c[aA>>2]=W;c[ac+(Z+24)>>2]=L;c[ac+(Z+12)>>2]=W;c[ac+(Z+8)>>2]=W;break L783}}}while(0);R=az+8|0;Y=c[R>>2]|0;J=c[39964]|0;if(az>>>0<J>>>0){an();return 0}if(Y>>>0<J>>>0){an();return 0}else{c[Y+12>>2]=W;c[R>>2]=W;c[ac+(Z+8)>>2]=Y;c[ac+(Z+12)>>2]=az;c[ac+(Z+24)>>2]=0;break}}}while(0);n=ac+(am|8)|0;return n|0}}while(0);X=ae;Z=160288;while(1){aB=c[Z>>2]|0;if(aB>>>0<=X>>>0){aC=c[Z+4>>2]|0;aF=aB+aC|0;if(aF>>>0>X>>>0){break}}Z=c[Z+8>>2]|0}Z=aB+(aC-39)|0;if((Z&7|0)==0){aG=0}else{aG=-Z&7}Z=aB+(aC-47+aG)|0;ad=Z>>>0<(ae+16|0)>>>0?X:Z;Z=ad+8|0;$=ac+8|0;if(($&7|0)==0){aH=0}else{aH=-$&7}$=ab-40-aH|0;c[39966]=ac+aH;c[39963]=$;c[ac+(aH+4)>>2]=$|1;c[ac+(ab-36)>>2]=40;c[39967]=c[39956];c[ad+4>>2]=27;c[Z>>2]=c[40072];c[Z+4>>2]=c[40073];c[Z+8>>2]=c[40074];c[Z+12>>2]=c[40075];c[40072]=ac;c[40073]=ab;c[40075]=0;c[40074]=Z;Z=ad+28|0;c[Z>>2]=7;if((ad+32|0)>>>0<aF>>>0){$=Z;while(1){Z=$+4|0;c[Z>>2]=7;if(($+8|0)>>>0<aF>>>0){$=Z}else{break}}}if((ad|0)==(X|0)){break}$=ad-ae|0;Z=X+($+4)|0;c[Z>>2]=c[Z>>2]&-2;c[ae+4>>2]=$|1;c[X+$>>2]=$;Z=$>>>3;if($>>>0<256){K=Z<<1;_=159880+(K<<2)|0;S=c[39960]|0;j=1<<Z;do{if((S&j|0)==0){c[39960]=S|j;aI=_;aK=159880+(K+2<<2)|0}else{Z=159880+(K+2<<2)|0;Y=c[Z>>2]|0;if(Y>>>0>=(c[39964]|0)>>>0){aI=Y;aK=Z;break}an();return 0}}while(0);c[aK>>2]=ae;c[aI+12>>2]=ae;c[ae+8>>2]=aI;c[ae+12>>2]=_;break}K=ae;j=$>>>8;do{if((j|0)==0){aL=0}else{if($>>>0>16777215){aL=31;break}S=(j+1048320|0)>>>16&8;X=j<<S;ad=(X+520192|0)>>>16&4;Z=X<<ad;X=(Z+245760|0)>>>16&2;Y=14-(ad|S|X)+(Z<<X>>>15)|0;aL=$>>>((Y+7|0)>>>0)&1|Y<<1}}while(0);j=160144+(aL<<2)|0;c[ae+28>>2]=aL;c[ae+20>>2]=0;c[ae+16>>2]=0;_=c[39961]|0;Y=1<<aL;if((_&Y|0)==0){c[39961]=_|Y;c[j>>2]=K;c[ae+24>>2]=j;c[ae+12>>2]=ae;c[ae+8>>2]=ae;break}Y=c[j>>2]|0;if((aL|0)==31){aM=0}else{aM=25-(aL>>>1)|0}L934:do{if((c[Y+4>>2]&-8|0)==($|0)){aN=Y}else{j=Y;_=$<<aM;while(1){aO=j+16+(_>>>31<<2)|0;X=c[aO>>2]|0;if((X|0)==0){break}if((c[X+4>>2]&-8|0)==($|0)){aN=X;break L934}else{j=X;_=_<<1}}if(aO>>>0<(c[39964]|0)>>>0){an();return 0}else{c[aO>>2]=K;c[ae+24>>2]=j;c[ae+12>>2]=ae;c[ae+8>>2]=ae;break L746}}}while(0);$=aN+8|0;Y=c[$>>2]|0;_=c[39964]|0;if(aN>>>0<_>>>0){an();return 0}if(Y>>>0<_>>>0){an();return 0}else{c[Y+12>>2]=K;c[$>>2]=K;c[ae+8>>2]=Y;c[ae+12>>2]=aN;c[ae+24>>2]=0;break}}}while(0);ae=c[39963]|0;if(ae>>>0<=o>>>0){break}Y=ae-o|0;c[39963]=Y;ae=c[39966]|0;$=ae;c[39966]=$+o;c[$+(o+4)>>2]=Y|1;c[ae+4>>2]=o|3;n=ae+8|0;return n|0}}while(0);c[(aE()|0)>>2]=12;n=0;return n|0}function bh(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;if((a|0)==0){return}b=a-8|0;d=b;e=c[39964]|0;if(b>>>0<e>>>0){an()}f=c[a-4>>2]|0;g=f&3;if((g|0)==1){an()}h=f&-8;i=a+(h-8)|0;j=i;L965:do{if((f&1|0)==0){k=c[b>>2]|0;if((g|0)==0){return}l=-8-k|0;m=a+l|0;n=m;o=k+h|0;if(m>>>0<e>>>0){an()}if((n|0)==(c[39965]|0)){p=a+(h-4)|0;if((c[p>>2]&3|0)!=3){q=n;r=o;break}c[39962]=o;c[p>>2]=c[p>>2]&-2;c[a+(l+4)>>2]=o|1;c[i>>2]=o;return}p=k>>>3;if(k>>>0<256){k=c[a+(l+8)>>2]|0;s=c[a+(l+12)>>2]|0;t=159880+(p<<1<<2)|0;do{if((k|0)!=(t|0)){if(k>>>0<e>>>0){an()}if((c[k+12>>2]|0)==(n|0)){break}an()}}while(0);if((s|0)==(k|0)){c[39960]=c[39960]&~(1<<p);q=n;r=o;break}do{if((s|0)==(t|0)){u=s+8|0}else{if(s>>>0<e>>>0){an()}v=s+8|0;if((c[v>>2]|0)==(n|0)){u=v;break}an()}}while(0);c[k+12>>2]=s;c[u>>2]=k;q=n;r=o;break}t=m;p=c[a+(l+24)>>2]|0;v=c[a+(l+12)>>2]|0;do{if((v|0)==(t|0)){w=a+(l+20)|0;x=c[w>>2]|0;if((x|0)==0){y=a+(l+16)|0;z=c[y>>2]|0;if((z|0)==0){A=0;break}else{B=z;C=y}}else{B=x;C=w}while(1){w=B+20|0;x=c[w>>2]|0;if((x|0)!=0){B=x;C=w;continue}w=B+16|0;x=c[w>>2]|0;if((x|0)==0){break}else{B=x;C=w}}if(C>>>0<e>>>0){an()}else{c[C>>2]=0;A=B;break}}else{w=c[a+(l+8)>>2]|0;if(w>>>0<e>>>0){an()}x=w+12|0;if((c[x>>2]|0)!=(t|0)){an()}y=v+8|0;if((c[y>>2]|0)==(t|0)){c[x>>2]=v;c[y>>2]=w;A=v;break}else{an()}}}while(0);if((p|0)==0){q=n;r=o;break}v=a+(l+28)|0;m=160144+(c[v>>2]<<2)|0;do{if((t|0)==(c[m>>2]|0)){c[m>>2]=A;if((A|0)!=0){break}c[39961]=c[39961]&~(1<<c[v>>2]);q=n;r=o;break L965}else{if(p>>>0<(c[39964]|0)>>>0){an()}k=p+16|0;if((c[k>>2]|0)==(t|0)){c[k>>2]=A}else{c[p+20>>2]=A}if((A|0)==0){q=n;r=o;break L965}}}while(0);if(A>>>0<(c[39964]|0)>>>0){an()}c[A+24>>2]=p;t=c[a+(l+16)>>2]|0;do{if((t|0)!=0){if(t>>>0<(c[39964]|0)>>>0){an()}else{c[A+16>>2]=t;c[t+24>>2]=A;break}}}while(0);t=c[a+(l+20)>>2]|0;if((t|0)==0){q=n;r=o;break}if(t>>>0<(c[39964]|0)>>>0){an()}else{c[A+20>>2]=t;c[t+24>>2]=A;q=n;r=o;break}}else{q=d;r=h}}while(0);d=q;if(d>>>0>=i>>>0){an()}A=a+(h-4)|0;e=c[A>>2]|0;if((e&1|0)==0){an()}do{if((e&2|0)==0){if((j|0)==(c[39966]|0)){B=(c[39963]|0)+r|0;c[39963]=B;c[39966]=q;c[q+4>>2]=B|1;if((q|0)!=(c[39965]|0)){return}c[39965]=0;c[39962]=0;return}if((j|0)==(c[39965]|0)){B=(c[39962]|0)+r|0;c[39962]=B;c[39965]=q;c[q+4>>2]=B|1;c[d+B>>2]=B;return}B=(e&-8)+r|0;C=e>>>3;L1067:do{if(e>>>0<256){u=c[a+h>>2]|0;g=c[a+(h|4)>>2]|0;b=159880+(C<<1<<2)|0;do{if((u|0)!=(b|0)){if(u>>>0<(c[39964]|0)>>>0){an()}if((c[u+12>>2]|0)==(j|0)){break}an()}}while(0);if((g|0)==(u|0)){c[39960]=c[39960]&~(1<<C);break}do{if((g|0)==(b|0)){D=g+8|0}else{if(g>>>0<(c[39964]|0)>>>0){an()}f=g+8|0;if((c[f>>2]|0)==(j|0)){D=f;break}an()}}while(0);c[u+12>>2]=g;c[D>>2]=u}else{b=i;f=c[a+(h+16)>>2]|0;t=c[a+(h|4)>>2]|0;do{if((t|0)==(b|0)){p=a+(h+12)|0;v=c[p>>2]|0;if((v|0)==0){m=a+(h+8)|0;k=c[m>>2]|0;if((k|0)==0){E=0;break}else{F=k;G=m}}else{F=v;G=p}while(1){p=F+20|0;v=c[p>>2]|0;if((v|0)!=0){F=v;G=p;continue}p=F+16|0;v=c[p>>2]|0;if((v|0)==0){break}else{F=v;G=p}}if(G>>>0<(c[39964]|0)>>>0){an()}else{c[G>>2]=0;E=F;break}}else{p=c[a+h>>2]|0;if(p>>>0<(c[39964]|0)>>>0){an()}v=p+12|0;if((c[v>>2]|0)!=(b|0)){an()}m=t+8|0;if((c[m>>2]|0)==(b|0)){c[v>>2]=t;c[m>>2]=p;E=t;break}else{an()}}}while(0);if((f|0)==0){break}t=a+(h+20)|0;u=160144+(c[t>>2]<<2)|0;do{if((b|0)==(c[u>>2]|0)){c[u>>2]=E;if((E|0)!=0){break}c[39961]=c[39961]&~(1<<c[t>>2]);break L1067}else{if(f>>>0<(c[39964]|0)>>>0){an()}g=f+16|0;if((c[g>>2]|0)==(b|0)){c[g>>2]=E}else{c[f+20>>2]=E}if((E|0)==0){break L1067}}}while(0);if(E>>>0<(c[39964]|0)>>>0){an()}c[E+24>>2]=f;b=c[a+(h+8)>>2]|0;do{if((b|0)!=0){if(b>>>0<(c[39964]|0)>>>0){an()}else{c[E+16>>2]=b;c[b+24>>2]=E;break}}}while(0);b=c[a+(h+12)>>2]|0;if((b|0)==0){break}if(b>>>0<(c[39964]|0)>>>0){an()}else{c[E+20>>2]=b;c[b+24>>2]=E;break}}}while(0);c[q+4>>2]=B|1;c[d+B>>2]=B;if((q|0)!=(c[39965]|0)){H=B;break}c[39962]=B;return}else{c[A>>2]=e&-2;c[q+4>>2]=r|1;c[d+r>>2]=r;H=r}}while(0);r=H>>>3;if(H>>>0<256){d=r<<1;e=159880+(d<<2)|0;A=c[39960]|0;E=1<<r;do{if((A&E|0)==0){c[39960]=A|E;I=e;J=159880+(d+2<<2)|0}else{r=159880+(d+2<<2)|0;h=c[r>>2]|0;if(h>>>0>=(c[39964]|0)>>>0){I=h;J=r;break}an()}}while(0);c[J>>2]=q;c[I+12>>2]=q;c[q+8>>2]=I;c[q+12>>2]=e;return}e=q;I=H>>>8;do{if((I|0)==0){K=0}else{if(H>>>0>16777215){K=31;break}J=(I+1048320|0)>>>16&8;d=I<<J;E=(d+520192|0)>>>16&4;A=d<<E;d=(A+245760|0)>>>16&2;r=14-(E|J|d)+(A<<d>>>15)|0;K=H>>>((r+7|0)>>>0)&1|r<<1}}while(0);I=160144+(K<<2)|0;c[q+28>>2]=K;c[q+20>>2]=0;c[q+16>>2]=0;r=c[39961]|0;d=1<<K;L1154:do{if((r&d|0)==0){c[39961]=r|d;c[I>>2]=e;c[q+24>>2]=I;c[q+12>>2]=q;c[q+8>>2]=q}else{A=c[I>>2]|0;if((K|0)==31){L=0}else{L=25-(K>>>1)|0}L1160:do{if((c[A+4>>2]&-8|0)==(H|0)){M=A}else{J=A;E=H<<L;while(1){N=J+16+(E>>>31<<2)|0;h=c[N>>2]|0;if((h|0)==0){break}if((c[h+4>>2]&-8|0)==(H|0)){M=h;break L1160}else{J=h;E=E<<1}}if(N>>>0<(c[39964]|0)>>>0){an()}else{c[N>>2]=e;c[q+24>>2]=J;c[q+12>>2]=q;c[q+8>>2]=q;break L1154}}}while(0);A=M+8|0;B=c[A>>2]|0;E=c[39964]|0;if(M>>>0<E>>>0){an()}if(B>>>0<E>>>0){an()}else{c[B+12>>2]=e;c[A>>2]=e;c[q+8>>2]=B;c[q+12>>2]=M;c[q+24>>2]=0;break}}}while(0);q=(c[39968]|0)-1|0;c[39968]=q;if((q|0)==0){O=160296}else{return}while(1){q=c[O>>2]|0;if((q|0)==0){break}else{O=q+8|0}}c[39968]=-1;return}function bi(a){a=a|0;var b=0,d=0,e=0;b=(a|0)==0?1:a;while(1){d=bg(b)|0;if((d|0)!=0){e=892;break}a=(B=c[40078]|0,c[40078]=B+0,B);if((a|0)==0){break}aN[a&1]()}if((e|0)==892){return d|0}d=av(4)|0;c[d>>2]=159712;am(d|0,159776,4);return 0}function bj(a){a=a|0;return bi(a)|0}function bk(a){a=a|0;if((a|0)==0){return}bh(a);return}function bl(a){a=a|0;bk(a);return}function bm(a){a=a|0;return}function bn(a){a=a|0;return 159384}function bo(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;f=b|0;if((b&3)==(d&3)){while(b&3){if((e|0)==0)return f|0;a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b]=a[d]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function bp(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;f=b+e|0;if((e|0)>=20){d=d&255;e=b&3;g=d|d<<8|d<<16|d<<24;h=f&~3;if(e){e=b+4-e|0;while((b|0)<(e|0)){a[b]=d;b=b+1|0}}while((b|0)<(h|0)){c[b>>2]=g;b=b+4|0}}while((b|0)<(f|0)){a[b]=d;b=b+1|0}}function bq(b){b=b|0;var c=0;c=b;while(a[c]|0){c=c+1|0}return c-b|0}function br(a,b){a=a|0;b=b|0;aK[a&7](b|0)}function bs(a,b){a=a|0;b=b|0;return aL[a&3](b|0)|0}function bt(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;aM[a&3](b|0,c|0,d|0)}function bu(a){a=a|0;aN[a&1]()}function bv(a,b,c){a=a|0;b=b|0;c=c|0;return aO[a&1](b|0,c|0)|0}function bw(a){a=a|0;aa(0)}function bx(a){a=a|0;aa(1);return 0}function by(a,b,c){a=a|0;b=b|0;c=c|0;aa(2)}function bz(){aa(3)}function bA(a,b){a=a|0;b=b|0;aa(4);return 0}
// EMSCRIPTEN_END_FUNCS
var aK=[bw,bw,bl,bw,bm,bw,bw,bw];var aL=[bx,bx,bn,bx];var aM=[by,by,a7,by];var aN=[bz,bz];var aO=[bA,bA];return{_strlen:bq,_free:bh,_init:a6,_memset:bp,_malloc:bg,_memcpy:bo,_drawFrame:a4,runPostSets:a3,stackAlloc:aP,stackSave:aQ,stackRestore:aR,setThrew:aS,setTempRet0:aV,setTempRet1:aW,setTempRet2:aX,setTempRet3:aY,setTempRet4:aZ,setTempRet5:a_,setTempRet6:a$,setTempRet7:a0,setTempRet8:a1,setTempRet9:a2,dynCall_vi:br,dynCall_ii:bs,dynCall_viii:bt,dynCall_v:bu,dynCall_iii:bv}})
// EMSCRIPTEN_END_ASM
({ "Math": Math, "Int8Array": Int8Array, "Int16Array": Int16Array, "Int32Array": Int32Array, "Uint8Array": Uint8Array, "Uint16Array": Uint16Array, "Uint32Array": Uint32Array, "Float32Array": Float32Array, "Float64Array": Float64Array }, { "abort": abort, "assert": assert, "asmPrintInt": asmPrintInt, "asmPrintFloat": asmPrintFloat, "min": Math_min, "invoke_vi": invoke_vi, "invoke_ii": invoke_ii, "invoke_viii": invoke_viii, "invoke_v": invoke_v, "invoke_iii": invoke_iii, "_llvm_lifetime_end": _llvm_lifetime_end, "_sysconf": _sysconf, "___cxa_throw": ___cxa_throw, "_abort": _abort, "_fflush": _fflush, "_canvas_begin_time": _canvas_begin_time, "___assert_fail": ___assert_fail, "___setErrNo": ___setErrNo, "_llvm_eh_exception": _llvm_eh_exception, "_llvm_umul_with_overflow_i32": _llvm_umul_with_overflow_i32, "___cxa_find_matching_catch": ___cxa_find_matching_catch, "___cxa_allocate_exception": ___cxa_allocate_exception, "___resumeException": ___resumeException, "___cxa_is_number_type": ___cxa_is_number_type, "___cxa_does_inherit": ___cxa_does_inherit, "_canvas_end_time": _canvas_end_time, "_webgl_put_image": _webgl_put_image, "__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv, "___cxa_call_unexpected": ___cxa_call_unexpected, "_sbrk": _sbrk, "___errno_location": ___errno_location, "___gxx_personality_v0": ___gxx_personality_v0, "_webgl_init": _webgl_init, "_emscripten_set_canvas_size": _emscripten_set_canvas_size, "_llvm_lifetime_start": _llvm_lifetime_start, "_time": _time, "STACKTOP": STACKTOP, "STACK_MAX": STACK_MAX, "tempDoublePtr": tempDoublePtr, "ABORT": ABORT, "NaN": NaN, "Infinity": Infinity, "__ZTVN10__cxxabiv120__si_class_type_infoE": __ZTVN10__cxxabiv120__si_class_type_infoE, "__ZTVN10__cxxabiv117__class_type_infoE": __ZTVN10__cxxabiv117__class_type_infoE }, buffer);
var _strlen = Module["_strlen"] = asm["_strlen"];
var _free = Module["_free"] = asm["_free"];
var _init = Module["_init"] = asm["_init"];
var _memset = Module["_memset"] = asm["_memset"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _drawFrame = Module["_drawFrame"] = asm["_drawFrame"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_viii = Module["dynCall_viii"] = asm["dynCall_viii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
Runtime.stackAlloc = function(size) { return asm['stackAlloc'](size) };
Runtime.stackSave = function() { return asm['stackSave']() };
Runtime.stackRestore = function(top) { asm['stackRestore'](top) };
// Warning: printing of i64 values may be slightly rounded! No deep i64 math used, so precise i64 code not included
var i64Math = null;
// === Auto-generated postamble setup entry stuff ===
if (memoryInitializer) {
  function applyData(data) {
    HEAPU8.set(data, STATIC_BASE);
  }
  if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
    applyData(Module['readBinary'](memoryInitializer));
  } else {
    addRunDependency('memory initializer');
    Browser.asyncLoad(memoryInitializer, function(data) {
      applyData(data);
      removeRunDependency('memory initializer');
    }, function(data) {
      throw 'could not load memory initializer ' + memoryInitializer;
    });
  }
}
function ExitStatus(status) {
  this.name = "ExitStatus";
  this.message = "Program terminated with exit(" + status + ")";
  this.status = status;
};
ExitStatus.prototype = new Error();
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
  // If run has never been called, and we should call run (INVOKE_RUN is true, and Module.noInitialRun is not false)
  if (!Module['calledRun'] && shouldRunNow) run();
  if (!Module['calledRun']) dependenciesFulfilled = runCaller; // try this again later, after new deps are fulfilled
}
Module['callMain'] = Module.callMain = function callMain(args) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on __ATMAIN__)');
  assert(__ATPRERUN__.length == 0, 'cannot call main when preRun functions remain to be called');
  args = args || [];
  if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
    Module.printErr('preload time: ' + (Date.now() - preloadStartTime) + ' ms');
  }
  ensureInitRuntime();
  var argc = args.length+1;
  function pad() {
    for (var i = 0; i < 4-1; i++) {
      argv.push(0);
    }
  }
  var argv = [allocate(intArrayFromString("/bin/this.program"), 'i8', ALLOC_NORMAL) ];
  pad();
  for (var i = 0; i < argc-1; i = i + 1) {
    argv.push(allocate(intArrayFromString(args[i]), 'i8', ALLOC_NORMAL));
    pad();
  }
  argv.push(0);
  argv = allocate(argv, 'i32', ALLOC_NORMAL);
  initialStackTop = STACKTOP;
  try {
    var ret = Module['_main'](argc, argv, 0);
    // if we're not running an evented main loop, it's time to exit
    if (!Module['noExitRuntime']) {
      exit(ret);
    }
  }
  catch(e) {
    if (e instanceof ExitStatus) {
      // exit() throws this once it's done to make sure execution
      // has been stopped completely
      return;
    } else if (e == 'SimulateInfiniteLoop') {
      // running an evented main loop, don't immediately exit
      Module['noExitRuntime'] = true;
      return;
    } else {
      if (e && typeof e === 'object' && e.stack) Module.printErr('exception thrown: ' + [e, e.stack]);
      throw e;
    }
  } finally {
    calledMain = true;
  }
}
function run(args) {
  args = args || Module['arguments'];
  if (preloadStartTime === null) preloadStartTime = Date.now();
  if (runDependencies > 0) {
    Module.printErr('run() called, but dependencies remain, so not running');
    return;
  }
  preRun();
  if (runDependencies > 0) {
    // a preRun added a dependency, run will be called later
    return;
  }
  function doRun() {
    ensureInitRuntime();
    preMain();
    Module['calledRun'] = true;
    if (Module['_main'] && shouldRunNow) {
      Module['callMain'](args);
    }
    postRun();
  }
  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(function() {
      setTimeout(function() {
        Module['setStatus']('');
      }, 1);
      if (!ABORT) doRun();
    }, 1);
  } else {
    doRun();
  }
}
Module['run'] = Module.run = run;
function exit(status) {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;
  // exit the runtime
  exitRuntime();
  // TODO We should handle this differently based on environment.
  // In the browser, the best we can do is throw an exception
  // to halt execution, but in node we could process.exit and
  // I'd imagine SM shell would have something equivalent.
  // This would let us set a proper exit status (which
  // would be great for checking test exit statuses).
  // https://github.com/kripken/emscripten/issues/1371
  // throw an exception to halt the current execution
  throw new ExitStatus(status);
}
Module['exit'] = Module.exit = exit;
function abort(text) {
  if (text) {
    Module.print(text);
    Module.printErr(text);
  }
  ABORT = true;
  EXITSTATUS = 1;
  throw 'abort() at ' + stackTrace();
}
Module['abort'] = Module.abort = abort;
// {{PRE_RUN_ADDITIONS}}
if (Module['preInit']) {
  if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
  while (Module['preInit'].length > 0) {
    Module['preInit'].pop()();
  }
}
// shouldRunNow refers to calling main(), not run().
var shouldRunNow = true;
if (Module['noInitialRun']) {
  shouldRunNow = false;
}
run();
// {{POST_RUN_ADDITIONS}}
// {{MODULE_ADDITIONS}}
