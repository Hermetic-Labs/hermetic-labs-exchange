import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';

export type VisemeKey = 'aa' | 'ih' | 'ou' | 'ee' | 'oh';

// FBX/Character Creator morph target info
export type FBXMorphTarget = {
    mesh: THREE.Mesh;
    morphIndex: number;
    morphName: string;
};

export type PhonemeEvent = {
    t0: number;
    t1: number;
    phoneme: string;
    stress?: number;
};

export type LipSyncConfig = {
    smoothing?: number;
    gain?: number;
    maxMouthOpen?: number;
    jawAmplitude?: number;  // How much jaw opens based on audio amplitude (0-1)
    phonemeMap?: Partial<Record<string, VisemeKey>>;
};

// Kokoro/Misaki IPA phoneme → VRM viseme mapping
// VRM visemes: aa (open), ih (front close), ou (rounded), ee (mid), oh (back rounded)
//
// Misaki phoneme set (49 phonemes):
// Consonants: b, d, f, h, j, k, l, m, n, p, s, t, v, w, z, ɡ, ŋ, ɹ, ʃ, ʒ, ð, θ, ʤ, tʃ
// Vowels: ə, i, u, ɑ, ɔ, ɛ, ɜ, ɪ, ʊ, ʌ
// Diphthongs: A (eɪ), I (aɪ), W (aʊ), Y (ɔɪ)
const DEFAULT_PHONEME_MAP: Record<string, VisemeKey> = {
    // === VOWELS (IPA from Kokoro/Misaki) ===
    'ɑ': 'aa',   // spa - wide open
    'ɐ': 'aa',   // near-open central (like strut in some accents) - open
    'ɔ': 'oh',   // all - rounded back
    'ɛ': 'ee',   // bed, hair - mid
    'ɜ': 'ee',   // her - mid
    'ɪ': 'ih',   // brick - front close
    'ʊ': 'ou',   // wood - rounded
    'ʌ': 'aa',   // sun - open
    'ə': 'aa',   // schwa - neutral/open
    'i': 'ih',   // easy - front close
    'u': 'ou',   // flu - rounded
    'a': 'aa',   // father - open
    'e': 'ee',   // met (in some dialects)
    'o': 'oh',   // go (in some dialects)
    'æ': 'aa',   // cat - open

    // === LONG VOWELS ===
    'ɜː': 'ee',  // bird, her - mid (long)
    'ɑː': 'aa',  // father - wide open (long)
    'ɔː': 'oh',  // thought, all - rounded back (long)
    'iː': 'ih',  // fleece - front close (long)
    'uː': 'ou',  // goose - rounded (long)
    'ɛː': 'ee',  // square (long)
    'æː': 'aa',  // bad (long in some accents)

    // === DIPHTHONGS (actual IPA) ===
    'eɪ': 'ee',  // face, hey - ends front
    'aɪ': 'aa',  // price, high - starts open
    'ɔɪ': 'oh',  // choice, soy - starts rounded
    'aʊ': 'aa',  // mouth, how - starts open
    'oʊ': 'oh',  // goat, go - rounded
    'ɪə': 'ih',  // near - front close start
    'eə': 'ee',  // square - mid start
    'ʊə': 'ou',  // cure - rounded start

    // === DIPHTHONGS (Misaki uses capital letters) ===
    'A': 'ee',   // hey (eɪ) - ends front
    'I': 'aa',   // high (aɪ) - starts open
    'W': 'aa',   // how (aʊ) - starts open
    'Y': 'oh',   // soy (ɔɪ) - starts rounded

    // === CONSONANTS with mouth shape ===
    // Bilabials (lips together then open)
    'b': 'aa', 'p': 'aa', 'm': 'aa',
    // Labiodentals (teeth on lip)
    'f': 'ih', 'v': 'ih',
    // Dentals (tongue on teeth)
    'θ': 'ee', 'ð': 'ee',
    // Alveolars
    't': 'aa', 'd': 'aa', 'n': 'aa', 's': 'ih', 'z': 'ih', 'l': 'aa',
    // Post-alveolars
    'ʃ': 'ih', 'ʒ': 'ih', 'tʃ': 'ih', 'ʤ': 'ih', 'dʒ': 'ih',
    // Palatal
    'j': 'ih',
    // Velars
    'k': 'oh', 'ɡ': 'oh', 'g': 'oh', 'ŋ': 'oh',
    // Glottal
    'h': 'aa', 'ʔ': 'aa',
    // Approximants
    'ɹ': 'aa', 'r': 'aa', 'w': 'ou',

    // === R-COLORED VOWELS ===
    'ɝ': 'ee',   // bird (rhotic)
    'ɝː': 'ee',  // bird (rhotic, long)
    'ɚ': 'aa',   // letter (rhotic schwa)

    // === ARPAbet fallback (for g2p_en output) ===
    'AA': 'aa', 'AE': 'aa', 'AH': 'aa', 'AO': 'oh', 'AW': 'aa', 'AY': 'aa',
    'IY': 'ih', 'IH': 'ih', 'EY': 'ee',
    'UW': 'ou', 'UH': 'ou', 'OW': 'oh',
    'EH': 'ee', 'ER': 'ee',
    'OY': 'oh',
    'B': 'aa', 'P': 'aa', 'M': 'aa',
    'F': 'ih', 'V': 'ih',
    'TH': 'ee', 'DH': 'ee',
    'S': 'ih', 'Z': 'ih', 'SH': 'ih', 'ZH': 'ih', 'CH': 'ih', 'JH': 'ih',
    'N': 'aa', 'L': 'aa', 'R': 'aa', 'T': 'aa', 'D': 'aa',
    'K': 'oh', 'G': 'oh', 'NG': 'oh',
    'HH': 'aa',
    // Note: 'W' and 'Y' defined above as Misaki diphthongs
};

