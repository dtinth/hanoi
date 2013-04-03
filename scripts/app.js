(function() {

  (function() {
    var CODE, base, cpu, draw, main, poleX, render, staceIndex, stackY, trace;
    CODE = "  pushl $2  # Push the number of right pole (2).\n  pushl $1  # Push the number of middle pole (1).\n  pushl $0  # Push the number of left pole (0).\n  pushl $3  # Push the number of discs (3).\n  call  _hanoi  # Call hanoi(3, 0, 1, 2).\n  jmp bye           # End of program.\n\n_hanoi:\n  pushl  %ebp            # Save old %ebp.\n  movl   %esp, %ebp      # Start a new stack frame. $args:N,src,mid,dest\n  movl   8(%ebp), %ecx   # %ecx = N\n  cmpl   $0, %ecx        # Compare 0 with %ecx ([%ecx]).\n  je     exit_hanoi      # If %ecx ([%ecx]) == 0, then there are no discs to move: jump to exit_hanoi.\n  movl   16(%ebp), %ecx  # Here, there are some more discs to move, so we move N-1 of them to temporary space first. Let %ecx = mid.\n  pushl  %ecx            # Push the value of mid ([%ecx]).\n  movl   20(%ebp), %ecx  # %ecx = dest.\n  pushl  %ecx            # Push the value of dest ([%ecx]).\n  movl   12(%ebp), %ecx  # %ecx = src.\n  pushl  %ecx            # Push the value of src ([%ecx]).\n  movl   8(%ebp), %ecx   # %ecx = N.\n  subl   $1, %ecx        # %ecx = N - 1.\n  pushl  %ecx            # Push the value of N - 1 ([%ecx]).\n  call  _hanoi           # Call hanoi([(%esp)], [4(%esp)], [8(%esp)], [12(%esp)]).\n  addl   $16, %esp       # Pop 4 elements (= 16 bytes) off the stack. Now we the move the bottommost disc to destination.\n  \n  movl   20(%ebp), %ecx  # %ecx = dest.\n  pushl  %ecx            # Push the value of dest ([%ecx]).\n  movl   12(%ebp), %ecx  # %ecx = src.\n  pushl  %ecx            # Push the value of src ([%ecx]).\n  movl   8(%ebp), %ecx   # %ecx = N.\n  pushl  %ecx            # Push the value of N ([%ecx]).\n  call  _move            # Call move([(%esp)], [4(%esp)], [8(%esp)]).\n  addl   $12, %esp       # Pop 3 elements (= 12 bytes) off the stack. Now we move the discs at the temporary space to the destination.\n  \n  movl   20(%ebp), %ecx  # %ecx = dest.\n  pushl  %ecx            # Push the value of dest ([%ecx]).\n  movl   12(%ebp), %ecx  # %ecx = src.\n  pushl  %ecx            # Push the value of src ([%ecx]).\n  movl   16(%ebp), %ecx  # %ecx = mid.\n  pushl  %ecx            # Push the value of mid ([%ecx]).\n  movl   8(%ebp), %ecx   # %ecx = N.\n  subl   $1, %ecx        # %ecx = N - 1.\n  pushl  %ecx            # Push the value of N - 1 ([%ecx]).\n  call  _hanoi           # Call hanoi([(%esp)], [4(%esp)], [8(%esp)], [12(%esp)]).\n  addl   $16, %esp       # Pop 4 elements (= 16 bytes) off the stack.\n\n  popl   %ebp            # Now that we are done, restore the %ebp back to previous stack frame's.\n  ret                    # Return from hanoi, jump to return address.\n    \nexit_hanoi:\n  popl   %ebp            # Here, N = 0, so we don't have to do anything special. Restore the %ebp back to previous stack frame's.\n  ret                    # Return from hanoi, jump to return address.\n";
    cpu = new Cpu(CODE);
    cpu.initialState.disc1 = 0;
    cpu.initialState.disc2 = 0;
    cpu.initialState.disc3 = 0;
    cpu.initialState.output = [];
    cpu.ff._move = function(arg) {
      var desc, dest, n, src;
      n = arg(0);
      src = arg(1);
      dest = arg(2);
      this.state["disc" + n] = dest;
      this.state.output = this.state.output.slice();
      desc = ["left", "middle", "right"];
      this.state.output.push('Move disc ' + n + ' from ' + desc[src] + ' to ' + desc[dest]);
      this.move(null, '%eax');
      this.move(null, '%ecx');
      return this.move(null, '%edx');
    };
    trace = cpu.run();
    main = $('#main');
    draw = function(x, y, w, h, className, text) {
      var element;
      element = document.createElement('div');
      element.className = 'element ' + className;
      element.innerHTML = text;
      element.setAttribute('style', "left:" + x + "px;top:" + y + "px;width:" + w + "px;height:" + h + "px;line-height:" + h + "px");
      return main[0].appendChild(element);
    };
    (function() {
      var code, i, _i, _len, _ref, _results;
      _ref = cpu.code;
      _results = [];
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        code = _ref[i];
        code.y = 12 + i * 12;
        if (code.instruction) {
          _results.push(code.instruction.y = code.y);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    })();
    base = 0x7fff1238;
    stackY = function(i) {
      return 12 + 21 * i;
    };
    staceIndex = function(mem) {
      return (base - mem) / 4;
    };
    poleX = function(id) {
      return 640 + id * 120;
    };
    render = function(state) {
      var active, address, c, className, count, i, instruction, j, memX, poleY, reg, rw, text, w, x, xs, y, ys, _i, _j, _k, _l, _len, _len1, _len2, _m, _n, _ref, _ref1, _ref2;
      main.html('');
      rw = function(id) {
        if ((state.movs[id] != null) && (state.movs[id] === 'read' || id !== 'esp')) {
          return " " + state.movs[id];
        } else {
          return '';
        }
      };
      _ref = cpu.code;
      for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        c = _ref[i];
        active = (state.last != null) && c.instruction === state.last ? ' active' : '';
        if (c.instruction) {
          draw(52, c.y, 56, 12, 'address', c.instruction.address);
        }
        text = c.line;
        if (c.instruction != null) {
          instruction = c.instruction;
          text = ("<span class='instruction-name'>" + instruction.name + "</span> ") + ("" + (instruction.args.map(function(x) {
            if (x.match(/^\$/)) {
              return "<span class=syn-immediate>" + x + "</span>";
            } else {
              return x.replace(/\%\w+/g, function(a) {
                return "<span class=syn-register>" + a + "</span>";
              });
            }
          }).join(', ')));
        }
        draw(52 + 64, c.y, 160, 12, 'instruction' + active, text);
      }
      if (state.instruction) {
        draw(12, state.instruction.y, 50, 12, 'eip', '%eip &#x2192;');
      }
      memX = 320;
      address = base;
      count = 0;
      while (count < 30) {
        text = state[address] != null ? typeof state[address] === 'number' ? '0x' + state[address].toString(16) : state[address] : count === 0 ? '...' : '';
        className = address < state.esp ? ' out-of-stack' : address <= state.ebp ? ' active' : '';
        y = stackY(count);
        draw(memX, y, 56, 20, 'address', '0x' + address.toString(16));
        draw(memX + 64, y, 96, 20, 'stack' + className + rw(address), text);
        if (state["info-" + state.ebp + "-" + address] != null) {
          draw(memX + 64 + 100, y, 56, 20, 'address address-left', '&#x2190; ' + state["info-" + state.ebp + "-" + address]);
        }
        address -= 4;
        count += 1;
      }
      draw(memX + 64 + 100, stackY(staceIndex(state.esp)), 56, 20, 'address address-left', '&#x2190; %esp');
      draw(memX + 64 + 100 + (state.esp === state.ebp ? 52 : 0), stackY(staceIndex(state.ebp)), 56, 20, 'address address-left', '&#x2190; %ebp');
      xs = [0, 0, 0, 1, 1, 1, 0, 1];
      ys = [0, 1, 2, 0, 1, 2, 3, 3];
      _ref1 = ['eax', 'ecx', 'edx', 'ebx', 'edi', 'esi', 'ebp', 'esp'];
      for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
        reg = _ref1[i];
        text = typeof state[reg] === 'number' ? "0x" + (state[reg].toString(16)) : state[reg] != null ? state[reg] : "???";
        x = 580 + 180 * xs[i];
        y = 12 + 40 * ys[i];
        draw(x, y, 40, 32, 'register address', "%" + reg);
        draw(x + 52, y, 112, 32, 'register-value' + rw(reg), text);
      }
      draw(0, 660, 960, 20, 'comment', state.comment);
      poleY = 220;
      draw(poleX(0) - 50, poleY + 98, poleX(2) - poleX(0) + 100, 6, 'pole', '');
      for (i = _k = 0; _k < 3; i = ++_k) {
        x = poleX(i);
        draw(x - 3, poleY, 6, 98, 'pole', '');
        y = poleY + 96;
        for (j = _l = 1; _l <= 3; j = ++_l) {
          if (state['disc' + j] === i) {
            y -= 20;
          }
        }
        for (j = _m = 1; _m <= 3; j = ++_m) {
          w = 50 + j * 14;
          if (state['disc' + j] === i) {
            y += 20;
            draw(x - w / 2, y - 18, w, 18, 'disc disc' + j, j);
          }
        }
      }
      _ref2 = state.output;
      for (i = _n = 0, _len2 = _ref2.length; _n < _len2; i = ++_n) {
        c = _ref2[i];
        draw(poleX(0) - 30, poleY + 128 + i * 20, 300, 18, 'output', c);
      }
      return draw(808, 620, 140, 36, 'running-cycle', "" + state.cycle + " / " + (trace.length - 1));
    };
    return (function() {
      var i, move;
      i = 0;
      move = function(delta) {
        var target;
        target = i + delta;
        if (target < 0) {
          target = 0;
        }
        if (target >= trace.length) {
          target = trace.length - 1;
        }
        if (target !== i) {
          render(trace[target]);
        }
        return i = target;
      };
      render(trace[0]);
      return $(document).on('keydown', function(e) {
        if (e.keyCode === 37) {
          return move(-1);
        } else if (e.keyCode === 39) {
          return move(1);
        }
      });
    })();
  })();

}).call(this);
