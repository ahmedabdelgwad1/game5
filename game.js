/* ============================================
   GAME CONTROLLER
   Football IDSS Logic & DOM Management
   ============================================ */

class GameController {
    constructor() {
        this.engine = new InferenceEngine(KnowledgeBase);
        this.currentScenarioIndex = 0;
        this.scenario = null;
        this.selectedSub = null;
        
        // Pitch Animation Interval
        this.pitchInterval = null;
    }

    startGame() {
        document.getElementById('splash-screen').classList.remove('active');
        document.getElementById('splash-screen').style.display = 'none';

        const target = document.getElementById('game-screen');
        target.style.display = 'flex';
        target.offsetHeight; // force reflow
        target.classList.add('active');

        this.setupScenario('fresh', false); // Do not auto-play on initial boot
    }

    setupScenario(mode, autoplay = true) {
        clearInterval(this.matchInterval);
        
        this.squad = [
            { id: 'p1', name: 'Ter Stegen', role: 'GK', fatigue: 5 },
            { id: 'p2', name: 'Balde', role: 'LB', fatigue: 15 },
            { id: 'p3', name: 'Araujo', role: 'CB', fatigue: 10 },
            { id: 'p4', name: 'Cubarsi', role: 'CB', fatigue: 12 },
            { id: 'p5', name: 'Kounde', role: 'RB', fatigue: 18 },
            { id: 'p6', name: 'Pedri', role: 'CM', fatigue: 15 },
            { id: 'p7', name: 'De Jong', role: 'CDM', fatigue: 14 },
            { id: 'p8', name: 'Gavi', role: 'CM', fatigue: 16 },
            { id: 'p9', name: 'Raphinha', role: 'LW', fatigue: 17 },
            { id: 'p10', name: 'Lewandowski', role: 'ST', fatigue: 14 },
            { id: 'p11', name: 'Yamal', role: 'RW', fatigue: 19 }
        ];

        this.bench = [
            { id: 's1', name: 'Ferran', role: 'FW', fatigue: 0 },
            { id: 's2', name: 'Felix', role: 'LW', fatigue: 0 },
            { id: 's3', name: 'Christensen', role: 'DF', fatigue: 0 },
            { id: 's4', name: 'Fermin', role: 'CM', fatigue: 0 },
            { id: 's5', name: 'Romeu', role: 'CDM', fatigue: 0 },
            { id: 's6', name: 'Fort', role: 'LB', fatigue: 0 },
            { id: 's7', name: 'Martinez', role: 'CB', fatigue: 0 }
        ];

        if (mode === 'random') {
            const randomMin = Math.floor(Math.random() * 40) + 40;
            this.matchState = {
                minute: randomMin,
                homeScore: Math.floor(Math.random() * 3),
                awayScore: Math.floor(Math.random() * 3),
                homePossession: Math.floor(Math.random() * 40) + 30,
                weather: Math.random() > 0.5 ? 'Rain' : 'Clear',
                oppFatigue: Math.floor(Math.random() * 40) + 20,
                isPlaying: false,
                halftimeDone: randomMin >= 45
            };
            this.matchState.awayPossession = 100 - this.matchState.homePossession;
            this.subsRemaining = 5;
            this.squad.forEach(p => p.fatigue = Math.floor(Math.random() * 30) + 10);
            document.getElementById('explanation-box').innerHTML = `<div class="empty-state">Started Random Scenario!</div>`;
        } else {
            this.matchState = {
                minute: 0, homeScore: 0, awayScore: 0,
                homePossession: 50, awayPossession: 50,
                weather: 'Clear', oppFatigue: 10, isPlaying: false,
                halftimeDone: false
            };
            this.subsRemaining = 5;
            document.getElementById('explanation-box').innerHTML = `<div class="empty-state">Fresh Match Started...</div>`;
        }

        document.getElementById('btn-next-scenario').textContent = '▶️ Play Match';
        document.getElementById('btn-next-scenario').disabled = false;
        
        this.startDynamicMatch();
        if (autoplay) this.toggleMatch(); // AUTO-START TICKING WHEN SCENARIO SPAWNS
    }

    toggleMatch() {
        if (this.matchState.isPlaying) {
            clearInterval(this.matchInterval);
            this.matchState.isPlaying = false;
            document.getElementById('btn-next-scenario').textContent = '▶️ Continue Match';
        } else {
            this.matchState.isPlaying = true;
            document.getElementById('btn-next-scenario').textContent = '⏸ Pause Match';
            this.matchInterval = setInterval(() => this.tickMinute(), 1000); // 1 sec = 1 min
        }
    }

