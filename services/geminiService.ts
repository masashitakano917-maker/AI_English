// FIX: Import `Modality` and `Type` as values, not just types, because they are enums used in the code.
// FIX: Renamed the imported 'Blob' type to 'GenAIBlob' to avoid a name collision
// with the browser's native 'Blob' object, which is used for creating file objects in memory.
import { type Blob as GenAIBlob, type LiveServerMessage, Modality, Type } from '@google/genai';
import { GoogleGenAI } from '@google/genai';
import type { ComprehensionTest, GrammarTest, PronunciationFeedback, ReadingFeedback, Score, VocabularyTest, VocabularyWord } from '../types';

// --- Gemini API Initialization ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- Audio Utility Functions ---
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): GenAIBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // FIX: Use a more robust conversion from Float32 to 16-bit PCM.
    // This clamps the audio signal to the [-1, 1] range and scales it
    // to the full Int16 range, preventing clipping and ensuring
    // the audio data is in the precise format the API expects.
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


// --- Live Session for Real-time Transcription ---

const audioProcessorCode = `
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const channelData = input[0];
    if (!channelData) {
      return true;
    }
    // Post the Float32Array data back to the main thread.
    this.port.postMessage(channelData);
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
`;


// FIX: The 'LiveSession' type is not exported, so we let TypeScript infer the return type.
export const connectToLiveSession = async (
  onTranscriptionUpdate: (text: string) => void,
  contextPassage: string,
) => {
  // FIX: Cast window to 'any' to access vendor-prefixed 'webkitAudioContext' without a TypeScript error.
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
  
  if (!audioContext.audioWorklet) {
    throw new Error("AudioWorklet is not supported in this browser.");
  }
  
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const source = audioContext.createMediaStreamSource(stream);

  const systemInstruction = `
        You are an expert speech-to-text transcription service.
        A user is going to read the following English text out loud.
        Your task is to accurately transcribe their speech.
        The user's pronunciation might not be perfect, but you should transcribe what they say as closely as possible, using the provided text as a strong contextual guide to improve accuracy.
        Do not add any commentary, corrections, or extra text. Only provide the transcription.

        The text the user is reading is:
        ---
        "${contextPassage}"
        ---
    `;

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: () => console.log('Live session opened.'),
      onmessage: (message: LiveServerMessage) => {
        if (message.serverContent?.inputTranscription) {
          const text = message.serverContent.inputTranscription.text;
          if (text) {
            onTranscriptionUpdate(text);
          }
        }
        if (message.serverContent?.turnComplete) {
            onTranscriptionUpdate(' ');
        }
      },
      onerror: (e: ErrorEvent) => console.error('Live session error:', e),
      onclose: (e: CloseEvent) => console.log('Live session closed.'),
    },
    config: {
      responseModalities: [Modality.AUDIO], // Required, but we'll ignore the audio output
      inputAudioTranscription: {},
      systemInstruction: systemInstruction,
    },
  });

  const session = await sessionPromise;
  
  const blob = new Blob([audioProcessorCode], { type: 'application/javascript' });
  const objectURL = URL.createObjectURL(blob);
  
  await audioContext.audioWorklet.addModule(objectURL);
  URL.revokeObjectURL(objectURL);

  const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');

  workletNode.port.onmessage = (event) => {
    const inputData = event.data; // This is a Float32Array
    const pcmBlob = createBlob(inputData);
    session.sendRealtimeInput({ media: pcmBlob });
  };
  
  source.connect(workletNode);
  
  return { session, audioContext, workletNode, source, stream };
};

// --- Text Extraction from Image (OCR) ---

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export const extractTextFromImage = async (file: File): Promise<string> => {
    const imagePart = await fileToGenerativePart(file);
    const prompt = "This image may contain both English and Japanese text. Perform OCR and extract ONLY the English text content. Ignore all Japanese characters and return only the extracted English text. Do not include any other commentary, explanations, or formatting like ```.";

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, {text: prompt}] },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error extracting text from image:", error);
        throw new Error("Failed to extract text from the image.");
    }
}

