import { useState, useEffect, useCallback, useRef } from 'react';
import { pinAuthRepository } from '../repositories/pinAuthRepository';

export function usePinLock() {
  const [isPinConfigured, setIsPinConfigured] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  // Refrescar estado del PIN
  const checkStatus = useCallback(async () => {
    try {
      const configured = await pinAuthRepository.isPinConfigured();
      setIsPinConfigured(configured);
      const autoLock = pinAuthRepository.getAutoLockMinutes();
      setAutoLockMinutesState(autoLock);

      if (configured) {
        const isSessionUnlocked = pinAuthRepository.isSessionUnlocked();
        setIsLocked(!isSessionUnlocked);
      } else {
        setIsLocked(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Bloqueo manual
  const lock = useCallback(() => {
    if (!isPinConfigured) return;
    pinAuthRepository.setSessionUnlocked(false);
    setIsLocked(true);
  }, [isPinConfigured]);

  // Desbloqueo mediante verificación de PIN
  const unlock = useCallback(
    async (pin: string): Promise<boolean> => {
      const success = await pinAuthRepository.verifyPin(pin);
      if (success) {
        setIsLocked(false);
        lastActivityRef.current = Date.now();
      }
      return success;
    },
    []
  );

  // Configuración inicial de PIN
  const setupPin = useCallback(
    async (pin: string, autoLockMin: number = 0): Promise<void> => {
      await pinAuthRepository.setPin(pin, autoLockMin);
      setIsPinConfigured(true);
      setIsLocked(false);
      setAutoLockMinutesState(autoLockMin);
    },
    []
  );

  // Cambio de PIN
  const changePin = useCallback(
    async (currentPin: string, newPin: string): Promise<boolean> => {
      const success = await pinAuthRepository.changePin(currentPin, newPin);
      if (success) {
        setIsLocked(false);
      }
      return success;
    },
    []
  );

  // Desactivación de PIN
  const disablePin = useCallback(
    async (currentPin: string): Promise<boolean> => {
      const success = await pinAuthRepository.removePin(currentPin);
      if (success) {
        setIsPinConfigured(false);
        setIsLocked(false);
        setAutoLockMinutesState(0);
      }
      return success;
    },
    []
  );

  // Actualizar minutos de auto-bloqueo
  const updateAutoLockMinutes = useCallback((minutes: number) => {
    pinAuthRepository.setAutoLockMinutes(minutes);
    setAutoLockMinutesState(minutes);
  }, []);

  // Atajo de teclado para Bloqueo Rápido (Alt + L o Ctrl + Shift + L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + L o Ctrl + Shift + L o Ctrl + Alt + L
      const isLockShortcut =
        (e.altKey && (e.key === 'l' || e.key === 'L')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'l' || e.key === 'L')) ||
        (e.ctrlKey && e.altKey && (e.key === 'l' || e.key === 'L'));

      if (isLockShortcut) {
        e.preventDefault();
        e.stopPropagation();
        if (isPinConfigured && !isLocked) {
          lock();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isPinConfigured, isLocked, lock]);

  // Temporizador de auto-bloqueo por inactividad
  useEffect(() => {
    if (!isPinConfigured || autoLockMinutes <= 0 || isLocked) return;

    const timeoutMs = autoLockMinutes * 60 * 1000;

    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current >= timeoutMs) {
        lock();
      }
    }, 10000);

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, [isPinConfigured, autoLockMinutes, isLocked, lock]);

  return {
    isPinConfigured,
    isLocked,
    isLoading,
    autoLockMinutes,
    lock,
    unlock,
    setupPin,
    changePin,
    disablePin,
    updateAutoLockMinutes,
    checkStatus
  };
}