    tickMinute() {
        if (this.matchState.minute >= 90) {
            if (this.matchState.isPlaying) this.toggleMatch();
            document.getElementById('match-minute').textContent = "FT";
            document.getElementById('btn-next-scenario').disabled = true;
            return;
        }

        this.matchState.minute++;
        
        // HALFTIME LOGIC
        if (this.matchState.minute === 46 && !this.matchState.halftimeDone) {
            this.matchState.halftimeDone = true;
            this.matchState.minute = 45; // Display 45 for the break
            
            if (this.matchState.isPlaying) this.toggleMatch();
            
            document.getElementById('match-minute').textContent = "HT";
            document.getElementById('btn-next-scenario').textContent = '▶️ Start 2nd Half';
            
            // Recover fatigue between halves
            this.squad.forEach(p => p.fatigue = Math.max(0, p.fatigue - 20));
            this.matchState.oppFatigue = Math.max(0, this.matchState.oppFatigue - 20);
            
            this.liveUpdateSubDropdowns();
            
            document.getElementById('explanation-box').innerHTML = `
                <div style="text-align:center; padding: 2rem; background:rgba(0,0,0,0.5); border-radius:10px;">
                    <h2 style="color:var(--accent-orange); font-size:2.5rem; margin-bottom:10px;">⏱ Halftime</h2>
                    <p style="color:var(--text-muted);">Players took a breather in the dressing room and recovered 20% stamina. Review your tactics before the second half starts!</p>
                </div>
            `;
            return; // Skip evaluation this exact tick
        }

        // Fatigue increase logic for all 11 players
        const pressing = parseInt(document.getElementById('slider-pressing').value);
        const tempo = parseInt(document.getElementById('slider-tempo').value);
        
        let baseDrain = 0.15 + (pressing / 400) + (tempo / 500);
        if (this.matchState.weather === 'Rain') baseDrain *= 1.25; // Rain tires players out more
        
        let totalHomeFatigue = 0;
        this.squad.forEach(p => {
            let mult = 1.0;
            if (p.role === 'GK') mult = 0.1;
            if (p.role.includes('W') || p.role === 'LB' || p.role === 'RB') mult = 1.6;
            
            p.fatigue += (baseDrain * mult);
            if (p.fatigue > 100) p.fatigue = 100;
            totalHomeFatigue += p.fatigue;
        });

        // Opponent gets tired faster if Barcelona holds possession!
        let oppDrain = 0.3 + (this.matchState.homePossession / 100);
        if (this.matchState.weather === 'Rain') oppDrain *= 1.25;
        this.matchState.oppFatigue += oppDrain;

        let avgHomeFatigue = totalHomeFatigue / 11;
        
        // INTERACTIVE SYSTEM: If we are significantly more tired than opponents, our possession natively bleeds out
        if (avgHomeFatigue > this.matchState.oppFatigue + 15) {
            this.matchState.homePossession = Math.max(10, this.matchState.homePossession - 1);
        }

        document.getElementById('match-minute').textContent = this.matchState.minute;

        this.evaluateCurrentState();
        
        // Evaluate live tactics against these facts
        this.runInferenceEngine();
        this.liveEvaluate();
        
        // Probability Goal Engine
        const mentalityVal = parseInt(document.getElementById('slider-mentality').value);
        const tempoVal = parseInt(document.getElementById('slider-tempo').value);
        const userChoices = { mentality: mentalityVal, pressing: pressing, tempo: tempoVal };
        const result = this.engine.evaluateDecision(this.scenario, userChoices);
        
        // Dynamic Possession Logic based on Tactical Accuracy
        if (result.score >= 75) {
            this.matchState.homePossession = Math.min(85, this.matchState.homePossession + 2);
        } else if (result.score <= 40) {
            this.matchState.homePossession = Math.max(15, this.matchState.homePossession - 3);
        } else {
            // Drift back to 50 if neutral
            if (this.matchState.homePossession > 50) this.matchState.homePossession -= 1;
            else if (this.matchState.homePossession < 50) this.matchState.homePossession += 1;
        }
        this.matchState.awayPossession = 100 - this.matchState.homePossession;

        // Scoring logic based on evaluation score (0-100) and Possession
        let rand = Math.random() * 100;
        let possessionMultiplier = this.matchState.homePossession / 50; 
        
        // Exponential reward: Good tactics heavily boost goals, mediocre tactics do nothing.
        let squaredScore = Math.pow(result.score / 100, 2);
        let xg = squaredScore * 6.0 * possessionMultiplier; // Up to 6% per min if perfect
        
        // Brutal Punishment System: If score drops, concede risk multiplies heavily!
        let riskFactor = (100 - result.score) / 100;
        let concedeRisk = 99.8 - (riskFactor * 12); // If score=0, 12% chance per min (1 goal every 8 mins!)
        
        // More opponent possession means higher concede risk
        if (this.matchState.awayPossession > 60) concedeRisk -= 2.0; 

        if (rand < xg) {
            this.matchState.homeScore++;
            this.updateScoreBoard();
            document.getElementById('explanation-box').innerHTML += `<div style="color:var(--accent-primary); font-weight:bold; margin-top:10px;">⚽ ${this.matchState.minute}' GOAL (FCB)! Brilliant Tactics & Possession Control!</div>`;
        } else if (rand > concedeRisk) { // Chance to concede if tactics are bad
            this.matchState.awayScore++;
            this.updateScoreBoard();
            document.getElementById('explanation-box').innerHTML += `<div style="color:var(--accent-red); font-weight:bold; margin-top:10px;">💔 ${this.matchState.minute}' CONCEDED! Defense compromised and lost ball control!</div>`;
        }
        
        this.populateContextGrid();
        this.liveUpdateSubDropdowns();
    }
    
