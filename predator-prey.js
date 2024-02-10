// Predator-Prey JavaScript model
// Author: Aaron Weeden, Shodor, aweeden@shodor.org

// Global variables are declared here, ordered alphabetically.
// ALL_CAPS means the variable is intended as a constant; once its value has
// been set, it should never be re-set.
// Otherwise, PascalCase is used for variable names.
var AgentCount,
    Agents = [],
    Canvas,
    CELL_HEIGHT_TOO_SMALL_MSG,
    CELL_WIDTH_TOO_SMALL_MSG,
    CellCount,
    Cells = [],
    COLUMN_COUNT_TOO_SMALL_MSG = "The number of columns must be positive. " +
                                 "Please choose a different value.",
    Ctx,
    FoodCount,
    FoodDataset,
    FPS_SLIDER_MAX = Math.log(64) / Math.log(2),
    FPS_SLIDER_MIN = Math.log(1) / Math.log(2),
    Graph,
    GRAPH_MAX_TIME_STEP_COUNT = 256,
    Inputs = {},
    IntervalId,
    IsRunning = false,
    MAX_COLOR = 256,
    MAX_VERTICAL_GRID_LINES = 8,
    MILLISECONDS_PER_SECOND = 1000,
    MIN_CELL_DIMENSION = 3,
    NEGATIVE_FOOD_REGROW_MSG = "The amount of food to regrow per cell per " +
                               "time step cannot be negative. Please choose " +
                               "a different value.",
    NEGATIVE_PREDATOR_COUNT_MSG = "The number of predators cannot be " +
                                  "negative. Please choose a different value.",
    NEGATIVE_PREY_COUNT_MSG = "The number of prey cannot be negative. Please " +
                              "choose a different value.",
    Outputs = {},
    Parameters = {
      cellColorStyle: "green",
      cellHeight: 16,
      cellWidth: 16,
      columnCount: 16,
      foodRegrow: 1,
      framesPerSecond: 1,
      initPredatorCount: 20,
      initPreyCount: 20,
      maxCellFood: 10,
      predatorColor: "red",
      predatorDeathAge: 80,
      predatorHungerPerTimeStep: 1,
      predatorInitFoodInBelly: 10,
      predatorMaxFoodInBelly: 20,
      predatorMinAgeForReproduction: 10,
      predatorReproductionChance: 80,
      preyColor: "blue",
      preyDeathAge: 60,
      preyHungerPerTimeStep: 4,
      preyInitFoodInBelly: 10,
      preyMaxFoodInBelly: 20,
      preyMinAgeForReproduction: 5,
      preyReproductionChance: 90,
      rowCount: 16
    },
    PredatorCount,
    PredatorDataset,
    PreyCount,
    PreyDataset,
    ROW_COUNT_TOO_SMALL_MSG = "The number of rows must be positive. Please " +
                              "choose a different value.",
    StartButton,
    StepButton,
    Time,
    TOO_MANY_AGENTS_MSG = "The number of agents cannot exceed the number of " +
                          "available cells. Please choose different values " +
                          "for number of predators, number of prey, number " +
                          "of rows, and/or number of columns.",
    TooManyAgentsMsgAlreadyShown = false;

// To preserve alphabetical ordering, the following variables are defined here
// because they depend on definitions of variables with names earlier in the
// alphabet.
CELL_HEIGHT_TOO_SMALL_MSG = "Cell height must be at least " +
                            MIN_CELL_DIMENSION + " pixels. Please choose " +
                            "a different value.";
CELL_WIDTH_TOO_SMALL_MSG = "Cell width must be at least " +
                           MIN_CELL_DIMENSION + " pixels. Please choose " +
                           "a different value.";

// All functions are defined below, ordered alphabetically.
function addAgentToCell(theAgent, theCell) {
  theAgent.cell = theCell;
  theCell.agent = theAgent;
}

function agentDiedOfOldAge(theAgent) {
  return theAgent.age >= theAgent.deathAge;
}

function agentStarvedToDeath(theAgent) {
  return theAgent.foodInBelly <= 0;
}

function babyAgentFoodInBelly(theAgent) {
  return theAgent.foodInBelly;
}

