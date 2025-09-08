// Elements
const graphic = document.getElementById('breathing-graphic');
const instructionTextEl = document.getElementById('instruction-text');
const countdownEl = document.getElementById('countdown');
const patternSelect = document.getElementById('pattern-select');
const playPauseBtn = document.getElementById('play-pause-btn');
const musicPlayPauseBtn = document.getElementById('music-play-pause-btn');
const progressRing = document.querySelector('.progress-ring__circle');
const progressRingSvg = document.querySelector('.progress-ring');
const cycleCounter = document.getElementById('cycle-counter').querySelector('text');
const cycleArrow = document.getElementById('cycle-arrow');
const ekgGraph = document.getElementById('ekg-graph');

// State
let currentPattern = '4-4-4-4';
let animationFrameId;
let isPaused = false;
let isMusicPlaying = false;
let player; // YouTube Player

// Animation State
let currentPhaseIndex = 0;
let timeInPhase = 0;
let lastTimestamp = 0;
let cycleCount = 0;

// Progress Ring
const radius = progressRing.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
progressRing.style.strokeDasharray = `${circumference} ${circumference}`;
progressRing.style.strokeDashoffset = circumference;

function setProgress(percent) {
    const offset = circumference - percent / 100 * circumference;
    progressRing.style.strokeDashoffset = offset;
}

// Breathing Patterns (in seconds)
const patterns = {
    '4-7-8': [
        { name: 'Inhale', duration: 4 },
        { name: 'Hold', duration: 7 },
        { name: 'Exhale', duration: 8 }
    ],
    '4-4-4-4': [
        { name: 'Inhale', duration: 4 },
        { name: 'Hold', duration: 4 },
        { name: 'Exhale', duration: 4 },
        { name: 'Hold', duration: 4 }
    ],
    '5-5-5': [
        { name: 'Inhale', duration: 5 },
        { name: 'Hold', duration: 5 },
        { name: 'Exhale', duration: 5 }
    ]
};

// --- EKG Graph ---
function drawEkg() {
    const pattern = patterns[currentPattern];
    const totalTime = pattern.reduce((sum, p) => sum + p.duration, 0);
    const width = 400;
    const height = 100;
    let path = 'M 0 50';
    let x = 0;

    pattern.forEach(phase => {
        const phaseWidth = (phase.duration / totalTime) * width;
        if (phase.name === 'Inhale') {
            path += ` Q ${x + phaseWidth / 2} 0, ${x + phaseWidth} 50`;
        } else if (phase.name === 'Exhale') {
            path += ` Q ${x + phaseWidth / 2} 100, ${x + phaseWidth} 50`;
        } else { // Hold
            path += ` L ${x + phaseWidth} 50`;
        }
        x += phaseWidth;
    });

    ekgGraph.innerHTML = `
        <path d="${path}" stroke="white" stroke-width="2" fill="none"/>
        <circle id="ekg-ball" cx="0" cy="50" r="4" fill="white"/>
    `;
}

// --- YouTube Player Setup ---
function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        height: '80',
        width: '120',
        videoId: 'jfKfPfyJRdk', // Lofi Girl video ID
        playerVars: {
            'autoplay': 0,
            'loop': 1,
            'playlist': 'jfKfPfyJRdk',
            'controls': 0
        },
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    event.target.setVolume(30);
}

const tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// --- Breathing Animation Cycle ---
function breathingLoop(timestamp) {
    if (lastTimestamp === 0) {
        lastTimestamp = timestamp;
    }
    const deltaTime = (timestamp - lastTimestamp) / 1000; // in seconds
    lastTimestamp = timestamp;

    if (!isPaused) {
        timeInPhase += deltaTime;

        const pattern = patterns[currentPattern];
        const totalPatternTime = pattern.reduce((sum, phase) => sum + phase.duration, 0);
        let timeInPattern = 0;
        for (let i = 0; i < currentPhaseIndex; i++) {
            timeInPattern += pattern[i].duration;
        }
        timeInPattern += timeInPhase;

        const phase = pattern[currentPhaseIndex];

        // Update UI
        instructionTextEl.textContent = phase.name;
        const timeLeft = Math.ceil(phase.duration - timeInPhase);
        countdownEl.textContent = timeLeft > 0 ? timeLeft : '';

        // Update graphic scale
        let scale = 1;
        if (phase.name === 'Inhale') {
            const progress = Math.min(timeInPhase / phase.duration, 1);
            scale = 1 + 0.2 * progress;
        } else if (phase.name === 'Exhale') {
            const progress = Math.min(timeInPhase / phase.duration, 1);
            scale = 1.2 - 0.2 * progress;
        } else if (phase.name === 'Hold' && currentPhaseIndex > 0 && patterns[currentPattern][currentPhaseIndex - 1].name === 'Inhale') {
            scale = 1.2;
        }
        graphic.style.transform = `scale(${scale})`;
        progressRingSvg.style.transform = `scale(${scale}) rotate(-90deg)`;


        // Update progress ring
        const patternProgress = (timeInPattern / totalPatternTime) * 100;
        setProgress(patternProgress);

        // Update EKG ball
        const ekgBall = document.getElementById('ekg-ball');
        const pathEl = ekgGraph.querySelector('path');
        if (pathEl) {
            const point = pathEl.getPointAtLength(patternProgress / 100 * pathEl.getTotalLength());
            ekgBall.setAttribute('cx', point.x);
            ekgBall.setAttribute('cy', point.y);
        }


        if (timeInPhase >= phase.duration) {
            timeInPhase = 0;
            currentPhaseIndex = (currentPhaseIndex + 1) % pattern.length;
            if (currentPhaseIndex === 0) {
                cycleCount++;
                cycleCounter.textContent = cycleCount;
            }
        }
    }

    animationFrameId = requestAnimationFrame(breathingLoop);
}

function startBreathingCycle() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    lastTimestamp = 0; // Reset timestamp
    animationFrameId = requestAnimationFrame(breathingLoop);
}

function resetAnimationState() {
    currentPhaseIndex = 0;
    timeInPhase = 0;
    cycleCount = 0;
    cycleCounter.textContent = 0;
    const pattern = patterns[currentPattern];
    const phase = pattern[0];
    instructionTextEl.textContent = phase.name;
    countdownEl.textContent = phase.duration;
    graphic.style.transform = 'scale(1)';
    progressRingSvg.style.transform = 'scale(1) rotate(-90deg)';
    setProgress(0);
    drawEkg();
}


// --- Event Listeners ---
playPauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    playPauseBtn.innerHTML = isPaused ? '&#9658;' : '&#10074;&#10074;'; // Play/Pause symbols
    const textOverlay = document.querySelector('.text-overlay');
    if (isPaused) {
        graphic.classList.add('paused');
        textOverlay.style.visibility = 'hidden';
    } else {
        graphic.classList.remove('paused');
        textOverlay.style.visibility = 'visible';
        lastTimestamp = 0; // Recalculate deltaTime after pause
    }
});

musicPlayPauseBtn.addEventListener('click', () => {
    isMusicPlaying = !isMusicPlaying;
    musicPlayPauseBtn.textContent = isMusicPlaying ? 'Pause' : 'Play';
    if (player && typeof player.playVideo === 'function') {
        isMusicPlaying ? player.playVideo() : player.pauseVideo();
    }
});

patternSelect.addEventListener('change', (e) => {
    currentPattern = e.target.value;
    resetAnimationState();
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent scrolling
        playPauseBtn.click();
    }
});

// --- Initial call ---
patternSelect.value = '4-4-4-4'; // Set default in dropdown
playPauseBtn.innerHTML = '&#10074;&#10074;'; // Set initial state to pause symbol
resetAnimationState();
startBreathingCycle();