// Character Creator / ARKit blend shape → viseme mapping
// Comprehensive mapping for CC4/Reallusion FBX exports
// Maps morph targets to 5 VRM visemes: aa (open), ih (front), ou (rounded), ee (wide), oh (back)
const CC_MORPH_TO_VISEME: Record<string, VisemeKey> = {
    // ===========================================
    // CC4 VISEME MORPHS (V_ prefix) - PRIMARY
    // ===========================================
    'V_Open': 'aa',        // Wide open mouth - vowels like "ah", "father"
    'V_Lip_Open': 'aa',    // Lips parted open
    'V_Explosive': 'aa',   // Bilabial plosives: b, p, m (lips close then burst open)
    'V_Wide': 'ee',        // Wide/smile shape - vowels like "ee", "ih"
    'V_Tight_O': 'ou',     // Tight rounded O - vowels like "oo", "u"
    'V_Tight': 'ou',       // Tight/pursed lips
    'V_Dental_Lip': 'ih',  // Labiodental: f, v (teeth on lower lip)
    'V_Affricate': 'ih',   // Affricates/fricatives: ch, sh, s, z

    // ===========================================
    // ARKit STYLE (A## prefix) - Apple ARKit compatible
    // ===========================================
    // Jaw
    'A25_Jaw_Open': 'aa',      // Primary jaw opening - maps to open vowels
    'A26_Jaw_Forward': 'oh',   // Jaw thrust forward - back vowels

    // Mouth shape
    'A29_Mouth_Funnel': 'ou',  // Rounded/funnel shape - "oo" sound
    'A30_Mouth_Pucker': 'ou',  // Pursed lips - "oo", "w" sounds
    'A37_Mouth_Close': 'ih',   // Mouth closed - nasals, some consonants

    // Smile/Wide
    'A38_Mouth_Smile_Left': 'ee',   // Left smile - wide vowels
    'A39_Mouth_Smile_Right': 'ee',  // Right smile - wide vowels

    // Frown/Back
    'A40_Mouth_Frown_Left': 'oh',   // Left frown - back vowels
    'A41_Mouth_Frown_Right': 'oh',  // Right frown - back vowels

    // ===========================================
    // CC EXPRESSION MORPHS (Mouth_ prefix)
    // ===========================================
    // Open shapes
    'Mouth_Open': 'aa',            // General mouth open
    'Mouth_Lips_Open': 'aa',       // Lips parted
    'Mouth_Lips_Part': 'aa',       // Lips parted slightly
    'Mouth_Bottom_Lip_Down': 'aa', // Lower lip down - open

    // Wide/Smile shapes
    'Mouth_Smile': 'ee',           // General smile
    'Mouth_Smile_L': 'ee',         // Left smile
    'Mouth_Smile_R': 'ee',         // Right smile
    'Mouth_Widen': 'ee',           // Mouth widening
    'Mouth_Widen_Sides': 'ee',     // Sides widen

    // Rounded/Pucker shapes
    'Mouth_Pucker': 'ou',          // Pursed/rounded
    'Mouth_Pucker_Open': 'ou',     // Pursed but open
    'Mouth_Blow': 'ou',            // Blowing shape (rounded)

    // Back vowel shapes
    'Mouth_Frown': 'oh',           // General frown
    'Mouth_Frown_L': 'oh',         // Left frown
    'Mouth_Frown_R': 'oh',         // Right frown
    'Mouth_Down': 'oh',            // Mouth corners down

    // Consonant-specific
    'Mouth_Plosive': 'aa',         // Plosive consonants (b/p/m)
    'Mouth_Bottom_Lip_Bite': 'ih', // F/V sounds (teeth on lip)
    'Mouth_Lips_Tight': 'ih',      // Tight lips for fricatives
    'Mouth_Lips_Tuck': 'ih',       // Tucked lips

    // ===========================================
    // OCULUS/META VISEME STYLE
    // ===========================================
    'viseme_aa': 'aa',
    'viseme_E': 'ee',
    'viseme_I': 'ih',
    'viseme_O': 'oh',
    'viseme_U': 'ou',
    'viseme_PP': 'aa',   // Bilabial plosive (p, b, m)
    'viseme_FF': 'ih',   // Labiodental (f, v)
    'viseme_TH': 'ee',   // Dental (th)
    'viseme_DD': 'aa',   // Alveolar (d, t, n)
    'viseme_kk': 'oh',   // Velar (k, g)
    'viseme_CH': 'ih',   // Postalveolar (ch, sh)
    'viseme_SS': 'ih',   // Sibilant (s, z)
    'viseme_nn': 'aa',   // Nasal (n, m)
    'viseme_RR': 'aa',   // Approximant (r)
    'viseme_sil': 'aa',  // Silence (neutral)

    // ===========================================
    // LEGACY/ALTERNATE NAMING
    // ===========================================
    'jawOpen': 'aa',
    'mouthOpen': 'aa',
    'Jaw_Open': 'aa',
    'mouthFunnel': 'ou',
    'mouthPucker': 'ou',
    'mouthSmileLeft': 'ee',
    'mouthSmileRight': 'ee',
    'mouthFrownLeft': 'oh',
    'mouthFrownRight': 'oh',
    'Mouth_Wide': 'ee',
    'Mouth_Narrow': 'ou',
    'Mouth_Up': 'oh',
    'Mouth_L': 'ee',
    'Mouth_R': 'ee',
};

