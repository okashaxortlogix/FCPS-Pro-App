/**
 * Backup and Export Utility for FCPS Pro App
 */

export function exportBackupData() {
  const backup = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    stats: localStorage.getItem('fcps_stats') ? JSON.parse(localStorage.getItem('fcps_stats')) : {},
    history: localStorage.getItem('fcps_history') ? JSON.parse(localStorage.getItem('fcps_history')) : [],
    bookmarks: localStorage.getItem('fcps_bookmarks') ? JSON.parse(localStorage.getItem('fcps_bookmarks')) : {},
    notes: localStorage.getItem('fcps_notes') ? JSON.parse(localStorage.getItem('fcps_notes')) : {},
    user: localStorage.getItem('fcps_current_user') ? JSON.parse(localStorage.getItem('fcps_current_user')) : null
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `FCPS_Pro_Backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function importBackupData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.stats) localStorage.setItem('fcps_stats', JSON.stringify(data.stats));
        if (data.history) localStorage.setItem('fcps_history', JSON.stringify(data.history));
        if (data.bookmarks) localStorage.setItem('fcps_bookmarks', JSON.stringify(data.bookmarks));
        if (data.notes) localStorage.setItem('fcps_notes', JSON.stringify(data.notes));
        if (data.user) localStorage.setItem('fcps_current_user', JSON.stringify(data.user));
        resolve(data);
      } catch (err) {
        reject(new Error('Invalid backup file format'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

