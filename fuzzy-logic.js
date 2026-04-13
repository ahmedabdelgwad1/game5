/* ============================================
   FUZZY LOGIC ENGINE
   Converts crisp values (0-100) to linguistic terms
   ============================================ */

const FuzzyLogic = {
    
    evaluateMentality(value) {
        if (value < 20) return { term: "Park the Bus", class: "fuzzy-low" };
        if (value < 40) return { term: "Defensive", class: "fuzzy-low" };
        if (value < 60) return { term: "Balanced", class: "fuzzy-normal" };
        if (value < 85) return { term: "Attacking", class: "fuzzy-high" };
        return { term: "All-Out Attack", class: "fuzzy-very-high" };
    },

    evaluatePressing(value) {
        if (value < 30) return { term: "Sit Deep", class: "fuzzy-low" };
        if (value < 65) return { term: "Medium Press", class: "fuzzy-normal" };
        return { term: "Gegenpress (High)", class: "fuzzy-very-high" };
    },

    evaluateTempo(value) {
        if (value < 35) return { term: "Slow Build-up", class: "fuzzy-low" };
        if (value < 70) return { term: "Normal Tempo", class: "fuzzy-normal" };
        return { term: "Fast / Direct", class: "fuzzy-high" };
    },

    evaluateFatigue(value) {
        if (value < 50) return { term: "Fresh", class: "fuzzy-normal" };
        if (value < 75) return { term: "Tiring", class: "fuzzy-high" };
        return { term: "Exhausted", class: "fuzzy-very-high" };
    }
};
