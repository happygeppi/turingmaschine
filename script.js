const $ = (id) => document.getElementById(id);
const $$ = (querySelector) => document.querySelector(querySelector);
const $$$ = (querySelectorAll) => document.querySelectorAll(querySelectorAll);

const html = {
  con: $("container"),
  tape: $("tape"),
  spots: [],
  addSpot: (dir) => {
    const spot = document.createElement("span");
    spot.classList.add("spot");
    if (dir == 1) {
      const next = BLANK;
      TAPE.push(next);
      html.tape.append(spot);
      spot.innerHTML = TAPE[TAPE.length - 1];
      html.spots.push(spot);
    } else {
      INDEX = 0;
      const next = BLANK;
      TAPE.unshift(next);
      html.tape.insertBefore(spot, document.querySelectorAll(".spot")[0]);
      spot.innerHTML = TAPE[0];
      html.spots.unshift(spot);
    }
    spot.scrollIntoView();
    spot.addEventListener("click", () => {
      ChangeActive(html.spots.indexOf(spot));
    });
    $("tape-length-input").value = TAPE.length;
  },
  rulesCon: $("rules"),
  rules: [],
  inputs: [],
  newRule: $("new-rule"),
};

let BLANK = "*";
let vocab = [BLANK];

let TAPE = [];
let LENGTH = 11;
let STATE = 0;
let INDEX = Math.floor(LENGTH / 2);

let HALT = true;
let RULES = [];

let autoInterval = 0;
let wait = 200;
let stepCounter = 0;

function Start() {
  InitHTML();
  Events();
}

function InitHTML() {
  InitTape();
  InitRulesHTML();
}

function InitTape() {
  TAPE = [];
  for (const spot of html.spots) spot.remove();
  html.spots = [];
  INDEX = Math.floor(LENGTH / 2);
  STATE = 0;
  $("tape-length-input").value = LENGTH;
  $("tape-speed-input").value = 1000 / wait;
  $("blank-input").value = BLANK;
  $("show-state-input").value = STATE;

  for (let i = 0; i < LENGTH; i++) TAPE[i] = BLANK;
  for (let i = 0; i < TAPE.length; i++) {
    const spot = document.createElement("span");
    spot.classList.add("spot");
    spot.innerHTML = TAPE[i];
    if (i == INDEX) spot.classList.add("active");
    html.tape.append(spot);
    html.spots.push(spot);
    spot.addEventListener("click", () => {
      ChangeActive(html.spots.indexOf(spot));
    });
  }
}

function InitRulesHTML() {
  const nRules = 1;
  for (let i = 0; i < nRules; i++) CreateRule();
  $("export-rules-input").value = "rules";
}

function CreateRule() {
  const ruleHTML = document.createElement("div");
  html.rulesCon.insertBefore(ruleHTML, $("rules-control"));
  html.rules.push(ruleHTML);
  ruleHTML.classList.add("rule");

  const text = [
    "State",
    "Read",
    "Write",
    "Move (L, S, R)",
    "Next State",
    "Delete",
  ];
  CreateLegend(ruleHTML, text);
  const inputs = CreateRuleContent(ruleHTML, text);
  const rule = new Rule(ruleHTML, inputs, RULES.length);
  rule.inputs.forEach((input, i) => {
    input.addEventListener("change", () => CheckValid(rule));
  });

  RULES.push(rule);
  return rule;
}

function CreateLegend(rule, text) {
  const legend = document.createElement("div");
  rule.append(legend);
  legend.classList.add("legend");

  for (let i = 0; i < text.length; i++) {
    const legendSpan = document.createElement("span");
    legend.append(legendSpan);
    legendSpan.innerHTML = text[i];
  }
}

