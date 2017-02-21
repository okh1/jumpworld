/// <reference path="QLearning.ts" />
/// <reference path="QLearning\QLearnerNN.ts" />

var c, ctx; var width = 900; var height = 425; //For canvas
declare var $: any; //For jQuery
declare var Dygraph: any; declare var g: any; var data = []; var ascissa = 0; var plot = false; //For chart

var interval; //JS timer
var trainingspeed = 25; //Timer interval in milliseconds. Smaller values = faster refresh = faster training
var numberobstacles = 2; var heightjump: number = 100; var speedjump: number = 8; var speedobstacle: number = 8;
var go: boolean = false; var t: number = 0; //go means we're learning and t is the epoch number
declare var convnetjs: any; //convnetjs
var human_keypressed: number = 0; //0 if nothing, 1 if jump

var world: QLearning.World;
var state: QLearning.QState;
var learner_nn: QLearning.QLearnerNN = null;
var learner_table: QLearning.QLearnerTABLE = null;
var learner_bst: QLearning.QLearnerBST = null;

window.onload = () => {
    setupchart();
    //Manage canvas, setting its width and height
    c = document.getElementById('c');
    c.width = width; c.height = height;
    ctx = c.getContext('2d');
};

//Main function that we repeat every timer tick
function core_nn() {
    var action = (state.hero_y == 0) ? learner_nn.chooseAction(state) : 0; //Choose the best action (if we can choose, i.e. we're not jumping)
    state.action = action; //Set the action to the qstate
    var newstate = world.makeaction(state); //Make the action and get the new state
    var reward = world.reward(newstate); //Get the reward
    learner_nn.updateQ(state, newstate, action, reward); //Learn updating qvalues
    state = newstate; //Swap the states
    if (state.current_score > 10) //Early stopping
        learner_nn.training = false;
    if (!go) { draw(newstate); plotchart(state, learner_nn); } //Draw the state to the canvas. Not necessary for learning.
    updateScore(newstate, reward, learner_nn); //Update scores. Necessary for learning.

    t++;
    if (t % 10000 == 0) {
        console.log("At epoch " + t + " the highscore is " + state.highest_score + " and the error is " + learner_nn.training_error);
    }   
}

function core_table() {
    var action = learner_table.chooseAction(state); //Choose the best action (if we can choose, i.e. we're not jumping)
    state.action = action; //Set the action to the qstate
    var newstate = world.makeaction(state); //Make the action and get the new state
    var reward = world.reward(newstate); //Get the reward
    learner_table.updateQ(state, newstate, action, reward); //Learn updating qvalues
    state = newstate; //Swap the states
    if (state.current_score > 10) //Early stopping
        learner_table.training = false;
    if (!go) { draw(newstate); plotchart(state, learner_table); } //Draw the state to the canvas. Not necessary for learning.
    updateScore(newstate, reward, learner_table); //Update scores. Necessary for learning.

    t++;
    if (t % 100000 == 0) {
        console.log("At epoch " + t + " the highscore is " + state.highest_score);
    }
}

function core_bst() {
    var action = learner_bst.chooseAction(state); //Choose the best action (if we can choose, i.e. we're not jumping)
    state.action = action; //Set the action to the qstate
    var newstate = world.makeaction(state); //Make the action and get the new state
    var reward = world.reward(newstate); //Get the reward
    learner_bst.updateQ(state, newstate, action, reward); //Learn updating qvalues
    state = newstate; //Swap the states
    if (state.current_score > 10) //Early stopping
        learner_bst.training = false;
    if (!go) { draw(newstate); plotchart(state, learner_bst); } //Draw the state to the canvas. Not necessary for learning.
    updateScore(newstate, reward, learner_bst); //Update scores. Necessary for learning.

    t++;
    if (t % 100000 == 0) {
        console.log("At epoch " + t + " the highscore is " + state.highest_score);
    }
}

function core_human() {
    var action = 0; //Nothing
    state.action = action; //Set the action to the qstate
    var newstate = world.makeaction(state); //Make the action and get the new state
    var reward = world.reward(newstate); //Get the reward
    state = newstate; //Swap the states
    draw(newstate);
    updateScore(newstate, reward, null); //Update scores. Necessary for learning.
}


