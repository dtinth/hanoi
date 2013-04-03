
window.Cpu = do ->

  # parse an assembly code...
  parseCode = (code) ->
    out = []
    for line in code.split('\n')
      comment = null
      line = line.replace(/\s*#\s*(.*?)\s*$/, (all, text) ->
        comment = text
        return "")
      line = line.replace(/^\s*|\s*$/g, '')
      o = {}
      o.line = line
      o.comment = comment if comment?
      if (m = line.match /^\s*(\w+)(?:\s+(.+?))?\s*$/)
        instructionName = m[1]
        if m[2] == '' || !m[2]?
          instructionArgs = []
        else
          instructionArgs = m[2].split(/\s*,\s*/)
        o.instruction = { name: instructionName, args: instructionArgs }
      else if (m = line.match /^\s*(\S+):\s*$/)
        o.label = { name: m[1] }
      out.push o
    return out

  # try to guess the instruction size...
  getInstructionSize = (instruction) ->
    register = /^%/
    return 5 if instruction.name == 'call'
    return 1 if instruction.name == 'pushl' && instruction.args[0].match(register)
    return 1 if instruction.name == 'popl' && instruction.args[0].match(register)
    return 1 if instruction.name == 'ret'
    return 2 if instruction.name == 'movl' && instruction.args[0].match(register) && instruction.args[1].match(register)
    return 4 if instruction.name == 'movl' && instruction.args[1].match(/\w+\(%esp/)
    return 6 if instruction.name.match(/^j/)
    return 3

  # this is the state of cpu
  class State
    constructor: ->
    clone: ->
      another = new State()
      for i of this
        if this.hasOwnProperty(i)
          another[i] = this[i]
      return another

  # this be the cpu
  class Cpu

    constructor: (code) ->
      @code = parseCode(code)
      @startAddress = 0x1e60 - 18
      @prepareCode()
      @initialState = new State()

      baseAddress = 0x7fff1234
      @initialState.cycle = 0
      @initialState.ebp = baseAddress
      @initialState.esp = baseAddress - 4
      @initialState[baseAddress] = '0x1000'
      @initialState[baseAddress - 4] = '0x0000'
      @initialState.movs = {}
      @ff = {}

    prepareCode: ->
      @instructions = []
      @map = {}
      address = @startAddress
      lastInstruction = null
      for line in @code
        if line.instruction
          instruction = line.instruction
          instruction.comment = line.comment
          instruction.address = '0x' + address.toString(16)
          lastInstruction.next = instruction.address if lastInstruction?
          @map[instruction.address] = instruction
          address += getInstructionSize(instruction)
          lastInstruction = instruction
        if line.label
          label = line.label
          label.address = '0x' + address.toString(16)
      for line in @code
        if line.label
          label = line.label
          @map[label.name] = @map[label.address]

    run: ->
      @state = @initialState.clone()
      @state.instruction = @map['0x' + @startAddress.toString(16)]
      x = 0
      out = [@state]
      while @state.instruction
        break if x++ > 1000
        lastState = @state
        @state = @state.clone()
        @state.movs = {}
        @state.cycle = x
        @state.readLevel = null
        instruction = @state.instruction
        @state.last = instruction
        @state.comment = instruction.comment.replace(/\[([^\]]+)\]/g, (all, place) => @get(place))
        @state.readLevel = 0
        throw "Unknown instruction #{instruction.name}" unless this[instruction.name]
        this[instruction.name](instruction.args...)
        if @state.jump
          @state.instruction = @map[@state.jump]
          delete @state.jump
        else
          @state.instruction = @map[instruction.next]
        @state.comment = @state.comment
          .replace(/\$args:(\S+)/, (all, list) =>
            console.log key
            for c, i in list.split(',')
              key = "info-#{@state.ebp}-#{@state.ebp+8+4*i}"
              @state[key] = c
            return "")
        out.push @state
      return out

    # get data from a place
    get: (place) ->
      place = '' + place
      if place.match(/^\$/)
        return parseInt(place.substr(1))
      @state.readLevel += 1 if @state.readLevel?
      address = @ea(place)
      @state.readLevel -= 1 if @state.readLevel?
      (@state.movs[address] = 'read' unless @state.movs[address]?) if @state.readLevel == 0
      return @state[address]
    
    # find the effective address of a place
    ea: (place) ->
      if place.charAt(0) == '%'
        return place.substr(1)
      if (m = place.match(/(\w+)?\((.+)\)/))
        displacement = parseInt(m[1]) || 0
        args = m[2].split(',')
        base = @get(args[0]) || 0
        index = @get(args[1]) || 0
        scale = @get(args[2]) || 1
        return displacement + base + index * scale
      return place

    move: (value, to) ->
      address = @ea(to)
      @state[address] = value
      @state.movs[address] = 'write'
    calc: (from, to, func) ->
      address = @ea(to)
      @state[address] = func.call(this, @state[address], @get(from)) | 0
      @state.movs[address] = 'write'

    movl: (from, to) -> @move(@get(from), to)
    leal: (from, to) -> @move(@ea(from), to)
    subl: (from, to) -> @calc from, to, (a, b) -> a - b
    addl: (from, to) -> @calc from, to, (a, b) -> a + b
    imull: (from, to) -> @calc from, to, (a, b) -> a * b

    pushl: (from) ->
      @subl('$4', '%esp')
      @movl(from, '(%esp)')

    popl: (to) ->
      @movl('(%esp)', to)
      @addl('$4', '%esp')

    call: (label) ->
      @subl('$4', '%esp')
      @move(@state.instruction.next, '(%esp)')
      if @map[label] # found label in code
        @state.jump = label
      else # not found: foreign function
        esp = @state.esp
        @ff[label].call(this, (i) => @state[esp + 4 + 4 * i])
        @ret()

    ret: -> @popl('%jump')

    cmpl: (b, a) -> @move(@get(a) - @get(b), '%compare')
    jmp: (label) -> @move(label, '%jump')
    je: (label) -> @jmp(label) if @get('%compare') == 0

  









