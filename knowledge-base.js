/* ============================================
   KNOWLEDGE BASE
   Expert Football Manager Scenario Data
   ============================================ */

const KnowledgeBase = {
    // --- FACTS & RULES ---
    rules: [
        {
            id: "R1",
            conditions: ["status_losing", "time_late"],
            conclusion: "Need Goal",
            action: "Increase attacking mentality to High or Max. High Pressing.",
            confidence: 0.90,
            description: "IF losing AND late in game THEN Need Goal (Increase Attack)"
        },
        {
            id: "R2",
            conditions: ["status_winning", "time_late"],
            conclusion: "Protect Lead",
            action: "Decrease attacking mentality. Sit deep.",
            confidence: 0.85,
            description: "IF winning AND late in game THEN Protect Lead (Defensive, Sit Deep)"
        },
        {
            id: "R3",
            conditions: ["weather_rain", "tempo_fast"],
            conclusion: "High Error Risk",
            action: "Reduce Tempo to control the ball in wet conditions.",
            confidence: 0.75,
            description: "IF raining AND fast tempo THEN High Error Risk (Reduce Tempo)"
        },
        {
            id: "R4",
            conditions: ["opp_fatigue_high"],
            conclusion: "Vulnerable Opponent",
            action: "Increase Tempo and Pressing to exploit tired legs.",
            confidence: 0.80,
            description: "IF opponent fatigue high THEN Vulnerable Opponent (Fast Tempo, High Press)"
        },
        {
            id: "R5",
            conditions: ["player_fatigue_high", "time_mid"],
            conclusion: "Sub Required",
            action: "Substitute exhausted player to prevent injury or defensive errors.",
            confidence: 0.95,
            description: "IF key player fatigue high AND mid/late game THEN Sub Required"
        }
    ],

    // --- GAME SCENARIOS ---
    scenarios: [
        {
            id: 1,
            minute: 75,
            homeScore: 0,
            awayScore: 1,
            weather: "Rain",
            isHome: true, // You are managing the home team
            opponentProfile: { style: "Defensive", fatigue: 85 }, // opponents are tired
            
            // Your team facts
            fatigueAlert: { playerId: "p11", name: "Salah", fatigue: 82 },
            subsAvailable: [
                { id: "s1", name: "Nunez", role: "Striker (Fresh)", impact: 20 },
                { id: "s2", name: "Endo", role: "Def Mid (Fresh)", impact: -10 }
            ],

            // Optimal tactical settings to win this scenario
            optimal: {
                mentality: { min: 70, max: 100 }, // High attack
                pressing: { min: 60, max: 100 },  // High press
                tempo: { min: 0, max: 40 },       // Slow tempo because of rain
                subId: "s1"                       // Sub on the attacker
            },
            
            facts: ["status_losing", "time_late", "weather_rain", "opp_fatigue_high", "player_fatigue_high"]
        },
        {
            id: 2,
            minute: 82,
            homeScore: 2,
            awayScore: 1,
            weather: "Clear",
            isHome: true,
            opponentProfile: { style: "All Out Attack", fatigue: 60 },
            
            fatigueAlert: { playerId: "p8", name: "Szoboszlai", fatigue: 90 },
            subsAvailable: [
                { id: "s1", name: "Jota", role: "Striker", impact: -5 },
                { id: "s2", name: "Gomez", role: "Defender", impact: 25 }
            ],

            optimal: {
                mentality: { min: 0, max: 30 },   // Defensive
                pressing: { min: 0, max: 40 },    // Sit deep
                tempo: { min: 0, max: 100 },      // Tempo doesn't matter as much
                subId: "s2"                       // Sub on defender
            },
            
            facts: ["status_winning", "time_late", "player_fatigue_high"]
        }
    ],
    
    // UI Player coordinates mapping (for drawing the pitch simply)
    formation: [
        { id: "p1", x: 10, y: 50 }, // GK
        { id: "p2", x: 30, y: 20 }, // LB
        { id: "p3", x: 25, y: 40 }, // CB
        { id: "p4", x: 25, y: 60 }, // CB
        { id: "p5", x: 30, y: 80 }, // RB
        { id: "p6", x: 50, y: 30 }, // CM
        { id: "p7", x: 45, y: 50 }, // CDM
        { id: "p8", x: 50, y: 70 }, // CM
        { id: "p9", x: 75, y: 20 }, // LW
        { id: "p10", x: 85, y: 50 }, // ST
        { id: "p11", x: 75, y: 80 }  // RW (Salah)
    ],
    oppFormation: [
        { x: 90, y: 50 }, { x: 75, y: 40 }, { x: 75, y: 60 }, { x: 60, y: 20 }, 
        { x: 60, y: 80 }, { x: 55, y: 50 }, { x: 40, y: 30 }, { x: 40, y: 70 },
        { x: 20, y: 25 }, { x: 15, y: 50 }, { x: 20, y: 75 }
    ]
};
