import streamlit as st
import streamlit.components.v1 as components
import time
import random

# ============================================
# 1. UI & STYLING (Sci-Fi War Room)
# ============================================
st.set_page_config(page_title="Tactical IDSS", layout="wide", initial_sidebar_state="collapsed")

def inject_styles():
    st.markdown("""
    <style>
    .stApp {
        background: radial-gradient(circle at top right, #09121a 0%, #030406 100%);
        color: #e2e8f0;
        font-family: 'Courier New', Courier, monospace;
    }
    .panel-box {
        background: rgba(13, 18, 25, 0.7);
        border: 1px solid rgba(0, 230, 118, 0.3);
        border-radius: 8px;
        padding: 15px;
        box-shadow: inset 0 0 10px rgba(0, 230, 118, 0.05);
        margin-bottom: 20px;
    }
    h1, h2, h3 { color: #00E676 !important; text-transform: uppercase; text-shadow: 0 0 8px rgba(0, 230, 118, 0.4); }
    .led-green { display: inline-block; width: 12px; height: 12px; background-color: #00E676; border-radius: 50%; box-shadow: 0 0 8px #00E676; margin-right: 8px;}
    .led-red { display: inline-block; width: 12px; height: 12px; background-color: #FF1744; border-radius: 50%; box-shadow: 0 0 8px #FF1744; margin-right: 8px;}
    </style>
    """, unsafe_allow_html=True)

inject_styles()

# ============================================
# 2. APP STATE MANAGEMENT
# ============================================
def init_state():
    if 'match_minute' not in st.session_state:
        st.session_state.match_minute = 0
    if 'home_score' not in st.session_state:
        st.session_state.home_score = 0
    if 'away_score' not in st.session_state:
        st.session_state.away_score = 0
    if 'fatigue' not in st.session_state:
        st.session_state.fatigue = 10
    if 'opp_fatigue' not in st.session_state:
        st.session_state.opp_fatigue = 10
    if 'match_logs' not in st.session_state:
        st.session_state.match_logs = ["0' - Match kicks off!"]
    if 'is_playing' not in st.session_state:
        st.session_state.is_playing = False

init_state()

# ============================================
# 3. KNOWLEDGE BASE & FUZZY LOGIC
# ============================================

def fuzzy_mentality(val):
    if val < 30: return "Defensive"
    if val < 70: return "Balanced"
    return "All-Out Attack"

def fuzzy_pressing(val):
    if val < 40: return "Low Block"
    if val < 70: return "Mid Press"
    return "High Press (Gegenpress)"

def fuzzy_tempo(val):
    if val < 40: return "Slow/Possession"
    if val < 70: return "Normal"
    return "Fast/Direct"

def extract_facts():
    # Extracts crisp state to discrete facts for the inference engine
    facts = []
    if st.session_state.home_score < st.session_state.away_score:
        facts.append("losing")
    elif st.session_state.home_score > st.session_state.away_score:
        facts.append("winning")
    else:
        facts.append("drawing")
        
    if st.session_state.match_minute >= 75:
        facts.append("late_game")
    
    if st.session_state.fatigue > 75:
        facts.append("team_tired")
        
    if st.session_state.opp_fatigue > 75:
        facts.append("opp_tired")
        
    return facts