function buildDataset(color, label) {
  return {
    backgroundColor: color,
    borderColor: color,
    data: [],
    fill: false,
    fillColor: color,
    label: label,
    pointRadius: 0
  };
}

function canReproduce(theAgent) {
  return !theAgent.hasReproducedInThisTimeStep &&
          theAgent.age >= theAgent.minAgeForReproduction;
}

function Cell(row, column) {
  var theCell = this;

  theCell.agent = null;

  theCell.column = column;

  theCell.draw = function () {
    var x = theCell.column * Parameters.cellWidth,
        y = theCell.row * Parameters.cellHeight;
    Ctx.fillStyle = getCellColor(theCell.food);
    Ctx.fillRect(x, y, Parameters.cellWidth, Parameters.cellHeight);
    Ctx.strokeStyle = "dark" + Parameters.cellColorStyle;
    Ctx.strokeRect(x, y, Parameters.cellWidth, Parameters.cellHeight);
  };

  theCell.food = Parameters.maxCellFood;
  FoodCount += theCell.food;

  theCell.regrowFood = function () {
    if (theCell.food < Parameters.maxCellFood) {
      theCell.food += Parameters.foodRegrow;
      FoodCount += Parameters.foodRegrow;
    }
  };

  theCell.row = row;
}

function checkOpenCell(row, column, condition, openCells) {
  if (condition &&
      Cells[row][column].agent === null) {
    openCells.push(Cells[row][column]);
  }
}

function draw() {
  Ctx.clearRect(0, 0, Canvas.width, Canvas.height);
  drawCells();
  drawAgents();
}

function drawAgents() {
  var i;
  for (i = 0; i < AgentCount; i++) {
    drawAgent(Agents[i]);
  }
}

function drawAgent(agent) {
  Ctx.fillStyle = agent.color;
  Ctx.fillRect(agent.cell.column * Parameters.cellWidth +
                            0.25 * Parameters.cellWidth,
               agent.cell.row * Parameters.cellHeight +
                         0.25 * Parameters.cellHeight,
               0.5 * Parameters.cellWidth,
               0.5 * Parameters.cellHeight);
}

function drawCells() {
  var column,
      row;
  for (row = 0; row < Parameters.rowCount; row++) {
    for (column = 0; column < Parameters.columnCount; column++) {
      Cells[row][column].draw();
    }
  }
}

function eat() {
  var i;
  for (i = 0; i < AgentCount; i++) {
    Agents[i].eat();
  }
}

function findAgentAt(row, column, condition, constructor) {
  var theCell;

  if (!condition) {
    return null;
  }

  theCell = Cells[row][column];

  if (theCell.agent instanceof constructor) {
    return theCell.agent;
  }

  return null;
}

function findAgentNextTo(theCell, constructor) {
  var theAgent = null;

  theAgent = findAgentAt(theCell.row - 1,
                         theCell.column,
                         theCell.row !== 0,
                         constructor);
  if (theAgent === null) {
    theAgent = findAgentAt(theCell.row + 1,
                           theCell.column,
                           theCell.row !== Parameters.rowCount - 1,
                           constructor);
  }
  if (theAgent === null) {
    theAgent = findAgentAt(theCell.row,
                           theCell.column - 1,
                           theCell.column !== 0,
                           constructor);
  }
  if (theAgent === null) {
    theAgent = findAgentAt(theCell.row,
                           theCell.column + 1,
                           theCell.column !== Parameters.columnCount - 1,
                           constructor);
  }

  return theAgent;
}

function getCellColor(food) {
  var blue = 0,
      colorComponent = Math.floor((food * MAX_COLOR) / Parameters.maxCellFood),
      green = 0,
      red = 0;
  switch (Parameters.cellColorStyle) {
    case "red":
      red = colorComponent;
      break;
    case "green":
      green = colorComponent;
      break;
    case "blue":
      blue = colorComponent;
      break;
  }

  return "rgb(" + red + ", " + green + ", " + blue + ")";
}

function getHungry() {
  var i,
      theAgent;
  for (i = 0; i < AgentCount; i++) {
    theAgent = Agents[i];
    if (theAgent.foodInBelly > 0) {
      theAgent.foodInBelly -= theAgent.hungerPerTimeStep;
    }
    if (agentStarvedToDeath(theAgent)) {
      removeAgent(theAgent);
      i--;
    }
  }
}