export class LipSyncService {
    private vrm: VRM | null = null;
    private fbxModel: THREE.Group | null = null;
    private fbxMorphTargets: Map<VisemeKey, FBXMorphTarget[]> = new Map();
    private audio: HTMLAudioElement | null = null;
    private analyser: AnalyserNode | null = null;
    private audioContext: AudioContext | null = null;
    private dataArray: Uint8Array | null = null;
    private mediaSource: MediaElementAudioSourceNode | null = null;
    private micStream: MediaStream | null = null;
    private micSource: MediaStreamAudioSourceNode | null = null;

    private timeline: PhonemeEvent[] = [];
    private _currentWeights: Record<VisemeKey, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
    private targetWeights: Record<VisemeKey, number> = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

    private config: Required<LipSyncConfig>;
    private phonemeMap: Record<string, VisemeKey>;
    private hasVisemes = false;
    private isFBXMode = false;
    public amplitudeOnly = false;
    public forceAmplitudeMode = false;
    private isMicMode = false;

    // Jaw amplitude tracking
    private jawMorphTargets: FBXMorphTarget[] = [];
    private currentJawWeight = 0;
    private targetJawWeight = 0;

    // Tongue tracking for L/N/T/D sounds
    private tongueMorphTargets: FBXMorphTarget[] = [];
    private currentTongueWeight = 0;
    private targetTongueWeight = 0;

    constructor(config: LipSyncConfig = {}) {
        this.config = {
            smoothing: config.smoothing ?? 0.3,
            gain: config.gain ?? 2.0,
            maxMouthOpen: config.maxMouthOpen ?? 0.8,
            jawAmplitude: config.jawAmplitude ?? 0.5,  // Default 50% jaw amplitude
            phonemeMap: config.phonemeMap ?? {},
        };
        this.phonemeMap = { ...DEFAULT_PHONEME_MAP, ...this.config.phonemeMap };
    }

