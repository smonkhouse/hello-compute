import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, RotateCcw, Star } from 'lucide-react';

const LanguageLearningApp = () => {
  const initialPhrases = [
    { id: 1, english: "Hello", spanish: "hola", category: "Greetings" },
    { id: 2, english: "Thank you", spanish: "gracias", category: "Politeness" },
    { id: 3, english: "Excuse me", spanish: "disculpe", category: "Politeness" },
    { id: 4, english: "Where is the bathroom?", spanish: "donde esta el bano", category: "Directions" },
    { id: 5, english: "How much does it cost?", spanish: "cuanto cuesta", category: "Shopping" },
    { id: 6, english: "I don't speak Spanish", spanish: "no hablo espanol", category: "Communication" },
    { id: 7, english: "Do you speak English?", spanish: "habla ingles", category: "Communication" },
    { id: 8, english: "Where is the hotel?", spanish: "donde esta el hotel", category: "Directions" },
    { id: 9, english: "I would like water", spanish: "quisiera agua", category: "Food & Drink" },
    { id: 10, english: "The bill, please", spanish: "la cuenta por favor", category: "Food & Drink" },
    { id: 11, english: "Help!", spanish: "ayuda", category: "Emergency" },
    { id: 12, english: "Good morning", spanish: "buenos dias", category: "Greetings" },
    { id: 13, english: "Good night", spanish: "buenas noches", category: "Greetings" },
    { id: 14, english: "Please", spanish: "por favor", category: "Politeness" },
    { id: 15, english: "I'm sorry", spanish: "lo siento", category: "Politeness" }
  ];

  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const [phrases, setPhrases] = useState(() =>
    initialPhrases.map(phrase => ({
      ...phrase,
      correctCount: 0,
      totalAttempts: 0,
      lastSeen: null,
      priority: 1
    }))
  );

  const [currentPhrase, setCurrentPhrase] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micStatus, setMicStatus] = useState('unknown');
  const [micTestResult, setMicTestResult] = useState('');

  const testMicrophone = async () => {
    if (micStatus === 'testing') return;

    setMicStatus('testing');
    setMicTestResult('Testing microphone and speech recognition...');

    try {
      // First test basic microphone access
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicStatus('unavailable');
        setMicTestResult('❌ Microphone API not available. Use Chrome, Edge, or Safari for best results.');
        return;
      }

      // Test microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Clean up stream
      stream.getTracks().forEach(track => track.stop());

      // Now test speech recognition specifically
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        setMicStatus('unavailable');
        setMicTestResult('❌ Speech Recognition not supported. Please use Chrome, Edge, or Safari.');
        return;
      }

      // Test if we can create speech recognition
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const testRecognition = new SpeechRecognition();
      testRecognition.lang = 'es-ES';

      setMicStatus('working');
      setMicTestResult('✅ Microphone and Speech Recognition are both working! Try clicking the 🎤 button.');

    } catch (error) {
      console.error('Microphone test error:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setMicStatus('blocked');
        setMicTestResult('🚫 MICROPHONE BLOCKED! Here\'s how to fix it:\n\nCHROME/EDGE: Look for 🔒 or 🎤 icon in address bar (left side)\nSAFARI: Safari menu → Settings for This Website → Microphone → Allow\nFIREFOX: Not supported - use Chrome/Edge/Safari\n\nAfter allowing, REFRESH this entire page!');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setMicStatus('unavailable');
        setMicTestResult('❌ No microphone detected. Check your microphone is connected and working.');
      } else if (error.name === 'NotReadableError') {
        setMicStatus('unavailable');
        setMicTestResult('❌ Microphone in use by another app. Close Zoom, Teams, etc. and refresh.');
      } else {
        setMicStatus('unavailable');
        setMicTestResult(`❌ Error: ${error.name || error.message}. Try refreshing the page.`);
      }
    }
  };

  const calculateMastery = () => {
    const totalMastered = phrases.filter(p =>
      p.totalAttempts >= 3 && (p.correctCount / p.totalAttempts) >= 0.97
    ).length;
    return Math.round((totalMastered / phrases.length) * 100);
  };

  const selectNextPhrase = () => {
    const now = Date.now();

    const needsPractice = phrases.filter(p => {
      const accuracy = p.totalAttempts > 0 ? p.correctCount / p.totalAttempts : 0;
      return accuracy < 0.97 || p.totalAttempts < 3;
    });

    if (needsPractice.length === 0) {
      return phrases[Math.floor(Math.random() * phrases.length)];
    }

    const weightedPhrases = needsPractice.map(phrase => {
      const accuracy = phrase.totalAttempts > 0 ? phrase.correctCount / phrase.totalAttempts : 0;
      const timeSinceLastSeen = phrase.lastSeen ? (now - phrase.lastSeen) / (1000 * 60) : 1000;

      const accuracyWeight = Math.max(0.1, 1 - accuracy);
      const timeWeight = Math.min(5, timeSinceLastSeen / 10);

      return {
        ...phrase,
        weight: accuracyWeight * timeWeight * phrase.priority
      };
    });

    const totalWeight = weightedPhrases.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const phrase of weightedPhrases) {
      random -= phrase.weight;
      if (random <= 0) {
        return phrase;
      }
    }

    return weightedPhrases[0];
  };

  const speakText = (text, lang = 'es') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'es' ? 'es-ES' : 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  const checkAnswer = () => {
    const correct = userAnswer.toLowerCase().trim() === currentPhrase.spanish.toLowerCase().trim();

    setIsCorrect(correct);
    setShowResult(true);
    setTotalQuestions(prev => prev + 1);

    speakText(currentPhrase.spanish, 'es');

    setPhrases(prev => prev.map(p => {
      if (p.id === currentPhrase.id) {
        const newCorrectCount = p.correctCount + (correct ? 1 : 0);
        const newTotalAttempts = p.totalAttempts + 1;
        const newPriority = correct ? Math.max(0.5, p.priority * 0.9) : Math.min(3, p.priority * 1.5);

        return {
          ...p,
          correctCount: newCorrectCount,
          totalAttempts: newTotalAttempts,
          lastSeen: Date.now(),
          priority: newPriority
        };
      }
      return p;
    }));

    if (correct) {
      setStreak(prev => prev + 1);
      setTimeout(() => {
        nextQuestion();
      }, 1000);
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    setCurrentPhrase(selectNextPhrase());
    setUserAnswer('');
    setShowResult(false);
    setIsCorrect(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  const resetProgress = () => {
    setPhrases(prev => prev.map(p => ({
      ...p,
      correctCount: 0,
      totalAttempts: 0,
      lastSeen: null,
      priority: 1
    })));
    setStreak(0);
    setTotalQuestions(0);
    nextQuestion();
  };

  const startListening = async () => {
    console.log('startListening called', {
      hasRecognition: !!recognitionRef.current,
      isListening,
      speechEnabled,
      micStatus
    });

    if (!recognitionRef.current || isListening || !speechEnabled) {
      console.log('Early return from startListening');
      return;
    }

    if (micStatus !== 'working') {
      console.log('Testing microphone first...');
      await testMicrophone();
      if (micStatus !== 'working') {
        console.log('Microphone test failed, not starting recognition');
        return;
      }
    }

    try {
      console.log('Starting speech recognition...');
      setIsListening(true);
      setAudioLevel(0);

      const interval = setInterval(() => {
        setAudioLevel(prev => {
          if (!isListening) {
            clearInterval(interval);
            return 0;
          }
          return Math.random() * 60 + 20;
        });
      }, 150);

      // Add a small delay to ensure state is updated
      setTimeout(() => {
        try {
          recognitionRef.current.start();
          console.log('Speech recognition start command sent');
        } catch (startError) {
          console.error('Error starting recognition:', startError);
          setIsListening(false);
          setAudioLevel(0);
          setMicTestResult(`❌ Speech recognition failed: ${startError.message}`);
        }
      }, 100);

    } catch (error) {
      console.error('Speech recognition start error:', error);
      setIsListening(false);
      setAudioLevel(0);
      setMicTestResult(`❌ Failed to start speech recognition: ${error.message}`);
    }
  };

  useEffect(() => {
    if (!currentPhrase) {
      setCurrentPhrase(selectNextPhrase());
    }
  }, []);

  useEffect(() => {
    if (inputRef.current && !showResult) {
      inputRef.current.focus();
    }
  }, [currentPhrase, showResult]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;

      try {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'es-ES';

        recognitionInstance.onstart = () => {
          console.log('🎤 Speech recognition STARTED successfully');
          setIsListening(true);
          setMicTestResult('🎤 Listening for Spanish... Speak now!');
        };

        recognitionInstance.onresult = (event) => {
          console.log('🎯 Speech recognition RESULT:', event.results);
          if (event.results && event.results[0] && event.results[0][0]) {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log('📝 Transcript received:', transcript);
            setUserAnswer(transcript);
            setMicTestResult(`✅ Heard: "${transcript}"`);
          }
          setIsListening(false);
          setAudioLevel(0);
        };

        recognitionInstance.onerror = (event) => {
          console.error('❌ Speech recognition ERROR:', event.error, event);
          setIsListening(false);
          setAudioLevel(0);

          let errorMessage = '';
          switch(event.error) {
            case 'not-allowed':
              setMicStatus('blocked');
              errorMessage = '🚫 MICROPHONE BLOCKED!\n\nCHROME/EDGE: Look in address bar for 🔒 🎤 or ⚠️ icon\nSAFARI: Safari menu → Settings for This Website\nFIREFOX: Switch to Chrome/Edge (Firefox doesn\'t support speech)\n\nSet Microphone to "Allow" then REFRESH the page!';
              break;
            case 'no-speech':
              errorMessage = '🔇 No speech detected. Click 🎤 and speak clearly in Spanish.';
              break;
            case 'audio-capture':
              errorMessage = '🎤 Microphone access failed. Check mic is connected and not used by other apps.';
              break;
            case 'network':
              errorMessage = '🌐 Network error. Check internet connection and try again.';
              break;
            case 'aborted':
              errorMessage = '⏹️ Speech recognition was stopped.';
              break;
            default:
              errorMessage = `❌ Speech error: ${event.error}. Try refreshing the page.`;
          }
          setMicTestResult(errorMessage);
        };

        recognitionInstance.onend = () => {
          console.log('🏁 Speech recognition ENDED');
          setIsListening(false);
          setAudioLevel(0);
        };

        recognitionRef.current = recognitionInstance;
        setSpeechSupported(true);

      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
        setSpeechSupported(false);
      }
    } else {
      console.log('Speech recognition not supported');
      setSpeechSupported(false);
    }
  }, []);

  useEffect(() => {
    if (speechSupported && micStatus === 'unknown') {
      setTimeout(() => {
        testMicrophone();
      }, 1000);
    }
  }, [speechSupported]);

  const masteryPercentage = calculateMastery();
  const averageAccuracy = phrases.reduce((sum, p) => {
    return sum + (p.totalAttempts > 0 ? p.correctCount / p.totalAttempts : 0);
  }, 0) / phrases.length * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-800 mb-2">LinguaLearn</h1>
          <p className="text-gray-600">Master Spanish through adaptive repetition</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{masteryPercentage}%</div>
              <div className="text-sm text-gray-500">Mastery</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{Math.round(averageAccuracy)}%</div>
              <div className="text-sm text-gray-500">Avg Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{streak}</div>
              <div className="text-sm text-gray-500">Streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{totalQuestions}</div>
              <div className="text-sm text-gray-500">Total Q's</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress to 97% mastery</span>
              <span>{masteryPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${masteryPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {currentPhrase && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6"
               onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   e.preventDefault();
                   if (showResult) {
                     nextQuestion();
                   } else if (userAnswer.trim()) {
                     checkAnswer();
                   }
                 }
               }}
               tabIndex="-1">
            <div className="text-center mb-6">
              <div className="text-sm text-gray-500 mb-2">{currentPhrase.category}</div>
              <h2 className="text-3xl font-semibold text-gray-800 mb-6">
                {currentPhrase.english}
              </h2>

              <div className="text-sm text-gray-400 mb-6">
                Type your answer or use speech recognition to speak it
              </div>

              {speechSupported && (
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={speechEnabled}
                        onChange={(e) => setSpeechEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        speechEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          speechEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">Speech Recognition</span>
                    </label>

                    <button
                      onClick={testMicrophone}
                      disabled={micStatus === 'testing'}
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    >
                      {micStatus === 'testing' ? 'Testing...' : 'Test Mic'}
                    </button>
                  </div>

                  {micTestResult && (
                    <div className={`text-center p-4 rounded-lg text-sm font-medium whitespace-pre-line ${
                      micStatus === 'working' ? 'bg-green-100 text-green-800' :
                      micStatus === 'blocked' ? 'bg-yellow-100 text-yellow-800' :
                      micStatus === 'testing' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {micTestResult}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 items-center justify-center mb-6">
                <input
                  ref={inputRef}
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="flex-1 max-w-md text-xl p-4 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-center"
                  placeholder="Type your answer..."
                  disabled={showResult}
                  autoFocus
                />

                {speechSupported && speechEnabled && (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={startListening}
                      disabled={showResult || isListening || micStatus === 'blocked' || micStatus === 'unavailable' || micStatus === 'testing'}
                      className={`p-4 rounded-full font-semibold transition-all duration-200 text-2xl ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : micStatus === 'working'
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-400 text-white cursor-not-allowed'
                      }`}
                      title={
                        micStatus === 'working'
                          ? (isListening ? 'Listening... Speak now!' : 'Click to start voice recognition')
                          : micStatus === 'blocked'
                          ? 'Microphone access blocked - click "Test Mic" to fix'
                          : micStatus === 'unavailable'
                          ? 'Microphone unavailable - click "Test Mic" for details'
                          : 'Click "Test Mic" first to check microphone'
                      }
                    >
                      🎤
                    </button>

                    <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden border">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          isListening ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${audioLevel}%` }}
                      ></div>
                    </div>

                    <div className="text-xs text-center text-gray-500 min-h-[3rem] flex items-center justify-center max-w-[120px]">
                      {micStatus === 'testing' ? (
                        <span className="text-blue-600">🔄 Testing...</span>
                      ) : isListening ? (
                        <span className="text-red-600 font-medium">🔴 Listening... Speak now!</span>
                      ) : micStatus === 'working' ? (
                        <span className="text-green-600">✅ Ready to listen</span>
                      ) : micStatus === 'blocked' ? (
                        <span className="text-yellow-600 text-center">🚫 Mic blocked - click "Test Mic"</span>
                      ) : micStatus === 'unavailable' ? (
                        <span className="text-red-600 text-center">❌ No mic - click "Test Mic"</span>
                      ) : (
                        <span className="text-gray-500 text-center">Click "Test Mic" first</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showResult && (
              <div className={`text-center p-6 rounded-lg mb-6 ${
                isCorrect ? 'bg-green-100 border-2 border-green-300' : 'bg-red-100 border-2 border-red-300'
              }`}>
                <div className="mb-4">
                  {isCorrect ? (
                    <div className="flex items-center justify-center">
                      <CheckCircle className="w-12 h-12 text-green-600 mr-3" />
                      <span className="text-3xl font-bold text-green-800">CORRECT!</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <XCircle className="w-12 h-12 text-red-600 mr-3" />
                      <span className="text-3xl font-bold text-red-800">WRONG!</span>
                    </div>
                  )}
                </div>

                <div className="text-xl font-semibold text-gray-800 mb-3">
                  <button
                    onClick={() => speakText(currentPhrase.spanish, 'es')}
                    className="text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                  >
                    🔊 {currentPhrase.spanish}
                  </button>
                </div>

                {!isCorrect && (
                  <div className="text-base text-red-600 mb-3 font-medium">
                    This phrase will appear more frequently until mastered
                  </div>
                )}

                {isCorrect ? (
                  <div className="text-lg text-green-700 font-bold">
                    Auto-advancing in 1 second...
                  </div>
                ) : (
                  <div>
                    <div className="text-lg text-red-700 font-bold mb-3">
                      ↩ Press Enter or click Next to continue
                    </div>

                    <button
                      onClick={nextQuestion}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Next Question
                    </button>
                  </div>
                )}
              </div>
            )}

            {!showResult && (
              <div className="flex justify-center">
                <button
                  onClick={checkAnswer}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  disabled={!userAnswer.trim()}
                >
                  Check Answer
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Learning Progress
          </h3>

          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {phrases
              .sort((a, b) => {
                const aAccuracy = a.totalAttempts > 0 ? a.correctCount / a.totalAttempts : 0;
                const bAccuracy = b.totalAttempts > 0 ? b.correctCount / b.totalAttempts : 0;
                return aAccuracy - bAccuracy;
              })
              .map(phrase => {
                const accuracy = phrase.totalAttempts > 0 ?
                  Math.round((phrase.correctCount / phrase.totalAttempts) * 100) : 0;
                const isMastered = phrase.totalAttempts >= 3 && accuracy >= 97;

                return (
                  <div
                    key={phrase.id}
                    className={`flex justify-between items-center p-3 rounded-lg border ${
                      isMastered ? 'bg-green-50 border-green-200' :
                      accuracy < 50 && phrase.totalAttempts > 0 ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{phrase.english}</div>
                      <div className="text-sm text-gray-600">{phrase.spanish}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        isMastered ? 'text-green-600' :
                        accuracy < 50 && phrase.totalAttempts > 0 ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {phrase.totalAttempts > 0 ? `${accuracy}%` : 'New'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {phrase.totalAttempts > 0 ? `${phrase.correctCount}/${phrase.totalAttempts}` : 'Not attempted'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={resetProgress}
              className="flex items-center justify-center w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Progress
            </button>
          </div>
        </div>

        {masteryPercentage >= 97 && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-6 mt-6 text-center">
            <h2 className="text-2xl font-bold mb-2">🎉 Congratulations! 🎉</h2>
            <p className="text-lg">You've achieved 97% mastery of basic tourist Spanish!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageLearningApp;
