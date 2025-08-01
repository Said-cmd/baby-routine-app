import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export class AudioService {
  private static recording: Audio.Recording | null = null;
  private static isListening = false;
  private static monitoringInterval: NodeJS.Timeout | null = null;
  private static onCryingDetectedCallback: (() => void) | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyser: AnalyserNode | null = null;
  private static microphone: MediaStreamAudioSourceNode | null = null;
  private static dataArray: Uint8Array | null = null;

  static async startCryingDetection(onCryingDetected: () => void): Promise<void> {
    try {
      this.onCryingDetectedCallback = onCryingDetected;
      this.isListening = true;

      if (Platform.OS === 'web') {
        await this.startWebAudioDetection();
      } else {
        await this.startExpoAudioDetection();
      }

    } catch (error) {
      console.error('Error starting crying detection:', error);
      this.isListening = false;
      throw error;
    }
  }

  private static async startWebAudioDetection(): Promise<void> {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      // Create audio context and analyser
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);

      // Configure analyser
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      this.microphone.connect(this.analyser);

      // Create data array for frequency data
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Start monitoring
      this.startWebAudioMonitoring();

    } catch (error) {
      console.error('Error setting up Web Audio:', error);
      throw error;
    }
  }

  private static startWebAudioMonitoring(): void {
    let consecutiveHighLevels = 0;
    let lastCryingDetection = 0;
    const VOLUME_THRESHOLD = 50; // Adjust this value (0-255)
    const CONSECUTIVE_READINGS = 5;
    const MIN_TIME_BETWEEN_DETECTIONS = 3000; // 3 seconds

    const monitor = () => {
      if (!this.isListening || !this.analyser || !this.dataArray) {
        return;
      }

      // Get current audio data
      this.analyser.getByteFrequencyData(this.dataArray);

      // Calculate average volume
      const average = this.dataArray.reduce((sum, value) => sum + value, 0) / this.dataArray.length;

      console.log(`Audio level: ${average.toFixed(1)}`); // Debug log

      if (average > VOLUME_THRESHOLD) {
        consecutiveHighLevels++;
        
        if (consecutiveHighLevels >= CONSECUTIVE_READINGS) {
          const now = Date.now();
          
          if (now - lastCryingDetection > MIN_TIME_BETWEEN_DETECTIONS) {
            console.log(`Crying detected! Volume: ${average.toFixed(1)}`);
            lastCryingDetection = now;
            consecutiveHighLevels = 0;
            
            if (this.onCryingDetectedCallback) {
              this.onCryingDetectedCallback();
            }
          }
        }
      } else {
        consecutiveHighLevels = Math.max(0, consecutiveHighLevels - 1);
      }

      // Continue monitoring
      if (this.isListening) {
        requestAnimationFrame(monitor);
      }
    };

    // Start the monitoring loop
    monitor();
  }

  private static async startExpoAudioDetection(): Promise<void> {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording with metering enabled
      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      }, undefined, 100); // Update every 100ms
      
      this.recording = recording;
      this.startExpoAudioMonitoring();

    } catch (error) {
      console.error('Error starting Expo audio detection:', error);
      throw error;
    }
  }

  private static startExpoAudioMonitoring(): void {
    let consecutiveHighLevels = 0;
    let lastCryingDetection = 0;
    const CRYING_THRESHOLD = -25; // dB threshold
    const CONSECUTIVE_READINGS = 3;
    const MIN_TIME_BETWEEN_DETECTIONS = 3000;

    this.monitoringInterval = setInterval(async () => {
      if (!this.isListening || !this.recording) {
        return;
      }

      try {
        const status = await this.recording.getStatusAsync();
        
        if (status.isRecording && status.metering !== undefined) {
          const audioLevel = status.metering;
          
          console.log(`Audio level: ${audioLevel}dB`); // Debug log
          
          if (audioLevel > CRYING_THRESHOLD) {
            consecutiveHighLevels++;
            
            if (consecutiveHighLevels >= CONSECUTIVE_READINGS) {
              const now = Date.now();
              
              if (now - lastCryingDetection > MIN_TIME_BETWEEN_DETECTIONS) {
                console.log(`Crying detected! Audio level: ${audioLevel}dB`);
                lastCryingDetection = now;
                consecutiveHighLevels = 0;
                
                if (this.onCryingDetectedCallback) {
                  this.onCryingDetectedCallback();
                }
              }
            }
          } else {
            consecutiveHighLevels = Math.max(0, consecutiveHighLevels - 1);
          }
        }
      } catch (error) {
        console.error('Error monitoring audio levels:', error);
      }
    }, 150); // Check every 150ms
  }

  static async stopCryingDetection(): Promise<void> {
    try {
      this.isListening = false;

      // Clean up intervals
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      // Clean up Web Audio API
      if (Platform.OS === 'web') {
        if (this.microphone) {
          this.microphone.disconnect();
          this.microphone = null;
        }
        if (this.audioContext) {
          await this.audioContext.close();
          this.audioContext = null;
        }
        this.analyser = null;
        this.dataArray = null;
      }

      // Clean up Expo recording
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      
      this.onCryingDetectedCallback = null;
    } catch (error) {
      console.error('Error stopping crying detection:', error);
    }
  }

  static isCurrentlyListening(): boolean {
    return this.isListening;
  }
}