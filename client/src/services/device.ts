const STORAGE_KEY = 'tictactoe.deviceId';

export const getOrCreateDeviceId = (): string => {
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
};
