{
    init: function(elevators, floors) {
        var requestPickupList = []
        
        function removeAllFromList(ls, item) {
            if (ls.length > 0){
                for( var i = ls.length-1; i--;){
                    if (ls[i] === item) ls.splice(i, 1);
                }
            }
        };

        _.each(elevators, function(elevator) {
            // When elevator is idle, head to a floor with people. 
            elevator.on("idle", function() {
                if (requestPickupList.length > 0){
                    elevator.goToFloor(requestPickupList[0]);
                    removeAllFromList(requestPickupList, requestPickupList[0]); // So that only 1 elevator will go in the event that all are idle
                }
            });

            elevator.on("floor_button_pressed", function(floorNum) {
                elevator.destinationQueue.push(floorNum);
                elevator.checkDestinationQueue();
            });

            elevator.on("passing_floor", function(floorNum, direction) {
                // Don't stop unless the elevator is supposed to stop there or theres room for more people
                if(elevator.loadFactor() > 0.75) {
                    return;
                }
                
                // If the elevator is passing a floor, stop if that floor requested an elevator
                if (requestPickupList.includes(floorNum)) {
                    console.log("Stopping because this floor is requested");
                    elevator.goToFloor(floorNum, true)
                }
                
                // If the elevator is passing a floor, stop if that floor is requested by a passenger
                if (elevator.destinationQueue.includes(floorNum)) {
                    console.log("Stopping because this floor is on the way");
                    elevator.goToFloor(floorNum, true)
                }
            });

            elevator.on("stopped_at_floor", function(floorNum) {
                // If an elevator is stopped at a floor, clear that floor from the requestPickupList since they have been picked up
                removeAllFromList(requestPickupList, floorNum);

                // clear that floor from the elevator queue since all the people have been dropped off
                removeAllFromList(elevator.destinationQueue, floorNum);
            });
        });

        _.each(floors, function(floor) {
            // When a floor requests an elevator, add it to the list so that an elevator passing by can stop
            // or an elevator can come to the floor if the elevator is idle
            floor.on("up_button_pressed down_button_pressed", function(event) {
                var direction = event.indexOf('up') == 0 ? 'up' : 'down';
                requestPickupList.push(floor.level);
            });
        });
    },

        update: function(dt, elevators, floors) {
            // We normally don't need to do anything here
        }
}
