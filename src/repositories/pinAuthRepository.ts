import type { PinConfig } from '../types';

const STORAGE_KEY_PIN = 'jevacris_pin_config';
const STORAGE_KEY_SESSION = 'jevacris_session_unlocked';

/**
 * Utilidades criptográficas con Web Crypto API para seguridad local (SHA-256 + Salt)
 */
async function computeHash(pin: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin}:jevacris_pos_secure_salt`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const pinAuthRepository = {
  /**
   * Verifica si ya existe un PIN configurado en el dispositivo
   */
  async isPinConfigured(): Promise<boolean> {
    const raw = localStorage.getItem(STORAGE_KEY_PIN);
    if (!raw) return false;
    try {
      const config: PinConfig = JSON.parse(raw);
      return Boolean(config.hash && config.salt);
    } catch {
      return false;
    }
  },

  /**
   * Configura un nuevo PIN por primera vez
   */
  async setPin(newPin: string, autoLockMinutes: number = 0): Promise<void> {
    const salt = generateRandomSalt();
    const hash = await computeHash(newPin, salt);
    const config: PinConfig = {
      salt,
      hash,
      autoLockMinutes,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_PIN, JSON.stringify(config));
    this.setSessionUnlocked(true);
  },

  /**
   * Valida si el PIN introducido coincide con el hash guardado
   */
  async verifyPin(inputPin: string): Promise<boolean> {
    const raw = localStorage.getItem(STORAGE_KEY_PIN);
    if (!raw) return true; // Si no hay PIN, está siempre desbloqueado
    try {
      const config: PinConfig = JSON.parse(raw);
      const computed = await computeHash(inputPin, config.salt);
      const isValid = computed === config.hash;
      if (isValid) {
        this.setSessionUnlocked(true);
      }
      return isValid;
    } catch {
      return false;
    }
  },

  /**
   * Cambia el PIN existente verificando primero el PIN actual
   */
  async changePin(currentPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.verifyPin(currentPin);
    if (!isValid) return false;

    const raw = localStorage.getItem(STORAGE_KEY_PIN);
    let autoLock = 0;
    if (raw) {
      try {
        const config: PinConfig = JSON.parse(raw);
        autoLock = config.autoLockMinutes || 0;
      } catch {
        // mantener por defecto
      }
    }
    await this.setPin(newPin, autoLock);
    return true;
  },

  /**
   * Desactiva / Elimina la protección por PIN
   */
  async removePin(currentPin: string): Promise<boolean> {
    const isValid = await this.verifyPin(currentPin);
    if (!isValid) return false;
    localStorage.removeItem(STORAGE_KEY_PIN);
    this.setSessionUnlocked(true);
    return true;
  },

  /**
   * Estado de la sesión actual en memoria/sessionStorage
   */
  isSessionUnlocked(): boolean {
    return sessionStorage.getItem(STORAGE_KEY_SESSION) === 'true';
  },

  setSessionUnlocked(unlocked: boolean): void {
    if (unlocked) {
      sessionStorage.setItem(STORAGE_KEY_SESSION, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEY_SESSION);
    }
  },

  /**
   * Obtiene la configuración de auto-bloqueo en minutos (0 = desactivado)
   */
  getAutoLockMinutes(): number {
    const raw = localStorage.getItem(STORAGE_KEY_PIN);
    if (!raw) return 0;
    try {
      const config: PinConfig = JSON.parse(raw);
      return config.autoLockMinutes || 0;
    } catch {
      return 0;
    }
  },

  setAutoLockMinutes(minutes: number): void {
    const raw = localStorage.getItem(STORAGE_KEY_PIN);
    if (!raw) return;
    try {
      const config: PinConfig = JSON.parse(raw);
      config.autoLockMinutes = minutes;
      localStorage.setItem(STORAGE_KEY_PIN, JSON.stringify(config));
    } catch {
      // Ignorar
    }
  }
};
