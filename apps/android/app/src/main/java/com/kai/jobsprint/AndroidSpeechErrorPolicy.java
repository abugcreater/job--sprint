package com.kai.jobsprint;

import android.speech.SpeechRecognizer;

final class AndroidSpeechErrorPolicy {
    private static final String PHASE_STARTING = "starting";
    private static final long BUSY_COOLDOWN_MS = 20_000L;
    private static final long TOO_MANY_REQUESTS_COOLDOWN_MS = 90_000L;
    private static final long SHORT_ERROR_COOLDOWN_MS = 5_000L;

    String codeFor(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "ERROR_AUDIO";
            case SpeechRecognizer.ERROR_CLIENT:
                return "ERROR_CLIENT";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "ERROR_INSUFFICIENT_PERMISSIONS";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "ERROR_NETWORK_TIMEOUT";
            case SpeechRecognizer.ERROR_NETWORK:
                return "ERROR_NETWORK";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "ERROR_NO_MATCH";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "ERROR_RECOGNIZER_BUSY";
            case SpeechRecognizer.ERROR_SERVER:
                return "ERROR_SERVER";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "ERROR_SPEECH_TIMEOUT";
            case SpeechRecognizer.ERROR_TOO_MANY_REQUESTS:
                return "ERROR_TOO_MANY_REQUESTS";
            case SpeechRecognizer.ERROR_SERVER_DISCONNECTED:
                return "ERROR_SERVER_DISCONNECTED";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED:
                return "ERROR_LANGUAGE_NOT_SUPPORTED";
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE:
                return "ERROR_LANGUAGE_UNAVAILABLE";
            default:
                return "ERROR_UNKNOWN_" + error;
        }
    }

    String messageFor(int error, String phaseAtError, boolean wasReadyForSpeech) {
        if (!wasReadyForSpeech && PHASE_STARTING.equals(phaseAtError)) {
            if (error == SpeechRecognizer.ERROR_TOO_MANY_REQUESTS) {
                return "系统语音服务启动失败，可能是默认语音服务为空、组件未合法暴露，或厂商服务拒绝绑定。请检查系统语音输入服务；当前可手动输入。";
            }
            if (error == SpeechRecognizer.ERROR_CLIENT || error == SpeechRecognizer.ERROR_SERVER || error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED) {
                return "系统语音服务未成功启动，尚未进入听音状态。请检查系统语音输入服务、麦克风权限和网络；当前可手动输入。";
            }
        }
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "录音失败，请检查麦克风是否被其他应用占用。";
            case SpeechRecognizer.ERROR_CLIENT:
                return "语音客户端错误，请重新点击开始语音。";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "麦克风权限不足，请到系统设置开启。";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "语音服务网络异常；可稍后重试，已保留手动编辑能力。";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "没有识别到有效语音，请靠近麦克风后重试。";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "系统语音服务忙，请先停止后再开始。";
            case SpeechRecognizer.ERROR_SERVER:
                return "系统语音服务端异常，请稍后重试。";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "识别超时，未检测到说话。";
            case SpeechRecognizer.ERROR_TOO_MANY_REQUESTS:
                return "系统语音服务请求过于频繁，请等待几秒后重试。";
            case SpeechRecognizer.ERROR_SERVER_DISCONNECTED:
                return "系统语音服务连接断开，请重新点击开始语音。";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED:
                return "系统语音服务不支持当前语言。";
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE:
                return "当前语言模型不可用，请检查系统语音服务设置。";
            default:
                return "语音识别失败，错误码：" + error;
        }
    }

    long cooldownFor(int error, String phaseAtError, boolean wasReadyForSpeech) {
        if (!wasReadyForSpeech && PHASE_STARTING.equals(phaseAtError)) {
            return 0L;
        }
        switch (error) {
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return BUSY_COOLDOWN_MS;
            case SpeechRecognizer.ERROR_TOO_MANY_REQUESTS:
                return TOO_MANY_REQUESTS_COOLDOWN_MS;
            case SpeechRecognizer.ERROR_CLIENT:
            case SpeechRecognizer.ERROR_SERVER:
            case SpeechRecognizer.ERROR_SERVER_DISCONNECTED:
                return SHORT_ERROR_COOLDOWN_MS;
            default:
                return 0L;
        }
    }

    boolean isRetryable(int error) {
        return error != SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS
            && error != SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED
            && error != SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE;
    }
}
