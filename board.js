// MAJOR credit goes to github.com/PeterBeard

const AIRCRAFT_WALL_HEIGHT = 15;
const AIRCRAFT_PADDING = 10;
const CELLSIZE = 64;

class Cell {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.contents = new Set();
        this.up = null;
        this.down = null;
        this.left = null;
        this.right = null;
    }
    isEmpty() {
        return this.contents.size === 0;
    }

    render(ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.fillRect(this.x, this.y, CELLSIZE, CELLSIZE);
        this.renderContents(ctx);
    }

    renderContents(ctx) {
        for (const c of this.contents) {
            c.render(ctx, this.x, this.y);
        }
    }

    toString() {
        return `${this.x}, ${this.y}: ` + Array.from(this.contents).join();
    }
}

class Renderable {
    constructor(passengerValue) {
        this.passengerValue = passengerValue;
    }

    render(ctx, x, y) {
        ctx.fillStyle = 'rgba(0, 0, 255, 1)';
        ctx.fillRect(x + CELLSIZE / 4, y + CELLSIZE / 4, CELLSIZE / 2, CELLSIZE / 2);
        const fontSize = CELLSIZE / 4;
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(this.passengerValue, x + CELLSIZE / 3, y + CELLSIZE / 2);
    }
}

class Agent extends Renderable {
    constructor(startingCell, passengerValue) {
        super(passengerValue);
        this.cell = startingCell;
        if (startingCell) {
            startingCell.contents.add(this);
        }
        this.state = null;
        this.timeToTransition = 0;
    }

    initializeAt(cell, state) {
        this.cell = cell;
        this.cell.contents.add(this);
        this.state = state;
    }

    move(newCell) {
        
        this.cell.contents.delete(this);
        this.cell = newCell;
        newCell.contents.add(this);
    }

    simulate(deltaT) {
        
        return;
    }
}

class Seat extends Cell {
    constructor(x, y, row, col) {
        super(x, y);
        this.row = row;
        this.col = col;
        this.color = 'rgba(242, 169, 34, 1.0)';
    }
    render(ctx) {
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 2, this.y + 6, CELLSIZE - 12, CELLSIZE - 12);;

        
        const fontSize = CELLSIZE / 3;
        const fontYPos = this.y + CELLSIZE - fontSize * 1.1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(this.row + this.col, this.x + 6, fontYPos);
        this.renderContents(ctx);
    }
    toString() {
        return this.row + this.col;
    }
}

const State = Object.freeze({
    Seated: 'seated',
    Searching: 'searching',
    LoadingUp: 'loading_up',
    LoadingDown: 'loading_down',
});


class Passenger extends Agent {
    constructor(cell, targetSeat, luggageDistribution, passengerValue) {
        super(cell, passengerValue);
        this.targetSeat = targetSeat;
        this.luggageDistribution = luggageDistribution;
    }
    simulate(deltaT) {
        
        if (this.state === State.Seated || this.state === null) {
            
            return;
        } else if (this.state === State.Searching) {
            
            
            if (this.cell.up && this.cell.up.row === this.targetSeat.row && this.cell.up.col >= this.targetSeat.col) {
                this.state = State.LoadingUp;
                this.timeToTransition = this.luggageDistribution();
            } else if (this.cell.down && this.cell.down.row === this.targetSeat.row && this.cell.down.col <= this.targetSeat.col) {
                this.state = State.LoadingDown;
                this.timeToTransition = this.luggageDistribution();
            } else {
                
                if (this.cell.right) {
                    if (!this.cell.right.isEmpty()) {} else {
                        this.move(this.cell.right);
                    }
                } else {
                    console.error('Passenger failed to find seat: ' + this.targetSeat.row + this.targetSeat.col);
                }
            }
        } else if (this.state === State.LoadingUp) {
            this.timeToTransition -= deltaT;
            if (this.timeToTransition <= 0) {
                this.move(this.cell.up);
                if (this.cell === this.targetSeat) {
                    this.state = State.Seated;
                }
            }
        } else if (this.state === State.LoadingDown) {
            this.timeToTransition -= deltaT;
            if (this.timeToTransition <= 0) {
                this.move(this.cell.down);
                if (this.cell === this.targetSeat) {
                    this.state = State.Seated;
                }
            }
        } else {
            console.error('Unhandled state: ' + this.state);
        }
    }
    toString() {
        return this.targetSeat.toString() + ' [' + this.state + ']';
    }
}

