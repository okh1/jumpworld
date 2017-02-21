/// <reference path="QLearning\IQLearning.ts" />

module QLearning {
    enum Action { Do_Nothing, Jump };
    export enum VectorMode { Distance, Coordinates, DistanceAction, DistanceHeight, DistanceHeightAction };

    export class World implements IWorld {
        num_actions: number;

        number_obstacles: number; //Number of obstacles
        speed_obstacles: number; //Speed of obstacles
        speed_jump: number; //Speed of jump
        height_jump: number; //Height of jump
        width: number; //Width of canvas
        height: number; //Height of canvas
        reward_loss: number = -100; //-0.11
        reward_win: number = 10; //10
        reward_living: number = 0; //-0.1

        constructor(number_of_actions: number, number_of_obstacles: number, height_of_jump: number, speed_of_obstacles: number, speed_of_jump: number, width: number, height: number) {
            this.num_actions = number_of_actions;
            this.number_obstacles = number_of_obstacles;
            this.speed_obstacles = speed_of_obstacles;
            this.speed_jump = speed_of_jump; this.height_jump = height_of_jump;
            this.width = width; this.height = height;
        }

        makeaction(refstate: QState) {
            var state = refstate.clone();
            if (!this.isactionpermitted(state))
                state.action = Action.Do_Nothing;
            //Move obstacles
            for (var i = 0; i < this.number_obstacles; i++) {
                state.x[i] -= this.speed_obstacles;
                if (state.x[i] < 0)
                    state.x[i] = this.width;
            }
            //If the action is jump, then set direction to "up"
            if (state.action == Action.Jump)
                state.direction = "up";
            //Take care of the jumping part
            if (state.direction == "up")
                state.hero_y -= this.speed_jump;
            else if (state.direction == "down")
                state.hero_y += this.speed_jump;

            if (state.hero_y <= -this.height_jump) {
                state.direction = "down";
            }
            else if (state.hero_y >= 0) {
                state.hero_y = 0;
                state.direction = "null";
            }
            return state;
        }

        reward(state: QState) {
            for (var i = 0; i < this.number_obstacles; i++) {
                if (Math.abs(state.x[i] - state.hero_x) <= 50) {
                    if (state.flag[i] == 1) {
                        if (state.hero_y >= -25) {
                            state.flag[i] = 0;
                            return this.reward_loss;
                        }
                        else if (state.x[i] - state.hero_x == -30) {
                            state.flag[i] = 0;
                            return this.reward_win;
                        }

                    }
                }
                else
                    state.flag[i] = 1;
            }
            //if (state.action == Action.Jump)
            //    return 10;
            return this.reward_living;
        }

        isactionpermitted(state: QState) {
            if (state.action == Action.Jump && state.direction != "null")
                return false;
            else
                return true;
        }

        isfinalreward(reward: number): boolean {
            if (reward == this.reward_living)
                return false;
            else
                return true;
        }

        static getDistance(state: QState) {
            var min = 400; var index = 0;
            for (var i = 0; i < state.world.number_obstacles; i++) {
                if (state.x[i] - state.hero_x - 50 >= 0 && state.x[i] - state.hero_x - 50 < min) {
                    min = state.x[i] - state.hero_x - 50; index = i;
                }
            }
            return min;
        }
    }

    export class QState implements IQState {
        action: Action;
        world: World;
        vector_mode: VectorMode; //Mode for converting a state to a vector of numbers

        x: number[]; //Obstacles' positions as x coordinates
        direction: string; //Used for keeping track of the jump trough states. null = no jumping, up/down = jumping up/down
        hero_x: number; //x coordinarte of our hero. It is fixed as half the width
        hero_y: number; //y coordinate of our hero. It changes when jumping.
        current_score: number; highest_score: number; //Current and highest score, positive numbers
        flag: number[] = []; //Variable used to calculate the score and remember already calculated rewards/losses

        constructor(state: number[], world: World, vector_mode: VectorMode) {
            this.x = state; //Starting obstacles' positions
            this.action = 0;
            this.direction = "null";
            this.hero_x = world.width / 2;
            this.hero_y = 0;
            this.world = world;
            this.current_score = 0; this.highest_score = 0;
            this.vector_mode = vector_mode;
            //Initialize the flag variable. One element for every obstacle set to 1.
            for (var i = 0; i < world.number_obstacles; i++) {
                this.flag.push(1);
            }
        }

        /* Returns a vector numerical representation of the state according to this.vector_mode. */
        ToVector(): number[] {
            if (this.vector_mode == VectorMode.Distance) {
                var x = new Array<number>(1);
                x[0] = World.getDistance(this) / 900;
                return x;
            }
            else if (this.vector_mode == VectorMode.DistanceAction) {
                var x = new Array<number>(3);
                x[0] = World.getDistance(this);
                x[1] = (this.action == Action.Do_Nothing) ? 1 : 0;
                x[2] = (this.action == Action.Jump) ? 1 : 0;
                return x;
            }
            else if (this.vector_mode == VectorMode.DistanceHeight) {
                var x = new Array<number>(2);
                x[0] = World.getDistance(this) / 1000;
                x[1] = this.hero_y / 1000;
                return x;
            }
            else if (this.vector_mode == VectorMode.DistanceHeightAction) {
                var x = new Array<number>(4);
                x[0] = World.getDistance(this);
                x[1] = this.hero_y;
                x[2] = (this.action == Action.Do_Nothing) ? 1 : 0;
                x[3] = (this.action == Action.Jump) ? 1 : 0;
                return x;
            }
        }

        clone() {
            var newstate = new QState(this.x, this.world, this.vector_mode);
            newstate.action = this.action;
            newstate.x = this.x.slice();
            newstate.direction = this.direction;
            newstate.hero_x = this.hero_x;
            newstate.hero_y = this.hero_y;
            newstate.flag = this.flag.slice();
            newstate.current_score = this.current_score; newstate.highest_score = this.highest_score;
            newstate.vector_mode = this.vector_mode;
            return newstate;
        }
        
        isfinalstate(): boolean {
            return false;
        }
    }
}

module Utilities {
    //Returns an integer in [min, max)
    export function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    export function getRandomOneOrMinusOne() {
        return (Math.random() > 0.5) ? 1 : -1;
    }
}