    liveUpdateSubDropdowns() {
        const outSelect = document.getElementById('sub-out');
        if (!outSelect) return;
        Array.from(outSelect.options).forEach(opt => {
            const player = this.squad.find(p => p.id === opt.value);
            if (player) {
                opt.textContent = `${player.name} (${player.role}) - ${Math.floor(player.fatigue)}%`;
            }
        });
    }

    updateScoreBoard() {
        document.getElementById('score-home').textContent = this.matchState.homeScore;
        document.getElementById('score-away').textContent = this.matchState.awayScore;
        
        const scoreBoard = document.querySelector('.scoreboard');
        scoreBoard.style.transform = 'scale(1.2)';
        setTimeout(() => scoreBoard.style.transform = 'scale(1)', 400);
    }

    startDynamicMatch() {
        document.getElementById('match-minute').textContent = this.matchState.minute;
        this.updateScoreBoard();
        this.evaluateCurrentState();
        this.populateContextGrid();
        this.renderSubDropdowns();
        this.startPitchAnimation();
        this.updateSliders(); // This internally calls liveEvaluate() and runInferenceEngine() via evaluateCurrentState now pre-set
    }

    evaluateCurrentState() {
        if(!this.squad) return;
        let sortedSquad = [...this.squad].sort((a, b) => b.fatigue - a.fatigue);
        const mostTired = sortedSquad[0];

        const facts = [];
        const goalDiff = this.matchState.homeScore - this.matchState.awayScore;

        if (goalDiff < 0) facts.push("status_losing");
        else if (goalDiff > 0) facts.push("status_winning");
        else facts.push("status_drawing");

        if (this.matchState.minute > 75) {
            facts.push("time_late");
            facts.push("time_mid");
        } else if (this.matchState.minute > 45) {
            facts.push("time_mid");
        }

        if (this.matchState.weather === 'Rain') facts.push("weather_rain");

        if (mostTired.fatigue > 75) facts.push("player_fatigue_high");
        if (this.matchState.oppFatigue > 75) facts.push("opp_fatigue_high");

        // Base Barcelona logic
        let optimal = { 
            mentality: {min: 50, max: 80}, 
            pressing: {min: 60, max: 85},  
            tempo: {min: 40, max: 70} 
        };
        
        // Dynamic Goal Difference x Match Time (Deep Strategy Matrix)
        if (goalDiff <= -2) {
            // Losing by 2+
            optimal.mentality = {min: 80, max: 100};
            optimal.pressing = {min: 85, max: 100};
            optimal.tempo = {min: 70, max: 100};
            // PANIC at the end
            if (facts.includes("time_late")) {
                optimal.mentality = {min: 95, max: 100}; 
                optimal.pressing = {min: 95, max: 100};
                optimal.tempo = {min: 90, max: 100};
            }
        } else if (goalDiff === -1) {
            // Losing by 1
            if (facts.includes("time_late")) {
                optimal.mentality = {min: 85, max: 100}; // Rush for equalizer
                optimal.pressing = {min: 85, max: 100};
                optimal.tempo = {min: 75, max: 100};
            } else {
                optimal.mentality = {min: 65, max: 90}; // Play strongly but composed
                optimal.pressing = {min: 70, max: 95};
            }
        } else if (goalDiff === 1) {
            // Winning by 1
            if (facts.includes("time_late")) {
                optimal.mentality = {min: 20, max: 50}; // Protect narrow lead
                optimal.pressing = {min: 30, max: 60};
                optimal.tempo = {min: 20, max: 50};
            } else {
                optimal.mentality = {min: 40, max: 70}; // Standard lead protection
            }
        } else if (goalDiff >= 2) {
            // Winning Comfortably
            if (facts.includes("time_late")) {
                optimal.mentality = {min: 10, max: 30}; // Kill the game entirely
                optimal.pressing = {min: 20, max: 40};
                optimal.tempo = {min: 0, max: 30}; 
            } else {
                optimal.mentality = {min: 30, max: 60}; // Safe possession
                optimal.pressing = {min: 40, max: 70};
                optimal.tempo = {min: 30, max: 60}; 
            }
        }
        
        if (facts.includes("weather_rain")) {
            optimal.tempo = {min: 60, max: 100}; // Fast/Direct play compensates for slips
        }
        
        if (facts.includes("player_fatigue_high")) {
            optimal.subId = "s1"; 
        }

        this.scenario = {
            facts: facts,
            optimal: optimal,
            fatigueAlert: { name: mostTired.name, fatigue: Math.floor(mostTired.fatigue) },
            opponentProfile: { style: "Normal", fatigue: Math.floor(this.matchState.oppFatigue) }
        };
    }

