(function() {

  window.Cpu = (function() {
    var Cpu, State, getInstructionSize, parseCode;
    parseCode = function(code) {
      var comment, instructionArgs, instructionName, line, m, o, out, _i, _len, _ref;
      out = [];
      _ref = code.split('\n');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        comment = null;
        line = line.replace(/\s*#\s*(.*?)\s*$/, function(all, text) {
          comment = text;
          return "";
        });
        line = line.replace(/^\s*|\s*$/g, '');
        o = {};
        o.line = line;
        if (comment != null) {
          o.comment = comment;
        }
        if ((m = line.match(/^\s*(\w+)(?:\s+(.+?))?\s*$/))) {
          instructionName = m[1];
          if (m[2] === '' || !(m[2] != null)) {
            instructionArgs = [];
          } else {
            instructionArgs = m[2].split(/\s*,\s*/);
          }
          o.instruction = {
            name: instructionName,
            args: instructionArgs
          };
        } else if ((m = line.match(/^\s*(\S+):\s*$/))) {
          o.label = {
            name: m[1]
          };
        }
        out.push(o);
      }
      return out;
    };
    getInstructionSize = function(instruction) {
      var register;
      register = /^%/;
      if (instruction.name === 'call') {
        return 5;
      }
      if (instruction.name === 'pushl' && instruction.args[0].match(register)) {
        return 1;
      }
      if (instruction.name === 'popl' && instruction.args[0].match(register)) {
        return 1;
      }
      if (instruction.name === 'ret') {
        return 1;
      }
      if (instruction.name === 'movl' && instruction.args[0].match(register) && instruction.args[1].match(register)) {
        return 2;
      }
      if (instruction.name === 'movl' && instruction.args[1].match(/\w+\(%esp/)) {
        return 4;
      }
      if (instruction.name.match(/^j/)) {
        return 6;
      }
      return 3;
    };
    State = (function() {

      function State() {}

      State.prototype.clone = function() {
        var another, i;
        another = new State();
        for (i in this) {
          if (this.hasOwnProperty(i)) {
            another[i] = this[i];
          }
        }
        return another;
      };

      return State;

    })();
    return Cpu = (function() {

      function Cpu(code) {
        var baseAddress;
        this.code = parseCode(code);
        this.startAddress = 0x1e60 - 18;
        this.prepareCode();
        this.initialState = new State();
        baseAddress = 0x7fff1234;
        this.initialState.cycle = 0;
        this.initialState.ebp = baseAddress;
        this.initialState.esp = baseAddress - 4;
        this.initialState[baseAddress] = '0x1000';
        this.initialState[baseAddress - 4] = '0x0000';
        this.initialState.movs = {};
        this.ff = {};
      }

      Cpu.prototype.prepareCode = function() {
        var address, instruction, label, lastInstruction, line, _i, _j, _len, _len1, _ref, _ref1, _results;
        this.instructions = [];
        this.map = {};
        address = this.startAddress;
        lastInstruction = null;
        _ref = this.code;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          line = _ref[_i];
          if (line.instruction) {
            instruction = line.instruction;
            instruction.comment = line.comment;
            instruction.address = '0x' + address.toString(16);
            if (lastInstruction != null) {
              lastInstruction.next = instruction.address;
            }
            this.map[instruction.address] = instruction;
            address += getInstructionSize(instruction);
            lastInstruction = instruction;
          }
          if (line.label) {
            label = line.label;
            label.address = '0x' + address.toString(16);
          }
        }
        _ref1 = this.code;
        _results = [];
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          line = _ref1[_j];
          if (line.label) {
            label = line.label;
            _results.push(this.map[label.name] = this.map[label.address]);
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };

      Cpu.prototype.run = function() {
        var instruction, lastState, out, x,
          _this = this;
        this.state = this.initialState.clone();
        this.state.instruction = this.map['0x' + this.startAddress.toString(16)];
        x = 0;
        out = [this.state];
        while (this.state.instruction) {
          if (x++ > 1000) {
            break;
          }
          lastState = this.state;
          this.state = this.state.clone();
          this.state.movs = {};
          this.state.cycle = x;
          this.state.readLevel = null;
          instruction = this.state.instruction;
          this.state.last = instruction;
          this.state.comment = instruction.comment.replace(/\[([^\]]+)\]/g, function(all, place) {
            return _this.get(place);
          });
          this.state.readLevel = 0;
          if (!this[instruction.name]) {
            throw "Unknown instruction " + instruction.name;
          }
          this[instruction.name].apply(this, instruction.args);
          if (this.state.jump) {
            this.state.instruction = this.map[this.state.jump];
            delete this.state.jump;
          } else {
            this.state.instruction = this.map[instruction.next];
          }
          this.state.comment = this.state.comment.replace(/\$args:(\S+)/, function(all, list) {
            var c, i, key, _i, _len, _ref;
            console.log(key);
            _ref = list.split(',');
            for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
              c = _ref[i];
              key = "info-" + _this.state.ebp + "-" + (_this.state.ebp + 8 + 4 * i);
              _this.state[key] = c;
            }
            return "";
          });
          out.push(this.state);
        }
        return out;
      };

      Cpu.prototype.get = function(place) {
        var address;
        place = '' + place;
        if (place.match(/^\$/)) {
          return parseInt(place.substr(1));
        }
        if (this.state.readLevel != null) {
          this.state.readLevel += 1;
        }
        address = this.ea(place);
        if (this.state.readLevel != null) {
          this.state.readLevel -= 1;
        }
        if (this.state.readLevel === 0) {
          if (this.state.movs[address] == null) {
            this.state.movs[address] = 'read';
          }
        }
        return this.state[address];
      };

      Cpu.prototype.ea = function(place) {
        var args, base, displacement, index, m, scale;
        if (place.charAt(0) === '%') {
          return place.substr(1);
        }
        if ((m = place.match(/(\w+)?\((.+)\)/))) {
          displacement = parseInt(m[1]) || 0;
          args = m[2].split(',');
          base = this.get(args[0]) || 0;
          index = this.get(args[1]) || 0;
          scale = this.get(args[2]) || 1;
          return displacement + base + index * scale;
        }
        return place;
      };

      Cpu.prototype.move = function(value, to) {
        var address;
        address = this.ea(to);
        this.state[address] = value;
        return this.state.movs[address] = 'write';
      };

      Cpu.prototype.calc = function(from, to, func) {
        var address;
        address = this.ea(to);
        this.state[address] = func.call(this, this.state[address], this.get(from)) | 0;
        return this.state.movs[address] = 'write';
      };

      Cpu.prototype.movl = function(from, to) {
        return this.move(this.get(from), to);
      };

      Cpu.prototype.leal = function(from, to) {
        return this.move(this.ea(from), to);
      };

      Cpu.prototype.subl = function(from, to) {
        return this.calc(from, to, function(a, b) {
          return a - b;
        });
      };

      Cpu.prototype.addl = function(from, to) {
        return this.calc(from, to, function(a, b) {
          return a + b;
        });
      };

      Cpu.prototype.imull = function(from, to) {
        return this.calc(from, to, function(a, b) {
          return a * b;
        });
      };

      Cpu.prototype.pushl = function(from) {
        this.subl('$4', '%esp');
        return this.movl(from, '(%esp)');
      };

      Cpu.prototype.popl = function(to) {
        this.movl('(%esp)', to);
        return this.addl('$4', '%esp');
      };

      Cpu.prototype.call = function(label) {
        var esp,
          _this = this;
        this.subl('$4', '%esp');
        this.move(this.state.instruction.next, '(%esp)');
        if (this.map[label]) {
          return this.state.jump = label;
        } else {
          esp = this.state.esp;
          this.ff[label].call(this, function(i) {
            return _this.state[esp + 4 + 4 * i];
          });
          return this.ret();
        }
      };

      Cpu.prototype.ret = function() {
        return this.popl('%jump');
      };

      Cpu.prototype.cmpl = function(b, a) {
        return this.move(this.get(a) - this.get(b), '%compare');
      };

      Cpu.prototype.jmp = function(label) {
        return this.move(label, '%jump');
      };

      Cpu.prototype.je = function(label) {
        if (this.get('%compare') === 0) {
          return this.jmp(label);
        }
      };

      return Cpu;

    })();
  })();

}).call(this);