function getOlder() {
  var i,
      theAgent;
  for (i = 0; i < AgentCount; i++) {
    theAgent = Agents[i];
    theAgent.age++;
    if (agentDiedOfOldAge(theAgent)) {
      removeAgent(theAgent);
      i--;
    }
  }
}

function getRandomOpenNeighborCell(cell) {
  var column = cell.column,
      openCells = [],
      row = cell.row;
  checkOpenCell(row - 1,
                column,
                row > 0,
                openCells);
  checkOpenCell(row,
                column - 1,
                column > 0,
                openCells);
  checkOpenCell(row + 1,
                column,
                row < Parameters.rowCount - 1,
                openCells);
  checkOpenCell(row,
                column + 1,
                column < Parameters.columnCount - 1,
                openCells);
  if (openCells.length === 0) {
    return null;
  }
  else {
    return openCells[getRandomInt(0, openCells.length)];
  }
}

function getRandomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min));
}

function initButtons() {
  StartButton = document.getElementById("start-button");
  StepButton = document.getElementById("step-button");
}

function initCanvas() {
  Canvas = document.getElementById("world");
  Ctx = Canvas.getContext("2d");
}

function initGraph() {
  FoodDataset = buildDataset(Parameters.cellColorStyle, "Food");
  PredatorDataset = buildDataset(Parameters.predatorColor, "Predators");
  PreyDataset = buildDataset(Parameters.preyColor, "Prey");

  Graph = new Chart(document.getElementById("graph").getContext("2d"), {
    data: {
      labels: [],
      datasets: [FoodDataset, PredatorDataset, PreyDataset]
    },
    options: {
      animation: {
        duration: 0
      },
      legend: {
        position: "right"
      },
      scales: {
        xAxes: [{
          scaleLabel: {
            display: true,
            labelString: "Time Steps Elapsed"
          },
          ticks: {
            maxTicksLimit: MAX_VERTICAL_GRID_LINES
          }
        }],
        yAxes: [{
          scaleLabel: {
            display: true,
            labelString: "% of Capacity"
          },
          ticks: {
            max: 100,
            min: 0
          }
        }]
      }
    },
    type: "line"
  });
}

function initInputs() {
  Inputs.cellHeight = document.getElementById("cell-height-input");
  Inputs.cellHeight.value = Parameters.cellHeight;
  Inputs.cellWidth = document.getElementById("cell-width-input");
  Inputs.cellWidth.value = Parameters.cellWidth;
  Inputs.columnCount = document.getElementById("column-count-input");
  Inputs.columnCount.value = Parameters.columnCount;
  Inputs.foodRegrow = document.getElementById("food-regrow-input");
  Inputs.foodRegrow.value = Parameters.foodRegrow;
  Inputs.initPredatorCount = document.getElementById("predator-count-input");
  Inputs.initPredatorCount.value = Parameters.initPredatorCount;
  Inputs.initPreyCount = document.getElementById("prey-count-input");
  Inputs.initPreyCount.value = Parameters.initPreyCount;
  Inputs.rowCount = document.getElementById("row-count-input");
  Inputs.rowCount.value = Parameters.rowCount;
}

function initKey() {
  document.getElementById("predator-key").style.backgroundColor =
    Parameters.predatorColor;
  document.getElementById("prey-key").style.backgroundColor =
    Parameters.preyColor;
}

function initOutputs() {
  Outputs.cellHeight = document.getElementById("cell-height-output");
  Outputs.cellWidth = document.getElementById("cell-width-output");
  Outputs.columnCount = document.getElementById("column-count-output");
  Outputs.foodRegrow = document.getElementById("food-regrow-output");
  Outputs.initPredatorCount = document.getElementById("predator-count-output");
  Outputs.initPreyCount = document.getElementById("prey-count-output");
  Outputs.rowCount = document.getElementById("row-count-output");
  Outputs.time = document.getElementById("time-output");
}

