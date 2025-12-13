
import { AuthUser, TrustFactors } from '../types';

/**
 * ZARA AI TRUST ENGINE
 * 
 * Calculates a dynamic trust score (0-100) based on behavioral and security signals.
 * Formula: Trust Score = (Behavior Score * 0.6) + (Security Score * 0.4)
 */
class TrustEngine {
  
  // Get current device fingerprint (Simple simulation using UserAgent)
  public getDeviceFingerprint(): string {
    return navigator.userAgent + "|" + navigator.language + "|" + screen.width + "x" + screen.height;
  }

  // Calculate the score based on user history and current context
  public calculateTrust(user: AuthUser | null, currentFingerprint: string): { score: number, factors: TrustFactors } {
    if (!user) {
      // New user starts at 30
      return { 
        score: 30, 
        factors: {
          behaviorScore: 30,
          securityScore: 30,
          signals: { deviceTrusted: false, locationStable: true, usageConsistent: false, recentFailure: false }
        }
      };
    }

    // 1. Security Signals (40%)
    let securityScore = 50; // Base
    const isDeviceMatch = user.deviceFingerprint === currentFingerprint;
    
    if (isDeviceMatch) securityScore += 30; // Strong signal
    else securityScore -= 20; // New device penalty

    // Time since last login (Penalty for inactivity > 7 days)
    const daysSinceLogin = (Date.now() - user.lastLogin) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin > 7) securityScore -= 10;
    if (daysSinceLogin < 1) securityScore += 10;

    // Cap Security
    securityScore = Math.min(100, Math.max(0, securityScore));


    // 2. Behavioral Signals (60%)
    let behaviorScore = 40; // Base
    
    // Usage consistency (simulated by login count)
    if (user.loginCount > 5) behaviorScore += 20;
    if (user.loginCount > 20) behaviorScore += 20;
    if (user.loginCount > 50) behaviorScore += 20; // Trusted regular

    // Cap Behavior
    behaviorScore = Math.min(100, Math.max(0, behaviorScore));


    // 3. Final Calculation
    // Weighted Average
    const trustScore = Math.round((behaviorScore * 0.6) + (securityScore * 0.4));

    return {
      score: trustScore,
      factors: {
        behaviorScore,
        securityScore,
        signals: {
          deviceTrusted: isDeviceMatch,
          locationStable: true, // Mocked as true for local demo
          usageConsistent: user.loginCount > 10,
          recentFailure: false
        }
      }
    };
  }

  public getAuthRequirement(score: number): 'OTP_REQUIRED' | 'OTP_OPTIONAL' | 'SILENT_LOGIN' {
    if (score >= 81) return 'SILENT_LOGIN';
    if (score >= 61) return 'SILENT_LOGIN'; // Generous for demo feel
    if (score >= 31) return 'OTP_OPTIONAL'; // Logic will decide based on risk spikes
    return 'OTP_REQUIRED';
  }
}

export const trustEngine = new TrustEngine();
