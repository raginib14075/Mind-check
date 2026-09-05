/**
 * MindCheck Bot - Minimalist App Controller (Zero-Latency Instant UI)
 */

document.addEventListener('DOMContentLoaded', () => {
    // Default Fallback Configuration for 0ms Load Time
    const DEFAULT_CONFIG = {
        intro_questions: [
            "Before we start, how have the last couple of weeks been for you overall?",
            "Has anything in particular been on your mind or contributing to your stress lately?",
            "How would you describe your sleep pattern and energy levels recently, in your own words?"
        ],
        master_questions: [
            {"id": 1, "text": "Little interest or pleasure in doing things you'd normally enjoy", "category": "interest"},
            {"id": 2, "text": "Feeling down, low, or hopeless", "category": "mood"},
            {"id": 3, "text": "Trouble falling/staying asleep, or sleeping much more than usual", "category": "sleep"},
            {"id": 4, "text": "Feeling tired or having little energy", "category": "energy"},
            {"id": 5, "text": "Poor appetite, or eating noticeably more than usual", "category": "appetite"},
            {"id": 6, "text": "Feeling bad about yourself, or that you're a failure", "category": "selfworth"},
            {"id": 7, "text": "Trouble concentrating on things like reading or conversations", "category": "cognition"},
            {"id": 8, "text": "Moving/speaking noticeably slower, or feeling restless/fidgety", "category": "psychomotor"},
            {"id": 9, "text": "Withdrawing from friends, family, or things you'd usually do socially", "category": "isolation"},
            {"id": 10, "text": "Feeling nervous, anxious, or on edge", "category": "anxiety"},
            {"id": 11, "text": "Not being able to stop or control worrying", "category": "anxiety"},
            {"id": 12, "text": "Worrying too much about different things", "category": "anxiety"},
            {"id": 13, "text": "Trouble relaxing or feeling restless", "category": "anxiety"},
            {"id": 14, "text": "Becoming easily annoyed or irritable", "category": "mood"},
            {"id": 15, "text": "Feeling afraid, as if something awful might happen", "category": "anxiety"},
            {"id": 16, "text": "Feeling overwhelmed by daily responsibilities or tasks", "category": "stress"},
            {"id": 17, "text": "Feeling disconnected or detached from your surroundings", "category": "cognition"},
            {"id": 18, "text": "Difficulty making decisions or thinking clearly", "category": "cognition"},
            {"id": 19, "text": "Feeling unmotivated or doubting your abilities", "category": "selfworth"},
            {"id": 20, "text": "Feeling lonely even when around other people", "category": "isolation"}
        ]
    };

    const CRISIS_KEYWORDS = [
        "suicide", "suicidal", "kill myself", "end my life", "end it all", "want to die",
        "no reason to live", "hurt myself", "hurting myself", "self harm", "self-harm",
        "not worth living", "better off dead"
    ];

    const CUE_KEYWORDS = {
        "sleep":     ["sleep", "insomnia", "can't sleep", "oversleep", "tired"],
        "appetite":  ["appetite", "eating", "overeat", "not hungry", "weight"],
        "energy":    ["exhausted", "no energy", "fatigue", "drained"],
        "interest":  ["no interest", "don't enjoy", "bored", "numb"],
        "isolation": ["alone", "isolat", "no one understands", "withdraw"],
        "mood":      ["sad", "down", "hopeless", "empty", "worthless"],
        "anxiety":   ["anxious", "worry", "panic", "nervous", "fear"],
        "stress":    ["overwhelmed", "stressed", "burnout", "pressure"]
    };

    // App State
    let appConfig = DEFAULT_CONFIG;
    let userName = "Guest";
    let selectedMode = 1;
    let qCount = 9;

    let chatQuestions = DEFAULT_CONFIG.intro_questions;
    let chatIndex = 0;
    let chatHistory = [];
    let cueBank = {};

    let quizQuestions = [];
    let quizAnswers = {}; // { qid: score }

    // DOM Elements
    const stageSetup = document.getElementById('stageSetup');
    const stageChat = document.getElementById('stageChat');
    const stageQuiz = document.getElementById('stageQuiz');
    const stageReport = document.getElementById('stageReport');

    const setupForm = document.getElementById('setupForm');
    const userNameInput = document.getElementById('userNameInput');
    const modePills = document.querySelectorAll('.mode-pill');

    const chatLog = document.getElementById('chatLog');
    const chatTextInput = document.getElementById('chatTextInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInputRow = document.getElementById('chatInputRow');
    const chatNextBox = document.getElementById('chatNextBox');
    const proceedToQuizBtn = document.getElementById('proceedToQuizBtn');

    const questionsFeed = document.getElementById('questionsFeed');
    const quizProgressText = document.getElementById('quizProgressText');
    const submitAssessmentBtn = document.getElementById('submitAssessmentBtn');

    const reportUserNameTitle = document.getElementById('reportUserNameTitle');
    const reportScoreVal = document.getElementById('reportScoreVal');
    const reportScoreMax = document.getElementById('reportScoreMax');
    const reportSeverityTag = document.getElementById('reportSeverityTag');
    const reportPatternText = document.getElementById('reportPatternText');
    const catList = document.getElementById('catList');
    const cuesTags = document.getElementById('cuesTags');
    const convoCuesBox = document.getElementById('convoCuesBox');
    const restartAppBtn = document.getElementById('restartAppBtn');
    const crisisModal = document.getElementById('crisisModal');

    // Async Non-Blocking Config Refresh
    async function loadServerConfig() {
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const remoteConfig = await res.json();
                if (remoteConfig.intro_questions && remoteConfig.master_questions) {
                    appConfig = remoteConfig;
                    chatQuestions = appConfig.intro_questions;
                }
            }
        } catch (e) {
            console.warn("Using offline configuration fallback", e);
        }
    }
    loadServerConfig();

    function setStage(stageId) {
        [stageSetup, stageChat, stageQuiz, stageReport].forEach(s => s.classList.remove('active'));
        document.getElementById(stageId).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // --- SETUP STAGE ---
    modePills.forEach(pill => {
        pill.addEventListener('click', () => {
            modePills.forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            selectedMode = parseInt(pill.dataset.mode);
            qCount = parseInt(pill.dataset.count);
        });
    });

    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        userName = userNameInput.value.trim() || "Guest";
        setStage('stageChat');
        startChatStage();
    });


    // --- CHAT STAGE ---
    function startChatStage() {
        chatLog.innerHTML = '';
        chatHistory = [];
        chatIndex = 0;
        cueBank = {};
        chatInputRow.classList.remove('hidden');
        chatNextBox.classList.add('hidden');

        addChatBubble('bot', `Hello ${userName}. Let's start with a gentle conversational check-in.`);
        setTimeout(() => askNextChatQuestion(), 200);
    }

    function askNextChatQuestion() {
        if (chatIndex < chatQuestions.length) {
            addChatBubble('bot', chatQuestions[chatIndex]);
        } else {
            chatInputRow.classList.add('hidden');
            chatNextBox.classList.remove('hidden');
        }
    }

    function addChatBubble(sender, text) {
        const row = document.createElement('div');
        row.className = `chat-bubble-row ${sender}`;
        row.innerHTML = `<div class="chat-msg-bubble">${escapeHtml(text)}</div>`;
        chatLog.appendChild(row);
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    function checkCrisisLocal(text) {
        const lowered = text.toLowerCase();
        return CRISIS_KEYWORDS.some(kw => lowered.includes(kw));
    }

    function detectCuesLocal(text) {
        const lowered = text.toLowerCase();
        for (const [cue, keywords] of Object.entries(CUE_KEYWORDS)) {
            for (const kw of keywords) {
                if (lowered.includes(kw)) {
                    cueBank[cue] = (cueBank[cue] || 0) + 1;
                    break;
                }
            }
        }
    }

    function handleChatSubmit() {
        const text = chatTextInput.value.trim();
        if (!text) return;

        addChatBubble('user', text);
        chatTextInput.value = '';
        chatHistory.push(text);

        // Instant 0ms Local Safety Check
        if (checkCrisisLocal(text)) {
            crisisModal.classList.remove('hidden');
        }

        // Instant local cue detection
        detectCuesLocal(text);

        // Advance to next question instantly
        chatIndex++;
        setTimeout(() => askNextChatQuestion(), 200);
    }

    chatSendBtn.addEventListener('click', handleChatSubmit);
    chatTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChatSubmit();
        }
    });

    proceedToQuizBtn.addEventListener('click', () => {
        setStage('stageQuiz');
        buildQuestionnaireFeed();
    });


    // --- QUESTIONNAIRE FEED STAGE ---
    function buildQuestionnaireFeed() {
        quizQuestions = appConfig.master_questions.slice(0, qCount);
        quizAnswers = {};
        questionsFeed.innerHTML = '';
        updateSubmitBar();

        const ratingLabels = [
            { score: 0, label: '0 · Not at all' },
            { score: 1, label: '1 · Several days' },
            { score: 2, label: '2 · Half the days' },
            { score: 3, label: '3 · Nearly every day' }
        ];

        quizQuestions.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'q-card';
            card.dataset.qid = q.id;

            card.innerHTML = `
                <div class="q-card-meta">Question ${index + 1} of ${quizQuestions.length} — last two weeks</div>
                <div class="q-card-text">${escapeHtml(q.text)}</div>
                <div class="q-rating-row">
                    ${ratingLabels.map(r => `
                        <button type="button" class="q-rating-pill" data-score="${r.score}">
                            ${r.label}
                        </button>
                    `).join('')}
                </div>
            `;

            const pills = card.querySelectorAll('.q-rating-pill');
            pills.forEach(pill => {
                pill.addEventListener('click', () => {
                    const score = parseInt(pill.dataset.score);
                    quizAnswers[q.id] = score;

                    pills.forEach(p => p.classList.remove('selected'));
                    pill.classList.add('selected');

                    updateSubmitBar();
                });
            });

            questionsFeed.appendChild(card);
        });
    }

    function updateSubmitBar() {
        const answeredCount = Object.keys(quizAnswers).length;
        const total = quizQuestions.length;
        quizProgressText.textContent = `${answeredCount} of ${total} answered`;

        submitAssessmentBtn.disabled = answeredCount < total;
    }

    // --- INSTANT 0MS REPORT GENERATOR ---
    function computeLocalAssessment() {
        const items = quizQuestions;
        let totalScore = 0;
        const categoryScores = {};

        items.forEach(item => {
            const score = quizAnswers[item.id] || 0;
            totalScore += score;
            categoryScores[item.category] = (categoryScores[item.category] || 0) + score;
        });

        const maxScore = items.length * 3;
        const pct = maxScore > 0 ? totalScore / maxScore : 0;

        let severity = "Minimal";
        if (pct > 0.75) severity = "Severe";
        else if (pct > 0.55) severity = "Moderately severe";
        else if (pct > 0.35) severity = "Moderate";
        else if (pct > 0.15) severity = "Mild";

        // Symptom Pattern
        let pattern = "None detected (scores within normal range)";
        if (Object.keys(categoryScores).length > 0 && Math.max(...Object.values(categoryScores)) > 0) {
            const maxVal = Math.max(...Object.values(categoryScores));
            const topCats = Object.keys(categoryScores).filter(cat => categoryScores[cat] === maxVal);
            
            const patternMap = {
                "sleep":       "Sleep/appetite-dominant pattern",
                "appetite":    "Sleep/appetite-dominant pattern",
                "energy":      "Low-energy / fatigue-dominant pattern",
                "interest":    "Anhedonia-dominant pattern",
                "mood":        "Mood-dominant pattern",
                "selfworth":   "Self-worth/cognitive-dominant pattern",
                "cognition":   "Self-worth/cognitive-dominant pattern",
                "psychomotor": "Psychomotor-dominant pattern",
                "isolation":   "Social-withdrawal-dominant pattern",
                "anxiety":     "Anxiety-dominant pattern",
                "stress":      "Stress & burnout pattern"
            };

            const topLabels = [...new Set(topCats.map(c => patternMap[c] || "Mixed pattern"))];
            pattern = topLabels.join(" & ");
        }

        const convoNotes = Object.entries(cueBank)
            .sort((a, b) => b[1] - a[1])
            .map(([cue, count]) => `Mentioned ${cue}-related themes (${count} time${count > 1 ? 's' : ''})`);

        return {
            total_score: totalScore,
            max_score: maxScore,
            severity,
            pattern,
            category_scores: categoryScores,
            convo_notes: convoNotes
        };
    }

    submitAssessmentBtn.addEventListener('click', () => {
        setStage('stageReport');
        reportUserNameTitle.textContent = `Summary for ${userName}`;

        // Instant 0ms Local Report Rendering
        const data = computeLocalAssessment();

        reportScoreVal.textContent = data.total_score;
        reportScoreMax.textContent = `/ ${data.max_score}`;
        reportSeverityTag.textContent = data.severity;
        reportPatternText.textContent = data.pattern;

        // Category breakdown
        catList.innerHTML = '';
        if (data.category_scores) {
            Object.entries(data.category_scores).forEach(([cat, score]) => {
                const item = document.createElement('div');
                item.className = 'cat-item';
                item.innerHTML = `
                    <span>${capitalize(cat)}</span>
                    <strong>${score} pts</strong>
                `;
                catList.appendChild(item);
            });
        }

        // Keyword Cues
        cuesTags.innerHTML = '';
        if (data.convo_notes && data.convo_notes.length > 0) {
            convoCuesBox.classList.remove('hidden');
            data.convo_notes.forEach(note => {
                const tag = document.createElement('span');
                tag.className = 'cue-pill';
                tag.textContent = note;
                cuesTags.appendChild(tag);
            });
        } else {
            convoCuesBox.classList.add('hidden');
        }
    });

    restartAppBtn.addEventListener('click', () => {
        setStage('stageSetup');
    });

    function escapeHtml(text) {
        return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
});