    get currentWeights(): Record<VisemeKey, number> {
        return { ...this._currentWeights };
    }

    updateConfig(config: Partial<LipSyncConfig>): void {
        if (config.smoothing !== undefined) this.config.smoothing = config.smoothing;
        if (config.gain !== undefined) this.config.gain = config.gain;
        if (config.maxMouthOpen !== undefined) this.config.maxMouthOpen = config.maxMouthOpen;
        if (config.jawAmplitude !== undefined) this.config.jawAmplitude = config.jawAmplitude;
    }

    get currentJawAmplitude(): number {
        return this.currentJawWeight;
    }

    connectToAvatar(vrm: VRM): void {
        this.vrm = vrm;
        this.fbxModel = null;
        this.isFBXMode = false;

        if (!vrm.expressionManager) {
            console.warn('[LipSync] VRM expressionManager not found, amplitude-only mode');
            this.amplitudeOnly = true;
            return;
        }

        const expressions = vrm.expressionManager.expressions || [];
        const visemeNames: VisemeKey[] = ['aa', 'ih', 'ou', 'ee', 'oh'];
        this.hasVisemes = visemeNames.some(v =>
            expressions.some((e: { expressionName?: string; name?: string }) =>
                e.expressionName === v || e.name === v)
        );

        if (!this.hasVisemes) {
            console.warn('[LipSync] VRM missing viseme blendshapes, amplitude-only mode');
            this.amplitudeOnly = true;
        }
    }