// --- Generate Reading Feedback ---

const getFeedbackPrompt = (originalPassage: string, userTranscription: string) => {
    return `
      生徒（小学校高学年〜中学生）のリーディング能力を分析してください。「元のテキスト」と「生徒の書き起こし」を比較します。
      フィードバックはすべて日本語で、専門用語を避け、分かりやすい言葉で記述してください。
      フィードバックは全体で100〜150字程度に簡潔にまとめてください。

      以下の項目を含めてください：
      1.  正確さ、流暢さ、発音のスコア（1〜5、5が最高）。
      2.  誤った発音や抜けている単語の指摘。
      3.  改善のための具体的なアドバイスを1〜2個。
      
      トーンは励ますような、前向きなものにしてください。
      Markdown形式で記述してください。

      ---
      **元のテキスト:**
      "${originalPassage}"
      ---
      **生徒の書き起こし:**
      "${userTranscription}"
      ---
    `;
};

export const getReadingFeedback = async (originalPassage: string, userTranscription: string): Promise<ReadingFeedback> => {
  const prompt = getFeedbackPrompt(originalPassage, userTranscription);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: {
                accuracy: { type: Type.NUMBER, description: "Score from 1-5 for word accuracy." },
                fluency: { type: Type.NUMBER, description: "Score from 1-5 for reading fluency." },
                pronunciation: { type: Type.NUMBER, description: "Score from 1-5 for pronunciation clarity, inferred from transcription." },
              },
              required: ["accuracy", "fluency", "pronunciation"]
            },
            analysis: {
              type: Type.STRING,
              description: "Constructive feedback in Markdown format, including word analysis and actionable tips."
            }
          },
          required: ["scores", "analysis"]
        },
      },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as ReadingFeedback;
  } catch (error) {
    console.error("Error generating feedback:", error);
    throw new Error("Failed to get feedback from the AI model.");
  }
};

// --- Generate Pronunciation Feedback ---

const getPronunciationPrompt = (word: string, userTranscription: string) => {
    return `
        あなたは英語の発音を教える専門家です。生徒（小学校高学年〜中学生）が「${word}」という単語またはフレーズを発音しようとしました。
        生徒の音声認識結果は「${userTranscription}」です。
        
        フィードバックはすべて日本語で、専門用語（例：音素、フォニーム）を避け、簡潔に記述してください。
        音声認識の精度そのものについて言及してはいけません。「聞き取れませんでした」などのコメントは不要です。
        元の単語と認識結果の違いから**想定される発音の誤り**についてのみ、具体的で、励ますようなフィードバックをMarkdown形式で記述してください。
        正しい口の形や舌の動きについて簡単なアドバイスをしてください。
        発音の正確さを1から5のスケールで評価してください（5が最高）。

        生徒の試み: "${userTranscription}"
        練習中の単語/フレーズ: "${word}"
    `;
};


export const getPronunciationFeedback = async (word: string, userTranscription: string): Promise<PronunciationFeedback> => {
    const prompt = getPronunciationPrompt(word, userTranscription);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.NUMBER, description: "Score from 1-5 for pronunciation accuracy." },
                        analysis: {
                            type: Type.STRING,
                            description: "Constructive feedback in Markdown format on pronunciation, focusing on phonetics."
                        }
                    },
                    required: ["score", "analysis"]
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PronunciationFeedback;
    } catch (error) {
        console.error("Error generating pronunciation feedback:", error);
        throw new Error("Failed to get pronunciation feedback from the AI model.");
    }
};

// --- Generate Vocabulary Help ---