function CreateRuleContent(rule, text) {
  const content = document.createElement("div");
  rule.append(content);
  content.classList.add("rule-content");

  let newInputs = [];
  for (let i = 0; i < text.length; i++) {
    const contentSpan = document.createElement("span");
    content.append(contentSpan);

    if (i < text.length - 1) {
      const input = document.createElement("input");
      input.type = "text";
      contentSpan.append(input);
      input.classList.add("rule-input");
      newInputs.push(input);
    } else if (i == text.length - 1) {
      const dlt = document.createElement("div");
      dlt.classList.add("delete-rule");
      contentSpan.append(dlt);
      const currentIndex = RULES.length;
      dlt.addEventListener("click", () => {
        RULES[currentIndex].remove();
      });
    }
  }
  html.inputs.push(newInputs);
  return newInputs;
}

function InputIsActive() {
  for (const input of $$$("input"))
    if (input == document.activeElement) return true;
  return false;
}

function RandomVocab() {
  return vocab[Math.floor(Math.random() * vocab.length)];
}

function ResetVocab() {
  vocab = [BLANK];
  for (const rule of RULES) if (!rule.removed && rule.valid) rule.checkVocab();
}

function ChangeBlank(text) {
  const oldBlank = BLANK;
  BLANK = text;

  TAPE.forEach((spot, i) => {
    if (spot == oldBlank) {
      TAPE[i] = BLANK;
      html.spots[i].innerHTML = TAPE[i];
    }
  });
  ResetVocab();
}

function Randomize() {
  TAPE.forEach((spot, i) => {
    TAPE[i] = RandomVocab();
    html.spots[i].innerHTML = TAPE[i];
  });
}

function ChangeActive(i) {
  INDEX = i;
  UpdateActive();
}

function UpdateActive() {
  for (const spot of html.spots) spot.classList.remove("active");
  html.spots[INDEX].classList.add("active");
}

function NextStep() {
  for (const rule of RULES) {
    if (
      rule.valid &&
      !rule.removed &&
      rule.state == STATE &&
      rule.read == TAPE[INDEX]
    ) {
      rule.apply();

      for (const rule of html.rules) rule.classList.remove("active-rule");
      html.rules[RULES.indexOf(rule)].classList.add("active-rule");

      if (INDEX < 0) html.addSpot(-1);
      else if (INDEX >= html.spots.length) html.addSpot(1);

      UpdateActive();
      stepCounter++;
      $("step").innerHTML = `Step: ${stepCounter}`;
      return;
    }
  }
  Halt();
}

function Auto() {
  HALT = false;
  clearInterval(autoInterval);
  autoInterval = setInterval(NextStep, wait);
}

function Halt() {
  HALT = true;
  for (const rule of html.rules) rule.classList.remove("active-rule");
  clearInterval(autoInterval);
}

function ImportRules(content) {
  const data = JSON.parse(content);
  for (let rule of RULES) rule.remove();
  for (const ruleData of data) CreateRule().set(ruleData);
}

function ExportRules(name) {
  let data = [];

  RULES.forEach((rule, i) => {
    if (rule.valid && !rule.removed) {
      const ruleData = {
        state: rule.state,
        read: rule.read,
        write: rule.write,
        move: rule.move,
        nextState: rule.nextState,
      };

      data.push(ruleData);
    }
  });

  saveJSON(data, name + ".js");
}

function saveJSON(_content, _name) {
  let _data = JSON.stringify(_content);
  const _a = document.createElement("a");
  const _file = new Blob([_data], { type: "text/javascript" });
  _a.href = URL.createObjectURL(_file);
  _a.download = _name;
  _a.click();
}