    renderSubDropdowns() {
        document.getElementById('subs-count').textContent = this.subsRemaining;
        
        const outSelect = document.getElementById('sub-out');
        const inSelect = document.getElementById('sub-in');
        
        // Populate Out Select
        // Sort squad by fatigue to help user
        let sortedSquad = [...this.squad].sort((a,b) => b.fatigue - a.fatigue);
        outSelect.innerHTML = sortedSquad.map(p => `<option value="${p.id}">${p.name} (${p.role}) - ${Math.floor(p.fatigue)}%</option>`).join('');
        
        // Populate In Select
        inSelect.innerHTML = this.bench.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');
        
        if (this.subsRemaining <= 0) {
            document.getElementById('btn-make-sub').disabled = true;
            document.getElementById('btn-make-sub').textContent = "No Subs Remaining";
        }
    }

    executeSub() {
        if (!this.matchState || this.matchState.minute === 0) {
            alert("Start the match first!");
            return;
        }

        if (this.subsRemaining <= 0) {
            alert("You have used all 5 substitutions!");
            return;
        }

        const outId = document.getElementById('sub-out').value;
        const inId = document.getElementById('sub-in').value;

        const outIdx = this.squad.findIndex(p => p.id === outId);
        const inIdx = this.bench.findIndex(p => p.id === inId);

        if (outIdx > -1 && inIdx > -1) {
            const outPlayer = this.squad[outIdx];
            const inPlayer = this.bench[inIdx];

            // Swap arrays
            this.squad.splice(outIdx, 1);
            this.bench.splice(inIdx, 1);
            this.squad.push(inPlayer);

            this.subsRemaining--;
            
            // Re-render
            this.renderSubDropdowns();
            this.populateContextGrid();
            
            // Visual feedback
            const btn = document.getElementById('btn-make-sub');
            btn.innerHTML = `✅ ${inPlayer.name} IN`;
            setTimeout(() => { if(this.subsRemaining>0) btn.innerHTML = "🔄 Confirm Substitution"; }, 2000);
            
            document.getElementById('explanation-box').innerHTML += `<div style="color:var(--accent-blue); font-weight:bold; margin-top:10px;">🔄 SUB: ${inPlayer.name} replaces ${outPlayer.name}</div>`;
            
            // IDSS hack: the model expects userChoices.subId to match if facts needed sub.
            // But since dropping the tired player immediately drops mostTired.fatigue, the next tick fixes the score automatically!
            this.liveEvaluate();
        }
    }

    // selectSub is completely obsolete now
    // kept empty so nothing crashes if legacy html calls it
    selectSub() {}

