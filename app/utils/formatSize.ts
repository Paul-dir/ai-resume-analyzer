// Converts bytes into a human-readable format like KB, MB, GB, etc.
export const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(2)} ${units[i]}`;
};