def evaluate_tactics(mentality, pressing, tempo, facts):
    rules_applied = []
    optimal_score = 50 # Base neutral score
    
    # R1: If losing and late game -> Attack
    if "losing" in facts and "late_game" in facts:
        if mentality > 70 and tempo > 60:
            optimal_score += 30
            rules_applied.append("✅ [Rule 1: Desperate Attack] - Trailing late in game: Successfully increased attack and tempo.")
        else:
            optimal_score -= 20
            rules_applied.append("❌ [Rule 1: Desperate Attack] - Trailing late in game: Mentality/Tempo too low. Need urgency.")
            
    # R2: If winning -> Protect Lead
    elif "winning" in facts:
        if mentality < 40 and pressing < 50:
            optimal_score += 25
            rules_applied.append("✅ [Rule 2: Protect Lead] - Winning: Successfully dropped deep and reduced mentality.")
        else:
            optimal_score -= 20
            rules_applied.append("❌ [Rule 2: Protect Lead] - Winning: Should be defensive to protect the lead. Risking counter-attacks.")
            
    # R3: Exploit opponent fatigue
    if "opp_tired" in facts:
        if tempo > 70 and pressing > 70:
            optimal_score += 15
            rules_applied.append("✅ [Rule 3: Exploit Fatigue] - Opponent tired: High pressing and tempo correctly applied.")
        else:
            rules_applied.append("❌ [Rule 3: Exploit Fatigue] - Opponent tired: Missed opportunity to press high and raise tempo.")
            
    # R4: Protect tired team
    if "team_tired" in facts:
        if pressing > 70:
            optimal_score -= 25
            rules_applied.append("❌ [Rule 4: Conserve Energy] - Team tired: Gegenpressing is causing critical exhaustion levels!")
        else:
            optimal_score += 10
            rules_applied.append("✅ [Rule 4: Conserve Energy] - Team tired: Correctly lowering press intensity to preserve legs.")

    # Calculate xG (Expected Goals) roughly based on optimal tactics score
    xg_generated = max(0.01, (optimal_score / 100.0) * 0.15)
    
    # Possession Calculation
    base_poss = 50 + ((mentality - 50) * 0.2) + ((tempo - 50) * -0.1) # Attacking = more poss, fast tempo = less poss
    possession_home = max(20, min(80, base_poss))
    
    return xg_generated, possession_home, rules_applied

# ============================================
# 4. DASHBOARD UI
# ============================================
st.title("⚽ TACTICAL IDSS - REAL-TIME SIMULATOR")

if 'xg' not in st.session_state:
    st.session_state.xg = 0.0
if 'opp_xg' not in st.session_state:
    st.session_state.opp_xg = 0.0
if 'possession' not in st.session_state:
    st.session_state.possession = 50.0

# Top Metrics
m1, m2, m3, m4 = st.columns(4)
metric_time = m1.empty()
metric_score = m2.empty()
metric_xyg = m3.empty()
metric_poss = m4.empty()

st.markdown("---")
left_col, right_col = st.columns([2, 1])

with right_col:
    st.subheader("🎛️ Tactical Overrides")
    st.info("Adjust constraints based on IDSS logic below.")
    
    # SLIDERS
    mentality = st.slider("Mentality (Def → Att)", 0, 100, 50, key="mentality_slider")
    st.caption(f"Fuzzy Mapping: {fuzzy_mentality(mentality)}")
    
    pressing = st.slider("Pressing (Deep → High)", 0, 100, 50, key="pressing_slider")
    st.caption(f"Fuzzy Mapping: {fuzzy_pressing(pressing)}")
    
    tempo = st.slider("Tempo (Slow → Fast)", 0, 100, 50, key="tempo_slider")
    st.caption(f"Fuzzy Mapping: {fuzzy_tempo(tempo)}")
    
    # Engine toggles
    if st.button("▶️ SIMULATE NEXT 5 MINS"):
        st.session_state.is_playing = True

    if st.button("⏩ SIMULATE TO END (90')"):
        st.session_state.is_playing = "full"