const getVocabularyPrompt = (passage: string) => {
    return `
        以下の英語のテキストから、生徒が難しいと感じる可能性のある重要な英単語を5〜7個特定してください。
        各単語について、簡単な日本語の定義と分かりやすい英語の例文を提示してください。

        ---
        **テキスト:**
        "${passage}"
        ---
    `;
};


export const getVocabularyHelp = async (passage: string): Promise<VocabularyWord[]> => {
    const prompt = getVocabularyPrompt(passage);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            definition: { type: Type.STRING },
                            example: { type: Type.STRING }
                        },
                        required: ["word", "definition", "example"]
                    }
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as VocabularyWord[];
    } catch (error) {
        console.error("Error getting vocabulary help:", error);
        throw new Error("Failed to get vocabulary from the AI model.");
    }
}

// --- Text to Speech Service ---

function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export const createWavUrl = (base64Audio: string): string => {
    const decodedBytes = decode(base64Audio); // This is Uint8Array of 16-bit PCM
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const dataLength = decodedBytes.length;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    function writeString(view: DataView, offset: number, string: string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write PCM data
    new Uint8Array(buffer, 44).set(decodedBytes);

    const blob = new Blob([view], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

export const getSpeechFromText = async (text: string, voiceName: 'Kore' | 'Puck'): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw new Error("Failed to generate speech from text.");
    }
};


// --- Test Generation Services ---

const questionSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        answer: { type: Type.STRING }
    },
    required: ["question", "options", "answer"]
};

// 1. Vocabulary Test (English to Japanese)
export const generateVocabularyTest = async (passages: string): Promise<VocabularyTest> => {
    const prompt = `以下のテキストに基づいて、重要な英単語の意味を問う5つの多肢選択問題を作成してください。質問は英語の単語、選択肢は日本語の意味にしてください。各質問には4つの選択肢を付けてください。\n\nテキスト:\n${passages}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: questionSchema }
            }
        });
        return JSON.parse(response.text.trim()) as VocabularyTest;
    } catch (error) {
        console.error("Error generating vocabulary test:", error);
        throw new Error("Failed to generate vocabulary test.");
    }
};

// 2. Vocabulary Test (Japanese to English) - NEW
export const generateJapaneseToEnglishVocabularyTest = async (passages: string): Promise<VocabularyTest> => {
    const prompt = `
        以下の英語のテキストから重要な単語を5つ選び、それらの日本語訳を元にした多肢選択問題を作成してください。
        質問は「[日本語訳]に最も意味が近い英単語はどれですか？」という形式にしてください。
        選択肢は4つの英単語とし、そのうち1つが正解です。
        
        テキスト:
        ${passages}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: questionSchema }
            }
        });
        return JSON.parse(response.text.trim()) as VocabularyTest;
    } catch (error) {
        console.error("Error generating Japanese to English vocabulary test:", error);
        throw new Error("Failed to generate Japanese to English vocabulary test.");
    }
};


// 3. Grammar Test
export const generateGrammarTest = async (passages: string): Promise<GrammarTest> => {
    const prompt = `以下のテキストで使われている文法（時制、前置詞、冠詞など）に基づいて、5つの多肢選択問題を作成してください。各質問には4つの選択肢を付けてください。\n\nテキスト:\n${passages}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: questionSchema }
            }
        });
        return JSON.parse(response.text.trim()) as GrammarTest;
    } catch (error) {
        console.error("Error generating grammar test:", error);
        throw new Error("Failed to generate grammar test.");
    }
};

// 4. Reading Comprehension Test
export const generateComprehensionTest = async (passages: string): Promise<ComprehensionTest> => {
    const prompt = `以下のテキストの内容理解度をテストするための5つの多肢選択問題を作成してください。各質問には4つの選択肢を付けてください。\n\nテキスト:\n${passages}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: questionSchema }
            }
        });
        return JSON.parse(response.text.trim()) as ComprehensionTest;
    } catch (error) {
        console.error("Error generating comprehension test:", error);
        throw new Error("Failed to generate comprehension test.");
    }
};