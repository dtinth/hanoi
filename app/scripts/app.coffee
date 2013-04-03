

do ->

  CODE = """
    pushl $2  # Push the number of right pole (2).
    pushl $1  # Push the number of middle pole (1).
    pushl $0  # Push the number of left pole (0).
    pushl $3  # Push the number of discs (3).
    call  _hanoi  # Call hanoi(3, 0, 1, 2).
    jmp bye           # End of program.

  _hanoi:
    pushl  %ebp            # Save old %ebp.
    movl   %esp, %ebp      # Start a new stack frame. $args:N,src,mid,dest
    movl   8(%ebp), %ecx   # %ecx = N
    cmpl   $0, %ecx        # Compare 0 with %ecx ([%ecx]).
    je     exit_hanoi      # If %ecx ([%ecx]) == 0, then there are no discs to move: jump to exit_hanoi.
    movl   16(%ebp), %ecx  # Here, there are some more discs to move, so we move N-1 of them to temporary space first. Let %ecx = mid.
    pushl  %ecx            # Push the value of mid ([%ecx]).
    movl   20(%ebp), %ecx  # %ecx = dest.
    pushl  %ecx            # Push the value of dest ([%ecx]).
    movl   12(%ebp), %ecx  # %ecx = src.
    pushl  %ecx            # Push the value of src ([%ecx]).
    movl   8(%ebp), %ecx   # %ecx = N.
    subl   $1, %ecx        # %ecx = N - 1.
    pushl  %ecx            # Push the value of N - 1 ([%ecx]).
    call  _hanoi           # Call hanoi([(%esp)], [4(%esp)], [8(%esp)], [12(%esp)]).
    addl   $16, %esp       # Pop 4 elements (= 16 bytes) off the stack. Now we the move the bottommost disc to destination.
    
    movl   20(%ebp), %ecx  # %ecx = dest.
    pushl  %ecx            # Push the value of dest ([%ecx]).
    movl   12(%ebp), %ecx  # %ecx = src.
    pushl  %ecx            # Push the value of src ([%ecx]).
    movl   8(%ebp), %ecx   # %ecx = N.
    pushl  %ecx            # Push the value of N ([%ecx]).
    call  _move            # Call move([(%esp)], [4(%esp)], [8(%esp)]).
    addl   $12, %esp       # Pop 3 elements (= 12 bytes) off the stack. Now we move the discs at the temporary space to the destination.
    
    movl   20(%ebp), %ecx  # %ecx = dest.
    pushl  %ecx            # Push the value of dest ([%ecx]).
    movl   12(%ebp), %ecx  # %ecx = src.
    pushl  %ecx            # Push the value of src ([%ecx]).
    movl   16(%ebp), %ecx  # %ecx = mid.
    pushl  %ecx            # Push the value of mid ([%ecx]).
    movl   8(%ebp), %ecx   # %ecx = N.
    subl   $1, %ecx        # %ecx = N - 1.
    pushl  %ecx            # Push the value of N - 1 ([%ecx]).
    call  _hanoi           # Call hanoi([(%esp)], [4(%esp)], [8(%esp)], [12(%esp)]).
    addl   $16, %esp       # Pop 4 elements (= 16 bytes) off the stack.

    popl   %ebp            # Now that we are done, restore the %ebp back to previous stack frame's.
    ret                    # Return from hanoi, jump to return address.
      
  exit_hanoi:
    popl   %ebp            # Here, N = 0, so we don't have to do anything special. Restore the %ebp back to previous stack frame's.
    ret                    # Return from hanoi, jump to return address.

  """

  cpu = new Cpu(CODE)

  cpu.initialState.disc1 = 0
  cpu.initialState.disc2 = 0
  cpu.initialState.disc3 = 0
  cpu.initialState.output = []

  cpu.ff._move = (arg) ->
    n = arg(0)
    src = arg(1)
    dest = arg(2)
    @state["disc#{n}"] = dest
    @state.output = @state.output.slice()
    desc = ["left", "middle", "right"]
    @state.output.push('Move disc ' + n + ' from ' + desc[src] + ' to ' + desc[dest])
    @move(null, '%eax')
    @move(null, '%ecx')
    @move(null, '%edx')

  trace = cpu.run()

  main = $('#main')
  draw = (x, y, w, h, className, text) ->
    element = document.createElement('div')
    element.className = 'element ' + className
    element.innerHTML = text
    element.setAttribute('style',
      "left:#{x}px;top:#{y}px;width:#{w}px;height:#{h}px;line-height:#{h}px")
    main[0].appendChild(element)

  do ->
    for code, i in cpu.code
      code.y = 12 + i * 12
      code.instruction.y = code.y if code.instruction

  base = 0x7fff1238

  stackY = (i) ->
    12 + 21 * i
  staceIndex = (mem) -> (base - mem) / 4

  poleX = (id) -> 640 + id * 120
  render = (state) ->
    main.html('')

    # read/write helper
    rw = (id) ->
      if state.movs[id]? and (state.movs[id] == 'read' || id != 'esp')
        " #{state.movs[id]}"
      else
        ''

    # show all instructions
    for c, i in cpu.code
      active = if state.last? && c.instruction == state.last then ' active' else ''
      if c.instruction
        draw(52, c.y, 56, 12, 'address', c.instruction.address)
      text = c.line
      if c.instruction?
        instruction = c.instruction
        text = "<span class='instruction-name'>#{instruction.name}</span> " +
          "#{instruction.args.map((x) ->
            if x.match(/^\$/)
              "<span class=syn-immediate>#{x}</span>"
            else
              x.replace(/\%\w+/g, (a) -> "<span class=syn-register>#{a}</span>")).join(', ')}"
      draw(52 + 64, c.y, 160, 12, 'instruction' + active, text)

    # show eip
    if state.instruction
      draw(12, state.instruction.y, 50, 12, 'eip', '%eip &#x2192;')

    # show memory
    memX = 320
    address = base
    count = 0
    while count < 30
      text = if state[address]?
               if typeof state[address] == 'number'
                 '0x' + state[address].toString(16)
               else
                 state[address]
             else
               if count == 0
                 '...'
               else
                 ''
      className = if address < state.esp
                    ' out-of-stack'
                  else if address <= state.ebp
                    ' active'
                  else
                    ''
      y = stackY(count)
      draw(memX, y, 56, 20, 'address', '0x' + address.toString(16))
      draw(memX + 64, y, 96, 20, 'stack' + className + rw(address), text)
      if state["info-#{state.ebp}-#{address}"]?
        draw(memX + 64 + 100, y, 56, 20, 'address address-left', '&#x2190; ' + state["info-#{state.ebp}-#{address}"])
      address -= 4
      count += 1

    # show esp, ebp
    draw(memX + 64 + 100, stackY(staceIndex(state.esp)), 56, 20, 'address address-left', '&#x2190; %esp')
    draw(memX + 64 + 100 + (if state.esp == state.ebp then 52 else 0), stackY(staceIndex(state.ebp)), 56, 20, 'address address-left', '&#x2190; %ebp')

    # show registers
    xs = [0, 0, 0, 1, 1, 1, 0, 1]
    ys = [0, 1, 2, 0, 1, 2, 3, 3]
    for reg, i in ['eax', 'ecx', 'edx', 'ebx', 'edi', 'esi', 'ebp', 'esp']
      text = if typeof state[reg] == 'number'
               "0x#{state[reg].toString(16)}"
             else if state[reg]?
               state[reg]
             else
               "???"
      x = 580 + 180 * xs[i]
      y = 12 + 40 * ys[i]
      draw(x, y, 40, 32, 'register address', "%#{reg}")
      draw(x + 52, y, 112, 32, 'register-value' + rw(reg), text)
  
    draw(0, 660, 960, 20, 'comment', state.comment)

    # draw poles
    poleY = 220
    draw(poleX(0)-50, poleY+98, poleX(2)-poleX(0)+100, 6, 'pole', '')
    for i in [0...3]
      x = poleX(i)
      draw(x - 3, poleY, 6, 98, 'pole', '')
      y = poleY + 96
      for j in [1..3]
        if state['disc' + j] == i
          y -= 20
      for j in [1..3]
        w = 50 + j * 14
        if state['disc' + j] == i
          y += 20
          draw(x - w / 2, y - 18, w, 18, 'disc disc' + j, j)

    # draw output
    for c, i in state.output
      draw(poleX(0) - 30, poleY + 128 + i * 20, 300, 18, 'output', c)

    draw(808, 620, 140, 36, 'running-cycle', "#{state.cycle} / #{trace.length - 1}")

  do ->
    i = 0
    move = (delta) ->
      target = i + delta
      target = 0 if target < 0
      target = trace.length - 1 if target >= trace.length
      render(trace[target]) if target != i
      i = target
    render(trace[0])
      
    $(document).on('keydown', (e) ->
      if e.keyCode == 37
        move(-1)
      else if e.keyCode == 39
        move(1))