with left_col:
    st.subheader("📡 Live Analytics Canvas")
    
    # JS Canvas Full Football Simulation Match Engine
    canvas_html = f"""
    <div style="background: repeating-linear-gradient(0deg, #112618, #112618 10%, #173620 10%, #173620 20%); border: 3px solid rgba(0, 230, 118, 0.4); border-radius: 8px; width: 100%; height: 350px; position: relative; overflow: hidden; box-shadow: inset 0 0 30px rgba(0,0,0,0.8);">
        <canvas id="pitchCanvas" style="width: 100%; height: 100%;"></canvas>
    </div>
    <script>
    const canvas = document.getElementById('pitchCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Sliders from Python
    const mentality = {mentality}; // 0-100
    const pressing = {pressing};   // 0-100
    const tempo = {tempo};         // 0-100
    
    let possession = true; // true = home, false = away
    const ball = {{ x: canvas.width/2, y: canvas.height/2, vx: 0, vy: 0 }};
    
    // Formations [x, y] ratios
    const homeForm = [[0.05,0.5], [0.2,0.2], [0.2,0.4], [0.2,0.6], [0.2,0.8], [0.4,0.3], [0.4,0.7], [0.6,0.5], [0.7,0.2], [0.8,0.5], [0.7,0.8]];
    const awayForm = homeForm.map(p => [1 - p[0], 1 - p[1]]);
    
    const players = [];
    for(let i=0; i<11; i++) players.push({{ id: i, isHome: true, x: homeForm[i][0]*canvas.width, y: homeForm[i][1]*canvas.height, baseX: homeForm[i][0], baseY: homeForm[i][1] }});
    for(let i=0; i<11; i++) players.push({{ id: i+11, isHome: false, x: awayForm[i][0]*canvas.width, y: awayForm[i][1]*canvas.height, baseX: awayForm[i][0], baseY: awayForm[i][1] }});
    
    function draw() {{
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Pitch markings
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.arc(canvas.width/2, canvas.height/2, 40, 0, Math.PI*2); ctx.stroke();
        ctx.strokeRect(0, canvas.height/2 - 60, 60, 120); // Home box
        ctx.strokeRect(canvas.width-60, canvas.height/2 - 60, 60, 120); // Away box
        
        // Logic Ticks
        const speedMultiplier = (tempo / 50);
        
        // Ball friction
        ball.x += ball.vx * speedMultiplier; 
        ball.y += ball.vy * speedMultiplier;
        ball.vx *= 0.95; ball.vy *= 0.95;
        
        // Bounds bounce
        if(ball.x <= 0 || ball.x >= canvas.width) {{ ball.vx *= -1; possession = !possession; }}
        if(ball.y <= 0 || ball.y >= canvas.height) {{ ball.vy *= -1; }}
        
        let closest = null; let minDist = 9999;
        
        players.forEach(p => {{
            // Calculate target position based on formation + mentality shift
            let mentalShift = 0;
            if (p.isHome) mentalShift = ((mentality - 50) / 200); // Home pushes forward if attacking
            
            let targetX = (p.baseX + mentalShift) * canvas.width;
            let targetY = p.baseY * canvas.height;
            
            // Pressing logic: If opponent has ball, move towards ball
            const pressIntensity = p.isHome ? (pressing / 100) : 0.4;
            if (p.isHome !== possession) {{
                targetX = targetX * (1 - pressIntensity) + ball.x * pressIntensity;
                targetY = targetY * (1 - pressIntensity) + ball.y * pressIntensity;
            }}
            
            // Move player to target
            p.x += (targetX - p.x) * 0.05 * speedMultiplier;
            p.y += (targetY - p.y) * 0.05 * speedMultiplier;
            
            // Distance to ball
            const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
            if (dist < minDist) {{ minDist = dist; closest = p; }}
            
            // Draw player
            ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = p.isHome ? '#FF1744' : '#00B0FF'; ctx.fill();
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
        }});
        
        // Interaction
        if (minDist < 15) {{
            possession = closest.isHome;
            if (Math.random() < 0.05 * speedMultiplier) {{
                // Pass or shoot
                let directionX = possession ? 1 : -1;
                ball.vx = directionX * (Math.random() * 8 + 4);
                ball.vy = (Math.random() - 0.5) * 8;
            }}
        }}

        // Draw Ball
        ctx.beginPath(); ctx.arc(ball.x, ball.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFF'; ctx.fill();
        ctx.shadowBlur = 10; ctx.shadowColor = 'white';
        
        requestAnimationFrame(draw);
    }}
    draw();
    </script>
    """
    canvas_placeholder = st.empty()
    with canvas_placeholder.container():
        components.html(canvas_html, height=360)

st.markdown("---")
st.subheader("💡 IDSS REASONING FACILITY")
reasoning_placeholder = st.empty()
logs_placeholder = st.empty()


# ============================================
# 5. REAL-TIME MATCH ENGINE LOOP
# ============================================

