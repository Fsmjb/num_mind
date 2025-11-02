document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration Constants ---
    const TARGET_MULTIPLIER = 0.8; // The core rule of the game
    const TIME_LIMIT_SEC = 20;     // Time limit is 20 seconds
    const TIMEOUT_PENALTY_NUMBER = 100; // Player submits 100 on timeout
    
    // --- JavaScript Color Constants (Matches CSS for inline styling) ---
    const COLOR_SUCCESS = '#4caf50';         
    const COLOR_DANGER = '#f44336';          
    const COLOR_ACCENT_PRIMARY = '#00bcd4';  
    const COLOR_INFO = '#2196f3';            

    // --- Local Storage Keys ---
    const LS_KEY_PLAYERS = 'numMindPlayers_v3'; 
    const LS_KEY_ROUND = 'numMindRound_v3';

    // --- DOM Elements ---
    const case1 = document.getElementById('case_1');
    const case2 = document.getElementById('case_2');
    const case3 = document.getElementById('case_3');
    const case4 = document.getElementById('case_4');

    const startGameBtn = document.getElementById('start_game');
    const resetFullGameBtn = document.getElementById('reset_full_game'); // This button is now outside game cases
    const playerNameInput = document.getElementById('player_name_input');
    const addPlayerBtn = document.getElementById('add_player_btn');
    const playerListDiv = document.getElementById('player_list');
    const playerCountSpan = document.getElementById('player_count');
    const startRoundSetupBtn = document.getElementById('start_round_setup');
    const scoreDisplay = document.getElementById('score_display');
    const startRoundTimerBtn = document.getElementById('start_round_timer'); 
    const numberInputArea = document.getElementById('number_input_area');
    const timerDisplay = document.getElementById('timer_display');
    const currentPlayerPrompt = document.getElementById('current_player_prompt');
    const numberSelectInput = document.getElementById('number_select_input');
    const submitNumberBtn = document.getElementById('submit_number_btn');
    const resultsSummaryDiv = document.getElementById('results_summary');
    const nextRoundBtn = document.getElementById('next_round_btn');

    // --- Game State Variables ---
    let players = [];
    let currentRound = 0;
    let timerInterval;
    let submittedNumbers = {};
    let currentPlayerIndex = 0;

    // --- Core Functions ---

    /** Utility to show only one game case. */
    const showCase = (activeCase) => {
        [case1, case2, case3, case4].forEach(c => c.classList.add('hidden'));
        activeCase.classList.remove('hidden');
    };

    /** Loads data from local storage and initializes the game state. */
    const loadGameState = () => {
        const storedPlayers = localStorage.getItem(LS_KEY_PLAYERS);
        const storedRound = localStorage.getItem(LS_KEY_ROUND);

        if (storedPlayers && storedRound) {
            players = JSON.parse(storedPlayers);
            currentRound = parseInt(storedRound, 10);

            if (players.length > 0) {
                showCase(case3);
                updateScoreDisplay();
                return true;
            }
        }
        return false;
    };

    /** Saves players and round number to local storage. */
    const saveGameState = () => {
        localStorage.setItem(LS_KEY_PLAYERS, JSON.stringify(players));
        localStorage.setItem(LS_KEY_ROUND, currentRound);
    };

    /** Clears all game data and reloads the page. */
    const resetGame = () => {
        if (confirm("Are you sure you want to reset the entire game? All progress will be lost.")) {
            localStorage.removeItem(LS_KEY_PLAYERS); 
            localStorage.removeItem(LS_KEY_ROUND);   
            location.reload(); 
        }
    };

    // --- Case 2: Player Setup Logic ---

    const renderPlayerList = () => {
        playerListDiv.innerHTML = '';
        players.forEach((player, index) => {
            const tag = document.createElement('div');
            tag.className = 'player-tag';
            tag.innerHTML = `
                <span>${player.name}</span>
                <button class="remove-player-btn btn-danger" data-index="${index}">Remove</button>
            `;
            playerListDiv.appendChild(tag);
        });
        playerCountSpan.textContent = players.length;
        startRoundSetupBtn.disabled = players.length < 2;
    };

    addPlayerBtn.addEventListener('click', () => {
        const name = playerNameInput.value.trim();
        if (name && players.length < 10 && !players.some(p => p.name === name)) {
            players.push({ name: name, points: 10, isOut: false });
            playerNameInput.value = '';
            renderPlayerList();
        } else if (players.some(p => p.name === name)) {
            alert("Player name already exists!");
        } else if (players.length >= 10) {
            alert("Maximum 10 players allowed.");
        }
    });

    playerListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-player-btn')) {
            const index = e.target.getAttribute('data-index');
            players.splice(index, 1);
            renderPlayerList();
        }
    });

    startRoundSetupBtn.addEventListener('click', () => {
        currentRound = 1;
        saveGameState();
        showCase(case3);
        updateScoreDisplay();
        
        // Initialize the prompt for the first player of the first round
        const firstActivePlayer = players.find(p => !p.isOut);
        if(firstActivePlayer) {
             currentPlayerPrompt.textContent = `It's ${firstActivePlayer.name}'s turn. Click Start Round!`;
        }
    });

    // --- Case 3: Game Round Logic (Sequential Timed Input) ---

    const updateScoreDisplay = () => {
        scoreDisplay.innerHTML = `<h3>Round ${currentRound} - Current Scores</h3>`;
        players.forEach(player => {
            const card = document.createElement('div');
            card.className = `score-card ${player.isOut ? 'out' : ''}`;
            card.innerHTML = `
                <strong>${player.name}</strong>
                <span class="score">${player.points}</span>
            `;
            scoreDisplay.appendChild(card);
        });

        const activePlayers = players.filter(p => !p.isOut);
        if (activePlayers.length <= 1 && currentRound > 1) {
            endGame(activePlayers[0] ? activePlayers[0].name : 'No one');
        }
    };

    const startTimer = (seconds) => {
        let timeLeft = seconds;
        timerDisplay.textContent = timeLeft;
        numberSelectInput.focus();

        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                
                // Penalty: Submit 100 on timeout
                submittedNumbers[players[currentPlayerIndex].name] = TIMEOUT_PENALTY_NUMBER; 
                currentPlayerPrompt.textContent = `❌ ${players[currentPlayerIndex].name} timed out and submitted ${TIMEOUT_PENALTY_NUMBER}!`;
                
                currentPlayerIndex++; // Move pointer
                
                // Prepare the UI for the next player (or results)
                prepareForNextTurn();
            }
        }, 1000);
    };
    
    // Helper function to prepare the UI after a submission or timeout
    const prepareForNextTurn = () => {
        numberInputArea.classList.add('hidden');
        startRoundTimerBtn.classList.remove('hidden');

        // Skip players who are out to find the next active player
        while (currentPlayerIndex < players.length && players[currentPlayerIndex].isOut) {
            currentPlayerIndex++;
        }

        if (currentPlayerIndex < players.length) {
            // Found the next active player
            const nextPlayer = players[currentPlayerIndex];
            currentPlayerPrompt.textContent = `It's ${nextPlayer.name}'s turn. Click Start Round!`;
            startRoundTimerBtn.textContent = 'Start Turn'; // Change text for subsequent players
        } else {
            // All active players submitted/timed out, calculate results
            processRoundCalculation();
        }
    };


    const setupSubmission = () => {
        // Find the correct starting index again just in case (e.g., if resuming a game)
        while (currentPlayerIndex < players.length && players[currentPlayerIndex].isOut) {
            currentPlayerIndex++;
        }
        
        if (currentPlayerIndex < players.length) {
            const player = players[currentPlayerIndex];
            currentPlayerPrompt.textContent = `▶️ ${player.name}, choose your number!`;
            numberSelectInput.value = '';
            numberSelectInput.disabled = false;
            submitNumberBtn.disabled = false;

            clearInterval(timerInterval);
            startTimer(TIME_LIMIT_SEC); 
        } else {
             // Fallback to calculation if somehow this button was clicked with no active players
             processRoundCalculation();
        }
    };

    const handleSubmitNumber = () => {
        const player = players[currentPlayerIndex];
        let number = parseInt(numberSelectInput.value);

        if (isNaN(number) || number < 0 || number > 100) {
            alert("Enter a valid number between 0 and 100.");
            numberSelectInput.focus();
            return;
        }

        clearInterval(timerInterval);
        submittedNumbers[player.name] = number;
        currentPlayerPrompt.textContent = `✅ ${player.name} submitted ${number}.`;

        currentPlayerIndex++; // Move pointer

        // Prepare the UI for the next player (or results)
        prepareForNextTurn();
    };

    startRoundTimerBtn.addEventListener('click', () => {
        // If this is the start of a brand new round, reset submitted data
        if (startRoundTimerBtn.textContent === 'Start Round!') {
            submittedNumbers = {};
            currentPlayerIndex = 0;
        }
        
        const activePlayers = players.filter(p => !p.isOut);
        if (activePlayers.length < 2 && currentRound > 0) {
             endGame(activePlayers[0] ? activePlayers[0].name : 'No one');
             return;
        }

        startRoundTimerBtn.classList.add('hidden');
        numberInputArea.classList.remove('hidden');
        
        setupSubmission();
    });

    submitNumberBtn.addEventListener('click', handleSubmitNumber);
    numberSelectInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !submitNumberBtn.disabled) {
            handleSubmitNumber();
        }
    });

    // --- Case 4: Results and Next Round Logic ---

    const processRoundCalculation = () => {
        const activePlayers = players.filter(p => !p.isOut);
        const playerNumbers = activePlayers.map(p => submittedNumbers[p.name]);
        
        const sum = playerNumbers.reduce((a, b) => a + b, 0);
        const average = activePlayers.length > 0 ? sum / activePlayers.length : 0;
        
        // CORE RULE: Average * 0.8 is the Target
        const targetValue = average * TARGET_MULTIPLIER; 

        let leastDifference = Infinity;
        let winners = [];

        // Find the winner(s)
        for (const player of activePlayers) {
            const playerNum = submittedNumbers[player.name];
            const difference = Math.abs(playerNum - targetValue);

            if (difference < leastDifference) {
                leastDifference = difference;
                winners = [player.name];
            } else if (difference === leastDifference) {
                winners.push(player.name);
            }
        }

        // Update Points and generate HTML
        let resultsHTML = `
            <p>🔢 **Round Average:** ${average.toFixed(2)}</p>
            <p>🎯 **Target Calculation:** ${average.toFixed(2)} × ${TARGET_MULTIPLIER} = <span style="color:${COLOR_ACCENT_PRIMARY}; font-weight:bold;">${targetValue.toFixed(2)}</span></p>
            <p class="winner-p">🏆 **Winner(s):** ${winners.join(', ')}</p>
            <p>Closest Difference: ${leastDifference.toFixed(2)}</p>
            <hr style="border-color: #555;">
            <h3 style="color:${COLOR_INFO}; text-align:center;">Score Changes</h3>
        `;

        players.forEach(player => {
            if (!player.isOut) {
                let oldPoints = player.points;
                let numSubmitted = submittedNumbers[player.name] || 0;
                let pointsChange = 0;

                if (winners.includes(player.name)) {
                    player.points = Math.min(10, player.points + 1);
                    pointsChange = player.points - oldPoints;
                } else {
                    player.points -= 1;
                    pointsChange = -1;
                }

                if (player.points < 1) {
                    player.isOut = true;
                }
                
                const changeColor = pointsChange > 0 ? COLOR_SUCCESS : COLOR_DANGER;

                resultsHTML += `
                    <p>
                        **${player.name}** chose: **${numSubmitted}** | 
                        <span style="color:${changeColor}; font-weight:bold;">${pointsChange > 0 ? '+' : ''}${pointsChange}</span> 
                        → **${player.points}** ${player.isOut ? '(OUT)' : ''}
                    </p>
                `;
            } else {
                resultsHTML += `<p style="opacity:0.7;">**${player.name}** is already out.</p>`;
            }
        });

        currentRound++;
        saveGameState();
        resultsSummaryDiv.innerHTML = resultsHTML;
        showCase(case4);
    };

    nextRoundBtn.addEventListener('click', () => {
        // Reset button text for the start of a new round
        startRoundTimerBtn.textContent = 'Start Round!'; 
        
        showCase(case3);
        updateScoreDisplay();
        startRoundTimerBtn.classList.remove('hidden');
        numberInputArea.classList.add('hidden');
        
        // Set the prompt for the next round's first player
        const firstActivePlayer = players.find(p => !p.isOut);
        if(firstActivePlayer) {
             currentPlayerPrompt.textContent = `It's ${firstActivePlayer.name}'s turn. Click Start Round!`;
        }
        
        const activePlayers = players.filter(p => !p.isOut);
        if (activePlayers.length <= 1) {
            endGame(activePlayers[0] ? activePlayers[0].name : 'No one');
        }
    });

    const endGame = (winnerName) => {
        showCase(case4);
        resultsSummaryDiv.innerHTML = `
            <h2 class="text-center result-heading">🔥 Game Over! 🔥</h2>
            <p class="winner-p">${winnerName === 'No one' ? 'No clear winner remains!' : `The ultimate champion is: **${winnerName}**!`}</p>
            <p class="text-center info-text">Thank you for playing Num Mind!</p>
        `;
        nextRoundBtn.classList.add('hidden');
    };


    // --- Initialization and Event Listeners ---

    startGameBtn.addEventListener('click', () => {
        players = [];
        currentRound = 0;
        showCase(case2);
        renderPlayerList();
    });

    // Reset Game Button Event Listener is connected here
    resetFullGameBtn.addEventListener('click', resetGame);

    // Initial load check
    if (!loadGameState()) {
        showCase(case1);
    }
});