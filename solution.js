{
    init: function(elevators, floors) {
        ////////////////////////
        // Helper Functions
        ////////////////////////

        // Initialize the elevator directions
        function initializeElevator(elevator) {
            elevator.dir = "up";
            setIndicators(elevator);
            // This will allow the elevators to be proactive and park themselves somewhere
            // else while they wait for the first requests (not from ground)
            var chanceOfRandom = Math.floor(Math.random() * 100);

            if (chanceOfRandom <= 30) {
                elevator.goToFloor(bottomFloor, true);
            } else {
                elevator.goToFloor(Math.floor(Math.random() * floors.length), true)
            }
        }

        // Set the elevator direction indicator based on elevator.dir
        function setIndicators(elevator) {
            if (elevator.dir == "up") {
                elevator.goingUpIndicator(true);
                elevator.goingDownIndicator(false);
            } else if (elevator.dir == "down") {
                elevator.goingUpIndicator(false);
                elevator.goingDownIndicator(true);
            }
        }

        // Remove a floor from the given queue
        function removeFloorFromQueue(queue, floorNum) {
            var index = queue.indexOf(floorNum);
            if (index > -1) {
                queue.splice(index, 1);
            }
        }

        // Returns the highest floor requested on the given elevator
        function getHighestPressedFloor(elevator) {
            if (elevator.getPressedFloors().length == 0) {
                return -1;
            }
            return elevator.getPressedFloors().sort()[elevator.getPressedFloors().length - 1];
        }

        // Returns the highest requested floor going down
        function getHighestRequestFloorGoingDown() {
            var offset = 0;
            if (downWaitingQueue.length == 0 || downWaitingQueue.length - 1 < offset) {
                return -1;
            } 
            return downWaitingQueue.sort()[downWaitingQueue.length - 1 - offset];
        }

        // Returns the highest floor the elevator should go to
        function getHighestFloorForElevator(elevator) {
            return Math.max(getHighestRequestFloorGoingDown(), getHighestPressedFloor(elevator));
        }

        // Returns the lowest floor the elevator should go to
        function getLowestFloorForElevator(elevator) {
            return bottomFloor;
        }

        // Returns whether an elevator is scheduled to stop at the given floor in the given direction
        function willAnElevatorStopHere(elevators, curelevator, floorNum, direction) {
            elevators.forEach(function(elevator) {
                var includesFloor = elevator.getPressedFloors().includes(floorNum);
                var sameDir = elevator.dir == direction;
                var sameElevator = elevator.getPressedFloors() == curelevator.getPressedFloors();
                if (sameDir && !sameElevator && includesFloor) {
                    var howFar = Math.abs(elevator.currentFloor() - floorNum)

                    if (howFar <= 2) {
                        console.log("YES")
                        return true;
                    }
                }
            });
            return false;
        }


        ////////////////////////
        // Initialize
        ////////////////////////
        var topFloor = floors.length - 1;
        var bottomFloor = 0;

        var upWaitingQueue = [];
        var downWaitingQueue = [];

        elevators.forEach(initializeElevator);


        ////////////////////
        // Elevator Code
        ////////////////////
        elevators.forEach(function(elevator) {
            elevator.on("passing_floor", function(floorNum, _d) {
                // Stop if one of request floors
                if (elevator.getPressedFloors().includes(floorNum) && elevator.dir != "down") {
                    elevator.goToFloor(floorNum, true);
                }

                // Skip this floor if not one of the requested floors and the elevator is full
                if (elevator.loadFactor() >= 0.6) {
                    return;
                }

                // Skip this floor if another elevator is already going to stop here
                if (willAnElevatorStopHere(elevators, elevator, floorNum, elevator.dir)) {
                    return;
                }

                // Stop if people waiting to go the same dir on the floor
                if (elevator.dir == "up" && upWaitingQueue.includes(floorNum)) {
                    removeFloorFromQueue(upWaitingQueue, floorNum);
                    elevator.goToFloor(floorNum, true);
                } else if (elevator.dir == "down" && downWaitingQueue.includes(floorNum)) {
                    removeFloorFromQueue(downWaitingQueue, floorNum);
                    elevator.goToFloor(floorNum, true);
                }
            });

            elevator.on("stopped_at_floor", function(floorNum, _d) {
                // Bug fix - top/bottom floor doesn't get removed
                if (floorNum == topFloor) {
                    removeFloorFromQueue(downWaitingQueue, floorNum);
                } else if (floorNum == bottomFloor) {
                    removeFloorFromQueue(upWaitingQueue, floorNum);
                }

                // Determines when to reverse the elevator direction
                if (floorNum >= getHighestFloorForElevator(elevator) && floorNum != bottomFloor) {
                    elevator.dir = "down";
                } else if (floorNum <= getLowestFloorForElevator(elevator) && floorNum != topFloor) {
                    elevator.dir = "up";
                }

                setIndicators(elevator);

                // Send it to the top or bottom floor depending on which direction
                // This just forces the elevator to go in the direction we want
                if (elevator.dir == "up") {
                    elevator.goToFloor(getHighestFloorForElevator(elevator), true);
                } else if (elevator.dir == "down") {
                    elevator.goToFloor(getLowestFloorForElevator(elevator), true);
                }
            });

            elevator.on("idle", function() {
                elevator.goToFloor(bottomFloor);
                elevator.dir = "up";
                setIndicators(elevator);
            });
        });

        ////////////////////
        // Floor Code
        ////////////////////
        floors.forEach(function(floor) {
            // Push onto the queue for next elevator heading up to stop at
            floor.on("up_button_pressed", function(){
                if (!upWaitingQueue.includes(floor.floorNum())) {
                    upWaitingQueue.push(floor.floorNum());
                }
            });

            // Push onto the queue for next elevator heading down to stop at
            floor.on("down_button_pressed", function(){
                if (!downWaitingQueue.includes(floor.floorNum())) {
                    downWaitingQueue.push(floor.floorNum());
                }
            });
        });
    },
        update: function(dt, elevators, floors) {
            // We normally don't need to do anything here
        }
}