class Aircraft {
    constructor(startingCell) {
        this.grid = [];
        this.startingCell = startingCell;
        this.addCell(startingCell);
        this.seats = [];
        
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        
        this.rows = new Set();
        this.cols = new Set();
    }

    addCell(newCell) {
        this.grid.push(newCell);
        if (newCell.row) {
            this.rows.add(newCell.row);
        }
        if (newCell.col) {
            this.cols.add(newCell.col);
        }
        this.updateBoundingBox();
    }

    get rowCount() {
        return this.rows.size;
    }

    get colCount() {
        return this.cols.size;
    }

    addSeat(newSeat) {
        this.seats.push(newSeat);
    }

    board(passenger) {
        if (this.startingCell.isEmpty()) {
            passenger.initializeAt(this.startingCell, State.Searching);
        } else {
            throw 'Cannot board passenger ' + passenger + '; starting cell is full!';
        }
    }

    findSeat(seatId) {
        const match = seatId.match(/([0-9]+)([A-Z]+)/);
        if (!match) {
            return null;
        }
        const targetRow = match[1];
        const targetCol = match[2];
        for (const seat of this.seats) {
            if (seat.row == targetRow && seat.col == targetCol) {
                return seat;
            }
        }
        return null;
    }

    updateBoundingBox() {
        let x1 = 0;
        let y1 = 0;
        let x2 = 0;
        let y2 = 0;
        for (const cell of this.grid) {
            if (cell.x < x1) {
                x1 = cell.x;
            } else if (cell.x > x2) {
                x2 = cell.x;
            }
            if (cell.y < y1) {
                y1 = cell.y;
            } else if (cell.y > y2) {
                y2 = cell.y;
            }
        }
        this.x = x1;
        this.y = y1;

        this.height = y2 - this.y + CELLSIZE;
        this.width = x2 - this.x + CELLSIZE;

        this.tailLength = this.height * 1.5;
        this.fuselageLength = this.width;
        this.noseLength = this.height * 1.5;

        this.top = this.y - (AIRCRAFT_PADDING + AIRCRAFT_WALL_HEIGHT);
        this.left = this.x - this.noseLength;
        this.bottom = this.top + this.height + 2 * AIRCRAFT_PADDING + 2 * AIRCRAFT_WALL_HEIGHT;
        this.right = this.left + this.noseLength + this.fuselageLength + this.tailLength;
    }

    render(ctx) {

        
        ctx.fillStyle = 'rgba(220, 220, 230, 1.0)';
        ctx.fillRect(this.x, this.y - AIRCRAFT_WALL_HEIGHT - AIRCRAFT_PADDING, this.fuselageLength, AIRCRAFT_WALL_HEIGHT);
        ctx.fillRect(this.x, this.y + this.height + AIRCRAFT_PADDING, this.fuselageLength, AIRCRAFT_WALL_HEIGHT);

        ctx.fillStyle = 'rgba(180, 180, 185, 1.0)';
        ctx.fillRect(this.x, this.y - AIRCRAFT_PADDING, this.fuselageLength, this.height + 2 * AIRCRAFT_PADDING);

        
        for (const cell of this.grid) {
            cell.render(ctx);
        }
    }
}

