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

        // Initialize Dynamic Match State
        this.matchState = {
            minute: 0,
            homeScore: 0,
            awayScore: 0,
            weather: 'Rain',
            oppFatigue: 10,
            isPlaying: false
        };

        this.squad = [
            { id: 'p1', name: 'Alisson', role: 'GK', fatigue: 5 },
            { id: 'p2', name: 'Robertson', role: 'LB', fatigue: 15 },
            { id: 'p3', name: 'Van Dijk', role: 'CB', fatigue: 10 },
            { id: 'p4', name: 'Konate', role: 'CB', fatigue: 12 },
            { id: 'p5', name: 'Trent', role: 'RB', fatigue: 18 },
            { id: 'p6', name: 'Mac Allister', role: 'CM', fatigue: 15 },
            { id: 'p7', name: 'Endo', role: 'CDM', fatigue: 14 },
            { id: 'p8', name: 'Szoboszlai', role: 'CM', fatigue: 16 },
            { id: 'p9', name: 'Diaz', role: 'LW', fatigue: 17 },
            { id: 'p10', name: 'Nunez', role: 'ST', fatigue: 14 },
            { id: 'p11', name: 'Salah', role: 'RW', fatigue: 19 }
        ];

        this.bench = [
            { id: 's1', name: 'Jota', role: 'FW', fatigue: 0 },
            { id: 's2', name: 'Gakpo', role: 'LW', fatigue: 0 },
            { id: 's3', name: 'Gomez', role: 'DF', fatigue: 0 },
            { id: 's4', name: 'Elliott', role: 'CM', fatigue: 0 },
            { id: 's5', name: 'Gravenberch', role: 'CM', fatigue: 0 },
            { id: 's6', name: 'Tsimikas', role: 'LB', fatigue: 0 },
            { id: 's7', name: 'Bradley', role: 'RB', fatigue: 0 }
        ];

        this.subsRemaining = 5;

        this.startDynamicMatch();
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
            this.toggleMatch();
            document.getElementById('match-minute').textContent = "FT";
            document.getElementById('btn-next-scenario').textContent = 'FULL TIME';
            document.getElementById('btn-next-scenario').disabled = true;
            return;
        }

        this.matchState.minute++;
        
        // Fatigue increase logic for all 11 players
        const pressing = parseInt(document.getElementById('slider-pressing').value);
        const tempo = parseInt(document.getElementById('slider-tempo').value);
        
        let baseDrain = 0.5 + (pressing / 150) + (tempo / 250);
        
        this.squad.forEach(p => {
            let mult = 1.0;
            if (p.role === 'GK') mult = 0.1;
            if (p.role.includes('W') || p.role === 'LB' || p.role === 'RB') mult = 1.6;
            
            p.fatigue += (baseDrain * mult);
            if (p.fatigue > 100) p.fatigue = 100;
        });

        this.matchState.oppFatigue += 0.8;

        document.getElementById('match-minute').textContent = this.matchState.minute;

        // Find most tired player for IDSS logic
        let sortedSquad = [...this.squad].sort((a, b) => b.fatigue - a.fatigue);
        const mostTired = sortedSquad[0];

        // Build facts dynamically
        const facts = [];
        if (this.matchState.homeScore < this.matchState.awayScore) facts.push("status_losing");
        else if (this.matchState.homeScore > this.matchState.awayScore) facts.push("status_winning");
        else facts.push("status_drawing");

        if (this.matchState.minute > 75) {
            facts.push("time_late");
            facts.push("time_mid");
        } else if (this.matchState.minute > 45) {
            facts.push("time_mid");
        }

        facts.push("weather_rain");

        if (mostTired.fatigue > 75) facts.push("player_fatigue_high");
        if (this.matchState.oppFatigue > 75) facts.push("opp_fatigue_high");

        // Dynamically build optimal conditions for the UI inference evaluation
        let optimal = { 
            mentality: {min: 40, max: 80}, 
            pressing: {min: 40, max: 80}, 
            tempo: {min: 30, max: 70} 
        };
        
        if (facts.includes("status_losing") && facts.includes("time_late")) {
            optimal.mentality = {min: 70, max: 100};
        } else if (facts.includes("status_winning")) {
            optimal.mentality = {min: 0, max: 40};
            optimal.pressing = {min: 0, max: 50};
        }
        
        if (facts.includes("weather_rain")) {
            optimal.tempo = {min: 0, max: 40};
        }
        
        if (facts.includes("player_fatigue_high")) {
            optimal.subId = "s1"; 
        }

        // Apply dynamically
        this.scenario = {
            facts: facts,
            optimal: optimal,
            fatigueAlert: { name: mostTired.name, fatigue: Math.floor(mostTired.fatigue) },
            opponentProfile: { style: "Normal", fatigue: Math.floor(this.matchState.oppFatigue) }
        };

        // Evaluate live tactics against these facts
        this.runInferenceEngine();
        this.liveEvaluate();
        
        // Probability Goal Engine
        const mentalityVal = parseInt(document.getElementById('slider-mentality').value);
        const tempoVal = parseInt(document.getElementById('slider-tempo').value);
        const userChoices = { mentality: mentalityVal, pressing: pressing, tempo: tempoVal };
        const result = this.engine.evaluateDecision(this.scenario, userChoices);
        
        // Scoring logic based on evaluation score (0-100)
        let rand = Math.random() * 100;
        let xg = (result.score / 100) * 1.5; // Up to 1.5% chance per minute
        if (rand < xg) {
            this.matchState.homeScore++;
            this.updateScoreBoard();
            document.getElementById('explanation-box').innerHTML += `<div style="color:var(--accent-primary); font-weight:bold; margin-top:10px;">⚽ ${this.matchState.minute}' GOAL! Brilliant Tactics!</div>`;
        } else if (rand > (98 - ((100 - result.score) / 100 * 2))) { // Chance to concede if tactics are bad
            this.matchState.awayScore++;
            this.updateScoreBoard();
            document.getElementById('explanation-box').innerHTML += `<div style="color:var(--accent-red); font-weight:bold; margin-top:10px;">💔 ${this.matchState.minute}' CONCEDED! Defense compromised!</div>`;
        }
        
        this.populateContextGrid();
    }
    
    updateScoreBoard() {
        document.getElementById('score-home').textContent = this.matchState.homeScore;
        document.getElementById('score-away').textContent = this.matchState.awayScore;
        
        const scoreBoard = document.querySelector('.scoreboard');
        scoreBoard.style.transform = 'scale(1.2)';
        setTimeout(() => scoreBoard.style.transform = 'scale(1)', 400);
    }

    startDynamicMatch() {
        this.populateContextGrid();
        this.renderSubDropdowns();
        this.startPitchAnimation();
        this.updateSliders();
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
                <div class="context-label">Time Elapsed</div>
                <div class="context-value">${this.matchState.minute} minutes</div>
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

        explanationBox.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:1.4rem; font-weight:bold; color:${color};">Success Rate: ${result.score}%</span>
                <span class="badge" style="background:${color}; color:#000;">${result.verdict}</span>
            </div>
            ${detailsHtml}
            ${rulesHtml}
        `;
    }

    nextScenario() {
        this.toggleMatch();
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

        // Abstract jiggle animation to make field look active
        this.pitchInterval = setInterval(() => {
            KnowledgeBase.formation.forEach(p => {
                const el = document.getElementById(`ui-${p.id}`);
                const rx = p.x + (Math.random() * 6 - 3);
                const ry = p.y + (Math.random() * 6 - 3);
                el.style.left = `${rx}%`;
                el.style.top = `${ry}%`;
            });
            KnowledgeBase.oppFormation.forEach((p, i) => {
                const el = document.getElementById(`ui-opp-${i}`);
                const rx = p.x + (Math.random() * 6 - 3);
                const ry = p.y + (Math.random() * 6 - 3);
                el.style.left = `${rx}%`;
                el.style.top = `${ry}%`;
            });
        }, 1500);
    }
}

const game = new GameController();