    connectToFBX(model: THREE.Group): void {
        this.fbxModel = model;
        this.vrm = null;
        this.isFBXMode = true;
        this.fbxMorphTargets.clear();
        this.jawMorphTargets = [];
        this.tongueMorphTargets = [];

        // Scan all meshes for morph targets and map them to visemes
        const foundMorphs: string[] = [];
        const allMorphNames: string[] = [];
        const jawMorphNames: string[] = [];
        const tongueMorphNames: string[] = [];

        model.traverse((child) => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
                return;
            }

            for (const [morphName, morphIndex] of Object.entries(mesh.morphTargetDictionary)) {
                // Collect all morph names for debugging
                if (!allMorphNames.includes(morphName)) {
                    allMorphNames.push(morphName);
                }

                // Check if this morph maps to a viseme
                const viseme = CC_MORPH_TO_VISEME[morphName];
                if (viseme) {
                    if (!this.fbxMorphTargets.has(viseme)) {
                        this.fbxMorphTargets.set(viseme, []);
                    }
                    this.fbxMorphTargets.get(viseme)!.push({
                        mesh,
                        morphIndex,
                        morphName,
                    });
                    foundMorphs.push(`${morphName} → ${viseme}`);
                }

                // Check for jaw-specific morphs for amplitude-based jaw movement
                // CC4 uses A25_Jaw_Open as the primary jaw morph
                const lowerName = morphName.toLowerCase();
                const isJawMorph = (
                    morphName === 'A25_Jaw_Open' ||         // CC4/ARKit primary jaw
                    morphName === 'jawOpen' ||              // ARKit camelCase
                    morphName === 'Jaw_Open' ||             // CC style
                    lowerName === 'jawopen' ||
                    lowerName === 'jaw_open'
                );
                if (isJawMorph) {
                    this.jawMorphTargets.push({
                        mesh,
                        morphIndex,
                        morphName,
                    });
                    jawMorphNames.push(morphName);
                }

                // Check for tongue morphs for L/N/T/D sounds
                const isTongueMorph = (
                    lowerName.includes('tongue') && (lowerName.includes('up') || lowerName.includes('raise') || lowerName.includes('tip')) ||
                    lowerName === 'tongue_up' ||
                    lowerName === 'tongueup' ||
                    morphName === 'Tongue_Up' ||
                    morphName === 'Tongue_Tip_Up' ||
                    morphName === 'Tongue_Raise' ||
                    morphName === 'A32_Tongue_Up' ||      // ARKit tongue up
                    morphName === 'tongueOut' && false    // Don't use tongueOut, we want tongue up
                );
                if (isTongueMorph) {
                    this.tongueMorphTargets.push({
                        mesh,
                        morphIndex,
                        morphName,
                    });
                    tongueMorphNames.push(morphName);
                }
            }
        });

        // Log ALL available morphs for debugging CC models
        console.log('[LipSync] ALL morph targets on FBX model:', JSON.stringify(allMorphNames.sort()));

        // Log jaw morphs found for amplitude control
        if (jawMorphNames.length > 0) {
            console.log('[LipSync] Jaw morphs found for amplitude control:', jawMorphNames);
        }

        // Log tongue morphs found for L/N/T/D sounds
        if (tongueMorphNames.length > 0) {
            console.log('[LipSync] Tongue morphs found for L sounds:', tongueMorphNames);
        }

        if (foundMorphs.length > 0) {
            console.log('[LipSync] FBX morph targets mapped:', foundMorphs);
            this.hasVisemes = true;
            this.amplitudeOnly = false;
        } else {
            console.warn('[LipSync] No mouth morphs found on FBX, using amplitude-only mode');
            // Try to find ANY morph target for amplitude mode (use jawOpen equivalent)
            model.traverse((child) => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) {
                    return;
                }
                // Look for any jaw/mouth morph for amplitude-only fallback
                for (const [morphName, morphIndex] of Object.entries(mesh.morphTargetDictionary)) {
                    const lowerName = morphName.toLowerCase();
                    if (lowerName.includes('jaw') || lowerName.includes('mouth') || lowerName.includes('open')) {
                        if (!this.fbxMorphTargets.has('aa')) {
                            this.fbxMorphTargets.set('aa', []);
                        }
                        this.fbxMorphTargets.get('aa')!.push({
                            mesh,
                            morphIndex,
                            morphName,
                        });
                        console.log(`[LipSync] FBX fallback morph: ${morphName} → aa`);
                        this.hasVisemes = true;
                        return;
                    }
                }
            });

            if (!this.hasVisemes) {
                this.amplitudeOnly = true;
            }
        }
    }

    async connectToAudio(audio: HTMLAudioElement, externalAnalyser?: AnalyserNode): Promise<void> {
        this.audio = audio;
        this.isMicMode = false;

        // If external analyser provided (from shared ttsService), use it directly
        if (externalAnalyser) {
            this.analyser = externalAnalyser;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            console.log('[LipSync] Using external analyser from ttsService');
            return;
        }

        // Try to create our own analyser (may fail if audio already connected)
        try {
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            if (!this.mediaSource) {
                this.mediaSource = this.audioContext.createMediaElementSource(audio);
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.mediaSource.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        } catch (_err) {
            // Audio already connected to another source - fall back to forceAmplitudeMode
            console.warn('[LipSync] Audio already connected, using amplitude from ttsService');
            this.forceAmplitudeMode = true;
        }
    }

    async connectToMic(): Promise<void> {
        this.isMicMode = true;

        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micSource = this.audioContext.createMediaStreamSource(this.micStream);

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        this.micSource.connect(this.analyser);
    }

    disconnectMic(): void {
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource = null;
        }
        this.isMicMode = false;
    }

    ingestPhonemeTimeline(timeline: PhonemeEvent[]): void {
        this.timeline = [...timeline].sort((a, b) => a.t0 - b.t0);
    }

    update(dt: number): void {
        // Need either VRM or FBX model
        if (!this.vrm && !this.fbxModel) {
            console.warn('[LipSync] update() called but no model connected');
            return;
        }

        if (this.isMicMode) {
            this.targetWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };
            this.updateFromAmplitude();
            this.updateJawAmplitude();
            this.smoothWeights(dt);
            this.smoothJawWeight(dt);
            this.applyWeights();
            return;
        }

        if (!this.audio) {
            console.warn('[LipSync] update() called but no audio element');
            return;
        }

        const currentTime = this.audio.currentTime;
        const isPlaying = !this.audio.paused && !this.audio.ended;

        if (!isPlaying) {
            this.decayAllWeights(dt);
            this.decayJawWeight(dt);
            this.decayTongueWeight(dt);
            this.applyWeights();
            return;
        }

        this.targetWeights = { aa: 0, ih: 0, ou: 0, ee: 0, oh: 0 };

        // Log mode selection
        const usePhonemes = this.timeline.length > 0 && !this.amplitudeOnly && !this.forceAmplitudeMode;
        if (currentTime < 0.1) { // Only log at start to avoid spam
            console.log('[LipSync] Update mode:', {
                usePhonemes,
                timelineLength: this.timeline.length,
                amplitudeOnly: this.amplitudeOnly,
                forceAmplitudeMode: this.forceAmplitudeMode,
                currentTime,
                hasAnalyser: !!this.analyser
            });
        }

        if (usePhonemes) {
            this.updateFromPhonemes(currentTime);
        } else {
            this.updateFromAmplitude();
        }

        // Update jaw amplitude from audio levels (independent of phonemes)
        this.updateJawAmplitude();

        this.smoothWeights(dt);
        this.smoothJawWeight(dt);
        this.smoothTongueWeight(dt);
        this.applyWeights();
    }

    // Phonemes that require tongue-up position (alveolar consonants)
    private static readonly TONGUE_PHONEMES = new Set([
        'l', 'L',           // Lateral approximant (tongue tip touches alveolar ridge)
        'n', 'N',           // Alveolar nasal
        't', 'T', 'd', 'D', // Alveolar stops
        'ɹ', 'r', 'R',      // Approximants
        's', 'S', 'z', 'Z', // Alveolar fricatives (slight tongue raise)
    ]);

    private updateFromPhonemes(currentTime: number): void {
        let foundMatch = false;
        this.targetTongueWeight = 0;  // Reset tongue target each frame

        for (const event of this.timeline) {
            if (currentTime >= event.t0 && currentTime <= event.t1) {
                const viseme = this.phonemeMap[event.phoneme];
                if (viseme) {
                    const progress = (currentTime - event.t0) / (event.t1 - event.t0);
                    const envelope = Math.sin(progress * Math.PI);
                    const weight = envelope * (event.stress ?? 1) * this.config.gain;
                    this.targetWeights[viseme] = Math.min(weight, this.config.maxMouthOpen);

                    // Check if this phoneme needs tongue-up position
                    if (LipSyncService.TONGUE_PHONEMES.has(event.phoneme)) {
                        this.targetTongueWeight = Math.min(envelope * 0.8, 1.0);  // Tongue up for L/N/T/D/R
                    }

                    if (!foundMatch) {
                        console.log('[LipSync] Phoneme match:', {
                            time: currentTime.toFixed(3),
                            phoneme: event.phoneme,
                            viseme,
                            weight: weight.toFixed(3),
                            envelope: envelope.toFixed(3),
                            tongue: LipSyncService.TONGUE_PHONEMES.has(event.phoneme)
                        });
                        foundMatch = true;
                    }
                } else {
                    console.warn('[LipSync] Unmapped phoneme:', event.phoneme);
                }
            }
        }
        if (!foundMatch && currentTime < 0.5) {
            console.warn('[LipSync] No phoneme match at time:', currentTime.toFixed(3), 'timeline length:', this.timeline.length);
        }
    }

    private updateFromAmplitude(): void {
        if (!this.analyser || !this.dataArray) return;

        this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i] * this.dataArray[i];
        }
        const rms = Math.sqrt(sum / this.dataArray.length) / 255;
        const amplitude = Math.min(rms * this.config.gain, this.config.maxMouthOpen);

        if (amplitude > 0.01) {
            console.log('[LipSync] Amplitude calculated:', amplitude, 'RMS:', rms);
        }
        this.targetWeights.aa = amplitude;
    }

    private smoothWeights(dt: number): void {
        const factor = 1 - Math.pow(this.config.smoothing, dt * 60);
        for (const key of Object.keys(this._currentWeights) as VisemeKey[]) {
            this._currentWeights[key] += (this.targetWeights[key] - this._currentWeights[key]) * factor;
        }
    }

    private decayAllWeights(dt: number): void {
        const decayRate = 1 - Math.pow(0.1, dt * 60);
        for (const key of Object.keys(this._currentWeights) as VisemeKey[]) {
            this._currentWeights[key] *= (1 - decayRate);
        }
    }

    private updateJawAmplitude(): void {
        if (!this.analyser || !this.dataArray || this.config.jawAmplitude <= 0) {
            this.targetJawWeight = 0;
            return;
        }

        this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i] * this.dataArray[i];
        }
        const rms = Math.sqrt(sum / this.dataArray.length) / 255;

        // Apply jaw amplitude scaling - this controls how much the jaw opens based on volume
        this.targetJawWeight = Math.min(rms * this.config.gain * this.config.jawAmplitude, this.config.maxMouthOpen);
    }

    private smoothJawWeight(dt: number): void {
        const factor = 1 - Math.pow(this.config.smoothing, dt * 60);
        this.currentJawWeight += (this.targetJawWeight - this.currentJawWeight) * factor;
    }

    private decayJawWeight(dt: number): void {
        const decayRate = 1 - Math.pow(0.1, dt * 60);
        this.currentJawWeight *= (1 - decayRate);
    }

    private smoothTongueWeight(dt: number): void {
        const factor = 1 - Math.pow(this.config.smoothing, dt * 60);
        this.currentTongueWeight += (this.targetTongueWeight - this.currentTongueWeight) * factor;
    }

    private decayTongueWeight(dt: number): void {
        const decayRate = 1 - Math.pow(0.1, dt * 60);
        this.currentTongueWeight *= (1 - decayRate);
    }

    private applyWeights(): void {
        const nonZeroWeights = Object.entries(this._currentWeights).filter(([_, w]) => w > 0.01);

        if (this.isFBXMode && this.fbxModel) {
            // Apply weights to FBX morph targets
            let appliedCount = 0;
            for (const [viseme, weight] of Object.entries(this._currentWeights) as [VisemeKey, number][]) {
                const targets = this.fbxMorphTargets.get(viseme);
                if (targets) {
                    const clampedWeight = Math.max(0, Math.min(1, weight));
                    for (const target of targets) {
                        if (target.mesh.morphTargetInfluences) {
                            target.mesh.morphTargetInfluences[target.morphIndex] = clampedWeight;
                            appliedCount++;
                        }
                    }
                }
            }

            // Apply jaw amplitude to jaw-specific morphs (additive to viseme weights)
            if (this.currentJawWeight > 0.01 && this.jawMorphTargets.length > 0) {
                const jawWeight = Math.max(0, Math.min(1, this.currentJawWeight));
                for (const target of this.jawMorphTargets) {
                    if (target.mesh.morphTargetInfluences) {
                        // Combine with existing weight (take max to avoid over-opening)
                        const existingWeight = target.mesh.morphTargetInfluences[target.morphIndex];
                        target.mesh.morphTargetInfluences[target.morphIndex] = Math.max(existingWeight, jawWeight);
                    }
                }
            }

            // Apply tongue morphs for L/N/T/D sounds
            if (this.currentTongueWeight > 0.01 && this.tongueMorphTargets.length > 0) {
                const tongueWeight = Math.max(0, Math.min(1, this.currentTongueWeight));
                for (const target of this.tongueMorphTargets) {
                    if (target.mesh.morphTargetInfluences) {
                        target.mesh.morphTargetInfluences[target.morphIndex] = tongueWeight;
                    }
                }
            }

            if (nonZeroWeights.length > 0 || this.currentJawWeight > 0.01 || this.currentTongueWeight > 0.01) {
                console.log('[LipSync] Applied FBX weights:', {
                    nonZeroWeights,
                    appliedCount,
                    jawAmplitude: this.currentJawWeight.toFixed(3),
                    tongue: this.currentTongueWeight.toFixed(3)
                });
            }
            return;
        }

        // VRM mode
        if (!this.vrm?.expressionManager) {
            console.warn('[LipSync] No VRM expressionManager to apply weights to');
            return;
        }

        // VRM has: aa, ee, ih, oh, ou - use directly
        for (const [viseme, weight] of Object.entries(this._currentWeights)) {
            const clampedWeight = Math.max(0, Math.min(1, weight));
            this.vrm.expressionManager.setValue(viseme, clampedWeight);
        }

        if (nonZeroWeights.length > 0) {
            console.log('[LipSync] Applied VRM weights:', nonZeroWeights);
        }

        // Force update the expression manager (required for some VRM models)
        this.vrm.expressionManager.update();
    }

    dispose(): void {
        this.disconnectMic();
        this.vrm = null;
        this.fbxModel = null;
        this.fbxMorphTargets.clear();
        this.isFBXMode = false;
        this.audio = null;
        this.timeline = [];

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.analyser = null;
        this.dataArray = null;
        this.mediaSource = null;
    }
}

export default LipSyncService;