function Events() {
  html.newRule.addEventListener("click", CreateRule);
  document.addEventListener("keypress", (e) => {
    if (!InputIsActive()) {
      TAPE[INDEX] = e.key;
      html.spots[INDEX].innerHTML = e.key;
    }
  });
  $("play").addEventListener("click", Auto);
  $("next").addEventListener("click", NextStep);
  $("pause").addEventListener("click", Halt);
  $("randomize").addEventListener("click", Randomize);
  $("reset").addEventListener("click", InitTape);
  $("tape-length-input").addEventListener("change", () => {
    LENGTH = parseInt($("tape-length-input").value);
    InitTape();
  });
  $("blank-input").addEventListener("change", () => {
    ChangeBlank($("blank-input").value);
  });
  $("tape-speed-input").addEventListener("change", () => {
    num = parseInt($("tape-speed-input").value);
    wait = 1000 / num;
    if (!HALT) Auto();
  });
  $("import-rules").addEventListener("change", (e) => {
    const [file] = $("import-rules").files;
    let fileContent;
    const fr = new FileReader();
    fr.addEventListener(
      "load",
      () => {
        fileContent = fr.result;
        ImportRules(fileContent);
      },
      false
    );
    if (file) fileContent = fr.readAsText(file);
  });
  $("export-rules-label").addEventListener("click", () => {
    ExportRules($("export-rules-input").value);
  });
}

CheckValid = (rule) => rule.checkValid();

class Rule {
  constructor(HTML, inputs, index) {
    this.html = HTML;
    this.removed = false;
    this.inputs = inputs;
    this.index = index;
    this.valid = false;
    this.moves = ["L", "S", "R"];
  }

  checkValid() {
    this.invalidInputs = [];
    let isValid = true;
    this.inputs.forEach((input, i) => {
      const inp = input.value;
      switch (i) {
        case 0:
          if (inp.length == 0 || isNaN(parseInt(inp))) {
            this.invalidInputs.push(i);
            isValid = false;
          }
          break;

        case 1:
          if (inp.length == 0) {
            this.invalidInputs.push(i);
            isValid = false;
          }
          break;

        case 2:
          if (inp.length == 0) {
            this.invalidInputs.push(i);
            isValid = false;
          }
          break;

        case 3:
          if (input.value.length == 0 || !this.moves.includes(input.value)) {
            this.invalidInputs.push(i);
            isValid = false;
          }
          break;

        case 4:
          if (inp.length == 0 || isNaN(parseInt(inp))) {
            this.invalidInputs.push(i);
            isValid = false;
          }
          break;
      }
    });

    this.highlightInvalid();
    this.valid = isValid;
    if (this.valid) this.fillRule();
    return this.valid;
  }

  highlightInvalid() {
    for (const input of this.inputs) input.classList.remove("invalid");
    for (const i of this.invalidInputs) this.inputs[i].classList.add("invalid");
  }

  fillRule() {
    this.state = parseInt(this.inputs[0].value);
    const read = this.inputs[1].value;
    this.read = isNaN(parseInt(read)) ? read : parseInt(read);
    const write = this.inputs[2].value;
    this.write = isNaN(parseInt(write)) ? write : parseInt(write);
    this.move = this.moveNum(this.inputs[3].value);
    this.nextState = parseInt(this.inputs[4].value);

    this.checkVocab();
  }

  checkVocab() {
    if (!vocab.includes(this.read)) vocab.push(this.read);
    if (!vocab.includes(this.write)) vocab.push(this.write);
  }

  moveNum(moveStr) {
    const nums = [-1, 0, 1];
    return nums[this.moves.indexOf(moveStr)];
  }

  remove() {
    this.html.remove();
    this.removed = true;
    ResetVocab();
  }

  set(data) {
    this.state = data.state;
    this.read = data.read;
    this.write = data.write;
    this.move = this.moves[data.move + 1];
    this.nextState = data.nextState;

    this.inputs[0].value = this.state;
    this.inputs[1].value = this.read;
    this.inputs[2].value = this.write;
    this.inputs[3].value = this.move;
    this.inputs[4].value = this.nextState;

    this.checkValid();
  }

  apply() {
    // write
    TAPE[INDEX] = this.write;
    html.spots[INDEX].innerHTML = this.write;

    // next state
    STATE = this.nextState;

    // check halt
    if (this.move == 0) return Halt();
    $("show-state-input").value = STATE;

    // move
    INDEX += this.move;
  }
}

Start();

// Experience similar Turing Machines with:
// http://turingmachine.vassar.edu/
// https://math.hws.edu/eck/js/turing-machine/TM.html