    populateContextGrid() {
        if (!this.squad) return;
        const sorted = [...this.squad].sort((a, b) => b.fatigue - a.fatigue);
        const mostTired = sorted[0];
        const grid = document.getElementById('context-grid');
        grid.innerHTML = `
            <div class="context-card">
                <div class="context-label">Current Score</div>
                <div class="context-value">${this.matchState.homeScore} - ${this.matchState.awayScore}</div>
            </div>
            <div class="context-card">
                <div class="context-label">Ball Possession</div>
                <div class="context-value" style="color:var(--accent-primary)">FCB ${this.matchState.homePossession}% - ${this.matchState.awayPossession}% OPP</div>
            </div>
            <div class="context-card" style="border-color:${mostTired.fatigue > 75 ? 'var(--accent-red)' : ''}">
                <div class="context-label">⚠️ Player at Risk</div>
                <div class="context-value" style="color:${mostTired.fatigue > 75 ? 'var(--accent-red)' : ''}">
                    ${mostTired.name} (${Math.floor(mostTired.fatigue)}% Fatigue)
                </div>
            </div>
            <div class="context-card">
                <div class="context-label">Opponent State</div>
                <div class="context-value">Fatigue: ${Math.floor(this.matchState.oppFatigue)}%</div>
            </div>
        `;
    }

    loadScenario(index) {
        if (index >= KnowledgeBase.scenarios.length) {
            index = 0; // loop back for simple demo
        }
        
        this.currentScenarioIndex = index;
        this.scenario = KnowledgeBase.scenarios[index];
        this.selectedSub = null;

        // Reset UI Sliders to 50
        document.getElementById('slider-mentality').value = 50;
        document.getElementById('slider-pressing').value = 50;
        document.getElementById('slider-tempo').value = 50;
        this.updateSliders();

        // Update Top Bar
        document.getElementById('match-minute').textContent = this.scenario.minute;
        document.getElementById('score-home').textContent = this.scenario.homeScore;
        document.getElementById('score-away').textContent = this.scenario.awayScore;

        // Update Weather Context
        const badge = document.getElementById('match-weather');
        badge.textContent = this.scenario.weather;
        if (this.scenario.weather === "Rain") {
            badge.style.background = "rgba(59,130,246,0.2)";
            badge.style.color = "var(--accent-blue)";
        } else {
            badge.style.background = "rgba(245,158,11,0.2)";
            badge.style.color = "var(--accent-orange)";
        }

        // Generate Facts UI
        const contextGrid = document.getElementById('context-grid');
        let factsHtml = `
            <div class="context-card">
                <div class="context-label">Current Score</div>
                <div class="context-value">${this.scenario.homeScore} - ${this.scenario.awayScore}</div>
            </div>
            <div class="context-card">
                <div class="context-label">Time Remaining</div>
                <div class="context-value">${90 - this.scenario.minute} minutes</div>
            </div>
            <div class="context-card" style="border-color:var(--accent-orange)">
                <div class="context-label">⚠️ Player At Risk</div>
                <div class="context-value" style="color:var(--accent-orange)">${this.scenario.fatigueAlert.name} (${this.scenario.fatigueAlert.fatigue}% Fatigue)</div>
            </div>
            <div class="context-card">
                <div class="context-label">Opponent State</div>
                <div class="context-value">${this.scenario.opponentProfile.style} (Fatigue: ${this.scenario.opponentProfile.fatigue}%)</div>
            </div>
        `;
        contextGrid.innerHTML = factsHtml;

        // Render Subs
        const subsContainer = document.getElementById('subs-container');
        let subsHtml = '';
        for (const sub of this.scenario.subsAvailable) {
            subsHtml += `
                <div class="sub-card" id="sub-${sub.id}" onclick="game.selectSub('${sub.id}')">
                    <div>
                        <div class="sub-name">${sub.name}</div>
                        <div class="sub-role">${sub.role}</div>
                    </div>
                </div>
            `;
        }
        subsContainer.innerHTML = subsHtml;

        // Calculate and Render AI Inference
        this.runInferenceEngine();

        // Immediately evaluate the default sliders to populate the explanation facility
        this.liveEvaluate();
    }