function generateAircraft(seatLayout) {
    const startingCell = new Cell(0, 0);
    const aircraft = new Aircraft(startingCell);
    let prevAisle = startingCell;
    let x = 0;
    let rowIndex = 1;
    for (let rowSpec of seatLayout) {
        for (let i = 0; i < rowSpec.repeat; i++) {
            x += CELLSIZE;
            let prevCell = null;
            let seatIndex = 0;
            for (let j = 0; j < rowSpec.layout.length; j++) {
                const cellType = rowSpec.layout.charAt(j);
                const y = j * CELLSIZE;
                let newCell = null;
                
                if (cellType === 'S') {
                    
                    const colName = String.fromCharCode(65 + seatIndex);
                    newCell = new Seat(x, y, rowIndex, colName);
                    seatIndex++;
                    aircraft.addSeat(newCell);
                } else if (cellType === 'A') {
                    
                    newCell = new Cell(x, y);
                    newCell.left = prevAisle;
                    prevAisle.right = newCell;
                    prevAisle.y = newCell.y; 
                    prevAisle = newCell;
                } else if (cellType === '+') {
                    
                    seatIndex++;
                    continue;
                } else {
                    
                    continue;
                }
                if (prevCell) {
                    
                    prevCell.down = newCell;
                    newCell.up = prevCell;
                }
                prevCell = newCell;
                aircraft.addCell(newCell);
            }
            rowIndex += 1;
        }
    }
    
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');
    const scaleFactor = Math.min(Math.min(canvas.width / aircraft.width, canvas.height / aircraft.height) * 0.95, 1.0);
    ctx.scale(scaleFactor, scaleFactor);
    const deltaX = canvas.width / 2 - aircraft.width / 2 * scaleFactor;
    const deltaY = canvas.height / 2 - aircraft.height / 2 * scaleFactor;
    ctx.translate(deltaX, deltaY);

    return aircraft;
}

function functionTest(i, paxCount) {
    return paxCount - i;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
}

function generateAircraftFromForm() {
    const rows = document.getElementById('rows').value * 1;
    const cols = document.getElementById('cols').value * 1;
    
    seatLayout = [{
        repeat: rows,
        layout: 'S'.repeat(cols) + 'A' + 'S'.repeat(cols),
    }];
    return generateAircraft(seatLayout);
}

function generateAndRenderAircraft() {
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');
    const aircraft = generateAircraftFromForm();
    aircraft.render(ctx);
}

