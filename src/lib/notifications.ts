export interface NotificationAlert {
  id: string;
  assignmentId: string;
  title: string;
  subjectName: string;
  message: string;
  type: 'urgent' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
}

// Synthesize a pleasant non-jarring chime using Web Audio API
export function playChime(type: 'urgent' | 'success' | 'info' = 'info') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, dur: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(gainVal, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    if (type === 'urgent') {
      playTone(587.33, now, 0.25, 0.15); // D5
      playTone(880, now + 0.15, 0.35, 0.2); // A5
    } else if (type === 'success') {
      playTone(523.25, now, 0.2, 0.12); // C5
      playTone(659.25, now + 0.1, 0.2, 0.15); // E5
      playTone(783.99, now + 0.2, 0.35, 0.18); // G5
    } else {
      playTone(440, now, 0.2, 0.1);
      playTone(659.25, now + 0.12, 0.25, 0.12);
    }
  } catch (err) {
    console.debug('Audio chime unable to play:', err);
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function sendBrowserNotification(title: string, body: string, icon?: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: `hw-alert-${Date.now()}`,
      });
    } catch (e) {
      console.warn('Could not dispatch browser notification:', e);
    }
  }
}
