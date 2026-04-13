/* ============================================
   INFERENCE ENGINE - IDSS
   Evaluates tactical facts
   ============================================ */

class InferenceEngine {
    constructor(kb) {
        this.kb = kb;
    }

    // ========== FORWARD CHAINING ==========
    // Data-driven: Facts -> Conclusions
    forwardChain(facts) {
        let firedRules = [];
        let predictions = [];

        for (const rule of this.kb.rules) {
            const isMatch = rule.conditions.every(c => facts.includes(c));
            if (isMatch) {
                firedRules.push(rule);
                predictions.push({
                    conclusion: rule.conclusion,
                    action: rule.action,
                    confidence: rule.confidence,
                    ruleId: rule.id
                });
            }
        }

        return { firedRules, predictions };
    }

    // ========== BACKWARD CHAINING ==========
    // Goal-driven: Goal -> What facts are needed?
    backwardChain(goal) {
        // e.g. Goal is "Need Goal"
        let relevantRules = this.kb.rules.filter(r => r.conclusion === goal);
        let reasoningTree = [];

        for (const rule of relevantRules) {
            reasoningTree.push({
                goal: goal,
                ruleId: rule.id,
                requiredFacts: rule.conditions
            });
        }

        return reasoningTree;
    }

    // ========== TACTICAL EVALUATION ==========
    // Evaluates player's slider and sub choices against optimal
    evaluateDecision(scenario, userChoices) {
        let score = 100;
        let diffs = [];
        let applyRules = [];

        // Continuous evaluation distance calculating penalty
        if (scenario.optimal.mentality) {
            const target = (scenario.optimal.mentality.min + scenario.optimal.mentality.max) / 2;
            const dist = Math.abs(userChoices.mentality - target);
            if (dist > 10) { // allowed padding
                const penalty = Math.min((dist - 10) * 1.5, 30);
                score -= penalty;
                diffs.push(`Mentality skew: distance from optimal is ${Math.floor(dist)}%.`);
            } else {
                applyRules.push("R1");
            }
        }

        // Evaluate Pressing
        if (scenario.optimal.pressing) {
            const target = (scenario.optimal.pressing.min + scenario.optimal.pressing.max) / 2;
            const dist = Math.abs(userChoices.pressing - target);
            if (dist > 10) {
                const penalty = Math.min((dist - 10) * 1.5, 30);
                score -= penalty;
                diffs.push(`Pressing intensity skew: distance from optimal is ${Math.floor(dist)}%.`);
            }
        }

        // Evaluate Tempo
        if (scenario.optimal.tempo) {
            const target = (scenario.optimal.tempo.min + scenario.optimal.tempo.max) / 2;
            const dist = Math.abs(userChoices.tempo - target);
            if (dist > 10) {
                const penalty = Math.min((dist - 10) * 1.5, 30);
                score -= penalty;
                diffs.push(`Tempo skew: distance from optimal is ${Math.floor(dist)}%.`);
            } else {
                applyRules.push("R3");
            }
        }

        // Evaluate Substitution
        if (scenario.optimal.subId) {
            if (userChoices.subId !== scenario.optimal.subId) {
                score -= 40;
                diffs.push(`Incorrect substitution! The exhausted/injured player remains on the pitch. Error risk increased.`);
            } else {
                applyRules.push("R5");
            }
        }

        // Cap minimum score to 10% base probability
        score = Math.max(10, score);
        
        let verdict = score >= 80 ? "Tactical Masterclass!" : score >= 50 ? "Decent try." : "Tactical Disaster!";

        return { score, diffs, verdict, applyRules };
    }
}