function clearCanvas() {
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function arrangeBackFront(passengers, aircraft) {
    return passengers;
}

function arrangeFrontBack(passengers, aircraft) {
    return passengers.reverse();
}

function arrangeRandom(passengers, aircraft) {
    shuffleArray(passengers);
    return passengers;
}

function arrangeSteffen(passengers, aircraft) {
    const seatMap = {};
    for (const p of passengers) {
        seatMap[p.targetSeat.toString()] = p;
    }

    
    const sortedPassengers = new Array();
    let rightCol = 0;
    let leftCol = aircraft.colCount - 1;
    while (leftCol >= rightCol) {
        
        const rightColName = String.fromCharCode(65 + rightCol);
        const leftColName = String.fromCharCode(65 + leftCol);
        for (let row = aircraft.rowCount; row > 0; row -= 2) {
            let seat = row + rightColName;
            let passenger = seatMap[seat];
            if (passenger !== undefined) {
                sortedPassengers.push(seatMap[seat]);
            }
            console.log('R Boarding ' + seat);
            if (leftCol !== rightCol) {
                seat = row + leftColName;
                console.log('L Boarding ' + seat);
                passenger = seatMap[seat];
                if (passenger !== undefined) {
                    sortedPassengers.push(seatMap[seat]);
                }
            }
        }
        for (let row = aircraft.rowCount - 1; row > 0; row -= 2) {
            let seat = row + rightColName;
            console.log('R Boarding ' + seat);
            let passenger = seatMap[seat];
            if (passenger !== undefined) {
                sortedPassengers.push(seatMap[seat]);
            }
            if (leftCol !== rightCol) {
                seat = row + leftColName;
                console.log('L Boarding ' + seat);
                passenger = seatMap[seat];
                if (passenger !== undefined) {
                    sortedPassengers.push(seatMap[seat]);
                }
            }
        }
        console.log('--');
        
        leftCol--;
        rightCol++;
    }
    sortedPassengers.reverse();
    console.log(sortedPassengers);
    return sortedPassengers;
}

async function simulate(simStatus, tickLengthms, luggageDistribution) {
    if (tickLengthms === undefined) {
        
        tickLengthms = 500;
    }
    if (luggageDistribution === undefined) {
        
        luggageDistribution = function () {
            return 10000;
        };
    }
    setStatus('Starting simulation');
    const canvas = document.getElementById('simulation');
    const ctx = canvas.getContext('2d');

    
    const aircraft = generateAircraftFromForm();
    
    let pendingPax = [];
    const activePax = [];
    const paxCount = aircraft.seats.length;
    for (let i = 0; i < paxCount; i++) {
        const targetSeat = aircraft.seats[i];
        const passengerValue = functionTest(i, paxCount);
        let pax = new Passenger(null, targetSeat, luggageDistribution, passengerValue);
        pendingPax.push(pax);
    }

    
    const method = document.querySelector('input[name="method"]:checked').value;
    if (method === 'random') {
        
        pendingPax = arrangeRandom(pendingPax, aircraft);
    } else if (method === 'btf') {
        
        pendingPax = arrangeBackFront(pendingPax, aircraft);
    } else if (method === 'ftb') {
        
        pendingPax = arrangeFrontBack(pendingPax, aircraft);
    } else if (method === 'steffen') {
        
        pendingPax = arrangeSteffen(pendingPax, aircraft);
    } else {
        console.error('Unknown boarding method: ' + method + '; using BTF');
    }

    
    setStatus(`Boarding ${paxCount} passengers (${method} method)...`);
    const maxIterations = 10000;
    let iterCount = 0;
    const timeStep = document.getElementById('time_step').value * 1;
    while (simStatus.run && iterCount < maxIterations) {
        
        
        const startTime = new Date();
        if (pendingPax.length > 0 && aircraft.startingCell.isEmpty()) {
            const nextPax = pendingPax.pop();
            aircraft.board(nextPax);
            activePax.push(nextPax);
        }
        
        aircraft.render(ctx);
        
        if (activePax.filter(p => p.state !== State.Seated).length === 0) {
            setStatus(`All ${paxCount} passengers seated after ${iterCount} iterations`);
            break;
        }
        for (const p of activePax) {
            p.simulate(tickLengthms);
        }
        iterCount++;
        const elapsed = Date.now() - startTime;
        const deltaT = timeStep - elapsed;
        
        await new Promise(resolve => setTimeout(resolve, deltaT));
    }
    if (!simStatus.run) {
        const msg = `Simulation aborted after ${iterCount} iterations`;
        console.log(msg);
        setStatus(msg);
    }
}

function setStatus(message) {
    document.getElementById('status').innerHTML = message;
}


const simStatus = {
    run: true,
};
let currentSim = null;


window.addEventListener('load', e => {
    const choice = document.getElementById('layout_preset').value;
    if (choice === 'coords') {
        document.getElementById('row_col_params').classList.remove('hidden');
    }
    generateAndRenderAircraft();
});
document.getElementById('render_button').addEventListener('click', e => {
    e.preventDefault();
    clearCanvas();
    generateAndRenderAircraft();
});
document.getElementById('simulate_button').addEventListener('click', e => {
    e.preventDefault();
    clearCanvas();
    if (currentSim) {
        console.log('Cancelling current simulation');
        simStatus.run = false;
        currentSim.then(() => {
            simStatus.run = true;
            currentSim = simulate(simStatus);
        });
    } else {
        simStatus.run = true;
        currentSim = simulate(simStatus);
    }
});
document.getElementById('layout_preset').addEventListener('change', e => {
    const choice = e.target.value;
    if (choice === 'coords') {
        document.getElementById('row_col_params').classList.remove('hidden');
    } else {
        document.getElementById('row_col_params').classList.add('hidden');
    }
});