    updateSliders() {
        const mentalityVal = document.getElementById('slider-mentality').value;
        const pressingVal = document.getElementById('slider-pressing').value;
        const tempoVal = document.getElementById('slider-tempo').value;

        // Apply Fuzzy Logic
        const fuzzyMentality = FuzzyLogic.evaluateMentality(mentalityVal);
        const fuzzyPressing = FuzzyLogic.evaluatePressing(pressingVal);
        const fuzzyTempo = FuzzyLogic.evaluateTempo(tempoVal);

        const lMent = document.getElementById('label-mentality');
        lMent.textContent = fuzzyMentality.term;
        lMent.className = `fuzzy-label ${fuzzyMentality.class}`;

        const lPress = document.getElementById('label-pressing');
        lPress.textContent = fuzzyPressing.term;
        lPress.className = `fuzzy-label ${fuzzyPressing.class}`;

        const lTempo = document.getElementById('label-tempo');
        lTempo.textContent = fuzzyTempo.term;
        lTempo.className = `fuzzy-label ${fuzzyTempo.class}`;
        
        // Live evaluation
        this.liveEvaluate();
    }

    selectSub(subId) {
        if (!this.matchState || this.matchState.minute === 0) {
            alert("Start the match first!");
            return;
        }

        this.selectedSub = subId;
        document.querySelectorAll('.sub-card').forEach(s => s.classList.remove('selected'));
        const elem = document.getElementById(`sub-${subId}`);
        if(elem) elem.classList.add('selected');
        
        // Gameplay effect: Subbing physically drops the fatigue metric!
        if (this.matchState.myFatigue > 60) {
            this.matchState.myFatigue -= 40; // Massive energy boost
            this.populateContextGrid();
        }
        
        // Disable the subs visually (we only allow 1 for simplicity)
        setTimeout(() => {
            document.getElementById('subs-container').innerHTML = "<div class='empty-state' style='color:var(--accent-blue); font-weight:600;'>🔄 Substitution Executed. Fresh legs on the pitch!</div>";
        }, 1500);

        // Live evaluation
        this.liveEvaluate();
    }