if st.session_state.is_playing:
    steps = 5 if st.session_state.is_playing == True else (90 - st.session_state.match_minute)
    
    for _ in range(steps):
        if st.session_state.match_minute >= 90:
            st.session_state.match_logs.append("90' - FULL TIME!")
            break
            
        time.sleep(0.5) # Simulating time processing
        st.session_state.match_minute += 1
        
        # Increase fatigue over time
        st.session_state.fatigue += random.uniform(0.5, 1.2) * (pressing / 50.0)
        st.session_state.opp_fatigue += random.uniform(0.7, 1.0)
        
        # Extract facts and evaluate expert system
        facts = extract_facts()
        xg_generated, poss, rules_applied = evaluate_tactics(mentality, pressing, tempo, facts)
        
        st.session_state.possession = poss
        
        # Match Engine Probabilities
        rand_event = random.uniform(0, 1.0)
        
        # Accumulate xG
        st.session_state.xg += xg_generated
        st.session_state.opp_xg += 0.05 # Baseline opponent xg
        
        # Check scoring (Expected goals threshold)
        if rand_event < xg_generated: 
            st.session_state.home_score += 1
            st.session_state.match_logs.insert(0, f"⚽ {st.session_state.match_minute}' - GOAL FOR YOU! Amazing tactical build-up!")
            st.balloons()
            
        # Check conceding
        elif rand_event < 0.03: # 3% chance opponent scores independent of you
            st.session_state.away_score += 1
            st.session_state.match_logs.insert(0, f"💔 {st.session_state.match_minute}' - GOAL FOR THE OPPOSITION. Defense caught out!")
            
        # UI UPDATES (Real-time update via st.empty)
        metric_time.metric("Time", f"{st.session_state.match_minute}'", delta=None)
        metric_score.metric("Score", f"HOME {st.session_state.home_score} - {st.session_state.away_score} AWAY")
        metric_xyg.metric("Expected Goals (xG)", f"{st.session_state.xg:.2f}")
        metric_poss.metric("Possession", f"{st.session_state.possession:.0f}% LFC", delta=None)
        
        with reasoning_placeholder.container():
            st.markdown("<div class='panel-box'><h4>EXPERT SYSTEM EVALUATION</h4>", unsafe_allow_html=True)
            st.markdown(f"**Current Context Facts Detected:** `{', '.join(facts)}`")
            for rule in rules_applied:
                st.markdown(rule)
            st.markdown(f"**Fatigue Data:** Team ({st.session_state.fatigue:.1f}%) | Opponent ({st.session_state.opp_fatigue:.1f}%)")
            st.markdown("</div>", unsafe_allow_html=True)
            
        with logs_placeholder.container():
            with st.expander("MATCH LOGS (Live)", expanded=True):
                for log in st.session_state.match_logs[:10]:
                    st.text(log)
                    
    # End playing state
    st.session_state.is_playing = False
    st.rerun() # Force a clean re-render after loop ends to align the state

# Init render if not actively looping
if not st.session_state.is_playing:
    metric_time.metric("Time", f"{st.session_state.match_minute}'", delta=None)
    metric_score.metric("Score", f"HOME {st.session_state.home_score} - {st.session_state.away_score} AWAY")
    
    # Calculate for idle 
    facts = extract_facts()
    xg_gen, poss, rules_applied = evaluate_tactics(mentality, pressing, tempo, facts)
    if 'xg' in st.session_state:
        metric_xyg.metric("Expected Goals (xG)", f"{st.session_state.xg:.2f}")
    if 'possession' in st.session_state:
        metric_poss.metric("Possession", f"{st.session_state.possession:.0f}% HME", delta=None)

    with reasoning_placeholder.container():
        st.markdown("<div class='panel-box'><h4>EXPERT SYSTEM EVALUATION</h4>", unsafe_allow_html=True)
        st.markdown(f"**Current Context Facts Detected:** `{', '.join(facts)}`")
        for rule in rules_applied:
            st.markdown(rule)
        st.markdown(f"**Fatigue Data:** Team ({st.session_state.fatigue:.1f}%) | Opponent ({st.session_state.opp_fatigue:.1f}%)")
        st.markdown("</div>", unsafe_allow_html=True)
        
    with logs_placeholder.container():
        with st.expander("MATCH LOGS (Live)", expanded=True):
            for log in st.session_state.match_logs[:10]:
                st.text(log)
