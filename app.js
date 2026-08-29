/* ==========================================================================
   Khmer Typing Master & Q&A Suite - Core Logic Application Script
   Matching exact screenshot specs with full feature set & animations
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --------------------------------------------------------------------------
    // 1. Words Database Management
    // --------------------------------------------------------------------------
    let wordsDB = JSON.parse(localStorage.getItem('kh_words_db')) || [];

    // Application State Variables
    let currentLesson = 'មេរៀនទី ០១';
    let currentWordList = [];
    let currentWordIndex = 0;
    let timerSeconds = 163; // 02:43 default (163 seconds)
    let initialConfigSeconds = 163;
    let timerInterval = null;
    let isTimerRunning = false;
    let totalTypedCorrect = 0;
    let totalTypedErrors = 0;
    let audioContext = null;

    // DOM Elements
    const ribbonBtns = document.querySelectorAll('.ribbon-btn');
    const tabScreens = document.querySelectorAll('.tab-screen');

    const userNameInput = document.getElementById('userNameInput');
    const lessonSelect = document.getElementById('lessonSelect');
    const timerSelect = document.getElementById('timerSelect');
    const customTimerGroup = document.getElementById('customTimerGroup');
    const customMinutesInput = document.getElementById('customMinutesInput');
    const timerConfigSelect = document.getElementById('timerConfigSelect');
    const digitalTimerText = document.getElementById('digitalTimerText');
    const startPracticeBtn = document.getElementById('startPracticeBtn');
    const viewResultBtn = document.getElementById('viewResultBtn');

    const targetWordText = document.getElementById('targetWordText');
    const keyBreakdownText = document.getElementById('keyBreakdownText');
    const practiceInput = document.getElementById('practiceInput');
    const currentWordNum = document.getElementById('currentWordNum');
    const totalWordNum = document.getElementById('totalWordNum');

    const resultModal = document.getElementById('resultModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalOkBtn = document.getElementById('modalOkBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    const resCandidateName = document.getElementById('resCandidateName');
    const resLessonName = document.getElementById('resLessonName');
    const resWpm = document.getElementById('resWpm');
    const resAccuracy = document.getElementById('resAccuracy');
    const resCorrectCount = document.getElementById('resCorrectCount');
    const resTimeSpent = document.getElementById('resTimeSpent');
    const resGradeBadge = document.getElementById('resGradeBadge');

    // --------------------------------------------------------------------------
    // 2. Audio Beep Generator (Web Audio API)
    // --------------------------------------------------------------------------
    function playBeepSound(type = 'key') {
        try {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);

            if (type === 'key') {
                osc.frequency.setValueAtTime(600, audioContext.currentTime);
                gain.gain.setValueAtTime(0.05, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.04);
                osc.start();
                osc.stop(audioContext.currentTime + 0.04);
            } else if (type === 'success') {
                osc.frequency.setValueAtTime(800, audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.12);
                gain.gain.setValueAtTime(0.1, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
                osc.start();
                osc.stop(audioContext.currentTime + 0.15);
            } else if (type === 'error') {
                osc.frequency.setValueAtTime(250, audioContext.currentTime);
                gain.gain.setValueAtTime(0.15, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);
                osc.start();
                osc.stop(audioContext.currentTime + 0.15);
            }
        } catch (e) {
            console.log('Audio not allowed yet');
        }
    }

    // --------------------------------------------------------------------------
    // 3. Khmer Key Breakdown Hint Generator
    // --------------------------------------------------------------------------
    function generateKhmerBreakdown(word) {
        if (!word) return '';

        // Known exact breakdown mapping for key words
        const knownMappings = {
            'លោក ស៊ិន សារ៉ាត': 'ល+េ+ា+ក+ដកឃ្លា+ស+៊+ិ+ន+ដកឃ្លា+ស+ារ+៉+ត',
            'អនុប្រធាននាយកដ្ឋាន': 'អ+ន+ុ+ប+្រ+ធ+ា+ន+ន+ា+យ+ក+ដ្ឋ+ា+ន',
            'បក្សសម្ព័ន្ធយុវជន': 'ប+ក+្ស+ស+ម+្ព+័+ន+្ធ+យ+ុ+វ+ជ+ន',
            'គ្រូបង្គោលថ្នាក់ជាតិ': 'គ+្រ+ូ+ប+ង+្គ+ោ+ល+ថ+្ន+ា+ក+់+ជ+ា+ត+ិ',
            'កញ្ញា ទូច ស៊ុននិច': 'ក+ញ+្ញ+ា+ដកឃ្លា+ទ+ូ+ច+ដកឃ្លា+ស+៊+ុ+ន+ន+ិ+ច',
            'ព្រះរាជាណាចក្រកម្ពុជា': 'ព+្រ+ះ+រ+ា+ជ+ា+ណ+ា+ច+ក+្រ+ក+ម+្ព+ុ+ជ+ា'
        };

        if (knownMappings[word]) {
            return knownMappings[word];
        }

        // Generic fallback breakdown
        let breakdownParts = [];
        for (let i = 0; i < word.length; i++) {
            let char = word[i];
            if (char === ' ') {
                breakdownParts.push('ដកឃ្លា');
            } else if (char === '្') {
                if (i + 1 < word.length) {
                    breakdownParts.push('្' + word[i + 1]);
                    i++;
                } else {
                    breakdownParts.push('្');
                }
            } else {
                breakdownParts.push(char);
            }
        }
        return breakdownParts.join('+');
    }

    // --------------------------------------------------------------------------
    // 4. Practice Workspace Setup & Word Loading
    // --------------------------------------------------------------------------
    function loadLessonWords() {
        currentLesson = lessonSelect.value;
        currentWordList = wordsDB.filter(w => w.group === currentLesson);

        if (currentWordList.length === 0 && wordsDB.length > 0) {
            currentWordList = wordsDB;
        }

        currentWordIndex = 0;
        totalWordNum.textContent = currentWordList.length;
        if (currentWordList.length === 0) {
            targetWordText.textContent = 'គ្មានទិន្នន័យពាក្យ';
            if (keyBreakdownText) keyBreakdownText.textContent = '';
        } else {
            renderCurrentWord();
        }
    }

    function renderCurrentWord() {
        if (currentWordIndex >= currentWordList.length) {
            finishPracticeSession();
            return;
        }

        const activeObj = currentWordList[currentWordIndex];
        targetWordText.textContent = activeObj.word;
        keyBreakdownText.textContent = generateKhmerBreakdown(activeObj.word);
        currentWordNum.textContent = currentWordIndex + 1;
        practiceInput.value = '';
    }

    // --------------------------------------------------------------------------
    // 5. Timer Functions (Digital Red Clock 02 : 43)
    // --------------------------------------------------------------------------
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const mm = String(mins).padStart(2, '0');
        const ss = String(secs).padStart(2, '0');
        return `${mm} : ${ss}`;
    }

    function updateDigitalTimerDisplay() {
        digitalTimerText.textContent = formatTime(timerSeconds);
    }

    function startTimer() {
        if (isTimerRunning) return;
        isTimerRunning = true;

        timerInterval = setInterval(() => {
            if (timerSeconds > 0) {
                timerSeconds--;
                updateDigitalTimerDisplay();
            } else {
                clearInterval(timerInterval);
                isTimerRunning = false;
                finishPracticeSession();
            }
        }, 1000);
    }

    function resetTimer() {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timerSeconds = initialConfigSeconds;
        updateDigitalTimerDisplay();
    }

    // --------------------------------------------------------------------------
    // 6. Practice Logic & Input Handling
    // --------------------------------------------------------------------------
    practiceInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent newline insertion in textarea

            if (!isTimerRunning) {
                startTimer();
            }

            const typed = practiceInput.value.trim();
            const targetObj = currentWordList[currentWordIndex];
            const target = targetObj ? targetObj.word.trim() : '';

            if (typed.length > 0) {
                if (typed === target) {
                    playBeepSound('success');
                    totalTypedCorrect += target.length;
                } else {
                    playBeepSound('error');
                    totalTypedErrors++;
                }
                currentWordIndex++;
                renderCurrentWord();
            }
        }
    });

    practiceInput.addEventListener('input', (e) => {
        if (!isTimerRunning) {
            startTimer();
        }

        playBeepSound('key');

        const typed = practiceInput.value;
        const target = currentWordList[currentWordIndex] ? currentWordList[currentWordIndex].word : '';

        // Check if full word matches
        if (typed.trim() === target.trim()) {
            playBeepSound('success');
            totalTypedCorrect += target.length;
            currentWordIndex++;
            renderCurrentWord();
        } else if (target.startsWith(typed)) {
            // Typing correctly so far
            practiceInput.style.borderColor = '#000099';
        } else {
            // Error in typing
            playBeepSound('error');
            practiceInput.style.borderColor = '#cc0000';
            totalTypedErrors++;
        }
    });

    // Start Button Handler
    startPracticeBtn.addEventListener('click', () => {
        loadLessonWords();
        resetTimer();
        startTimer();
        practiceInput.focus();
        playBeepSound('success');
    });

    // View Results Button Handler
    viewResultBtn.addEventListener('click', () => {
        showResultsModal();
    });

    // Lesson Select Change Handler
    lessonSelect.addEventListener('change', () => {
        loadLessonWords();
        resetTimer();
    });

    // Timer Configuration Handler
    function handleTimerSelectChange() {
        const val = timerSelect.value;
        if (val === 'custom') {
            customTimerGroup.classList.remove('hidden');
            const customMins = parseInt(customMinutesInput.value, 10) || 3;
            initialConfigSeconds = customMins * 60;
        } else {
            customTimerGroup.classList.add('hidden');
            initialConfigSeconds = parseInt(val, 10) || 163;
        }
        if (timerConfigSelect) {
            timerConfigSelect.value = (val === '600' || val === '300' || val === '180') ? val : '180';
        }
        resetTimer();
    }

    if (timerSelect) {
        timerSelect.addEventListener('change', handleTimerSelectChange);
    }

    if (customMinutesInput) {
        customMinutesInput.addEventListener('input', () => {
            const mins = Math.max(1, parseInt(customMinutesInput.value, 10) || 1);
            initialConfigSeconds = mins * 60;
            resetTimer();
        });
    }

    if (timerConfigSelect) {
        timerConfigSelect.addEventListener('change', () => {
            const val = timerConfigSelect.value;
            initialConfigSeconds = parseInt(val, 10) || 180;
            if (timerSelect) timerSelect.value = val;
            if (customTimerGroup) customTimerGroup.classList.add('hidden');
            resetTimer();
        });
    }

    // Direct click on timer display box to focus timer selection
    if (digitalTimerText) {
        digitalTimerText.parentElement.addEventListener('click', () => {
            if (timerSelect) {
                timerSelect.focus();
                timerSelect.click();
            }
        });
    }

    // Font Style & Size Controls
    const fontStyleSelect = document.getElementById('fontStyleSelect');
    const fontStyleSelectSettings = document.getElementById('fontStyleSelectSettings');
    const fontSizeSelect = document.getElementById('fontSizeSelect');

    let savedFontStyle = localStorage.getItem('kh_font_style') || "'Moul', cursive, serif";
    let savedFontSize = localStorage.getItem('kh_font_size') || 'medium';

    function applyFontStyle(fontFamily) {
        if (!fontFamily) return;
        localStorage.setItem('kh_font_style', fontFamily);

        if (fontStyleSelect && fontStyleSelect.value !== fontFamily) fontStyleSelect.value = fontFamily;
        if (fontStyleSelectSettings && fontStyleSelectSettings.value !== fontFamily) fontStyleSelectSettings.value = fontFamily;

        const targetWordText = document.getElementById('targetWordText');
        if (targetWordText) targetWordText.style.fontFamily = fontFamily;

        const practiceInput = document.getElementById('practiceInput');
        if (practiceInput) practiceInput.style.fontFamily = fontFamily;

        const keyBreakdownText = document.getElementById('keyBreakdownText');
        if (keyBreakdownText) keyBreakdownText.style.fontFamily = fontFamily;

        const consonantTarget = document.getElementById('consonantTarget');
        if (consonantTarget) consonantTarget.style.fontFamily = fontFamily;

        const examTextDisplay = document.getElementById('examTextDisplay');
        if (examTextDisplay) examTextDisplay.style.fontFamily = fontFamily;

        const examInput = document.getElementById('examInput');
        if (examInput) examInput.style.fontFamily = fontFamily;
    }

    function applyFontSize(sizeKey) {
        if (!sizeKey) return;
        localStorage.setItem('kh_font_size', sizeKey);
        if (fontSizeSelect && fontSizeSelect.value !== sizeKey) fontSizeSelect.value = sizeKey;

        const targetWordText = document.getElementById('targetWordText');
        const practiceInput = document.getElementById('practiceInput');

        let targetSize = '46px';
        let inputSize = '38px';

        if (sizeKey === 'small') {
            targetSize = '34px';
            inputSize = '28px';
        } else if (sizeKey === 'medium') {
            targetSize = '46px';
            inputSize = '38px';
        } else if (sizeKey === 'large') {
            targetSize = '58px';
            inputSize = '48px';
        } else if (sizeKey === 'xlarge') {
            targetSize = '72px';
            inputSize = '58px';
        }

        if (targetWordText) targetWordText.style.fontSize = targetSize;
        if (practiceInput) practiceInput.style.fontSize = inputSize;
    }

    if (fontStyleSelect) {
        fontStyleSelect.value = savedFontStyle;
        fontStyleSelect.addEventListener('change', () => applyFontStyle(fontStyleSelect.value));
    }
    if (fontStyleSelectSettings) {
        fontStyleSelectSettings.value = savedFontStyle;
        fontStyleSelectSettings.addEventListener('change', () => applyFontStyle(fontStyleSelectSettings.value));
    }
    if (fontSizeSelect) {
        fontSizeSelect.value = savedFontSize;
        fontSizeSelect.addEventListener('change', () => applyFontSize(fontSizeSelect.value));
    }

    // Apply initially on load
    applyFontStyle(savedFontStyle);
    applyFontSize(savedFontSize);

    // --------------------------------------------------------------------------
    // 7. Results Modal & PDF Export
    // --------------------------------------------------------------------------
    function finishPracticeSession() {
        clearInterval(timerInterval);
        isTimerRunning = false;

        // Trigger confetti celebration
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }

        showResultsModal();
    }

    function showResultsModal() {
        const candidateName = userNameInput.value || 'ឈ្មោះអ្នកប្រើ';
        const lessonName = lessonSelect.value || 'មេរៀនទី ០១';

        resCandidateName.textContent = candidateName;
        resLessonName.textContent = lessonName;

        const timeElapsed = initialConfigSeconds - timerSeconds;
        const minsElapsed = Math.max(timeElapsed / 60, 0.1);
        const wpm = Math.round((totalTypedCorrect / 5) / minsElapsed) || 18;
        const totalAttempts = totalTypedCorrect + totalTypedErrors;
        const accuracy = totalAttempts > 0 ? Math.round((totalTypedCorrect / totalAttempts) * 100) : 98;

        // Score formula: 3 points per word + flat 5 points speed bonus if finished between 1 and 4 mins (60s - 240s)
        const wordScore = currentWordIndex * 3;
        const isBetween1And4Mins = timeElapsed >= 60 && timeElapsed <= 240;
        const speedBonus = isBetween1And4Mins ? 5 : 0;
        const totalScore = wordScore + speedBonus;

        resWpm.textContent = wpm;
        resAccuracy.textContent = accuracy + '%';
        resCorrectCount.textContent = `${currentWordIndex}/${currentWordList.length}`;
        resTimeSpent.textContent = formatTime(timeElapsed).replace(' : ', ':');

        const resTotalScore = document.getElementById('resTotalScore');
        const resScoreDetail = document.getElementById('resScoreDetail');
        if (resTotalScore) {
            resTotalScore.textContent = `${totalScore} ពិន្ទុ`;
        }
        if (resScoreDetail) {
            if (isBetween1And4Mins) {
                resScoreDetail.textContent = `(${wordScore} ពិន្ទុពាក្យ + ៥ ពិន្ទុប្រាក់រង្វាន់ល្បឿន ក្នុងចន្លោះ ១-៤នាទី)`;
            } else {
                resScoreDetail.textContent = `(${wordScore} ពិន្ទុពាក្យ - ក្រៅចន្លោះ ១-៤នាទី មិនមានប្រាក់រង្វាន់ល្បឿន)`;
            }
        }

        if (accuracy >= 90) {
            resGradeBadge.textContent = 'ល្អប្រសើរណាស់ 👏';
        } else if (accuracy >= 75) {
            resGradeBadge.textContent = 'ល្អបង្គួរ 👍';
        } else {
            resGradeBadge.textContent = 'ត្រូវព្យាយាមបន្ថែម 💪';
        }

        // Auto sync results to Google Sheets if configured
        saveResultToGoogleSheets(
            candidateName,
            lessonName,
            `${wpm} WPM (${totalScore} ពិន្ទុ)`,
            accuracy + '%',
            formatTime(timeElapsed).replace(' : ', ':')
        );

        resultModal.classList.remove('hidden');
    }

    modalCloseBtn.addEventListener('click', () => resultModal.classList.add('hidden'));
    modalOkBtn.addEventListener('click', () => resultModal.classList.add('hidden'));

    exportPdfBtn.addEventListener('click', () => {
        if (typeof html2pdf !== 'undefined') {
            const element = document.querySelector('.modal-card');
            const opt = {
                margin:       10,
                filename:     `Khmer_Typing_Result_${userNameInput.value}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save();
        } else {
            alert('លទ្ធផលត្រូវបានរក្សាទុក!');
        }
    });

    // --------------------------------------------------------------------------
    // 8. Ribbon Navigation Tab Switching
    // --------------------------------------------------------------------------
    ribbonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            ribbonBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabScreens.forEach(screen => {
                if (screen.id === targetTab) {
                    screen.classList.remove('hidden');
                } else {
                    screen.classList.add('hidden');
                }
            });

            playBeepSound('key');
        });
    });

    // --------------------------------------------------------------------------
    // 9. Consonants Practice Module (Tab 2)
    // --------------------------------------------------------------------------
    const KHMER_CONSONANTS = [
        { char: 'ក', key: 'a' }, { char: 'ខ', key: 'x' }, { char: 'គ', key: 'k' },
        { char: 'ឃ', key: 'X' }, { char: 'ង', key: 'g' }, { char: 'ច', key: 'c' },
        { char: 'ឆ', key: 'q' }, { char: 'ជ', key: 'C' }, { char: 'ឈ', key: 'Q' },
        { char: 'ញ', key: 'J' }, { char: 'ដ', key: 'd' }, { char: 'ឋ', key: 'z' },
        { char: 'ឌ', key: 'D' }, { char: 'ឍ', key: 'Z' }, { char: 'ណ', key: 'N' },
        { char: 'ត', key: 't' }, { char: 'ថ', key: 'f' }, { char: 'ទ', key: 'p' },
        { char: 'ធ', key: 'T' }, { char: 'ន', key: 'n' }, { char: 'ប', key: 'b' },
        { char: 'ផ', char_key: 'p' }, { char: 'ព', key: 'B' }, { char: 'ភ', key: 'P' },
        { char: 'ម', key: 'm' }, { char: 'យ', key: 'y' }, { char: 'រ', key: 'r' },
        { char: 'ល', key: 'l' }, { char: 'វ', key: 'v' }, { char: 'ស', key: 's' },
        { char: 'ហ', key: 'h' }, { char: 'ឡ', key: 'L' }, { char: 'អ', key: 'G' }
    ];

    const consonantGrid = document.getElementById('consonantGrid');
    const consonantTarget = document.getElementById('consonantTarget');
    const consonantHint = document.getElementById('consonantHint');
    const consonantInput = document.getElementById('consonantInput');

    if (consonantGrid) {
        KHMER_CONSONANTS.forEach(item => {
            const card = document.createElement('div');
            card.className = 'consonant-card';
            card.innerHTML = `
                <div class="consonant-char">${item.char}</div>
                <div class="consonant-key">${item.key}</div>
            `;
            card.addEventListener('click', () => {
                consonantTarget.textContent = item.char;
                consonantHint.textContent = `ចុចសោ '${item.key}' លើក្តារចុច`;
                consonantInput.value = '';
                consonantInput.focus();
            });
            consonantGrid.appendChild(card);
        });

        consonantInput.addEventListener('input', () => {
            if (consonantInput.value.trim() === consonantTarget.textContent) {
                playBeepSound('success');
                const nextIndex = Math.floor(Math.random() * KHMER_CONSONANTS.length);
                const nextItem = KHMER_CONSONANTS[nextIndex];
                consonantTarget.textContent = nextItem.char;
                consonantHint.textContent = `ចុចសោ '${nextItem.key}' លើក្តារចុច`;
                consonantInput.value = '';
            }
        });
    }

    // --------------------------------------------------------------------------
    // 10. Q&A Quiz Module (Tab 3) & Custom Q&A Management
    // --------------------------------------------------------------------------
    const DEFAULT_QA_DATA = [
        {
            q: 'តើព្រះរាជាណាចក្រកម្ពុជាមានរាជធានីឈ្មោះអ្វី?',
            options: ['ខេត្តសៀមរាប', 'រាជធានីភ្នំពេញ', 'ខេត្តបាត់ដំបង', 'ខេត្តព្រះសីហនុ'],
            answer: 1
        },
        {
            q: 'តើប្រាសាទអង្គរវត្តត្រូវ បានកសាងឡើងក្នុងរជ្ជកាលព្រះមហាក្សត្រអង្គណា?',
            options: ['ព្រះបាទជ័យវរ្ម័នទី៧', 'ព្រះបាទសូរ្យវរ្ម័នទី២', 'ព្រះបាទនរោត្តម', 'ព្រះបាទមុនីវង្ស'],
            answer: 1
        },
        {
            q: 'តើព្យញ្ជនៈខ្មែរមានចំនួនប៉ុន្មានតួ?',
            options: ['២៤ តួ', '៣៣ តួ', '៣៥ តួ', '៤០ តួ'],
            answer: 1
        }
    ];

    let qaDataList = JSON.parse(localStorage.getItem('kh_qa_data')) || DEFAULT_QA_DATA;

    let currentQaIndex = 0;
    const qaNumber = document.getElementById('qaNumber');
    const qaQuestion = document.getElementById('qaQuestion');
    const qaOptionsGrid = document.getElementById('qaOptionsGrid');
    const qaFeedback = document.getElementById('qaFeedback');
    const nextQaBtn = document.getElementById('nextQaBtn');

    const openAddQaModalBtn = document.getElementById('openAddQaModalBtn');
    const addQaModal = document.getElementById('addQaModal');
    const closeAddQaModalBtn = document.getElementById('closeAddQaModalBtn');
    const closeAddQaModalFooterBtn = document.getElementById('closeAddQaModalFooterBtn');
    const saveQaQuestionBtn = document.getElementById('saveQaQuestionBtn');
    const newQaQuestionInput = document.getElementById('newQaQuestionInput');
    const newQaOpt1Input = document.getElementById('newQaOpt1Input');
    const newQaOpt2Input = document.getElementById('newQaOpt2Input');
    const newQaOpt3Input = document.getElementById('newQaOpt3Input');
    const newQaOpt4Input = document.getElementById('newQaOpt4Input');
    const newQaCorrectSelect = document.getElementById('newQaCorrectSelect');
    const qaQuestionsListTable = document.getElementById('qaQuestionsListTable');

    let qaScore = 0;
    let qaAnsweredCount = 0;

    const qaResultModal = document.getElementById('qaResultModal');
    const qaResultBadge = document.getElementById('qaResultBadge');
    const qaResultScore = document.getElementById('qaResultScore');
    const qaResultPercent = document.getElementById('qaResultPercent');
    const qaResultRestartBtn = document.getElementById('qaResultRestartBtn');
    const qaResultCloseBtn = document.getElementById('qaResultCloseBtn');

    function renderQaQuestion() {
        if (!qaQuestion) return;
        if (qaDataList.length === 0) {
            qaNumber.textContent = 'សំណួរទី ០០';
            qaQuestion.textContent = 'គ្មានសំណួរ-ចម្លើយក្នុងប្រព័ន្ធទេ! សូមចុចប៊ូតុងខាងលើដើម្បីបន្ថែមសំណួរថ្មី។';
            qaOptionsGrid.innerHTML = '';
            qaFeedback.classList.add('hidden');
            nextQaBtn.classList.add('hidden');
            return;
        }

        if (currentQaIndex >= qaDataList.length) {
            showQaResults();
            return;
        }

        const qData = qaDataList[currentQaIndex];
        const numStr = (currentQaIndex + 1).toString().padStart(2, '0');
        const totalStr = qaDataList.length.toString().padStart(2, '0');
        qaNumber.textContent = `សំណួរទី ${numStr} / ${totalStr}`;
        qaQuestion.textContent = qData.q;
        qaOptionsGrid.innerHTML = '';
        qaFeedback.classList.add('hidden');
        nextQaBtn.classList.add('hidden');

        qData.options.forEach((optText, index) => {
            const btn = document.createElement('button');
            btn.className = 'qa-option-btn';
            btn.textContent = `${index + 1}. ${optText}`;
            btn.addEventListener('click', () => {
                const buttons = qaOptionsGrid.querySelectorAll('.qa-option-btn');
                buttons.forEach(b => b.disabled = true);
                
                qaAnsweredCount++;
                if (index === qData.answer) {
                    btn.classList.add('correct');
                    qaFeedback.textContent = '✓ ចម្លើយត្រឹមត្រូវ! អបអរសាទរ';
                    qaFeedback.className = 'qa-feedback text-green';
                    playBeepSound('success');
                    qaScore++;
                } else {
                    btn.classList.add('incorrect');
                    if (buttons[qData.answer]) buttons[qData.answer].classList.add('correct');
                    qaFeedback.textContent = '✕ ចម្លើយមិនត្រឹមត្រូវទេ!';
                    qaFeedback.className = 'qa-feedback text-red';
                    playBeepSound('error');
                }
                
                qaFeedback.classList.remove('hidden');

                if (currentQaIndex === qaDataList.length - 1) {
                    nextQaBtn.innerHTML = 'មើលលទ្ធផលសរុប <i class="fa-solid fa-trophy"></i>';
                } else {
                    nextQaBtn.innerHTML = 'សំណួរ​បន្ទាប់ <i class="fa-solid fa-arrow-right"></i>';
                }
                nextQaBtn.classList.remove('hidden');
            });
            qaOptionsGrid.appendChild(btn);
        });
    }

    function showQaResults() {
        if (!qaResultModal) return;
        const total = qaDataList.length;
        const percent = total > 0 ? Math.round((qaScore / total) * 100) : 0;

        if (qaResultScore) qaResultScore.textContent = `${qaScore} / ${total}`;
        if (qaResultPercent) qaResultPercent.textContent = `${percent}%`;

        if (qaResultBadge) {
            if (percent === 100) {
                qaResultBadge.textContent = '🏆 ឆ្នើមណាស់! (១០០%)';
                qaResultBadge.style.color = '#16a34a';
                if (typeof confetti === 'function') confetti();
            } else if (percent >= 70) {
                qaResultBadge.textContent = '👍 ល្អប្រសើរណាស់!';
                qaResultBadge.style.color = '#2563eb';
            } else {
                qaResultBadge.textContent = '💪 ត្រូវព្យាយាមបន្ថែម!';
                qaResultBadge.style.color = '#dc2626';
            }
        }

        qaResultModal.classList.remove('hidden');
    }

    function resetQaQuiz() {
        currentQaIndex = 0;
        qaScore = 0;
        qaAnsweredCount = 0;
        renderQaQuestion();
    }

    if (qaResultRestartBtn) {
        qaResultRestartBtn.addEventListener('click', () => {
            if (qaResultModal) qaResultModal.classList.add('hidden');
            resetQaQuiz();
        });
    }

    if (qaResultCloseBtn) {
        qaResultCloseBtn.addEventListener('click', () => {
            if (qaResultModal) qaResultModal.classList.add('hidden');
            resetQaQuiz();
        });
    }

    if (nextQaBtn) {
        nextQaBtn.addEventListener('click', () => {
            currentQaIndex++;
            if (currentQaIndex >= qaDataList.length) {
                showQaResults();
            } else {
                renderQaQuestion();
            }
        });
    }

    function renderQaQuestionsListTable() {
        if (!qaQuestionsListTable) return;
        if (qaDataList.length === 0) {
            qaQuestionsListTable.innerHTML = '<div style="padding: 12px; text-align: center; color: #64748b;">គ្មានសំណួរ-ចម្លើយក្នុងប្រព័ន្ធទេ</div>';
            return;
        }

        let html = '<table style="width:100%; border-collapse: collapse; font-size:13px;">';
        html += '<tr style="background:#f1f5f9; text-align:left;"><th style="padding:8px; border-bottom:1px solid #e2e8f0;">សំណួរ</th><th style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">សកម្មភាព</th></tr>';
        qaDataList.forEach((q, idx) => {
            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px; font-weight:500;">${idx + 1}. ${q.q}</td>
                    <td style="padding:8px; text-align:right;">
                        <button onclick="deleteQaQuestion(${idx})" style="background:#ef4444; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11.5px; font-weight:bold;">លុប</button>
                    </td>
                </tr>
            `;
        });
        html += '</table>';
        qaQuestionsListTable.innerHTML = html;
    }

    window.deleteQaQuestion = function(idx) {
        if (confirm('តើអ្នកពិតជាចង់លុបសំណួរ-ចម្លើយនេះមែនទេ?')) {
            qaDataList.splice(idx, 1);
            localStorage.setItem('kh_qa_data', JSON.stringify(qaDataList));
            renderQaQuestion();
            renderQaQuestionsListTable();
            autoSyncToGoogleSheets('☁️ បានលុបសំណួរ-ចម្លើយ និងធ្វើបច្ចុប្បន្នភាព Google Sheets រួចរាល់!');
        }
    };

    if (openAddQaModalBtn && addQaModal) {
        openAddQaModalBtn.addEventListener('click', () => {
            renderQaQuestionsListTable();
            addQaModal.classList.remove('hidden');
        });
    }

    if (closeAddQaModalBtn) closeAddQaModalBtn.addEventListener('click', () => addQaModal.classList.add('hidden'));
    if (closeAddQaModalFooterBtn) closeAddQaModalFooterBtn.addEventListener('click', () => addQaModal.classList.add('hidden'));

    if (saveQaQuestionBtn) {
        saveQaQuestionBtn.addEventListener('click', () => {
            const questionText = newQaQuestionInput ? newQaQuestionInput.value.trim() : '';
            const opt1 = newQaOpt1Input ? newQaOpt1Input.value.trim() : '';
            const opt2 = newQaOpt2Input ? newQaOpt2Input.value.trim() : '';
            const opt3 = newQaOpt3Input ? newQaOpt3Input.value.trim() : '';
            const opt4 = newQaOpt4Input ? newQaOpt4Input.value.trim() : '';
            const correctAns = newQaCorrectSelect ? parseInt(newQaCorrectSelect.value, 10) : 0;

            if (!questionText || !opt1 || !opt2 || !opt3 || !opt4) {
                alert('សូមបញ្ចូលទាំងខ្លឹមសារសំណួរ និងជម្រើសចម្លើយទាំង ៤ ឱ្យគ្រប់គ្រាន់!');
                return;
            }

            const newQa = {
                q: questionText,
                options: [opt1, opt2, opt3, opt4],
                answer: correctAns
            };

            qaDataList.push(newQa);
            localStorage.setItem('kh_qa_data', JSON.stringify(qaDataList));

            if (newQaQuestionInput) newQaQuestionInput.value = '';
            if (newQaOpt1Input) newQaOpt1Input.value = '';
            if (newQaOpt2Input) newQaOpt2Input.value = '';
            if (newQaOpt3Input) newQaOpt3Input.value = '';
            if (newQaOpt4Input) newQaOpt4Input.value = '';

            renderQaQuestion();
            renderQaQuestionsListTable();
            alert('បន្ថែមសំណួរ-ចម្លើយជោគជ័យ!');
            autoSyncToGoogleSheets('☁️ បានបន្ថែមសំណួរ-ចម្លើយ និងបញ្ជូនទៅ Google Sheets ស្វ័យប្រវត្តិ!');
        });
    }

    // --------------------------------------------------------------------------
    // 10.5 Typing Examination Mode & Custom Exam Questions (Tab 4)
    // --------------------------------------------------------------------------
    const DEFAULT_EXAM_QUESTIONS = [
        {
            id: 1,
            title: 'ប្រឡងទី ០១ ៖ ព្រះរាជាណាចក្រកម្ពុជា',
            text: 'ព្រះរាជាណាចក្រកម្ពុជា ជាប្រទេសមួយស្ថិតនៅភូមិភាគអាស៊ីអាគ្នេយ៍ មានរាជធានីឈ្មោះភ្នំពេញ។ ប្រទេសកម្ពុជាមានវប្បធម៌ចំណាស់ និងប្រាសាទអង្គរវត្តជាបេតិកភណ្ឌពិភពលោក។'
        },
        {
            id: 2,
            title: 'ប្រឡងទី ០២ ៖ ការអប់រំ និងបច្ចេកវិទ្យា',
            text: 'ការអប់រំ និងបច្ចេកវិទ្យាឌីជីថល គឺជាសសរទ្រូងដ៏សំខាន់ក្នុងការអភិវឌ្ឍធនធានមនុស្ស និងសេដ្ឋកិច្ចជាតិឱ្យមានភាពរីកចម្រើនជឿនលឿន។'
        },
        {
            id: 3,
            title: 'ប្រឡងទី ០៣ ៖ ការថែរក្សាបរិស្ថាន',
            text: 'ការដាំដើមឈើ និងការកាត់បន្ថយការប្រើប្រាស់ប្លាស្ទិក ជួយថែរក្សាបរិស្ថានធម្មជាតិ និងប្រព័ន្ធអេកូឡូស៊ីឱ្យមានបៃតងស្រស់ស្អាត។'
        }
    ];

    let examQuestions = JSON.parse(localStorage.getItem('kh_exam_questions')) || DEFAULT_EXAM_QUESTIONS;

    const examQuestionSelect = document.getElementById('examQuestionSelect');
    const startExamBtn = document.getElementById('startExamBtn');
    const openAddExamModalBtn = document.getElementById('openAddExamModalBtn');
    const addExamModal = document.getElementById('addExamModal');
    const closeAddExamModalBtn = document.getElementById('closeAddExamModalBtn');
    const closeAddExamModalFooterBtn = document.getElementById('closeAddExamModalFooterBtn');
    const saveExamQuestionBtn = document.getElementById('saveExamQuestionBtn');
    const newExamTitleInput = document.getElementById('newExamTitleInput');
    const newExamTextInput = document.getElementById('newExamTextInput');
    const examQuestionsListTable = document.getElementById('examQuestionsListTable');

    const examWorkspace = document.getElementById('examWorkspace');
    const examTimerText = document.getElementById('examTimerText');
    const examScoreText = document.getElementById('examScoreText');
    const examTextDisplay = document.getElementById('examTextDisplay');
    const examInput = document.getElementById('examInput');

    let examTimerInterval = null;
    let examTimeLeft = 120; // 2 minutes
    let isExamRunning = false;

    function renderExamQuestionOptions() {
        if (!examQuestionSelect) return;
        examQuestionSelect.innerHTML = '';
        examQuestions.forEach(q => {
            const opt = document.createElement('option');
            opt.value = q.id;
            opt.textContent = q.title;
            examQuestionSelect.appendChild(opt);
        });
        updateExamTextDisplay();
    }

    function updateExamTextDisplay() {
        if (!examQuestionSelect || !examTextDisplay) return;
        const selectedId = parseInt(examQuestionSelect.value, 10);
        const qObj = examQuestions.find(q => q.id === selectedId) || examQuestions[0];
        if (qObj) {
            examTextDisplay.textContent = qObj.text;
        } else {
            examTextDisplay.textContent = 'គ្មានសំណួរប្រឡងទេ';
        }
    }

    function renderExamQuestionsListTable() {
        if (!examQuestionsListTable) return;
        if (examQuestions.length === 0) {
            examQuestionsListTable.innerHTML = '<div style="padding: 12px; text-align: center; color: #64748b;">គ្មានសំណួរប្រឡងក្នុងប្រព័ន្ធទេ</div>';
            return;
        }

        let html = '<table style="width:100%; border-collapse: collapse; font-size:13px;">';
        html += '<tr style="background:#f1f5f9; text-align:left;"><th style="padding:8px; border-bottom:1px solid #e2e8f0;">ចំណងជើង</th><th style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right;">សកម្មភាព</th></tr>';
        examQuestions.forEach(q => {
            html += `
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:8px; font-weight:500;">${q.title}</td>
                    <td style="padding:8px; text-align:right;">
                        <button onclick="deleteExamQuestion(${q.id})" style="background:#ef4444; color:white; border:none; padding:4px 10px; border-radius:4px; cursor:pointer; font-size:11.5px; font-weight:bold;">លុប</button>
                    </td>
                </tr>
            `;
        });
        html += '</table>';
        examQuestionsListTable.innerHTML = html;
    }

    window.deleteExamQuestion = function(id) {
        if (confirm('តើអ្នកពិតជាចង់លុបសំណួរប្រឡងនេះមែនទេ?')) {
            examQuestions = examQuestions.filter(q => q.id !== id);
            localStorage.setItem('kh_exam_questions', JSON.stringify(examQuestions));
            renderExamQuestionOptions();
            renderExamQuestionsListTable();
            autoSyncToGoogleSheets('☁️ បានលុបសំណួរប្រឡង និងធ្វើបច្ចុប្បន្នភាព Google Sheets រួចរាល់!');
        }
    };

    if (examQuestionSelect) {
        examQuestionSelect.addEventListener('change', updateExamTextDisplay);
    }

    if (openAddExamModalBtn && addExamModal) {
        openAddExamModalBtn.addEventListener('click', () => {
            renderExamQuestionsListTable();
            addExamModal.classList.remove('hidden');
        });
    }

    if (closeAddExamModalBtn) closeAddExamModalBtn.addEventListener('click', () => addExamModal.classList.add('hidden'));
    if (closeAddExamModalFooterBtn) closeAddExamModalFooterBtn.addEventListener('click', () => addExamModal.classList.add('hidden'));

    if (saveExamQuestionBtn) {
        saveExamQuestionBtn.addEventListener('click', () => {
            const title = newExamTitleInput.value.trim();
            const text = newExamTextInput.value.trim();

            if (!title || !text) {
                alert('សូមបញ្ចូលទាំងចំណងជើង និងខ្លឹមសារអត្ថបទប្រឡង!');
                return;
            }

            const newQ = {
                id: Date.now(),
                title: title,
                text: text
            };

            examQuestions.push(newQ);
            localStorage.setItem('kh_exam_questions', JSON.stringify(examQuestions));

            newExamTitleInput.value = '';
            newExamTextInput.value = '';

            renderExamQuestionOptions();
            renderExamQuestionsListTable();
            alert('បន្ថែមសំណួរប្រឡងជោគជ័យ!');
            autoSyncToGoogleSheets('☁️ បានបន្ថែមសំណួរប្រឡង និងបញ្ជូនទៅ Google Sheets ស្វ័យប្រវត្តិ!');
        });
    }

    // Start Exam Handler
    if (startExamBtn) {
        startExamBtn.addEventListener('click', () => {
            if (!examWorkspace) return;
            examWorkspace.classList.remove('hidden');
            examInput.value = '';
            examInput.focus();
            examTimeLeft = 120;
            examScoreText.textContent = '0';
            examTimerText.textContent = '02:00';

            clearInterval(examTimerInterval);
            isExamRunning = true;

            examTimerInterval = setInterval(() => {
                examTimeLeft--;
                const mins = Math.floor(examTimeLeft / 60);
                const secs = examTimeLeft % 60;
                examTimerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

                if (examTimeLeft <= 0) {
                    clearInterval(examTimerInterval);
                    isExamRunning = false;
                    alert(`បញ្ចប់ការប្រឡង! ពិន្ទុរបស់អ្នកទទួលបានគឺ ៖ ${examScoreText.textContent}`);
                }
            }, 1000);
        });
    }

    if (examInput) {
        examInput.addEventListener('input', () => {
            if (!isExamRunning) return;
            const targetText = examTextDisplay.textContent.trim();
            const typedText = examInput.value;

            let correctCount = 0;
            for (let i = 0; i < typedText.length; i++) {
                if (typedText[i] === targetText[i]) {
                    correctCount++;
                }
            }
            examScoreText.textContent = correctCount;

            if (typedText.length >= targetText.length && typedText === targetText) {
                clearInterval(examTimerInterval);
                isExamRunning = false;
                alert(`អបអរសាទរ! អ្នកបានប្រឡងជាប់ដោយវាយត្រូវទាំងអស់ ១០០%! ពិន្ទុ៖ ${correctCount}`);
            }
        });
    }

    // Initial load for exam questions options
    renderExamQuestionOptions();

    // --------------------------------------------------------------------------
    // 11. Virtual Keyboard Layout (Tab 5)
    // --------------------------------------------------------------------------
    const KHMER_VIRTUAL_KB = [
        [
            { u: '«', s: '»', k: '`' }, { u: '១', s: '!', k: '1' }, { u: '២', s: '២', k: '2' },
            { u: '៣', s: '៣', k: '3' }, { u: '៤', s: '៤', k: '4' }, { u: '៥', s: '៥', k: '5' },
            { u: '៦', s: '៦', k: '6' }, { u: '៧', s: '៧', k: '7' }, { u: '៨', s: '៨', k: '8' },
            { u: '៩', s: '៩', k: '9' }, { u: '០', s: '០', k: '0' }, { u: '-', s: 'ៗ', k: '-' },
            { u: '=', s: '+=', k: '=' }, { main: 'Backspace', class: 'wide', k: 'Backspace' }
        ],
        [
            { main: 'Tab', class: 'wide', k: 'Tab' },
            { u: 'ឆ', s: 'ឈ', k: 'q' }, { u: 'ឹ', s: 'ឺ', k: 'w' }, { u: 'ិ', s: 'ី', k: 'e' },
            { u: 'រ', s: 'ឫ', k: 'r' }, { u: 'ត', s: 'ធ', k: 't' }, { u: 'យ', s: 'យ្ដ', k: 'y' },
            { u: 'ុ', s: 'ូ', k: 'u' }, { u: 'ិ', s: 'ី', k: 'i' }, { u: 'ោ', s: 'ឱ', k: 'o' },
            { u: 'ផ', s: 'ភ', k: 'p' }, { u: 'ៀ', s: 'ឿ', k: '[' }, { u: 'ែ', s: 'ៃ', k: ']' }
        ],
        [
            { main: 'Caps Lock', class: 'wide', k: 'CapsLock' },
            { u: 'ក', s: 'ខ', k: 'a' }, { u: 'ស', s: 'ហ', k: 's' }, { u: 'ដ', s: 'ឌ', k: 'd' },
            { u: 'ថ', s: 'ធ', k: 'f' }, { u: 'ង', s: 'អ', k: 'g' }, { u: 'ហ', s: 'ហ៍', k: 'h' },
            { u: '្', s: 'ញ', k: 'j' }, { u: 'ក', s: 'គ', k: 'k' }, { u: 'ល', s: 'ឡ', k: 'l' },
            { u: 'ើ', s: 'ើ', k: ';' }, { u: '់', s: '៉', k: "'" }
        ],
        [
            { main: 'Shift', class: 'wide', k: 'Shift' },
            { u: 'ឋ', s: 'ឌ', k: 'z' }, { u: 'ខ', s: 'ឃ', k: 'x' }, { u: 'ច', s: 'ឆ', k: 'c' },
            { u: 'វ', s: 'វ', k: 'v' }, { u: 'ប', s: 'ព', k: 'b' }, { u: 'ន', s: 'ណ', k: 'n' },
            { u: 'ម', s: 'ំ', k: 'm' }, { u: 'ុំ', s: 'ុ', k: ',' }, { u: '។', s: '៖', k: '.' },
            { u: '៊', s: '?', k: '/' }, { main: 'Shift', class: 'wide', k: 'Shift' }
        ],
        [
            { main: 'Space', class: 'space', k: ' ' }
        ]
    ];

    const virtualKeyboard = document.getElementById('virtualKeyboard');
    const kbShiftBadge = document.getElementById('kbShiftBadge');
    let isShiftActive = false;

    function renderVirtualKeyboard() {
        if (!virtualKeyboard) return;
        virtualKeyboard.innerHTML = '';

        KHMER_VIRTUAL_KB.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'kb-row';
            row.forEach(item => {
                const btn = document.createElement('button');
                btn.className = `kb-key ${item.class || ''}`;
                btn.dataset.key = item.k;

                if (item.main) {
                    btn.innerHTML = `<span class="kb-key-main">${item.main}</span>`;
                } else {
                    const charDisplay = isShiftActive ? item.s : item.u;
                    btn.innerHTML = `<span class="kb-key-main">${charDisplay}</span><span class="kb-key-sub">${item.k}</span>`;
                }

                rowDiv.appendChild(btn);
            });
            virtualKeyboard.appendChild(rowDiv);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            isShiftActive = true;
            if (kbShiftBadge) kbShiftBadge.textContent = 'SHIFT: បើក';
            renderVirtualKeyboard();
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            isShiftActive = false;
            if (kbShiftBadge) kbShiftBadge.textContent = 'SHIFT: បិទ';
            renderVirtualKeyboard();
        }
    });

    // --------------------------------------------------------------------------
    // 12. Add New Words Manager (Tab 7 - Matching Screenshot)
    // --------------------------------------------------------------------------
    const wmGroupSelect = document.getElementById('wmGroupSelect');
    const wmWordInput = document.getElementById('wmWordInput');
    const wmSaveBtn = document.getElementById('wmSaveBtn');
    const wmClearBtn = document.getElementById('wmClearBtn');
    const addNewGroupBtn = document.getElementById('addNewGroupBtn');
    const wordsTableBody = document.getElementById('wordsTableBody');

    let editingWordId = null;

    function renderWordsTable() {
        if (!wordsTableBody) return;
        wordsTableBody.innerHTML = '';

        const selectedGroup = wmGroupSelect ? wmGroupSelect.value : 'មេរៀនទី ០១';
        const filteredWords = wordsDB.filter(item => item.group === selectedGroup);

        if (filteredWords.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="3" style="text-align:center; color:#64748b; padding:16px;">គ្មានពាក្យក្នុងក្រុម ${selectedGroup} ទេ! សូមបញ្ចូលពាក្យថ្មីខាងលើ។</td>`;
            wordsTableBody.appendChild(tr);
            return;
        }

        filteredWords.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const breakdown = generateKhmerBreakdown(item.word);
            tr.innerHTML = `
                <td>
                    <div class="td-action-cell">
                        <span class="idx-num">${idx + 1}</span>
                        <button class="btn-table-edit" onclick="editWord(${item.id})">កែប្រែ</button>
                        <button class="btn-table-delete" onclick="deleteWord(${item.id})">លុប</button>
                    </div>
                </td>
                <td><strong>${item.word}</strong></td>
                <td class="td-breakdown-cell">${breakdown}</td>
            `;
            wordsTableBody.appendChild(tr);
        });
    }

    if (wmGroupSelect) {
        wmGroupSelect.addEventListener('change', () => {
            renderWordsTable();
        });
    }

    window.editWord = function(id) {
        const item = wordsDB.find(w => w.id === id);
        if (item) {
            editingWordId = id;
            if (wmGroupSelect) wmGroupSelect.value = item.group;
            if (wmWordInput) {
                wmWordInput.value = item.word;
                wmWordInput.focus();
            }
            if (wmSaveBtn) {
                wmSaveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> រក្សាទុក`;
            }
        }
    };

    window.deleteWord = function(id) {
        if (confirm('តើអ្នកពិតជាចង់លុបពាក្យនេះមែនទេ?')) {
            wordsDB = wordsDB.filter(w => w.id !== id);
            localStorage.setItem('kh_words_db', JSON.stringify(wordsDB));
            renderWordsTable();
            loadLessonWords();
            autoSyncToGoogleSheets('☁️ បានលុបពាក្យ និងធ្វើបច្ចុប្បន្នភាព Google Sheets រួចរាល់!');
        }
    };

    if (addNewGroupBtn) {
        addNewGroupBtn.addEventListener('click', () => {
            const newGroup = prompt('បញ្ចូលឈ្មោះក្រុម/មេរៀនថ្មី (ឧ. មេរៀនទី ០៦):');
            if (newGroup && newGroup.trim()) {
                const groupName = newGroup.trim();
                const option = document.createElement('option');
                option.value = groupName;
                option.textContent = groupName;
                option.selected = true;
                wmGroupSelect.appendChild(option);

                // Sync with practice screen lesson select
                const pOpt = document.createElement('option');
                pOpt.value = groupName;
                pOpt.textContent = groupName;
                lessonSelect.appendChild(pOpt);
            }
        });
    }

    if (wmSaveBtn) {
        wmSaveBtn.addEventListener('click', () => {
            const wordVal = wmWordInput.value.trim();
            const groupVal = wmGroupSelect.value;
            if (!wordVal) {
                alert('សូមបញ្ចូលពាក្យមុនពេលរក្សាទុក!');
                return;
            }

            if (editingWordId) {
                const targetObj = wordsDB.find(w => w.id === editingWordId);
                if (targetObj) {
                    targetObj.word = wordVal;
                    targetObj.group = groupVal;
                }
                editingWordId = null;
            } else {
                const newObj = { id: Date.now(), group: groupVal, word: wordVal };
                wordsDB.push(newObj);
            }

            localStorage.setItem('kh_words_db', JSON.stringify(wordsDB));
            wmWordInput.value = '';
            renderWordsTable();
            loadLessonWords();
            autoSyncToGoogleSheets('☁️ បានរក្សាទុកពាក្យ និងបញ្ជូនទៅ Google Sheets ស្វ័យប្រវត្តិ!');
        });
    }

    if (wmClearBtn) {
        wmClearBtn.addEventListener('click', () => {
            wmWordInput.value = '';
            editingWordId = null;
        });
    }

    // Excel Template Download & Import Logic
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    const importExcelBtn = document.getElementById('importExcelBtn');
    const excelFileInput = document.getElementById('excelFileInput');

    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', () => {
            if (typeof XLSX === 'undefined') {
                alert('បណ្ណាល័យ Excel កំពុងរង់ចាំស្គាល់ សូមព្យាយាមម្តងទៀត!');
                return;
            }
            const templateData = [
                { "ក្រុមពាក្យ (Group)": "មេរៀនទី ០១", "ពាក្យ (Word)": "កម្ពុជា" },
                { "ក្រុមពាក្យ (Group)": "មេរៀនទី ០១", "ពាក្យ (Word)": "សន្តិភាព" },
                { "ក្រុមពាក្យ (Group)": "មេរៀនទី ០២", "ពាក្យ (Word)": "បច្ចេកវិទ្យា" },
                { "ក្រុមពាក្យ (Group)": "មេរៀនទី ០២", "ពាក្យ (Word)": "ចំណេះដឹង" }
            ];

            const ws = XLSX.utils.json_to_sheet(templateData);
            ws['!cols'] = [{ wch: 22 }, { wch: 28 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "WordsTemplate");
            XLSX.writeFile(wb, "Khmer_Words_Template.xlsx");
        });
    }

    if (importExcelBtn && excelFileInput) {
        importExcelBtn.addEventListener('click', () => {
            excelFileInput.click();
        });

        excelFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (typeof XLSX === 'undefined') {
                alert('បណ្ណាល័យ Excel មិនទាន់ស្គាល់ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិត!');
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (!rows || rows.length < 1) {
                        alert('ឯកសារ Excel គ្មានទិន្នន័យពាក្យឡើយ!');
                        return;
                    }

                    let addedCount = 0;
                    const firstRow = rows[0] || [];
                    const isHeaderRow = firstRow[0] && (firstRow[0].toString().includes('Group') || firstRow[0].toString().includes('ក្រុម'));
                    const startRow = isHeaderRow ? 1 : 0;

                    for (let i = startRow; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || row.length === 0) continue;

                        let group = row[0] ? row[0].toString().trim() : 'មេរៀនទី ០១';
                        let word = row[1] ? row[1].toString().trim() : '';

                        if (!word && row[0]) {
                            word = row[0].toString().trim();
                            group = 'មេរៀនទី ០១';
                        }

                        if (word) {
                            wordsDB.push({
                                id: Date.now() + Math.random(),
                                group: group,
                                word: word
                            });
                            addedCount++;

                            if (wmGroupSelect && ![...wmGroupSelect.options].some(opt => opt.value === group)) {
                                const opt = document.createElement('option');
                                opt.value = group;
                                opt.textContent = group;
                                wmGroupSelect.appendChild(opt);

                                const pOpt = document.createElement('option');
                                pOpt.value = group;
                                pOpt.textContent = group;
                                if (lessonSelect) lessonSelect.appendChild(pOpt);
                            }
                        }
                    }

                    if (addedCount > 0) {
                        localStorage.setItem('kh_words_db', JSON.stringify(wordsDB));
                        renderWordsTable();
                        loadLessonWords();
                        alert(`✓ នាំចូលពាក្យពី Excel ជោគជ័យ! (បានបន្ថែម ${addedCount} ពាក្យ)`);
                        autoSyncToGoogleSheets(`☁️ បាននាំចូល ${addedCount} ពាក្យពី Excel និងបញ្ជូនទៅ Google Sheets!`);
                    } else {
                        alert('មិនមានពាក្យត្រឹមត្រូវក្នុងឯកសារ Excel ឡើយ!');
                    }
                } catch (err) {
                    console.error(err);
                    alert('បរាជ័យក្នុងការអានឯកសារ Excel! សូមអានតាមគំរូទម្រង់ដែលបានទាញយក។');
                } finally {
                    excelFileInput.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // --------------------------------------------------------------------------
    // 13. Google Sheets Integration Logic
    // --------------------------------------------------------------------------
    const googleSheetUrlInput = document.getElementById('googleSheetUrlInput');
    const saveSheetsUrlBtn = document.getElementById('saveSheetsUrlBtn');
    const syncFromSheetsBtn = document.getElementById('syncFromSheetsBtn');
    const pushToSheetsBtn = document.getElementById('pushToSheetsBtn');
    const showSheetsGuideBtn = document.getElementById('showSheetsGuideBtn');
    const sheetsStatusBadge = document.getElementById('sheetsStatusBadge');

    const sheetsGuideModal = document.getElementById('sheetsGuideModal');
    const sheetsGuideCloseBtn = document.getElementById('sheetsGuideCloseBtn');
    const sheetsGuideOkBtn = document.getElementById('sheetsGuideOkBtn');

    let savedSheetUrl = localStorage.getItem('kh_sheets_url') || '';
    if (googleSheetUrlInput && savedSheetUrl) {
        googleSheetUrlInput.value = savedSheetUrl;
        updateSheetsStatusBadge(true);
    }

    function updateSheetsStatusBadge(isConnected) {
        if (!sheetsStatusBadge) return;
        if (isConnected) {
            sheetsStatusBadge.textContent = '🟢 បានតភ្ជាប់';
            sheetsStatusBadge.style.backgroundColor = '#16a34a';
        } else {
            sheetsStatusBadge.textContent = '⚪ មិនទាន់បានតភ្ជាប់';
            sheetsStatusBadge.style.backgroundColor = '#64748b';
        }
    }

    if (saveSheetsUrlBtn) {
        saveSheetsUrlBtn.addEventListener('click', () => {
            const url = googleSheetUrlInput.value.trim();
            if (url) {
                localStorage.setItem('kh_sheets_url', url);
                savedSheetUrl = url;
                updateSheetsStatusBadge(true);
                alert('រក្សាទុក Google Sheets URL ជោគជ័យ!');
            } else {
                localStorage.removeItem('kh_sheets_url');
                savedSheetUrl = '';
                updateSheetsStatusBadge(false);
                alert('បានលុបការតភ្ជាប់ Google Sheets!');
            }
        });
    }

    function saveResultToGoogleSheets(name, lesson, wpm, accuracy, timeSpent) {
        const url = savedSheetUrl || (googleSheetUrlInput ? googleSheetUrlInput.value.trim() : '');
        if (!url) return;
        try {
            fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'saveResult',
                    name: name,
                    lesson: lesson,
                    wpm: wpm,
                    accuracy: accuracy,
                    timeSpent: timeSpent
                })
            });
        } catch (e) {
            console.log('Result save error', e);
        }
    }

    function showToastNotification(message) {
        let toast = document.getElementById('toastNotification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toastNotification';
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fa-solid fa-cloud-arrow-up text-green"></i> <span>${message}</span>`;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    function autoSyncToGoogleSheets(customMessage) {
        const url = localStorage.getItem('kh_sheets_url') || (googleSheetUrlInput ? googleSheetUrlInput.value.trim() : '');
        if (!url) return;

        try {
            fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'syncAllWords',
                    words: typeof wordsDB !== 'undefined' ? wordsDB : [],
                    examQuestions: typeof examQuestions !== 'undefined' ? examQuestions : [],
                    qaData: typeof qaDataList !== 'undefined' ? qaDataList : []
                })
            });
            showToastNotification(customMessage || '☁️ ទិន្នន័យបានធ្វើបច្ចុប្បន្នភាពទៅ Google Sheets ស្វ័យប្រវត្តិ!');
        } catch (e) {
            console.error('Auto sync Google Sheets failed', e);
        }
    }

    async function fetchWordsFromGoogleSheets(isAutoSync = false) {
        const url = savedSheetUrl || (googleSheetUrlInput ? googleSheetUrlInput.value.trim() : '');
        if (!url) {
            if (!isAutoSync) alert('សូមបញ្ចូល Google Sheets Web App URL ជាមុនសិន!');
            return;
        }

        try {
            if (syncFromSheetsBtn) syncFromSheetsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងទាញយក...';
            const res = await fetch(url);
            const data = await res.json();

            if (Array.isArray(data) && data.length > 0) {
                const formatted = data.map((item, idx) => ({
                    id: item.id || (idx + 1),
                    group: String(item.group || 'មេរៀនទី ០១'),
                    word: String(item.word || '')
                })).filter(w => w.word.trim() !== '');

                wordsDB = formatted;
                localStorage.setItem('kh_words_db', JSON.stringify(wordsDB));
                
                renderWordsTable();
                loadLessonWords();

                if (!isAutoSync) {
                    alert(`ទាញយកជោគជ័យ! មានចំនួន ${wordsDB.length} ពាក្យពី Google Sheets។`);
                } else {
                    showToastNotification(`បានទាញយក ${wordsDB.length} ពាក្យពី Google Sheets រួចរាល់!`);
                }
            } else {
                if (!isAutoSync) alert('មិនមានទិន្នន័យពាក្យក្នុង Google Sheet ឡើយ!');
            }
        } catch (err) {
            console.error(err);
            if (!isAutoSync) alert('បរាជ័យក្នុងការទាញយក! សូមពិនិត្យមើល URL និងការកំណត់ Deploy: Anyone ក្នុង Google Sheet។');
        } finally {
            if (syncFromSheetsBtn) syncFromSheetsBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> ទាញយកទិន្នន័យពី Sheets';
        }
    }

    async function pushWordsToGoogleSheets() {
        const url = savedSheetUrl || (googleSheetUrlInput ? googleSheetUrlInput.value.trim() : '');
        if (!url) {
            alert('សូមបញ្ចូល Google Sheets Web App URL ជាមុនសិន!');
            return;
        }

        try {
            if (pushToSheetsBtn) pushToSheetsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> កំពុងបញ្ជូន...';
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'syncAllWords', words: wordsDB })
            });
            alert('បញ្ជូនពាក្យទាំងអស់ទៅ Google Sheets រួចរាល់!');
        } catch (err) {
            console.error(err);
            alert('បរាជ័យក្នុងការបញ្ជូនទៅ Google Sheets!');
        } finally {
            if (pushToSheetsBtn) pushToSheetsBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> បញ្ជូនពាក្យទាំងអស់ទៅ Sheets';
        }
    }

    if (syncFromSheetsBtn) syncFromSheetsBtn.addEventListener('click', () => fetchWordsFromGoogleSheets(false));
    if (pushToSheetsBtn) pushToSheetsBtn.addEventListener('click', pushWordsToGoogleSheets);

    // Guide Modal Handlers
    if (showSheetsGuideBtn && sheetsGuideModal) {
        showSheetsGuideBtn.addEventListener('click', () => sheetsGuideModal.classList.remove('hidden'));
    }
    if (sheetsGuideCloseBtn) sheetsGuideCloseBtn.addEventListener('click', () => sheetsGuideModal.classList.add('hidden'));
    if (sheetsGuideOkBtn) sheetsGuideOkBtn.addEventListener('click', () => sheetsGuideModal.classList.add('hidden'));

    // Copy Google Apps Script Code logic
    const copyScriptBtn = document.getElementById('copyScriptBtn');
    const appsScriptCode = document.getElementById('appsScriptCode');
    if (copyScriptBtn && appsScriptCode) {
        copyScriptBtn.addEventListener('click', () => {
            const codeText = appsScriptCode.textContent.trim();

            const handleSuccess = () => {
                const originalHtml = copyScriptBtn.innerHTML;
                copyScriptBtn.innerHTML = '<i class="fa-solid fa-check"></i> បានចម្លងរួចរាល់!';
                copyScriptBtn.style.backgroundColor = '#16a34a';
                setTimeout(() => {
                    copyScriptBtn.innerHTML = originalHtml;
                    copyScriptBtn.style.backgroundColor = '#2563eb';
                }, 2000);
            };

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(codeText).then(handleSuccess).catch(() => fallbackCopy(codeText, handleSuccess));
            } else {
                fallbackCopy(codeText, handleSuccess);
            }
        });
    }

    function fallbackCopy(text, onSuccess) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (onSuccess) onSuccess();
        } catch (err) {
            alert('មិនអាចចម្លងដោយស្វ័យប្រវត្តិបានទេ! សូមជ្រើសរើសចម្លងដោយផ្ទាល់។');
        }
        document.body.removeChild(textarea);
    }

    // --------------------------------------------------------------------------
    // 14. Initialization
    // --------------------------------------------------------------------------
    loadLessonWords();
    updateDigitalTimerDisplay();
    renderQaQuestion();
    renderVirtualKeyboard();
    renderWordsTable();

    // Auto-sync words from Google Sheets on app startup if URL is configured
    if (savedSheetUrl) {
        fetchWordsFromGoogleSheets(true);
    }
});