    // --- IDSS UI ---
    switchAiTab(tabName) {
        document.querySelectorAll('#tab-btn-forward, #tab-btn-backward').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-btn-${tabName}`).classList.add('active');

        document.getElementById('ai-tab-forward').style.display = tabName === 'forward' ? 'block' : 'none';
        document.getElementById('ai-tab-backward').style.display = tabName === 'backward' ? 'block' : 'none';
    }

    runInferenceEngine() {
        // Forward
        const { predictions } = this.engine.forwardChain(this.scenario.facts);
        const fwdContainer = document.getElementById('forward-predictions');
        let fwdHtml = '';
        predictions.forEach(p => {
            fwdHtml += `
                <div class="pred-item">
                    <strong style="color:var(--accent-blue)">Conclusion:</strong> ${p.conclusion} <br>
                    <span style="color:var(--text-muted)">Recommendation: ${p.action}</span>
                    <div style="font-size:0.6rem; margin-top:4px; font-family:var(--font-mono)">Confidence: ${p.confidence*100}% [Rule ${p.ruleId}]</div>
                </div>
            `;
        });
        fwdContainer.innerHTML = fwdHtml || '<div class="empty-state">No specific forward predictions found.</div>';

        // Check if we need to show big AI Alert in center screen
        const alertEl = document.getElementById('ai-alert');
        if (predictions.length > 0) {
            alertEl.style.display = 'block';
            document.getElementById('ai-alert-text').textContent = "IDSS suggests adjusting tactics (e.g. " + predictions[0].action + ")";
        } else {
            alertEl.style.display = 'none';
        }

        // Backward
        const tree = this.engine.backwardChain("Need Goal");
        const bwdContainer = document.getElementById('backward-tree');
        let bwdHtml = '';
        tree.forEach(t => {
            bwdHtml += `
                <div class="tree-node">
                    Goal [Need Goal] relies on Rule <span style="color:var(--accent-blue)">${t.ruleId}</span> requiring facts:
                    <ul style="padding-left: 1rem; color:var(--text-muted); margin-top:4px;">
                        ${t.requiredFacts.map(f => {
                            const hasIt = this.scenario.facts.includes(f);
                            return `<li style="color:${hasIt ? 'var(--accent-primary)' : 'var(--accent-red)'}">Fact: ${f} [${hasIt ? 'YES' : 'NO'}]</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        });
        bwdContainer.innerHTML = bwdHtml;
    }

    // --- LIVE EVALUATION ---
    liveEvaluate() {
        const mentalityVal = parseInt(document.getElementById('slider-mentality').value);
        const pressingVal = parseInt(document.getElementById('slider-pressing').value);
        const tempoVal = parseInt(document.getElementById('slider-tempo').value);

        const userChoices = {
            mentality: mentalityVal,
            pressing: pressingVal,
            tempo: tempoVal,
            subId: this.selectedSub
        };

        const result = this.engine.evaluateDecision(this.scenario, userChoices);
        
        // Populate inference explanation box directly
        const explanationBox = document.getElementById('explanation-box');
        
        const color = result.score >= 80 ? 'var(--accent-primary)' : result.score >= 50 ? 'var(--accent-orange)' : 'var(--accent-red)';
        
        let detailsHtml = '';
        if (result.diffs.length > 0) {
            detailsHtml = "<div style='margin-top:10px; color:var(--text-faint); font-weight:600;'>Areas to improve:</div><ul style='padding-left:1.5rem; margin-top:4px;'><li>" + result.diffs.join("</li><li>") + "</li></ul>";
        } else {
            detailsHtml = "<div style='margin-top:10px; color:var(--accent-primary); font-weight:600;'>🎉 Perfect! Your tactics mirror the expert system optimally.</div>";
        }

        let rulesHtml = "";
        if (result.applyRules) {
            rulesHtml = result.applyRules.map(rid => {
                const rule = KnowledgeBase.rules.find(r => r.id === rid);
                if (rule) {
                    return `
                    <div style="margin-top:10px; padding:8px; background:rgba(0,176,255,0.05); border-left:3px solid var(--accent-blue); font-family:var(--font-mono); font-size:0.75rem;">
                        <strong>Rule Evaluated:</strong> ${rule.description}<br>
                        <span style="color:var(--text-muted)">Logic Base: ${rule.conclusion}</span>
                    </div>
                    `;
                }
                return "";
            }).join('');
        }

        let possessionMultiplier = this.matchState.homePossession / 50; 
        
        let squaredScore = Math.pow(result.score / 100, 2);
        let xg = squaredScore * 6.0 * possessionMultiplier; 
        
        let riskFactor = (100 - result.score) / 100;
        let concedeRisk = 99.8 - (riskFactor * 12); 
        if (this.matchState.awayPossession > 60) concedeRisk -= 2.0; 
        
        let goalChance = (xg).toFixed(2);
        let defRisk = (100 - concedeRisk).toFixed(2);

        this.latestTacticalScore = result.score;

        explanationBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:1.4rem; font-weight:bold; color:${color};">Success Rate: ${result.score}%</span>
                <span class="badge" style="background:${color}; color:#000;">${result.verdict}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:0.8rem; padding:0.5rem; background:rgba(255,255,255,0.05); border-radius:5px;">
                <span style="color:var(--accent-primary); font-size:0.85rem">Goal Chance: <strong>${goalChance}% per min</strong></span>
                <span style="color:var(--accent-red); font-size:0.85rem">Concede Risk: <strong>${defRisk}% per min</strong></span>
            </div>
            ${detailsHtml}
            ${rulesHtml}
        `;
    }

    nextScenario() {
        if (this.matchState.minute >= 90) {
            // Setup a random scenario!
            this.matchState = {
                minute: Math.floor(Math.random() * 40) + 40, // Start between min 40 and 80
                homeScore: Math.floor(Math.random() * 3),
                awayScore: Math.floor(Math.random() * 3),
                homePossession: Math.floor(Math.random() * 40) + 30, // 30-70%
                awayPossession: 0, 
                weather: Math.random() > 0.5 ? 'Rain' : 'Clear',
                oppFatigue: Math.floor(Math.random() * 40) + 20, // 20-60%
                isPlaying: false
            };
            this.matchState.awayPossession = 100 - this.matchState.homePossession;

            // Reset Sub Count and Squad Fatigue
            this.subsRemaining = 5;
            this.squad.forEach(p => p.fatigue = Math.floor(Math.random() * 30) + 10); // Start slightly tired

            // Force visual resets
            document.getElementById('explanation-box').innerHTML = `<div class="empty-state">Starting new random scenario...</div>`;
            document.getElementById('btn-next-scenario').textContent = '▶️ Start Match';
            this.startDynamicMatch();

        } else {
            this.toggleMatch();
        }
    }

    // --- DRAW PITCH ---
    startPitchAnimation() {
        if (this.pitchInterval) clearInterval(this.pitchInterval);

        const container = document.getElementById('players-container');
        
        // Simple DOM generation
        let phtml = '';
        KnowledgeBase.formation.forEach(p => {
            phtml += `<div class="player-dot player-home" id="ui-${p.id}" style="left:${p.x}%; top:${p.y}%"></div>`;
        });
        KnowledgeBase.oppFormation.forEach((p, i) => {
            phtml += `<div class="player-dot player-away" id="ui-opp-${i}" style="left:${p.x}%; top:${p.y}%"></div>`;
        });
        container.innerHTML = phtml;

        // Abstract jiggle animation to make field look active! Deeply interactive with Slider
        this.pitchInterval = setInterval(() => {
            const mentality = parseInt(document.getElementById('slider-mentality').value || 50);
            const pressing = parseInt(document.getElementById('slider-pressing').value || 50);
            
            // X shift determines how far up the pitch we play (attacking mentality = forward)
            const baseShiftX = (mentality - 50) / 2.5; 
            
            // Width Expansion: Higher mentality = players use full width of the pitch. Lower = narrow defense.
            const widthMultiplier = mentality > 60 ? 1.3 : (mentality < 40 ? 0.7 : 1.0);

            // Deep Success Rate UI Integration
            let tacticalScore = this.latestTacticalScore || 100;
            let tacticalJitterMultiplier = 1.0;
            
            const pitchDiv = document.querySelector('.pitch');
            if (pitchDiv) {
                if (tacticalScore >= 85) {
                    tacticalJitterMultiplier = 0.2; // Perfectly composed shape
                    pitchDiv.style.boxShadow = '0 0 30px rgba(39, 174, 96, 0.4)'; // Green glow
                    pitchDiv.style.borderColor = 'rgba(39, 174, 96, 0.8)';
                } else if (tacticalScore < 40) {
                    tacticalJitterMultiplier = 3.5; // Complete tactical chaos
                    pitchDiv.style.boxShadow = '0 0 30px rgba(231, 76, 60, 0.5)'; // Red glow
                    pitchDiv.style.borderColor = 'rgba(231, 76, 60, 0.8)';
                } else {
                    pitchDiv.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
                    pitchDiv.style.borderColor = 'rgba(255,255,255,0.1)';
                }
            }

            // Base jitter
            const baseJitter = (pressing / 20) * tacticalJitterMultiplier;

            KnowledgeBase.formation.forEach(p => {
                const el = document.getElementById(`ui-${p.id}`);
                const playerRef = this.squad ? this.squad.find(sq => sq.id === p.id) : null;
                if (!el) return;
                
                // Fatigue Penalty: High fatigue makes the player walk instead of run
                let fatiguePenalty = playerRef ? (playerRef.fatigue / 100) : 0;
                let activeJitter = Math.max(0.5, baseJitter * (1 - fatiguePenalty));

                let currentX = p.x + baseShiftX;
                // Goalkeepers and CBs don't push up to the midline!
                if(p.id === 'p1') currentX = p.x + (baseShiftX/5);
                else if (p.role === 'CB') currentX = p.x + (baseShiftX/2);

                // Y (Width) Expansion logic from center (50)
                let currentY = 50 + ((p.y - 50) * widthMultiplier);

                const rx = currentX + (Math.random() * activeJitter - (activeJitter/2));
                const ry = currentY + (Math.random() * activeJitter - (activeJitter/2));
                el.style.left = `${Math.min(95, Math.max(0, rx))}%`;
                el.style.top = `${Math.min(95, Math.max(0, ry))}%`;
            });

            KnowledgeBase.oppFormation.forEach((p, i) => {
                const el = document.getElementById(`ui-opp-${i}`);
                if (!el) return;
                
                // Opponents naturally retreat if Barca hogs possession
                let possessionFearX = 0;
                if (this.matchState && this.matchState.homePossession > 60) {
                    possessionFearX = (this.matchState.homePossession - 60) / 2;
                }

                // Opponents get pushed back if we push up AND if we have possession
                const rx = p.x + (baseShiftX / 1.5) + possessionFearX + (Math.random() * baseJitter - (baseJitter/2));
                const ry = p.y + (Math.random() * 4 - 2);
                el.style.left = `${Math.min(95, Math.max(0, rx))}%`;
                el.style.top = `${Math.min(95, Math.max(0, ry))}%`;
            });
        }, 1000);
    }
}

const game = new GameController();