function initSlider() {
  $("#fps-slider").slider({
    create: function () {
      $(this).slider("value",
                     Math.floor(Math.log(Parameters.framesPerSecond) /
                                Math.log(2)));
      $("#fps-slider-handle").text(Parameters.framesPerSecond);
    },
    min: FPS_SLIDER_MIN,
    max: FPS_SLIDER_MAX,
    slide: function (event, ui) {
      var val = Math.pow(2, ui.value);
      $("#fps-slider-handle").text(val);
      Parameters.framesPerSecond = val;
      if (IsRunning) {
        start();
      }
    }
  });
}

function isError(errorValues) {
  var i;
  for (i = 0; i < errorValues.length; i++) {
    if (errorValues[i]) {
      return true;
    }
  }
  return false;
}

function isParameterValid(key, conditionsAndErrorMsgs) {
  var i;
  for (i = 0; i < conditionsAndErrorMsgs.length; i++) {
    if (conditionsAndErrorMsgs[i].condition) {
      if (conditionsAndErrorMsgs[i].errorMsg !== TOO_MANY_AGENTS_MSG ||
          !TooManyAgentsMsgAlreadyShown) {

        alert(conditionsAndErrorMsgs[i].errorMsg);

        if (conditionsAndErrorMsgs[i].errorMsg === TOO_MANY_AGENTS_MSG) {
          TooManyAgentsMsgAlreadyShown = true;
        }
      }
      Parameters[key] = +Outputs[key].innerHTML;
      return false;
    }
  }

  Outputs[key].innerHTML = Parameters[key];
  return true;
}

function moveAgent(theAgent) {
  var theNewCell;

  if (theAgent.hasReproducedInThisTimeStep) {
    return;
  }

  theNewCell = getRandomOpenNeighborCell(theAgent.cell);
  if (theNewCell !== null) {
    theAgent.cell.agent = null;
    addAgentToCell(theAgent, theNewCell);
  }
}

function moveAgents() {
  var i;
  for (i = 0; i < AgentCount; i++) {
    moveAgent(Agents[i]);
  }
}

function placeAgentRandomly(theAgent) {
  var column,
      row;
  do {
    row = getRandomInt(0, Parameters.rowCount);
    column = getRandomInt(0, Parameters.columnCount);
    theAgent.cell = Cells[row][column];
  } while (theAgent.cell.agent !== null);
  theAgent.cell.agent = theAgent;
}

function Predator(index, foodInBelly) {
  var thePredator = this;

  thePredator.age = 0;

  thePredator.amountCanEat = function () {
    return Parameters.predatorMaxFoodInBelly - thePredator.foodInBelly;
  };

  thePredator.color = Parameters.predatorColor;

  thePredator.deathAge = Parameters.predatorDeathAge;

  thePredator.eat = function () {
    var thePrey;
    if (thePredator.isHungry()) {
      thePrey = findAgentNextTo(thePredator.cell, Prey);
      if (thePrey !== null) {
        thePredator.foodInBelly += thePredator.amountCanEat();
        removeAgent(thePrey);
      }
    }
  };

  thePredator.foodInBelly = foodInBelly;

  thePredator.hungerPerTimeStep = Parameters.predatorHungerPerTimeStep;

  thePredator.isHungry = function () {
    return thePredator.foodInBelly < Parameters.predatorMaxFoodInBelly;
  };

  thePredator.index = index;

  thePredator.minAgeForReproduction = Parameters.predatorMinAgeForReproduction;

  thePredator.reproductionChance = Parameters.predatorReproductionChance;

  PredatorCount++;
}

function Prey(index, foodInBelly) {
  var thePrey = this;

  thePrey.age = 0;

  thePrey.amountCanEat = function () {
    return Math.min(Parameters.preyMaxFoodInBelly - thePrey.foodInBelly,
                    thePrey.cell.food);
  };

  thePrey.color = Parameters.preyColor;

  thePrey.deathAge = Parameters.preyDeathAge;

  thePrey.eat = function () {
    var amountCanEat = thePrey.amountCanEat();
    if (thePrey.isHungry()) {
      thePrey.cell.food -= amountCanEat;
      thePrey.foodInBelly += amountCanEat;
      FoodCount -= amountCanEat;
    }
  };

  thePrey.foodInBelly = foodInBelly;

  thePrey.hungerPerTimeStep = Parameters.preyHungerPerTimeStep;

  thePrey.index = index;

  thePrey.isHungry = function () {
    return thePrey.foodInBelly < Parameters.preyMaxFoodInBelly;
  };

  thePrey.minAgeForReproduction = Parameters.preyMinAgeForReproduction;

  thePrey.reproductionChance = Parameters.preyReproductionChance;

  PreyCount++;
}