//Draw the current state to the canvas
function draw(state: QLearning.QState) {
    //Clear canvas
    ctx.clearRect(0, 0, state.world.width, state.world.height);
    ctx.fillStyle = 'grey';
    ctx.fillRect(0, state.world.height - 100, state.world.width, 100);
    //Draw obstacles
    for (var i = 0; i < numberobstacles; i++) {
        ctx.fillStyle = 'black';
        ctx.fillRect(state.x[i], state.world.height - 100 - 25, 25, 25);
    }
    //Draw hero
    ctx.fillStyle = 'red';
    ctx.fillRect(state.hero_x, state.hero_y + (state.world.height - 100 - 50), 50, 50);
}

//Updates the current and highest score, as well as other stats
function updateScore(state: QLearning.QState, reward: number, l: IQLearner) {
    $("#spanDistance").text((QLearning.World.getDistance(state)).toString());

    if (reward == world.reward_win) state.current_score++;
    else if (reward == world.reward_loss) state.current_score = 0;
    if (state.current_score > state.highest_score) state.highest_score = state.current_score;
    $("#spanScore").text(state.current_score.toString());
    $("#spanHighestScore").text(state.highest_score.toString());
    $("#spanHeroY").text(state.hero_y.toString());
    if (l != null) {
        $("#spanValueNothing").text(l.getValue(state, 0).toString());
        $("#spanValueJumping").text(l.getValue(state, 1).toString());
        $("#spanEpsilon").text((l.random) ? l.epsilon.toString() : 0);
    }
}

//Chart methods
function setupchart() {
    for (var i = 100; i >= 0; i--) {
        ascissa++;
        var y = Math.random();
        data.push([ascissa, y, y + 1]);
    }


    g = new Dygraph(document.getElementById("div_g"), data,
        {
            drawPoints: true,
            labels: ['t', 'Nothing', 'Jumping']
        });

}
function plotchart(s: QLearning.QState, l: IQLearner) {
    ascissa++;
    //var clonestate: QLearning.QState = s.clone();
    //clonestate.action = 0;
    //var v1 = l.nnet(clonestate);
    //clonestate.action = 1;
    //var v2 = l.nnet(clonestate);
    //var y = Math.random();

    data.shift();
    data.push([ascissa, l.getValue(s, 0), l.getValue(s, 1)]);
    g.updateOptions({ 'file': data });
}

//Train the agent for a specified number of iterations without drawing the states
function fastTraining() {
    var epochs: number = $("#txtEpochs").val();
    plot = false;
    for (var i = 0; i < epochs; i++) {
        if (learner_table != null)
            core_table();
        else if (learner_nn != null)
            core_nn();
        else if (learner_bst != null)
            core_bst();
    }
    plot = false;
}

//Change the height of jump, its speed and the speed of the obstacòes
function changeProperties() {
    heightjump = +$("#txtHeightJump").val();
    speedjump = +($("#txtSpeedJump").val());
    speedobstacle = +$("#txtSpeedObstacles").val();
    world.height_jump = heightjump;
    world.speed_jump = speedjump;
    world.speed_obstacles = speedobstacle;
}

//Change the training speed, that is the interval in milliseconds
function changeTrainingSpeed() {
    trainingspeed = $("#txtTrainingSpeed").val();
    window.clearInterval(interval);
    if (learner_table != null)
        interval = window.setInterval(core_table, trainingspeed);
    else if (learner_nn != null)
        interval = window.setInterval(core_nn, trainingspeed);
    else if (learner_bst != null)
        interval = window.setInterval(core_bst, trainingspeed);
}

function stopTraining() {
    learner_nn.training = false;
    $("#spanTrainingSpeed").hide();
    $("#spanStop").hide();
    $("#spanFastTraining").hide();
    $("#spanTable").show();
    $("#spanNN").show();
    $("#spanCurrent").text("Currently not training");
}

