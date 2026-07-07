package com.kai.jobsprint;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import java.util.ArrayList;

final class AndroidSpeechRecognizerController {
    interface Events {
        void onRecognizerStarting();
        void onReadyForSpeech();
        void onBeginningOfSpeech();
        void onEndOfSpeech();
        void onSpeechError(int error, String phaseAtError, boolean wasReadyForSpeech);
        void onSpeechResults(String text);
        void onPartialSpeechResults(String text);
    }

    private final Activity activity;
    private final AndroidSpeechServiceResolver serviceResolver;
    private final AndroidSpeechSessionState sessionState;
    private final Events events;

    private SpeechRecognizer recognizer;
    private ComponentName recognizerService;

    AndroidSpeechRecognizerController(
        Activity activity,
        AndroidSpeechServiceResolver serviceResolver,
        AndroidSpeechSessionState sessionState,
        Events events
    ) {
        this.activity = activity;
        this.serviceResolver = serviceResolver;
        this.sessionState = sessionState;
        this.events = events;
    }

    boolean start(String language) {
        if (!ensureRecognizer()) {
            return false;
        }
        sessionState.markStarting();
        events.onRecognizerStarting();
        recognizer.startListening(buildIntent(language));
        return true;
    }

    boolean hasRecognizer() {
        return recognizer != null;
    }

    ComponentName recognizerService() {
        return recognizerService;
    }

    void stop() {
        if (recognizer != null) {
            recognizer.stopListening();
        }
    }

    void cancel() {
        if (recognizer != null) {
            recognizer.cancel();
        }
    }

    void destroy() {
        if (recognizer != null) {
            recognizer.cancel();
            recognizer.destroy();
            recognizer = null;
        }
    }

    private boolean ensureRecognizer() {
        if (recognizer != null) {
            return true;
        }
        recognizerService = serviceResolver.selectedRecognitionService();
        if (recognizerService == null) {
            return false;
        }
        recognizer = SpeechRecognizer.createSpeechRecognizer(activity, recognizerService);
        if (recognizer == null) {
            return false;
        }
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle params) {
                events.onReadyForSpeech();
            }

            @Override
            public void onBeginningOfSpeech() {
                events.onBeginningOfSpeech();
            }

            @Override
            public void onRmsChanged(float rmsdB) {
                // Keep UI updates low-noise; text callbacks carry the useful state.
            }

            @Override
            public void onBufferReceived(byte[] buffer) {
                // SpeechRecognizer owns the audio buffer.
            }

            @Override
            public void onEndOfSpeech() {
                events.onEndOfSpeech();
            }

            @Override
            public void onError(int error) {
                events.onSpeechError(error, sessionState.phase(), sessionState.isReadyForSpeech());
            }

            @Override
            public void onResults(Bundle results) {
                events.onSpeechResults(firstResult(results));
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                events.onPartialSpeechResults(firstResult(partialResults));
            }

            @Override
            public void onEvent(int eventType, Bundle params) {
                // No custom recognizer events are used.
            }
        });
        return true;
    }

    private Intent buildIntent(String language) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, activity.getPackageName());
        return intent;
    }

    private String firstResult(Bundle bundle) {
        if (bundle == null) {
            return "";
        }
        ArrayList<String> values = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (values == null || values.isEmpty()) {
            return "";
        }
        return values.get(0);
    }
}