function regrowFood() {
  var column,
      row;
  for (row = 0; row < Parameters.rowCount; row++) {
    for (column = 0; column < Parameters.columnCount; column++) {
      Cells[row][column].regrowFood();
    }
  }
}

function removeAgent(theAgent) {
  var i,
      theAgentsIndex = theAgent.index;
  theAgent.cell.agent = null;
  if (theAgent instanceof Predator) {
    PredatorCount--;
  }
  else if (theAgent instanceof Prey) {
    PreyCount--;
  }
  Agents.splice(theAgentsIndex, 1);
  AgentCount--;
  for (i = theAgentsIndex; i < AgentCount; i++) {
    Agents[i].index = i;
  }
}

function reproduce() {
  var i;
  for (i = 0; i < AgentCount; i++) {
    Agents[i].hasReproducedInThisTimeStep = false;
  }
  for (i = 0; i < AgentCount; i++) {
    if (canReproduce(Agents[i]) &&
        Math.random() * 100 < Agents[i].reproductionChance) {
      reproduceAgent(Agents[i]);
    }
  }
}

function reproduceAgent(theAgent) {
  var openCell,
      theNewAgent,
      theOtherAgent = findAgentNextTo(theAgent.cell, theAgent.constructor);

  if (theOtherAgent !== null &&
      canReproduce(theOtherAgent)) {
    openCell = getRandomOpenNeighborCell(theAgent.cell);
    if (openCell !== null) {
      theNewAgent = new theAgent.constructor(AgentCount,
                                             babyAgentFoodInBelly(theAgent));
      Agents.push(theNewAgent);
      AgentCount++;
      addAgentToCell(theNewAgent, openCell);
    }
    theAgent.hasReproducedInThisTimeStep = true;
    theOtherAgent.hasReproducedInThisTimeStep = true;
  }
}

function reset() {
  stop();
  resetParameters();

  if (isError(validateParameters())) {
    return;
  }

  resetTime();
  resetCells();
  resetAgents();
  resetGraph();
  draw();
}

function resetAgents() {
  Agents.length = 0;
  AgentCount = Parameters.initPredatorCount + Parameters.initPreyCount;
  resetPredators();
  resetPrey();
}

function resetCells() {
  var column,
      row;
  CellCount = Parameters.rowCount * Parameters.columnCount;
  Canvas.width = Parameters.cellWidth * Parameters.columnCount;
  Canvas.height = Parameters.cellHeight * Parameters.rowCount;
  Cells.length = 0;
  FoodCount = 0;
  for (row = 0; row < Parameters.rowCount; row++) {
    Cells.push([]);
    for (column = 0; column < Parameters.columnCount; column++) {
      Cells[row].push(new Cell(row, column));
    }
  }
}

function resetGraph() {
  Graph.data.labels.length = 0;
  FoodDataset.data.length = 0;
  PredatorDataset.data.length = 0;
  PreyDataset.data.length = 0;
  updateGraph();
}

function resetParameters() {
  Parameters.cellHeight = +Inputs.cellHeight.value;
  Parameters.cellWidth = +Inputs.cellWidth.value;
  Parameters.columnCount = +Inputs.columnCount.value;
  Parameters.foodRegrow = +Inputs.foodRegrow.value;
  Parameters.initPredatorCount = +Inputs.initPredatorCount.value;
  Parameters.initPreyCount = +Inputs.initPreyCount.value;
  Parameters.rowCount = +Inputs.rowCount.value;
}

function resetPredators() {
  var i,
      thePredator;
  PredatorCount = 0;
  for (i = 0; i < Parameters.initPredatorCount; i++) {
    thePredator = new Predator(i, Parameters.predatorInitFoodInBelly);
    Agents.push(thePredator);
    placeAgentRandomly(thePredator);
  }
}