function startTrainingTable() {
    window.clearInterval(interval);
    if (t == 0) { //For the first time only
        //Allocate world, initial state and learner
        world = new QLearning.World(2, numberobstacles, heightjump, speedobstacle, speedjump, width, height);
        state = new QLearning.QState([0, 500], world, QLearning.VectorMode.DistanceHeightAction); //The starting state. Starting obstacles positions are 0 and 500
        learner_table = new QLearning.QLearnerTABLE(world, 2);
        //Initialize options
        learner_table.random = false;
        learner_table.start_learn_threshold = 0;
        world.reward_loss = -100;
        world.reward_win = 10;
        world.reward_living = 0;
    }

    while (go) {
        core_table();
    }
    interval = window.setInterval(core_table, trainingspeed);

    $("#spanTrainingSpeed").show();
    $("#spanStop").show();
    $("#spanFastTraining").show();
    $("#spanTable").hide();
    $("#spanNN").hide();
    $("#spanBST").hide();
    $("#spanCurrent").text("Currently training with Table");
}

function startTrainingNN() {
    window.clearInterval(interval);
    if (t == 0) { //For the first time only
        //Allocate world, initial state and learner
        world = new QLearning.World(2, numberobstacles, heightjump, speedobstacle, speedjump, width, height);
        state = new QLearning.QState([0, 500], world, QLearning.VectorMode.DistanceHeight); //The starting state. Starting obstacles positions are 0 and 500
        //Define neural network architecture
        var layer_defs = [];
        layer_defs.push({ type: 'input', out_sx: 1, out_sy: 1, out_depth: 2 });
        layer_defs.push({ type: 'fc', num_neurons: 5, activation: 'relu' });
        layer_defs.push({ type: 'regression', num_neurons: 2 });
        learner_nn = new QLearning.QLearnerNN(world, 2, layer_defs);
        //Initialize options
        learner_nn.epsilon_min = 0.001;
        learner_nn.start_learn_threshold = 0;
        learner_nn.learning_steps_total = 2000;
        learner_nn.learning_steps_burnin = 500;
        learner_nn.gamma = 1;
        world.reward_loss = -1;
        world.reward_win = 0.1;
        world.reward_living = -0.001;
    }

    while (go) {
        core_nn();
    }
    interval = window.setInterval(core_nn, trainingspeed);

    $("#spanTrainingSpeed").show();
    $("#spanStop").show();
    $("#spanFastTraining").show();
    $("#spanTable").hide();
    $("#spanNN").hide();
    $("#spanBST").hide();
    $("#spanCurrent").text("Currently training with Neural Network");
}

function startTrainingBST() {
    window.clearInterval(interval);
    if (t == 0) { //For the first time only
        //Allocate world, initial state and learner
        world = new QLearning.World(2, numberobstacles, heightjump, speedobstacle, speedjump, width, height);
        state = new QLearning.QState([0, 500], world, QLearning.VectorMode.DistanceHeightAction); //The starting state. Starting obstacles positions are 0 and 500
        learner_bst = new QLearning.QLearnerBST(world, 2);
        //Initialize options
        learner_bst.random = false;
        learner_bst.start_learn_threshold = 0;
        world.reward_loss = -100;
        world.reward_win = 10;
        world.reward_living = 0;
    }

    while (go) {
        core_bst();
    }
    interval = window.setInterval(core_bst, trainingspeed);

    $("#spanTrainingSpeed").show();
    $("#spanStop").show();
    $("#spanFastTraining").show();
    $("#spanTable").hide();
    $("#spanNN").hide();
    $("#spanBST").hide();
    $("#spanCurrent").text("Currently training with BST");
}

function startTrainingHuman() {
    window.clearInterval(interval);
    if (t == 0) { //For the first time only
        //Allocate world, initial state and learner
        world = new QLearning.World(2, numberobstacles, heightjump, speedobstacle, speedjump, width, height);
        state = new QLearning.QState([0, 500], world, QLearning.VectorMode.DistanceHeightAction); //The starting state. Starting obstacles positions are 0 and 500
        world.reward_loss = -100;
        world.reward_win = 10;
        world.reward_living = 0;
    }
    
    interval = window.setInterval(core_human, trainingspeed);

    $("#spanTable").hide();
    $("#spanNN").hide();
    $("#spanBST").hide();
    $("#spanCurrent").text("Currently training with Human");
}