function resetPrey() {
  var i,
      thePrey;
  PreyCount = 0;
  for (i = 0; i < Parameters.initPreyCount; i++) {
    thePrey = new Prey(Parameters.initPredatorCount + i,
                       Parameters.preyInitFoodInBelly);
    Agents.push(thePrey);
    placeAgentRandomly(thePrey);
  }
}

function resetTime() {
  Time = 0;
  Outputs.time.innerHTML = Time;
}

function start() {
  stop();
  IsRunning = true;
  StepButton.disabled = true;
  StartButton.innerHTML = "Stop";
  StartButton.onclick = stop;
  IntervalId = setInterval(function () {
    step();
  }, MILLISECONDS_PER_SECOND / Parameters.framesPerSecond);
}

function step() {
  regrowFood();
  eat();
  reproduce();
  moveAgents();
  getHungry();
  getOlder();
  draw();
  Time++;
  Outputs.time.innerHTML = Time;
  updateGraph();
}

function stop() {
  IsRunning = false;
  clearInterval(IntervalId);
  StepButton.disabled = false;
  StartButton.innerHTML = "Start";
  StartButton.onclick = start;
}

function tooManyAgents() {
  return Parameters.initPredatorCount + Parameters.initPreyCount >
         Parameters.rowCount * Parameters.columnCount;
}

function updateGraph() {
  if (Time > GRAPH_MAX_TIME_STEP_COUNT) {
    Graph.data.labels.shift();
    FoodDataset.data.shift();
    PredatorDataset.data.shift();
    PreyDataset.data.shift();
  }
  Graph.data.labels.push(Time);
  FoodDataset.data.push(100 * FoodCount / (CellCount * Parameters.maxCellFood));
  PredatorDataset.data.push(100 * PredatorCount / CellCount);
  PreyDataset.data.push(100 * PreyCount / CellCount);
  Graph.update(0);
}

function validateParameters() {
  var errorValues = [];
  TooManyAgentsMsgAlreadyShown = false;

  errorValues.push(!isParameterValid("cellHeight", [{
    condition: Parameters.cellHeight < MIN_CELL_DIMENSION,
    errorMsg: CELL_HEIGHT_TOO_SMALL_MSG
  }]));

  errorValues.push(!isParameterValid("cellWidth", [{
    condition: Parameters.cellWidth < MIN_CELL_DIMENSION,
    errorMsg: CELL_WIDTH_TOO_SMALL_MSG
  }]));

  errorValues.push(!isParameterValid("columnCount", [{
    condition: Parameters.columnCount <= 0,
    errorMsg: COLUMN_COUNT_TOO_SMALL_MSG
  }, {
    condition: tooManyAgents(),
    errorMsg: TOO_MANY_AGENTS_MSG
  }]));

  errorValues.push(!isParameterValid("foodRegrow", [{
    condition: Parameters.foodRegrow < 0,
    errorMsg: NEGATIVE_FOOD_REGROW_MSG
  }]));

  errorValues.push(!isParameterValid("initPredatorCount", [{
    condition: Parameters.initPredatorCount < 0,
    errorMsg: NEGATIVE_PREDATOR_COUNT_MSG
  }, {
    condition: tooManyAgents(),
    errorMsg: TOO_MANY_AGENTS_MSG
  }]));

  errorValues.push(!isParameterValid("initPreyCount", [{
    condition: Parameters.initPreyCount < 0,
    errorMsg: NEGATIVE_PREY_COUNT_MSG
  }, {
    condition: tooManyAgents(),
    errorMsg: TOO_MANY_AGENTS_MSG
  }]));

  errorValues.push(!isParameterValid("rowCount", [{
    condition: Parameters.rowCount <= 0,
    errorMsg: ROW_COUNT_TOO_SMALL_MSG
  }, {
    condition: tooManyAgents(),
    errorMsg: TOO_MANY_AGENTS_MSG
  }]));

  return errorValues;
}

// This function is called once all the HTML elements have loaded.
onload = function () {
  initButtons();
  initCanvas();
  initGraph();
  initInputs();
  initKey();
  initOutputs();
  initSlider();
  reset();
};
